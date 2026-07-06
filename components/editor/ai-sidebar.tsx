"use client"

import { useRef, useState } from "react"
import { Bot, Download, FileText, Send, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const TAB_TRIGGER_CLASS =
  "text-copy-muted data-active:bg-accent-dim data-active:text-brand dark:data-active:bg-accent-dim dark:data-active:text-brand"

export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  const [tab, setTab] = useState("architect")

  return (
    <aside
      aria-hidden={!isOpen}
      className={cn(
        "flex h-full w-80 max-w-[85vw] shrink-0 flex-col overflow-hidden rounded-2xl border border-surface-border bg-base/95 shadow-2xl transition-[width,opacity] duration-200 ease-out",
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
          <ArchitectTab />
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

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

const ASSISTANT_PLACEHOLDER =
  "This is a placeholder response — AI generation isn't connected yet. Your prompt has been captured here."

function ArchitectTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function send() {
    const content = input.trim()
    if (!content) return
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: ASSISTANT_PLACEHOLDER,
      },
    ])
    setInput("")
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  function pickPrompt(prompt: string) {
    setInput(prompt)
    textareaRef.current?.focus()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 px-4 pb-4">
          {messages.length === 0 ? (
            <EmptyState onPick={pickPrompt} />
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-surface-border p-3">
        <div className="flex flex-col gap-2 rounded-xl border border-surface-border bg-elevated p-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the system you want to design…"
            className="max-h-40 min-h-[72px] resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-copy-faint">
              Enter to send · Shift+Enter for a new line
            </span>
            <Button
              size="sm"
              onClick={send}
              disabled={!input.trim()}
              className="bg-brand text-white hover:bg-brand/90"
            >
              <Send />
              Send
            </Button>
          </div>
        </div>
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

function MessageBubble({ message }: { message: ChatMessage }) {
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
