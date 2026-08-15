import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FALLBACK } from '../../../src/data/content'
import { findProject, getContent, summaryOf } from '../../../src/data/server'
import { DesktopRoot } from '../../../src/os/DesktopRoot'
import type { AppId } from '../../../src/os/types'

type Params = { params: Promise<{ slug: string }> }

/**
 * The routes prerendered at build time are the projects the site ships with, so the build never
 * depends on the CMS being reachable. `dynamicParams` (on by default) means a project added
 * through the admin is rendered on demand instead of 404ing until the next deploy.
 */
export function generateStaticParams() {
  return FALLBACK.projects.map((project) => ({ slug: project.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const project = findProject(await getContent(), slug)
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
  const content = await getContent()
  const project = findProject(content, slug)
  if (!project) notFound()

  // The content fetched here is handed to the client tree as its initial value, so the deep
  // link paints the right project on the first frame rather than after a client fetch.
  return <DesktopRoot initialApp={project.id as AppId} content={content} />
}
