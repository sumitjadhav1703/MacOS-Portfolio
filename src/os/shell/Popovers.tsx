'use client'

import { useState } from 'react'
import { s } from '../css'
import { useOs } from '../store'
import { useOnline } from '../useMedia'
import type { ActivityState } from '../types'

const POP =
  'position:absolute;top:30px;width:276px;padding:13px;border-radius:13px;background:var(--s-pop);backdrop-filter:var(--s-blur);-webkit-backdrop-filter:var(--s-blur);border:1px solid var(--s-line);box-shadow:var(--s-shadow-pop);color:var(--s-text);text-shadow:none;z-index:10'

const ACT_FILL: Record<ActivityState, string> = {
  Idle: '34%',
  Ready: '70%',
  Working: '88%',
  Processing: '100%',
}

const ACT_TONE: Record<ActivityState, string> = {
  Idle: 'var(--s-faint)',
  Ready: 'var(--s-ok)',
  Working: 'var(--s-accent)',
  Processing: 'var(--s-accent)',
}

function Head({ label, pill, tone, busy }: { label: string; pill: string; tone: string; busy: boolean }) {
  return (
    <div style={s('display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px')}>
      <div
        style={s('font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--s-faint)')}
      >
        {label}
      </div>
      <div
        style={{
          ...s(
            'display:inline-flex;align-items:center;gap:6px;padding:3px 9px 3px 8px;border-radius:999px;background:var(--s-fill-2);font-size:11px;font-weight:600;transition:border-color .35s ease',
          ),
          border: `1px solid ${busy ? 'var(--s-accent)' : 'var(--s-line)'}`,
        }}
      >
        <span
          style={{
            ...s('width:6px;height:6px;border-radius:50%;transition:background .35s ease'),
            background: tone,
            animation: busy ? 'pulseDot 1.1s ease-in-out infinite' : 'none',
          }}
        />
        <span>{pill}</span>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      data-actrow="1"
      style={s(
        'padding:9px 11px;border-radius:10px;background:var(--s-fill);border:1px solid var(--s-line);transition:background .24s cubic-bezier(.32,.72,0,1)',
      )}
    >
      <div style={s('font-size:11px;color:var(--s-faint)')}>{label}</div>
      <div style={s('font-size:14px;font-weight:700;letter-spacing:-.012em;margin-top:2px')}>{value}</div>
    </div>
  )
}

function Quiet({ label, value, divided }: { label: string; value: string; divided?: boolean }) {
  return (
    <div
      style={{
        ...s('display:flex;justify-content:space-between;gap:12px;padding:8px 12px;font-size:12px;background:var(--s-fill)'),
        borderTop: divided ? '1px solid var(--s-line)' : undefined,
      }}
    >
      <span style={s('color:var(--s-dim)')}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function Calendar({ accent }: { accent: string }) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const first = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()

  return (
    <>
      <div id="cal-head" style={s('font-size:13px;font-weight:700;margin-bottom:10px')}>
        {now.toLocaleDateString([], { month: 'long', year: 'numeric' })}
      </div>
      <div
        id="cal-grid"
        style={s('display:grid;grid-template-columns:repeat(7,1fr);gap:3px;font-size:11px;text-align:center')}
      >
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} style={s('color:var(--s-faint);font-size:10px;padding-bottom:3px')}>
            {d}
          </div>
        ))}
        {Array.from({ length: first }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1
          const today = day === now.getDate()
          return (
            <div
              key={day}
              style={{
                ...s('padding:4px 0;border-radius:6px'),
                background: today ? accent : undefined,
                color: today ? '#fff' : undefined,
                fontWeight: today ? 700 : undefined,
              }}
            >
              {day}
            </div>
          )
        })}
      </div>
    </>
  )
}

export function Popovers({ accent }: { accent: string }) {
  const { popover, status, activity, task, wins, notifications } = useOs()
  const [started] = useState(() => Date.now())
  const online = useOnline()
  const busy = activity === 'Working' || activity === 'Processing'
  const [checked] = useState(() => new Date())

  // Nothing polls: the popover reads live values only while it is open.
  if (!popover) return null

  if (popover === 'status') {
    const mins = Math.max(1, Math.round((Date.now() - started) / 60000))
    return (
      <div id="status-pop" style={{ ...s(POP), right: 12 }} onClick={(e) => e.stopPropagation()}>
        <Head
          label="Portfolio Status"
          pill={status}
          tone={status === 'Offline' ? 'var(--s-warn)' : 'var(--s-ok)'}
          busy={busy}
        />
        <div id="status-rows">
          <div
            data-actrow="1"
            style={s(
              'padding:11px 12px 12px;border-radius:11px;background:var(--s-fill);border:1px solid var(--s-line);box-shadow:inset 0 1px 0 var(--s-fill-2)',
            )}
          >
            <div style={s('font-size:11px;color:var(--s-faint)')}>Network</div>
            <div style={s('display:flex;align-items:center;gap:8px;margin-top:3px')}>
              <span
                style={{
                  ...s('width:7px;height:7px;border-radius:50%;flex:none'),
                  background: online ? 'var(--s-ok)' : 'var(--s-warn)',
                }}
              />
              <span style={s('font-size:14.5px;font-weight:700;letter-spacing:-.012em')}>
                {online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div style={s('font-size:11px;color:var(--s-faint);margin-top:7px')}>
              Last checked {checked.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
          <div style={s('display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px')}>
            <Metric label="Open windows" value={String(Object.keys(wins).length)} />
            <Metric label="Session" value={`${mins} min`} />
          </div>
          <div style={s('margin-top:8px;border-radius:11px;border:1px solid var(--s-line);overflow:hidden')}>
            <Quiet label="Interface" value="Running locally" />
            <Quiet label="Portfolio data" value="Bundled — no backend" divided />
          </div>
        </div>
      </div>
    )
  }

  if (popover === 'activity') {
    return (
      <div id="act-pop" style={{ ...s(POP), right: 12 }} onClick={(e) => e.stopPropagation()}>
        <Head label="Portfolio Activity" pill={activity} tone={ACT_TONE[activity]} busy={busy} />
        <div
          data-actrow="1"
          style={s(
            'padding:11px 12px 12px;border-radius:11px;background:var(--s-fill);border:1px solid var(--s-line);box-shadow:inset 0 1px 0 var(--s-fill-2)',
          )}
        >
          <div style={s('font-size:11px;color:var(--s-faint)')}>Current task</div>
          <div
            id="act-task"
            style={s('font-size:14.5px;font-weight:700;letter-spacing:-.012em;line-height:1.3;margin-top:3px')}
          >
            {task}
          </div>
          <div style={s('margin-top:11px;height:4px;border-radius:3px;background:var(--s-fill-3);overflow:hidden')}>
            <div
              id="act-meter"
              style={{
                ...s('height:100%;border-radius:3px;transition:width .55s cubic-bezier(.32,.72,0,1),background .35s ease'),
                width: ACT_FILL[activity],
                background: ACT_TONE[activity],
              }}
            />
          </div>
          <div
            style={s('display:flex;justify-content:space-between;margin-top:6px;font-size:10.5px;color:var(--s-faint)')}
          >
            <span>Idle</span>
            <span>Processing</span>
          </div>
        </div>
        <div
          data-actrow="1"
          style={s(
            'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;padding:8px 12px;border-radius:10px;font-size:12px;cursor:default;background:var(--s-fill)',
          )}
        >
          <span style={s('color:var(--s-dim)')}>System status</span>
          <span id="act-sys">{status}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      id="cal-pop"
      style={{ ...s(POP), right: 12, width: 288, padding: 14 }}
      onClick={(e) => e.stopPropagation()}
    >
      <Calendar accent={accent} />
      <div style={s('height:1px;background:var(--s-line);margin:13px 0 10px')} />
      <div
        style={s(
          'font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--s-faint);margin-bottom:8px',
        )}
      >
        Notifications
      </div>
      <div
        id="notif-list"
        style={s('display:flex;flex-direction:column;gap:6px;max-height:150px;overflow:auto')}
      >
        {notifications.length ? (
          notifications.map((n) => (
            <div key={n.id} style={s('padding:8px 10px;border-radius:9px;background:var(--s-fill);font-size:12px')}>
              <div style={s('display:flex;justify-content:space-between;gap:8px')}>
                <span style={s('font-weight:600')}>{n.title}</span>
                <span style={s('color:var(--s-faint);font-size:11px')}>
                  {n.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              <div style={s('color:var(--s-dim);margin-top:2px')}>{n.msg}</div>
            </div>
          ))
        ) : (
          <div style={s('color:var(--s-faint);font-size:12px')}>Nothing new.</div>
        )}
      </div>
    </div>
  )
}
