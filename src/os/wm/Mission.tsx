'use client'

import { s } from '../css'
import { MENUBAR_H } from '../metrics'
import { pressable } from '../pressable'
import { titleOf } from '../registry'
import { AppIcon, iconFor } from '../shell/AppIcon'
import { useDispatch, useOpenApp, useOs } from '../store'
import type { AppId } from '../types'

/**
 * Mission Control.
 *
 * Two things it has to do that an app switcher does not: keep each window's shape, and keep
 * them in the order they sit on the desk. What it must *not* do is draw them at their real
 * coordinates — windows cascade, so a faithful miniature of the desk is four rectangles
 * stacked on top of each other with only the front one legible. macOS spreads them, and so
 * does this: sorted by where they actually are (top row first, then left to right), flowed
 * into a grid, each card keeping its window's aspect ratio.
 */
export function Mission() {
  const { mission, wins, spaces, activeSpace } = useOs()
  const dispatch = useDispatch()
  const openApp = useOpenApp()

  if (!mission) return null

  // Reading order on the desk. Rows are banded so two windows at roughly the same height
  // stay side by side instead of swapping because one is eight pixels lower.
  const BAND = 120
  const ids = (Object.keys(wins) as AppId[])
    .filter((id) => wins[id]!.space === activeSpace)
    .sort((a, b) => {
      const wa = wins[a]!
      const wb = wins[b]!
      const row = Math.floor((wa.y - MENUBAR_H) / BAND) - Math.floor((wb.y - MENUBAR_H) / BAND)
      return row !== 0 ? row : wa.x - wb.x
    })

  const columns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(ids.length))))

  return (
    <div
      id="mission"
      onClick={() => dispatch({ type: 'overlay', name: 'mission', on: false })}
      style={s(
        'position:absolute;inset:0;z-index:var(--z-mission);background:rgba(6,8,11,.52);backdrop-filter:var(--s-blur-heavy);-webkit-backdrop-filter:var(--s-blur-heavy);display:flex;flex-direction:column;align-items:center;padding:26px 40px 34px;gap:16px',
      )}
    >
      <div style={s('width:100%;max-width:1040px;display:flex;flex-direction:column;gap:14px;height:100%')}>
        {/* Spaces strip: switch, add, or drop a window card onto another desktop. */}
        <div style={s('display:flex;align-items:center;gap:10px;flex:none')} onClick={(e) => e.stopPropagation()}>
          {Array.from({ length: spaces }, (_, i) => i + 1).map((index) => (
            <div
              key={index}
              data-space={index}
              {...pressable(`Desktop ${index}`, () => dispatch({ type: 'space', index }))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const app = e.dataTransfer.getData('text/plain') as AppId
                if (app) dispatch({ type: 'moveToSpace', app, space: index })
              }}
              style={{
                ...s(
                  'width:132px;height:66px;border-radius:10px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;font-size:11.5px;cursor:default;background:rgba(255,255,255,.08);color:rgba(255,255,255,.82)',
                ),
                border:
                  index === activeSpace
                    ? '2px solid rgba(255,255,255,.9)'
                    : '1px solid rgba(255,255,255,.25)',
              }}
            >
              Desktop {index}
            </div>
          ))}
          <div
            {...pressable('Add desktop', () => dispatch({ type: 'addSpace' }))}
            style={s(
              'width:44px;height:66px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:default;background:rgba(255,255,255,.06);border:1px dashed rgba(255,255,255,.3);color:rgba(255,255,255,.7)',
            )}
          >
            +
          </div>
          <div style={s('flex:1')} />
          <div style={s('font-size:11.5px;color:rgba(255,255,255,.45)')}>Esc to close</div>
        </div>

        {/* The desk, in miniature. */}
        <div
          id="mission-stage"
          onClick={(e) => e.stopPropagation()}
          style={{
            ...s('flex:1;min-height:0;display:grid;gap:18px;align-items:center;justify-items:center'),
            gridTemplateColumns: `repeat(${columns},1fr)`,
          }}
        >
          {ids.length ? (
            ids.map((id) => {
              const win = wins[id]!
              const spec = iconFor(id)
              return (
                <div
                  key={id}
                  data-mission={id}
                  {...pressable(titleOf(id), () => {
                    openApp(id)
                    dispatch({ type: 'overlay', name: 'mission', on: false })
                  })}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', id)}
                  style={{
                    ...s(
                      'border-radius:9px;overflow:hidden;background:var(--s-win);border:1px solid var(--s-win-border);box-shadow:var(--s-shadow-rest);cursor:default;display:flex;flex-direction:column;width:100%;max-height:100%;transition:transform .18s ease',
                    ),
                    // Each card keeps the shape of the window it stands for, which is how a
                    // wide Safari reads differently from a tall chat window at a glance.
                    aspectRatio: `${win.w} / ${win.h}`,
                    opacity: win.min ? 0.55 : 1,
                  }}
                >
                  {/* A miniature title bar, so each card reads as the window it stands for. */}
                  <div
                    style={s(
                      'flex:none;height:16px;display:flex;align-items:center;gap:4px;padding:0 5px;background:var(--s-chrome);border-bottom:1px solid var(--s-line)',
                    )}
                  >
                    <span style={s('width:5px;height:5px;border-radius:50%;background:var(--s-tl-red)')} />
                    <span style={s('width:5px;height:5px;border-radius:50%;background:var(--s-tl-yellow)')} />
                    <span style={s('width:5px;height:5px;border-radius:50%;background:var(--s-tl-green)')} />
                  </div>
                  <div
                    style={s(
                      'flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:6px',
                    )}
                  >
                    {spec ? <AppIcon spec={spec} size={30} /> : null}
                    <span
                      style={s(
                        'font-size:11px;font-weight:600;color:var(--s-text);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap',
                      )}
                    >
                      {titleOf(id)}
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <div style={s('color:rgba(255,255,255,.6);font-size:13px;padding:8px 2px')}>
              No windows on this desktop. Launch something from the dock, or drag a window
              here from another Space.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
