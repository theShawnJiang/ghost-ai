import { currentUser } from "@clerk/nextjs/server";

import { getCursorColor, getLiveblocks } from "@/lib/liveblocks";
import {
  getAccessibleProject,
  getCurrentIdentity,
} from "@/lib/project-access";

// Liveblocks calls this endpoint (via `authEndpoint`) with the room it wants to
// join. We use the project id as the room id, so authorizing a session means
// verifying the user can access that project.
export async function POST(request: Request) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { room: projectId } = await request.json();
  if (typeof projectId !== "string" || !projectId) {
    return Response.json({ error: "Missing room" }, { status: 400 });
  }

  // Project id == Liveblocks room id; access is owner or collaborator.
  const project = await getAccessibleProject(projectId, identity);
  if (!project) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const liveblocks = getLiveblocks();

  // Ensure the room exists, creating it only when it isn't there yet.
  await liveblocks.getOrCreateRoom(projectId, { defaultAccesses: [] });

  const user = await currentUser();
  const name =
    user?.fullName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    identity.email ||
    "Anonymous";

  const session = liveblocks.prepareSession(identity.userId, {
    userInfo: {
      name,
      avatar: user?.imageUrl ?? "",
      color: getCursorColor(identity.userId),
    },
  });

  session.allow(projectId, session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return new Response(body, { status });
}
