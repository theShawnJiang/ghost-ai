"use client";

import { useCallback, useState } from "react";

import type { ProjectMember } from "@/lib/collaborators";

interface MembersResponse {
  members: ProjectMember[];
}

export interface UseShareDialog {
  isOpen: boolean;
  members: ProjectMember[];
  isLoading: boolean;
  isInviting: boolean;
  removingEmail: string | null;
  error: string | null;
  open: () => void;
  close: () => void;
  invite: (email: string) => Promise<boolean>;
  remove: (email: string) => Promise<void>;
}

export function useShareDialog(projectId: string): UseShareDialog {
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/collaborators`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        setError("Could not load collaborators.");
        return;
      }
      const data = (await response.json()) as MembersResponse;
      setMembers(data.members);
    } catch {
      setError("Could not load collaborators.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const open = useCallback(() => {
    setIsOpen(true);
    setError(null);
    void load();
  }, [load]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const invite = useCallback(
    async (email: string) => {
      const trimmed = email.trim();
      if (!trimmed) return false;

      setIsInviting(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/projects/${projectId}/collaborators`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: trimmed }),
          }
        );
        if (!response.ok) {
          setError(
            response.status === 400
              ? "Enter a valid email address."
              : "Could not invite collaborator."
          );
          return false;
        }
        const data = (await response.json()) as MembersResponse;
        setMembers(data.members);
        return true;
      } catch {
        setError("Could not invite collaborator.");
        return false;
      } finally {
        setIsInviting(false);
      }
    },
    [projectId]
  );

  const remove = useCallback(
    async (email: string) => {
      setRemovingEmail(email);
      setError(null);
      try {
        const response = await fetch(
          `/api/projects/${projectId}/collaborators`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          }
        );
        if (!response.ok) {
          setError("Could not remove collaborator.");
          return;
        }
        const data = (await response.json()) as MembersResponse;
        setMembers(data.members);
      } catch {
        setError("Could not remove collaborator.");
      } finally {
        setRemovingEmail(null);
      }
    },
    [projectId]
  );

  return {
    isOpen,
    members,
    isLoading,
    isInviting,
    removingEmail,
    error,
    open,
    close,
    invite,
    remove,
  };
}
