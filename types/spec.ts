/**
 * Contract for the spec generation flow: the body `POST /api/ai/spec` accepts,
 * and the payload the `generate-spec` Trigger.dev task runs on.
 *
 * The route and the task parse the same schemas so the two can never drift —
 * the task payload is just the validated request plus a `projectId` the server
 * resolved itself (never one the client sent).
 *
 * Free of server- and client-only imports so the route, the task, and a future
 * sidebar caller can all reference it.
 */

import { z } from "zod"

import { AI_CHAT_ROLES } from "@/types/tasks"

/**
 * Upper bounds on a single request. The canvas and chat are client-supplied, so
 * the boundary caps them rather than letting an arbitrary payload through to
 * the task and the model.
 */
export const MAX_SPEC_NODES = 500
export const MAX_SPEC_EDGES = 1000
export const MAX_SPEC_CHAT_MESSAGES = 200

/**
 * One canvas node, reduced to what a spec can be written from. Unknown keys are
 * stripped (React Flow nodes carry transient state like `selected`/`measured`
 * that the task has no use for), which keeps the task payload small.
 *
 * `shape` and `color` stay loose strings rather than the `types/canvas` unions:
 * the task only reads them to describe the graph in prose, so an unfamiliar id
 * from an older or newer client should not fail the whole run.
 */
export const specNodeSchema = z.object({
  id: z.string().min(1),
  /** Flow coordinates — layout order helps describe request/data flow. */
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  data: z
    .object({
      label: z.string().optional(),
      shape: z.string().optional(),
      color: z.string().optional(),
    })
    .optional(),
})

/** One canvas edge: the connection plus its optional inline label. */
export const specEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  data: z.object({ label: z.string().optional() }).optional(),
})

/**
 * One prior chat message. Shaped so a raw `AiChatFeedMessage` from the room's
 * `ai-chat` feed parses as-is (the sender's `id`/`avatar` are simply stripped).
 */
export const specChatMessageSchema = z.object({
  role: z.enum(AI_CHAT_ROLES),
  content: z.string().min(1),
  /** Display name, when known — lets the model attribute who asked for what. */
  sender: z.object({ name: z.string().min(1) }).optional(),
  /** Epoch ms, used only to keep the transcript in order. */
  timestamp: z.number().int().nonnegative().optional(),
})

/**
 * Body of `POST /api/ai/spec`. Deliberately has no `projectId`: access is
 * resolved from the authenticated user plus `roomId`, so a client-supplied
 * project id could never widen it.
 */
export const specRequestSchema = z.object({
  roomId: z.string().trim().min(1),
  chatHistory: z
    .array(specChatMessageSchema)
    .max(MAX_SPEC_CHAT_MESSAGES)
    .default([]),
  nodes: z.array(specNodeSchema).max(MAX_SPEC_NODES).default([]),
  edges: z.array(specEdgeSchema).max(MAX_SPEC_EDGES).default([]),
})

/** Payload the `generate-spec` task validates and runs on. */
export const generateSpecPayloadSchema = specRequestSchema.extend({
  /** Resolved server-side from the authenticated user + `roomId`. */
  projectId: z.string().min(1),
})

export type SpecNode = z.infer<typeof specNodeSchema>
export type SpecEdge = z.infer<typeof specEdgeSchema>
export type SpecChatMessage = z.infer<typeof specChatMessageSchema>
export type SpecRequest = z.infer<typeof specRequestSchema>
export type GenerateSpecPayload = z.infer<typeof generateSpecPayloadSchema>
