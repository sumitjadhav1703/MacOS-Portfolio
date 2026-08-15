'use client'

import { useEffect, useRef, useState } from 'react'
import { s } from '../css'
import { titleOf } from '../registry'
import { fuzzy } from '../search/Spotlight'
import { useContent } from '../content'
import { useDispatch, useOpenApp, useOs } from '../store'
import { useReducedMotion } from '../useTheme'
import { AppIcon, ICONS, iconFor } from './AppIcon'
import type { AppId } from '../types'

/** Everything launchable, in the order macOS would lay it out: apps first, then documents. */
const APPS: AppId[] = [
  'finder',
  'safari',
  'terminal',
  'sumit-ai',
  'code',
  'settings',
  'contact',
  'about',
  'resume',
  'skills',
  'experience',
  'education',
  'certificates',
]

const FALLBACK = ICONS[0]

export function Launchpad() {
  const { launchpad } = useOs()
  const dispatch = useDispatch()
  const openApp = useOpenApp()
  const reduced = useReducedMotion()
  const [query, setQuery] = useState('')
  // Projects sit between the apps and Trash, exactly where the hardcoded list used to put them.
  const projects = useContent().projects
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
          'position:absolute;inset:0;z-index:295;background:rgba(6,8,11,.5);backdrop-filter:blur(26px) saturate(150%);-webkit-backdrop-filter:blur(26px) saturate(150%);display:flex;flex-direction:column;align-items:center;padding:64px 60px 40px',
        ),
        animation: reduced ? 'none' : 'riseIn .28s cubic-bezier(.32,.72,0,1) both',
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
        {items.map((id) => {
          const spec = iconFor(id) ?? {
            ...FALLBACK,
            id,
            tip: titleOf(id),
            grad: 'linear-gradient(180deg,#6b7686,#39404a)',
            inks: [],
          }
          return (
            <div
              key={id}
              data-lp={id}
              role="button"
              onClick={() => launch(id)}
              style={s(
                'display:flex;flex-direction:column;align-items:center;gap:9px;cursor:default;padding:6px',
              )}
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
