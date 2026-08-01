/**
 * Contracts for the room-scoped Liveblocks feeds the AI sidebar reads.
 *
 * Two feeds, deliberately kept apart:
 *
 * - `ai-status-feed` — the durable channel for "what is the AI doing right
 *   now". Every participant subscribes, and unlike a broadcast room event it
 *   survives long enough for someone who joins mid-run to see the current
 *   state. Generic across task kinds so spec generation can publish to it later
 *   without a second channel.
 * - `ai-chat` — human chat between the people in the room. It carries no
 *   progress or presence information; mixing the two would make a status update
 *   indistinguishable from something a teammate said.
 *
 * Free of server- and client-only imports so the Trigger.dev task (producer)
 * and the sidebar (consumer) can both use it.
 */

import { z } from "zod"

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

/* -------------------------------------------------------------------------- */
/*                                  ai-chat                                   */
/* -------------------------------------------------------------------------- */

/** Id of the shared per-room chat feed. Separate from `AI_STATUS_FEED_ID`. */
export const AI_CHAT_FEED_ID = "ai-chat"

/** Who a chat message is attributed to. Only `user` is written today. */
export const AI_CHAT_ROLES = ["user", "assistant"] as const

export type AiChatRole = (typeof AI_CHAT_ROLES)[number]

/**
 * Schema for one `ai-chat` message. Feed payloads arrive over the wire from
 * other clients, so every message is parsed through this before it is rendered.
 */
export const aiChatFeedMessageSchema = z.object({
  /** Who sent it, denormalized — feed messages carry no author of their own. */
  sender: z.object({
    /** Liveblocks/Clerk user id. */
    id: z.string().min(1),
    /** Display name resolved at auth time. */
    name: z.string().min(1),
    /** Profile image URL, when the sender has one. */
    avatar: z.string().optional(),
  }),
  role: z.enum(AI_CHAT_ROLES),
  content: z.string().min(1),
  /** Epoch ms, mirrored into the feed message's own `createdAt` when sent. */
  timestamp: z.number().int().nonnegative(),
})

/**
 * A single `ai-chat` message.
 *
 * Inferred from the schema (rather than declared and validated separately) so
 * the runtime check and the compile-time shape can never drift apart. `z.infer`
 * yields an anonymous object type, which — like the `type` alias above — TS
 * treats as index-signature-compatible with Liveblocks' JSON constraint.
 */
export type AiChatFeedMessage = z.infer<typeof aiChatFeedMessageSchema>

/**
 * Validate an untrusted chat payload before it is displayed. Anything that
 * doesn't match the schema is dropped rather than rendered — the same feed API
 * also carries status messages, and a client running older code may have
 * written a shape this one doesn't understand.
 */
export function parseAiChatFeedMessage(
  data: unknown,
): AiChatFeedMessage | null {
  const result = aiChatFeedMessageSchema.safeParse(data)
  return result.success ? result.data : null
}
