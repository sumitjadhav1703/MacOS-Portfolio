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

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = findProject(await getContent(), slug)

  if (!project) {
    return new ImageResponse(
      <OgCard title="Portfolio OS" tagline="Sumit Jadhav — AI & Data Science" />,
      size,
    )
  }

  const hosts = [...new Set(project.links.map((link) => hostLabel(link.url)).filter(Boolean))]

  return new ImageResponse(
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
