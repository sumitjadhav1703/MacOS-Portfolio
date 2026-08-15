'use client'

import { s } from '../css'

/** Current month, today highlighted in the accent. Shared by the popover and the panel. */
export function Calendar({ accent }: { accent: string }) {
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
