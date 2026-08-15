import { ImageResponse } from 'next/og'
import { FALLBACK } from '../../../src/data/content'
import { findProject, getContent } from '../../../src/data/server'
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

  return new ImageResponse(
    (
      <OgCard
        title={project.title}
        tagline={project.tagline}
        stack={project.stack}
        status={project.status}
        windowTitle={project.title}
      />
    ),
    size,
  )
}
