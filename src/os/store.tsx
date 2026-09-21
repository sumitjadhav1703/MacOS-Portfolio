'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react'
import { DOCK_H, MENUBAR_H } from './metrics'
import { DEFAULT_SIZE, DOCK_FOR, isAppId, sizeOf, titleOf } from './registry'
import { PACKS } from './packs'
import type {
  ActivityState,
  AppId,
  ContextMenuState,
  FolderTint,
  MenuName,
  OsState,
  PopoverName,
  PowerState,
  Prefs,
  SnapZone,
  WindowState,
} from './types'

const LS = 'sumit-os-prefs'
const WALLPAPER_KEY = 'sumit-os-wallpaper'

const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  pack: 'graphite',
  dockStyle: 'glass',
  folderTint: {},
  dockLabels: true,
  reduceMotion: null,
  opaque: false,
  contrast: false,
  lowPower: false,
  bright: 100,
  showStatus: true,
  showActivity: true,
  wins: {},
}

/**
 * Saved state is read after mount, never during render: the first paint has to match what
 * the server prerendered, and localStorage does not exist there.
 */
function loadPrefs(): Prefs {
  try {
    const saved = JSON.parse(localStorage.getItem(LS) || '{}') as Partial<Prefs>
    return { ...DEFAULT_PREFS, ...saved }
  } catch {
    return DEFAULT_PREFS
  }
}

/**
 * No image by default: the desk is the active theme pack's own gradient, so switching pack or
 * appearance actually changes the desktop. A packaged photograph sat on top of all three packs
 * and made them invisible. The visitor can still drop one in from the desktop picker, and Reset
 * puts the pack back.
 */
export const DEFAULT_WALLPAPER: string | null = null

function loadWallpaper(): string | null {
  try {
    return localStorage.getItem(WALLPAPER_KEY) ?? DEFAULT_WALLPAPER
  } catch {
    return DEFAULT_WALLPAPER
  }
}

export type Action =
  | { type: 'hydrate'; prefs: Prefs; wallpaper: string | null }
  | { type: 'open'; app: AppId; sub?: OsState['finderPath']; viewport?: { w: number; h: number } }
  | { type: 'focus'; app: AppId }
  | { type: 'close'; app: AppId }
  | { type: 'minimize'; app: AppId }
  | { type: 'toggleMax'; app: AppId }
  | { type: 'geometry'; app: AppId; geom: Partial<Pick<WindowState, 'x' | 'y' | 'w' | 'h'>> }
  | { type: 'finderPath'; path: OsState['finderPath'] }
  | { type: 'prefs'; patch: Partial<Prefs> }
  | { type: 'folderTint'; app: AppId; tint: FolderTint }
  | { type: 'notify'; title: string; msg: string; quiet?: boolean }
  | { type: 'dismissNotif'; id: number }
  | { type: 'status'; status: string }
  | { type: 'activity'; activity: ActivityState; task?: string }
  | {
      type: 'overlay'
      name: 'spotlight' | 'shortcuts' | 'mission' | 'controlCenter' | 'launchpad' | 'notifCenter'
      on?: boolean
    }
  | { type: 'contextMenu'; menu: ContextMenuState }
  | { type: 'snap'; app: AppId; zone: SnapZone; viewport: { w: number; h: number } }
  | { type: 'space'; index: number }
  | { type: 'addSpace' }
  | { type: 'moveToSpace'; app: AppId; space: number }
  | { type: 'deskSelect'; app: AppId | null }
  | { type: 'popover'; name: PopoverName }
  | { type: 'menu'; name: MenuName }
  | { type: 'booted' }
  | { type: 'power'; state: PowerState }
  | { type: 'wallpaper'; url: string | null }
  | { type: 'closeTransient' }
  | { type: 'iconScale'; scale: number }
  | { type: 'toggleDesktop' }
  | { type: 'toggleDock'; viewport: { w: number; h: number } }
  | { type: 'closeAll' }
  | { type: 'minimizeAll' }
  | { type: 'frontAll' }
  | { type: 'clampAll'; viewport: { w: number; h: number } }

// Notifications are keyed by a monotonic counter: several can land in the same millisecond.
let nextNotifId = 1

function topmost(wins: OsState['wins'], skipMinimised: boolean): AppId | null {
  const open = (Object.keys(wins) as AppId[]).filter((k) => !skipMinimised || !wins[k]?.min)
  if (!open.length) return null
  return open.reduce((a, b) => ((wins[a]?.z ?? 0) > (wins[b]?.z ?? 0) ? a : b))
}

/**
 * Where a tiled window lands.
 *
 * Exported because the drop preview has to draw the same rectangle: it used to recompute
 * the boxes in CSS percentages with its own half-height fudge, so the plate and the window
 * that landed in it did not agree. The dock is subtracted when it is showing — macOS tiles
 * above the dock, and a window that runs under it is unreachable at the bottom edge.
 */
export function snapBox(
  zone: SnapZone,
  viewport: { w: number; h: number },
  dockVisible: boolean,
): { x: number; y: number; w: number; h: number } {
  const { w: vw, h: vh } = viewport
  const half = Math.round(vw / 2)
  const top = MENUBAR_H
  const full = vh - MENUBAR_H - (dockVisible ? DOCK_H : 0)
  const halfH = Math.round(full / 2)
  return {
    left: { x: 0, y: top, w: half, h: full },
    right: { x: half, y: top, w: vw - half, h: full },
    top: { x: 0, y: top, w: vw, h: full },
    'top-left': { x: 0, y: top, w: half, h: halfH },
    'top-right': { x: half, y: top, w: vw - half, h: halfH },
    'bottom-left': { x: 0, y: top + halfH, w: half, h: full - halfH },
    'bottom-right': { x: half, y: top + halfH, w: vw - half, h: full - halfH },
  }[zone]
}

type Box = { x: number; y: number; w: number; h: number }

/** Pull one rectangle back inside a viewport, keeping at least a grabbable strip on screen. */
function clampBox(box: Box, viewport: { w: number; h: number }): Box {
  const w = Math.min(box.w, viewport.w)
  const h = Math.min(box.h, viewport.h - MENUBAR_H)
  const x = Math.min(Math.max(box.x, 8 - w + 120), viewport.w - 120)
  const y = Math.min(Math.max(box.y, MENUBAR_H), viewport.h - 60)
  return box.w === w && box.h === h && box.x === x && box.y === y ? box : { x, y, w, h }
}

/**
 * Pull one window back inside a viewport — including the geometry it will restore to.
 *
 * `restore` holds where a snapped or maximised window goes when it is un-snapped. Clamping
 * only the visible rectangle left that field at coordinates from the larger viewport, so the
 * window came back on screen and then jumped off it again on the next un-snap.
 */
function clampWindow(win: WindowState, viewport: { w: number; h: number }): WindowState {
  const box = clampBox(win, viewport)
  const restore = win.restore ? clampBox(win.restore, viewport) : undefined
  if (box === (win as Box) && restore === win.restore) return win
  return { ...win, ...box, restore }
}

export function reducer(state: OsState, action: Action): OsState {
  switch (action.type) {
    case 'hydrate':
      return { ...state, prefs: action.prefs, wallpaper: action.wallpaper }

    case 'open': {
      const app = action.app
      // Shape, not registry: a project the CMS added is openable before its title has loaded.
      if (!isAppId(app)) return state
      const finderPath = app === 'finder' && action.sub ? action.sub : state.finderPath
      const z = state.z + 1
      const existing = state.wins[app]

      if (existing) {
        return {
          ...state,
          finderPath,
          z,
          active: app,
          // Launching an app that lives on another Space switches to it, as macOS does.
          activeSpace: existing.space,
          wins: { ...state.wins, [app]: { ...existing, min: false, z } },
        }
      }

      // Cascade new windows the way the original did, clamped to the viewport.
      const n = Object.keys(state.wins).length
      const [dw, dh] = sizeOf(app) ?? DEFAULT_SIZE
      const saved: Partial<{ x: number; y: number; w: number; h: number }> =
        state.prefs.wins[app] ?? {}
      // Viewport comes in with the action: the reducer also runs on the server.
      const view = action.viewport ?? { w: 1440, h: 900 }
      // Size is clamped as well as position. A window sized on a large display used to
      // reopen wider than the viewport it was reopened in, and several defaults are wider
      // than the 768-900px band on their own.
      const w = Math.min(saved.w ?? dw, view.w - 16)
      const h = Math.min(saved.h ?? dh, view.h - MENUBAR_H - 16)
      const x = Math.max(8, Math.min(saved.x ?? 90 + n * 26, view.w - w - 8))
      const y = Math.max(MENUBAR_H + 6, Math.min(saved.y ?? 66 + n * 22, view.h - 120))

      return {
        ...state,
        finderPath,
        z,
        active: app,
        wins: {
          ...state.wins,
          [app]: { x, y, w, h, max: false, min: false, z, space: state.activeSpace },
        },
      }
    }

    case 'focus': {
      const win = state.wins[action.app]
      if (!win || state.active === action.app) return state
      const z = state.z + 1
      return {
        ...state,
        z,
        active: action.app,
        wins: { ...state.wins, [action.app]: { ...win, z } },
      }
    }

    case 'close': {
      const wins = { ...state.wins }
      delete wins[action.app]
      return { ...state, wins, active: topmost(wins, false) }
    }

    case 'minimize': {
      const win = state.wins[action.app]
      if (!win) return state
      const wins = { ...state.wins, [action.app]: { ...win, min: true } }
      return { ...state, wins, active: topmost(wins, true) }
    }

    case 'toggleMax': {
      const win = state.wins[action.app]
      if (!win) return state
      const next: WindowState = win.max
        ? { ...win, max: false, ...win.restore, restore: undefined, snapped: undefined }
        : win.snapped
          ? { ...win, ...win.restore, restore: undefined, snapped: undefined }
          : { ...win, max: true, restore: { x: win.x, y: win.y, w: win.w, h: win.h } }
      return { ...state, wins: { ...state.wins, [action.app]: next } }
    }

    case 'geometry': {
      const win = state.wins[action.app]
      if (!win) return state
      const next = { ...win, ...action.geom }
      return {
        ...state,
        wins: { ...state.wins, [action.app]: next },
        prefs: {
          ...state.prefs,
          wins: {
            ...state.prefs.wins,
            [action.app]: { x: next.x, y: next.y, w: next.w, h: next.h },
          },
        },
      }
    }

    case 'finderPath':
      return { ...state, finderPath: action.path }

    case 'deskSelect':
      return { ...state, deskSelection: action.app }

    case 'prefs': {
      const prefs = { ...state.prefs, ...action.patch }
      // Switching pack pulls its preferred appearance with it, as in the original.
      if (action.patch.pack && !('theme' in action.patch)) {
        prefs.theme = PACKS[action.patch.pack].prefers
      }
      return { ...state, prefs }
    }

    case 'folderTint':
      return {
        ...state,
        prefs: {
          ...state.prefs,
          folderTint: { ...state.prefs.folderTint, [action.app]: action.tint },
        },
      }

    case 'notify': {
      const note = {
        id: nextNotifId++,
        title: action.title,
        msg: action.msg,
        at: new Date(),
        quiet: action.quiet,
      }
      return { ...state, notifications: [note, ...state.notifications].slice(0, 4) }
    }

    case 'dismissNotif':
      return { ...state, notifications: state.notifications.filter((n) => n.id !== action.id) }

    case 'status':
      return { ...state, status: action.status }

    case 'activity':
      return { ...state, activity: action.activity, task: action.task ?? state.task }

    case 'overlay': {
      const on = action.on ?? !state[action.name]
      // Only one full-screen overlay at a time.
      // The two top-right panels overlap each other, so they are exclusive too — macOS
      // never shows Control Center and Notification Center at once.
      const cleared =
        action.name === 'controlCenter'
          ? { notifCenter: false }
          : action.name === 'notifCenter'
            ? { controlCenter: false }
            : { spotlight: false, shortcuts: false, mission: false, launchpad: false }
      return {
        ...state,
        ...cleared,
        [action.name]: on,
        menu: null,
        popover: null,
        contextMenu: null,
      }
    }

    case 'popover': {
      // A menu extra toggles: clicking the one already showing puts it away, the way the app
      // menus on the left have always worked. This used to be a plain assignment, so a second
      // click was a no-op and the only way out was the desk or Escape. Opening one also closes
      // the two top-right panels, which it would otherwise paint on top of.
      const open = state.popover === action.name ? null : action.name
      return { ...state, popover: open, menu: null, controlCenter: false, notifCenter: false }
    }

    case 'menu':
      return { ...state, menu: action.name, popover: null }

    case 'booted':
      return { ...state, booted: true }

    // Power is a curtain over the desktop, not a teardown of it: windows, Spaces and
    // preferences survive a sleep or a restart exactly as they were.
    case 'power':
      return { ...state, power: action.state, menu: null, popover: null }

    case 'wallpaper':
      return { ...state, wallpaper: action.url }

    case 'iconScale':
      return { ...state, iconScale: action.scale }

    case 'toggleDesktop':
      return { ...state, desktopHidden: !state.desktopHidden }

    // Showing the dock raises the floor by DOCK_H, hiding it drops the floor back down, and a
    // window tiled under the old floor keeps a rectangle that no longer means anything: the
    // dock covers its bottom 82px, or it leaves a strip of bare desk. Re-tile with the flag.
    case 'toggleDock': {
      const dockVisible = state.dockHidden
      const wins = { ...state.wins }
      for (const key of Object.keys(wins) as AppId[]) {
        const win = wins[key]!
        if (win.snapped) wins[key] = { ...win, ...snapBox(win.snapped, action.viewport, dockVisible) }
      }
      return { ...state, dockHidden: !state.dockHidden, wins }
    }

    case 'closeAll':
      return { ...state, wins: {}, active: null }

    case 'minimizeAll': {
      const wins = { ...state.wins }
      for (const key of Object.keys(wins) as AppId[]) wins[key] = { ...wins[key]!, min: true }
      return { ...state, wins, active: null }
    }

    case 'frontAll': {
      const wins = { ...state.wins }
      for (const key of Object.keys(wins) as AppId[]) wins[key] = { ...wins[key]!, min: false }
      return { ...state, wins, active: topmost(wins, true) }
    }

    // Fired on a browser resize. Tiled windows hold absolute pixels and go stale the moment
    // the viewport changes; free ones can end up entirely off screen with no way back.
    case 'clampAll': {
      const wins = { ...state.wins }
      let changed = false
      for (const key of Object.keys(wins) as AppId[]) {
        const win = wins[key]!
        // A snapped window's visible rectangle is recomputed, never clamped — but `restore`
        // is free geometry either way, and leaving it at the old viewport's coordinates sent
        // the window straight back off screen the moment it was un-snapped.
        const next = win.snapped
          ? {
              ...win,
              ...snapBox(win.snapped, action.viewport, !state.dockHidden),
              restore: win.restore ? clampBox(win.restore, action.viewport) : undefined,
            }
          : clampWindow(win, action.viewport)
        if (next !== win) {
          wins[key] = next
          changed = true
        }
      }
      return changed ? { ...state, wins } : state
    }

    case 'contextMenu':
      return { ...state, contextMenu: action.menu }

    case 'snap': {
      const win = state.wins[action.app]
      if (!win) return state
      const box = snapBox(action.zone, action.viewport, !state.dockHidden)

      return {
        ...state,
        wins: {
          ...state.wins,
          [action.app]: {
            ...win,
            ...box,
            max: false,
            snapped: action.zone,
            restore: win.restore ?? { x: win.x, y: win.y, w: win.w, h: win.h },
          },
        },
      }
    }

    case 'space':
      return {
        ...state,
        activeSpace: Math.min(Math.max(1, action.index), state.spaces),
        mission: false,
      }

    case 'addSpace':
      return { ...state, spaces: state.spaces + 1, activeSpace: state.spaces + 1 }

    case 'moveToSpace': {
      const win = state.wins[action.app]
      if (!win) return state
      return {
        ...state,
        wins: { ...state.wins, [action.app]: { ...win, space: action.space } },
      }
    }

    case 'closeTransient':
      return {
        ...state,
        menu: null,
        popover: null,
        // A click on the desk deselects the icon, exactly as it does on a Mac. This is the
        // reason the selection lives in the store at all.
        deskSelection: null,
        controlCenter: false,
        spotlight: false,
        shortcuts: false,
        mission: false,
        launchpad: false,
        notifCenter: false,
        contextMenu: null,
      }
  }
}

export function initialState(): OsState {
  return {
    wins: {},
    z: 100,
    active: null,
    finderPath: '/',
    deskSelection: null,
    prefs: DEFAULT_PREFS,
    notifications: [],
    status: 'Ready',
    task: 'Idle',
    activity: 'Ready',
    spotlight: false,
    shortcuts: false,
    mission: false,
    controlCenter: false,
    launchpad: false,
    notifCenter: false,
    contextMenu: null,
    spaces: 2,
    activeSpace: 1,
    popover: null,
    menu: null,
    booted: false,
    power: 'on',
    wallpaper: DEFAULT_WALLPAPER,
    iconScale: 1,
    desktopHidden: false,
    dockHidden: false,
  }
}

const StateCtx = createContext<OsState | null>(null)
const DispatchCtx = createContext<Dispatch<Action> | null>(null)

export function OsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const [hydrated, setHydrated] = useState(false)

  // Saved preferences arrive after the first paint, so server and client agree on it.
  useEffect(() => {
    dispatch({ type: 'hydrate', prefs: loadPrefs(), wallpaper: loadWallpaper() })
    setHydrated(true)
  }, [])

  // Debounced, because every pointer-move of a drag or resize dispatches `geometry`, which
  // writes window bounds into prefs. Undebounced this was a JSON.stringify plus a
  // synchronous localStorage write on every animation frame of every drag.
  useEffect(() => {
    if (!hydrated) return
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(LS, JSON.stringify(state.prefs))
      } catch {
        // Private browsing or a full quota — preferences just do not persist.
      }
    }, 250)
    return () => window.clearTimeout(t)
  }, [state.prefs, hydrated])

  // Nothing used to react to a browser resize at all.
  useEffect(() => {
    const onResize = () =>
      dispatch({ type: 'clampAll', viewport: { w: window.innerWidth, h: window.innerHeight } })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      if (state.wallpaper) localStorage.setItem(WALLPAPER_KEY, state.wallpaper)
      else localStorage.removeItem(WALLPAPER_KEY)
    } catch {
      // As above.
    }
  }, [state.wallpaper, hydrated])

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  )
}

export function useOs(): OsState {
  const ctx = useContext(StateCtx)
  if (!ctx) throw new Error('useOs must be used inside <OsProvider>')
  return ctx
}

export function useDispatch(): Dispatch<Action> {
  const ctx = useContext(DispatchCtx)
  if (!ctx) throw new Error('useDispatch must be used inside <OsProvider>')
  return ctx
}

/** Open an app the way the dock and Spotlight do, with the desk chatter that follows. */
export function useOpenApp() {
  const dispatch = useDispatch()
  return useMemo(
    () =>
      (id: AppId | 'finder-projects', sub?: OsState['finderPath']) => {
        const app: AppId = id === 'finder-projects' ? 'finder' : id
        const path = id === 'finder-projects' ? 'projects' : sub
        dispatch({
          type: 'open',
          app,
          sub: path,
          viewport: { w: window.innerWidth, h: window.innerHeight },
        })
        // Quiet: the window arriving is the feedback. A toast for it covered the desk icons.
        dispatch({ type: 'notify', title: titleOf(app), msg: 'Opened', quiet: true })
        dispatch({ type: 'activity', activity: 'Working', task: `Loading ${titleOf(app)}` })
        window.setTimeout(() => dispatch({ type: 'activity', activity: 'Ready', task: 'Idle' }), 900)
      },
    [dispatch],
  )
}

export { DOCK_FOR, WALLPAPER_KEY }
