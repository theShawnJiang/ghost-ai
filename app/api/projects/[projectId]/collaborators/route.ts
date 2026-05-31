import { auth } from "@clerk/nextjs/server";

import { listProjectMembers, normalizeEmail } from "@/lib/collaborators";
import {
  getAccessibleProject,
  getCurrentIdentity,
} from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

// Owner or collaborator may view the list.
export async function GET(_request: Request, { params }: RouteContext) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await getAccessibleProject(projectId, identity);
  if (!project) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await listProjectMembers(project);
  return Response.json({ members });
}

// Owner only.
export async function POST(request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (project.ownerId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const email = normalizeEmail(body.email);
  if (!email) {
    return Response.json(
      { error: "A valid email is required" },
      { status: 400 }
    );
  }

  await prisma.projectCollaborator.upsert({
    where: { projectId_email: { projectId, email } },
    create: { projectId, email },
    update: {},
  });

  const members = await listProjectMembers(project);
  return Response.json({ members }, { status: 201 });
}

// Owner only.
export async function DELETE(request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (project.ownerId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const email = normalizeEmail(body.email);
  if (!email) {
    return Response.json(
      { error: "A valid email is required" },
      { status: 400 }
    );
  }

  await prisma.projectCollaborator.deleteMany({
    where: { projectId, email },
  });

  const members = await listProjectMembers(project);
  return Response.json({ members });
}
