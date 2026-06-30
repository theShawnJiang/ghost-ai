"use client"

import {
  LayoutTemplate,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Sparkles,
} from "lucide-react"
import { UserButton } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EditorNavbarProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  projectName?: string
  onOpenTemplates?: () => void
  onShare?: () => void
  isAiSidebarOpen?: boolean
  onToggleAiSidebar?: () => void
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  projectName,
  onOpenTemplates,
  onShare,
  isAiSidebarOpen,
  onToggleAiSidebar,
}: EditorNavbarProps) {
  const ToggleIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-surface-border bg-surface px-3">
      <div className="flex flex-1 items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close projects sidebar" : "Open projects sidebar"}
          className="cursor-pointer"
        >
          <ToggleIcon />
        </Button>
        {onOpenTemplates ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenTemplates}
            className="cursor-pointer"
          >
            <LayoutTemplate />
            Templates
          </Button>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center">
        {projectName ? (
          <span className="max-w-full truncate text-sm font-medium text-copy-primary">
            {projectName}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 items-center justify-end gap-1">
        {onShare ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShare}
            className="cursor-pointer"
          >
            <Share2 />
            Share
          </Button>
        ) : null}
        {onToggleAiSidebar ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleAiSidebar}
            aria-label={isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
            className={cn(
              "cursor-pointer",
              isAiSidebarOpen && "bg-ai/10 text-ai-text"
            )}
          >
            <Sparkles />
          </Button>
        ) : null}
        <UserButton />
      </div>
    </header>
  )
}
