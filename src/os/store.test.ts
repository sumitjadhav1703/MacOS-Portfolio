import { describe, expect, it } from 'vitest'
import { DOCK_H, MENUBAR_H } from './metrics'
import { initialState, reducer, snapBox } from './store'
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

describe('window geometry', () => {
  const VIEWPORT = { w: 1440, h: 900 }
  const open = (app: 'terminal' | 'safari' = 'terminal', viewport = VIEWPORT) =>
    reducer(initialState(), { type: 'open', app, viewport })

  it('tiles above the dock, not under it', () => {
    const state = open()
    const tiled = reducer(state, { type: 'snap', app: 'terminal', zone: 'left', viewport: VIEWPORT })
    const win = tiled.wins.terminal!

    expect(win.y).toBe(MENUBAR_H)
    // The dock is the bottom band; a tiled window that runs under it cannot be reached
    // there, and the dock paints over it.
    expect(win.y + win.h).toBe(VIEWPORT.h - DOCK_H)
    expect(win.snapped).toBe('left')
  })

  it('gives the tiled window the whole desk once the dock is hidden', () => {
    const hidden = reducer(open(), { type: 'toggleDock' })
    const tiled = reducer(hidden, { type: 'snap', app: 'terminal', zone: 'left', viewport: VIEWPORT })
    expect(tiled.wins.terminal!.h).toBe(VIEWPORT.h - MENUBAR_H)
  })

  it('draws the preview where the window lands', () => {
    const tiled = reducer(open(), {
      type: 'snap',
      app: 'terminal',
      zone: 'bottom-right',
      viewport: VIEWPORT,
    })
    const win = tiled.wins.terminal!
    // WindowManager renders snapBox() directly; the two used to be separate arithmetic and
    // disagreed about the half-height.
    expect(snapBox('bottom-right', VIEWPORT, true)).toEqual({
      x: win.x,
      y: win.y,
      w: win.w,
      h: win.h,
    })
  })

  it('clamps a window that is wider than the viewport it opens in', () => {
    // Safari's default is 900 wide; the 768-900px band is narrower than that.
    const narrow = { w: 820, h: 700 }
    const win = open('safari', narrow).wins.safari!
    expect(win.w).toBeLessThanOrEqual(narrow.w)
    expect(win.x + win.w).toBeLessThanOrEqual(narrow.w)
    expect(win.y).toBeGreaterThanOrEqual(MENUBAR_H)
  })

  it('pulls windows back on to a viewport that shrank', () => {
    const wide = reducer(initialState(), {
      type: 'open',
      app: 'safari',
      viewport: { w: 1920, h: 1080 },
    })
    const shrunk = reducer(wide, { type: 'clampAll', viewport: { w: 700, h: 600 } })
    const win = shrunk.wins.safari!

    expect(win.w).toBeLessThanOrEqual(700)
    expect(win.x).toBeLessThanOrEqual(700 - 120)
    expect(win.y).toBeLessThanOrEqual(600 - 60)
  })

  it('re-tiles a snapped window rather than leaving stale pixels', () => {
    const tiled = reducer(open(), { type: 'snap', app: 'terminal', zone: 'right', viewport: VIEWPORT })
    const next = { w: 1000, h: 800 }
    const resized = reducer(tiled, { type: 'clampAll', viewport: next })
    expect(resized.wins.terminal).toEqual({
      ...tiled.wins.terminal,
      ...snapBox('right', next, true),
    })
  })
})

describe('the two top-right panels', () => {
  it('are mutually exclusive, as they are on macOS', () => {
    const cc = reducer(initialState(), { type: 'overlay', name: 'controlCenter', on: true })
    expect(cc.controlCenter).toBe(true)

    const notif = reducer(cc, { type: 'overlay', name: 'notifCenter', on: true })
    expect(notif.notifCenter).toBe(true)
    expect(notif.controlCenter).toBe(false)

    const back = reducer(notif, { type: 'overlay', name: 'controlCenter', on: true })
    expect(back.controlCenter).toBe(true)
    expect(back.notifCenter).toBe(false)
  })
})
