"use client"

import { useEffect } from "react"
import { useUpdateMyPresence } from "@liveblocks/react"

/**
 * Publishes whether the local user is currently waiting on an AI run through
 * Liveblocks presence, so every other participant's cursor badge can show a
 * thinking spinner next to their name. Must be used inside a `RoomProvider`.
 */
export function useThinkingPresence(thinking: boolean) {
  const updateMyPresence = useUpdateMyPresence()

  useEffect(() => {
    updateMyPresence({ thinking })
  }, [thinking, updateMyPresence])

  // Never leave a stale thinking flag behind if the sidebar unmounts mid-run.
  useEffect(() => {
    return () => updateMyPresence({ thinking: false })
  }, [updateMyPresence])
}
