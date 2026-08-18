import { describe, expect, it } from 'vitest'
import { initialState, reducer } from './store'

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
