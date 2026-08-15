import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PROJECTS, projectBySlug, slugOf, summaryOf } from '../../../src/data/projects'
import { DesktopRoot } from '../../../src/os/DesktopRoot'
import type { AppId } from '../../../src/os/types'

type Params = { params: Promise<{ slug: string }> }

/** One route per entry in PROJECTS — a new project needs no other change. */
export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: slugOf(project) }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const project = projectBySlug(slug)
  if (!project) return {}

  const description = summaryOf(project)
  const url = `/projects/${slug}`

  return {
    title: project.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: `${project.title} — Sumit Jadhav`,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${project.title} — Sumit Jadhav`,
      description,
    },
  }
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params
  const project = projectBySlug(slug)
  if (!project) notFound()

  return <DesktopRoot initialApp={project.id as AppId} />
}
