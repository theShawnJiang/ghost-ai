"use client"

import { useAuth } from "@clerk/nextjs"
import { useOthers } from "@liveblocks/react"
import { useViewport } from "@xyflow/react"

/** Fallback pointer color when a participant has no presence color. */
const FALLBACK_COLOR = "#00c8d4"

/**
 * Overlay that draws other participants' cursors on the canvas.
 *
 * Positions are stored in flow coordinates (see `CanvasFlowInner`), so they
 * point at the same canvas location for everyone regardless of pan/zoom. The
 * React Flow viewport transform maps a flow point back into pane pixels
 * (`flow * zoom + offset`), keeping each pointer a constant on-screen size.
 * The current user is never drawn — only remote participants with a cursor.
 */
export function LiveCursors() {
  const { userId } = useAuth()
  const others = useOthers()
  const { x, y, zoom } = useViewport()

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {others.map((other) => {
        const cursor = other.presence.cursor
        if (!cursor || other.id === userId) return null

        return (
          <Cursor
            key={other.connectionId}
            left={cursor.x * zoom + x}
            top={cursor.y * zoom + y}
            color={other.info?.color ?? FALLBACK_COLOR}
            name={other.info?.name ?? "Anonymous"}
          />
        )
      })}
    </div>
  )
}

interface CursorProps {
  left: number
  top: number
  color: string
  name: string
}

/** A single colored pointer with an attached name badge. */
function Cursor({ left, top, color, name }: CursorProps) {
  return (
    <div
      className="absolute left-0 top-0 will-change-transform"
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
          fill={color}
          stroke="#ffffff"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="absolute left-[18px] top-[14px] whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </div>
  )
}
