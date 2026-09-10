'use client'

import { s } from '../css'
import { folderColorFor } from '../packs'
import { titleOf } from '../registry'
import { useDispatch, useOpenApp, useOs } from '../store'
import type { AppId } from '../types'

/**
 * Tile colours for the fixed apps. Projects are deliberately absent: they used to be listed here
 * by id, which meant every project added through the CMS fell through to the grey default while
 * the six shipped ones were coloured. `folderColorFor` already answers this question for the
 * desktop grid and Finder — Mission asks it the same way now, so a new project is coloured
 * everywhere or nowhere.
 */
const HUE: Partial<Record<AppId, string>> = {
  finder: '#1c62c9',
  terminal: '#3b424c',
  'sumit-ai': '#6a3ec0',
  code: '#4e5a6e',
  contact: '#1c7a6d',
  settings: '#4c545f',
  resume: '#c33026',
  trash: '#5b6068',
}

const hueFor = (id: AppId, index: number): string =>
  (Object.hasOwn(HUE, id) ? HUE[id] : undefined) ?? folderColorFor(id, index)[0]

export function Mission() {
  const { mission, wins, spaces, activeSpace } = useOs()
  const dispatch = useDispatch()
  const openApp = useOpenApp()
  if (!mission) return null

  const ids = (Object.keys(wins) as AppId[]).filter((id) => wins[id]!.space === activeSpace)

  return (
    <div
      id="mission"
      onClick={() => dispatch({ type: 'overlay', name: 'mission', on: false })}
      style={s(
        'position:absolute;inset:0;z-index:290;background:rgba(6,8,11,.52);backdrop-filter:blur(16px) saturate(140%);-webkit-backdrop-filter:blur(16px) saturate(140%);display:flex;align-items:center;justify-content:center;padding:56px 40px',
      )}
    >
      <div style={s('width:100%;max-width:940px')} onClick={(e) => e.stopPropagation()}>
        {/* Spaces strip: switch, add, or drop a window card onto another desktop. */}
        <div style={s('display:flex;align-items:center;gap:10px;margin-bottom:18px')}>
          {Array.from({ length: spaces }, (_, i) => i + 1).map((index) => (
            <div
              key={index}
              data-space={index}
              role="button"
              onClick={() => dispatch({ type: 'space', index })}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const app = e.dataTransfer.getData('text/plain') as AppId
                if (app) dispatch({ type: 'moveToSpace', app, space: index })
              }}
              style={{
                ...s(
                  'width:132px;height:74px;border-radius:10px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;font-size:11.5px;cursor:default;background:rgba(255,255,255,.08)',
                ),
                border:
                  index === activeSpace
                    ? '2px solid rgba(255,255,255,.9)'
                    : '1px solid rgba(255,255,255,.25)',
                color: 'rgba(255,255,255,.82)',
              }}
            >
              Desktop {index}
            </div>
          ))}
          <div
            role="button"
            onClick={() => dispatch({ type: 'addSpace' })}
            style={s(
              'width:44px;height:74px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:default;background:rgba(255,255,255,.06);border:1px dashed rgba(255,255,255,.3);color:rgba(255,255,255,.7)',
            )}
          >
            +
          </div>
        </div>

        <div style={s('display:flex;align-items:baseline;gap:10px;margin-bottom:14px')}>
          <div
            style={s(
              'font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:rgba(255,255,255,.62)',
            )}
          >
            Open windows
          </div>
          <div style={s('flex:1')} />
          <div style={s('font-size:11.5px;color:rgba(255,255,255,.45)')}>Esc to close</div>
        </div>
        <div
          id="mission-grid"
          style={s('display:grid;grid-template-columns:repeat(auto-fill,minmax(196px,1fr));gap:14px')}
        >
          {ids.length ? (
            ids.map((id, index) => (
              <div
                key={id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', id)}
                onClick={() => {
                  openApp(id)
                  dispatch({ type: 'overlay', name: 'mission', on: false })
                }}
                style={s(
                  'padding:14px;border-radius:14px;background:var(--s-pop);border:1px solid var(--s-line);box-shadow:var(--s-shadow-rest);cursor:default;display:flex;align-items:center;gap:12px',
                )}
              >
                <span
                  style={{
                    ...s('width:34px;height:34px;flex:none;border-radius:9px;box-shadow:inset 0 1px 0 rgba(255,255,255,.28)'),
                    background: hueFor(id, index),
                  }}
                />
                <span style={s('min-width:0')}>
                  <span
                    style={s(
                      'display:block;font-size:13px;font-weight:600;color:var(--s-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap',
                    )}
                  >
                    {titleOf(id)}
                  </span>
                  <span style={s('display:block;font-size:11.5px;color:var(--s-dim)')}>
                    {wins[id]?.min ? 'Minimised' : 'Open'}
                  </span>
                </span>
              </div>
            ))
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
