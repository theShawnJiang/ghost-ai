import Link from "next/link"
import { Lock } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

interface AccessDeniedProps {
  title?: string
  description?: string
}

export function AccessDenied({
  title = "You don't have access to this project",
  description = "Ask the owner to share it with you, or head back to your workspace.",
}: AccessDeniedProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-base px-6">
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-surface-border bg-surface text-copy-muted">
          <Lock className="h-6 w-6" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-semibold text-copy-primary">{title}</h1>
          <p className="text-sm text-copy-muted">{description}</p>
        </div>
        <Link
          href="/editor"
          className={buttonVariants({ variant: "outline" })}
        >
          Back to projects
        </Link>
      </div>
    </main>
  )
}
