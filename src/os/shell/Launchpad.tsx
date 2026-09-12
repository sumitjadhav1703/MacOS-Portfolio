'use client'

import { useEffect, useRef, useState } from 'react'
import { s } from '../css'
import { pressable } from '../pressable'
import { titleOf } from '../registry'
import { fuzzy } from '../search/Spotlight'
import { useContent } from '../content'
import { folderColorFor } from '../packs'
import { useDispatch, useOpenApp, useOs } from '../store'
import { useReducedMotion } from '../useTheme'
import { AppIcon, iconFor, type IconSpec } from './AppIcon'
import type { AppId } from '../types'

/** Everything launchable, in the order macOS would lay it out: apps first, then documents. */
const APPS: AppId[] = [
  'finder',
  'safari',
  'terminal',
  'sumit-ai',
  'code',
  'settings',
  'monitor',
  'contact',
  'about',
  'resume',
  'skills',
  'experience',
  'education',
  'certificates',
]

/** A published project, wearing the folder colour it has everywhere else. */
function projectSpec(id: AppId, index: number): IconSpec {
  const [c1, c2] = folderColorFor(id, index)
  return {
    id,
    tip: titleOf(id),
    grad: `linear-gradient(180deg,${c1},${c2})`,
    inks: [
      ['left:14px;top:17px;width:11px;height:7px;border-radius:2px 3px 0 0;background:rgba(255,255,255,.5)', 'ink'],
      ['left:14px;top:21px;width:26px;height:18px;border-radius:3px;background:rgba(255,255,255,.9)', 'ink'],
      ['left:14px;top:27px;width:26px;height:1.6px;background:rgba(0,0,0,.16)', 'ink'],
    ],
  }
}

export function Launchpad() {
  const { launchpad } = useOs()
  const dispatch = useDispatch()
  const openApp = useOpenApp()
  const reduced = useReducedMotion()
  const [query, setQuery] = useState('')
  // Projects sit between the apps and Trash, exactly where the hardcoded list used to put them.
  const projects = useContent().projects
  // Same index `folderColorFor` is given everywhere else, so a project's colour matches.
  const projectIndex = new Map(projects.map((project, i) => [project.id as AppId, i]))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!launchpad) {
      setQuery('')
      return
    }
    inputRef.current?.focus()
  }, [launchpad])

  if (!launchpad) return null

  const q = query.trim().toLowerCase()
  const order: AppId[] = [...APPS, ...projects.map((p) => p.id as AppId), 'trash']
  const items = order.filter((id) => !q || fuzzy(q, titleOf(id)) > 0)

  const launch = (id: AppId) => {
    openApp(id)
    dispatch({ type: 'overlay', name: 'launchpad', on: false })
  }

  return (
    <div
      id="launchpad"
      onClick={() => dispatch({ type: 'overlay', name: 'launchpad', on: false })}
      style={{
        ...s(
          'position:absolute;inset:0;z-index:var(--z-launchpad);background:rgba(6,8,11,.5);backdrop-filter:var(--s-blur-heavy);-webkit-backdrop-filter:var(--s-blur-heavy);display:flex;flex-direction:column;align-items:center;padding:64px 60px 40px',
        ),
        animation: reduced ? 'none' : 'lpIn .26s ease both',
      }}
    >
      <input
        ref={inputRef}
        value={query}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && items.length) launch(items[0])
        }}
        placeholder="Search"
        aria-label="Search applications"
        style={s(
          'width:260px;flex:none;text-align:center;padding:8px 14px;border-radius:999px;background:var(--s-fill-2);border:1px solid var(--s-glass-ring);color:var(--s-onwall);outline:none;font-family:inherit;font-size:13px',
        )}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        style={s(
          'margin-top:44px;width:100%;max-width:960px;display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:34px 12px;overflow:auto',
        )}
      >
        {items.map((id, i) => {
          // A project has no icon of its own, and a two-letter monogram is the one thing in
          // this grid that looks like a placeholder. Give it the same tinted folder the
          // desktop and Finder already give it, from the same `folderColorFor`.
          const spec = iconFor(id) ?? projectSpec(id, projectIndex.get(id) ?? 0)
          return (
            <div
              key={id}
              data-lp={id}
              {...pressable(titleOf(id), () => launch(id))}
              style={{
                ...s(
                  'display:flex;flex-direction:column;align-items:center;gap:9px;cursor:default;padding:6px',
                ),
                // Capped, so a long project list does not end with tiles arriving a second late.
                animation: reduced
                  ? 'none'
                  : `lpTile .26s cubic-bezier(.32,.72,0,1) ${Math.min(i * 12, 220)}ms both`,
              }}
            >
              <AppIcon
                spec={spec}
                size={68}
                initial={titleOf(id)
                  .split(' ')
                  .map((word) => word[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              />
              <span
                style={s(
                  'font-size:12px;text-align:center;line-height:1.3;color:var(--s-onwall);text-shadow:var(--s-onwall-shadow);max-width:126px',
                )}
              >
                {titleOf(id)}
              </span>
            </div>
          )
        })}
        {items.length === 0 ? (
          <div style={s('color:var(--s-onwall);opacity:.7;font-size:13px')}>No applications</div>
        ) : null}
      </div>

      <div style={s('flex:1')} />
      <div style={s('color:var(--s-onwall);opacity:.6;font-size:11.5px;padding-top:16px')}>
        Esc to close · type to filter · Enter opens the first result
      </div>
    </div>
  )
}
