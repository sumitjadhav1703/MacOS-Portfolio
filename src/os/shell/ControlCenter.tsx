'use client'

import { s } from '../css'
import { useDispatch, useOpenApp, useOs } from '../store'
import { useTheme } from '../useTheme'
import { useOnline } from '../useMedia'
import type { AppId, Theme } from '../types'

const CARD = 'padding:11px 12px;border-radius:11px;background:var(--s-fill)'
const LABEL =
  'font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--s-faint);margin-bottom:9px'
const ROW = 'display:flex;align-items:center;justify-content:space-between;font-size:12.5px'

const QUICK: [AppId | 'finder-projects', string][] = [
  ['finder-projects', 'Projects'],
  ['resume', 'Resume'],
  ['terminal', 'Shell'],
  ['contact', 'Reach Out'],
]

export function ControlCenter() {
  const { controlCenter, prefs, status, activity } = useOs()
  const online = useOnline()
  const dispatch = useDispatch()
  const openApp = useOpenApp()
  const { accent } = useTheme()

  if (!controlCenter) return null

  const setTheme = (theme: Theme) => dispatch({ type: 'prefs', patch: { theme } })

  return (
    <div
      id="control-center"
      onClick={(e) => e.stopPropagation()}
      style={s(
        'position:absolute;top:34px;right:12px;width:288px;padding:12px;border-radius:14px;background:var(--s-pop);backdrop-filter:var(--s-blur);-webkit-backdrop-filter:var(--s-blur);border:1px solid var(--s-line);box-shadow:var(--s-shadow-pop);z-index:210',
      )}
    >
      <div style={s('display:flex;flex-direction:column;gap:9px')}>
        <div style={s(CARD)}>
          <div style={s(LABEL)}>Connectivity</div>
          <div style={s(ROW)}>
            <span>Network</span>
            <span id="cc-net" style={s('color:var(--s-dim)')}>
              {online ? 'Online' : 'Offline'}
            </span>
          </div>
          <div style={{ ...s(ROW), marginTop: 5 }}>
            <span>Portfolio data</span>
            <span style={s('color:var(--s-dim)')}>Local</span>
          </div>
        </div>

        <div style={s(CARD)}>
          <div style={s(LABEL)}>Appearance</div>
          <div style={s('display:flex;gap:5px')}>
            {(
              [
                ['light', 'Light'],
                ['dark', 'Dark'],
                ['system', 'System'],
              ] as [Theme, string][]
            ).map(([value, label]) => (
              <div
                key={value}
                data-seg={value}
                role="button"
                onClick={() => setTheme(value)}
                style={{
                  ...s('flex:1;text-align:center;padding:6px 0;border-radius:8px;font-size:12px;cursor:default'),
                  background: prefs.theme === value ? accent : 'var(--s-fill-2)',
                  color: prefs.theme === value ? '#fff' : 'var(--s-text)',
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div style={s(CARD)}>
          <div style={s(LABEL)}>Portfolio</div>
          <div
            style={{ ...s(ROW), cursor: 'default' }}
            onClick={() => dispatch({ type: 'popover', name: 'status' })}
          >
            <span>System status</span>
            <span id="cc-status" style={s('color:var(--s-dim)')}>
              {status}
            </span>
          </div>
          <div
            style={{ ...s(ROW), marginTop: 5, cursor: 'default' }}
            onClick={() => dispatch({ type: 'popover', name: 'activity' })}
          >
            <span>Current activity</span>
            <span id="cc-activity" style={s('color:var(--s-dim)')}>
              {activity}
            </span>
          </div>
        </div>

        <div style={s(CARD)}>
          <div style={s(LABEL)}>Quick Actions</div>
          <div style={s('display:grid;grid-template-columns:1fr 1fr;gap:5px')}>
            {QUICK.map(([id, label]) => (
              <div
                key={id}
                data-side="1"
                role="button"
                onClick={() => {
                  openApp(id)
                  dispatch({ type: 'overlay', name: 'controlCenter', on: false })
                }}
                style={s('padding:7px 9px;border-radius:8px;background:var(--s-fill-2);font-size:12px;cursor:default')}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div
          data-side="1"
          role="button"
          onClick={() => {
            openApp('settings')
            dispatch({ type: 'overlay', name: 'controlCenter', on: false })
          }}
          style={s(
            'padding:9px 12px;border-radius:10px;background:var(--s-fill);cursor:default;font-weight:600;font-size:12.5px',
          )}
        >
          Portfolio Settings…
        </div>
      </div>
    </div>
  )
}
