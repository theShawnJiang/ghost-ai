"use client"

import { useCallback, useRef, useState } from "react"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { Bot, Download, FileText, Loader2, Send, X } from "lucide-react"

import { AiStatusIndicator } from "@/components/editor/ai-status-indicator"
import {
  SpecPreviewDialog,
  formatTimestamp,
} from "@/components/editor/spec-preview-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  useAiChatFeed,
  type AiChatFeedEntry,
} from "@/hooks/use-ai-chat-feed"
import { useAiStatusFeed } from "@/hooks/use-ai-status-feed"
import { useDesignAgent } from "@/hooks/use-design-agent"
import { useProjectSpecs } from "@/hooks/use-project-specs"
import { useThinkingPresence } from "@/hooks/use-thinking-presence"
import { specDownloadUrl } from "@/lib/spec-file"
import { cn } from "@/lib/utils"
import type { ProjectSpecSummary } from "@/types/spec"
import type { AiStatusFeedMessage } from "@/types/tasks"

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
  /** Project id, which is also the Liveblocks room id the design targets. */
  projectId: string
}

const TAB_TRIGGER_CLASS =
  "text-copy-muted data-active:bg-accent-dim data-active:text-brand dark:data-active:bg-accent-dim dark:data-active:text-brand"

export function AiSidebar({ isOpen, onClose, projectId }: AiSidebarProps) {
  const [tab, setTab] = useState("architect")
  // Room-wide AI activity: the same status for every participant, regardless of
  // who started the run or which tab they're on.
  const aiStatus = useAiStatusFeed()

  return (
    <aside
      aria-hidden={!isOpen}
      className={cn(
        "flex h-full w-80 max-w-[85vw] shrink-0 flex-col overflow-hidden rounded-2xl border border-surface-border bg-page/95 shadow-2xl transition-[width,opacity] duration-200 ease-out",
        isOpen
          ? "opacity-100"
          : "pointer-events-none w-0 border-0 opacity-0"
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-surface-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-dim text-brand">
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-copy-primary">
              AI Workspace
            </h2>
            <p className="text-xs text-copy-muted">
              Collaborate with Ghost AI
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close AI sidebar"
        >
          <X />
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex flex-1 flex-col gap-3 overflow-hidden"
      >
        <div className="shrink-0 px-4 pt-3">
          <TabsList className="w-full">
            <TabsTrigger value="architect" className={TAB_TRIGGER_CLASS}>
              AI Architect
            </TabsTrigger>
            <TabsTrigger value="specs" className={TAB_TRIGGER_CLASS}>
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="architect"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <ArchitectTab
            projectId={projectId}
            status={aiStatus.status}
            isRoomBusy={aiStatus.isActive}
          />
        </TabsContent>

        <TabsContent
          value="specs"
          className="min-h-0 flex-1 overflow-hidden"
        >
          <SpecsTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </aside>
  )
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

interface ArchitectTabProps {
  projectId: string
  /** Latest room-wide AI status, rendered as a strip while a run is active. */
  status: AiStatusFeedMessage | null
  /** Whether any participant's AI run is currently active in this room. */
  isRoomBusy: boolean
}

function ArchitectTab({ projectId, status, isRoomBusy }: ArchitectTabProps) {
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Room chat, shared by everyone in the room. Separate feed from the AI status
  // strip, so a teammate's message and a progress line never blur together.
  const chat = useAiChatFeed()

  // Ghost AI publishes its own replies from the task, so this is only reached
  // for failures no task could report: the trigger request never landed, or the
  // run died before running any of its own code.
  const { sendAiMessage } = chat
  const publishAiMessage = useCallback(
    (content: string) => {
      void sendAiMessage(content)
    },
    [sendAiMessage],
  )

  const agent = useDesignAgent({
    roomId: projectId,
    onAiMessage: publishAiMessage,
  })

  // Generation writes to the shared canvas, so a run started by anyone locks
  // the composer for everyone — two concurrent runs would fight over the graph.
  const isGenerating = agent.isRunning || isRoomBusy

  // Let the rest of the room see this user waiting on the AI, via their cursor.
  useThinkingPresence(agent.isRunning)

  // Subscribe to the active run to unlock the composer when it ends and to show
  // how far it has got before it publishes any status of its own. The token from
  // the trigger response authorizes reading just this run; when idle there is
  // nothing to subscribe to. Only `status` is read, so the heavier columns stay
  // off the wire.
  const { run } = useRealtimeRun(agent.runId, {
    accessToken: agent.publicToken,
    enabled: Boolean(agent.runId && agent.publicToken),
    skipColumns: ["payload", "output", "metadata"],
    onComplete: (completedRun) => agent.handleComplete(completedRun.status),
  })

  async function send() {
    const content = input.trim()
    if (!content || isGenerating || chat.isSending) return

    // The prompt is a room message first: everyone sees who asked for what.
    // Only clear the composer once it actually reached the feed, so a failed
    // send leaves the text in place to retry.
    const sent = await chat.send(content)
    if (!sent) return

    setInput("")
    void agent.submit(content)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  function pickPrompt(prompt: string) {
    setInput(prompt)
    textareaRef.current?.focus()
  }

  const isBusy = isGenerating || chat.isSending

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 px-4 pb-4">
          {chat.messages.length === 0 ? (
            <EmptyState onPick={pickPrompt} />
          ) : (
            chat.messages.map((message) => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender.id === chat.selfId}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-surface-border p-3">
        {/* Only rendered while a run is active — the strip is progress, not
            history; finished and failed runs speak through the chat feed.
            `pendingText` covers the gap before the task's first status: the run
            can sit queued and cold-starting for tens of seconds, and a locked
            composer with no explanation reads as a broken app. */}
        <AiStatusIndicator
          status={isRoomBusy ? status : null}
          pendingText={agent.isRunning ? pendingStatusText(run?.status) : null}
        />
        {chat.error && (
          <p role="alert" className="mb-2 px-1 text-xs text-error">
            {chat.error}
          </p>
        )}
        <div className="flex flex-col gap-2 rounded-xl border border-surface-border bg-elevated p-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isGenerating
                ? "Ghost AI is working…"
                : "Message the room or describe a system to design…"
            }
            disabled={isBusy}
            className="max-h-40 min-h-[72px] resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-copy-faint">
              {isGenerating
                ? "Waiting for the current design to finish"
                : "Enter to send · Shift+Enter for a new line"}
            </span>
            <Button
              size="sm"
              onClick={() => void send()}
              disabled={!input.trim() || isBusy}
              className="bg-brand text-white hover:bg-brand/90"
            >
              {isBusy ? <Loader2 className="animate-spin" /> : <Send />}
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * What the strip says while this user's run exists but has not reached its own
 * code yet. Mirrors the Trigger.dev run lifecycle rather than the AI phases:
 * these are the states before the task can publish anything.
 */
function pendingStatusText(status: string | undefined): string {
  switch (status) {
    case undefined:
      return "Sending your prompt…"
    case "PENDING_VERSION":
    case "QUEUED":
    case "DELAYED":
      return "Queued — waiting for a worker…"
    default:
      return "Ghost AI is starting up…"
  }
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-dim text-brand">
        <Bot className="h-8 w-8" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-copy-primary">
          Design with the AI Architect
        </p>
        <p className="text-xs text-copy-muted">
          Describe a system and Ghost AI will help you shape its architecture.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPick(prompt)}
            className="cursor-pointer rounded-full bg-subtle px-3 py-1.5 text-xs text-copy-secondary transition-colors hover:bg-subtle/70"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

interface ChatMessageBubbleProps {
  message: AiChatFeedEntry
  /** Whether the local user sent it — own messages sit on the right. */
  isOwn: boolean
}

/**
 * A message from the shared `ai-chat` feed: a person's message or one of Ghost
 * AI's replies. Every message is attributed with a sender and a time, since the
 * feed carries the whole room's conversation.
 *
 * People read as accent, the AI reads as a dark elevated surface; the local
 * user's own messages carry the solid accent and sit on the right, so "mine",
 * "theirs", and "the AI's" stay distinguishable at a glance.
 */
function ChatMessageBubble({ message, isOwn }: ChatMessageBubbleProps) {
  const isAi = message.role === "assistant"

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-1",
          isOwn ? "items-end" : "items-start"
        )}
      >
        <div className="flex items-center gap-1.5 px-1 text-xs text-copy-faint">
          <span className="max-w-[10rem] truncate font-medium text-copy-muted">
            {isOwn ? "You" : message.sender.name}
          </span>
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
        </div>
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
            isAi && "border border-surface-border bg-elevated text-copy-secondary",
            !isAi && isOwn && "bg-brand font-medium text-page",
            !isAi && !isOwn && "border border-brand/40 bg-accent-dim text-copy-primary"
          )}
        >
          {message.content}
        </div>
      </div>
    </div>
  )
}

/** Short local time for a chat timestamp, e.g. "2:14 PM". */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

function SpecsTab({ projectId }: { projectId: string }) {
  const { specs, isLoading, error } = useProjectSpecs(projectId)
  // Which spec the preview is showing. Only the metadata is held here — the
  // Markdown lives in the dialog for as long as it is open, and no longer.
  const [selected, setSelected] = useState<ProjectSpecSummary | null>(null)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="shrink-0 px-4">
        <Button className="w-full bg-brand text-white hover:bg-brand/90">
          <FileText />
          Generate Spec
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-2 px-4 pb-4">
          {isLoading && (
            <div className="flex items-center gap-2 px-1 py-3 text-xs text-copy-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading specs…
            </div>
          )}

          {error && (
            <p role="alert" className="px-1 py-3 text-xs text-error">
              {error}
            </p>
          )}

          {!isLoading && !error && specs.length === 0 && <SpecsEmptyState />}

          {specs.map((spec) => (
            <SpecListItem
              key={spec.id}
              projectId={projectId}
              spec={spec}
              onSelect={() => setSelected(spec)}
            />
          ))}
        </div>
      </ScrollArea>

      <SpecPreviewDialog
        projectId={projectId}
        spec={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

interface SpecListItemProps {
  projectId: string
  spec: ProjectSpecSummary
  onSelect: () => void
}

/**
 * One generated spec: created time and filename, opening the preview when
 * picked. Download is a plain link to the download route, so the browser handles
 * saving the file rather than the client buffering it.
 */
function SpecListItem({ projectId, spec, onSelect }: SpecListItemProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-elevated pr-2 transition-colors hover:border-border-subtle">
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl p-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-subtle text-brand">
          <FileText className="h-4 w-4" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-xs text-copy-muted">
            {formatTimestamp(spec.createdAt)}
          </span>
          <span className="truncate text-sm font-medium text-copy-primary">
            {spec.filename}
          </span>
        </span>
      </button>
      {/* A plain anchor, not a Button: the browser owns the download, and a
          real link keeps Enter, middle-click, and "Save link as". */}
      <a
        href={specDownloadUrl(projectId, spec.id)}
        download={spec.filename}
        aria-label={`Download ${spec.filename}`}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "cursor-pointer"
        )}
      >
        <Download />
      </a>
    </div>
  )
}

function SpecsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-dim text-brand">
        <FileText className="h-8 w-8" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-copy-primary">No specs yet</p>
        <p className="text-xs text-copy-muted">
          Generate a spec and it will show up here, ready to read and download.
        </p>
      </div>
    </div>
  )
}
