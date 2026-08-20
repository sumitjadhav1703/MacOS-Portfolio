// What the project will look like, before anyone else can see it.
//
// It is the real thing: `mapProject` is the same function that builds the public API's project
// objects, and `ProjectWindow` is the same component the desktop opens. Nothing about the
// project's appearance is described twice, so this panel cannot drift away from the site
// (spec §19, §20).
//
// The one difference is where the values come from — the editor rather than D1 — so the columns
// are put back into the shape a row has before they are mapped.

import { useState } from 'react'
import { mapProject } from '../map'
import { ProjectWindow } from '../../src/os/apps/ProjectWindow'
import { Button, StatusBadge } from './ui'
import { s } from '../../src/os/css'

const JSON_COLUMNS = ['stack', 'sections', 'links', 'aliases']

/** Editor values → the row shape `mapProject` reads. JSON columns are text in a row. */
function asRow(values: Record<string, any>): Record<string, unknown> {
  const row: Record<string, unknown> = { ...values }
  for (const column of JSON_COLUMNS) {
    if (typeof row[column] !== 'string') row[column] = JSON.stringify(row[column] ?? [])
  }
  return row
}

export function Preview({
  values,
  published,
  isPublished,
}: {
  /** What is in the editor right now. */
  values: Record<string, any>
  /** The live row, when there is one, so the two can be compared side by side. */
  published?: Record<string, any>
  isPublished: boolean
}) {
  const [showing, setShowing] = useState<'draft' | 'live'>('draft')
  const live = showing === 'live' && published
  const project = mapProject(asRow(live ? published : values), window.location.origin)

  return (
    <div style={s('margin-bottom:16px')}>
      <div style={s('display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px')}>
        {live ? (
          <StatusBadge tone="live">Published version</StatusBadge>
        ) : (
          <StatusBadge tone="pending">Draft preview</StatusBadge>
        )}
        <span style={s('font-size:11px;color:var(--s-faint);flex:1;min-width:160px')}>
          {live
            ? 'What visitors see right now.'
            : isPublished
              ? 'Not public. The published version is still live until you publish these edits.'
              : 'Not public. Nothing here has been published yet.'}
        </span>
        {published && isPublished ? (
          <Button onClick={() => setShowing(live ? 'draft' : 'live')}>
            {live ? 'Show my draft' : 'Show what is live'}
          </Button>
        ) : null}
      </div>

      <div
        style={{
          ...s('border-radius:12px;overflow:hidden;height:460px;background:var(--s-win)'),
          border: `2px solid ${live ? 'var(--s-ok)' : '#d79a4a'}`,
        }}
      >
        <ProjectWindow project={project} />
      </div>
    </div>
  )
}
