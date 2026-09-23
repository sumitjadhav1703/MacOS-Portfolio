'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useContent } from '../content'
import { platformSlug } from '../../lib/icons'
import { s } from '../css'
import { pressable } from '../pressable'
import { titleOf } from '../registry'
import { useDispatch, useOpenApp, useOs } from '../store'
import { useOnline } from '../useMedia'
import { Popovers } from './Popovers'
import { menusFor, type MenuCtx } from './appMenus'
import { MENU_SURFACE, MenuEntries } from './menu'
import type { MenuEntry, MenuName } from '../types'

const DROPDOWN = `position:absolute;top:calc(100% + 4px);left:0;z-index:10;${MENU_SURFACE}`

function Menu({
  name,
  label,
  width,
  children,
}: {
  name: MenuName
  label: ReactNode
  width: number
  children: ReactNode
}) {
  const { menu } = useOs()
  const dispatch = useDispatch()
  const open = menu === name
  return (
    <div
      data-menu={name}
      data-extra="1"
      data-open={open ? '1' : undefined}
      // No inline `background`. It used to say `transparent` when closed, and an inline
      // declaration outranks a stylesheet one — so `[data-menu]:hover` in os.css has been
      // there the whole time and has never once painted. os.css owns both states now.
      style={s(
        'padding:2px 9px;border-radius:5px;cursor:default;position:relative;display:flex;align-items:center',
      )}
      onClick={(e) => {
        e.stopPropagation()
        dispatch({ type: 'menu', name: open ? null : name })
      }}
    >
      {label}
      {open ? <div style={{ ...s(DROPDOWN), minWidth: width }}>{children}</div> : null}
    </div>
  )
}

function Clock() {
  // The clock only exists once mounted: prerendered time never matches the visitor's.
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    // Ten-second tick: enough for a minute-precision clock, cheap enough to ignore.
    const t = window.setInterval(() => setNow(new Date()), 10_000)
    return () => window.clearInterval(t)
  }, [])
  return (
    <span id="clock" style={s('font-variant-numeric:tabular-nums')} suppressHydrationWarning>
      {now ? `${deskDate(now)} ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : '—'}
    </span>
  )
}

/** One switch of the Control Center glyph: a pill track with the knob at one end. */
function Toggle({ knob }: { knob: 'left' | 'right' }) {
  return (
    <span
      style={s(
        'position:relative;display:block;width:15px;height:6.5px;border-radius:999px;border:1.2px solid currentColor;opacity:.9',
      )}
    >
      <span
        style={{
          ...s('position:absolute;top:1px;width:2.5px;height:2.5px;border-radius:50%;background:currentColor'),
          [knob]: '1px',
        }}
      />
    </span>
  )
}

/**
 * The date, the way the menu bar writes it: `Wed Sep 16`, no comma.
 *
 * `toLocaleDateString` punctuates for prose — en-US returns `Wed, Sep 16` — and macOS never
 * puts a comma after the weekday. Dropping the formatter's literal separators keeps the
 * locale's own field *order* (a de-DE visitor still gets `Mi 16 Sept`) without its commas.
 */
function deskDate(now: Date): string {
  return new Intl.DateTimeFormat([], { weekday: 'short', day: 'numeric', month: 'short' })
    .formatToParts(now)
    .filter((part) => part.type !== 'literal')
    .map((part) => part.value)
    .join(' ')
}


/**
 * The Wi-Fi extra. Driven by `useOnline`, the same hook Control Center reads, so it is a
 * status indicator rather than a decoration.
 */
function Wifi({ onOpen, open }: { onOpen: () => void; open: boolean }) {
  const online = useOnline()
  return (
    <span
      data-menu="net"
      data-extra="1"
      data-open={open ? '1' : undefined}
      {...pressable(online ? 'Network — connected' : 'Network — offline', onOpen, {
        stopPropagation: true,
      })}
      style={s(
        'display:flex;align-items:center;cursor:default;padding:2px 6px;border-radius:5px',
      )}
    >
      <svg viewBox="0 0 16 13" width="15" height="12" aria-hidden="true" style={{ opacity: online ? 0.92 : 0.45 }}>
        <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1.2 4.1a10.4 10.4 0 0 1 13.6 0" />
          <path d="M3.8 6.9a6.6 6.6 0 0 1 8.4 0" />
          <path d="M6.3 9.6a2.9 2.9 0 0 1 3.4 0" />
          {online ? null : <path d="M2.4 12 13.6 1.4" />}
        </g>
        <circle cx="8" cy="11.6" r="1.05" fill="currentColor" />
      </svg>
    </span>
  )
}

/** Where "Copy GitHub URL" points when the CMS lists no GitHub link. */
const GITHUB_FALLBACK = 'https://github.com/sumitjadhav1703'

export function MenuBar() {
  const content = useContent()
  const site = content.site
  // The link the CMS holds, matched by the same host resolver that picks its icon — so
  // changing it in /admin changes the menu item with it.
  const githubUrl =
    content.socialLinks.find((link) => platformSlug(link.url) === 'github')?.url ?? GITHUB_FALLBACK
  const { active, wins, prefs, status, activity, finderPath, popover, spotlight, controlCenter, notifCenter } =
    useOs()
  const dispatch = useDispatch()
  const openApp = useOpenApp()
  const busy = activity === 'Working' || activity === 'Processing'

  const front = active
  const copy = (text: string, what: string) => {
    navigator.clipboard?.writeText(text)
    dispatch({ type: 'notify', title: 'Copied', msg: what })
  }
  const setTheme = (theme: 'light' | 'dark' | 'system') => {
    dispatch({ type: 'prefs', patch: { theme } })
    dispatch({
      type: 'notify',
      title: 'Appearance',
      msg:
        theme === 'system'
          ? 'Following your system setting'
          : `${theme[0].toUpperCase()}${theme.slice(1)} appearance`,
    })
  }

  const ctx: MenuCtx = {
    dispatch,
    openApp,
    front,
    wins,
    finderPath,
    email: site.email,
    resumeUrl: site.resumeUrl,
    githubUrl,
    copy,
  }

  // The one menu that never changes: it is the system's, not the focused app's.
  const appleEntries: MenuEntry[] = [
    { label: "About Sumit's Portfolio OS", onPick: () => openApp('about') },
    { divider: true },
    { label: 'System Settings…', onPick: () => openApp('settings') },
    { label: 'System Monitor', onPick: () => openApp('monitor') },
    { label: 'Project Interview', onPick: () => openApp('interview') },
    { label: 'View as Recruiter', onPick: () => window.location.assign('/recruiter') },
    { label: 'Control Center', onPick: () => dispatch({ type: 'overlay', name: 'controlCenter', on: true }) },
    { divider: true },
    { label: 'Appearance: Light', onPick: () => setTheme('light') },
    { label: 'Appearance: Dark', onPick: () => setTheme('dark') },
    { label: 'Appearance: System', onPick: () => setTheme('system') },
    { divider: true },
    { label: 'Sleep', onPick: () => dispatch({ type: 'power', state: 'sleep' }) },
    { label: 'Restart…', onPick: () => dispatch({ type: 'power', state: 'restart' }) },
    { label: 'Shut Down…', onPick: () => dispatch({ type: 'power', state: 'shutdown' }) },
  ]

  const closeMenu = () => dispatch({ type: 'menu', name: null })

  return (
    <div
      id="menubar"
      style={s(
        'position:absolute;top:0;left:0;right:0;height:var(--s-menubar-h);border-bottom:1px solid var(--s-menu-line);box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;padding:0 14px;z-index:var(--z-menubar);font-size:13px;color:var(--s-menu-fg);text-shadow:var(--s-menu-shadow);background:var(--s-menu-bg);backdrop-filter:var(--s-blur);-webkit-backdrop-filter:var(--s-blur);transition:background .4s ease,color .4s ease',
      )}
    >
      <div style={s('display:flex;align-items:center;gap:2px')}>
        <Menu
          name="apple"
          width={220}
          label={<div style={s('font-size:11.5px;font-weight:700;letter-spacing:.06em')}>SJ</div>}
        >
          <MenuEntries entries={appleEntries} onDone={closeMenu} />
        </Menu>

        <div id="menu-app-name" style={s('font-weight:700;padding:2px 8px;cursor:default')}>
          {front ? titleOf(front).split(' — ')[0] : 'Workspace'}
        </div>

        {menusFor(front, ctx).map((menu) => (
          <Menu key={menu.name} name={menu.name} label={menu.label} width={menu.width}>
            <MenuEntries entries={menu.entries} onDone={closeMenu} />
          </Menu>
        ))}
      </div>

      <div style={s('display:flex;align-items:center;gap:13px')}>
        <a
          href={site.resumeUrl}
          download="Sumit_Jadhav_Resume.pdf"
          data-focusable="1"
          data-menubtn="1"
          // Background and border live in os.css for the same reason as the menus above: an
          // inline fill cannot be hovered over.
          style={s(
            'display:flex;align-items:center;gap:6px;padding:2px 10px;border-radius:6px;font-size:12px;text-decoration:none;color:inherit',
          )}
        >
          <span style={s('position:relative;display:inline-block;width:9px;height:10px')}>
            <span style={s('position:absolute;left:3.5px;top:0;width:2px;height:6px;background:currentColor')} />
            <span
              style={s(
                'position:absolute;left:1px;top:4px;width:7px;height:4px;border-left:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(-45deg) scale(.9);transform-origin:center',
              )}
            />
          </span>
          Resume
        </a>

        {prefs.showStatus ? (
          <div
            data-menu="status"
            data-extra="1"
            data-open={popover === 'status' ? '1' : undefined}
            {...pressable(`Status — ${status}`, () => dispatch({ type: 'popover', name: 'status' }), {
              stopPropagation: true,
            })}
            style={s('cursor:default;display:flex;align-items:center;gap:6px;padding:2px 7px;border-radius:5px')}
          >
            <span
              id="status-dot"
              style={{
                ...s('width:7px;height:7px;border-radius:50%'),
                background: status === 'Offline' ? 'var(--s-warn)' : 'var(--s-ok)',
                animation: busy ? 'pulseDot 1.1s ease-in-out infinite' : 'none',
              }}
            />
            <span id="status-word" style={s('font-size:12px')}>
              {status}
            </span>
          </div>
        ) : null}

        {prefs.showActivity ? (
          <div
            data-menu="activity"
            data-extra="1"
            data-open={popover === 'activity' ? '1' : undefined}
            {...pressable(`Activity — ${activity}`, () => dispatch({ type: 'popover', name: 'activity' }), {
              stopPropagation: true,
            })}
            style={s('cursor:default;display:flex;align-items:center;gap:5px;padding:2px 6px;border-radius:5px')}
          >
            {/* The cap is flush against the body. As a sibling of the row's 5px gap it read
                as a stray tick floating beside the battery rather than part of it. */}
            <span style={s('display:flex;align-items:center;gap:1px')}>
              <span
                style={s(
                  'position:relative;display:inline-block;width:23px;height:12px;border:1.4px solid currentColor;border-radius:3px;opacity:.85',
                )}
              >
                <span
                  id="act-fill"
                  style={{
                    ...s(
                      'position:absolute;left:1.5px;top:1.5px;bottom:1.5px;border-radius:1.5px;background:currentColor;transition:width .5s cubic-bezier(.32,.72,0,1)',
                    ),
                    width: activity === 'Idle' ? '34%' : activity === 'Ready' ? '70%' : activity === 'Working' ? '88%' : '100%',
                  }}
                />
              </span>
              <span style={s('width:2px;height:5px;border-radius:0 2px 2px 0;background:currentColor;opacity:.6')} />
            </span>
          </div>
        ) : null}

        <Wifi open={popover === 'net'} onOpen={() => dispatch({ type: 'popover', name: 'net' })} />

        {/* Two stacked toggle switches, which is what macOS draws. Two plain bars read as a
            hamburger menu — the one glyph in this bar that promised the wrong thing. */}
        <div
          data-extra="1"
          data-open={controlCenter ? '1' : undefined}
          style={s(
            'cursor:default;display:flex;flex-direction:column;gap:2.5px;padding:4px 7px;border-radius:5px',
          )}
          {...pressable('Control Center', () => dispatch({ type: 'overlay', name: 'controlCenter' }), {
            stopPropagation: true,
          })}
        >
          <Toggle knob="right" />
          <Toggle knob="left" />
        </div>

        <div
          data-extra="1"
          data-open={spotlight ? '1' : undefined}
          style={s(
            'cursor:default;position:relative;width:28px;height:20px;border-radius:5px;display:flex;align-items:center;justify-content:center',
          )}
          {...pressable('Search', () => dispatch({ type: 'overlay', name: 'spotlight' }), {
            stopPropagation: true,
          })}
        >
          <span style={s('position:relative;width:14px;height:14px')}>
            <span
              style={s(
                'position:absolute;left:0;top:0;width:10px;height:10px;border:1.8px solid currentColor;border-radius:50%;opacity:.92',
              )}
            />
            <span
              style={s(
                'position:absolute;left:8px;top:9px;width:6px;height:1.8px;background:currentColor;border-radius:2px;transform:rotate(45deg);transform-origin:left center;opacity:.92',
              )}
            />
          </span>
        </div>

        <div
          data-menu="cal"
          data-extra="1"
          data-open={notifCenter ? '1' : undefined}
          {...pressable('Notification Center', () => dispatch({ type: 'overlay', name: 'notifCenter' }), {
            stopPropagation: true,
          })}
          style={s('cursor:default;position:relative;padding:2px 4px;border-radius:5px')}
        >
          <Clock />
        </div>
      </div>

      <Popovers />
    </div>
  )
}
