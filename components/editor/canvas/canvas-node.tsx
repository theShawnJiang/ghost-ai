"use client"

import { type NodeProps } from "@xyflow/react"

import type { CanvasNode } from "@/types/canvas"

/**
 * Basic renderer for the custom canvas node type. For this unit every shape is
 * drawn as a simple bordered rectangle with the label centered — shape-specific
 * visuals are added in a later feature.
 */
export function CanvasNodeView({ data }: NodeProps<CanvasNode>) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl border border-surface-border bg-surface px-3 py-2 text-center text-sm text-copy-primary">
      {data.label}
    </div>
  )
}
