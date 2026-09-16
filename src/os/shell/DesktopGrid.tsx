'use client'

import { useState } from 'react'
import { SPRING } from '../anim'
import { s } from '../css'
import { FOLDER_TINTS, folderColor } from '../packs'
import { useContent } from '../content'
import { useDispatch, useOpenApp, useOs } from '../store'
import { useContextMenu } from './ContextMenu'
import { useReducedMotion } from '../useTheme'
import type { AppId, FolderTint } from '../types'

export function DesktopGrid() {
  const { iconScale, desktopHidden, prefs } = useOs()
  // The desktop folders are the published projects — no second list to keep in step.
  const projects = useContent().projects
  const openApp = useOpenApp()
  const dispatch = useDispatch()
  const reduced = useReducedMotion()
  const contextMenu = useContextMenu()
  const [selected, setSelected] = useState<AppId | null>(null)

  const folderMenu = (id: AppId) =>
    contextMenu([
      { label: 'Open', onPick: () => openApp(id) },
      { label: 'Open in Workspace', onPick: () => openApp('finder-projects') },
      { divider: true },
      ...(Object.keys(FOLDER_TINTS) as FolderTint[]).map((tint) => ({
        label: `Tag: ${tint[0].toUpperCase()}${tint.slice(1)}`,
        onPick: () => dispatch({ type: 'folderTint', app: id, tint }),
      })),
    ])

  if (desktopHidden) return null

  return (
    <div
      data-desktopgrid="1"
      id="desktop-grid"
      style={{
        ...s(
          // overflow-y: the grid used to run off the bottom of a container that clips, so past 18
          // icons at 1440x900 a project simply had no way to be reached from the desktop.
          // Scrolling is the smallest thing that keeps every project on the desk.
          'position:absolute;top:calc(var(--s-menubar-h) + 16px);right:22px;display:grid;grid-template-columns:repeat(2,86px);grid-auto-rows:min-content;gap:16px 6px;z-index:var(--z-desktop-grid);transform-origin:top right;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin',
        ),
        // The height is divided by the scale because `transform` does not resize the box layout
        // gave it: at Large Icons a `bottom:96px` grid still measured the full gap to the dock,
        // then scaled 1.25x past the bottom of the screen, and the last row scrolled into a
        // region the desktop clips. The two reserved bands are the real chrome heights now —
        // the old numbers were 44 and 96, and the menu bar has never been 44px tall.
        height: `calc((100% - var(--s-menubar-h) - 16px - var(--s-dock-h) - 14px) / ${iconScale})`,
        transform: `scale(${iconScale})`,
      }}
    >
      {projects.map((project, i) => {
        const id = project.id as AppId
        const label = project.desktopLabel
        const tint = prefs.folderTint[id]
        const [c1, c2] = tint ? FOLDER_TINTS[tint] : folderColor()
        return (
          <div
            key={id}
            data-dsk="1"
            data-focusable="1"
            role="button"
            tabIndex={0}
            aria-label={`${label} — double-click to open`}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              setSelected(id)
              openApp(id)
            }}
            style={{
              ...s(
                'width:86px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:default;border-radius:10px;padding:4px 0',
              ),
              animation: reduced ? 'none' : `riseIn .7s ${SPRING} ${0.15 + i * 0.05}s both`,
            }}
            onClick={(e) => {
              e.stopPropagation()
              setSelected(id)
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              openApp(id)
            }}
            onContextMenu={(e) => {
              setSelected(id)
              folderMenu(id)(e)
            }}
          >
            <div
              data-dskart="1"
              style={s(
                'position:relative;width:62px;height:48px;filter:var(--s-icon-shadow);transition:filter .2s ease',
              )}
            >
              {/* Back tab, shaded so it sits behind the front flap instead of beside it. */}
              <div
                style={{
                  ...s('position:absolute;left:1px;top:1px;width:28px;height:15px;border-radius:5px 10px 0 0'),
                  background: `linear-gradient(180deg,${c1},${c2})`,
                  filter: 'brightness(.82)',
                }}
              />
              {/* The sheet of paper peeking out. */}
              <div
                style={s(
                  'position:absolute;left:6px;top:9px;width:50px;height:12px;border-radius:4px 4px 0 0;background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.7))',
                )}
              />
              <div
                style={{
                  ...s(
                    'position:absolute;left:0;top:13px;width:62px;height:35px;border-radius:5px 9px 9px 9px;box-shadow:inset 0 1px 0 rgba(255,255,255,.62),inset 0 -12px 18px rgba(0,0,0,.16),inset 0 0 0 .5px rgba(0,0,0,.12)',
                  ),
                  background: `linear-gradient(180deg,${c1},${c2})`,
                }}
              />
              {/* Specular sweep across the front flap — the thing that stops it reading flat. */}
              <div
                style={s(
                  'position:absolute;left:0;top:13px;width:62px;height:35px;border-radius:5px 9px 9px 9px;background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0) 55%);pointer-events:none',
                )}
              />
            </div>
            <span
              data-dsklabel="1"
              data-selected={selected === id ? '1' : undefined}
              style={{
                ...s(
                  'font-size:11.5px;line-height:1.25;text-align:center;padding:2px 6px;border-radius:6px;-webkit-backdrop-filter:var(--s-blur-scrim);backdrop-filter:var(--s-blur-scrim);transition:background .16s ease,color .16s ease',
                ),
                color: selected === id ? '#fff' : 'var(--s-onwall)',
                textShadow: selected === id ? 'none' : 'var(--s-onwall-shadow)',
                // Bare until hovered or selected, the way macOS leaves it. The hover plate is
                // in os.css so it does not need a second piece of React state per icon.
                background: selected === id ? 'var(--s-onwall-sel)' : 'transparent',
              }}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
