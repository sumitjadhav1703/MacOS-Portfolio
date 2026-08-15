'use client'

import { useState } from 'react'
import { APP_CONTENT } from '../apps'
import { s } from '../css'
import { useOs } from '../store'
import type { AppId, SnapZone } from '../types'
import { Window } from './Window'

const MENUBAR_H = 28

/** Where a released window would land — drawn behind the drag as a translucent plate. */
function zoneBox(zone: SnapZone) {
  const full = `calc(100% - ${MENUBAR_H}px)`
  const half = 'calc(50% - 14px)'
  switch (zone) {
    case 'left':
      return { left: 0, top: MENUBAR_H, width: '50%', height: full }
    case 'right':
      return { left: '50%', top: MENUBAR_H, width: '50%', height: full }
    case 'top':
      return { left: 0, top: MENUBAR_H, width: '100%', height: full }
    case 'top-left':
      return { left: 0, top: MENUBAR_H, width: '50%', height: half }
    case 'top-right':
      return { left: '50%', top: MENUBAR_H, width: '50%', height: half }
    case 'bottom-left':
      return { left: 0, top: `calc(${MENUBAR_H}px + ${half})`, width: '50%', height: half }
    case 'bottom-right':
      return { left: '50%', top: `calc(${MENUBAR_H}px + ${half})`, width: '50%', height: half }
  }
}

export function WindowManager() {
  const { wins, active, activeSpace } = useOs()
  const [zone, setZone] = useState<SnapZone | null>(null)
  const ids = (Object.keys(wins) as AppId[]).filter((id) => wins[id]!.space === activeSpace)

  return (
    <div id="wm" style={s('position:absolute;inset:0;pointer-events:none;z-index:100')}>
      {zone ? (
        <div
          data-snapzone={zone}
          style={{
            ...s(
              'position:absolute;border-radius:12px;background:rgba(255,255,255,.16);border:1px solid var(--s-glass-ring);backdrop-filter:blur(6px);transition:all .12s ease',
            ),
            ...zoneBox(zone),
          }}
        />
      ) : null}

      {ids.map((id) => {
        const Content = APP_CONTENT[id]
        return (
          <Window key={id} id={id} win={wins[id]!} active={active === id} onZone={setZone}>
            <Content />
          </Window>
        )
      })}
    </div>
  )
}
