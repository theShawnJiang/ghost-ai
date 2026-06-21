"use client"

import { useCallback, useMemo, useRef, type DragEvent } from "react"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type DefaultEdgeOptions,
} from "@xyflow/react"
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow"

import {
  CanvasActionsProvider,
  type CanvasActions,
} from "@/components/editor/canvas/canvas-actions"
import { CanvasNodeView } from "@/components/editor/canvas/canvas-node"
import { ShapePanel } from "@/components/editor/canvas/shape-panel"
import {
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR,
  EDGE_COLOR,
  EDGE_STROKE_WIDTH,
  SHAPE_DRAG_MIME,
  type CanvasEdge,
  type CanvasNode,
  type ShapeDragPayload,
} from "@/types/canvas"

import "@xyflow/react/dist/style.css"
import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-flow/styles.css"

const nodeTypes = { [CANVAS_NODE_TYPE]: CanvasNodeView }

/**
 * Edge defaults merged into every rendered edge by React Flow, so connections
 * created through Liveblocks (which stores only `source`/`target`) still render
 * as a thin near-white smooth-step line with an arrow at the target end.
 */
const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "smoothstep",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: EDGE_COLOR,
    width: 18,
    height: 18,
  },
  style: { stroke: EDGE_COLOR, strokeWidth: EDGE_STROKE_WIDTH },
}

/**
 * React Flow canvas backed by Liveblocks Storage. The `ReactFlowProvider`
 * wrapper lets the inner canvas read the React Flow instance (for drop
 * coordinate conversion) while still being the component that renders
 * `<ReactFlow>`.
 */
export function CanvasFlow() {
  return (
    <ReactFlowProvider>
      <CanvasFlowInner />
    </ReactFlowProvider>
  )
}

function CanvasFlowInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })
  const { screenToFlowPosition, getNode } = useReactFlow<CanvasNode, CanvasEdge>()
  const nodeCounter = useRef(0)

  // Node renderers update labels through this, so edits flow through
  // `onNodesChange` (the Liveblocks mutation) and sync to collaborative storage.
  const updateNodeLabel = useCallback<CanvasActions["updateNodeLabel"]>(
    (id, label) => {
      const node = getNode(id)
      if (!node) return
      onNodesChange([
        { type: "replace", id, item: { ...node, data: { ...node.data, label } } },
      ])
    },
    [getNode, onNodesChange],
  )
  const actions = useMemo<CanvasActions>(
    () => ({ updateNodeLabel }),
    [updateNodeLabel],
  )

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()

      const raw = event.dataTransfer.getData(SHAPE_DRAG_MIME)
      if (!raw) return

      let payload: ShapeDragPayload
      try {
        payload = JSON.parse(raw) as ShapeDragPayload
      } catch {
        return
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      const id = `${payload.shape}-${Date.now()}-${nodeCounter.current++}`
      const newNode: CanvasNode = {
        id,
        type: CANVAS_NODE_TYPE,
        position,
        width: payload.width,
        height: payload.height,
        data: { label: "", color: DEFAULT_NODE_COLOR, shape: payload.shape },
      }

      onNodesChange([{ type: "add", item: newNode }])
    },
    [screenToFlowPosition, onNodesChange],
  )

  return (
    <CanvasActionsProvider value={actions}>
      <div
        className="relative h-full w-full"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDelete={onDelete}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionMode={ConnectionMode.Loose}
          fitView
        >
          <Cursors />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} />
        </ReactFlow>
        <ShapePanel />
      </div>
    </CanvasActionsProvider>
  )
}
