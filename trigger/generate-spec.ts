import { put } from "@vercel/blob";
import { logger, task } from "@trigger.dev/sdk";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

/**
 * `generate-spec` — durable Markdown spec generation.
 *
 * Input: the current canvas graph plus project context.
 * Output: a Markdown technical spec written to Vercel Blob at
 * `specs/{projectId}/{specId}.md`, whose URL is linked back to the project in
 * the database (see `architecture-context.md` → AI Generation Model / Storage
 * Model). Metadata lives in Postgres; the artifact lives in Blob (Invariant 2).
 *
 * This is a skeleton: the AI call is stubbed, and the DB spec record is left as
 * a TODO until a `Spec` Prisma model exists.
 */
export type GenerateSpecPayload = {
  /** Project id — also the Liveblocks room id and the blob path prefix. */
  projectId: string;
  /** The canvas graph to turn into a spec. */
  canvas: {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
  };
};

export const generateSpec = task({
  id: "generate-spec",
  run: async (payload: GenerateSpecPayload) => {
    const { projectId, canvas } = payload;

    logger.info("Generating spec", {
      projectId,
      nodes: canvas.nodes.length,
      edges: canvas.edges.length,
    });

    // TODO: Call Claude to turn the canvas graph into a Markdown spec.
    const markdown = `# Technical Spec\n\n_Generated from ${canvas.nodes.length} nodes and ${canvas.edges.length} edges._\n`;

    // Store the artifact in Vercel Blob. The store is private; the returned
    // URL is the reference persisted on the project record.
    const specId = crypto.randomUUID();
    const blob = await put(`specs/${projectId}/${specId}.md`, markdown, {
      access: "private",
      addRandomSuffix: false,
      contentType: "text/markdown",
    });

    // TODO: Persist a spec record (projectId, specId, filePath: blob.url) once a
    // `Spec` Prisma model exists, linking the artifact to the project.

    logger.info("Spec generation complete", { projectId, specId, url: blob.url });

    return { projectId, specId, url: blob.url };
  },
});
