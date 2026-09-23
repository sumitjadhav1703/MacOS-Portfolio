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
  | 'interview'

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

/** `quiet` is recorded in Notification Center but never toasted — see Toasts.tsx. */
export type Notification = { id: number; title: string; msg: string; at: Date; quiet?: boolean }

export type PopoverName = 'status' | 'activity' | 'net' | null

/**
 * Where the Finder window is looking.
 *
 * `/` is the root folder and `projects` the folder of project folders; the rest are the
 * sidebar's own sections, which used to open a second window each instead of filling the
 * pane they were clicked in. Every value but `/` and `projects` is a `StaticAppId`, so the
 * pane can render it through the same `appContentFor` map the window manager uses.
 */
export type FinderSection = Extract<
  StaticAppId,
  'skills' | 'certificates' | 'education' | 'experience' | 'resume' | 'about'
>
export type FinderPath = '/' | 'projects' | FinderSection

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
  finderPath: FinderPath
  prefs: Prefs
  notifications: Notification[]
  status: string
  task: string
  activity: ActivityState
  /** The desk icon with the blue plate, or null. Lives here so a click on the desk can clear
   * it — as local component state it was unreachable and the plate never went away. */
  deskSelection: AppId | null
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
