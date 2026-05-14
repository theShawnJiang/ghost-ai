"use client"

import { useCallback, useState } from "react"

export type ProjectDialogMode = "create" | "rename" | "delete"

export interface ProjectDialogTarget {
  id: string
  name: string
}

interface OpenState {
  mode: ProjectDialogMode
  target: ProjectDialogTarget | null
}

export interface UseProjectDialogs {
  mode: ProjectDialogMode | null
  target: ProjectDialogTarget | null
  name: string
  setName: (next: string) => void
  isSubmitting: boolean
  openCreate: () => void
  openRename: (project: ProjectDialogTarget) => void
  openDelete: (project: ProjectDialogTarget) => void
  close: () => void
  submit: () => Promise<void>
}

export function useProjectDialogs(): UseProjectDialogs {
  const [open, setOpen] = useState<OpenState | null>(null)
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const close = useCallback(() => {
    if (isSubmitting) return
    setOpen(null)
    setName("")
  }, [isSubmitting])

  const openCreate = useCallback(() => {
    setName("")
    setOpen({ mode: "create", target: null })
  }, [])

  const openRename = useCallback((project: ProjectDialogTarget) => {
    setName(project.name)
    setOpen({ mode: "rename", target: project })
  }, [])

  const openDelete = useCallback((project: ProjectDialogTarget) => {
    setName("")
    setOpen({ mode: "delete", target: project })
  }, [])

  const submit = useCallback(async () => {
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 250))
    setIsSubmitting(false)
    setOpen(null)
    setName("")
  }, [])

  return {
    mode: open?.mode ?? null,
    target: open?.target ?? null,
    name,
    setName,
    isSubmitting,
    openCreate,
    openRename,
    openDelete,
    close,
    submit,
  }
}
