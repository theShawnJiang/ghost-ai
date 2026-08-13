import { logger, metadata, schemaTask } from "@trigger.dev/sdk";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { put } from "@vercel/blob";

import { publishAiStatus } from "@/lib/ai-status-feed";
import { getLiveblocks } from "@/lib/liveblocks";
import { prisma } from "@/lib/prisma";
import {
  generateSpecPayloadSchema,
  type SpecChatMessage,
  type SpecEdge,
  type SpecNode,
} from "@/types/spec";
import type { AiLogEntry, AiPhase } from "@/types/ai";
import type { AiStatusFeedMessage } from "@/types/tasks";

/**
 * `generate-spec` — turns the current canvas plus the room's conversation into
 * a Markdown technical spec.
 *
 * Flow:
 *  1. Publish a `start` status so the room knows a spec run is in flight.
 *  2. Summarize the canvas graph + chat history into a single prompt.
 *  3. Ask Gemini for the spec as plain Markdown.
 *  4. Upload the Markdown to Vercel Blob and record a `ProjectSpec` row.
 *  5. Publish `complete` (or `error`) and return the Markdown as task output.
 *
 * Status goes to two places, mirroring `design-agent`: run `metadata`, for the
 * triggering user's realtime run subscription, and the shared `ai-status-feed`
 * (with `kind: "spec"`), so every participant's sidebar sees the run — not just
 * whoever started it.
 *
 * Persistence follows the canvas snapshot pattern (Feature 21): the Markdown
 * lives in Vercel Blob, and Prisma stores only the blob URL as metadata. The
 * blob URL is never returned to the client — `specId` is, and the content is
 * served through the access-checked download route.
 */

/** Gemini model used to write the spec. Matches the design agent's model. */
const SPEC_MODEL = "gemini-2.0-flash";

/**
 * Most recent chat messages included in the prompt. The room's history can grow
 * without bound; the tail is what the spec is actually about.
 */
const MAX_PROMPT_CHAT_MESSAGES = 30;

const SYSTEM_PROMPT = `You are Ghost AI, a staff engineer who writes technical specifications from system-design diagrams.

You are given a diagram (nodes and the edges between them) and the conversation the team had while building it. Write the technical spec that diagram implies.

Output rules:
- Respond with GitHub-flavored Markdown only. No preamble, no sign-off, and do not wrap the whole document in a code fence.
- Start with a single "# " title naming the system.
- Use these "## " sections, in order: Overview, Architecture, Components, Data Flow, Interfaces, Non-Functional Requirements, Risks and Open Questions.
- Under Components, give each node its own "### " heading and describe its responsibility, its inputs, and its outputs.
- Under Data Flow, walk the edges in order and describe what moves between components.

Content rules:
- Ground every statement in the diagram and the conversation. Do not invent components, services, or datastores that are not there.
- Node shapes carry meaning: cylinder = datastore, diamond = decision/gateway, hexagon = external system, circle = event/endpoint, rectangle and pill = service/component.
- Where the diagram is ambiguous or something important is undecided, say so under "Risks and Open Questions" rather than guessing.
- Be concrete and concise. Prefer short paragraphs and bullet lists over prose.`;

export const generateSpec = schemaTask({
  id: "generate-spec",
  schema: generateSpecPayloadSchema,
  // Safe to retry, unlike `design-agent`: nothing durable is written until the
  // spec is in hand, and each attempt persists under a fresh spec id, so a
  // retry can only ever leave an orphaned blob — never a duplicate or a
  // half-written record the canvas would have to reconcile.
  retry: { maxAttempts: 2 },
  run: async (payload) => {
    const { projectId, roomId, chatHistory, nodes, edges } = payload;
    const log: AiLogEntry[] = [];

    // Room-wide status is best-effort. Resolve the client up front so a missing
    // or malformed LIVEBLOCKS_SECRET_KEY degrades to metadata-only tracking
    // instead of failing a spec the model could otherwise have written.
    let liveblocks: ReturnType<typeof getLiveblocks> | null = null;
    try {
      liveblocks = getLiveblocks();
    } catch (error) {
      logger.warn("generate-spec status feed unavailable", {
        error: String(error),
      });
    }

    /**
     * Publish a status update to the triggering user's run subscription and to
     * the room's shared status feed.
     */
    const publish = async (phase: AiPhase, message: string) => {
      log.push({ phase, message });
      metadata.set("phase", phase);
      metadata.set("log", log);

      if (!liveblocks) return;

      const status: AiStatusFeedMessage = { kind: "spec", phase, text: message };
      const published = await publishAiStatus(liveblocks, roomId, status);
      if (!published) {
        logger.warn("generate-spec status feed publish failed", {
          roomId,
          phase,
        });
      }
    };

    logger.info("generate-spec started", {
      projectId,
      roomId,
      nodes: nodes.length,
      edges: edges.length,
      chatMessages: chatHistory.length,
    });

    try {
      await publish("start", "Ghost AI is reading your canvas…");
      await publish("processing", "Writing your technical spec…");

      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_AI_API_KEY,
      });
      const { text } = await generateText({
        model: google(SPEC_MODEL),
        system: SYSTEM_PROMPT,
        prompt: buildUserPrompt(nodes, edges, chatHistory),
      });

      const spec = stripCodeFence(text);
      if (!spec) {
        throw new Error("The model returned an empty spec.");
      }

      await publish("processing", "Saving your spec…");
      const specId = await persistSpec(projectId, spec);

      await publish("complete", "Technical spec ready.");
      logger.info("generate-spec finished", {
        projectId,
        roomId,
        specId,
        specLength: spec.length,
      });

      return { projectId, roomId, specId, spec };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Spec generation failed.";
      logger.error("generate-spec failed", { projectId, roomId, error: message });
      await publish("error", "Ghost AI couldn't finish this spec.");
      throw error;
    }
  },
});

/**
 * Store the generated Markdown and return the new spec's id.
 *
 * The blob path is derived from the spec id, so the id is generated up front:
 * that keeps the upload and the record a single write each, with no window in
 * which a `ProjectSpec` row points at a file that was never uploaded. Only the
 * blob URL is kept in Postgres — the Markdown itself never touches the database.
 */
async function persistSpec(projectId: string, spec: string): Promise<string> {
  const specId = crypto.randomUUID();

  const blob = await put(`specs/${projectId}/${specId}.md`, spec, {
    // The store is private, matching the canvas snapshots: the URL alone grants
    // no access, so reads have to go through the download route.
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "text/markdown",
  });

  await prisma.projectSpec.create({
    data: { id: specId, projectId, filePath: blob.url },
  });

  return specId;
}

/** Build the per-run user prompt from the canvas graph and the conversation. */
function buildUserPrompt(
  nodes: SpecNode[],
  edges: SpecEdge[],
  chatHistory: SpecChatMessage[],
): string {
  const nodeSummary = nodes
    .map((node) => {
      const label = node.data?.label?.trim() || "(unlabeled)";
      const shape = node.data?.shape ?? "rectangle";
      const color = node.data?.color ?? "neutral";
      const position = node.position
        ? ` at [${Math.round(node.position.x)}, ${Math.round(node.position.y)}]`
        : "";
      return `- ${node.id}: "${label}" (${shape}, ${color})${position}`;
    })
    .join("\n");

  const edgeSummary = edges
    .map((edge) => {
      const label = edge.data?.label?.trim();
      return `- ${edge.source} -> ${edge.target}${label ? ` ("${label}")` : ""}`;
    })
    .join("\n");

  // Oldest-first, so the transcript reads in order once trimmed to the tail.
  const transcript = chatHistory
    .slice(-MAX_PROMPT_CHAT_MESSAGES)
    .map((message) => {
      const who =
        message.role === "assistant"
          ? "Ghost AI"
          : (message.sender?.name ?? "Teammate");
      return `${who}: ${message.content}`;
    })
    .join("\n");

  const canvas =
    nodes.length === 0 && edges.length === 0
      ? "The canvas is empty — base the spec on the conversation alone, and be explicit about what still needs to be diagrammed."
      : `Nodes (id, label, shape, color, position):\n${nodeSummary || "(none)"}\n\nEdges (source -> target):\n${edgeSummary || "(none)"}`;

  const conversation = transcript
    ? `\n\nConversation so far:\n${transcript}`
    : "\n\nThere is no conversation history — work from the diagram alone.";

  return `Here is the current system design.\n\n${canvas}${conversation}\n\nWrite the technical spec for this system.`;
}

/**
 * Remove a fence wrapping the entire response. Models often return the whole
 * document inside ```markdown … ``` despite being told not to, and that fence
 * would render as a code block instead of the spec.
 */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:markdown|md)?\n([\s\S]*?)\n?```$/.exec(trimmed);
  return (fenced ? fenced[1] : trimmed).trim();
}
