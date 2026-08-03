import {
  getAccessibleProject,
  getCurrentIdentity,
} from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import { designAgent } from "@/trigger/design-agent";

/**
 * Trigger a design generation run. The handler validates input and ownership,
 * fires the durable `design-agent` task, records the run for later ownership
 * checks, and returns the run id plus a run-scoped public token — no long-lived
 * work runs here (Invariant 1).
 *
 * The token comes back with the trigger handle already, so the client can
 * subscribe to the run from this single response rather than making a second
 * round trip to mint one.
 */
export async function POST(request: Request) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const roomId = typeof body?.roomId === "string" ? body.roomId.trim() : "";
  // The room id is the project id (projects are created with matching ids), so
  // an explicit `projectId` is accepted but optional.
  const projectId =
    typeof body?.projectId === "string" && body.projectId.trim()
      ? body.projectId.trim()
      : roomId;

  if (!prompt || !roomId) {
    return Response.json(
      { error: "prompt and roomId are required" },
      { status: 400 }
    );
  }

  const project = await getAccessibleProject(projectId, identity);
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const handle = await designAgent.trigger({ prompt, roomId });

  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId,
      userId: identity.userId,
    },
  });

  return Response.json(
    { runId: handle.id, publicToken: handle.publicAccessToken },
    { status: 202 }
  );
}
