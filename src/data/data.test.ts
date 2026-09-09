import { describe, expect, it } from 'vitest'
import { PROJECTS } from './projects'
import { PROFILE_LINKS } from './profile'
import { FALLBACK, mergeContent } from './content'

describe('project data', () => {
  it('has unique ids', () => {
    const ids = PROJECTS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has renderable content on every project', () => {
    for (const project of PROJECTS) {
      expect(project.title.length, project.id).toBeGreaterThan(0)
      expect(project.tagline.length, project.id).toBeGreaterThan(0)
      expect(project.sections.length, project.id).toBeGreaterThan(0)
      expect(project.stack.length, project.id).toBeGreaterThan(0)
    }
  })

  it('only ships links that parse as URLs', () => {
    for (const link of PROJECTS.flatMap((p) => p.links)) {
      expect(() => new URL(link.url), link.url).not.toThrow()
      expect(link.label.length).toBeGreaterThan(0)
    }
  })
})

describe('profile links', () => {
  it('all parse as URLs', () => {
    for (const link of PROFILE_LINKS) {
      expect(() => new URL(link.url), link.url).not.toThrow()
    }
  })
})

describe('mergeContent', () => {
  // The old rule was one question — is `projects` a non-empty array — and the whole body was
  // taken or dropped on the answer. A bundle carrying only `projects` therefore reached the
  // render with no `socialLinks`, and the menu bar died on `content.socialLinks.find`. Every
  // category now falls back on its own, because FALLBACK is a complete portfolio.
  const live = {
    projects: [{ ...FALLBACK.projects[0]!, id: 'project-live', slug: 'live', title: 'Live' }],
  }

  it('takes the CMS projects and keeps every other category', () => {
    const merged = mergeContent(live)
    expect(merged.projects.map((p) => p.id)).toEqual(['project-live'])
    expect(merged.socialLinks).toBe(FALLBACK.socialLinks)
    expect(merged.skills).toBe(FALLBACK.skills)
    expect(merged.site).toEqual(FALLBACK.site)
    expect(merged.os).toEqual(FALLBACK.os)
  })

  it('keeps the shipped projects when the CMS sends none', () => {
    expect(mergeContent({ projects: [] }).projects).toBe(FALLBACK.projects)
    expect(mergeContent({}).projects).toBe(FALLBACK.projects)
  })

  it('refuses a projects array with a hole in it', () => {
    // One null entry used to reach the desktop and throw on `project.id`.
    expect(mergeContent({ projects: [null] as never }).projects).toBe(FALLBACK.projects)
    expect(mergeContent({ projects: [live.projects[0]!, null as never] }).projects).toBe(
      FALLBACK.projects,
    )
  })

  it('ignores a category that is not the shape the desktop reads', () => {
    const merged = mergeContent({ ...live, skills: 'nope' as never, socialLinks: [1, 2] as never })
    expect(merged.skills).toBe(FALLBACK.skills)
    expect(merged.socialLinks).toBe(FALLBACK.socialLinks)
  })

  it('accepts an empty list for the categories where empty is a real answer', () => {
    expect(mergeContent({ ...live, certificates: [] }).certificates).toEqual([])
  })

  it('falls back completely on a body that is not an object', () => {
    for (const junk of [null, undefined, 'nope' as never, 42 as never]) {
      expect(mergeContent(junk)).toBe(FALLBACK)
    }
  })

  it('fills in a half-written site row rather than dropping the rest', () => {
    const merged = mergeContent({ ...live, site: { name: 'New Name' } as never })
    expect(merged.site.name).toBe('New Name')
    expect(merged.site.email).toBe(FALLBACK.site.email)
  })
})
