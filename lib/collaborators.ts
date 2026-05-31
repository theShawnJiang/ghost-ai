import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import type { User } from "@clerk/backend";

import { prisma } from "@/lib/prisma";

export type MemberRole = "owner" | "collaborator";

export interface ProjectMember {
  /** Clerk user id for the owner, email for a collaborator — used as a stable key. */
  id: string;
  email: string | null;
  name: string | null;
  imageUrl: string | null;
  role: MemberRole;
}

interface ClerkProfile {
  name: string | null;
  email: string | null;
  imageUrl: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : null;
}

function resolveName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  return trimmed ? trimmed : null;
}

function toProfile(user: User): ClerkProfile {
  const name =
    resolveName(user.fullName) ??
    resolveName([user.firstName, user.lastName].filter(Boolean).join(" "));
  return {
    name,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    imageUrl: user.imageUrl ?? null,
  };
}

/**
 * Returns everyone with access to a project — the owner first, then collaborators
 * (stored by email). Each entry is enriched with the matching Clerk user's display
 * name and avatar. Clerk lookups are best-effort: when a user isn't found or Clerk
 * is unreachable, the entry falls back to its email only.
 */
export async function listProjectMembers(project: {
  id: string;
  ownerId: string;
}): Promise<ProjectMember[]> {
  const collaborators = await prisma.projectCollaborator.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "asc" },
  });

  const emails = collaborators.map((row) => row.email);

  let ownerProfile: ClerkProfile | null = null;
  const byEmail = new Map<string, ClerkProfile>();

  try {
    const client = await clerkClient();
    const [owner, list] = await Promise.all([
      client.users.getUser(project.ownerId),
      emails.length
        ? client.users.getUserList({
            emailAddress: emails,
            limit: Math.min(emails.length, 500),
          })
        : null,
    ]);

    ownerProfile = toProfile(owner);

    for (const user of list?.data ?? []) {
      const profile = toProfile(user);
      for (const address of user.emailAddresses) {
        byEmail.set(address.emailAddress.toLowerCase(), profile);
      }
    }
  } catch {
    // Enrichment is best-effort — fall back to id/email-only entries below.
  }

  const ownerMember: ProjectMember = {
    id: project.ownerId,
    email: ownerProfile?.email ?? null,
    name: ownerProfile?.name ?? null,
    imageUrl: ownerProfile?.imageUrl ?? null,
    role: "owner",
  };

  const collaboratorMembers: ProjectMember[] = collaborators.map((row) => {
    const profile = byEmail.get(row.email.toLowerCase());
    return {
      id: row.email,
      email: row.email,
      name: profile?.name ?? null,
      imageUrl: profile?.imageUrl ?? null,
      role: "collaborator",
    };
  });

  return [ownerMember, ...collaboratorMembers];
}
