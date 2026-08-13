import { get } from "@vercel/blob";

import {
  getAccessibleProject,
  getCurrentIdentity,
} from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";

/**
 * Download a generated spec as a Markdown file.
 *
 * Specs live in a private Vercel Blob store, so the blob URL on
 * `ProjectSpec.filePath` is not fetchable on its own — this route is the only
 * way to read one, and it checks access before it does: the caller must be
 * signed in, must be the owner or a collaborator of the project, and the spec
 * must belong to that project. The blob URL itself is never returned.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; specId: string }> }
) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, specId } = await params;

  // Matches the canvas routes: a project the caller can't reach reads as
  // missing, so this never confirms that someone else's project exists.
  const project = await getAccessibleProject(projectId, identity);
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const spec = await prisma.projectSpec.findUnique({ where: { id: specId } });
  if (!spec) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (spec.projectId !== project.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await get(spec.filePath, {
    access: "private",
    useCache: false,
  });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const filename = `${toSlug(project.name) || "project"}-spec.md`;

  return new Response(result.stream, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
