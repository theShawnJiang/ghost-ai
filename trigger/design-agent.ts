import { logger, metadata, task } from "@trigger.dev/sdk";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { mutateFlow } from "@liveblocks/react-flow/node";
import { z } from "zod";

import { getLiveblocks } from "@/lib/liveblocks";
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  NODE_COLORS,
  NODE_SHAPES,
  SHAPE_DEFAULT_SIZES,
  type CanvasEdge,
  type CanvasNode,
  type NodeColor,
} from "@/types/canvas";
import type { AiLogEntry, AiPhase, AiStatusEvent } from "@/types/ai";

/**
 * `design-agent` — turns a natural-language prompt into a real-time system
 * design on the shared collaborative canvas.
 *
 * Flow:
 *  1. Broadcast AI presence (cursor + thinking) and status to the whole room.
 *  2. Read the current canvas, then ask Gemini for structured design operations.
 *  3. Apply each operation through the collaborative flow utilities
 *     (`mutateFlow`), so updates appear live for every participant.
 *  4. Publish status at each key step and clear AI presence when finished.
 *
 * The status feed is delivered two ways: `metadata` (for the triggering user's
 * run subscription) and `broadcastEvent` (so all room participants see the AI's
 * presence and progress, not just whoever started the run).
 */
export interface DesignAgentPayload {
  /** The natural-language design prompt from the user. */
  prompt: string;
  /** Liveblocks room id (the project id) the design targets. */
  roomId: string;
}

/** Gemini model used to interpret prompts into structured design operations. */
const DESIGN_MODEL = "gemini-2.0-flash";

/**
 * Layout guidance the model must follow so generated diagrams stay readable:
 * left-to-right flow with generous, overlap-free spacing.
 */
const COLUMN_SPACING = 260;
const ROW_SPACING = 170;

/** Delay between applied operations so the canvas visibly builds up live. */
const STEP_DELAY_MS = 130;

/** Cap operations to keep a single run bounded in time and canvas size. */
const MAX_OPERATIONS = 60;

const NODE_COLOR_IDS = NODE_COLORS.map((color) => color.id) as [
  NodeColor,
  ...NodeColor[],
];

/**
 * A single design operation. Kept as one flat object (rather than a discriminated
 * union) because Gemini's structured-output mode handles flat schemas far more
 * reliably; each field is validated against the operation `type` when applied.
 */
const operationSchema = z.object({
  type: z.enum([
    "addNode",
    "moveNode",
    "resizeNode",
    "updateNode",
    "deleteNode",
    "addEdge",
    "deleteEdge",
  ]),
  /** Target node/edge id. For `add*`, a new stable id the model invents. */
  id: z.string(),
  label: z.string().optional(),
  shape: z.enum(NODE_SHAPES).optional(),
  color: z.enum(NODE_COLOR_IDS).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  source: z.string().optional(),
  target: z.string().optional(),
});

type DesignOperation = z.infer<typeof operationSchema>;

/**
 * `mutateFlow`'s expected client type. Cast through this because `@liveblocks/node`
 * resolves a nested (patch-newer) `@liveblocks/core` than `@liveblocks/react-flow`,
 * so the structurally-identical `LiveObject` types are nominally incompatible.
 */
type FlowClient = Parameters<typeof mutateFlow>[0]["client"];

const designSchema = z.object({
  summary: z
    .string()
    .describe("One short sentence describing the design you produced."),
  operations: z
    .array(operationSchema)
    .describe("Ordered list of operations to apply to the canvas."),
});

const SYSTEM_PROMPT = `You are Ghost AI, a system-design architect. You translate a user's prompt into a diagram on a collaborative canvas by emitting a list of operations.

Node shapes (use them semantically):
- rectangle: general component/service
- pill: process/service
- circle: event/endpoint
- diamond: decision/gateway
- cylinder: database/storage
- hexagon: external system/boundary

Node colors (ids only): ${NODE_COLOR_IDS.join(", ")}. Use color to group related concerns (e.g. all datastores one color). Default to "neutral" when unsure.

Layout rules:
- Lay nodes out left-to-right by data/request flow.
- Space columns ~${COLUMN_SPACING}px apart (x) and rows ~${ROW_SPACING}px apart (y). Never overlap nodes.
- Keep labels short (1-4 words).

Operation rules:
- To build a new design, emit "addNode" ops (with id, label, shape, color, x, y) then "addEdge" ops (with id, source, target, and optional label) connecting them. Every edge's source and target must reference node ids that exist.
- To refine an existing canvas, use "moveNode" (x, y), "resizeNode" (width, height), "updateNode" (any of label/shape/color), "deleteNode" (id), or "deleteEdge" (id) against the ids given to you.
- Invent short, unique, descriptive ids (e.g. "api-gateway", "orders-db").
- Keep the whole design focused: at most ${MAX_OPERATIONS} operations.`;

export const designAgent = task({
  id: "design-agent",
  // Never retry: a partial run has already written nodes to the shared canvas,
  // so a retry would duplicate them. Failures are surfaced via status instead.
  retry: { maxAttempts: 1 },
  run: async (payload: DesignAgentPayload) => {
    const { prompt, roomId } = payload;
    const liveblocks = getLiveblocks();
    const log: AiLogEntry[] = [];

    /** Publish a status update to both the run metadata and the whole room. */
    const publish = async (
      phase: AiPhase,
      message: string,
      thinking: boolean,
      cursor: { x: number; y: number } | null,
    ) => {
      log.push({ phase, message });
      metadata.set("phase", phase);
      metadata.set("log", log);
      const event: AiStatusEvent = { type: "ai-status", phase, message, thinking, cursor };
      try {
        await liveblocks.broadcastEvent(roomId, event);
      } catch (error) {
        // Presence broadcast is best-effort; storage updates still land.
        logger.warn("design-agent broadcast failed", { error: String(error) });
      }
    };

    logger.info("design-agent started", { roomId, promptLength: prompt.length });

    try {
      await publish(
        "start",
        "Ghost AI is reading your prompt…",
        true,
        { x: 0, y: 0 },
      );

      // Read the current canvas so the model can extend or refine it.
      let currentNodes: readonly CanvasNode[] = [];
      let currentEdges: readonly CanvasEdge[] = [];
      await mutateFlow<CanvasNode, CanvasEdge>(
        { client: liveblocks as unknown as FlowClient, roomId },
        (flow) => {
          currentNodes = flow.nodes;
          currentEdges = flow.edges;
        },
      );

      await publish(
        "processing",
        "Designing your architecture…",
        true,
        { x: 0, y: 0 },
      );

      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_AI_API_KEY,
      });
      const { object } = await generateObject({
        model: google(DESIGN_MODEL),
        schema: designSchema,
        system: SYSTEM_PROMPT,
        prompt: buildUserPrompt(prompt, currentNodes, currentEdges),
      });

      const operations = object.operations.slice(0, MAX_OPERATIONS);
      // Apply structural node changes before edges so edges always connect to
      // nodes that already exist.
      const nodeOps = operations.filter((op) => op.type !== "addEdge" && op.type !== "deleteEdge");
      const edgeOps = operations.filter((op) => op.type === "addEdge" || op.type === "deleteEdge");

      let applied = 0;
      for (const op of [...nodeOps, ...edgeOps]) {
        const cursor = cursorFor(op);
        if (cursor) {
          await publish("processing", "Placing components…", true, cursor);
        }
        const didApply = await applyOperation(liveblocks, roomId, op);
        if (didApply) {
          applied += 1;
          await sleep(STEP_DELAY_MS);
        }
      }

      await publish(
        "complete",
        object.summary || "Design complete.",
        false,
        null,
      );

      logger.info("design-agent finished", { roomId, applied });
      return { roomId, summary: object.summary, appliedOperations: applied };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Design generation failed.";
      logger.error("design-agent failed", { roomId, error: message });
      // Surface the failure and clear AI presence so it doesn't stick.
      await publish("error", "Ghost AI couldn't finish this design.", false, null);
      throw error;
    }
  },
});

/** Build the per-run user prompt, including a summary of the current canvas. */
function buildUserPrompt(
  prompt: string,
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
): string {
  if (nodes.length === 0 && edges.length === 0) {
    return `The canvas is currently empty. Generate a new system design for:\n\n${prompt}`;
  }

  const nodeSummary = nodes
    .map(
      (node) =>
        `- ${node.id}: "${node.data.label}" (${node.data.shape}, ${node.data.color}) at [${Math.round(node.position.x)}, ${Math.round(node.position.y)}]`,
    )
    .join("\n");
  const edgeSummary = edges
    .map((edge) => `- ${edge.id}: ${edge.source} -> ${edge.target}`)
    .join("\n");

  return `The canvas already contains this design.\n\nNodes:\n${nodeSummary || "(none)"}\n\nEdges:\n${edgeSummary || "(none)"}\n\nUpdate it to satisfy this request:\n\n${prompt}`;
}

/** Cursor position (flow coords) to show the AI "working" at, if the op has one. */
function cursorFor(op: DesignOperation): { x: number; y: number } | null {
  if (typeof op.x === "number" && typeof op.y === "number") {
    return { x: op.x, y: op.y };
  }
  return null;
}

/**
 * Apply a single design operation to the room through the collaborative flow
 * utilities. Returns whether it produced a change. Each op runs in its own
 * `mutateFlow` so participants watch the design build up incrementally.
 */
async function applyOperation(
  liveblocks: ReturnType<typeof getLiveblocks>,
  roomId: string,
  op: DesignOperation,
): Promise<boolean> {
  let changed = false;
  await mutateFlow<CanvasNode, CanvasEdge>(
    { client: liveblocks as unknown as FlowClient, roomId },
    (flow) => {
      switch (op.type) {
        case "addNode": {
          if (typeof op.x !== "number" || typeof op.y !== "number") return;
          const shape = op.shape ?? "rectangle";
          const size = SHAPE_DEFAULT_SIZES[shape];
          flow.addNode({
            id: op.id,
            type: CANVAS_NODE_TYPE,
            position: { x: op.x, y: op.y },
            width: op.width ?? size.width,
            height: op.height ?? size.height,
            data: {
              label: op.label ?? "",
              color: op.color ?? "neutral",
              shape,
            },
          });
          changed = true;
          return;
        }
        case "moveNode": {
          if (typeof op.x !== "number" || typeof op.y !== "number") return;
          if (!flow.getNode(op.id)) return;
          flow.updateNode(op.id, { position: { x: op.x, y: op.y } });
          changed = true;
          return;
        }
        case "resizeNode": {
          if (typeof op.width !== "number" || typeof op.height !== "number") return;
          if (!flow.getNode(op.id)) return;
          flow.updateNode(op.id, { width: op.width, height: op.height });
          changed = true;
          return;
        }
        case "updateNode": {
          const node = flow.getNode(op.id);
          if (!node) return;
          flow.updateNodeData(op.id, {
            ...(op.label !== undefined ? { label: op.label } : {}),
            ...(op.shape !== undefined ? { shape: op.shape } : {}),
            ...(op.color !== undefined ? { color: op.color } : {}),
          });
          changed = true;
          return;
        }
        case "deleteNode": {
          if (!flow.getNode(op.id)) return;
          flow.removeNode(op.id);
          changed = true;
          return;
        }
        case "addEdge": {
          if (!op.source || !op.target) return;
          if (!flow.getNode(op.source) || !flow.getNode(op.target)) return;
          flow.addEdge({
            id: op.id,
            type: CANVAS_EDGE_TYPE,
            source: op.source,
            target: op.target,
            data: op.label ? { label: op.label } : {},
          });
          changed = true;
          return;
        }
        case "deleteEdge": {
          if (!flow.getEdge(op.id)) return;
          flow.removeEdge(op.id);
          changed = true;
          return;
        }
      }
    },
  );
  return changed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
