import { describe, expect, it } from 'vitest'
import { PROJECTS, projectBySlug, slugOf, summaryOf } from './projects'

describe('project slugs', () => {
  it('are unique and round-trip through projectBySlug', () => {
    const slugs = PROJECTS.map(slugOf)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const project of PROJECTS) {
      expect(projectBySlug(slugOf(project))).toBe(project)
    }
  })

  it('are URL-safe', () => {
    for (const slug of PROJECTS.map(slugOf)) {
      expect(slug).toMatch(/^[a-z0-9-]+$/)
      expect(encodeURIComponent(slug)).toBe(slug)
    }
  })

  it('produce a non-empty OG description', () => {
    for (const project of PROJECTS) {
      const summary = summaryOf(project)
      expect(summary.length).toBeGreaterThan(10)
      expect(summary.length).toBeLessThan(200)
    }
  })
})
