"use client"

import { type NodeProps } from "@xyflow/react"

import { NodeShapeFrame } from "@/components/editor/canvas/node-shape"
import type { CanvasNode } from "@/types/canvas"

/**
 * Renderer for the custom canvas node type. Delegates the shape visuals to the
 * shared {@link NodeShapeFrame} so the on-canvas node and the shape-panel drag
 * preview render identically.
 */
export function CanvasNodeView({ data, selected }: NodeProps<CanvasNode>) {
  return (
    <NodeShapeFrame
      shape={data.shape}
      color={data.color}
      label={data.label}
      selected={selected}
    />
  )
}
