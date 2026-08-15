// List + editor for any content type. One component covers projects, certificates, experience,
// education, skills and social links; what differs between them lives in schema.ts.

import { useEffect, useState } from 'react'
import { api } from './api'
import type { CollectionUI, FieldUI } from './schema'
import { Field } from './Fields'
import { Banner, Button, CARD, Confirm, useAction } from './ui'
import { s } from '../../src/os/css'

/** JSON columns arrive from D1 as text; these inputs want the parsed value. */
const JSON_INPUTS = new Set(['lines', 'pairs', 'map', 'kb', 'links', 'sections'])

export function hydrate(row: Record<string, any>, fields: FieldUI[]): Record<string, any> {
  const out = { ...row }
  for (const field of fields) {
    if (!JSON_INPUTS.has(field.input)) continue
    const raw = out[field.col]
    if (typeof raw !== 'string') continue
    try {
      out[field.col] = JSON.parse(raw)
    } catch {
      out[field.col] = []
    }
  }
  return out
}

/** Only the columns the form owns are sent, so nothing else on the row can be overwritten. */
function payload(draft: Record<string, any>, fields: FieldUI[], extra: Record<string, unknown> = {}) {
  const body: Record<string, unknown> = { ...extra }
  for (const field of fields) body[field.col] = draft[field.col]
  return body
}

export function Collection({ ui, siteOrigin }: { ui: CollectionUI; siteOrigin: string }) {
  const [items, setItems] = useState<Record<string, any>[]>([])
  const [draft, setDraft] = useState<Record<string, any> | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const { error, busy, run, setError } = useAction()

  const load = () => run(async () => setItems(await api.list(ui.type)))
  useEffect(() => {
    load()
    setDraft(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.type])

  const save = async () => {
    if (!draft) return
    const ok = await run(async () => {
      if (creating) await api.create(ui.type, payload(draft, ui.fields, { published: draft.published ?? 0 }))
      else await api.update(ui.type, draft.id, payload(draft, ui.fields))
    })
    if (!ok) return
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    setDraft(null)
    await load()
  }

  const togglePublish = async (item: Record<string, any>) => {
    await run(() => api.update(ui.type, item.id, { published: item.published ? 0 : 1 }))
    await load()
  }

  const move = async (index: number, by: number) => {
    const next = [...items]
    const target = index + by
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    setItems(next)
    await run(() => api.reorder(ui.type, next.map((i) => i.id)))
  }

  const remove = async (id: string) => {
    setConfirming(null)
    await run(() => api.remove(ui.type, id))
    await load()
  }

  if (draft) {
    return (
      <div style={s(CARD)}>
        <h2 style={s('margin:0 0 16px;font-size:16px')}>
          {creating ? `New ${ui.singular}` : `Edit ${ui.singular}`}
        </h2>
        {error ? <Banner tone="error">{error}</Banner> : null}
        {ui.fields.map((field) => (
          <Field
            key={field.col}
            field={field}
            value={draft[field.col]}
            onChange={(v) => setDraft({ ...draft, [field.col]: v })}
          />
        ))}
        <div style={s('display:flex;gap:8px;margin-top:6px')}>
          <Button tone="accent" onClick={save} disabled={busy}>
            {creating ? 'Save draft' : 'Save'}
          </Button>
          <Button
            onClick={() => {
              setDraft(null)
              setError(null)
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={s('display:flex;align-items:center;justify-content:space-between;margin-bottom:16px')}>
        <h2 style={s('margin:0;font-size:16px')}>{ui.title}</h2>
        <Button
          tone="accent"
          onClick={() => {
            setCreating(true)
            setDraft({ ...ui.defaults })
          }}
        >
          Add {ui.singular}
        </Button>
      </div>

      {error ? <Banner tone="error">{error}</Banner> : null}
      {saved ? <Banner tone="ok">Saved.</Banner> : null}

      <div style={s(CARD + ';padding:0;overflow:hidden')}>
        {items.length === 0 ? (
          <div style={s('padding:24px;color:var(--s-faint);font-size:13px')}>Nothing here yet.</div>
        ) : null}
        {items.map((item, i) => (
          <div
            key={item.id}
            style={s(
              'display:flex;align-items:center;gap:12px;padding:12px 16px;' +
                (i ? 'border-top:1px solid var(--s-line)' : ''),
            )}
          >
            <div style={s('flex:1;min-width:0')}>
              <div style={s('font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>
                {ui.columns.map((c) => item[c.col]).filter(Boolean).join(' · ')}
              </div>
              <div style={s('font-size:11px;color:var(--s-faint);margin-top:2px')}>
                {item.published ? 'Published' : 'Draft'}
                {item.featured ? ' · Featured' : ''}
              </div>
            </div>

            <Button onClick={() => move(i, -1)}>↑</Button>
            <Button onClick={() => move(i, 1)}>↓</Button>
            {ui.type === 'projects' && item.published ? (
              <a
                href={`${siteOrigin}/projects/${item.slug}`}
                target="_blank"
                rel="noreferrer"
                style={s('font-size:12px')}
              >
                Preview
              </a>
            ) : null}
            {ui.publishable ? (
              <Button onClick={() => togglePublish(item)}>
                {item.published ? 'Unpublish' : 'Publish'}
              </Button>
            ) : null}
            <Button
              onClick={() => {
                setCreating(false)
                setDraft(hydrate(item, ui.fields))
              }}
            >
              Edit
            </Button>
            <Button tone="danger" onClick={() => setConfirming(item.id)}>
              Delete
            </Button>
          </div>
        ))}
      </div>

      {confirming ? (
        <Confirm
          message={`Delete this ${ui.singular}? Files it owns are removed too, unless something else still uses them.`}
          onCancel={() => setConfirming(null)}
          onConfirm={() => remove(confirming)}
        />
      ) : null}
    </div>
  )
}
