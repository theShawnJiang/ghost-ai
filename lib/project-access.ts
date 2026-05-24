import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import type { Project } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export interface CurrentIdentity {
  userId: string;
  email: string | null;
}

export async function getCurrentIdentity(): Promise<CurrentIdentity | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  return { userId, email };
}

export async function getAccessibleProject(
  projectId: string,
  identity: CurrentIdentity
): Promise<Project | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project) return null;

  if (project.ownerId === identity.userId) return project;

  if (!identity.email) return null;

  const collaborator = await prisma.projectCollaborator.findUnique({
    where: {
      projectId_email: { projectId, email: identity.email },
    },
  });

  return collaborator ? project : null;
}
