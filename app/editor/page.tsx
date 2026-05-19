import { EditorHome } from "@/components/editor/editor-home"
import { getProjectsForUser } from "@/lib/projects"

export default async function EditorPage() {
  const { owned, shared } = await getProjectsForUser()
  return <EditorHome owned={owned} shared={shared} />
}
