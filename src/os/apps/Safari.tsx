'use client'

import { useEffect, useRef, useState } from 'react'
import { PlatformIcon, hostLabel } from '../../lib/icons'
import { embedUrl } from '../../lib/frame'
import { useContent } from '../content'
import { s } from '../css'
import { useTheme } from '../useTheme'
import { useAppCommand } from '../cmd'
import { pressable } from '../pressable'

const CHROME =
  'flex:none;display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid var(--s-line);background:var(--s-chrome)'
const NAV_BTN =
  'width:26px;height:24px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:7px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:13px;cursor:default'
const CHIP =
  'display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:12px;cursor:default'
const BUTTON = 'padding:6px 12px;border-radius:8px;font-weight:600;text-decoration:none;font-size:12.5px'

/** Typed text that reads as an address — a dot, no spaces — becomes a URL; anything else is a search. */
function asUrl(text: string): string | null {
  const t = text.trim()
  if (/^https?:\/\//i.test(t)) return t
  if (/^[^\s/]+\.[^\s/]{2,}(\/\S*)?$/.test(t)) return `https://${t}`
  return null
}

type Frame = boolean | null | 'checking'

export function Safari() {
  const { accent } = useTheme()
  const content = useContent()
  const [history, setHistory] = useState<(string | null)[]>([null])
  const [at, setAt] = useState(0)
  const [typed, setTyped] = useState('')
  const [query, setQuery] = useState('')
  const [reloads, setReloads] = useState(0)
  const [frame, setFrame] = useState<Frame>('checking')
  // A refusal cannot be seen from inside the browser (AGENTS.md rule 7), so the headers are read
  // server-side first. When that check cannot answer, the app frames optimistically and, after a
  // beat, offers the way out a refusal would need.
  const [hint, setHint] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const verdicts = useRef(new Map<string, boolean | null>())

  const url = history[at] ?? null

  useEffect(() => {
    setTyped(url ?? '')
    setHint(false)
    setDismissed(false)
    if (!url) return
    const known = verdicts.current.get(url)
    setFrame(known === undefined ? 'checking' : known)
    const ctrl = new AbortController()
    if (known === undefined) {
      fetch(`/api/frame-check?url=${encodeURIComponent(embedUrl(url))}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { frameable: null }))
        .then((body: { frameable: boolean | null }) => {
          verdicts.current.set(url, body.frameable)
          setFrame(body.frameable)
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setFrame(null)
        })
    }
    const timer = window.setTimeout(() => setHint(true), 2500)
    return () => {
      ctrl.abort()
      window.clearTimeout(timer)
    }
  }, [url])

  function go(next: string | null) {
    if (next && !/^https?:/i.test(next)) {
      window.location.href = next
      return
    }
    const trimmed = history.slice(0, at + 1)
    setHistory([...trimmed, next])
    setAt(trimmed.length)
    setQuery('')
  }
  const back = () => at > 0 && setAt(at - 1)
  const forward = () => at < history.length - 1 && setAt(at + 1)

  // The Go menu drives the same controls the toolbar has, and is greyed out at the ends of the
  // history for the same reason they are.
  useAppCommand('safari', (cmd) => {
    if (cmd === 'back') back()
    if (cmd === 'forward') forward()
    if (cmd === 'home') go(null)
  })

  function submit() {
    const next = asUrl(typed)
    if (next) return go(next)
    if (url) go(null)
    setQuery(typed.trim())
  }

  const q = query.toLowerCase()
  const projects = content.projects.filter(
    (p) =>
      p.links.length > 0 &&
      (!q || [p.title, p.tagline, ...p.links.map((l) => l.label)].some((t) => t.toLowerCase().includes(q))),
  )
  const profile = content.socialLinks.filter((l) => l.pill && (!q || l.label.toLowerCase().includes(q)))
  const host = url ? hostLabel(url) : ''

  return (
    <div style={s('height:100%;display:flex;flex-direction:column;background:var(--s-win)')}>
      <div style={s(CHROME)}>
        <span {...pressable('Back', back)} style={{ ...s(NAV_BTN), opacity: at > 0 ? 1 : 0.4 }}>
          ‹
        </span>
        <span {...pressable('Forward', forward)} style={{ ...s(NAV_BTN), opacity: at < history.length - 1 ? 1 : 0.4 }}>
          ›
        </span>
        <span
          {...pressable('Reload', () => url && setReloads((n) => n + 1))}
          style={{ ...s(NAV_BTN), opacity: url ? 1 : 0.4 }}
        >
          ↻
        </span>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          style={s(
            'flex:1;display:flex;align-items:center;gap:8px;padding:4px 12px;border-radius:999px;background:var(--s-input);border:1px solid var(--s-line);min-width:0;margin-left:4px',
          )}
        >
          {url ? <PlatformIcon url={url} size={12} /> : <span style={{ ...s('width:6px;height:6px;border-radius:50%;flex:none'), background: accent }} />}
          <input
            aria-label="Address"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="Search projects or enter a website"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            style={s('flex:1;min-width:0;border:0;outline:none;background:transparent;color:var(--s-text);font:inherit;font-size:12.5px;padding:2px 0')}
          />
        </form>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open in new tab"
            title="Open in new tab"
            style={{ ...s(NAV_BTN), color: 'var(--s-text)', textDecoration: 'none', width: 'auto', padding: '0 9px', fontSize: '12px' }}
          >
            ↗
          </a>
        ) : null}
      </div>

      <div style={s('flex:1;position:relative;overflow:auto;background:var(--s-win)')}>
        {!url ? (
          <div style={s('padding:24px 26px 30px;display:flex;flex-direction:column;gap:14px;max-width:1100px;margin:0 auto')}>
            {profile.length ? (
              <>
                <div style={s('font-size:17px;font-weight:700;letter-spacing:-.01em')}>Favourites</div>
                <div style={s('display:flex;flex-wrap:wrap;gap:18px')}>
                  {profile.map((link) => (
                    <div
                      key={link.url}
                      {...pressable(link.label, () => go(link.url))}
                      style={s('width:72px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:default')}
                    >
                      <span
                        style={s(
                          'width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:var(--s-fill);border:1px solid var(--s-line)',
                        )}
                      >
                        <PlatformIcon url={link.url} size={24} />
                      </span>
                      <span style={s('font-size:11.5px;color:var(--s-dim);text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%')}>
                        {link.label}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            <div style={s('font-size:17px;font-weight:700;letter-spacing:-.01em;margin-top:10px')}>
              {q ? `Projects matching “${query}”` : 'Projects'}
            </div>
            {projects.length ? (
              <div style={s('display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:12px')}>
                {projects.map((project) => (
                  <div
                    key={project.id}
                    data-safari-project=""
                    style={s('padding:14px 16px;border-radius:13px;background:var(--s-fill);border:1px solid var(--s-line);display:flex;flex-direction:column;gap:6px;min-width:0')}
                  >
                    <div style={s('font-weight:650;font-size:13.5px')}>{project.title}</div>
                    <div style={s('color:var(--s-dim);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>
                      {project.tagline}
                    </div>
                    <div style={s('display:flex;flex-wrap:wrap;gap:6px;margin-top:6px')}>
                      {project.links.map((link) => (
                        <span key={link.url} {...pressable(`${link.label} — ${project.title}`, () => go(link.url))} style={s(CHIP)}>
                          <PlatformIcon url={link.url} size={12} />
                          {link.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={s('color:var(--s-dim);font-size:13px')}>
                No project matches “{query}”.{' '}
                <a href={`https://duckduckgo.com/?q=${encodeURIComponent(query)}`} target="_blank" rel="noopener noreferrer">
                  Search the web ↗
                </a>
              </div>
            )}
            <div style={s('color:var(--s-faint);font-size:12px;margin-top:6px')}>
              Type any address above to open it. Sites that refuse to be embedded open in a new tab.
            </div>
          </div>
        ) : frame === false ? (
          <div style={s('min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px')}>
            <div
              style={s(
                'max-width:380px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;padding:28px 26px;border-radius:16px;background:var(--s-fill);border:1px solid var(--s-line)',
              )}
            >
              <PlatformIcon url={url} size={34} />
              <div style={s('font-weight:700;font-size:16px')}>{host} opens in its own tab</div>
              <div style={s('color:var(--s-dim);font-size:12.5px;line-height:1.5')}>
                {host} doesn’t allow being shown inside other sites, so it can’t load in this window.
              </div>
              <div style={s('display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:4px')}>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...s(BUTTON), color: '#fff', background: accent }}>
                  Open {host} ↗
                </a>
                <span {...pressable('Back to Start Page', () => go(null))} style={s(`${BUTTON};background:var(--s-fill-2);border:1px solid var(--s-line);cursor:default`)}>
                  Start Page
                </span>
              </div>
            </div>
          </div>
        ) : frame === 'checking' ? (
          <div style={s('min-height:100%;display:flex;align-items:center;justify-content:center;color:var(--s-dim);font-size:12.5px')}>
            Loading {host}…
          </div>
        ) : (
          <>
            <iframe
              key={`${url}#${reloads}`}
              src={embedUrl(url)}
              title={host}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              style={s('position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff')}
            />
            {frame === null && hint && !dismissed ? (
              <div
                style={s(
                  'position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;flex-wrap:wrap;gap:10px;padding:11px 14px;background:var(--s-chrome);border-top:1px solid var(--s-line);font-size:12px',
                )}
              >
                <PlatformIcon url={url} size={14} />
                <span style={s('color:var(--s-dim);flex:1;min-width:140px')}>
                  Nothing showing? {host} may refuse to load inside a frame.
                </span>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...s(BUTTON), color: '#fff', background: accent }}>
                  Open {host}
                </a>
                <span {...pressable('Dismiss', () => setDismissed(true))} style={s('padding:6px 9px;border-radius:8px;color:var(--s-dim);cursor:default')}>
                  ✕
                </span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
