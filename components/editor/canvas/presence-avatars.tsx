"use client"

import { useAuth, UserButton } from "@clerk/nextjs"
import { useOthers } from "@liveblocks/react"

import { cn } from "@/lib/utils"

/** Number of collaborator avatars shown before collapsing into a +N chip. */
const MAX_VISIBLE = 5

/**
 * Active-participant group pinned to the top-right of the canvas view.
 *
 * Collaborator avatars come from Liveblocks presence (`useOthers`) with the
 * current Clerk user filtered out, so their own session — including any extra
 * tabs — is never drawn as a collaborator. The current user is represented once
 * by the shared Clerk `UserButton`; a divider separates the two only when at
 * least one collaborator is present.
 */
export function PresenceAvatars() {
  const { userId } = useAuth()
  const others = useOthers()

  // Exclude the current Clerk user (any of their sessions) and dedupe by user
  // id so a collaborator with multiple open tabs still shows a single avatar.
  const collaborators = Array.from(
    new Map(
      others
        .filter((other) => other.id && other.id !== userId)
        .map((other) => [other.id, other] as const)
    ).values()
  )

  const visible = collaborators.slice(0, MAX_VISIBLE)
  const overflow = collaborators.length - visible.length
  const hasCollaborators = collaborators.length > 0

  return (
    <div className="absolute right-4 top-4 z-10 flex items-center">
      {hasCollaborators ? (
        <div className="flex items-center">
          {visible.map((collaborator) => (
            <CollaboratorAvatar
              key={collaborator.id}
              name={collaborator.info?.name}
              avatar={collaborator.info?.avatar}
            />
          ))}
          {overflow > 0 ? (
            <span
              className="-ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-subtle text-[10px] font-medium text-copy-secondary ring-2 ring-surface-border"
              aria-label={`${overflow} more ${overflow === 1 ? "collaborator" : "collaborators"}`}
            >
              +{overflow}
            </span>
          ) : null}
        </div>
      ) : null}

      {hasCollaborators ? (
        <div className="mx-2 h-6 w-px bg-surface-border" aria-hidden />
      ) : null}

      <UserButton />
    </div>
  )
}

/**
 * Display-only collaborator avatar. Uses the presence profile photo when
 * available and falls back to the name's initial. The subtle ring keeps
 * overlapping avatars separated and readable on the dark canvas.
 */
function CollaboratorAvatar({
  name,
  avatar,
}: {
  name?: string
  avatar?: string
}) {
  const label = name?.trim() || "Collaborator"

  return (
    <span
      className={cn(
        "-ml-2 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-elevated text-[10px] font-medium text-copy-secondary ring-2 ring-surface-border first:ml-0"
      )}
      title={label}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        label.charAt(0).toUpperCase()
      )}
    </span>
  )
}
