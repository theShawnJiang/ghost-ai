"use client"

import { Pencil, Plus, Trash2, X } from "lucide-react"

import type { Project } from "@/app/generated/prisma/client"
import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  owned: Project[]
  shared: Project[]
  onCreate: () => void
  onRename: (project: Project) => void
  onDelete: (project: Project) => void
}

export function ProjectSidebar({
  isOpen,
  onClose,
  owned,
  shared,
  onCreate,
  onRename,
  onDelete,
}: ProjectSidebarProps) {
  return (
    <>
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className={cn(
          "absolute inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 md:hidden",
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
      />

      <aside
        aria-hidden={!isOpen}
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-40 flex w-80 max-w-[85vw] flex-col border-r border-surface-border bg-surface/95 shadow-2xl backdrop-blur-sm transition-transform duration-200 ease-out",
          isOpen ? "pointer-events-auto translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-surface-border px-4">
          <h2 className="text-sm font-medium text-copy-primary">Projects</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close projects sidebar"
          >
            <X />
          </Button>
        </div>

        <Tabs
          defaultValue="mine"
          className="flex flex-1 flex-col gap-3 overflow-hidden px-4 pt-4"
        >
          <TabsList className="w-full">
            <TabsTrigger value="mine">My Projects</TabsTrigger>
            <TabsTrigger value="shared">Shared</TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="flex-1 overflow-y-auto">
            {owned.length === 0 ? (
              <EmptyState message="No projects yet" />
            ) : (
              <ul className="flex flex-col gap-1 pb-2">
                {owned.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    onRename={() => onRename(project)}
                    onDelete={() => onDelete(project)}
                  />
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="shared" className="flex-1 overflow-y-auto">
            {shared.length === 0 ? (
              <EmptyState message="No shared projects" />
            ) : (
              <ul className="flex flex-col gap-1 pb-2">
                {shared.map((project) => (
                  <ProjectRow key={project.id} project={project} />
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        <div className="shrink-0 border-t border-surface-border p-3">
          <Button className="w-full" onClick={onCreate}>
            <Plus />
            New Project
          </Button>
        </div>
      </aside>
    </>
  )
}

interface ProjectRowProps {
  project: Project
  onRename?: () => void
  onDelete?: () => void
}

function ProjectRow({ project, onRename, onDelete }: ProjectRowProps) {
  const isOwner = Boolean(onRename && onDelete)
  return (
    <li className="group/row flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary">
      <span className="flex-1 truncate">{project.name}</span>
      {isOwner && onRename && onDelete && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Rename ${project.name}`}
            onClick={onRename}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Delete ${project.name}`}
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </li>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-copy-muted">
      <p>{message}</p>
    </div>
  )
}
