"use client"

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
} from "@xyflow/react"
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

import "@xyflow/react/dist/style.css"
import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-flow/styles.css"

/**
 * React Flow canvas backed by Liveblocks Storage. Nodes, edges, and their
 * change handlers are synced across everyone in the room.
 */
export function CanvasFlow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDelete={onDelete}
      connectionMode={ConnectionMode.Loose}
      fitView
    >
      <Cursors />
      <MiniMap />
      <Background variant={BackgroundVariant.Dots} />
    </ReactFlow>
  )
}
