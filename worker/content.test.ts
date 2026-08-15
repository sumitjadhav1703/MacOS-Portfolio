import { describe, expect, it } from 'vitest'
import { buildContent, mapProject } from './content'
import type { ContentRows } from './content'

const ORIGIN = 'https://api.example.workers.dev'
const SITE = 'https://site.example.com'

const emptyRows: ContentRows = {
  site: null,
  os: null,
  projects: [],
  certificates: [],
  experience: [],
  education: [],
  skills: [],
  social: [],
}

describe('mapProject', () => {
  it('parses the JSON columns back into the shapes the desktop renders', () => {
    const project = mapProject(
      {
        id: 'project-demo',
        slug: 'demo',
        title: 'Demo',
        desktop_label: 'Demo',
        tagline: 'A demo',
        status_label: 'Live',
        status_ok: 1,
        stack: '["React","D1"]',
        sections: '[{"heading":"What","body":{"text":"Words"}}]',
        links: '[{"label":"Repo","url":"https://example.com"}]',
        aliases: '["dem"]',
        featured: 0,
      },
      ORIGIN,
    )

    expect(project.stack).toEqual(['React', 'D1'])
    expect(project.sections).toHaveLength(1)
    expect(project.links[0]?.url).toBe('https://example.com')
    expect(project.aliases).toEqual(['dem'])
    expect(project.status).toEqual({ label: 'Live', ok: true })
  })

  it('degrades to empty rather than throwing on a corrupt JSON cell', () => {
    const project = mapProject({ slug: 'x', title: 'X', stack: 'not json' }, ORIGIN)
    expect(project.stack).toEqual([])
    expect(project.id).toBe('project-x')
  })

  it('falls back to the title when no desktop label is set', () => {
    expect(mapProject({ slug: 'x', title: 'Long Title' }, ORIGIN).desktopLabel).toBe('Long Title')
  })

  it('turns an R2 key into a URL on this Worker, and leaves a missing one undefined', () => {
    expect(mapProject({ slug: 'x', title: 'X', cover_key: 'portfolio/projects/a.png' }, ORIGIN).coverUrl).toBe(
      `${ORIGIN}/files/portfolio/projects/a.png`,
    )
    expect(mapProject({ slug: 'x', title: 'X' }, ORIGIN).coverUrl).toBeUndefined()
  })
})

describe('buildContent', () => {
  it('produces every key the desktop reads, even from an empty database', () => {
    const content = buildContent(emptyRows, ORIGIN, SITE)
    expect(Object.keys(content).sort()).toEqual(
      [
        'certificates',
        'education',
        'experience',
        'os',
        'projects',
        'site',
        'skills',
        'socialLinks',
        'updatedAt',
      ].sort(),
    )
    expect(content.os.kb).toEqual([])
  })

  it('serves the packaged resume until one is uploaded, then the R2 copy', () => {
    expect(buildContent(emptyRows, ORIGIN, SITE).site.resumeUrl).toBe(
      `${SITE}/Sumit_Jadhav_Resume.pdf`,
    )
    expect(
      buildContent(
        { ...emptyRows, site: { resume_key: 'portfolio/resume/cv.pdf' } },
        ORIGIN,
        SITE,
      ).site.resumeUrl,
    ).toBe(`${ORIGIN}/files/portfolio/resume/cv.pdf`)
  })

  it('reports the newest timestamp across every table', () => {
    const content = buildContent(
      {
        ...emptyRows,
        site: { updated_at: '2026-01-01T00:00:00.000Z' },
        projects: [{ slug: 'a', title: 'A', updated_at: '2026-06-01T00:00:00.000Z' }],
      },
      ORIGIN,
      SITE,
    )
    expect(content.updatedAt).toBe('2026-06-01T00:00:00.000Z')
  })
})
