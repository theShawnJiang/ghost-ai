"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useCreateFeed, useFeedMessages } from "@liveblocks/react"

import {
  AI_STATUS_FEED_ID,
  isActivePhase,
  parseAiStatusFeedMessage,
  type AiStatusFeedMessage,
} from "@/types/tasks"

/**
 * Page size for the status feed. Only the most recent message is ever shown, so
 * this just needs to be small enough to stay cheap and large enough that the
 * newest message is in the first page.
 */
const STATUS_PAGE_SIZE = 20

/**
 * Treat a still-running status older than this as stale. A task that dies
 * without publishing a terminal phase would otherwise leave every participant's
 * composer disabled forever.
 */
export const AI_STATUS_STALE_MS = 120_000

export interface AiStatusFeedState {
  /** The most recent valid status message in the room, if any. */
  status: AiStatusFeedMessage | null
  /** Whether a background task is currently working in this room. */
  isActive: boolean
}

/**
 * Subscribes to the room's shared `ai-status-feed` and exposes only the latest
 * status. Because the feed is room-wide, every participant sees the same
 * indicator — not just whoever started the run. Must be used inside a
 * `RoomProvider`.
 */
export function useAiStatusFeed(): AiStatusFeedState {
  // A room has no status feed until something publishes to it, and subscribing
  // to a missing feed resolves to an error. Creating it up front (idempotently
  // — a second create just fails and is ignored) means the very first run is
  // visible without a reload. The background task creates it too, whichever
  // gets there first.
  const createFeed = useCreateFeed()
  const hasEnsuredFeed = useRef(false)
  useEffect(() => {
    if (hasEnsuredFeed.current) return
    hasEnsuredFeed.current = true
    void createFeed(AI_STATUS_FEED_ID).catch(() => {
      // Already exists, or the user lacks feed write access — either way the
      // subscription below is still the source of truth.
    })
  }, [createFeed])

  const result = useFeedMessages(AI_STATUS_FEED_ID, { limit: STATUS_PAGE_SIZE })
  const messages = result.messages

  // Newest valid message. Payloads come off the wire, so each is validated
  // against the schema and anything unrecognized is ignored rather than shown.
  const latest = useMemo(() => {
    if (!messages) return null

    let newest: { status: AiStatusFeedMessage; createdAt: number } | null = null
    for (const message of messages) {
      const status = parseAiStatusFeedMessage(message.data)
      if (!status) continue
      if (!newest || message.createdAt > newest.createdAt) {
        newest = { status, createdAt: message.createdAt }
      }
    }
    return newest
  }, [messages])

  // Expire a running status that never reached a terminal phase. Tracked as the
  // `createdAt` that expired so the check stays pure across re-renders.
  const [expiredAt, setExpiredAt] = useState<number | null>(null)
  useEffect(() => {
    if (!latest || !isActivePhase(latest.status.phase)) return

    const timer = setTimeout(
      () => setExpiredAt(latest.createdAt),
      Math.max(latest.createdAt + AI_STATUS_STALE_MS - Date.now(), 0),
    )
    return () => clearTimeout(timer)
  }, [latest])

  return {
    status: latest?.status ?? null,
    isActive:
      latest !== null &&
      isActivePhase(latest.status.phase) &&
      expiredAt !== latest.createdAt,
  }
}
