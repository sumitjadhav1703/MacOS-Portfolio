'use client'

import { useState } from 'react'
import { SPRING } from '../anim'
import { s } from '../css'
import { FOLDER_TINTS, folderColorFor } from '../packs'
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
          'position:absolute;top:44px;right:22px;display:grid;grid-template-columns:repeat(2,86px);gap:16px 6px;z-index:20;transform-origin:top right',
        ),
        transform: `scale(${iconScale})`,
      }}
    >
      {projects.map((project, i) => {
        const id = project.id as AppId
        const label = project.desktopLabel
        const tint = prefs.folderTint[id]
        const [c1, c2] = tint ? FOLDER_TINTS[tint] : folderColorFor(id, i)
        return (
          <div
            key={id}
            data-dsk="1"
            style={{
              ...s('width:86px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:default'),
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
            <div style={s('position:relative;width:62px;height:48px;filter:drop-shadow(0 6px 11px rgba(0,0,0,.5))')}>
              <div
                style={{
                  ...s('position:absolute;left:1px;top:1px;width:28px;height:14px;border-radius:5px 10px 0 0'),
                  background: c2,
                }}
              />
              <div
                style={s(
                  'position:absolute;left:6px;top:9px;width:50px;height:11px;border-radius:4px 4px 0 0;background:rgba(255,255,255,.72)',
                )}
              />
              <div
                style={{
                  ...s(
                    'position:absolute;left:0;top:13px;width:62px;height:35px;border-radius:5px 9px 9px 9px;box-shadow:inset 0 1px 0 rgba(255,255,255,.6),inset 0 -10px 16px rgba(0,0,0,.14)',
                  ),
                  background: `linear-gradient(180deg,${c1},${c2})`,
                }}
              />
            </div>
            <span
              style={{
                ...s(
                  'font-size:11.5px;line-height:1.25;text-align:center;padding:2px 6px;border-radius:6px;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)',
                ),
                color: selected === id ? '#fff' : 'var(--s-onwall)',
                textShadow: selected === id ? 'none' : 'var(--s-onwall-shadow)',
                background: selected === id ? 'var(--s-onwall-sel)' : 'var(--s-onwall-bg)',
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
