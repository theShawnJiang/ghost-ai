import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  SHAPE_DEFAULT_SIZES,
  type CanvasEdge,
  type CanvasNode,
  type NodeColor,
  type NodeShape,
} from "@/types/canvas"

/**
 * A pre-built canvas the user can import to start from a diagram instead of a
 * blank canvas. Nodes and edges use the shared canvas types so an imported
 * template flows through the exact same collaborative state as hand-drawn work.
 */
export interface CanvasTemplate {
  id: string
  name: string
  description: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

/** The side of a node an edge attaches to — matches the connection handle ids. */
type NodeSide = "top" | "right" | "bottom" | "left"

/**
 * Build a template node at a position, sized from the shape's defaults so the
 * template data stays declarative — callers only choose shape, color, and where.
 */
function tNode(
  id: string,
  label: string,
  shape: NodeShape,
  color: NodeColor,
  position: { x: number; y: number },
): CanvasNode {
  const { width, height } = SHAPE_DEFAULT_SIZES[shape]
  return {
    id,
    type: CANVAS_NODE_TYPE,
    position,
    width,
    height,
    data: { label, color, shape },
  }
}

/**
 * Build a template edge. The handle sides keep the smooth-step routing clean and
 * predictable; an optional label rides along through the collaborative edge data.
 */
function tEdge(
  source: string,
  target: string,
  handles: [NodeSide, NodeSide],
  label?: string,
): CanvasEdge {
  return {
    id: `${source}-${target}`,
    type: CANVAS_EDGE_TYPE,
    source,
    target,
    sourceHandle: handles[0],
    targetHandle: handles[1],
    data: label ? { label } : {},
  }
}

const microservices: CanvasTemplate = {
  id: "microservices",
  name: "Microservices",
  description:
    "An API gateway fanning out to independent services backed by a shared database and a message queue.",
  nodes: [
    tNode("ms-gateway", "API Gateway", "pill", "blue", { x: 320, y: 0 }),
    tNode("ms-auth", "Auth Service", "pill", "purple", { x: 60, y: 180 }),
    tNode("ms-user", "User Service", "pill", "green", { x: 320, y: 180 }),
    tNode("ms-order", "Order Service", "pill", "orange", { x: 580, y: 180 }),
    tNode("ms-db", "Database", "cylinder", "teal", { x: 335, y: 360 }),
    tNode("ms-queue", "Message Queue", "hexagon", "pink", { x: 585, y: 365 }),
  ],
  edges: [
    tEdge("ms-gateway", "ms-auth", ["bottom", "top"]),
    tEdge("ms-gateway", "ms-user", ["bottom", "top"]),
    tEdge("ms-gateway", "ms-order", ["bottom", "top"]),
    tEdge("ms-user", "ms-db", ["bottom", "top"], "reads/writes"),
    tEdge("ms-order", "ms-db", ["bottom", "left"]),
    tEdge("ms-order", "ms-queue", ["bottom", "top"], "events"),
  ],
}

const cicdPipeline: CanvasTemplate = {
  id: "cicd-pipeline",
  name: "CI/CD Pipeline",
  description:
    "A linear delivery pipeline from commit through build, test, and staged deploys, with a rollback path.",
  nodes: [
    tNode("cd-commit", "Commit", "circle", "blue", { x: 0, y: 40 }),
    tNode("cd-build", "Build", "pill", "purple", { x: 180, y: 58 }),
    tNode("cd-test", "Test", "pill", "orange", { x: 420, y: 58 }),
    tNode("cd-staging", "Deploy Staging", "pill", "green", { x: 660, y: 58 }),
    tNode("cd-prod", "Deploy Prod", "pill", "teal", { x: 900, y: 58 }),
    tNode("cd-rollback", "Rollback", "diamond", "red", { x: 905, y: 240 }),
  ],
  edges: [
    tEdge("cd-commit", "cd-build", ["right", "left"]),
    tEdge("cd-build", "cd-test", ["right", "left"]),
    tEdge("cd-test", "cd-staging", ["right", "left"]),
    tEdge("cd-staging", "cd-prod", ["right", "left"]),
    tEdge("cd-prod", "cd-rollback", ["bottom", "top"], "on failure"),
  ],
}

const eventDriven: CanvasTemplate = {
  id: "event-driven",
  name: "Event-Driven System",
  description:
    "A producer publishing to an event bus that fans out to consumers, an event store, and a dead-letter queue.",
  nodes: [
    tNode("ev-producer", "Producer", "pill", "blue", { x: 0, y: 160 }),
    tNode("ev-bus", "Event Bus", "hexagon", "purple", { x: 280, y: 147 }),
    tNode("ev-consumer-a", "Consumer A", "pill", "green", { x: 560, y: 60 }),
    tNode("ev-consumer-b", "Consumer B", "pill", "orange", { x: 560, y: 240 }),
    tNode("ev-store", "Event Store", "cylinder", "teal", { x: 295, y: 340 }),
    tNode("ev-dlq", "Dead Letter Queue", "cylinder", "red", { x: 560, y: 420 }),
  ],
  edges: [
    tEdge("ev-producer", "ev-bus", ["right", "left"], "publish"),
    tEdge("ev-bus", "ev-consumer-a", ["right", "left"]),
    tEdge("ev-bus", "ev-consumer-b", ["right", "left"]),
    tEdge("ev-bus", "ev-store", ["bottom", "top"]),
    tEdge("ev-consumer-b", "ev-dlq", ["bottom", "top"], "on error"),
  ],
}

/** The starter template library shown in the import modal. */
export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  microservices,
  cicdPipeline,
  eventDriven,
]
