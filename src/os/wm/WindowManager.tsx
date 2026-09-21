'use client'

import { useState } from 'react'
import { appContentFor } from '../apps'
import { useContent } from '../content'
import { s } from '../css'
import { snapBox, useOs } from '../store'
import { useIsClient } from '../useMedia'
import type { AppId, SnapZone } from '../types'
import { Window } from './Window'

export function WindowManager() {
  const { wins, active, activeSpace, dockHidden } = useOs()
  const content = useContent()
  const client = useIsClient()
  const [zone, setZone] = useState<SnapZone | null>(null)
  const ids = (Object.keys(wins) as AppId[]).filter((id) => wins[id]!.space === activeSpace)

  // The preview reads the same helper the reducer does, so the plate is drawn exactly where
  // the window lands. It used to recompute the boxes in percentages with its own
  // half-height fudge, and the two quietly disagreed.
  const preview =
    zone && client
      ? snapBox(zone, { w: window.innerWidth, h: window.innerHeight }, !dockHidden)
      : null

  return (
    <div id="wm" style={s('position:absolute;inset:0;pointer-events:none;z-index:var(--z-wm)')}>
      {preview ? (
        <div
          data-snapzone={zone}
          style={{
            ...s(
              'position:absolute;border-radius:12px;background:rgba(255,255,255,.16);border:1px solid var(--s-glass-ring);backdrop-filter:var(--s-blur-scrim);transition:all .12s ease',
            ),
            left: preview.x,
            top: preview.y,
            width: preview.w,
            height: preview.h,
          }}
        />
      ) : null}

      {ids.map((id) => {
        const Content = appContentFor(id, content)
        return (
          <Window key={id} id={id} win={wins[id]!} active={active === id} onZone={setZone}>
            <Content />
          </Window>
        )
      })}
    </div>
  )
}
