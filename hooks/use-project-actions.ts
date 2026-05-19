"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { toSlug } from "@/lib/slug";

export type ProjectDialogMode = "create" | "rename" | "delete";

export interface ProjectDialogTarget {
  id: string;
  name: string;
}

interface OpenState {
  mode: ProjectDialogMode;
  target: ProjectDialogTarget | null;
  suffix: string;
}

export interface UseProjectActions {
  mode: ProjectDialogMode | null;
  target: ProjectDialogTarget | null;
  name: string;
  roomId: string;
  isSubmitting: boolean;
  setName: (next: string) => void;
  openCreate: () => void;
  openRename: (project: ProjectDialogTarget) => void;
  openDelete: (project: ProjectDialogTarget) => void;
  close: () => void;
  submit: () => Promise<void>;
}

function generateSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function useProjectActions(): UseProjectActions {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState<OpenState | null>(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roomId = useMemo(() => {
    if (open?.mode !== "create") return "";
    const slug = toSlug(name);
    if (!slug) return "";
    return `${slug}-${open.suffix}`;
  }, [open, name]);

  const close = useCallback(() => {
    if (isSubmitting) return;
    setOpen(null);
    setName("");
  }, [isSubmitting]);

  const openCreate = useCallback(() => {
    setName("");
    setOpen({ mode: "create", target: null, suffix: generateSuffix() });
  }, []);

  const openRename = useCallback((project: ProjectDialogTarget) => {
    setName(project.name);
    setOpen({ mode: "rename", target: project, suffix: "" });
  }, []);

  const openDelete = useCallback((project: ProjectDialogTarget) => {
    setName("");
    setOpen({ mode: "delete", target: project, suffix: "" });
  }, []);

  const submit = useCallback(async () => {
    if (!open) return;
    setIsSubmitting(true);
    try {
      if (open.mode === "create") {
        const trimmed = name.trim();
        if (!trimmed) return;
        const slug = toSlug(trimmed);
        const id = slug ? `${slug}-${open.suffix}` : open.suffix;
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, name: trimmed }),
        });
        if (!response.ok) return;
        const project = (await response.json()) as { id: string };
        setOpen(null);
        setName("");
        router.push(`/editor/${project.id}`);
        return;
      }

      if (open.mode === "rename" && open.target) {
        const trimmed = name.trim();
        if (!trimmed || trimmed === open.target.name) return;
        const response = await fetch(`/api/projects/${open.target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!response.ok) return;
        setOpen(null);
        setName("");
        router.refresh();
        return;
      }

      if (open.mode === "delete" && open.target) {
        const targetId = open.target.id;
        const response = await fetch(`/api/projects/${targetId}`, {
          method: "DELETE",
        });
        if (!response.ok) return;
        setOpen(null);
        setName("");
        if (pathname === `/editor/${targetId}`) {
          router.push("/editor");
        } else {
          router.refresh();
        }
        return;
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [open, name, router, pathname]);

  return {
    mode: open?.mode ?? null,
    target: open?.target ?? null,
    name,
    roomId,
    isSubmitting,
    setName,
    openCreate,
    openRename,
    openDelete,
    close,
    submit,
  };
}
