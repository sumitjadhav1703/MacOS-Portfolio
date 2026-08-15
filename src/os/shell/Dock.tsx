'use client'

import { useRef, useState } from 'react'
import { EASE, SPRING_B } from '../anim'
import { s } from '../css'
import { TITLES } from '../registry'
import { useDispatch, useOpenApp, useOs } from '../store'
import { useReducedMotion } from '../useTheme'
import { AppIcon, ICONS, type IconSpec } from './AppIcon'
import { useContextMenu } from './ContextMenu'
import type { AppId } from '../types'

const MAGNIFY = 1.5
const SIGMA = 60
const RADIUS = 190

const pick = (id: string) => ICONS.find((icon) => icon.id === id)!

/** Left of the divider: Launchpad, then the apps. Trash sits on its own. */
const DOCK_APPS: IconSpec[] = [
  pick('finder'),
  pick('launchpad'),
  pick('safari'),
  pick('terminal'),
  pick('sumit-ai'),
  pick('code'),
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
  onContextMenu,
}: {
  spec: IconSpec
  scale: number
  labelled: boolean
  bouncing: boolean
  running: boolean
  onOpen: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}) {
  return (
    <div
      data-item={spec.id}
      role="button"
      aria-label={spec.tip}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      onContextMenu={onContextMenu}
      style={{
        ...s('position:relative;width:54px;height:54px;transform-origin:bottom center;will-change:transform;cursor:default'),
        transform: bouncing ? 'translateY(-17px) scale(1.05)' : `scale(${scale})`,
        margin: `0 ${5 + (scale - 1) * 27}px`,
        zIndex: Math.round(scale * 10),
        transition: bouncing
          ? 'transform .12s cubic-bezier(.3,0,.2,1)'
          : `transform .78s ${SPRING_B},margin .13s ${EASE}`,
      }}
    >
      <AppIcon spec={spec} />
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
            'position:absolute;left:50%;top:-38px;transform:translateX(-50%);padding:4px 9px;border-radius:8px;background:var(--s-tip);backdrop-filter:blur(20px);border:1px solid var(--s-line);color:var(--s-text);font-size:11.5px;white-space:nowrap;pointer-events:none;transition:opacity .18s ease',
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

export function Dock() {
  const { wins, prefs, dockHidden } = useOs()
  const dispatch = useDispatch()
  const openApp = useOpenApp()
  const reduced = useReducedMotion()
  const contextMenu = useContextMenu()
  const [pointerX, setPointerX] = useState<number | null>(null)
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
    return 1 + (MAGNIFY - 1) * Math.exp(-(dist * dist) / (2 * SIGMA * SIGMA))
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
      { label: `Open ${TITLES[id]}`, onPick: () => openApp(id) },
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

  const render = (spec: IconSpec) => {
    const scale = scaleFor(spec.id)
    return (
      <DockIcon
        key={spec.id}
        spec={spec}
        scale={scale}
        labelled={prefs.dockLabels && scale > 1.22}
        bouncing={bounce === spec.id}
        running={spec.id !== 'launchpad' && Boolean(wins[spec.id as AppId])}
        onOpen={() => launch(spec)}
        onContextMenu={menuFor(spec)}
      />
    )
  }

  return (
    <div
      data-dock="1"
      id="dock"
      style={s(
        'position:absolute;left:50%;bottom:8px;transform:translateX(-50%);display:flex;align-items:flex-end;padding:6px 10px 8px;border-radius:20px;background:var(--s-dock,rgba(18,20,24,.72));backdrop-filter:blur(24px) saturate(130%);-webkit-backdrop-filter:blur(24px) saturate(130%);border:1px solid var(--s-line);box-shadow:var(--s-shadow-pop);z-index:150',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        id="dock-list"
        ref={listRef}
        style={s('display:flex;align-items:flex-end')}
        onMouseMove={(e) => !flat && setPointerX(e.clientX)}
        onMouseLeave={() => setPointerX(null)}
      >
        {DOCK_APPS.map(render)}
        <div style={s('width:1px;height:44px;background:var(--s-line-2);margin:0 9px 4px')} />
        {render(TRASH)}
      </div>
    </div>
  )
}
