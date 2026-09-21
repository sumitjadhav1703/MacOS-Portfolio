'use client'

import { useEffect, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { WIN_T } from '../anim'
import { s } from '../css'
import { DOCK_H, MENUBAR_H } from '../metrics'
import { pressable } from '../pressable'
import { titleOf } from '../registry'
import { finderCrumb } from '../apps/finderPath'
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

/** macOS: 28pt for a plain title bar, 52pt for one carrying a toolbar. */
const TITLEBAR_H = 28
/** macOS window corner radius, Big Sur through Sequoia. */
const RADIUS = 10

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

/**
 * One of the three buttons.
 *
 * `active` is the whole point: macOS greys all three out the moment a window loses focus,
 * and a row of saturated red/amber/green on every window at once is the single loudest
 * thing telling a visitor this is not a Mac.
 */
function TrafficLight({
  color,
  glyph,
  label,
  active,
  onClick,
}: {
  color: string
  glyph: ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <div
      data-tl="1"
      {...pressable(label, onClick, { stopPropagation: true })}
      title={label}
      style={{
        ...s(
          'width:12px;height:12px;border-radius:50%;box-shadow:inset 0 0 0 .5px var(--s-tl-rim);cursor:default;display:flex;align-items:center;justify-content:center;font-size:8px;line-height:1;color:rgba(0,0,0,.55);transition:background .18s ease',
        ),
        background: active ? color : 'var(--s-tl-idle)',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span data-glyph="1" style={s('opacity:0;transition:opacity .15s ease')}>
        {glyph}
      </span>
    </div>
  )
}

/** The zoom button's two filled triangles, the way macOS draws them. */
function ZoomGlyph() {
  return (
    <svg viewBox="0 0 10 10" width="7.5" height="7.5" aria-hidden="true">
      <path d="M1 1h4L1 5z" fill="currentColor" />
      <path d="M9 9H5l4-4z" fill="currentColor" />
    </svg>
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
  const { finderPath, dockHidden } = useOs()
  const [entering, setEntering] = useState(!reduced)
  const [dragging, setDragging] = useState(false)
  // Where this window's own dock icon sits, so minimising can aim at it.
  const [dockX, setDockX] = useState<number | null>(null)
  const contextMenu = useContextMenu()

  useEffect(() => {
    if (!entering) return
    const t = window.setTimeout(() => setEntering(false), 20)
    return () => window.clearTimeout(t)
  }, [entering])

  // Measured after mount, never during render. One frame of the old centre-bottom target is
  // possible on the very first minimise; the transition simply re-aims, which is invisible.
  useEffect(() => {
    if (!win.min || dockHidden) return
    const el = document.querySelector<HTMLElement>(`#dock [data-item="${id}"]`)
    if (!el) return
    const rect = el.getBoundingClientRect()
    setDockX(rect.left + rect.width / 2)
  }, [win.min, dockHidden, id])

  const mobile = useIsMobile()

  function startDrag(e: ReactPointerEvent<HTMLDivElement>) {
    dispatch({ type: 'focus', app: id })
    if (win.max || mobile) return
    const sx = e.clientX
    const sy = e.clientY
    const ox = win.x
    const oy = win.y
    setDragging(true)
    e.currentTarget.setPointerCapture?.(e.pointerId)

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
      stop()
    }
    // pointercancel is the one nobody remembers: a touch interruption or a context menu
    // ends the gesture without a pointerup, and the window stays glued to the cursor.
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
    }
    const cancel = () => {
      setDragging(false)
      onZone(null)
      stop()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
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
      const vw = window.innerWidth
      const vh = window.innerHeight
      let w = ow
      let h = oh
      let x = ox
      let y = oy
      // Every edge is clamped to the viewport. Without this a window can be dragged out
      // past the right or bottom edge with no way back except Zoom.
      if (dir.includes('e')) w = Math.min(Math.max(MIN_W, ow + dx), vw - ox)
      if (dir.includes('s')) h = Math.min(Math.max(MIN_H, oh + dy), vh - oy)
      if (dir.includes('w')) {
        w = Math.min(Math.max(MIN_W, ow - dx), ox + ow)
        x = ox + (ow - w)
      }
      if (dir.includes('n')) {
        // Derive the height from the clamped top edge, not from dy. Computing the two
        // independently meant that once the top hit the menu bar the height kept growing,
        // so the bottom edge marched down the screen while the pointer moved up.
        y = Math.min(Math.max(MENUBAR_H, oy + dy), oy + oh - MIN_H)
        h = oy + oh - y
      }
      dispatch({ type: 'geometry', app: id, geom: { x, y, w, h } })
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    e.preventDefault()
  }

  const geometry = win.max
    ? { left: 0, top: MENUBAR_H, width: '100%', height: `calc(100% - ${MENUBAR_H}px)`, borderRadius: 0 }
    : mobile
      ? { left: 0, top: MENUBAR_H, width: '100%', height: `calc(100% - ${MENUBAR_H + DOCK_H}px)`, borderRadius: 0 }
      : { left: win.x, top: win.y, width: win.w, height: win.h, borderRadius: RADIUS }

  // Finder names where it is looking, the way a Mac window does. It used to say "— Projects"
  // for every path but the root, which stopped being true once the sidebar navigated in place.
  const title = titleOf(id) + (id === 'finder' ? finderCrumb(finderPath) : '')

  // macOS sucks a minimised window into its own dock icon. The real genie is a fifty-row
  // mesh deformation; aiming the scale at the right icon is the part that reads.
  // `dockX` is measured in an effect, so this stays free of browser globals during render.
  const minimised =
    dockX === null
      ? 'translateY(60vh) scale(.06)'
      : `translate(${Math.round(dockX - (win.x + win.w / 2))}px, 60vh) scale(.06)`

  return (
    <div
      id={`win-${id}`}
      role="dialog"
      aria-label={title}
      style={{
        ...s(
          'position:absolute;pointer-events:auto;display:flex;flex-direction:column;overflow:hidden;background:var(--s-win);border:1px solid var(--s-win-border)',
        ),
        ...geometry,
        zIndex: win.z,
        boxShadow: active ? 'var(--s-shadow-focus)' : 'var(--s-shadow-rest)',
        opacity: win.min ? 0 : entering ? 0 : active ? 1 : 0.965,
        transformOrigin: 'bottom center',
        transform: win.min ? minimised : entering ? 'scale(.94) translateY(10px)' : 'none',
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
            `height:${TITLEBAR_H}px;flex:none;display:flex;align-items:center;padding:0 13px;gap:8px;border-bottom:1px solid var(--s-line);background:var(--s-chrome);position:relative`,
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
        <div data-tlgroup="1" style={s('display:flex;gap:8px;position:relative;z-index:1')}>
          <TrafficLight
            color="var(--s-tl-red)"
            glyph="✕"
            active={active}
            label={`Close ${titleOf(id)}`}
            onClick={() => dispatch({ type: 'close', app: id })}
          />
          <TrafficLight
            color="var(--s-tl-yellow)"
            glyph="−"
            active={active}
            label={`Minimise ${titleOf(id)}`}
            onClick={() => dispatch({ type: 'minimize', app: id })}
          />
          <TrafficLight
            color="var(--s-tl-green)"
            glyph={<ZoomGlyph />}
            active={active}
            label={`Zoom ${titleOf(id)}`}
            onClick={() => dispatch({ type: 'toggleMax', app: id })}
          />
        </div>
        {/* Centred on the window, not on what is left after the buttons. The old
            `flex:1;margin-left:-56px` put it a few pixels off and drifted the moment the
            button group changed width. */}
        <div
          style={s(
            'position:absolute;left:0;right:0;text-align:center;font-size:12.5px;font-weight:600;color:var(--s-text);pointer-events:none;padding:0 84px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap',
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
