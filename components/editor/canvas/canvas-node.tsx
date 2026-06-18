"use client"

import {
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react"
import { NodeResizer, type NodeProps } from "@xyflow/react"

import { useCanvasActions } from "@/components/editor/canvas/canvas-actions"
import { NodeShapeFrame } from "@/components/editor/canvas/node-shape"
import {
  MIN_NODE_HEIGHT,
  MIN_NODE_WIDTH,
  getNodeColor,
  type CanvasNode,
} from "@/types/canvas"

const LABEL_PLACEHOLDER = "Add label"

/**
 * Renderer for the custom canvas node type. Delegates the shape visuals to the
 * shared {@link NodeShapeFrame}, adds {@link NodeResizer} handles when selected,
 * and supports inline label editing via a textarea overlaid on the centered
 * label. All updates flow through the collaborative node state.
 */
export function CanvasNodeView({ id, data, selected }: NodeProps<CanvasNode>) {
  const { updateNodeLabel } = useCanvasActions()
  const [editing, setEditing] = useState(false)

  const { text } = getNodeColor(data.color)
  const isEmpty = data.label.length === 0

  const startEditing = (event: MouseEvent) => {
    // Keep the double-click from reaching the pane (which would zoom).
    event.stopPropagation()
    setEditing(true)
  }

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeLabel(id, event.target.value)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      setEditing(false)
    }
  }

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_NODE_WIDTH}
        minHeight={MIN_NODE_HEIGHT}
        color="var(--border-subtle)"
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 2,
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
        }}
        lineStyle={{ borderColor: "var(--border-subtle)" }}
      />
      <div className="relative h-full w-full" onDoubleClick={startEditing}>
        {/* Blank the underlying label while editing so the textarea is the only
            visible copy — avoids duplicate text and any layout shift. */}
        <NodeShapeFrame
          shape={data.shape}
          color={data.color}
          label={editing ? "" : data.label}
          selected={selected}
        />

        {!editing && isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm font-medium text-copy-faint">
            {LABEL_PLACEHOLDER}
          </div>
        )}

        {editing && (
          // Centered overlay so the editing text sits exactly where the label
          // rests — no jump when entering edit mode. `nodrag`/`nopan` stop text
          // interactions from moving the node or panning the canvas.
          <div className="nodrag nopan absolute inset-0 flex items-center justify-center px-4">
            <textarea
              // Mounts only while editing, so autoFocus places the caret here.
              autoFocus
              rows={1}
              value={data.label}
              onChange={handleChange}
              onBlur={() => setEditing(false)}
              onKeyDown={handleKeyDown}
              placeholder={LABEL_PLACEHOLDER}
              className="nodrag nopan max-h-full w-full resize-none border-none bg-transparent text-center text-sm font-medium outline-none [field-sizing:content] placeholder:text-copy-faint"
              style={{ color: text }}
            />
          </div>
        )}
      </div>
    </>
  )
}
