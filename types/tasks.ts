/**
 * Contracts for background-task status shared through the Liveblocks
 * `ai-status-feed`.
 *
 * The feed is the room-wide, durable channel for "what is the AI doing right
 * now": every participant subscribes to it, and unlike a broadcast room event
 * it survives long enough for someone who joins mid-run to see the current
 * state. Kept generic across task kinds so spec generation can publish to the
 * same feed later without a second channel.
 *
 * Free of server- and client-only imports so the Trigger.dev task (producer)
 * and the sidebar (consumer) can both use it.
 */

import type { AiPhase } from "@/types/ai"

/** Id of the shared per-room status feed. One feed per Liveblocks room. */
export const AI_STATUS_FEED_ID = "ai-status-feed"

/** Background task kinds that publish to the status feed. */
export const AI_TASK_KINDS = ["design", "spec"] as const

export type AiTaskKind = (typeof AI_TASK_KINDS)[number]

/** Runtime counterpart of `AiPhase`, used to validate incoming messages. */
const AI_PHASES: readonly AiPhase[] = ["start", "processing", "complete", "error"]

/**
 * A single `ai-status-feed` message.
 *
 * Declared as a `type` (not an `interface`) so it satisfies Liveblocks'
 * `FeedMessageData` JSON constraint — interfaces can be augmented, so TS won't
 * treat them as index-signature-compatible JSON values.
 */
export type AiStatusFeedMessage = {
  /** Which background task published this status. */
  kind: AiTaskKind
  /** Where the task is in its lifecycle. `complete`/`error` are terminal. */
  phase: AiPhase
  /** Optional human-readable status line shown in the sidebar. */
  text?: string
}

/** Whether a phase means a task is still running (drives thinking indicators). */
export function isActivePhase(phase: AiPhase): boolean {
  return phase === "start" || phase === "processing"
}

/**
 * Validate an untrusted feed payload before it is displayed. Messages arrive
 * over the wire and may have been written by an older (or future) producer, so
 * anything that doesn't match the schema is dropped rather than rendered.
 */
export function parseAiStatusFeedMessage(
  data: unknown,
): AiStatusFeedMessage | null {
  if (typeof data !== "object" || data === null) return null

  const { kind, phase, text } = data as Record<string, unknown>

  if (!isAiTaskKind(kind)) return null
  if (!isAiPhase(phase)) return null
  if (text !== undefined && typeof text !== "string") return null

  return { kind, phase, ...(text !== undefined ? { text } : {}) }
}

function isAiTaskKind(value: unknown): value is AiTaskKind {
  return (
    typeof value === "string" && AI_TASK_KINDS.includes(value as AiTaskKind)
  )
}

function isAiPhase(value: unknown): value is AiPhase {
  return typeof value === "string" && AI_PHASES.includes(value as AiPhase)
}
