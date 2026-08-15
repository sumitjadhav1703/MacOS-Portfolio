import { FALLBACK } from './content'
import type { Content, Project } from './content'

/**
 * Content for server components — the project routes and their OG images.
 *
 * Revalidated rather than fetched per request, so a page view costs the Worker nothing most of
 * the time, and any failure (no API configured, Worker down, malformed body) falls back to the
 * compiled-in content instead of failing the render. That is what keeps `/projects/<slug>`
 * serving even when the CMS is unreachable.
 */
export async function getContent(): Promise<Content> {
  const api = process.env.NEXT_PUBLIC_API_URL
  if (!api) return FALLBACK

  try {
    const response = await fetch(`${api}/api/content`, { next: { revalidate: 60 } })
    if (!response.ok) return FALLBACK
    const live = (await response.json()) as Content
    return Array.isArray(live?.projects) && live.projects.length ? live : FALLBACK
  } catch {
    return FALLBACK
  }
}

export const findProject = (content: Content, slug: string): Project | undefined =>
  content.projects.find((project) => project.slug === slug)

/** The one-line description used for a project's meta and OG card. */
export const summaryOf = (project: Project): string =>
  `${project.tagline} · ${project.stack.slice(0, 4).join(', ')}`
