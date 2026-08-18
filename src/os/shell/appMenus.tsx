import type { Dispatch } from 'react'
import { runCmd } from '../cmd'
import { titleOf } from '../registry'
import type { Action } from '../store'
import type { AppId, MenuEntry, MenuName, OsState, StaticAppId } from '../types'

/** One drop-down in the menu bar. */
export type BarMenu = { name: MenuName; label: string; width: number; entries: MenuEntry[] }

export type MenuCtx = {
  dispatch: Dispatch<Action>
  openApp: (id: AppId | 'finder-projects') => void
  /** The focused window, or null when the desktop itself has focus. */
  front: AppId | null
  wins: OsState['wins']
  finderPath: OsState['finderPath']
  email: string
  resumeUrl: string
  githubUrl: string
  copy: (text: string, what: string) => void
}

const divider: MenuEntry = { divider: true }

/** `front` is null whenever no window is focused, so window-scoped items grey out instead of lying. */
const onFront = (
  ctx: MenuCtx,
  label: string,
  action: (app: AppId) => Action,
  hint?: string,
): MenuEntry => ({
  label,
  hint,
  disabled: !ctx.front,
  onPick: () => ctx.front && ctx.dispatch(action(ctx.front)),
})

/** Send a command to the focused window; greyed out when it is not the app that answers it. */
const toApp = (ctx: MenuCtx, app: AppId, label: string, cmd: string, hint?: string): MenuEntry => ({
  label,
  hint,
  disabled: ctx.front !== app,
  onPick: () => runCmd(app, cmd),
})

const file = (ctx: MenuCtx, extra: MenuEntry[] = []): BarMenu => ({
  name: 'file',
  label: 'File',
  width: 220,
  entries: [
    ...extra,
    ...(extra.length ? [divider] : []),
    { label: 'New Workspace Window', onPick: () => ctx.openApp('finder') },
    { label: 'New Shell', onPick: () => ctx.openApp('terminal') },
    { label: 'Open Resume', onPick: () => ctx.openApp('resume') },
    divider,
    onFront(ctx, 'Close Window', (app) => ({ type: 'close', app }), '⌘W'),
  ],
})

const edit = (ctx: MenuCtx, extra: MenuEntry[] = []): BarMenu => ({
  name: 'edit',
  label: 'Edit',
  width: 220,
  entries: [
    ...extra,
    ...(extra.length ? [divider] : []),
    { label: 'Copy Email Address', onPick: () => ctx.copy(ctx.email, 'Email address') },
    { label: 'Copy GitHub URL', onPick: () => ctx.copy(ctx.githubUrl, 'GitHub URL') },
    divider,
    {
      label: 'Find…',
      hint: '⌘K',
      onPick: () => ctx.dispatch({ type: 'overlay', name: 'spotlight', on: true }),
    },
  ],
})

const view = (ctx: MenuCtx, extra: MenuEntry[] = []): BarMenu => ({
  name: 'view',
  label: 'View',
  width: 230,
  entries: [
    ...extra,
    ...(extra.length ? [divider] : []),
    { label: 'Small Icons', onPick: () => ctx.dispatch({ type: 'iconScale', scale: 0.85 }) },
    { label: 'Medium Icons', onPick: () => ctx.dispatch({ type: 'iconScale', scale: 1 }) },
    { label: 'Large Icons', onPick: () => ctx.dispatch({ type: 'iconScale', scale: 1.25 }) },
    divider,
    { label: 'Show / Hide Desktop Items', onPick: () => ctx.dispatch({ type: 'toggleDesktop' }) },
    { label: 'Show / Hide Dock', onPick: () => ctx.dispatch({ type: 'toggleDock' }) },
  ],
})

const go = (ctx: MenuCtx, extra: MenuEntry[] = []): BarMenu => ({
  name: 'go',
  label: 'Go',
  width: 220,
  entries: [
    ...extra,
    ...(extra.length ? [divider] : []),
    { label: 'Projects', onPick: () => ctx.openApp('finder-projects') },
    { label: 'Skills', onPick: () => ctx.openApp('skills') },
    { label: 'Experience', onPick: () => ctx.openApp('experience') },
    { label: 'Education', onPick: () => ctx.openApp('education') },
    { label: 'Certificates', onPick: () => ctx.openApp('certificates') },
    divider,
    { label: 'Reach Out', onPick: () => ctx.openApp('contact') },
  ],
})

const windowMenu = (ctx: MenuCtx): BarMenu => {
  const open = Object.keys(ctx.wins) as AppId[]
  return {
    name: 'window',
    label: 'Window',
    width: 250,
    entries: [
      onFront(ctx, 'Minimize', (app) => ({ type: 'minimize', app }), '⌘M'),
      onFront(ctx, 'Zoom', (app) => ({ type: 'toggleMax', app })),
      { label: 'Bring All to Front', disabled: !open.length, onPick: () => ctx.dispatch({ type: 'frontAll' }) },
      divider,
      { label: 'Minimize All', disabled: !open.length, onPick: () => ctx.dispatch({ type: 'minimizeAll' }) },
      { label: 'Close All Windows', disabled: !open.length, onPick: () => ctx.dispatch({ type: 'closeAll' }) },
      divider,
      { label: 'Mission Control', hint: 'F3', onPick: () => ctx.dispatch({ type: 'overlay', name: 'mission', on: true }) },
      divider,
      ...(open.length
        ? open.map(
            (id): MenuEntry => ({
              label: `${ctx.front === id ? '✓ ' : '   '}${titleOf(id)}`,
              onPick: () => ctx.openApp(id),
            }),
          )
        : [{ label: 'No open windows', disabled: true, onPick: () => {} } as MenuEntry]),
    ],
  }
}

const help = (ctx: MenuCtx): BarMenu => ({
  name: 'help',
  label: 'Help',
  width: 230,
  entries: [
    { label: 'About This Desktop', onPick: () => ctx.openApp('about') },
    { label: 'Keyboard Shortcuts', hint: '?', onPick: () => ctx.dispatch({ type: 'overlay', name: 'shortcuts', on: true }) },
    divider,
    { label: 'System Monitor', onPick: () => ctx.openApp('monitor') },
  ],
})

/**
 * The menus each app adds or replaces. Anything absent falls through to the shared set above,
 * which is why an app that has no commands of its own — About, Skills, a project window —
 * needs no entry here at all.
 *
 * Every item does something. A menu that only looks like a menu is worse than no menu: it
 * teaches the visitor that the chrome is a picture.
 */
const PER_APP: Partial<Record<StaticAppId, (ctx: MenuCtx) => BarMenu[]>> = {
  finder: (ctx) => [
    view(ctx, [
      { label: 'Workspace Root', onPick: () => ctx.dispatch({ type: 'finderPath', path: '/' }) },
      { label: 'Projects Folder', onPick: () => ctx.dispatch({ type: 'finderPath', path: 'projects' }) },
    ]),
  ],

  terminal: (ctx) => [
    {
      name: 'file',
      label: 'Shell',
      width: 220,
      entries: [
        toApp(ctx, 'terminal', 'Clear Screen', 'clear', '⌃L'),
        toApp(ctx, 'terminal', 'Run help', 'help'),
        toApp(ctx, 'terminal', 'Run neofetch', 'neofetch'),
        divider,
        { label: 'New Shell', onPick: () => ctx.openApp('terminal') },
        onFront(ctx, 'Close Window', (app) => ({ type: 'close', app }), '⌘W'),
      ],
    },
  ],

  code: (ctx) => [
    file(ctx, [toApp(ctx, 'code', 'Copy File Contents', 'copy', '⌘C')]),
    view(ctx, [
      toApp(ctx, 'code', 'Next File', 'next'),
      toApp(ctx, 'code', 'Previous File', 'prev'),
    ]),
  ],

  'sumit-ai': (ctx) => [
    {
      name: 'file',
      label: 'Chat',
      width: 230,
      entries: [
        toApp(ctx, 'sumit-ai', 'New Conversation', 'clear'),
        toApp(ctx, 'sumit-ai', 'Retry Last Question', 'retry'),
        divider,
        onFront(ctx, 'Close Window', (app) => ({ type: 'close', app }), '⌘W'),
      ],
    },
  ],

  safari: (ctx) => [
    go(ctx, [
      toApp(ctx, 'safari', 'Back', 'back'),
      toApp(ctx, 'safari', 'Forward', 'forward'),
      toApp(ctx, 'safari', 'Start Page', 'home'),
    ]),
  ],

  resume: (ctx) => [
    file(ctx, [
      { label: 'Open in New Tab', onPick: () => window.open(ctx.resumeUrl, '_blank', 'noopener') },
    ]),
  ],

  settings: (ctx) => [
    view(ctx, [
      toApp(ctx, 'settings', 'Overview', 'pane:overview'),
      toApp(ctx, 'settings', 'Appearance', 'pane:appearance'),
      toApp(ctx, 'settings', 'Performance', 'pane:performance'),
      toApp(ctx, 'settings', 'Accessibility', 'pane:accessibility'),
      toApp(ctx, 'settings', 'About', 'pane:about'),
    ]),
  ],

  monitor: (ctx) => [
    view(ctx, [
      { label: 'Open Workspace', onPick: () => ctx.openApp('finder-projects') },
      { label: 'Open Settings', onPick: () => ctx.openApp('settings') },
    ]),
  ],
}

/** A project window's own File menu: its page, and the link to share it. */
function projectMenus(ctx: MenuCtx, slug: string): BarMenu[] {
  const url = `/projects/${slug}`
  return [
    file(ctx, [
      { label: 'Open Project Page', onPick: () => window.open(url, '_blank', 'noopener') },
      {
        label: 'Copy Share Link',
        onPick: () => ctx.copy(new URL(url, window.location.origin).toString(), 'Project link'),
      },
    ]),
  ]
}

/**
 * The menu bar for the focused app.
 *
 * The shared set is the baseline; an app contributes replacements by menu `name`, so an app that
 * only cares about View keeps the File, Edit, Go, Window and Help every other app has.
 */
export function menusFor(app: AppId | null, ctx: MenuCtx): BarMenu[] {
  const base = [file(ctx), edit(ctx), view(ctx), go(ctx), windowMenu(ctx), help(ctx)]

  const overrides = app
    ? app.startsWith('project-')
      ? projectMenus(ctx, app.slice('project-'.length))
      : (PER_APP[app as StaticAppId]?.(ctx) ?? [])
    : []

  if (!overrides.length) return base
  const byName = new Map(overrides.map((menu) => [menu.name, menu]))
  return base.map((menu) => byName.get(menu.name) ?? menu)
}
