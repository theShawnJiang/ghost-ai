"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

/** Wait this long after the last canvas change before writing to the server. */
const AUTOSAVE_DEBOUNCE_MS = 1000

interface UseCanvasAutosaveOptions {
  projectId: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  /** Lifts save status out of the Liveblocks room (e.g. to the navbar). */
  onStatusChange?: (status: SaveStatus) => void
}

/**
 * Debounced autosave for the collaborative canvas. Watches the synced nodes and
 * edges and, whenever their content changes, writes the latest graph through the
 * canvas API route (which uploads to Vercel Blob and records the URL on the
 * project). The very first content seen on mount is treated as the baseline so a
 * freshly loaded canvas doesn't trigger a redundant write.
 */
export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  onStatusChange,
}: UseCanvasAutosaveOptions): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>("idle")

  const onStatusChangeRef = useRef(onStatusChange)
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
  }, [onStatusChange])

  const updateStatus = useCallback((next: SaveStatus) => {
    setStatus(next)
    onStatusChangeRef.current?.(next)
  }, [])

  // Content-based comparison avoids spurious saves from array reference churn
  // (Liveblocks re-renders on presence updates without changing the graph).
  const serialized = JSON.stringify({ nodes, edges })
  const lastSaved = useRef<string | null>(null)

  useEffect(() => {
    // Record the initial graph as the baseline without saving it.
    if (lastSaved.current === null) {
      lastSaved.current = serialized
      return
    }
    if (serialized === lastSaved.current) return

    updateStatus("saving")
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/canvas`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: serialized,
        })
        if (!response.ok) {
          throw new Error(`Autosave failed: ${response.status}`)
        }
        lastSaved.current = serialized
        updateStatus("saved")
      } catch {
        updateStatus("error")
      }
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [projectId, serialized, updateStatus])

  return status
}
