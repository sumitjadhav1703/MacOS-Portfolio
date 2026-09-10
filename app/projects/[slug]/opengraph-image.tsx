import { ImageResponse } from 'next/og'
import { FALLBACK } from '../../../src/data/content'
import { findProject, getContent } from '../../../src/data/server'
import { hostLabel } from '../../../src/lib/icons'
import { OG_SIZE, OgCard } from '../../../src/og/card'

export const alt = 'Project card'
export const size = OG_SIZE
export const contentType = 'image/png'

/** Prerendered for the shipped projects; CMS-added ones render on first request. */
export function generateStaticParams() {
  return FALLBACK.projects.map((project) => ({ slug: project.slug }))
}

/** The card shown when there is no project, or when the real one could not be drawn. */
const generic = () =>
  new ImageResponse(<OgCard title="Portfolio OS" tagline="Sumit Jadhav — AI & Data Science" />, size)

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = findProject(await getContent(), slug)

  if (!project) return generic()

  const hosts = [...new Set(project.links.map((link) => hostLabel(link.url)).filter(Boolean))]

  // Satori draws with the font next/og bundles, and that font cannot shape every script the CMS
  // will accept: an Arabic title throws `lookupType: 5 - substFormat: 3 is not yet supported`
  // out of the font parser, which answered the request with a 500 and no card at all. The
  // fallback the missing-project branch already uses is the right answer here too — a project
  // whose title cannot be rendered still deserves a card.
  try {
    const rendered = new ImageResponse(
      (
        <OgCard
          title={project.title}
          tagline={project.tagline}
          stack={project.stack}
          status={project.status}
          windowTitle={project.title}
          hosts={hosts}
          coverUrl={await reachable(project.coverUrl)}
        />
      ),
      size,
    )
    // Draining the body here is the whole point. Satori draws while the response streams, so a
    // title it cannot shape throws *after* the ImageResponse object already exists — a try
    // around the constructor alone catches nothing and the request still 500s. Awaiting the
    // bytes is what makes the failure catchable. One card is ~60 kB, and this runs on a render,
    // not on a cache hit.
    const png = await rendered.arrayBuffer()
    return new Response(png, { headers: { 'Content-Type': contentType } })
  } catch (error) {
    console.error('og.render_failed', { slug, message: String(error) })
    return generic()
  }
}

/**
 * Satori fetches the cover while streaming the PNG, where a failure can no longer be caught —
 * so the reachability question is settled first. A cover missing from R2 costs the project its
 * image, never its card.
 */
async function reachable(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined
  try {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) })
    return response.ok ? url : undefined
  } catch {
    return undefined
  }
}
