"use client"

import { createContext, useContext } from "react"

import type { NodeColor } from "@/types/canvas"

/**
 * Imperative canvas actions exposed to node renderers. Node updates must flow
 * through React Flow's `onNodesChange` (a Liveblocks mutation) rather than the
 * local React Flow store, so they sync to collaborative storage.
 */
export interface CanvasActions {
  /** Update a node's label, syncing through the collaborative node state. */
  updateNodeLabel: (id: string, label: string) => void
  /** Update a node's color pair, syncing through the collaborative node state. */
  updateNodeColor: (id: string, color: NodeColor) => void
  /** Update an edge's label, syncing through the collaborative edge state. */
  updateEdgeLabel: (id: string, label: string) => void
}

const CanvasActionsContext = createContext<CanvasActions | null>(null)

export const CanvasActionsProvider = CanvasActionsContext.Provider

export function useCanvasActions(): CanvasActions {
  const actions = useContext(CanvasActionsContext)
  if (!actions) {
    throw new Error("useCanvasActions must be used within a CanvasActionsProvider")
  }
  return actions
}
