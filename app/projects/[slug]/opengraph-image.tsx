import { ImageResponse } from 'next/og'
import { PROJECTS, projectBySlug, slugOf } from '../../../src/data/projects'
import { OG_SIZE, OgCard } from '../../../src/og/card'

export const alt = 'Project card'
export const size = OG_SIZE
export const contentType = 'image/png'

/** Statically generated at build: one PNG per project, same list as the routes. */
export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: slugOf(project) }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = projectBySlug(slug)

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
