import { useEffect, useMemo, useRef, useState } from 'react'
import { PROJECTS } from '../../data/projects'
import { SKILL_INDEX } from '../../data/os'
import { RESUME_FILE } from '../../data/sections'
import { s } from '../css'
import { TITLES } from '../registry'
import { useDispatch, useOpenApp, useOs } from '../store'
import { useTheme } from '../useTheme'
import type { AppId, Theme } from '../types'

type Result = {
  title: string
  kind: string
  score: number
  run: () => void
}

const APPLICATIONS: AppId[] = ['finder', 'terminal', 'sumit-ai', 'contact', 'settings', 'code', 'trash']

/** Prefix beats substring beats subsequence; anything else is not a match. */
export function fuzzy(query: string, text: string): number {
  const t = text.toLowerCase()
  const i = t.indexOf(query)
  if (i === 0) return 100
  if (i > 0) return 70 - i
  let qi = 0
  for (let c = 0; c < t.length && qi < query.length; c++) if (t[c] === query[qi]) qi++
  return qi === query.length ? 30 : -1
}

export function Spotlight() {
  const { spotlight } = useOs()
  const dispatch = useDispatch()
  const openApp = useOpenApp()
  const { accent } = useTheme()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!spotlight) {
      setQuery('')
      setIndex(0)
      return
    }
    inputRef.current?.focus()
  }, [spotlight])

  const setTheme = (theme: Theme) => dispatch({ type: 'prefs', patch: { theme } })

  const actions = useMemo<Omit<Result, 'score'>[]>(
    () => [
      {
        title: 'Download Resume',
        kind: 'Action',
        run: () => {
          const a = document.createElement('a')
          a.href = RESUME_FILE
          a.download = 'Sumit_Jadhav_Resume.pdf'
          a.click()
        },
      },
      { title: 'Open Workspace', kind: 'Action', run: () => openApp('finder') },
      { title: 'Open Projects', kind: 'Action', run: () => openApp('finder-projects') },
      { title: 'Open Shell', kind: 'Action', run: () => openApp('terminal') },
      { title: 'Open Code', kind: 'Action', run: () => openApp('code') },
      { title: 'Open System', kind: 'Action', run: () => openApp('settings') },
      { title: 'Contact Sumit', kind: 'Action', run: () => openApp('contact') },
      { title: 'Appearance: Light', kind: 'Action', run: () => setTheme('light') },
      { title: 'Appearance: Dark', kind: 'Action', run: () => setTheme('dark') },
      { title: 'Appearance: System', kind: 'Action', run: () => setTheme('system') },
    ],
    // openApp and dispatch are stable for the lifetime of the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out: (Result & { key: string })[] = []

    for (const id of Object.keys(TITLES) as AppId[]) {
      const kind = id.startsWith('project-')
        ? 'Project'
        : APPLICATIONS.includes(id)
          ? 'Application'
          : 'Portfolio'
      const score = fuzzy(q, TITLES[id])
      if (score > 0) {
        out.push({
          key: `open:${id}`,
          title: TITLES[id],
          kind,
          score: score + (kind === 'Project' ? 4 : 0),
          run: () => openApp(id),
        })
      }
    }

    for (const action of actions) {
      const score = fuzzy(q, action.title)
      if (score > 0) out.push({ ...action, key: `action:${action.title}`, score: score - 4 })
    }

    for (const project of PROJECTS) {
      let best: { tag: string; score: number } | null = null
      for (const tag of project.stack) {
        const score = fuzzy(q, tag)
        if (score > 0 && (!best || score > best.score)) best = { tag, score }
      }
      if (best) {
        out.push({
          key: `open:${project.id}`,
          title: project.title,
          kind: `Uses ${best.tag}`,
          score: best.score - 3,
          run: () => openApp(project.id as AppId),
        })
      }
    }

    for (const skill of SKILL_INDEX) {
      const score = fuzzy(q, skill)
      if (score > 0) {
        out.push({
          key: 'open:skills',
          title: skill,
          kind: 'Skill',
          score: score - 10,
          run: () => openApp('skills'),
        })
      }
    }

    // Keep the best-scoring entry per target, as the original dedupe did.
    const best = new Map<string, Result & { key: string }>()
    for (const r of out) {
      const seen = best.get(r.key)
      if (!seen || r.score > seen.score) best.set(r.key, r)
    }
    return [...best.values()].sort((a, b) => b.score - a.score).slice(0, 9)
  }, [query, actions, openApp])

  useEffect(() => setIndex(0), [query])

  if (!spotlight) return null

  const pick = (r: Result) => {
    r.run()
    dispatch({ type: 'overlay', name: 'spotlight', on: false })
  }

  return (
    <div
      id="spotlight"
      onClick={() => dispatch({ type: 'overlay', name: 'spotlight', on: false })}
      style={s(
        'position:absolute;inset:0;z-index:300;background:rgba(0,0,0,.35);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);display:flex;align-items:flex-start;justify-content:center;padding-top:16vh',
      )}
    >
      <div
        id="spotlight-box"
        onClick={(e) => e.stopPropagation()}
        style={s(
          'width:min(600px,86vw);border-radius:14px;overflow:hidden;background:var(--s-pop);backdrop-filter:var(--s-blur);-webkit-backdrop-filter:var(--s-blur);border:1px solid var(--s-line);box-shadow:var(--s-shadow-pop);color:var(--s-text)',
        )}
      >
        <div style={s('display:flex;align-items:center;gap:12px;padding:14px 18px')}>
          <div style={s('width:19px;height:19px;position:relative;flex:none;opacity:.6')}>
            <div
              style={s('position:absolute;left:0;top:0;width:14px;height:14px;border:2px solid currentColor;border-radius:50%')}
            />
            <div
              style={s(
                'position:absolute;left:11px;top:12px;width:8px;height:2px;background:currentColor;border-radius:2px;transform:rotate(45deg);transform-origin:left center',
              )}
            />
          </div>
          <input
            id="spotlight-input"
            ref={inputRef}
            type="text"
            autoComplete="off"
            placeholder="Search this portfolio"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (!results.length) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setIndex((i) => (i + 1) % results.length)
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setIndex((i) => (i - 1 + results.length) % results.length)
              } else if (e.key === 'Enter') {
                e.preventDefault()
                pick(results[Math.max(0, index)])
              }
            }}
            style={s(
              'flex:1;background:transparent;border:none;outline:none;color:var(--s-text);font-size:21px;font-family:inherit',
            )}
          />
        </div>
        {query.trim() ? (
          <div id="spotlight-results" style={s('max-height:340px;overflow:auto;border-top:1px solid var(--s-line)')}>
            {results.length ? (
              results.map((r, i) => (
                <div
                  key={`${r.title}-${r.kind}`}
                  data-spot={i}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => pick(r)}
                  style={{
                    ...s('padding:11px 18px;display:flex;align-items:center;gap:12px;font-size:14px;cursor:default'),
                    background: i === index ? accent : 'transparent',
                    color: i === index ? '#fff' : 'var(--s-text)',
                  }}
                >
                  <span style={s('flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>
                    {r.title}
                  </span>
                  <span
                    style={{
                      ...s('font-size:11.5px'),
                      color: i === index ? 'rgba(255,255,255,.8)' : 'var(--s-faint)',
                    }}
                  >
                    {r.kind}
                  </span>
                </div>
              ))
            ) : (
              <div style={s('padding:16px 18px;color:var(--s-faint)')}>No results</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
