'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { FALLBACK } from '../data/content'
import type { Content } from '../data/content'
import { registerTitles } from './registry'

/**
 * The desktop's content, from the CMS when it answers and from the compiled-in FALLBACK when it
 * does not.
 *
 * The first paint always uses FALLBACK — no boot sequence, window or animation ever waits on a
 * network round trip, and if the Worker is down or the API URL is unset the portfolio simply
 * renders what it shipped with. The swap happens in an effect, after mount, for the same reason
 * preferences do: the server prerender must match the first client render.
 */
const ContentContext = createContext<Content>(FALLBACK)

const API = process.env.NEXT_PUBLIC_API_URL

export function ContentProvider({ children, initial }: { children: ReactNode; initial?: Content }) {
  const [content, setContent] = useState<Content>(initial ?? FALLBACK)

  useEffect(() => {
    if (!API) return
    const abort = new AbortController()
    fetch(`${API}/api/content`, { signal: abort.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((live: Content) => {
        if (Array.isArray(live?.projects)) setContent(live)
      })
      .catch(() => {
        // Nothing to do: FALLBACK is already on screen and is a complete portfolio.
      })
    return () => abort.abort()
  }, [])

  // Window titles are read from a module-level registry by the chrome (title bars, dock menus,
  // Mission Control), which has no access to this context. Keeping it in step here means a
  // CMS-added project has a title everywhere without threading content through eight files.
  //
  // This runs during render, not in an effect: children render with the new project list in the
  // same pass, so there is never a frame where a project exists but its title does not.
  useMemo(() => registerTitles(content.projects), [content])

  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>
}

export const useContent = (): Content => useContext(ContentContext)

/** The published projects, memo-stable for the components that map over them. */
export function useProjects() {
  const content = useContent()
  return useMemo(() => content.projects, [content])
}
