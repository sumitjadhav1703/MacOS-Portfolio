'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { WIN_T } from '../anim'
import { s } from '../css'
import { TITLES } from '../registry'
import { useDispatch, useOs } from '../store'
import { useReducedMotion } from '../useTheme'
import { useContextMenu } from '../shell/ContextMenu'
import { useIsMobile } from '../useMedia'
import type { AppId, SnapZone, WindowState } from '../types'

/** Pointer within this distance of an edge arms a tiling zone. */
const SNAP_EDGE = 26

/** Which zone the pointer is arming, or null when it is not near an edge. */
export function zoneFor(x: number, y: number, vw: number, vh: number): SnapZone | null {
  const nearLeft = x <= SNAP_EDGE
  const nearRight = x >= vw - SNAP_EDGE
  const nearTop = y <= MENUBAR_H + SNAP_EDGE
  const nearBottom = y >= vh - SNAP_EDGE
  if (nearTop && nearLeft) return 'top-left'
  if (nearTop && nearRight) return 'top-right'
  if (nearBottom && nearLeft) return 'bottom-left'
  if (nearBottom && nearRight) return 'bottom-right'
  if (nearLeft) return 'left'
  if (nearRight) return 'right'
  if (nearTop) return 'top'
  return null
}

const MIN_W = 360
const MIN_H = 240
const MENUBAR_H = 28

type Dir = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

const EDGES: [Dir, string][] = [
  ['n', 'top:0;right:0;bottom:auto;left:0;width:100%;height:5px;cursor:ns-resize;z-index:5'],
  ['s', 'top:auto;right:0;bottom:0;left:0;width:100%;height:5px;cursor:ns-resize;z-index:5'],
  ['w', 'top:0;right:auto;bottom:0;left:0;width:5px;height:100%;cursor:ew-resize;z-index:5'],
  ['e', 'top:0;right:0;bottom:0;left:auto;width:5px;height:100%;cursor:ew-resize;z-index:5'],
  ['nw', 'top:-3px;right:auto;bottom:auto;left:-3px;width:14px;height:14px;cursor:nwse-resize;z-index:6'],
  ['ne', 'top:-3px;right:-3px;bottom:auto;left:auto;width:14px;height:14px;cursor:nesw-resize;z-index:6'],
  ['sw', 'top:auto;right:auto;bottom:-3px;left:-3px;width:14px;height:14px;cursor:nesw-resize;z-index:6'],
  ['se', 'top:auto;right:-3px;bottom:-3px;left:auto;width:14px;height:14px;cursor:nwse-resize;z-index:6'],
]

function TrafficLight({
  color,
  glyph,
  label,
  onClick,
}: {
  color: string
  glyph: string
  label: string
  onClick: () => void
}) {
  return (
    <div
      data-tl="1"
      role="button"
      aria-label={label}
      title={label}
      style={{
        ...s(
          'width:12px;height:12px;border-radius:50%;box-shadow:inset 0 0 0 .5px rgba(0,0,0,.22);cursor:default;display:flex;align-items:center;justify-content:center;font-size:8px;line-height:1;color:rgba(0,0,0,.55)',
        ),
        background: color,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <span data-glyph="1" style={s('opacity:0;transition:opacity .15s ease')}>
        {glyph}
      </span>
    </div>
  )
}

export function Window({
  id,
  win,
  active,
  onZone,
  children,
}: {
  id: AppId
  win: WindowState
  active: boolean
  /** Reports the tiling zone the drag is currently arming, so the desk can preview it. */
  onZone: (zone: SnapZone | null) => void
  children: ReactNode
}) {
  const dispatch = useDispatch()
  const reduced = useReducedMotion()
  const { finderPath } = useOs()
  const [entering, setEntering] = useState(!reduced)
  const [dragging, setDragging] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const contextMenu = useContextMenu()

  useEffect(() => {
    if (!entering) return
    const t = window.setTimeout(() => setEntering(false), 20)
    return () => window.clearTimeout(t)
  }, [entering])

  const mobile = useIsMobile()

  function startDrag(e: ReactPointerEvent<HTMLDivElement>) {
    dispatch({ type: 'focus', app: id })
    if (win.max || mobile) return
    const sx = e.clientX
    const sy = e.clientY
    const ox = win.x
    const oy = win.y
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)

    let zone: SnapZone | null = null

    const move = (ev: PointerEvent) => {
      let x = ox + (ev.clientX - sx)
      let y = Math.max(MENUBAR_H, oy + (ev.clientY - sy))
      x = Math.min(Math.max(x, -win.w + 120), window.innerWidth - 120)
      y = Math.min(y, window.innerHeight - 60)
      dispatch({ type: 'geometry', app: id, geom: { x, y } })
      zone = zoneFor(ev.clientX, ev.clientY, window.innerWidth, window.innerHeight)
      onZone(zone)
    }
    const up = () => {
      setDragging(false)
      onZone(null)
      if (zone) {
        dispatch({
          type: 'snap',
          app: id,
          zone,
          viewport: { w: window.innerWidth, h: window.innerHeight },
        })
      }
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    e.preventDefault()
  }

  function startResize(e: ReactPointerEvent<HTMLDivElement>, dir: Dir) {
    e.stopPropagation()
    dispatch({ type: 'focus', app: id })
    const sx = e.clientX
    const sy = e.clientY
    const { x: ox, y: oy, w: ow, h: oh } = win

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx
      const dy = ev.clientY - sy
      let w = ow
      let h = oh
      let x = ox
      let y = oy
      if (dir.includes('e')) w = Math.max(MIN_W, ow + dx)
      if (dir.includes('s')) h = Math.max(MIN_H, oh + dy)
      if (dir.includes('w')) {
        w = Math.max(MIN_W, ow - dx)
        x = ox + (ow - w)
      }
      if (dir.includes('n')) {
        h = Math.max(MIN_H, oh - dy)
        y = Math.max(MENUBAR_H, oy + (oh - h))
      }
      dispatch({ type: 'geometry', app: id, geom: { x, y, w, h } })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    e.preventDefault()
  }

  const geometry = win.max
    ? { left: 0, top: MENUBAR_H, width: '100%', height: `calc(100% - ${MENUBAR_H}px)`, borderRadius: 0 }
    : mobile
      ? { left: 0, top: MENUBAR_H, width: '100%', height: 'calc(100% - 96px)', borderRadius: 0 }
      : { left: win.x, top: win.y, width: win.w, height: win.h, borderRadius: 13 }

  const title = TITLES[id] + (id === 'finder' && finderPath !== '/' ? ' — Projects' : '')

  return (
    <div
      id={`win-${id}`}
      ref={ref}
      style={{
        ...s(
          'position:absolute;pointer-events:auto;display:flex;flex-direction:column;overflow:hidden;background:var(--s-win);border:1px solid var(--s-win-border)',
        ),
        ...geometry,
        zIndex: win.z,
        boxShadow: active ? 'var(--s-shadow-focus)' : 'var(--s-shadow-rest)',
        opacity: win.min ? 0 : entering ? 0 : active ? 1 : 0.965,
        transform: win.min
          ? 'translateY(60vh) scale(.06)'
          : entering
            ? 'scale(.94) translateY(10px)'
            : 'none',
        pointerEvents: win.min ? 'none' : 'auto',
        transition: reduced || dragging ? 'none' : WIN_T,
        visibility: win.min ? 'hidden' : 'visible',
      }}
      onPointerDown={() => dispatch({ type: 'focus', app: id })}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        data-titlebar={id}
        style={{
          ...s(
            'height:38px;flex:none;display:flex;align-items:center;padding:0 12px;gap:8px;border-bottom:1px solid var(--s-line);background:var(--s-chrome)',
          ),
          cursor: dragging ? 'grabbing' : 'grab',
        }}
        onPointerDown={startDrag}
        onDoubleClick={() => dispatch({ type: 'toggleMax', app: id })}
        onContextMenu={contextMenu([
          { label: 'Minimise', hint: '⌘M', onPick: () => dispatch({ type: 'minimize', app: id }) },
          { label: win.max || win.snapped ? 'Restore' : 'Zoom', onPick: () => dispatch({ type: 'toggleMax', app: id }) },
          { divider: true },
          {
            label: 'Tile Left',
            onPick: () =>
              dispatch({
                type: 'snap',
                app: id,
                zone: 'left',
                viewport: { w: window.innerWidth, h: window.innerHeight },
              }),
          },
          {
            label: 'Tile Right',
            onPick: () =>
              dispatch({
                type: 'snap',
                app: id,
                zone: 'right',
                viewport: { w: window.innerWidth, h: window.innerHeight },
              }),
          },
          { divider: true },
          { label: 'Close', hint: '⌘W', onPick: () => dispatch({ type: 'close', app: id }) },
        ])}
      >
        <div data-tlgroup="1" style={s('display:flex;gap:8px')}>
          <TrafficLight
            color="#d0655b"
            glyph="✕"
            label={`Close ${TITLES[id]}`}
            onClick={() => dispatch({ type: 'close', app: id })}
          />
          <TrafficLight
            color="#cfa04a"
            glyph="−"
            label={`Minimise ${TITLES[id]}`}
            onClick={() => dispatch({ type: 'minimize', app: id })}
          />
          <TrafficLight
            color="#5c9c63"
            glyph="⤡"
            label={`Zoom ${TITLES[id]}`}
            onClick={() => dispatch({ type: 'toggleMax', app: id })}
          />
        </div>
        <div
          style={s(
            'flex:1;text-align:center;font-size:12.5px;font-weight:600;color:var(--s-text);pointer-events:none;margin-left:-56px',
          )}
        >
          {title}
        </div>
      </div>

      <div data-wbody={id} style={s('flex:1;overflow:hidden;position:relative')}>
        {children}
      </div>

      {win.max || mobile
        ? null
        : EDGES.map(([dir, css]) => (
            <div
              key={dir}
              data-rs={dir}
              data-win={id}
              style={{ ...s(css), position: 'absolute' }}
              onPointerDown={(e) => startResize(e, dir)}
            />
          ))}
    </div>
  )
}
