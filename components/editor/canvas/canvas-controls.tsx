"use client"

import type { ComponentProps } from "react"
import {
  Maximize,
  Redo2,
  Undo2,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react"
import type { ReactFlowInstance } from "@xyflow/react"

import { ZOOM_ANIMATION_DURATION } from "@/hooks/useKeyboardShortcuts"
import type { CanvasEdge, CanvasNode } from "@/types/canvas"

interface CanvasControlsProps {
  reactFlow: ReactFlowInstance<CanvasNode, CanvasEdge>
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

/**
 * Floating pill control bar pinned to the bottom-left of the canvas. Groups
 * zoom controls (out / fit / in) and history controls (undo / redo), wired to
 * the React Flow instance and Liveblocks history.
 */
export function CanvasControls({
  reactFlow,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: CanvasControlsProps) {
  const animate = { duration: ZOOM_ANIMATION_DURATION }

  return (
    <div className="absolute bottom-6 left-6 z-10 flex items-center gap-1 rounded-full border border-surface-border bg-surface/90 p-1.5 shadow-lg backdrop-blur">
      <ControlButton
        label="Zoom out"
        icon={ZoomOut}
        onClick={() => void reactFlow.zoomOut(animate)}
      />
      <ControlButton
        label="Fit view"
        icon={Maximize}
        onClick={() => void reactFlow.fitView(animate)}
      />
      <ControlButton
        label="Zoom in"
        icon={ZoomIn}
        onClick={() => void reactFlow.zoomIn(animate)}
      />

      <div className="mx-1 h-5 w-px bg-surface-border" />

      <ControlButton
        label="Undo"
        icon={Undo2}
        onClick={onUndo}
        disabled={!canUndo}
      />
      <ControlButton
        label="Redo"
        icon={Redo2}
        onClick={onRedo}
        disabled={!canRedo}
      />
    </div>
  )
}

interface ControlButtonProps extends ComponentProps<"button"> {
  label: string
  icon: LucideIcon
}

function ControlButton({ label, icon: Icon, ...props }: ControlButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary disabled:pointer-events-none disabled:opacity-40"
      {...props}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}
