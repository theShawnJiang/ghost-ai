import {
  getAccessibleProject,
  getCurrentIdentity,
} from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import { designAgent } from "@/trigger/design-agent";

/**
 * Trigger a design generation run. The handler validates input and ownership,
 * fires the durable `design-agent` task, records the run for later ownership
 * checks, and returns the run id — no long-lived work runs here (Invariant 1).
 */
export async function POST(request: Request) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const roomId = typeof body?.roomId === "string" ? body.roomId.trim() : "";
  const projectId =
    typeof body?.projectId === "string" ? body.projectId.trim() : "";

  if (!prompt || !roomId || !projectId) {
    return Response.json(
      { error: "prompt, roomId, and projectId are required" },
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

  return Response.json({ runId: handle.id }, { status: 202 });
}
