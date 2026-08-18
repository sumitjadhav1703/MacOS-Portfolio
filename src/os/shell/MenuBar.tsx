'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useContent } from '../content'
import { platformSlug } from '../../lib/icons'
import { s } from '../css'
import { titleOf } from '../registry'
import { useDispatch, useOpenApp, useOs } from '../store'
import { useTheme } from '../useTheme'
import { Popovers } from './Popovers'
import { menusFor, type MenuCtx } from './appMenus'
import { MENU_SURFACE, MenuEntries } from './menu'
import type { MenuEntry, MenuName } from '../types'

const DROPDOWN = `position:absolute;top:26px;left:0;z-index:10;${MENU_SURFACE}`

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
      style={{
        ...s('padding:2px 9px;border-radius:5px;cursor:default;position:relative;display:flex;align-items:center'),
        background: open ? 'var(--s-fill-3)' : 'transparent',
      }}
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
      {now
        ? `${now.toLocaleDateString([], { weekday: 'short' })} ${now.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}`
        : '—'}
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
  const { active, wins, prefs, status, activity, finderPath } = useOs()
  const dispatch = useDispatch()
  const openApp = useOpenApp()
  const { accent } = useTheme()
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
        'position:absolute;top:0;left:0;right:0;height:28px;border-bottom:1px solid var(--s-menu-line);box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;padding:0 14px;z-index:200;font-size:13px;color:var(--s-menu-fg);text-shadow:var(--s-menu-shadow);background:var(--s-menu-bg);backdrop-filter:var(--s-blur);-webkit-backdrop-filter:var(--s-blur);transition:background .4s ease,color .4s ease',
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
          style={s(
            'display:flex;align-items:center;gap:6px;padding:2px 10px;border-radius:6px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:12px;text-decoration:none;color:inherit',
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
            style={s('cursor:default;display:flex;align-items:center;gap:6px;padding:2px 7px;border-radius:5px')}
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ type: 'popover', name: 'status' })
            }}
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
            style={s('cursor:default;display:flex;align-items:center;gap:5px;padding:2px 6px;border-radius:5px')}
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ type: 'popover', name: 'activity' })
            }}
          >
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
          </div>
        ) : null}

        <div
          style={s('cursor:default;display:flex;flex-direction:column;gap:3px;padding:3px 2px')}
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'overlay', name: 'controlCenter' })
          }}
          role="button"
          aria-label="Control Center"
        >
          <div style={s('width:16px;height:2.5px;border-radius:2px;background:currentColor;opacity:.9')} />
          <div style={s('width:16px;height:2.5px;border-radius:2px;background:currentColor;opacity:.9')} />
        </div>

        <div
          style={s('cursor:default;width:14px;height:14px;position:relative')}
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'overlay', name: 'spotlight', on: true })
          }}
          role="button"
          aria-label="Search"
        >
          <div
            style={s(
              'position:absolute;left:0;top:0;width:10px;height:10px;border:1.8px solid currentColor;border-radius:50%;opacity:.92',
            )}
          />
          <div
            style={s(
              'position:absolute;left:8px;top:9px;width:6px;height:1.8px;background:currentColor;border-radius:2px;transform:rotate(45deg);transform-origin:left center;opacity:.92',
            )}
          />
        </div>

        <div
          data-menu="cal"
          style={s('cursor:default;position:relative;padding:2px 4px;border-radius:5px')}
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'overlay', name: 'notifCenter' })
          }}
        >
          <Clock />
        </div>
      </div>

      <Popovers accent={accent} />
    </div>
  )
}
