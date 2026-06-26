"use client"

import {
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react"

import { useCanvasActions } from "@/components/editor/canvas/canvas-actions"
import {
  EDGE_COLOR,
  EDGE_INTERACTION_WIDTH,
  EDGE_STROKE_WIDTH,
  type CanvasEdge,
} from "@/types/canvas"

const LABEL_HINT = "Add label"

/**
 * Custom canvas edge: clean right-angle (smooth-step) routing with an arrow at
 * the target end, dimmed at rest and brightened on hover/selection. The visible
 * line stays thin while {@link EDGE_INTERACTION_WIDTH} provides a wide invisible
 * hit area (via {@link BaseEdge}) so edges are easy to hover and click.
 *
 * Double-clicking an edge edits its inline label. The label is positioned with
 * {@link EdgeLabelRenderer} at the midpoint coordinates returned by
 * {@link getSmoothStepPath} (no manual midpoint math), saved on blur / Enter /
 * Escape, and synced through the collaborative edge data flow.
 */
export function CanvasEdgeView({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  markerEnd,
  data,
  selected,
}: EdgeProps<CanvasEdge>) {
  const { updateEdgeLabel } = useCanvasActions()
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const label = data?.label ?? ""
  const active = Boolean(selected) || hovered
  const hasLabel = label.length > 0

  const startEditing = (event: MouseEvent) => {
    event.stopPropagation()
    setEditing(true)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateEdgeLabel(id, event.target.value)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault()
      setEditing(false)
    }
  }

  // The label area renders while editing, whenever a label exists, or when the
  // edge is active (so an empty active edge can surface the "add label" hint).
  const showLabelArea = editing || hasLabel || active

  return (
    <>
      <g
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onDoubleClick={startEditing}
      >
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          interactionWidth={EDGE_INTERACTION_WIDTH}
          style={{
            stroke: EDGE_COLOR,
            strokeWidth: EDGE_STROKE_WIDTH,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            opacity: active ? 1 : 0.45,
            transition: "opacity 150ms ease",
          }}
        />
      </g>

      {showLabelArea && (
        <EdgeLabelRenderer>
          {/* `nodrag nopan` + `pointer-events-auto` so label clicks and typing
              don't drag the node or pan the canvas. */}
          <div
            className="nodrag nopan pointer-events-auto absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            onDoubleClick={startEditing}
          >
            {editing ? (
              <input
                autoFocus
                value={label}
                onChange={handleChange}
                onBlur={() => setEditing(false)}
                onKeyDown={handleKeyDown}
                placeholder={LABEL_HINT}
                className="min-w-16 rounded-full border border-surface-border bg-surface px-2.5 py-0.5 text-center text-xs font-medium text-copy-primary outline-none [field-sizing:content] placeholder:text-copy-faint"
              />
            ) : hasLabel ? (
              <button
                type="button"
                onDoubleClick={startEditing}
                className="cursor-pointer rounded-full border border-surface-border bg-surface px-2.5 py-0.5 text-xs font-medium text-copy-primary"
              >
                {label}
              </button>
            ) : (
              <button
                type="button"
                onDoubleClick={startEditing}
                className="cursor-pointer rounded-full border border-dashed border-surface-border bg-surface/70 px-2.5 py-0.5 text-xs font-medium text-copy-faint"
              >
                {LABEL_HINT}
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
