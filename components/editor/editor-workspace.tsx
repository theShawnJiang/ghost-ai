"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"

import type { Project } from "@/app/generated/prisma/client"
import { CreateProjectDialog } from "@/components/editor/create-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { RenameProjectDialog } from "@/components/editor/rename-project-dialog"
import { ShareDialog } from "@/components/editor/share-dialog"
import { cn } from "@/lib/utils"
import { useProjectActions } from "@/hooks/use-project-actions"
import { useShareDialog } from "@/hooks/use-share-dialog"

interface EditorWorkspaceProps {
  project: Project
  owned: Project[]
  shared: Project[]
  isOwner: boolean
}

export function EditorWorkspace({
  project,
  owned,
  shared,
  isOwner,
}: EditorWorkspaceProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true)
  const actions = useProjectActions()
  const share = useShareDialog(project.id)

  return (
    <div className="flex h-screen flex-col bg-base">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        projectName={project.name}
        onShare={share.open}
        isAiSidebarOpen={isAiSidebarOpen}
        onToggleAiSidebar={() => setIsAiSidebarOpen((open) => !open)}
      />
      <div className="relative flex flex-1 gap-3 overflow-hidden p-3">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          owned={owned}
          shared={shared}
          activeProjectId={project.id}
          onCreate={actions.openCreate}
          onRename={(target) =>
            actions.openRename({ id: target.id, name: target.name })
          }
          onDelete={(target) =>
            actions.openDelete({ id: target.id, name: target.name })
          }
        />

        <main className="flex h-full flex-1 items-center justify-center overflow-hidden rounded-2xl border border-surface-border bg-surface px-6">
          <div className="flex flex-col items-center gap-3 text-center text-copy-muted">
            <p className="text-sm font-medium text-copy-secondary">
              Canvas coming soon
            </p>
            <p className="max-w-sm text-xs text-copy-muted">
              The collaborative canvas for{" "}
              <span className="text-copy-primary">{project.name}</span> will
              render here.
            </p>
          </div>
        </main>

        <aside
          aria-hidden={!isAiSidebarOpen}
          className={cn(
            "h-full w-80 max-w-[85vw] shrink-0 overflow-hidden rounded-2xl border border-surface-border bg-surface transition-[width,opacity] duration-200 ease-out",
            isAiSidebarOpen
              ? "opacity-100"
              : "pointer-events-none w-0 border-0 opacity-0"
          )}
        >
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-surface-border px-4">
            <Sparkles className="h-4 w-4 text-ai-text" />
            <h2 className="text-sm font-medium text-copy-primary">AI</h2>
          </div>
          <div className="flex h-[calc(100%-3rem)] items-center justify-center px-4 text-center text-xs text-copy-muted">
            AI chat coming soon.
          </div>
        </aside>
      </div>

      <ShareDialog share={share} isOwner={isOwner} />

      <CreateProjectDialog
        open={actions.mode === "create"}
        name={actions.name}
        roomId={actions.roomId}
        isSubmitting={actions.isSubmitting}
        onNameChange={actions.setName}
        onClose={actions.close}
        onSubmit={actions.submit}
      />

      <RenameProjectDialog
        open={actions.mode === "rename"}
        currentName={actions.target?.name ?? ""}
        name={actions.name}
        isSubmitting={actions.isSubmitting}
        onNameChange={actions.setName}
        onClose={actions.close}
        onSubmit={actions.submit}
      />

      <DeleteProjectDialog
        open={actions.mode === "delete"}
        projectName={actions.target?.name ?? ""}
        isSubmitting={actions.isSubmitting}
        onClose={actions.close}
        onConfirm={actions.submit}
      />
    </div>
  )
}
