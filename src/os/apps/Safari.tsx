'use client'

import { useEffect, useRef, useState } from 'react'
import { PlatformIcon, hostLabel } from '../../lib/icons'
import { useContent } from '../content'
import type { Content } from '../../data/content'
import { s } from '../css'
import { useTheme } from '../useTheme'
import { useAppCommand } from '../cmd'

type Site = { label: string; url: string; from: string }

/** Everything worth visiting, gathered from the same content the windows render. */
function sitesFrom(content: Content): Site[] {
  return [
    ...content.projects.flatMap((project) =>
      project.links.map((link) => ({ label: link.label, url: link.url, from: project.title })),
    ),
    ...content.socialLinks
      .filter((link) => link.pill)
      .map((link) => ({ label: link.label, url: link.url, from: 'Profile' })),
  ]
}

const CHROME =
  'flex:none;display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--s-line);background:var(--s-chrome)'
const NAV_BTN =
  'width:26px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:13px;cursor:default'

export function Safari() {
  const { accent } = useTheme()
  const SITES = sitesFrom(useContent())
  const [history, setHistory] = useState<(string | null)[]>([null])
  const [at, setAt] = useState(0)
  // A host that refuses to be framed cannot be detected from here. The browser fires `load`
  // for the refusal exactly as it does for a real document, and `contentDocument` is null in
  // both cases — measured against a frameable host and a refusing one side by side. So the
  // app stops guessing: it frames optimistically and, after a beat, offers the way out that a
  // refusal would need. Guessing wrong used to leave every code host as a blank white pane.
  const [hint, setHint] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const timer = useRef<number>(0)

  const url = history[at]
  const site = SITES.find((entry) => entry.url === url)

  useEffect(() => {
    window.clearTimeout(timer.current)
    setHint(false)
    setDismissed(false)
    if (!url) return
    timer.current = window.setTimeout(() => setHint(true), 2000)
    return () => window.clearTimeout(timer.current)
  }, [url])

  function go(next: string | null) {
    const trimmed = history.slice(0, at + 1)
    setHistory([...trimmed, next])
    setAt(trimmed.length)
  }

  // The Go menu drives the same three controls the toolbar has, and is greyed out at the ends
  // of the history for the same reason they are.
  useAppCommand('safari', (cmd) => {
    if (cmd === 'back' && at > 0) setAt(at - 1)
    if (cmd === 'forward' && at < history.length - 1) setAt(at + 1)
    if (cmd === 'home') go(null)
  })

  return (
    <div style={s('height:100%;display:flex;flex-direction:column;background:var(--s-win)')}>
      <div style={s(CHROME)}>
        <span
          role="button"
          aria-label="Back"
          style={{ ...s(NAV_BTN), opacity: at > 0 ? 1 : 0.4 }}
          onClick={() => at > 0 && setAt(at - 1)}
        >
          ‹
        </span>
        <span
          role="button"
          aria-label="Forward"
          style={{ ...s(NAV_BTN), opacity: at < history.length - 1 ? 1 : 0.4 }}
          onClick={() => at < history.length - 1 && setAt(at + 1)}
        >
          ›
        </span>
        <div
          style={s(
            'flex:1;display:flex;align-items:center;gap:8px;padding:5px 12px;border-radius:999px;background:var(--s-input);border:1px solid var(--s-line);font-size:12px;color:var(--s-dim);min-width:0',
          )}
        >
          <span style={{ ...s('width:6px;height:6px;border-radius:50%;flex:none'), background: accent }} />
          <span style={s('overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>
            {url ?? 'Start Page'}
          </span>
        </div>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={s(
              'padding:5px 11px;border-radius:8px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:12px;text-decoration:none;color:var(--s-text)',
            )}
          >
            Open in new tab
          </a>
        ) : null}
      </div>

      <div style={s('flex:1;position:relative;overflow:auto;background:var(--s-paper-desk)')}>
        {!url ? (
          <div style={s('padding:26px 28px;display:flex;flex-direction:column;gap:16px;background:var(--s-win);min-height:100%')}>
            <div style={s('font-size:20px;font-weight:700;letter-spacing:-.01em')}>Favourites</div>
            <div
              style={s(
                'display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px',
              )}
            >
              {SITES.map((entry) => (
                <div
                  key={entry.url}
                  role="button"
                  onClick={() => go(entry.url)}
                  style={s(
                    'padding:14px 16px;border-radius:13px;background:var(--s-fill);border:1px solid var(--s-line);cursor:default',
                  )}
                >
                  <div style={s('display:flex;align-items:center;gap:8px;font-weight:600;font-size:13px')}>
                    <PlatformIcon url={entry.url} size={14} />
                    {entry.label}
                  </div>
                  <div
                    style={s(
                      'color:var(--s-dim);font-size:11.5px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap',
                    )}
                  >
                    {entry.url.replace(/^https?:\/\//, '')}
                  </div>
                  <div style={s('color:var(--s-faint);font-size:11px;margin-top:8px')}>{entry.from}</div>
                </div>
              ))}
            </div>
            <div style={s('color:var(--s-faint);font-size:12px;margin-top:4px')}>
              Live demos and repositories, pulled from the same project data the windows use.
            </div>
          </div>
        ) : (
          <>
            <iframe
              key={url}
              src={url}
              title={site?.label ?? url}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              style={s('position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff')}
            />
            {hint && !dismissed ? (
              <div
                style={s(
                  'position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;flex-wrap:wrap;gap:10px;padding:11px 14px;background:var(--s-chrome);border-top:1px solid var(--s-line);font-size:12px',
                )}
              >
                <PlatformIcon url={url} size={14} />
                <span style={s('color:var(--s-dim);flex:1;min-width:140px')}>
                  Nothing showing? {hostLabel(url)} may refuse to load inside a frame — most code
                  hosts do.
                </span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...s(
                      'padding:6px 12px;border-radius:8px;color:#fff;font-weight:600;text-decoration:none',
                    ),
                    background: accent,
                  }}
                >
                  Open {hostLabel(url)}
                </a>
                <span
                  role="button"
                  onClick={() => go(null)}
                  style={s(
                    'padding:6px 11px;border-radius:8px;background:var(--s-fill-2);border:1px solid var(--s-line);cursor:default',
                  )}
                >
                  Start page
                </span>
                <span
                  role="button"
                  aria-label="Dismiss"
                  onClick={() => setDismissed(true)}
                  style={s('padding:6px 9px;border-radius:8px;color:var(--s-dim);cursor:default')}
                >
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
