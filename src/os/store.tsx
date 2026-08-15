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
import { DEFAULT_SIZE, DOCK_FOR, SIZE, isAppId, titleOf } from './registry'
import { PACKS } from './packs'
import type {
  ActivityState,
  AppId,
  ContextMenuState,
  FolderTint,
  MenuName,
  OsState,
  PopoverName,
  Prefs,
  SnapZone,
  StaticAppId,
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

/** Shipped with the site; the visitor can replace it from the desktop picker. */
export const DEFAULT_WALLPAPER = '/wallpaper.png'

function loadWallpaper(): string {
  try {
    return localStorage.getItem(WALLPAPER_KEY) ?? DEFAULT_WALLPAPER
  } catch {
    return DEFAULT_WALLPAPER
  }
}

export type Action =
  | { type: 'hydrate'; prefs: Prefs; wallpaper: string }
  | { type: 'open'; app: AppId; sub?: OsState['finderPath']; viewport?: { w: number; h: number } }
  | { type: 'focus'; app: AppId }
  | { type: 'close'; app: AppId }
  | { type: 'minimize'; app: AppId }
  | { type: 'toggleMax'; app: AppId }
  | { type: 'geometry'; app: AppId; geom: Partial<Pick<WindowState, 'x' | 'y' | 'w' | 'h'>> }
  | { type: 'finderPath'; path: OsState['finderPath'] }
  | { type: 'prefs'; patch: Partial<Prefs> }
  | { type: 'folderTint'; app: AppId; tint: FolderTint }
  | { type: 'notify'; title: string; msg: string }
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
  | { type: 'popover'; name: PopoverName }
  | { type: 'menu'; name: MenuName }
  | { type: 'booted' }
  | { type: 'wallpaper'; url: string | null }
  | { type: 'closeTransient' }
  | { type: 'iconScale'; scale: number }
  | { type: 'toggleDesktop' }
  | { type: 'toggleDock' }
  | { type: 'closeAll' }
  | { type: 'minimizeAll' }
  | { type: 'frontAll' }

/** Menu bar height; snapping tiles the area below it. */
const MENUBAR_H = 28

// Notifications are keyed by a monotonic counter: several can land in the same millisecond.
let nextNotifId = 1

function topmost(wins: OsState['wins'], skipMinimised: boolean): AppId | null {
  const open = (Object.keys(wins) as AppId[]).filter((k) => !skipMinimised || !wins[k]?.min)
  if (!open.length) return null
  return open.reduce((a, b) => ((wins[a]?.z ?? 0) > (wins[b]?.z ?? 0) ? a : b))
}

function reducer(state: OsState, action: Action): OsState {
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
      const [dw, dh] = SIZE[app as StaticAppId] ?? DEFAULT_SIZE
      const saved: Partial<{ x: number; y: number; w: number; h: number }> =
        state.prefs.wins[app] ?? {}
      const w = saved.w ?? dw
      const h = saved.h ?? dh
      // Viewport comes in with the action: the reducer also runs on the server.
      const view = action.viewport ?? { w: 1440, h: 900 }
      const x = Math.max(8, Math.min(saved.x ?? 90 + n * 26, view.w - w - 8))
      const y = Math.max(34, Math.min(saved.y ?? 66 + n * 22, view.h - 120))

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
        ? { ...win, max: false, ...(win.restore ?? {}), restore: undefined, snapped: undefined }
        : win.snapped
          ? { ...win, ...(win.restore ?? {}), restore: undefined, snapped: undefined }
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
      const note = { id: nextNotifId++, title: action.title, msg: action.msg, at: new Date() }
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
      const cleared =
        action.name === 'controlCenter' || action.name === 'notifCenter'
          ? {}
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

    case 'popover':
      return { ...state, popover: action.name, menu: null }

    case 'menu':
      return { ...state, menu: action.name, popover: null }

    case 'booted':
      return { ...state, booted: true }

    case 'wallpaper':
      return { ...state, wallpaper: action.url }

    case 'iconScale':
      return { ...state, iconScale: action.scale }

    case 'toggleDesktop':
      return { ...state, desktopHidden: !state.desktopHidden }

    case 'toggleDock':
      return { ...state, dockHidden: !state.dockHidden }

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

    case 'contextMenu':
      return { ...state, contextMenu: action.menu }

    case 'snap': {
      const win = state.wins[action.app]
      if (!win) return state
      const { w: vw, h: vh } = action.viewport
      const half = Math.round(vw / 2)
      const top = MENUBAR_H
      const full = vh - MENUBAR_H
      const halfH = Math.round(full / 2)
      const box = {
        left: { x: 0, y: top, w: half, h: full },
        right: { x: half, y: top, w: vw - half, h: full },
        top: { x: 0, y: top, w: vw, h: full },
        'top-left': { x: 0, y: top, w: half, h: halfH },
        'top-right': { x: half, y: top, w: vw - half, h: halfH },
        'bottom-left': { x: 0, y: top + halfH, w: half, h: full - halfH },
        'bottom-right': { x: half, y: top + halfH, w: vw - half, h: full - halfH },
      }[action.zone]

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

function initialState(): OsState {
  return {
    wins: {},
    z: 100,
    active: null,
    finderPath: '/',
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

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(LS, JSON.stringify(state.prefs))
    } catch {
      // Private browsing or a full quota — preferences just do not persist.
    }
  }, [state.prefs, hydrated])

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
        dispatch({ type: 'notify', title: titleOf(app), msg: 'Opened' })
        dispatch({ type: 'activity', activity: 'Working', task: `Loading ${titleOf(app)}` })
        window.setTimeout(() => dispatch({ type: 'activity', activity: 'Ready', task: 'Idle' }), 900)
      },
    [dispatch],
  )
}

export { DOCK_FOR, WALLPAPER_KEY }
