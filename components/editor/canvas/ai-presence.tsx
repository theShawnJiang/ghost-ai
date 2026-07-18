"use client"

import { useEffect, useRef, useState } from "react"
import { useEventListener } from "@liveblocks/react"
import { useViewport } from "@xyflow/react"
import { Sparkles } from "lucide-react"

import { AI_PRESENCE_COLOR, AI_PRESENCE_NAME, type AiStatusEvent } from "@/types/ai"

/** Clear stuck AI presence if no terminal event arrives (e.g. task crashed). */
const PRESENCE_TIMEOUT_MS = 120_000

/**
 * Renders the AI collaborator's live presence on the canvas — a moving cursor
 * and a status badge — for every participant in the room. It is driven entirely
 * by `ai-status` room events broadcast by the design agent, so all users see the
 * AI working, not just whoever started the run.
 */
export function AiPresence() {
  const [status, setStatus] = useState<AiStatusEvent | null>(null)
  const { x, y, zoom } = useViewport()

  useEventListener(({ event }) => {
    if (event.type !== "ai-status") return
    // Terminal phases clear presence so the cursor/badge don't linger.
    setStatus(event.phase === "complete" || event.phase === "error" ? null : event)
  })

  // Safety net: drop presence if the agent stops publishing without a terminal
  // event (the timeout resets on every new event via the `status` dependency).
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!status) return
    timeoutRef.current = setTimeout(() => setStatus(null), PRESENCE_TIMEOUT_MS)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [status])

  if (!status?.thinking) return null

  const cursor = status.cursor

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <div className="absolute left-1/2 top-4 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full border border-surface-border bg-surface/90 px-3 py-1.5 text-xs font-medium text-ai-text shadow-lg backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          {status.message}
        </div>
      </div>

      {cursor && (
        <AiCursor left={cursor.x * zoom + x} top={cursor.y * zoom + y} />
      )}
    </div>
  )
}

interface AiCursorProps {
  left: number
  top: number
}

/** The AI's pointer with an attached "Ghost AI" badge, in the AI accent color. */
function AiCursor({ left, top }: AiCursorProps) {
  return (
    <div
      className="absolute left-0 top-0 transition-transform duration-500 ease-out will-change-transform"
      style={{ transform: `translateX(${left}px) translateY(${top}px)` }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5.65 12.37 5.5 12.5 1.5 16 1.5 2 12 12.37 6.13 12.37Z"
          fill={AI_PRESENCE_COLOR}
          stroke="#ffffff"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="absolute left-[18px] top-[14px] flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none text-white shadow-sm"
        style={{ backgroundColor: AI_PRESENCE_COLOR }}
      >
        <Sparkles className="h-3 w-3" />
        {AI_PRESENCE_NAME}
      </span>
    </div>
  )
}
