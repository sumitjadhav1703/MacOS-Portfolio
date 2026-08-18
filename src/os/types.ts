/** The fixed apps. Every one of these has its own component in src/os/apps. */
export type StaticAppId =
  | 'finder'
  | 'terminal'
  | 'safari'
  | 'sumit-ai'
  | 'about'
  | 'resume'
  | 'contact'
  | 'settings'
  | 'trash'
  | 'code'
  | 'skills'
  | 'education'
  | 'experience'
  | 'certificates'
  | 'monitor'

/**
 * Project windows are not enumerable at compile time — the CMS can add one at any moment — so a
 * project's id is any `project-<slug>`. Everything that looks an id up must tolerate one it has
 * never seen; `isAppId` in registry.ts is the guard, and unknown projects fall back to the
 * default window size and their own title.
 */
export type ProjectAppId = `project-${string}`

export type AppId = StaticAppId | ProjectAppId

export type WindowState = {
  x: number
  y: number
  w: number
  h: number
  max: boolean
  min: boolean
  z: number
  /** Which desktop (Space) the window lives on. */
  space: number
  /** Geometry to restore when un-maximising or un-snapping. */
  restore?: { x: number; y: number; w: number; h: number }
  /** Set while the window is tiled, so the traffic-light zoom can undo it. */
  snapped?: SnapZone
}

/** Tiling targets, in the order macOS offers them at the screen edges. */
export type SnapZone = 'left' | 'right' | 'top' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/** Power state of the machine. `on` is the desktop; the rest are overlays over it. */
export type PowerState = 'on' | 'sleep' | 'restart' | 'shutdown'

export type Theme = 'system' | 'light' | 'dark'
export type PackId = 'graphite' | 'latent' | 'daylight'
export type DockStyle = 'glass' | 'solid'
export type FolderTint = 'blue' | 'green' | 'sand' | 'rose' | 'violet' | 'graphite'

export type Prefs = {
  theme: Theme
  pack: PackId
  dockStyle: DockStyle
  folderTint: Partial<Record<AppId, FolderTint>>
  dockLabels: boolean
  /** null = follow the OS setting. */
  reduceMotion: boolean | null
  opaque: boolean
  contrast: boolean
  lowPower: boolean
  bright: number
  showStatus: boolean
  showActivity: boolean
  wins: Partial<Record<AppId, { x: number; y: number; w: number; h: number }>>
}

export type ActivityState = 'Idle' | 'Ready' | 'Working' | 'Processing'

export type Notification = { id: number; title: string; msg: string; at: Date }

export type PopoverName = 'status' | 'activity' | 'cal' | null

/** One row of a context menu; `divider` rows carry no label. */
export type MenuEntry =
  | { divider: true }
  | { label: string; onPick: () => void; hint?: string; disabled?: boolean }

export type ContextMenuState = { x: number; y: number; entries: MenuEntry[] } | null
export type MenuName = 'apple' | 'app' | 'file' | 'edit' | 'view' | 'go' | 'window' | 'help' | null

export type OsState = {
  wins: Partial<Record<AppId, WindowState>>
  z: number
  active: AppId | null
  finderPath: '/' | 'projects'
  prefs: Prefs
  notifications: Notification[]
  status: string
  task: string
  activity: ActivityState
  /** Overlay visibility. */
  spotlight: boolean
  shortcuts: boolean
  mission: boolean
  controlCenter: boolean
  launchpad: boolean
  notifCenter: boolean
  contextMenu: ContextMenuState
  /** Spaces (virtual desktops), numbered from 1. */
  spaces: number
  activeSpace: number
  popover: PopoverName
  menu: MenuName
  booted: boolean
  power: PowerState
  /** Data URL of a wallpaper the visitor supplied, or null for the packaged one. */
  wallpaper: string | null
  /** View-menu toggles. */
  iconScale: number
  desktopHidden: boolean
  dockHidden: boolean
}
