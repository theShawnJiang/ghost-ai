"use client"

import { useRef, type DragEvent } from "react"
import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  RectangleHorizontal,
  type LucideIcon,
} from "lucide-react"

import { NodeShapeFrame } from "@/components/editor/canvas/node-shape"
import {
  DEFAULT_NODE_COLOR,
  NODE_SHAPES,
  SHAPE_DEFAULT_SIZES,
  SHAPE_DRAG_MIME,
  type NodeShape,
  type ShapeDragPayload,
} from "@/types/canvas"

const SHAPE_ICONS: Record<NodeShape, LucideIcon> = {
  rectangle: RectangleHorizontal,
  diamond: Diamond,
  circle: Circle,
  pill: Pill,
  cylinder: Cylinder,
  hexagon: Hexagon,
}

const SHAPE_LABELS: Record<NodeShape, string> = {
  rectangle: "Rectangle",
  diamond: "Diamond",
  circle: "Circle",
  pill: "Pill",
  cylinder: "Cylinder",
  hexagon: "Hexagon",
}

/**
 * Floating pill toolbar pinned to the bottom-center of the canvas. Each button
 * can be dragged onto the canvas to create a new node of that shape.
 */
export function ShapePanel() {
  // One off-screen ghost per shape, used as the native drag image so the
  // preview matches the shape and default size that will be dropped.
  const ghostRefs = useRef<Partial<Record<NodeShape, HTMLDivElement | null>>>({})

  const handleDragStart = (
    event: DragEvent<HTMLButtonElement>,
    shape: NodeShape,
  ) => {
    const { width, height } = SHAPE_DEFAULT_SIZES[shape]
    const payload: ShapeDragPayload = { shape, width, height }
    event.dataTransfer.setData(SHAPE_DRAG_MIME, JSON.stringify(payload))
    event.dataTransfer.effectAllowed = "move"

    const ghost = ghostRefs.current[shape]
    if (ghost) {
      // Center the ghost on the cursor; it's auto-removed when the drag ends.
      event.dataTransfer.setDragImage(ghost, width / 2, height / 2)
    }
  }

  return (
    <>
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-surface-border bg-surface/90 p-1.5 shadow-lg backdrop-blur">
        {NODE_SHAPES.map((shape) => {
          const Icon = SHAPE_ICONS[shape]
          return (
            <button
              key={shape}
              type="button"
              draggable
              onDragStart={(event) => handleDragStart(event, shape)}
              title={SHAPE_LABELS[shape]}
              aria-label={`Add ${SHAPE_LABELS[shape]} node`}
              className="flex h-9 w-9 cursor-grab items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary active:cursor-grabbing"
            >
              <Icon className="h-5 w-5" />
            </button>
          )
        })}
      </div>

      {/*
        Off-screen drag previews. Kept rendered (not display:none) so the
        browser can snapshot them synchronously inside onDragStart.
      */}
      <div
        aria-hidden
        className="pointer-events-none fixed -left-[9999px] top-0"
      >
        {NODE_SHAPES.map((shape) => {
          const { width, height } = SHAPE_DEFAULT_SIZES[shape]
          return (
            <div
              key={shape}
              ref={(el) => {
                ghostRefs.current[shape] = el
              }}
              style={{ width, height }}
            >
              <NodeShapeFrame
                shape={shape}
                color={DEFAULT_NODE_COLOR}
                label=""
              />
            </div>
          )
        })}
      </div>
    </>
  )
}
