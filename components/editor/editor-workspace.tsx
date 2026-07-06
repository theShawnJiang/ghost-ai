"use client"

import { useState } from "react"

import type { Project } from "@/app/generated/prisma/client"
import { AiSidebar } from "@/components/editor/ai-sidebar"
import { CanvasRoom } from "@/components/editor/canvas/canvas-room"
import { CreateProjectDialog } from "@/components/editor/create-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { RenameProjectDialog } from "@/components/editor/rename-project-dialog"
import { ShareDialog } from "@/components/editor/share-dialog"
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
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const actions = useProjectActions()
  const share = useShareDialog(project.id)

  return (
    <div className="flex h-screen flex-col bg-base">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        projectName={project.name}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
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

        <main className="h-full flex-1 overflow-hidden rounded-2xl border border-surface-border bg-base">
          <CanvasRoom
            roomId={project.id}
            templatesOpen={isTemplatesOpen}
            onTemplatesOpenChange={setIsTemplatesOpen}
          />
        </main>

        <AiSidebar
          isOpen={isAiSidebarOpen}
          onClose={() => setIsAiSidebarOpen(false)}
        />
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
