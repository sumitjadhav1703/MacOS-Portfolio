'use client'

import { useEffect, useState } from 'react'
import { EASE } from '../anim'
import { s } from '../css'
import { useDispatch, useOpenApp, useOs } from '../store'
import { useTheme } from '../useTheme'
import { Calendar } from './Calendar'

const WIDGET = 'padding:14px 16px;border-radius:16px;background:var(--s-pop);border:1px solid var(--s-line);box-shadow:var(--s-shadow-rest)'

/** The panel behind the menu-bar clock: widgets on top, notification stack below. */
export function NotificationCenter() {
  const { notifCenter, notifications, status, activity, wins } = useOs()
  const dispatch = useDispatch()
  const openApp = useOpenApp()
  const { accent } = useTheme()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!notifCenter) return
    const t = window.setInterval(() => setNow(new Date()), 10_000)
    return () => window.clearInterval(t)
  }, [notifCenter])

  if (!notifCenter) return null

  return (
    <div
      id="notification-center"
      onClick={(e) => e.stopPropagation()}
      style={{
        ...s(
          'position:absolute;top:28px;right:0;bottom:0;width:320px;z-index:215;padding:14px 12px 20px;display:flex;flex-direction:column;gap:10px;overflow:auto;background:rgba(10,12,16,.22);backdrop-filter:blur(26px) saturate(150%);-webkit-backdrop-filter:blur(26px) saturate(150%);border-left:1px solid var(--s-line)',
        ),
        animation: `toastIn .34s ${EASE} both`,
      }}
    >
      <div style={s(WIDGET)}>
        <div style={s('font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--s-faint)')}>
          {now.toLocaleDateString([], { weekday: 'long' })}
        </div>
        <div style={s('font-size:34px;font-weight:700;letter-spacing:-.02em;margin-top:2px')}>
          {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </div>
        <div style={s('color:var(--s-dim);font-size:12.5px')}>
          {now.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div style={s(WIDGET)}>
        <Calendar accent={accent} />
      </div>

      <div style={s(WIDGET)}>
        <div
          style={s(
            'font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--s-faint);margin-bottom:10px',
          )}
        >
          Portfolio
        </div>
        <div style={s('display:grid;grid-template-columns:1fr 1fr;gap:8px')}>
          {[
            ['Status', status],
            ['Activity', activity],
            ['Windows', String(Object.keys(wins).length)],
            ['Projects', '6'],
          ].map(([label, value]) => (
            <div
              key={label}
              style={s('padding:9px 11px;border-radius:11px;background:var(--s-fill);border:1px solid var(--s-line)')}
            >
              <div style={s('font-size:10.5px;color:var(--s-faint)')}>{label}</div>
              <div style={s('font-size:14px;font-weight:700;letter-spacing:-.012em;margin-top:2px')}>
                {value}
              </div>
            </div>
          ))}
        </div>
        <div
          role="button"
          onClick={() => {
            openApp('finder-projects')
            dispatch({ type: 'overlay', name: 'notifCenter', on: false })
          }}
          style={s(
            'margin-top:10px;padding:8px 12px;border-radius:10px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:12px;text-align:center;cursor:default',
          )}
        >
          Open Projects
        </div>
      </div>

      <div style={s('display:flex;align-items:center;gap:10px;padding:2px 6px')}>
        <div style={s('font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--s-faint)')}>
          Notifications
        </div>
        <div style={s('flex:1')} />
        {notifications.length ? (
          <span
            role="button"
            onClick={() => notifications.forEach((n) => dispatch({ type: 'dismissNotif', id: n.id }))}
            style={s('font-size:11.5px;color:var(--s-dim);cursor:default')}
          >
            Clear
          </span>
        ) : null}
      </div>

      {notifications.length ? (
        notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => dispatch({ type: 'dismissNotif', id: n.id })}
            style={s(
              'padding:12px 14px;border-radius:14px;background:var(--s-pop);border:1px solid var(--s-line);box-shadow:var(--s-shadow-rest);font-size:12.5px;cursor:default',
            )}
          >
            <div style={s('display:flex;justify-content:space-between;gap:8px')}>
              <span style={s('font-weight:600')}>{n.title}</span>
              <span style={s('color:var(--s-faint);font-size:11px')}>
                {n.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
            <div style={s('color:var(--s-dim);margin-top:3px')}>{n.msg}</div>
          </div>
        ))
      ) : (
        <div
          style={s(
            'padding:16px;border-radius:14px;background:var(--s-fill);border:1px solid var(--s-line);color:var(--s-faint);font-size:12.5px;text-align:center',
          )}
        >
          No new notifications
        </div>
      )}
    </div>
  )
}
