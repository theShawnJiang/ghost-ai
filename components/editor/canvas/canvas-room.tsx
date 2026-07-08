"use client"

import { Component, type ReactNode } from "react"
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react"
import { Loader2, WifiOff } from "lucide-react"

import { CanvasFlow } from "@/components/editor/canvas/canvas-flow"
import type { SaveStatus } from "@/hooks/use-canvas-autosave"

interface CanvasRoomProps {
  roomId: string
  /** Whether the starter templates import modal is open. */
  templatesOpen: boolean
  onTemplatesOpenChange: (open: boolean) => void
  /** Surfaces autosave status to the workspace (navbar Save indicator). */
  onSaveStatusChange?: (status: SaveStatus) => void
}

/**
 * Client-side canvas wrapper. Connects to the Liveblocks room for this project
 * and renders the collaborative React Flow canvas once Storage is ready.
 */
export function CanvasRoom({
  roomId,
  templatesOpen,
  onTemplatesOpenChange,
  onSaveStatusChange,
}: CanvasRoomProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={roomId} initialPresence={{ cursor: null, thinking: false }}>
        <CanvasErrorBoundary fallback={<CanvasError />}>
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <CanvasFlow
              projectId={roomId}
              templatesOpen={templatesOpen}
              onTemplatesOpenChange={onTemplatesOpenChange}
              onSaveStatusChange={onSaveStatusChange}
            />
          </ClientSideSuspense>
        </CanvasErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
}

function CanvasLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center gap-2 text-sm text-copy-muted">
      <Loader2 className="h-4 w-4 animate-spin" />
      Connecting to canvas…
    </div>
  )
}

function CanvasError() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-copy-muted">
      <WifiOff className="h-6 w-6" />
      <p className="text-sm font-medium text-copy-secondary">
        Couldn’t connect to the canvas
      </p>
      <p className="max-w-sm text-xs text-copy-muted">
        Check your connection and refresh the page to try again.
      </p>
    </div>
  )
}

interface CanvasErrorBoundaryProps {
  fallback: ReactNode
  children: ReactNode
}

/**
 * Minimal error boundary so Liveblocks connection failures render a fallback
 * instead of crashing the workspace.
 */
class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  { hasError: boolean }
> {
  constructor(props: CanvasErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}
