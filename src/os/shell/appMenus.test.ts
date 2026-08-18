import { describe, expect, it } from 'vitest'
import { menusFor, type MenuCtx } from './appMenus'
import type { MenuEntry, WindowState } from '../types'

const WIN: WindowState = { x: 0, y: 0, w: 100, h: 100, max: false, min: false, z: 1, space: 1 }

function ctx(over: Partial<MenuCtx> = {}): MenuCtx {
  return {
    dispatch: () => {},
    openApp: () => {},
    front: null,
    wins: {},
    finderPath: '/',
    email: 'a@b.c',
    resumeUrl: '/resume.pdf',
    githubUrl: 'https://github.com/x',
    copy: () => {},
    ...over,
  }
}

const labels = (entries: MenuEntry[]) =>
  entries.flatMap((e) => ('divider' in e ? [] : [e.label]))

const named = (app: Parameters<typeof menusFor>[0], c: MenuCtx, name: string) =>
  menusFor(app, c).find((m) => m.name === name)!

describe('menusFor', () => {
  it('gives every app the same six menus', () => {
    for (const app of [null, 'terminal', 'code', 'project-anything'] as const) {
      expect(menusFor(app, ctx()).map((m) => m.name)).toEqual([
        'file',
        'edit',
        'view',
        'go',
        'window',
        'help',
      ])
    }
  })

  it('leaves an app with no commands of its own on the shared set', () => {
    // A project the CMS added after this build has no entry anywhere, and must still get menus.
    const base = menusFor(null, ctx())
    const project = menusFor('project-something-new', ctx())
    expect(project.map((m) => m.label)).toEqual(base.map((m) => m.label))
    // …but its File menu is its own: the page it has and the link to share.
    expect(labels(named('project-something-new', ctx(), 'file').entries)).toContain('Copy Share Link')
  })

  it('renames the File slot for the apps that have their own verbs', () => {
    expect(named('terminal', ctx(), 'file').label).toBe('Shell')
    expect(named('sumit-ai', ctx(), 'file').label).toBe('Chat')
    expect(named('finder', ctx(), 'file').label).toBe('File')
  })

  it('adds app commands above the shared ones rather than replacing them', () => {
    const shell = labels(named('terminal', ctx({ front: 'terminal' }), 'file').entries)
    expect(shell).toContain('Clear Screen')
    expect(shell).toContain('New Shell')

    const view = labels(named('code', ctx({ front: 'code' }), 'view').entries)
    expect(view).toContain('Next File')
    expect(view).toContain('Small Icons')
  })

  it('disables window commands when nothing is focused', () => {
    const closed = named(null, ctx(), 'window').entries
    const open = named('terminal', ctx({ front: 'terminal', wins: { terminal: WIN } }), 'window').entries
    const find = (entries: MenuEntry[], label: string) =>
      entries.find((e) => !('divider' in e) && e.label === label) as Exclude<MenuEntry, { divider: true }>

    expect(find(closed, 'Minimize').disabled).toBe(true)
    expect(find(closed, 'Bring All to Front').disabled).toBe(true)
    expect(find(open, 'Minimize').disabled).toBe(false)
    expect(labels(open)).toContain('✓ Shell')
  })

  it('disables an app command when that app is not the focused one', () => {
    const entries = named('code', ctx({ front: 'terminal' }), 'file').entries
    const copy = entries.find((e) => !('divider' in e) && e.label === 'Copy File Contents')
    expect(copy && !('divider' in copy) && copy.disabled).toBe(true)
  })

  it('every entry either divides or acts', () => {
    for (const app of [null, 'finder', 'terminal', 'code', 'sumit-ai', 'safari', 'resume', 'settings', 'monitor'] as const) {
      for (const menu of menusFor(app, ctx())) {
        for (const entry of menu.entries) {
          if ('divider' in entry) continue
          expect(entry.label.length).toBeGreaterThan(0)
          expect(typeof entry.onPick).toBe('function')
        }
      }
    }
  })
})
