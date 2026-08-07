import { tasks } from "@trigger.dev/sdk";

import {
  getAccessibleProject,
  getCurrentIdentity,
} from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import { specRequestSchema } from "@/types/spec";
import type { generateSpec } from "@/trigger/generate-spec";

/**
 * Trigger a spec generation run. The handler validates input and access, fires
 * the durable `generate-spec` task, records the run for later ownership checks,
 * and returns the run id — no long-lived work runs here (Invariant 1).
 *
 * Access comes from the authenticated user plus `roomId` only. The project id
 * handed to the task is the one read back from the database, so a client can
 * never name a project it doesn't have access to.
 *
 * The task is triggered by id through a type-only import, so the task module
 * (and its AI/Liveblocks dependencies) never enters this route's bundle.
 */
export async function POST(request: Request) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = specRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid request body",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  const { roomId, chatHistory, nodes, edges } = parsed.data;

  // The room id is the project id (projects are created with matching ids).
  const project = await getAccessibleProject(roomId, identity);
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const handle = await tasks.trigger<typeof generateSpec>("generate-spec", {
    projectId: project.id,
    roomId,
    chatHistory,
    nodes,
    edges,
  });

  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId: project.id,
      userId: identity.userId,
    },
  });

  return Response.json({ runId: handle.id }, { status: 202 });
}
