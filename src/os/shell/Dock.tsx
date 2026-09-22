'use client'

import { useRef, useState } from 'react'
import { EASE, SPRING_B } from '../anim'
import { s } from '../css'
import { pressable } from '../pressable'
import { titleOf } from '../registry'
import { useDispatch, useOpenApp, useOs } from '../store'
import { useReducedMotion } from '../useTheme'
import { AppIcon, ICONS, specFor, type IconSpec } from './AppIcon'
import { useContextMenu } from './ContextMenu'
import type { AppId, WindowState } from '../types'

const MAGNIFY = 1.5
const RADIUS = 190

const pick = (id: string) => ICONS.find((icon) => icon.id === id)!

/** Left of the divider: Launchpad, then the apps. Trash sits on its own. */
const DOCK_APPS: IconSpec[] = [
  pick('finder'),
  pick('launchpad'),
  pick('safari'),
  pick('terminal'),
  pick('sumit-ai'),
  pick('contact'),
  pick('settings'),
]

const TRASH = pick('trash')

function DockIcon({
  spec,
  scale,
  labelled,
  bouncing,
  running,
  onOpen,
  onHover,
  onContextMenu,
}: {
  spec: IconSpec
  scale: number
  labelled: boolean
  bouncing: boolean
  running: boolean
  onOpen: () => void
  onHover: (on: boolean) => void
  onContextMenu?: (e: React.MouseEvent) => void
}) {
  return (
    <div
      data-item={spec.id}
      {...pressable(spec.tip, onOpen, { stopPropagation: true })}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      onContextMenu={onContextMenu}
      style={{
        ...s('position:relative;width:54px;height:54px;transform-origin:bottom center;will-change:transform;cursor:default'),
        transform: bouncing ? 'translateY(-17px) scale(1.05)' : `scale(${scale})`,
        margin: `0 ${5 + (scale - 1) * 27}px`,
        // The label escapes the icon's own box, so the icon has to outrank its neighbours
        // while it is showing — otherwise the next icon's glass is painted over the text.
        zIndex: labelled ? 40 : Math.round(scale * 10),
        transition: bouncing
          ? 'transform .12s cubic-bezier(.3,0,.2,1)'
          : `transform .78s ${SPRING_B},margin .13s ${EASE}`,
      }}
    >
      <AppIcon spec={spec} badge={spec.id === 'sumit-ai' ? 'AI' : undefined} />
      <div
        data-ind={spec.id}
        style={{
          ...s(
            'position:absolute;left:50%;bottom:-7px;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:currentColor;transition:opacity .2s',
          ),
          opacity: running ? 1 : 0,
        }}
      />
      <div
        data-tip={spec.tip}
        style={{
          ...s(
            'position:absolute;left:50%;top:-38px;transform:translateX(-50%);padding:4px 9px;border-radius:8px;background:var(--s-tip);backdrop-filter:var(--s-blur);-webkit-backdrop-filter:var(--s-blur);border:1px solid var(--s-line);color:var(--s-text);font-size:11.5px;white-space:nowrap;pointer-events:none;transition:opacity .18s ease',
          ),
          opacity: labelled ? 1 : 0,
          // backdrop-filter keeps painting an opacity:0 layer in Chromium, so the
          // label also has to be pulled out of the visibility tree.
          visibility: labelled ? 'visible' : 'hidden',
        }}
      >
        {spec.tip}
      </div>
    </div>
  )
}

/**
 * A window that has been minimised, parked in the dock the way macOS parks one.
 *
 * Only eight apps have a dock icon (`DOCK_FOR` in registry.ts), and a project is never one of
 * them — so minimising a project window used to remove it from the screen with nothing left to
 * click. It was not hidden, it was unreachable: no dock icon, no Mission Control card, and the
 * window menu is the only other way back. These tiles are that way back.
 *
 * They are smaller than an app icon and sit past their own divider, which is the difference
 * macOS draws between "this app is installed" and "this window is put away".
 */
function MiniWindow({
  id,
  onOpen,
  onClose,
}: {
  id: AppId
  onOpen: () => void
  onClose: (e: React.MouseEvent) => void
}) {
  const title = titleOf(id)
  const [hover, setHover] = useState(false)
  return (
    <div
      data-min={id}
      {...pressable(`${title} — minimised`, onOpen, { stopPropagation: true })}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onContextMenu={onClose}
      style={{
        ...s('position:relative;width:38px;height:38px;margin:0 4px 8px;cursor:default;transform-origin:bottom center'),
        transform: hover ? 'translateY(-4px)' : 'none',
        transition: `transform .22s ${EASE}`,
        // Above its neighbours while hovered, or the next icon's glass paints over the label —
        // every dock icon carries a z-index of its own from the magnification.
        zIndex: hover ? 40 : 1,
      }}
    >
      <AppIcon spec={specFor(id)} size={38} />
      <div
        data-tip={title}
        style={{
          ...s(
            // Clear of the dock, not merely above the tile: these tiles are 38px in a row of
            // 54px icons, so a label hung off this one at the app icons' offset landed inside
            // the dock and was read through the trash icon's glass.
            'position:absolute;left:50%;bottom:calc(100% + 18px);transform:translateX(-50%);padding:4px 9px;border-radius:8px;background:var(--s-tip);-webkit-backdrop-filter:var(--s-blur);backdrop-filter:var(--s-blur);border:1px solid var(--s-line);box-shadow:var(--s-shadow-pop);color:var(--s-text);font-size:11.5px;white-space:nowrap;pointer-events:none;transition:opacity .18s ease',
          ),
          opacity: hover ? 1 : 0,
          visibility: hover ? 'visible' : 'hidden',
        }}
      >
        {title}
      </div>
    </div>
  )
}

export function Dock() {
  const { wins, prefs, dockHidden } = useOs()
  const dispatch = useDispatch()
  const openApp = useOpenApp()
  const reduced = useReducedMotion()
  const contextMenu = useContextMenu()
  const [pointerX, setPointerX] = useState<number | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [bounce, setBounce] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const flat = reduced || prefs.lowPower

  function scaleFor(id: string): number {
    if (flat || pointerX === null) return 1
    const el = listRef.current?.querySelector<HTMLElement>(`[data-item="${id}"]`)
    if (!el) return 1
    const rect = el.getBoundingClientRect()
    const dist = Math.abs(pointerX - (rect.left + rect.width / 2))
    if (dist >= RADIUS) return 1
    // Cosine falloff rather than a Gaussian: it reaches exactly 1 at the edge of the
    // radius instead of asymptotically approaching it, so there is no kink where an icon
    // enters the field. This is the shape macOS's own curve is usually fitted to.
    return 1 + (MAGNIFY - 1) * Math.cos((dist / RADIUS) * (Math.PI / 2))
  }

  function launch(spec: IconSpec) {
    if (!reduced) {
      setBounce(spec.id)
      window.setTimeout(() => setBounce(null), 130)
    }
    if (spec.id === 'launchpad') {
      dispatch({ type: 'overlay', name: 'launchpad', on: true })
      return
    }
    openApp(spec.id as AppId)
    dispatch({ type: 'closeTransient' })
  }

  function menuFor(spec: IconSpec) {
    if (spec.id === 'launchpad') {
      return contextMenu([
        { label: 'Open Launchpad', onPick: () => dispatch({ type: 'overlay', name: 'launchpad', on: true }) },
      ])
    }
    const id = spec.id as AppId
    const open = Boolean(wins[id])
    return contextMenu([
      { label: `Open ${titleOf(id)}`, onPick: () => openApp(id) },
      { label: 'Show in Workspace', onPick: () => openApp('finder-projects') },
      { divider: true },
      {
        label: 'Quit',
        disabled: !open,
        onPick: () => dispatch({ type: 'close', app: id }),
      },
    ])
  }

  if (dockHidden) return null

  // Every minimised window, in the order it was minimised. Windows that already have a dock
  // icon are left out: their icon is the way back, and a second tile for the same window would
  // be two places to click for one thing.
  const minimised = (Object.entries(wins) as [AppId, WindowState][])
    .filter(([id, win]) => win.min && !DOCK_APPS.some((spec) => spec.id === id))
    .map(([id]) => id)

  const render = (spec: IconSpec) => {
    const scale = scaleFor(spec.id)
    return (
      <DockIcon
        key={spec.id}
        spec={spec}
        scale={scale}
        labelled={prefs.dockLabels && hovered === spec.id}
        bouncing={bounce === spec.id}
        running={spec.id !== 'launchpad' && Boolean(wins[spec.id as AppId])}
        onOpen={() => launch(spec)}
        onHover={(on) => setHovered(on ? spec.id : (cur) => (cur === spec.id ? null : cur))}
        onContextMenu={menuFor(spec)}
      />
    )
  }

  return (
    <div
      data-dock="1"
      id="dock"
      style={s(
        'position:absolute;left:50%;bottom:8px;transform:translateX(-50%);display:flex;align-items:flex-end;padding:6px 10px 13px;border-radius:20px;background:var(--s-dock,rgba(18,20,24,.72));border:1px solid var(--s-line);box-shadow:var(--s-shadow-pop);z-index:var(--z-dock)',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        id="dock-list"
        ref={listRef}
        style={s('display:flex;align-items:flex-end')}
        onPointerMove={(e) => !flat && setPointerX(e.clientX)}
        onPointerLeave={() => {
          setPointerX(null)
          setHovered(null)
        }}
      >
        {DOCK_APPS.map(render)}
        {minimised.length ? (
          <>
            <div style={s('width:1px;height:44px;background:var(--s-line-2);margin:0 9px 4px')} />
            {minimised.map((id) => (
              <MiniWindow
                key={id}
                id={id}
                onOpen={() => {
                  openApp(id)
                  dispatch({ type: 'closeTransient' })
                }}
                onClose={contextMenu([
                  { label: `Show ${titleOf(id)}`, onPick: () => openApp(id) },
                  { divider: true },
                  { label: 'Close', onPick: () => dispatch({ type: 'close', app: id }) },
                ])}
              />
            ))}
          </>
        ) : null}
        <div style={s('width:1px;height:44px;background:var(--s-line-2);margin:0 9px 4px')} />
        {render(TRASH)}
      </div>
    </div>
  )
}
