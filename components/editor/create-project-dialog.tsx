"use client"

import type { FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toSlug } from "@/lib/slug"

interface CreateProjectDialogProps {
  open: boolean
  name: string
  isSubmitting: boolean
  onNameChange: (next: string) => void
  onClose: () => void
  onSubmit: () => void
}

export function CreateProjectDialog({
  open,
  name,
  isSubmitting,
  onNameChange,
  onClose,
  onSubmit,
}: CreateProjectDialogProps) {
  const slug = toSlug(name)
  const trimmed = name.trim()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!trimmed || isSubmitting) return
    onSubmit()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Give your architecture workspace a name. You can rename it later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="create-project-name"
              className="text-xs font-medium text-copy-secondary"
            >
              Project name
            </label>
            <Input
              id="create-project-name"
              autoFocus
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="My new system"
              disabled={isSubmitting}
              className="text-copy-primary"
            />
            <div className="flex items-center gap-2 text-xs text-copy-muted">
              <span>Slug</span>
              <code className="rounded-md bg-subtle px-2 py-0.5 font-mono text-copy-secondary">
                {slug || "your-project"}
              </code>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmed || isSubmitting}>
              {isSubmitting ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
