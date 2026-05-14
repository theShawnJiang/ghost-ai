"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { CreateProjectDialog } from "@/components/editor/create-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { RenameProjectDialog } from "@/components/editor/rename-project-dialog"
import { Button } from "@/components/ui/button"
import { useProjectDialogs } from "@/hooks/use-project-dialogs"
import { MOCK_PROJECTS } from "@/lib/mock-projects"

export default function EditorPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const dialogs = useProjectDialogs()

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
          projects={MOCK_PROJECTS}
          onCreate={dialogs.openCreate}
          onRename={(project) =>
            dialogs.openRename({ id: project.id, name: project.name })
          }
          onDelete={(project) =>
            dialogs.openDelete({ id: project.id, name: project.name })
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
            <Button onClick={dialogs.openCreate}>
              <Plus />
              New Project
            </Button>
          </div>
        </main>
      </div>

      <CreateProjectDialog
        open={dialogs.mode === "create"}
        name={dialogs.name}
        isSubmitting={dialogs.isSubmitting}
        onNameChange={dialogs.setName}
        onClose={dialogs.close}
        onSubmit={dialogs.submit}
      />

      <RenameProjectDialog
        open={dialogs.mode === "rename"}
        currentName={dialogs.target?.name ?? ""}
        name={dialogs.name}
        isSubmitting={dialogs.isSubmitting}
        onNameChange={dialogs.setName}
        onClose={dialogs.close}
        onSubmit={dialogs.submit}
      />

      <DeleteProjectDialog
        open={dialogs.mode === "delete"}
        projectName={dialogs.target?.name ?? ""}
        isSubmitting={dialogs.isSubmitting}
        onClose={dialogs.close}
        onConfirm={dialogs.submit}
      />
    </div>
  )
}
