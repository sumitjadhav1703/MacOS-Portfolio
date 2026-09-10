import { describe, expect, it } from 'vitest'
import { initialState, reducer } from './store'
import { isAppId, sizeOf } from './registry'

describe('power', () => {
  it('is on by default', () => {
    expect(initialState().power).toBe('on')
  })

  it('round-trips without disturbing the desktop behind the curtain', () => {
    const opened = reducer(initialState(), {
      type: 'open',
      app: 'terminal',
      viewport: { w: 1440, h: 900 },
    })
    const moved = reducer(opened, { type: 'space', index: 2 })

    const asleep = reducer(moved, { type: 'power', state: 'sleep' })
    expect(asleep.power).toBe('sleep')

    const awake = reducer(asleep, { type: 'power', state: 'on' })
    expect(awake.power).toBe('on')
    expect(awake.wins).toEqual(moved.wins)
    expect(awake.activeSpace).toBe(moved.activeSpace)
    expect(awake.active).toBe(moved.active)
  })

  it('closes the menu it was picked from', () => {
    const open = reducer(initialState(), { type: 'menu', name: 'apple' })
    expect(reducer(open, { type: 'power', state: 'shutdown' }).menu).toBeNull()
  })
})

describe('app ids that nobody registered', () => {
  // `v in TITLES` and `SIZE[v]` both answer for names inherited from Object.prototype, so
  // `open constructor` in the Shell used to pass isAppId, reach the reducer, and throw while
  // destructuring `Object.prototype.constructor` as a [width, height] pair — taking the whole
  // desktop down for an unauthenticated visitor.
  const PROTOTYPE_KEYS = ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty']

  for (const key of PROTOTYPE_KEYS) {
    it(`does not treat ${key} as an app`, () => {
      expect(isAppId(key)).toBe(false)
      expect(sizeOf(key)).toBeUndefined()
    })
  }

  it('still recognises the real apps and CMS project ids', () => {
    expect(isAppId('terminal')).toBe(true)
    expect(isAppId('project-anything-new')).toBe(true)
    expect(sizeOf('terminal')).toEqual([720, 440])
  })

  it('opens nothing when the Shell is asked for a prototype name', () => {
    for (const key of PROTOTYPE_KEYS) {
      const next = reducer(initialState(), {
        type: 'open',
        app: key as never,
        viewport: { w: 1440, h: 900 },
      })
      expect(Object.keys(next.wins)).not.toContain(key)
    }
  })
})
