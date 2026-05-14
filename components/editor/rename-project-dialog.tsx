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

interface RenameProjectDialogProps {
  open: boolean
  currentName: string
  name: string
  isSubmitting: boolean
  onNameChange: (next: string) => void
  onClose: () => void
  onSubmit: () => void
}

export function RenameProjectDialog({
  open,
  currentName,
  name,
  isSubmitting,
  onNameChange,
  onClose,
  onSubmit,
}: RenameProjectDialogProps) {
  const trimmed = name.trim()
  const isDirty = trimmed.length > 0 && trimmed !== currentName

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isDirty || isSubmitting) return
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
          <DialogTitle>Rename project</DialogTitle>
          <DialogDescription>
            Renaming{" "}
            <span className="text-copy-primary">{currentName}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="rename-project-name"
              className="text-xs font-medium text-copy-secondary"
            >
              Project name
            </label>
            <Input
              id="rename-project-name"
              autoFocus
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              disabled={isSubmitting}
              className="text-copy-primary"
            />
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
            <Button type="submit" disabled={!isDirty || isSubmitting}>
              {isSubmitting ? "Renaming…" : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
