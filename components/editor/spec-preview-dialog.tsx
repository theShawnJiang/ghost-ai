"use client"

import { Download, Loader2 } from "lucide-react"

import { MarkdownView } from "@/components/editor/markdown-view"
import { buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSpecContent } from "@/hooks/use-project-specs"
import { specDownloadUrl } from "@/lib/spec-file"
import { cn } from "@/lib/utils"
import type { ProjectSpecSummary } from "@/types/spec"

interface SpecPreviewDialogProps {
  projectId: string
  /** The selected spec, or `null` when the preview is closed. */
  spec: ProjectSpecSummary | null
  onClose: () => void
}

/**
 * Reads one generated spec: its Markdown rendered, with the same download
 * action the list offers.
 *
 * Content is fetched through the download route rather than from the blob, and
 * only while a spec is selected — closing the dialog drops it.
 */
export function SpecPreviewDialog({
  projectId,
  spec,
  onClose,
}: SpecPreviewDialogProps) {
  const { content, isLoading, error } = useSpecContent(
    projectId,
    spec?.id ?? null
  )

  return (
    <Dialog
      open={Boolean(spec)}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="gap-4 rounded-3xl p-6 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Technical spec</DialogTitle>
          <DialogDescription>
            {spec ? formatTimestamp(spec.createdAt) : ""}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] rounded-2xl border border-surface-border bg-page/40">
          <div className="p-4">
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-copy-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading spec…
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-error">
                {error}
              </p>
            )}

            {!isLoading && !error && content !== null && (
              <MarkdownView source={content} />
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end">
          {spec && (
            /* A plain anchor, not a Button: the browser owns the download, and
               a real link keeps Enter, middle-click, and "Save link as". */
            <a
              href={specDownloadUrl(projectId, spec.id)}
              download={spec.filename}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "cursor-pointer"
              )}
            >
              <Download />
              Download
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Absolute date and time for a spec, e.g. "Aug 18, 2026, 2:14 PM". */
export function formatTimestamp(createdAt: string): string {
  return new Date(createdAt).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
