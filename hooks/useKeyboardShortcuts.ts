"use client"

import { useEffect } from "react"
import type { ReactFlowInstance } from "@xyflow/react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

/** Short animation so keyboard-driven zoom feels smooth, matching the controls. */
export const ZOOM_ANIMATION_DURATION = 200

interface UseKeyboardShortcutsOptions {
  /** The React Flow instance, used to drive zoom shortcuts. */
  reactFlow: ReactFlowInstance<CanvasNode, CanvasEdge>
  /** Invoked for undo shortcuts (`Cmd/Ctrl + Z`). */
  onUndo: () => void
  /** Invoked for redo shortcuts (`Cmd/Ctrl + Shift + Z`, `Cmd/Ctrl + Y`). */
  onRedo: () => void
}

/**
 * Returns true while the user is typing in an input, textarea, or editable
 * field, so canvas shortcuts don't hijack normal text entry.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable
}

/**
 * Wires canvas keyboard shortcuts on `window`:
 * - `+` / `=` zoom in, `-` zoom out (no modifier)
 * - `Cmd/Ctrl + Z` undo, `Cmd/Ctrl + Shift + Z` / `Cmd/Ctrl + Y` redo
 *
 * Shortcuts are skipped while typing in editable fields.
 */
export function useKeyboardShortcuts({
  reactFlow,
  onUndo,
  onRedo,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return

      if (event.metaKey || event.ctrlKey) {
        const key = event.key.toLowerCase()
        if (key === "z") {
          event.preventDefault()
          if (event.shiftKey) onRedo()
          else onUndo()
        } else if (key === "y") {
          event.preventDefault()
          onRedo()
        }
        return
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault()
        void reactFlow.zoomIn({ duration: ZOOM_ANIMATION_DURATION })
      } else if (event.key === "-") {
        event.preventDefault()
        void reactFlow.zoomOut({ duration: ZOOM_ANIMATION_DURATION })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [reactFlow, onUndo, onRedo])
}
