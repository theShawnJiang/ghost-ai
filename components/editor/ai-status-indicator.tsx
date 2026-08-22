"use client"

import { Loader2 } from "lucide-react"

import { isActivePhase, type AiStatusFeedMessage } from "@/types/tasks"

interface AiStatusIndicatorProps {
  /** Latest status published to the room's `ai-status-feed`, if any. */
  status: AiStatusFeedMessage | null
  /**
   * Line to show when this user has a run in flight that has not published a
   * status yet — between pressing Send and the task's first `start` phase there
   * can be half a minute of worker cold start with nothing on either channel.
   * Local to whoever started the run; the room learns about it from `status`.
   */
  pendingText?: string | null
}

/**
 * Compact, room-wide AI activity strip shown above the composer while a run is
 * in progress. It renders the single most recent status from the shared feed, so
 * every participant sees the same line — whoever started the run and everyone
 * watching. Finished and failed runs are not shown here: those are published as
 * messages in the chat feed instead, so the strip is purely "work in progress".
 */
export function AiStatusIndicator({
  status,
  pendingText,
}: AiStatusIndicatorProps) {
  // A published status always wins: it is the room-wide truth, and by the time
  // one exists the local "still starting" guess is out of date.
  const active = status && isActivePhase(status.phase) ? status : null
  const text = active ? statusText(active) : pendingText?.trim()
  if (!text) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-2 flex items-center gap-2 rounded-xl border border-brand/40 bg-accent-dim px-3 py-1.5 text-xs text-brand"
    >
      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      <span className="truncate">{text}</span>
      <span className="ml-auto h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-brand" />
    </div>
  )
}

/** The message to show, falling back to a phase description when `text` is absent. */
function statusText(status: AiStatusFeedMessage): string {
  const text = status.text?.trim()
  if (text) return text

  const subject = status.kind === "spec" ? "spec" : "design"
  return `Ghost AI is working on your ${subject}…`
}
