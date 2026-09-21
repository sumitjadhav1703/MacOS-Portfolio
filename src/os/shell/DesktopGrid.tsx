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

/**
 * One desk cell, fixed so the column can be divided into whole rows.
 *
 * 4 top padding + 48 of folder art + 6 gap + a two-line label (11.5px at 1.25 line-height,
 * plus 2px of padding each side) + 4 bottom padding. The label is clamped to those two lines
 * rather than allowed to wrap freely: a three-line title used to make its own row taller than
 * every other, and once one row is an unpredictable height nothing below it can be placed.
 */
const CELL_H = 96
const CELL_W = 86
const ROW_GAP = 16
const LABEL_H = 33

/**
 * Capacity, for the record: rows come from the measured desk height, columns are however many
 * the width holds. 1440x900 fits 6 rows x 15 columns, 1280x720 fits 5 x 13, and 1024x640 — the
 * smallest desktop layout, below which the mobile shell takes over — fits 4 x 10, so 40 icons.
 * Past that a column starts off the left edge. Six projects ship today and `e2e/desktop.spec.ts`
 * holds the line at 24 on the smallest desk, so the ceiling is a known quantity rather than the
 * surprise it was when two fixed columns silently ran off the bottom.
 */

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
          // A desk, not a page. Two fixed columns filled top-to-bottom overflowed the box the
          // moment the project list grew, and scrolling it — the previous fix — is exactly what
          // a desktop does not do: a folder you cannot see is a folder that does not exist.
          //
          // `grid-auto-flow: column` with `repeat(auto-fill, CELL_H)` rows inverts the problem.
          // The row count is whatever fits the measured height, and the *columns* are what grow,
          // so adding projects starts a new column instead of pushing the last row off the
          // bottom. `direction: rtl` puts the first column against the right edge and grows
          // leftward from there, the way macOS arranges a desk; children set `ltr` back for text.
          //
          // The box is content-sized against `right`, so no width needs to be declared for it to
          // extend leftward as columns are added.
          'position:absolute;top:calc(var(--s-menubar-h) + 16px);right:22px;display:grid;grid-auto-flow:column;column-gap:6px;z-index:var(--z-desktop-grid);transform-origin:top right;direction:rtl',
        ),
        gridTemplateRows: `repeat(auto-fill, ${CELL_H}px)`,
        rowGap: `${ROW_GAP}px`,
        // Divided by the scale because `transform` does not resize the box layout gave it: at
        // Large Icons the grid still measured the full gap to the dock, then scaled 1.25x past
        // the bottom of the screen. `auto-fill` needs this height to be definite, which it is —
        // and the two reserved bands are the real chrome heights, not the 44/96 once guessed at.
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
                'display:flex;flex-direction:column;align-items:center;gap:6px;cursor:default;border-radius:10px;padding:4px 0;direction:ltr',
              ),
              width: CELL_W,
              height: CELL_H,
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
              title={label}
              style={{
                ...s(
                  // Two lines, then an ellipsis. Free wrapping made the cell height depend on
                  // the longest title on the desk, which is what the fixed row track cannot have.
                  'font-size:11.5px;line-height:1.25;text-align:center;padding:2px 6px;border-radius:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;-webkit-backdrop-filter:var(--s-blur-scrim);backdrop-filter:var(--s-blur-scrim);transition:background .16s ease,color .16s ease',
                ),
                maxHeight: LABEL_H,
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
