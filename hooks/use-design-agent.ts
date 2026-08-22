"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/** What `POST /api/ai/design` returns: the run and a token scoped to reading it. */
interface DesignTriggerResponse {
  runId: string
  publicToken: string
}

/**
 * Terminal Trigger.dev run statuses, as strings rather than the SDK's `RunStatus`
 * type: importing it would pull `@trigger.dev/core` into the client bundle for a
 * handful of string literals.
 */
export type DesignRunStatus = string

export interface UseDesignAgentOptions {
  /** Room the design targets — also the project id. */
  roomId: string
  /**
   * Publishes a message to the room's shared `ai-chat` feed on Ghost AI's
   * behalf. Used only for failures the task could not report itself; a run that
   * reaches its own code publishes its reply server-side.
   */
  onAiMessage: (content: string) => void
}

export interface DesignAgentState {
  /** Start a run for `prompt`. No-ops while a run is already in flight. */
  submit: (prompt: string) => Promise<void>
  /** Whether this user's run is still going. */
  isRunning: boolean
  /** Trigger.dev run id, while a run is active. */
  runId: string | undefined
  /** Run-scoped public token used to subscribe to that run. */
  publicToken: string | undefined
  /** Call when the run reaches a terminal state; resets the run state. */
  handleComplete: (status: DesignRunStatus | undefined) => void
}

const START_ERROR =
  "Sorry — I couldn't start the design. Please try again in a moment."

/**
 * Terminal statuses where the task ran far enough to speak for itself: it
 * publishes its summary on success and its failure notice from its own catch,
 * both straight into the room's `ai-chat` feed. Saying anything from here for
 * these would double up.
 */
const TASK_REPORTED_STATUSES = new Set(["COMPLETED", "FAILED"])

/**
 * Terminal statuses where the task never got to publish anything — it expired
 * in the queue, was cancelled, or its process died. Nothing else will tell the
 * room, so the client does.
 */
const UNREPORTED_STATUS_MESSAGES: Record<string, string> = {
  EXPIRED:
    "This design request expired before a worker picked it up. Please try again.",
  CANCELED: "This design run was cancelled.",
  TIMED_OUT: "This design run ran out of time before it finished.",
  CRASHED: "Ghost AI stopped unexpectedly. Please try again.",
  SYSTEM_FAILURE: "Ghost AI stopped unexpectedly. Please try again.",
}

const UNKNOWN_STATUS_MESSAGE =
  "Ghost AI couldn't finish this design. Please try again."

/**
 * Drives an AI design generation from the sidebar: posts the prompt to the
 * trigger route and keeps the returned run id + token so the caller can
 * subscribe to progress. The subscription itself (`useRealtimeRun`) lives in the
 * component so it can be wired to this hook's `runId`/`publicToken` and
 * `handleComplete`.
 *
 * The hook holds no transcript of its own — the prompt and the AI's replies are
 * both published to the room's shared `ai-chat` feed, so the conversation is the
 * same for everyone in the room.
 */
export function useDesignAgent({
  roomId,
  onAiMessage,
}: UseDesignAgentOptions): DesignAgentState {
  const [runId, setRunId] = useState<string | undefined>(undefined)
  const [publicToken, setPublicToken] = useState<string | undefined>(undefined)
  const [isRunning, setIsRunning] = useState(false)

  // Kept in a ref so a caller re-creating the callback doesn't change `submit`'s
  // identity. Written in an effect, never during render.
  const onAiMessageRef = useRef(onAiMessage)
  useEffect(() => {
    onAiMessageRef.current = onAiMessage
  }, [onAiMessage])

  const submit = useCallback(
    async (prompt: string) => {
      const content = prompt.trim()
      if (!content || isRunning) return

      setIsRunning(true)

      try {
        const response = await fetch("/api/ai/design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: content, roomId }),
        })
        if (!response.ok) throw new Error("Failed to start design generation")

        const { runId: newRunId, publicToken: newToken } =
          (await response.json()) as DesignTriggerResponse

        setRunId(newRunId)
        setPublicToken(newToken)
      } catch {
        setIsRunning(false)
        // No run exists, so nothing server-side can report this — say it here.
        onAiMessageRef.current(START_ERROR)
      }
    },
    [isRunning, roomId],
  )

  /**
   * Called once when the run reaches a terminal state (via `useRealtimeRun`'s
   * `onComplete`). Drops the subscription, and speaks for the run only when the
   * run never got the chance to speak for itself.
   */
  const handleComplete = useCallback((status: DesignRunStatus | undefined) => {
    setIsRunning(false)
    setRunId(undefined)
    setPublicToken(undefined)

    if (status && TASK_REPORTED_STATUSES.has(status)) return
    onAiMessageRef.current(
      (status && UNREPORTED_STATUS_MESSAGES[status]) ?? UNKNOWN_STATUS_MESSAGE,
    )
  }, [])

  return { submit, isRunning, runId, publicToken, handleComplete }
}
