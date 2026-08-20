// One search field over everything the admin has loaded.
//
// The whole portfolio is a few dozen rows that the store already holds, so this is a filter over
// memory rather than a query — no endpoint, no index, nothing to keep in step (spec §31, §51).
// Anything not yet loaded is fetched when the palette opens, which is the only round trip here.

import { useEffect, useMemo, useRef, useState } from 'react'
import { COLLECTIONS } from './schema'
import { matches } from './filters'
import type { Route } from './router'
import { useAdmin } from './store'
import { Input } from './ui'
import { s } from '../../src/os/css'

type Hit = { group: string; label: string; sub: string; route: Route }

/** The singleton screens, which have content worth finding but no list to search. */
const SINGLETONS: { type: string; group: string; cols: string[]; label: string }[] = [
  { type: 'site', group: 'Profile', cols: ['name', 'subtitle', 'paragraphs', 'email'], label: 'Profile' },
  { type: 'os', group: 'Shell & Ask Sumit', cols: ['term', 'kb', 'ai_fallback', 'ai_suggestions', 'shortcuts', 'neofetch_rows'], label: 'Shell & Ask Sumit' },
]

export function Search({ onGo, onClose }: { onGo: (route: Route) => void; onClose: () => void }) {
  const { lists, ensure } = useAdmin()
  const [text, setText] = useState('')
  const [cursor, setCursor] = useState(0)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    for (const ui of COLLECTIONS) ensure(ui.type)
    for (const single of SINGLETONS) ensure(single.type)
  }, [ensure])

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    return () => previous?.focus?.()
  }, [])

  const hits = useMemo<Hit[]>(() => {
    if (!text.trim()) return []
    const out: Hit[] = []
    for (const ui of COLLECTIONS) {
      for (const row of lists[ui.type] ?? []) {
        if (!matches(row, text, ui.searchCols)) continue
        out.push({
          group: ui.title,
          label: String(row[ui.titleCol] || `Untitled ${ui.singular}`),
          sub: ui.subtitleCol ? String(row[ui.subtitleCol] ?? '').slice(0, 90) : '',
          route: { page: ui.type, id: String(row.id) },
        })
      }
    }
    for (const single of SINGLETONS) {
      const row = (lists[single.type] ?? [])[0]
      if (row && matches(row, text, single.cols)) {
        out.push({ group: single.group, label: single.label, sub: 'Matches somewhere on this screen', route: { page: single.type } })
      }
    }
    return out.slice(0, 40)
  }, [text, lists])

  const choose = (hit: Hit | undefined) => {
    if (!hit) return
    onGo(hit.route)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={s('position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:55;padding:12vh 16px 16px;display:flex;justify-content:center;align-items:flex-start')}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label="Search all content"
        onClick={(e) => e.stopPropagation()}
        style={s('background:var(--s-win);border:1px solid var(--s-line);border-radius:12px;width:520px;max-width:100%;overflow:hidden')}
      >
        <div style={s('padding:12px')}>
          <Input
            value={text}
            autoFocus
            type="search"
            placeholder="Search projects, certificates, skills, links…"
            aria-label="Search all content"
            onChange={(e) => {
              setText(e.target.value)
              setCursor(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setCursor((c) => Math.min(c + 1, hits.length - 1))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setCursor((c) => Math.max(c - 1, 0))
              }
              if (e.key === 'Enter') choose(hits[cursor])
            }}
          />
        </div>

        <div role="listbox" aria-label="Results" style={s('max-height:52vh;overflow:auto;border-top:1px solid var(--s-line)')}>
          {text.trim() && hits.length === 0 ? (
            <div style={s('padding:16px;font-size:13px;color:var(--s-faint)')}>Nothing matches that.</div>
          ) : null}
          {!text.trim() ? (
            <div style={s('padding:16px;font-size:12px;color:var(--s-faint)')}>
              Type to search everything. ↑ ↓ to move, Enter to open, Esc to close.
            </div>
          ) : null}
          {hits.map((hit, i) => (
            <button
              key={`${hit.route.page}-${hit.route.id ?? ''}-${i}`}
              type="button"
              role="option"
              aria-selected={i === cursor}
              onMouseEnter={() => setCursor(i)}
              onClick={() => choose(hit)}
              data-focusable
              style={{
                ...s('display:block;width:100%;text-align:left;border:0;padding:10px 14px;cursor:pointer;color:var(--s-text);font:inherit'),
                background: i === cursor ? 'var(--s-fill-2)' : 'transparent',
              }}
            >
              <span style={s('font-size:13px')}>{hit.label}</span>
              <span style={s('display:block;font-size:11px;color:var(--s-faint);margin-top:2px')}>
                {hit.group}
                {hit.sub ? ` · ${hit.sub}` : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
