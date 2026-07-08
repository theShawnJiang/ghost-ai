"use client"

import { Check, Cloud, Loader2, TriangleAlert } from "lucide-react"

import type { SaveStatus } from "@/hooks/use-canvas-autosave"
import { cn } from "@/lib/utils"

interface SaveStatusIndicatorProps {
  status: SaveStatus
}

const STATUS_CONFIG: Record<
  SaveStatus,
  { icon: typeof Cloud; label: string; className: string; spin?: boolean }
> = {
  idle: { icon: Cloud, label: "Save", className: "text-copy-muted" },
  saving: {
    icon: Loader2,
    label: "Saving…",
    className: "text-copy-muted",
    spin: true,
  },
  saved: { icon: Check, label: "Saved", className: "text-success" },
  error: { icon: TriangleAlert, label: "Save failed", className: "text-error" },
}

/**
 * Read-only Save status shown in the editor navbar. Autosave persists the
 * canvas automatically; this surfaces whether the latest changes are written.
 */
export function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  const { icon: Icon, label, className, spin } = STATUS_CONFIG[status]

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className={cn("size-3.5", spin && "animate-spin")} />
      {label}
    </div>
  )
}
