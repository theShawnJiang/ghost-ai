import { logger, task } from "@trigger.dev/sdk";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

/**
 * `generate-design` — durable AI design generation.
 *
 * Input: a user prompt plus project context and the current canvas state.
 * Output: structured node/edge updates written into the shared Liveblocks
 * room for the project (see `architecture-context.md` → AI Generation Model).
 *
 * This is a skeleton: the AI call and the Liveblocks storage mutation are
 * stubbed with TODOs so the task registers with `trigger dev` and documents
 * the intended flow. Request handlers trigger this task and return immediately
 * (Invariant 1 — no long-lived AI work in request handlers).
 */
export type GenerateDesignPayload = {
  /** Project id, which is also the Liveblocks room id. */
  projectId: string;
  /** The natural-language design prompt from the user. */
  prompt: string;
  /** Current canvas graph, so generation can extend rather than replace it. */
  canvas?: {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
  };
};

export const generateDesign = task({
  id: "generate-design",
  run: async (payload: GenerateDesignPayload) => {
    const { projectId, prompt, canvas } = payload;

    logger.info("Generating design", {
      projectId,
      promptLength: prompt.length,
      existingNodes: canvas?.nodes.length ?? 0,
    });

    // TODO: Call Claude to turn the prompt + current canvas into structured
    // node/edge updates (see `context/ai-workflow-rules.md`).
    const generated: { nodes: CanvasNode[]; edges: CanvasEdge[] } = {
      nodes: [],
      edges: [],
    };

    // TODO: Write the generated nodes/edges into the shared Liveblocks room
    // (room id === projectId) via `getLiveblocks()` storage mutation so all
    // collaborators see the update in real time.

    logger.info("Design generation complete", {
      projectId,
      nodes: generated.nodes.length,
      edges: generated.edges.length,
    });

    return {
      projectId,
      nodeCount: generated.nodes.length,
      edgeCount: generated.edges.length,
    };
  },
});
