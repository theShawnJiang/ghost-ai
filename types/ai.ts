/**
 * Shared AI design-agent types used across the Trigger.dev task (server), the
 * Liveblocks room event typing, and the client presence/sidebar UI. Kept free of
 * server- or client-only imports so it is safe to reference from any layer.
 */

/** Phases an AI design run moves through, published as it progresses. */
export type AiPhase = "start" | "processing" | "complete" | "error"

/**
 * Broadcast to every participant in a Liveblocks room while the design agent
 * runs, so the AI's presence (a cursor + thinking state) and status feed are
 * visible to everyone — not just the user who triggered the run. Ephemeral by
 * design: it drives live presence, so it is never persisted to storage.
 */
// Declared as `type` (not `interface`) so they satisfy Liveblocks' RoomEvent
// and Trigger's metadata JSON constraints — interfaces can be augmented, so TS
// won't treat them as index-signature-compatible JSON values.
export type AiStatusEvent = {
  type: "ai-status"
  /** Current phase of the run. `complete`/`error` clear the AI presence. */
  phase: AiPhase
  /** Human-readable status message for the shared feed. */
  message: string
  /** Whether the AI is actively working (drives the thinking indicator). */
  thinking: boolean
  /** AI cursor position in flow coordinates, or `null` to hide the cursor. */
  cursor: { x: number; y: number } | null
}

/** One entry in the run's status log, surfaced to the triggering user's chat. */
export type AiLogEntry = {
  phase: AiPhase
  message: string
}

/** Display identity for the AI collaborator's presence on the canvas. */
export const AI_PRESENCE_NAME = "Ghost AI"

/** AI accent color (`--accent-ai`) used for the AI cursor and presence chrome. */
export const AI_PRESENCE_COLOR = "#6457f9"
