"use client"

import { useCallback, useMemo, useRef, type DragEvent } from "react"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type DefaultEdgeOptions,
} from "@xyflow/react"
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow"
import { useCanRedo, useCanUndo, useRedo, useUndo } from "@liveblocks/react"

import {
  CanvasActionsProvider,
  type CanvasActions,
} from "@/components/editor/canvas/canvas-actions"
import { CanvasControls } from "@/components/editor/canvas/canvas-controls"
import { CanvasEdgeView } from "@/components/editor/canvas/canvas-edge"
import { CanvasNodeView } from "@/components/editor/canvas/canvas-node"
import { ShapePanel } from "@/components/editor/canvas/shape-panel"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import {
  useKeyboardShortcuts,
  ZOOM_ANIMATION_DURATION,
} from "@/hooks/useKeyboardShortcuts"
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR,
  EDGE_COLOR,
  SHAPE_DRAG_MIME,
  type CanvasEdge,
  type CanvasNode,
  type ShapeDragPayload,
} from "@/types/canvas"

import "@xyflow/react/dist/style.css"
import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-flow/styles.css"

const nodeTypes = { [CANVAS_NODE_TYPE]: CanvasNodeView }
const edgeTypes = { [CANVAS_EDGE_TYPE]: CanvasEdgeView }

/**
 * Edge defaults merged into every rendered edge by React Flow, so connections
 * created through Liveblocks (which stores only `source`/`target`) still render
 * with the custom canvas edge renderer and an arrow at the target end. The
 * renderer owns the line stroke; only the arrow marker is defined here.
 */
const defaultEdgeOptions: DefaultEdgeOptions = {
  type: CANVAS_EDGE_TYPE,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: EDGE_COLOR,
    width: 18,
    height: 18,
  },
}

/**
 * React Flow canvas backed by Liveblocks Storage. The `ReactFlowProvider`
 * wrapper lets the inner canvas read the React Flow instance (for drop
 * coordinate conversion) while still being the component that renders
 * `<ReactFlow>`.
 */
interface CanvasFlowProps {
  templatesOpen: boolean
  onTemplatesOpenChange: (open: boolean) => void
}

export function CanvasFlow({
  templatesOpen,
  onTemplatesOpenChange,
}: CanvasFlowProps) {
  return (
    <ReactFlowProvider>
      <CanvasFlowInner
        templatesOpen={templatesOpen}
        onTemplatesOpenChange={onTemplatesOpenChange}
      />
    </ReactFlowProvider>
  )
}

function CanvasFlowInner({
  templatesOpen,
  onTemplatesOpenChange,
}: CanvasFlowProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })
  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>()
  const { screenToFlowPosition, getNode, getEdge } = reactFlow
  const nodeCounter = useRef(0)

  // Undo/redo run through Liveblocks history so they revert collaborative
  // canvas state, not just the local React Flow store.
  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  useKeyboardShortcuts({ reactFlow, onUndo: undo, onRedo: redo })

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
  const updateNodeColor = useCallback<CanvasActions["updateNodeColor"]>(
    (id, color) => {
      const node = getNode(id)
      if (!node) return
      onNodesChange([
        { type: "replace", id, item: { ...node, data: { ...node.data, color } } },
      ])
    },
    [getNode, onNodesChange],
  )
  // Edge renderers update labels through this, so edits flow through
  // `onEdgesChange` (the Liveblocks mutation) and sync to collaborative storage.
  const updateEdgeLabel = useCallback<CanvasActions["updateEdgeLabel"]>(
    (id, label) => {
      const edge = getEdge(id)
      if (!edge) return
      onEdgesChange([
        { type: "replace", id, item: { ...edge, data: { ...edge.data, label } } },
      ])
    },
    [getEdge, onEdgesChange],
  )
  const actions = useMemo<CanvasActions>(
    () => ({ updateNodeLabel, updateNodeColor, updateEdgeLabel }),
    [updateNodeLabel, updateNodeColor, updateEdgeLabel],
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

  // Replace the whole canvas with a starter template: clear the current nodes
  // and edges first, then add the template's. Both flow through the Liveblocks
  // mutations so the import is part of the collaborative canvas state.
  const importTemplate = useCallback(
    (template: CanvasTemplate) => {
      onNodesChange([
        ...nodes.map((node) => ({ type: "remove" as const, id: node.id })),
        ...template.nodes.map((node) => ({ type: "add" as const, item: node })),
      ])
      onEdgesChange([
        ...edges.map((edge) => ({ type: "remove" as const, id: edge.id })),
        ...template.edges.map((edge) => ({ type: "add" as const, item: edge })),
      ])
      // Fit once the new nodes have been committed to the React Flow store.
      requestAnimationFrame(() => {
        reactFlow.fitView({ duration: ZOOM_ANIMATION_DURATION })
      })
    },
    [nodes, edges, onNodesChange, onEdgesChange, reactFlow],
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
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDelete={onDelete}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionMode={ConnectionMode.Loose}
          fitView
        >
          <Cursors />
          <Background variant={BackgroundVariant.Dots} />
        </ReactFlow>
        <CanvasControls
          reactFlow={reactFlow}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
        <ShapePanel />
      </div>
      <StarterTemplatesModal
        open={templatesOpen}
        onOpenChange={onTemplatesOpenChange}
        onImport={importTemplate}
      />
    </CanvasActionsProvider>
  )
}
