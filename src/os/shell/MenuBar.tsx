'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { EMAIL } from '../../data/profile'
import { RESUME_FILE } from '../../data/sections'
import { s } from '../css'
import { TITLES } from '../registry'
import { useDispatch, useOpenApp, useOs } from '../store'
import { useTheme } from '../useTheme'
import { Popovers } from './Popovers'
import type { AppId, MenuName } from '../types'

const MENU_ITEM = 'padding:5px 10px;border-radius:6px;cursor:default;white-space:nowrap'
const DROPDOWN =
  'position:absolute;top:26px;left:0;padding:5px;border-radius:11px;background:var(--s-pop);backdrop-filter:var(--s-blur);-webkit-backdrop-filter:var(--s-blur);border:1px solid var(--s-line);box-shadow:var(--s-shadow-pop);color:var(--s-text);text-shadow:none;z-index:10'

function Item({ label, onPick }: { label: ReactNode; onPick: () => void }) {
  return (
    <div
      data-mi="1"
      style={s(MENU_ITEM)}
      onClick={(e) => {
        e.stopPropagation()
        onPick()
      }}
    >
      {label}
    </div>
  )
}

const Divider = () => <div style={s('height:1px;background:var(--s-line);margin:5px 8px')} />

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

export function MenuBar() {
  const { active, wins, prefs, status, activity } = useOs()
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
          width={210}
          label={<div style={s('font-size:11.5px;font-weight:700;letter-spacing:.06em')}>SJ</div>}
        >
          <Item label="About Sumit's Portfolio OS" onPick={() => openApp('about')} />
          <Divider />
          <Item label="System Settings…" onPick={() => openApp('settings')} />
          <Item
            label="Control Center"
            onPick={() => dispatch({ type: 'overlay', name: 'controlCenter', on: true })}
          />
          <Divider />
          <Item label="Close All Windows" onPick={() => dispatch({ type: 'closeAll' })} />
        </Menu>

        <div id="menu-app-name" style={s('font-weight:700;padding:2px 8px;cursor:default')}>
          {front ? TITLES[front].split(' — ')[0] : 'Workspace'}
        </div>

        <Menu name="file" label="File" width={200}>
          <Item label="New Workspace Window" onPick={() => openApp('finder')} />
          <Item label="New Shell" onPick={() => openApp('terminal')} />
          <Item label="Open Resume" onPick={() => openApp('resume')} />
          <Divider />
          <Item
            label="Close Window"
            onPick={() => front && dispatch({ type: 'close', app: front })}
          />
        </Menu>

        <Menu name="edit" label="Edit" width={200}>
          <Item label="Copy Email Address" onPick={() => copy(EMAIL, 'Email address')} />
          <Item
            label="Copy GitHub URL"
            onPick={() => copy('https://github.com/sumitjadhav1703', 'GitHub URL')}
          />
          <Divider />
          <Item
            label="Find…"
            onPick={() => dispatch({ type: 'overlay', name: 'spotlight', on: true })}
          />
        </Menu>

        <Menu name="view" label="View" width={200}>
          <Item label="Small Icons" onPick={() => dispatch({ type: 'iconScale', scale: 0.85 })} />
          <Item label="Medium Icons" onPick={() => dispatch({ type: 'iconScale', scale: 1 })} />
          <Item label="Large Icons" onPick={() => dispatch({ type: 'iconScale', scale: 1.25 })} />
          <Divider />
          <Item label="Show / Hide Desktop Items" onPick={() => dispatch({ type: 'toggleDesktop' })} />
          <Item label="Show / Hide Dock" onPick={() => dispatch({ type: 'toggleDock' })} />
          <Divider />
          <Item label="Appearance: Light" onPick={() => setTheme('light')} />
          <Item label="Appearance: Dark" onPick={() => setTheme('dark')} />
          <Item label="Appearance: System" onPick={() => setTheme('system')} />
        </Menu>

        <Menu name="go" label="Go" width={200}>
          <Item label="Projects" onPick={() => openApp('finder-projects')} />
          <Item label="Skills" onPick={() => openApp('skills')} />
          <Item label="Experience" onPick={() => openApp('experience')} />
          <Item label="Education" onPick={() => openApp('education')} />
          <Item label="Certificates" onPick={() => openApp('certificates')} />
          <Divider />
          <Item label="Reach Out" onPick={() => openApp('contact')} />
        </Menu>

        <Menu name="window" label="Window" width={230}>
          <Item
            label="Minimize"
            onPick={() => front && dispatch({ type: 'minimize', app: front })}
          />
          <Item label="Zoom" onPick={() => front && dispatch({ type: 'toggleMax', app: front })} />
          <Item label="Bring All to Front" onPick={() => dispatch({ type: 'frontAll' })} />
          <Divider />
          <Item label="Minimize All" onPick={() => dispatch({ type: 'minimizeAll' })} />
          <Divider />
          <div id="window-list" style={s('max-height:260px;overflow:auto')}>
            {(Object.keys(wins) as AppId[]).length ? (
              (Object.keys(wins) as AppId[]).map((id) => (
                <Item
                  key={id}
                  label={`${active === id ? '✓ ' : '   '}${TITLES[id]}`}
                  onPick={() => openApp(id)}
                />
              ))
            ) : (
              <div style={s('padding:5px 10px;color:var(--s-faint)')}>No open windows</div>
            )}
          </div>
        </Menu>

        <div
          data-menu="help"
          style={s('padding:2px 9px;border-radius:5px;cursor:default')}
          onClick={(e) => {
            e.stopPropagation()
            openApp('about')
          }}
        >
          Help
        </div>
      </div>

      <div style={s('display:flex;align-items:center;gap:13px')}>
        <a
          href={RESUME_FILE}
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
