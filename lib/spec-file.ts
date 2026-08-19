import { toSlug } from "@/lib/slug";

/**
 * Filename a generated spec is served as.
 *
 * Shared by the download route (which sets it in `Content-Disposition`) and the
 * specs list route (which shows it in the sidebar), so the name a user sees in
 * the list is the name they actually get on disk.
 */
export function specDownloadFilename(projectName: string): string {
  return `${toSlug(projectName) || "project"}-spec.md`;
}

/**
 * Route a spec is read and downloaded through. The blob URL on
 * `ProjectSpec.filePath` is private and never reaches the client, so this is
 * the only address a browser has for a spec's content.
 */
export function specDownloadUrl(projectId: string, specId: string): string {
  return `/api/projects/${projectId}/specs/${specId}/download`;
}
