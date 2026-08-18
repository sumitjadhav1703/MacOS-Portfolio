'use client'

import { useEffect, useState } from 'react'
import { s } from '../css'
import { useIsMobile } from '../useMedia'
import type { AppId } from '../types'
import { MobileShell } from '../mobile/MobileShell'
import { Shortcuts } from '../search/Shortcuts'
import { Spotlight } from '../search/Spotlight'
import { useDispatch, useOpenApp, useOs } from '../store'
import { useHotkeys } from '../useHotkeys'
import { useTheme } from '../useTheme'
import { Mission } from '../wm/Mission'
import { WindowManager } from '../wm/WindowManager'
import { Boot, PowerOverlay } from './Boot'
import { ContextMenu, useContextMenu } from './ContextMenu'
import { ControlCenter } from './ControlCenter'
import { Launchpad } from './Launchpad'
import { NotificationCenter } from './NotificationCenter'
import { DesktopGrid } from './DesktopGrid'
import { Dock } from './Dock'
import { MenuBar } from './MenuBar'
import { Toasts } from './Toasts'
import { Wallpaper, pickWallpaper } from './Wallpaper'

/** The app the desktop opens once the boot sequence finishes. */
const STARTUP_APP = 'about' as const
const HINT_KEY = 'sumit-os-hint-seen'

function DockHint() {
  // Read after mount: the server has no localStorage, and the hint must not flash.
  const [seen, setSeen] = useState(true)
  useEffect(() => setSeen(localStorage.getItem(HINT_KEY) === '1'), [])
  if (seen) return null
  return (
    <div
      id="dock-hint"
      style={s(
        'position:absolute;left:50%;bottom:82px;transform:translateX(-50%);z-index:160;display:flex;align-items:center;gap:12px;padding:8px 10px 8px 15px;border-radius:12px;background:var(--s-pop);backdrop-filter:var(--s-blur);-webkit-backdrop-filter:var(--s-blur);border:1px solid var(--s-line);box-shadow:var(--s-shadow-pop);font-size:12.5px;color:var(--s-text)',
      )}
    >
      <span>
        Press <b style={s('font-family:ui-monospace,Menlo,monospace')}>⌘K</b> to search ·{' '}
        <b style={s('font-family:ui-monospace,Menlo,monospace')}>?</b> for shortcuts
      </span>
      <span
        role="button"
        onClick={(e) => {
          e.stopPropagation()
          localStorage.setItem(HINT_KEY, '1')
          setSeen(true)
        }}
        style={s(
          'padding:4px 11px;border-radius:8px;background:var(--s-fill-2);border:1px solid var(--s-line);cursor:default;font-size:11.5px',
        )}
      >
        Got it
      </span>
    </div>
  )
}

export function Desktop({ initialApp }: { initialApp?: AppId }) {
  const { booted, wins } = useOs()
  const dispatch = useDispatch()
  const openApp = useOpenApp()
  const { rootProps, rootVars } = useTheme()
  const mobile = useIsMobile()
  const contextMenu = useContextMenu()
  useHotkeys()

  const deskMenu = contextMenu([
    { label: 'New Workspace Window', onPick: () => openApp('finder') },
    { label: 'Open Launchpad', hint: 'F4', onPick: () => dispatch({ type: 'overlay', name: 'launchpad', on: true }) },
    { divider: true },
    { label: 'Change Wallpaper…', onPick: pickWallpaper },
    { label: 'Show / Hide Desktop Items', onPick: () => dispatch({ type: 'toggleDesktop' }) },
    { label: 'Show / Hide Dock', onPick: () => dispatch({ type: 'toggleDock' }) },
    { divider: true },
    { label: 'Mission Control', hint: '⌘↑', onPick: () => dispatch({ type: 'overlay', name: 'mission', on: true }) },
  ])

  useEffect(() => {
    if (!booted) return
    if (Object.keys(wins).length) return
    if (mobile) return
    // A shared /projects/<slug> link opens on the project it advertises.
    openApp(initialApp ?? STARTUP_APP)
    // Fires on the boot edge only; `wins` is read, not tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted])

  return (
    <div
      {...rootProps}
      style={{
        ...s(
          "position:fixed;inset:0;overflow:hidden;background:var(--s-desk);color:var(--s-text);font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;font-size:13px;user-select:none",
        ),
        ...rootVars,
      }}
      onClick={() => dispatch({ type: 'closeTransient' })}
      onContextMenu={deskMenu}
    >
      <Wallpaper />
      <MenuBar />
      <DesktopGrid />
      <WindowManager />
      <Toasts />
      <ControlCenter />
      <Spotlight />
      <Shortcuts />
      <Mission />
      <Launchpad />
      <NotificationCenter />
      <ContextMenu />
      <DockHint />
      <Dock />
      <MobileShell />
      <Boot />
      <PowerOverlay />
    </div>
  )
}
