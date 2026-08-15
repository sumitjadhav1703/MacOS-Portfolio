import { describe, expect, it } from 'vitest'
import { PROJECTS } from './projects'
import { PROFILE_LINKS } from './profile'

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
