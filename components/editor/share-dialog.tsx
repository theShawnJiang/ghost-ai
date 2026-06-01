"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { Check, Link2, Loader2, Mail, UserPlus, X } from "lucide-react"

import type { ProjectMember } from "@/lib/collaborators"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { UseShareDialog } from "@/hooks/use-share-dialog"
import { cn } from "@/lib/utils"

interface ShareDialogProps {
  share: UseShareDialog
  isOwner: boolean
}

export function ShareDialog({ share, isOwner }: ShareDialogProps) {
  const {
    isOpen,
    members,
    isLoading,
    isInviting,
    removingEmail,
    error,
    close,
    invite,
    remove,
  } = share

  const [email, setEmail] = useState("")
  const [copied, setCopied] = useState(false)

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || isInviting) return
    const ok = await invite(email)
    if (ok) setEmail("")
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) {
          setEmail("")
          setCopied(false)
          close()
        }
      }}
    >
      <DialogContent className="gap-5 rounded-3xl p-6 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Share project</DialogTitle>
          <DialogDescription>
            Invite collaborators, copy the workspace link, and manage access.
          </DialogDescription>
        </DialogHeader>

        <section className="flex items-center justify-between gap-4 rounded-2xl border border-surface-border bg-base/40 p-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-medium text-copy-primary">
              Workspace link
            </span>
            <span className="truncate text-xs text-copy-muted">
              Share a direct link with teammates after you grant them access.
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCopyLink}
            className="shrink-0"
          >
            {copied ? <Check /> : <Link2 />}
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </section>

        {isOwner ? (
          <form
            onSubmit={handleInvite}
            className="flex items-center gap-3 rounded-2xl border border-surface-border bg-base/40 p-3"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-elevated px-3">
              <Mail className="h-4 w-4 shrink-0 text-copy-muted" />
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@company.com"
                disabled={isInviting}
                aria-label="Collaborator email"
                className="border-0 bg-transparent px-0 text-copy-primary shadow-none focus-visible:ring-0"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={!email.trim() || isInviting}
              className="shrink-0 border-brand/40 text-brand hover:bg-accent-dim hover:text-brand"
            >
              {isInviting ? <Loader2 className="animate-spin" /> : <UserPlus />}
              Invite
            </Button>
          </form>
        ) : null}

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-copy-primary">
              People with access
            </span>
            <span className="text-xs text-copy-muted">
              {isLoading ? "…" : `${members.length} total`}
            </span>
          </div>

          <ScrollArea className="max-h-64">
            <ul className="flex flex-col gap-2 pr-2">
              {isLoading ? (
                <li className="flex items-center gap-2 rounded-2xl border border-surface-border px-4 py-4 text-xs text-copy-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading people…
                </li>
              ) : (
                members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    canRemove={isOwner && member.role === "collaborator"}
                    isRemoving={removingEmail === member.email}
                    onRemove={() => member.email && remove(member.email)}
                  />
                ))
              )}
            </ul>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface MemberRowProps {
  member: ProjectMember
  canRemove: boolean
  isRemoving: boolean
  onRemove: () => void
}

function MemberRow({ member, canRemove, isRemoving, onRemove }: MemberRowProps) {
  const displayName =
    member.name ??
    member.email ??
    (member.role === "owner" ? "Project owner" : "Collaborator")
  const showEmail = Boolean(member.email) && member.email !== displayName

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-surface-border bg-base/40 px-4 py-3">
      <MemberAvatar member={member} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-copy-primary">
            {displayName}
          </span>
          {member.role === "owner" ? (
            <span className="shrink-0 rounded-full bg-accent-dim px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brand uppercase">
              Owner
            </span>
          ) : null}
        </div>
        {showEmail ? (
          <span className="truncate text-xs text-copy-muted">
            {member.email}
          </span>
        ) : null}
      </div>
      {canRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={isRemoving}
          aria-label={`Remove ${member.email}`}
        >
          {isRemoving ? <Loader2 className="animate-spin" /> : <X />}
        </Button>
      ) : null}
    </li>
  )
}

function MemberAvatar({ member }: { member: ProjectMember }) {
  const initial = (member.name ?? member.email ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase()

  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-subtle text-sm font-medium text-copy-secondary"
      )}
    >
      {member.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.imageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  )
}
