import { get, put } from "@vercel/blob";

import {
  getAccessibleProject,
  getCurrentIdentity,
} from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

/**
 * Persist the latest canvas JSON. Prisma keeps only metadata (the blob URL);
 * the canvas graph itself lives in Vercel Blob at a deterministic path so each
 * save overwrites the previous snapshot.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await getAccessibleProject(projectId, identity);
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    !Array.isArray(body.nodes) ||
    !Array.isArray(body.edges)
  ) {
    return Response.json(
      { error: "Invalid canvas payload" },
      { status: 400 }
    );
  }

  const canvas = { nodes: body.nodes, edges: body.edges };
  const blob = await put(
    `canvas/${projectId}.json`,
    JSON.stringify(canvas),
    {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    }
  );

  await prisma.project.update({
    where: { id: projectId },
    data: { canvasJsonPath: blob.url },
  });

  return Response.json({ url: blob.url });
}

/**
 * Return the saved canvas graph for the editor to hydrate an empty room.
 * Prisma holds the blob URL; the graph is fetched from Vercel Blob.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await getAccessibleProject(projectId, identity);
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!project.canvasJsonPath) {
    return Response.json({ canvas: null });
  }

  // The blob store is private, so the URL isn't publicly fetchable — read the
  // content back through the SDK using the deterministic pathname.
  const result = await get(`canvas/${projectId}.json`, {
    access: "private",
    useCache: false,
  });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return Response.json({ canvas: null });
  }

  const canvas = await new Response(result.stream).json();
  return Response.json({ canvas });
}
