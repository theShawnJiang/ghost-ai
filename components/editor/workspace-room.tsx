"use client"

import type { ReactNode } from "react"
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react"

interface WorkspaceRoomProps {
  /** Liveblocks room id — always the project id. */
  roomId: string
  children: ReactNode
}

/**
 * Connects the editor workspace to the project's Liveblocks room.
 *
 * The provider wraps both the canvas and the AI sidebar (rather than the canvas
 * alone) so both surfaces read the same room state: the sidebar needs the
 * shared `ai-status-feed` and the local user's `thinking` presence, which the
 * canvas cursors render.
 */
export function WorkspaceRoom({ roomId, children }: WorkspaceRoomProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, thinking: false }}
      >
        {children}
      </RoomProvider>
    </LiveblocksProvider>
  )
}
