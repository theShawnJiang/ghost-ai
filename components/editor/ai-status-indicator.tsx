"use client"

import { Check, Loader2, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import { isActivePhase, type AiStatusFeedMessage } from "@/types/tasks"

interface AiStatusIndicatorProps {
  /** Latest status published to the room's `ai-status-feed`, if any. */
  status: AiStatusFeedMessage | null
  /** Whether that status means a task is still running. */
  isActive: boolean
}

/**
 * Compact, room-wide AI activity line for the sidebar. It renders the single
 * most recent status from the shared feed, so every participant sees the same
 * thing — whoever started the run and everyone watching.
 */
export function AiStatusIndicator({ status, isActive }: AiStatusIndicatorProps) {
  if (!status) return null

  const isError = status.phase === "error"

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
        isActive && "border-ai/40 bg-ai/10 text-ai-text",
        !isActive && isError && "border-error/40 bg-elevated text-error",
        !isActive && !isError && "border-surface-border bg-elevated text-copy-muted"
      )}
    >
      {isActive ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      ) : isError ? (
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Check className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="truncate">{statusText(status, isActive)}</span>
    </div>
  )
}

/** The message to show, falling back to a phase description when `text` is absent. */
function statusText(status: AiStatusFeedMessage, isActive: boolean): string {
  const text = status.text?.trim()
  if (text) return text

  const subject = status.kind === "spec" ? "spec" : "design"
  if (isActive || isActivePhase(status.phase)) {
    return `Ghost AI is working on your ${subject}…`
  }
  return status.phase === "error"
    ? `Ghost AI couldn't finish this ${subject}.`
    : `Ghost AI finished your ${subject}.`
}
