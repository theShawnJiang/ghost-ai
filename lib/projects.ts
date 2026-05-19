import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import type { Project } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export interface UserProjectLists {
  owned: Project[];
  shared: Project[];
}

export async function getProjectsForUser(): Promise<UserProjectLists> {
  const { userId } = await auth();
  if (!userId) return { owned: [], shared: [] };

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  const [owned, shared] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
    }),
    email
      ? prisma.project.findMany({
          where: {
            ownerId: { not: userId },
            collaborators: { some: { email } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([] satisfies Project[]),
  ]);

  return { owned, shared };
}
