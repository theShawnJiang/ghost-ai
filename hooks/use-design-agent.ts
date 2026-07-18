"use client"

import { useCallback, useState } from "react"

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

export interface AiChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

/**
 * Drives an AI design generation from the sidebar: posts the prompt to the
 * trigger route, mints a run-scoped realtime token, and tracks the chat
 * transcript. The subscription itself (`useRealtimeRun`) lives in the component
 * so it can be wired to this hook's `runId`/`accessToken` and `handleComplete`.
 */
export function useDesignAgent(projectId: string) {
  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [runId, setRunId] = useState<string | undefined>(undefined)
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = useCallback(
    async (prompt: string) => {
      const content = prompt.trim()
      if (!content || isSubmitting) return

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content },
      ])
      setIsSubmitting(true)

      try {
        const designRes = await fetch("/api/ai/design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: content, roomId: projectId, projectId }),
        })
        if (!designRes.ok) throw new Error("Failed to start design generation")
        const { runId: newRunId } = (await designRes.json()) as { runId: string }

        const tokenRes = await fetch("/api/ai/design/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: newRunId }),
        })
        if (!tokenRes.ok) throw new Error("Failed to authorize design run")
        const { token } = (await tokenRes.json()) as { token: string }

        setRunId(newRunId)
        setAccessToken(token)
      } catch {
        setIsSubmitting(false)
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "Sorry — I couldn't start the design. Please try again in a moment.",
          },
        ])
      }
    },
    [isSubmitting, projectId],
  )

  /**
   * Called once when the run reaches a terminal state (via `useRealtimeRun`'s
   * `onComplete`). Appends the AI's closing message and resets the subscription.
   */
  const handleComplete = useCallback(
    (output: DesignRunOutput | undefined, error: Error | undefined) => {
      const content =
        !error && output?.summary
          ? output.summary
          : error
            ? "Ghost AI couldn't finish this design. Please try again."
            : "Design generation finished."

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content },
      ])
      setIsSubmitting(false)
      setRunId(undefined)
      setAccessToken(undefined)
    },
    [],
  )

  return {
    messages,
    submit,
    isSubmitting,
    runId,
    accessToken,
    handleComplete,
  }
}
