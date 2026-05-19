"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import type { Project } from "@/app/generated/prisma/client"
import { CreateProjectDialog } from "@/components/editor/create-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { RenameProjectDialog } from "@/components/editor/rename-project-dialog"
import { Button } from "@/components/ui/button"
import { useProjectActions } from "@/hooks/use-project-actions"

interface EditorHomeProps {
  owned: Project[]
  shared: Project[]
}

export function EditorHome({ owned, shared }: EditorHomeProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const actions = useProjectActions()

  return (
    <div className="flex h-screen flex-col bg-base">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />
      <div className="relative flex-1 overflow-hidden">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          owned={owned}
          shared={shared}
          onCreate={actions.openCreate}
          onRename={(project) =>
            actions.openRename({ id: project.id, name: project.name })
          }
          onDelete={(project) =>
            actions.openDelete({ id: project.id, name: project.name })
          }
        />
        <main className="flex h-full w-full items-center justify-center px-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-xl font-semibold text-copy-primary">
              Create a project or open an existing one
            </h1>
            <p className="text-sm whitespace-nowrap text-copy-muted">
              Start a new architecture workspace, or choose a project from the sidebar.
            </p>
            <Button onClick={actions.openCreate}>
              <Plus />
              New Project
            </Button>
          </div>
        </main>
      </div>

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
