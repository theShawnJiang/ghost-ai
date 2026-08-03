"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Shape of the `design-agent` task output. Declared here rather than inferred
 * from the task type to avoid coupling the client bundle to the server task and
 * its trigger-version-specific brand types.
 */
export interface DesignRunOutput {
  roomId: string
  summary: string
  appliedOperations: number
}

/** What `POST /api/ai/design` returns: the run and a token scoped to reading it. */
interface DesignTriggerResponse {
  runId: string
  publicToken: string
}

export interface UseDesignAgentOptions {
  /** Room the design targets — also the project id. */
  roomId: string
  /**
   * Publishes an AI reply to the room's shared `ai-chat` feed. Summaries and
   * failures both go through here so every participant sees the outcome, not
   * just whoever started the run.
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
  handleComplete: (
    output: DesignRunOutput | undefined,
    error: Error | undefined,
  ) => void
}

const START_ERROR =
  "Sorry — I couldn't start the design. Please try again in a moment."
const RUN_ERROR = "Ghost AI couldn't finish this design. Please try again."
const RUN_DONE = "Design generation finished."

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
        onAiMessageRef.current(START_ERROR)
      }
    },
    [isRunning, roomId],
  )

  /**
   * Called once when the run reaches a terminal state (via `useRealtimeRun`'s
   * `onComplete`). Publishes the AI's closing message and drops the subscription.
   */
  const handleComplete = useCallback(
    (output: DesignRunOutput | undefined, error: Error | undefined) => {
      const content = error
        ? RUN_ERROR
        : (output?.summary?.trim() ?? "") || RUN_DONE

      onAiMessageRef.current(content)
      setIsRunning(false)
      setRunId(undefined)
      setPublicToken(undefined)
    },
    [],
  )

  return { submit, isRunning, runId, publicToken, handleComplete }
}
