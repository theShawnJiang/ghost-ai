import {
  getAccessibleProject,
  getCurrentIdentity,
} from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import { specDownloadFilename } from "@/lib/spec-file";
import type { ProjectSpecSummary } from "@/types/spec";

/**
 * List the specs generated for a project, newest first.
 *
 * Metadata only: `ProjectSpec.filePath` is a private blob URL and never leaves
 * the server, so the response carries just the id, the creation time, and the
 * filename the spec downloads as. Content is read through the sibling
 * `[specId]/download` route, which re-checks access on every read.
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

  // Matches the canvas and download routes: a project the caller can't reach
  // reads as missing, so this never confirms that someone else's project exists.
  const project = await getAccessibleProject(projectId, identity);
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await prisma.projectSpec.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  const filename = specDownloadFilename(project.name);
  const specs: ProjectSpecSummary[] = rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    filename,
  }));

  return Response.json({ specs });
}
