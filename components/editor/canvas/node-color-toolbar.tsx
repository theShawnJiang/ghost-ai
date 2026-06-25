"use client"

import { useState, type MouseEvent } from "react"

import { NODE_COLORS, type NodeColor } from "@/types/canvas"

interface NodeColorToolbarProps {
  /** The node's current color id, so its swatch reads as active. */
  activeColor: NodeColor
  /** Apply a color pair to the node. */
  onSelect: (color: NodeColor) => void
}

/**
 * Floating swatch toolbar shown just above a selected node. One swatch per
 * predefined color pair; picking one updates both the node fill and text color
 * (they're a single `NodeColor` id under the hood). The container carries
 * `nodrag`/`nopan` so clicking swatches never drags the node or pans the canvas.
 */
export function NodeColorToolbar({ activeColor, onSelect }: NodeColorToolbarProps) {
  return (
    <div className="nodrag nopan absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1 shadow-lg backdrop-blur">
      {NODE_COLORS.map((color) => (
        <ColorSwatch
          key={color.id}
          fill={color.fill}
          text={color.text}
          active={color.id === activeColor}
          onSelect={() => onSelect(color.id)}
        />
      ))}
    </div>
  )
}

interface ColorSwatchProps {
  fill: string
  text: string
  active: boolean
  onSelect: () => void
}

function ColorSwatch({ fill, text, active, onSelect }: ColorSwatchProps) {
  const [hovered, setHovered] = useState(false)

  const handleClick = (event: MouseEvent) => {
    // Keep the click from reaching the node/pane underneath.
    event.stopPropagation()
    onSelect()
  }

  return (
    <button
      type="button"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      aria-pressed={active}
      className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border transition-transform hover:scale-110"
      style={{
        background: fill,
        // Active reads as the full vivid text color; a tight glow on hover.
        borderColor: active ? text : `${text}55`,
        borderWidth: active ? 2 : 1,
        boxShadow: hovered ? `0 0 6px 1px ${text}99` : undefined,
      }}
    >
      {/* Inner dot in the paired text color so the swatch shows both colors. */}
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: text }}
      />
    </button>
  )
}
