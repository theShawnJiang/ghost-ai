"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  useCreateFeed,
  useCreateFeedMessage,
  useFeedMessages,
  useSelf,
} from "@liveblocks/react"

import {
  AI_CHAT_FEED_ID,
  AI_CHAT_SENDER,
  parseAiChatFeedMessage,
  type AiChatFeedMessage,
} from "@/types/tasks"

/**
 * Page size for the chat feed. Large enough that a room's recent conversation
 * arrives in the first page; older messages would need pagination.
 */
const CHAT_PAGE_SIZE = 50

/** Message shown under the composer when a send doesn't reach the feed. */
const SEND_ERROR = "Message not sent. Try again."

/** A validated chat message plus the feed id used as its React key. */
export interface AiChatFeedEntry extends AiChatFeedMessage {
  id: string
}

export interface AiChatFeedState {
  /** Room chat, oldest first. */
  messages: AiChatFeedEntry[]
  /** Local user's sender id, so the UI can tell own messages from others'. */
  selfId: string | null
  /** Whether the first page is still loading. */
  isLoading: boolean
  /** Whether a send is in flight. */
  isSending: boolean
  /** Set when the last send failed; cleared when the next one starts. */
  error: string | null
  /** Publish a message to the room. Resolves `true` when it was accepted. */
  send: (content: string) => Promise<boolean>
  /**
   * Publish an AI reply (a run summary or failure) to the room, attributed to
   * Ghost AI. Called by whoever owns the run, so it is written exactly once.
   */
  sendAiMessage: (content: string) => Promise<boolean>
}

/**
 * Subscribes to the room's shared `ai-chat` feed and sends into it.
 *
 * This is human chat only — AI progress lives in the separate `ai-status-feed`
 * (see `useAiStatusFeed`) so a status line can never be mistaken for something
 * a teammate said. Must be used inside a `RoomProvider`.
 */
export function useAiChatFeed(): AiChatFeedState {
  // A room has no chat feed until something publishes to it, and subscribing to
  // a missing feed resolves to an error. Creating it up front (idempotently — a
  // second create just fails and is ignored) means the very first message is
  // visible without a reload. Mirrors `useAiStatusFeed`.
  const createFeed = useCreateFeed()
  const hasEnsuredFeed = useRef(false)
  useEffect(() => {
    if (hasEnsuredFeed.current) return
    hasEnsuredFeed.current = true
    void createFeed(AI_CHAT_FEED_ID).catch(() => {
      // Already exists, or the user lacks feed write access — either way the
      // subscription below is still the source of truth.
    })
  }, [createFeed])

  const result = useFeedMessages(AI_CHAT_FEED_ID, { limit: CHAT_PAGE_SIZE })
  const rawMessages = result.messages

  // Validate every payload before it reaches the UI, then order oldest first.
  // Sorting on the feed's own `createdAt` (not the payload timestamp) keeps the
  // order server-assigned; sends mirror the two, so they agree.
  const messages = useMemo(() => {
    if (!rawMessages) return []

    const entries: { entry: AiChatFeedEntry; createdAt: number }[] = []
    for (const message of rawMessages) {
      const parsed = parseAiChatFeedMessage(message.data)
      if (!parsed) continue
      entries.push({
        entry: { ...parsed, id: message.id },
        createdAt: message.createdAt,
      })
    }

    return entries
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(({ entry }) => entry)
  }, [rawMessages])

  const createFeedMessage = useCreateFeedMessage()
  // Feed messages carry no author, so the sender is denormalized into the
  // payload from the identity Liveblocks resolved at auth time.
  const self = useSelf()
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // `createdAt` is passed explicitly so the feed's ordering key and the
  // displayed timestamp are the same number.
  const publish = useCallback(
    async (message: AiChatFeedMessage): Promise<boolean> => {
      try {
        await createFeedMessage(AI_CHAT_FEED_ID, message, {
          createdAt: message.timestamp,
        })
        return true
      } catch {
        return false
      }
    },
    [createFeedMessage],
  )

  const send = useCallback(
    async (content: string): Promise<boolean> => {
      const trimmed = content.trim()
      if (!trimmed) return false

      setError(null)

      // `self` is null until the room connection is established; without an
      // identity there is nothing to attribute the message to.
      if (!self) {
        setError(SEND_ERROR)
        return false
      }

      setIsSending(true)
      try {
        const sent = await publish({
          sender: {
            id: senderId(self.id, self.info.name),
            name: self.info.name,
            ...(self.info.avatar ? { avatar: self.info.avatar } : {}),
          },
          role: "user",
          content: trimmed,
          timestamp: Date.now(),
        })
        if (!sent) setError(SEND_ERROR)
        return sent
      } finally {
        setIsSending(false)
      }
    },
    [publish, self],
  )

  // Not tied to `isSending`/`error`: those describe the composer, and an AI
  // reply arrives on its own schedule rather than from something being typed.
  const sendAiMessage = useCallback(
    (content: string): Promise<boolean> => {
      const trimmed = content.trim()
      if (!trimmed) return Promise.resolve(false)

      return publish({
        sender: { ...AI_CHAT_SENDER },
        role: "assistant",
        content: trimmed,
        timestamp: Date.now(),
      })
    },
    [publish],
  )

  return {
    messages,
    selfId: self ? senderId(self.id, self.info.name) : null,
    isLoading: result.isLoading,
    isSending,
    error,
    send,
    sendAiMessage,
  }
}

/**
 * The id a message is attributed to. Liveblocks only populates `User.id` from
 * `UserMeta`, which the auth route always sets to the Clerk user id — the
 * display name is a last-resort fallback so the schema's non-empty id holds.
 */
function senderId(id: string | undefined, name: string): string {
  return id ?? name
}
