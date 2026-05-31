import { redirect } from "next/navigation"

import { AccessDenied } from "@/components/editor/access-denied"
import { EditorWorkspace } from "@/components/editor/editor-workspace"
import {
  getAccessibleProject,
  getCurrentIdentity,
} from "@/lib/project-access"
import { getProjectsForUser } from "@/lib/projects"

interface EditorRoomPageProps {
  params: Promise<{ roomId: string }>
}

export default async function EditorRoomPage({ params }: EditorRoomPageProps) {
  const identity = await getCurrentIdentity()
  if (!identity) redirect("/sign-in")

  const { roomId } = await params
  const project = await getAccessibleProject(roomId, identity)
  if (!project) return <AccessDenied />

  const { owned, shared } = await getProjectsForUser()

  return (
    <EditorWorkspace
      project={project}
      owned={owned}
      shared={shared}
      isOwner={project.ownerId === identity.userId}
    />
  )
}
