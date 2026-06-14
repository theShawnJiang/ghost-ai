"use client"

import { NODE_COLORS, type NodeColor, type NodeShape } from "@/types/canvas"

/** Fast lookup from a node color id to its fill/text pair. */
const COLOR_MAP = Object.fromEntries(
  NODE_COLORS.map((color) => [color.id, color]),
) as Record<NodeColor, (typeof NODE_COLORS)[number]>

/** Shapes drawn with plain CSS borders rather than inline SVG. */
const CSS_SHAPES = new Set<NodeShape>(["rectangle", "pill", "circle"])

interface NodeShapeFrameProps {
  shape: NodeShape
  color: NodeColor
  label: string
  /** Brightens the border when the node is selected. */
  selected?: boolean
}

/**
 * Renders a single node's shape visuals plus its centered label. Shared by the
 * React Flow node renderer and the shape-panel drag preview so both stay in
 * sync. The frame fills its parent, so callers control the on-canvas size.
 */
export function NodeShapeFrame({
  shape,
  color,
  label,
  selected = false,
}: NodeShapeFrameProps) {
  const { fill, text } = COLOR_MAP[color]
  // Subtle border at rest, the full vivid text color when selected.
  const borderColor = selected ? text : `${text}40`
  const strokeWidth = selected ? 2.5 : 1.5

  if (CSS_SHAPES.has(shape)) {
    const borderRadius = shape === "rectangle" ? "0.75rem" : "9999px"
    return (
      <div
        className="flex h-full w-full items-center justify-center border px-3 py-2 text-center text-sm font-medium"
        style={{
          background: fill,
          color: text,
          borderColor,
          borderWidth: strokeWidth,
          borderRadius,
        }}
      >
        <span className="line-clamp-3 break-words">{label}</span>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {shape === "diamond" && (
          <polygon
            points="50,3 97,50 50,97 3,50"
            fill={fill}
            stroke={borderColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {shape === "hexagon" && (
          <polygon
            points="26,5 74,5 97,50 74,95 26,95 3,50"
            fill={fill}
            stroke={borderColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {shape === "cylinder" && (
          <>
            <path
              d="M3,12 C3,6 97,6 97,12 L97,88 C97,94 3,94 3,88 Z"
              fill={fill}
              stroke={borderColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M3,12 C3,18 97,18 97,12"
              fill="none"
              stroke={borderColor}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm font-medium"
        style={{ color: text }}
      >
        <span className="line-clamp-3 break-words">{label}</span>
      </div>
    </div>
  )
}
