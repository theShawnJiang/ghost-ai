import { auth } from "@trigger.dev/sdk";

import { getCurrentIdentity } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

/**
 * Issue a Trigger.dev public token scoped to a single run so the client can
 * subscribe to its progress. Ownership is verified against the `TaskRun` record
 * before any token is minted (only the user who triggered the run can read it).
 */
export async function POST(request: Request) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const runId = typeof body?.runId === "string" ? body.runId.trim() : "";

  if (!runId) {
    return Response.json({ error: "runId is required" }, { status: 400 });
  }

  const taskRun = await prisma.taskRun.findUnique({ where: { runId } });
  if (!taskRun || taskRun.userId !== identity.userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const token = await auth.createPublicToken({
    scopes: { read: { runs: [runId] } },
  });

  return Response.json({ token });
}
