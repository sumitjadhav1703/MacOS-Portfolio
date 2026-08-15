'use client'

import { useEffect, useRef, useState } from 'react'
import { PROJECTS } from '../../data/projects'
import { PROFILE_LINKS } from '../../data/profile'
import { s } from '../css'
import { useTheme } from '../useTheme'

type Site = { label: string; url: string; from: string }

/** Everything worth visiting, gathered from the same data the windows render. */
const SITES: Site[] = [
  ...PROJECTS.flatMap((project) =>
    project.links.map((link) => ({ label: link.label, url: link.url, from: project.title })),
  ),
  ...PROFILE_LINKS.filter((link) => link.pill).map((link) => ({
    label: link.label,
    url: link.url,
    from: 'Profile',
  })),
]

const CHROME =
  'flex:none;display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--s-line);background:var(--s-chrome)'
const NAV_BTN =
  'width:26px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:13px;cursor:default'

export function Safari() {
  const { accent } = useTheme()
  const [history, setHistory] = useState<(string | null)[]>([null])
  const [at, setAt] = useState(0)
  // Sites that refuse to be framed never fire `load`; a timer decides they are blocked.
  const [blocked, setBlocked] = useState(false)
  const timer = useRef<number>(0)

  const url = history[at]
  const site = SITES.find((entry) => entry.url === url)

  useEffect(() => {
    window.clearTimeout(timer.current)
    if (!url) return
    setBlocked(false)
    timer.current = window.setTimeout(() => setBlocked(true), 2500)
    return () => window.clearTimeout(timer.current)
  }, [url])

  function go(next: string | null) {
    const trimmed = history.slice(0, at + 1)
    setHistory([...trimmed, next])
    setAt(trimmed.length)
  }

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
                  <div style={s('font-weight:600;font-size:13px')}>{entry.label}</div>
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
        ) : blocked ? (
          <div
            style={s(
              'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:32px;text-align:center;background:var(--s-win)',
            )}
          >
            <div style={s('font-size:15px;font-weight:600')}>{site?.label ?? 'This site'} blocks embedding</div>
            <div style={s('color:var(--s-dim);font-size:12.5px;max-width:420px;line-height:1.6')}>
              The host refuses to load inside a frame, which most code hosts and demo
              platforms do. Open it in a real tab instead.
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...s(
                  'padding:9px 16px;border-radius:10px;color:#fff;font-weight:600;font-size:12.5px;text-decoration:none',
                ),
                background: accent,
              }}
            >
              Open {url.replace(/^https?:\/\//, '').split('/')[0]}
            </a>
            <span
              role="button"
              onClick={() => go(null)}
              style={s(
                'padding:8px 14px;border-radius:9px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:12px;cursor:default',
              )}
            >
              Back to start page
            </span>
          </div>
        ) : (
          <iframe
            key={url}
            src={url}
            title={site?.label ?? url}
            onLoad={() => {
              window.clearTimeout(timer.current)
              setBlocked(false)
            }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            style={s('position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff')}
          />
        )}
      </div>
    </div>
  )
}
