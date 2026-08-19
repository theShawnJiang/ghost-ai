"use client"

import { useCallback, useEffect, useState } from "react"

import type { ProjectSpecSummary } from "@/types/spec"

const LIST_ERROR = "Couldn't load specs for this project."
const CONTENT_ERROR = "Couldn't load this spec."

/**
 * A settled result, tagged with the request it answers.
 *
 * Both hooks below store their result this way and compare the tag against the
 * current request during render, rather than resetting state from the effect
 * body: a synchronous `setState` in an effect cascades an extra render, and
 * "the answer I have is for an older request" is derivable, not state.
 */
interface Settled<T> {
  key: string
  value: T
  error: string | null
}

function settledFor<T>(
  state: Settled<T> | null,
  key: string | null
): Settled<T> | null {
  return state && key !== null && state.key === key ? state : null
}

export interface UseProjectSpecs {
  specs: ProjectSpecSummary[]
  isLoading: boolean
  error: string | null
  /** Re-fetch the list, e.g. after a new spec finishes generating. */
  reload: () => void
}

/**
 * The project's generated specs, newest first.
 *
 * Metadata only — `ProjectSpecSummary` carries no blob URL, so reading a spec
 * always goes back through the download route and its access checks.
 */
export function useProjectSpecs(projectId: string): UseProjectSpecs {
  const [state, setState] = useState<Settled<ProjectSpecSummary[]> | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  const key = `${projectId}:${reloadCount}`

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(`/api/projects/${projectId}/specs`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(LIST_ERROR)

        const body = (await response.json()) as { specs?: ProjectSpecSummary[] }
        if (controller.signal.aborted) return

        setState({
          key,
          value: Array.isArray(body.specs) ? body.specs : [],
          error: null,
        })
      } catch {
        // An aborted request was superseded — whatever replaced it owns the
        // state now, so leave it alone.
        if (controller.signal.aborted) return
        setState({ key, value: [], error: LIST_ERROR })
      }
    }

    void load()

    return () => controller.abort()
  }, [projectId, key])

  const settled = settledFor(state, key)

  return {
    specs: settled?.value ?? [],
    isLoading: settled === null,
    error: settled?.error ?? null,
    reload,
  }
}

export interface UseSpecContent {
  content: string | null
  isLoading: boolean
  error: string | null
}

/**
 * Markdown for one spec, fetched through the download route.
 *
 * The content is held only while a spec is selected: passing `specId: null`
 * reads as nothing loaded, so a closed preview leaves no spec text in the
 * client, and reopening one re-fetches it.
 */
export function useSpecContent(
  projectId: string,
  specId: string | null
): UseSpecContent {
  const [state, setState] = useState<Settled<string | null> | null>(null)

  const key = specId ? `${projectId}:${specId}` : null

  useEffect(() => {
    if (!key || !specId) return

    // Re-bound after the guard so the async closure below carries the narrowed
    // types rather than the nullable ones.
    const requestKey = key
    const requestId = specId
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/specs/${requestId}/download`,
          { signal: controller.signal }
        )
        if (!response.ok) throw new Error(CONTENT_ERROR)

        const text = await response.text()
        if (controller.signal.aborted) return

        setState({ key: requestKey, value: text, error: null })
      } catch {
        if (controller.signal.aborted) return
        setState({ key: requestKey, value: null, error: CONTENT_ERROR })
      }
    }

    void load()

    return () => controller.abort()
  }, [projectId, specId, key])

  const settled = settledFor(state, key)

  return {
    content: settled?.value ?? null,
    isLoading: key !== null && settled === null,
    error: settled?.error ?? null,
  }
}
