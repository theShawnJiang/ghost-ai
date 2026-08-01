"use client"

import { useMemo, useRef, useState } from "react"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { Bot, Download, FileText, Loader2, Send, X } from "lucide-react"

import { AiStatusIndicator } from "@/components/editor/ai-status-indicator"
import { Button } from "@/components/ui/button"
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
import {
  useDesignAgent,
  type AiChatMessage,
  type DesignRunOutput,
} from "@/hooks/use-design-agent"
import { useThinkingPresence } from "@/hooks/use-thinking-presence"
import { cn } from "@/lib/utils"
import type { AiLogEntry } from "@/types/ai"

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

      {aiStatus.status && (
        <div className="shrink-0 px-4 pt-3">
          <AiStatusIndicator
            status={aiStatus.status}
            isActive={aiStatus.isActive}
          />
        </div>
      )}

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
          <ArchitectTab projectId={projectId} isRoomBusy={aiStatus.isActive} />
        </TabsContent>

        <TabsContent
          value="specs"
          className="min-h-0 flex-1 overflow-hidden"
        >
          <SpecsTab />
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
  /** Whether any participant's AI run is currently active in this room. */
  isRoomBusy: boolean
}

function ArchitectTab({ projectId, isRoomBusy }: ArchitectTabProps) {
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const agent = useDesignAgent(projectId)
  // Room chat, shared by everyone in the room. Separate feed from the AI status
  // above, so a teammate's message and a progress line never blur together.
  const chat = useAiChatFeed()

  // Generation writes to the shared canvas, so a run started by anyone locks
  // the composer for everyone — two concurrent runs would fight over the graph.
  const isGenerating = agent.isSubmitting || isRoomBusy

  // Let the rest of the room see this user waiting on the AI, via their cursor.
  useThinkingPresence(agent.isSubmitting)

  // Subscribe to the active run so the chat reflects live task progress. The
  // run-scoped token authorizes reading just this run; when idle it's disabled.
  const { run } = useRealtimeRun(agent.runId, {
    accessToken: agent.accessToken,
    enabled: Boolean(agent.runId && agent.accessToken),
    onComplete: (completedRun, err) =>
      agent.handleComplete(
        completedRun.output as DesignRunOutput | undefined,
        err,
      ),
  })

  const log = (run?.metadata?.log as AiLogEntry[] | undefined) ?? []
  const liveStatus = log[log.length - 1]?.message ?? "Getting started…"

  // Shared chat and the local AI replies are two sources for one transcript, so
  // they're interleaved on their timestamps rather than concatenated.
  const transcript = useMemo(
    () => buildTranscript(chat.messages, agent.messages),
    [chat.messages, agent.messages],
  )

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
  const hasContent = transcript.length > 0 || agent.isSubmitting

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 px-4 pb-4">
          {!hasContent ? (
            <EmptyState onPick={pickPrompt} />
          ) : (
            <>
              {transcript.map((entry) =>
                entry.kind === "chat" ? (
                  <ChatMessageBubble
                    key={entry.id}
                    message={entry.message}
                    isOwn={entry.message.sender.id === chat.selfId}
                  />
                ) : (
                  <MessageBubble key={entry.id} message={entry.message} />
                ),
              )}
              {agent.isSubmitting && <StatusBubble message={liveStatus} />}
            </>
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-surface-border p-3">
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
 * One rendered line of the sidebar conversation: either a shared `ai-chat`
 * message every participant sees, or an AI reply local to whoever started the
 * run. Kept as separate kinds so chat and AI output never get conflated.
 */
type TranscriptEntry =
  | { kind: "chat"; id: string; timestamp: number; message: AiChatFeedEntry }
  | { kind: "agent"; id: string; timestamp: number; message: AiChatMessage }

function buildTranscript(
  chatMessages: AiChatFeedEntry[],
  agentMessages: AiChatMessage[],
): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [
    ...chatMessages.map<TranscriptEntry>((message) => ({
      kind: "chat",
      id: message.id,
      timestamp: message.timestamp,
      message,
    })),
    ...agentMessages.map<TranscriptEntry>((message) => ({
      kind: "agent",
      id: message.id,
      timestamp: message.timestamp,
      message,
    })),
  ]

  return entries.sort((a, b) => a.timestamp - b.timestamp)
}

function StatusBubble({ message }: { message: string }) {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[85%] items-center gap-2 rounded-2xl border border-surface-border bg-elevated px-3 py-2 text-sm text-ai-text">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        {message}
      </div>
    </div>
  )
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

function MessageBubble({ message }: { message: AiChatMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
          isUser
            ? "border-2 border-brand/50 bg-accent-dim text-copy-primary"
            : "border border-surface-border bg-elevated text-copy-secondary"
        )}
      >
        {message.content}
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
 * A message from the shared `ai-chat` feed. Unlike the AI bubbles above these
 * come from other people, so each one is attributed with a sender and a time.
 */
function ChatMessageBubble({ message, isOwn }: ChatMessageBubbleProps) {
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
            isOwn
              ? "border-2 border-brand/50 bg-accent-dim text-copy-primary"
              : "border border-surface-border bg-elevated text-copy-secondary"
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

function SpecsTab() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
      <Button className="w-full bg-brand text-white hover:bg-brand/90">
        <FileText />
        Generate Spec
      </Button>

      <SpecCard />
    </div>
  )
}

function SpecCard() {
  return (
    <div className="rounded-2xl border border-surface-border bg-elevated p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-subtle text-brand">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-copy-primary">
            System Architecture Spec
          </h3>
          <p className="mt-1 text-xs text-copy-muted">
            A generated technical specification describing the services, data
            flow, and deployment topology for your canvas design.
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button variant="outline" size="sm" disabled>
          <Download />
          Download
        </Button>
      </div>
    </div>
  )
}
