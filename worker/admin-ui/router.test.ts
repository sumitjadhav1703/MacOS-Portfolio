import { describe, expect, it } from 'vitest'
import { HOME, hashFor, parseHash, sameRoute } from './router'

describe('parseHash', () => {
  it('reads a section and the item it is editing', () => {
    expect(parseHash('#/projects/project-demo')).toEqual({ page: 'projects', id: 'project-demo' })
    expect(parseHash('#/projects')).toEqual({ page: 'projects' })
  })

  it('falls home for an empty or malformed hash rather than showing nothing', () => {
    expect(parseHash('')).toEqual(HOME)
    expect(parseHash('#')).toEqual(HOME)
    expect(parseHash('#/')).toEqual(HOME)
    expect(parseHash('#///')).toEqual(HOME)
  })

  it('round-trips an id that needs escaping', () => {
    const route = { page: 'certificates', id: 'a b/c' }
    expect(parseHash(hashFor(route))).toEqual(route)
  })
})

describe('hashFor', () => {
  it('writes the same shape parseHash reads', () => {
    expect(hashFor({ page: 'assets' })).toBe('#/assets')
    expect(hashFor({ page: 'projects', id: 'project-demo' })).toBe('#/projects/project-demo')
  })
})

describe('sameRoute', () => {
  it('separates a list from an item inside it', () => {
    expect(sameRoute({ page: 'projects' }, { page: 'projects' })).toBe(true)
    expect(sameRoute({ page: 'projects' }, { page: 'projects', id: 'x' })).toBe(false)
  })
})
