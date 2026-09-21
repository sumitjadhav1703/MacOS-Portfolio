'use client'

import { FALLBACK } from '../data/content'
import { useContent } from './content'
import { useIsClient, useOnline } from './useMedia'

/**
 * What is actually running behind this desktop.
 *
 * Five surfaces used to answer that question — the menu-bar status popover, Control Center,
 * Settings → About, the System Monitor and the Ask Sumit window — and three of them answered
 * it with a hardcoded sentence written before the backend existed. They said "no backend" and
 * "local keyword lookup, not a language model" while a Cloudflare Worker was serving the
 * content from D1 and R2 and a second Worker was answering questions on Workers AI.
 *
 * They all read this now. One truth, derived rather than typed, and it stays correct in both
 * directions: the standalone build still says so, because that is also true.
 *
 * Only *whether* the API is configured is ever reported, never its value. These panels are
 * public.
 */
const API = process.env.NEXT_PUBLIC_API_URL

/**
 * The model the AI Worker defaults to — `ai/src/config.py`'s `DEFAULT_MODEL`.
 *
 * A deploy can override it by setting `AI_MODEL` on the Worker without redeploying from
 * source, and the response carries no model field, so this is the configured default rather
 * than a reading of what actually answered. The panels word it that way.
 */
export const AI_MODEL = 'Llama 3.3 70B'

export type Runtime = {
  /** An API origin was compiled in. */
  configured: boolean
  /** The copy on screen came from the CMS, not from the bundle. */
  live: boolean
  online: boolean
  /** Long form, for a settings row. */
  data: string
  /** Short form, for a Control Center line. */
  dataShort: string
  /** Where the desktop itself is being served from. */
  host: string
  /** What answers in Ask Sumit. */
  assistant: string
  assistantShort: string
  /** One line naming the stack, for the places that have room for it. */
  backend: string
}

export function useRuntime(): Runtime {
  const content = useContent()
  const online = useOnline()
  const client = useIsClient()

  // FALLBACK carries the epoch as its `updatedAt` — the compiled-in copy was never edited by
  // anyone — so a timestamp that is not the epoch is a bundle that came from the CMS. This is
  // the same test the System Monitor used to make on its own.
  const live = Boolean(API) && content.updatedAt !== FALLBACK.updatedAt

  // `location` is a browser global, so it is read only once `useIsClient` says there is one.
  const local =
    client && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)

  return {
    configured: Boolean(API),
    live,
    online,
    data: live
      ? 'Live — Cloudflare Worker, D1 and R2'
      : API
        ? 'Bundled — the content API did not answer'
        : 'Bundled with the build — no API configured',
    dataShort: live ? 'Live' : 'Bundled',
    host: local ? 'Running locally' : 'Next.js, prerendered on Vercel',
    assistant: API
      ? `Workers AI — ${AI_MODEL} by default, grounded on the published portfolio`
      : 'Local keyword fallback — no model configured',
    assistantShort: API ? 'Workers AI' : 'Local fallback',
    backend: API
      ? 'Cloudflare Workers — D1, R2 and Workers AI'
      : 'None — this build is standalone',
  }
}
