import type { Edge, Node } from "@xyflow/react"

/**
 * Custom React Flow type identifiers. The actual node/edge renderers are added
 * in a later feature — for now these only name the types used across the canvas.
 */
export const CANVAS_NODE_TYPE = "canvasNode" as const
export const CANVAS_EDGE_TYPE = "canvasEdge" as const

/**
 * Node color palette — each pair is a dark fill plus a vivid contrasting text
 * color tuned for readability on the dark canvas. See `ui-context.md`.
 */
export const NODE_COLORS = [
  { id: "neutral", fill: "#1F1F1F", text: "#EDEDED" },
  { id: "blue", fill: "#10233D", text: "#52A8FF" },
  { id: "purple", fill: "#2E1938", text: "#BF7AF0" },
  { id: "orange", fill: "#331B00", text: "#FF990A" },
  { id: "red", fill: "#3C1618", text: "#FF6166" },
  { id: "pink", fill: "#3A1726", text: "#F75F8F" },
  { id: "green", fill: "#0F2E18", text: "#62C073" },
  { id: "teal", fill: "#062822", text: "#0AC7B4" },
] as const

export type NodeColor = (typeof NODE_COLORS)[number]["id"]

export const DEFAULT_NODE_COLOR: NodeColor = "neutral"

/**
 * Supported node shapes. Complex shapes are rendered as inline SVGs in a later
 * feature; this list is the source of truth for the available shapes.
 */
export const NODE_SHAPES = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
] as const

export type NodeShape = (typeof NODE_SHAPES)[number]

export const DEFAULT_NODE_SHAPE: NodeShape = "rectangle"

/** Default on-canvas dimensions for each shape, in canvas units. */
export interface ShapeSize {
  width: number
  height: number
}

/**
 * Sensible default sizes per shape: rectangles are wider than tall, circles are
 * square, and diamonds are slightly larger so labels have room.
 */
export const SHAPE_DEFAULT_SIZES: Record<NodeShape, ShapeSize> = {
  rectangle: { width: 160, height: 80 },
  diamond: { width: 150, height: 110 },
  circle: { width: 100, height: 100 },
  pill: { width: 160, height: 64 },
  cylinder: { width: 130, height: 100 },
  hexagon: { width: 150, height: 90 },
}

/** MIME type used to carry a shape across an HTML5 drag-and-drop. */
export const SHAPE_DRAG_MIME = "application/ghost-shape"

/** Payload carried when dragging a shape from the shape panel onto the canvas. */
export interface ShapeDragPayload extends ShapeSize {
  shape: NodeShape
}

/**
 * Data carried by every canvas node.
 */
export interface CanvasNodeData extends Record<string, unknown> {
  label: string
  color: NodeColor
  shape: NodeShape
}

/** A canvas node — a React Flow `Node` of type `canvasNode`. */
export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>

/** Data carried by canvas edges (none yet). */
export type CanvasEdgeData = Record<string, unknown>

/** A canvas edge — a React Flow `Edge` of type `canvasEdge`. */
export type CanvasEdge = Edge<CanvasEdgeData, typeof CANVAS_EDGE_TYPE>
