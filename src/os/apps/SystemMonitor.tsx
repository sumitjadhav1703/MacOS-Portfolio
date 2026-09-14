'use client'

import { Body, MetricGrid, PageHead, Sec, StatusPill } from '../../components/primitives'
import { useContent } from '../content'
import { s } from '../css'
import { useOnline } from '../useMedia'
import { AI_MODEL, useRuntime } from '../runtime'
import { useOs } from '../store'
import { PACKS } from '../packs'
import type { AppId } from '../types'

/**
 * What the desktop knows about itself.
 *
 * Everything here is either already in the store, a `useSyncExternalStore` subscription, or
 * derived by `useRuntime()`. Nothing polls: the portfolio's first paint must not depend on the
 * backend, and a status panel that pings the Worker every few seconds would quietly
 * reintroduce that dependency.
 *
 * Only *whether* the API URL is configured is reported, never its value — this window is public.
 */

/** Rows read better as a label/value pair than as a metric tile. */
function Row({ label, value, pill }: { label: string; value: string; pill?: boolean }) {
  return (
    <div
      style={s(
        'display:flex;align-items:center;justify-content:space-between;gap:16px;padding:9px 2px;border-bottom:1px solid var(--s-line)',
      )}
    >
      <span style={s('color:var(--s-dim);font-size:12.5px')}>{label}</span>
      {pill ? <StatusPill label={value} ok /> : <span style={s('font-size:12.5px')}>{value}</span>}
    </div>
  )
}

export function SystemMonitor() {
  const content = useContent()
  const online = useOnline()
  const runtime = useRuntime()
  const { prefs, wins, spaces } = useOs()

  const skills = content.skills.reduce((n, group) => n + group.items.length, 0)
  const open = (Object.keys(wins) as AppId[]).length
  const minimised = (Object.keys(wins) as AppId[]).filter((id) => wins[id]?.min).length

  const live = runtime.live

  const revision = (() => {
    const at = new Date(content.updatedAt)
    return Number.isNaN(at.getTime()) ? '—' : at.toISOString().slice(0, 10)
  })()

  return (
    <Body>
      <PageHead title="System Monitor" sub="What this desktop is running, and what it is serving." />

      <Sec heading="Portfolio">
        <MetricGrid
          rows={[
            ['Projects', String(content.projects.length), 'Each one opens as its own window'],
            ['Skills', String(skills), `across ${content.skills.length} groups`],
            ['Certificates', String(content.certificates.length)],
            ['Experience', String(content.experience.length), 'roles on record'],
            ['Education', String(content.education.length)],
            ['Links', String(content.socialLinks.length), 'icons resolved from the URL'],
          ]}
        />
      </Sec>

      <Sec heading="Runtime">
        <Row label="Frontend" value="Ready" pill />
        <Row label="Served from" value={runtime.host} />
        <Row label="Network" value={online ? 'Connected' : 'Offline'} pill={online} />
        <Row label="Backend" value={runtime.backend} pill={runtime.configured} />
        <Row
          label="Content API"
          value={runtime.configured ? 'Cloudflare Worker — D1 + R2' : 'Not configured'}
          pill={runtime.configured}
        />
        <Row
          label="Assistant"
          value={runtime.configured ? `Workers AI — ${AI_MODEL}` : 'Local keyword fallback'}
          pill={runtime.configured}
        />
        <Row label="Content source" value={runtime.data} pill={live} />
        {live ? <Row label="Last published" value={revision} /> : null}
        <div style={s('color:var(--s-faint);font-size:11.5px;margin-top:10px;line-height:1.5')}>
          The portfolio renders its bundled copy first and swaps in live content after mount, so
          nothing on this desktop waits on a network round trip. Ask Sumit is answered by a
          second Worker that is handed the published bundle and has no database binding of its
          own — it cannot read a draft, because a draft never reaches the process that answers.
        </div>
      </Sec>

      <Sec heading="Environment">
        <Row label="Appearance" value={prefs.theme === 'system' ? 'Follows system' : prefs.theme === 'light' ? 'Light' : 'Dark'} />
        <Row label="Theme pack" value={PACKS[prefs.pack].name} />
        <Row
          label="Reduce motion"
          value={prefs.reduceMotion === null ? 'Follows system' : prefs.reduceMotion ? 'On' : 'Off'}
        />
        <Row label="Reduce transparency" value={prefs.opaque ? 'On' : 'Off'} />
        <Row label="Increase contrast" value={prefs.contrast ? 'On' : 'Off'} />
        <Row label="Low power" value={prefs.lowPower ? 'On' : 'Off'} />
        <Row label="Spaces" value={String(spaces)} />
        <Row label="Windows" value={minimised ? `${open} open, ${minimised} minimised` : `${open} open`} />
      </Sec>
    </Body>
  )
}
