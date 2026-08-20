// List + editor for any content type. One component covers projects, certificates, experience,
// education, skills and social links; what differs between them lives in schema.ts.
//
// Two save models meet here, and the save bar is what tells them apart:
//
//   projects        edits go to a draft beside the live row; Publish promotes them
//   everything else a save is the live value, and the bar says so before you make one

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { grouped } from './schema'
import type { CollectionUI, FieldUI } from './schema'
import { Field } from './Fields'
import { ItemList } from './List'
import { Preview } from './Preview'
import {
  Banner,
  Button,
  CARD,
  Confirm,
  DiscardPrompt,
  Group,
  SaveBar,
  StatusBadge,
  fieldErrors,
  useAction,
  useDirty,
  useSaveShortcut,
} from './ui'
import type { SaveState } from './ui'
import { useAdmin, useList } from './store'
import { s } from '../../src/os/css'

/** What the public site does after this save, said plainly. Never "instantly everywhere". */
const PROPAGATION = 'Live now — may take a minute or two to appear everywhere.'

/** JSON columns arrive from D1 as text; these inputs want the parsed value. */
const JSON_INPUTS = new Set(['chips', 'paragraphs', 'pairs', 'map', 'kb', 'links', 'sections'])

export function hydrate(row: Record<string, any>, fields: FieldUI[]): Record<string, any> {
  const out = { ...row }
  for (const field of fields) {
    if (!JSON_INPUTS.has(field.input)) continue
    const raw = out[field.col]
    if (typeof raw !== 'string') continue
    try {
      out[field.col] = JSON.parse(raw)
    } catch {
      out[field.col] = field.input === 'map' ? {} : []
    }
  }
  return out
}

/** A project's pending edits, laid over the live columns. Absent or corrupt means no draft. */
function withDraft(row: Record<string, any>, fields: FieldUI[]): Record<string, any> {
  const raw = row.draft
  if (typeof raw !== 'string' || !raw) return hydrate(row, fields)
  try {
    const pending = JSON.parse(raw)
    return hydrate({ ...row, ...pending }, fields)
  } catch {
    return hydrate(row, fields)
  }
}

/** Only the columns the form owns are sent, so nothing else on the row can be overwritten. */
function payload(draft: Record<string, any>, fields: FieldUI[], extra: Record<string, unknown> = {}) {
  const body: Record<string, unknown> = { ...extra }
  for (const field of fields) body[field.col] = draft[field.col]
  return body
}

type Editing = {
  creating: boolean
  row: Record<string, any>
  values: Record<string, any>
  /** The last state the server confirmed, for dirty comparison. */
  baseline: Record<string, any>
  /** The row version this editor loaded, sent back so a second tab cannot be overwritten silently. */
  version?: string
}

export function Collection({
  ui,
  siteOrigin,
  openId,
  onOpen,
  onDirty,
}: {
  ui: CollectionUI
  siteOrigin: string
  /** The item the URL says is open — an id, or 'new' to start one. */
  openId?: string
  onOpen?: (id: string | null) => void
  onDirty?: (dirty: boolean) => void
}) {
  const drafts = ui.type === 'projects'

  const items = useList(ui.type)
  const { lists, refresh, error: listError } = useAdmin()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [state, setState] = useState<SaveState>('saved')
  const [notice, setNotice] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<Record<string, any> | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const { error, busy, run, setError } = useAction()

  const dirty = useDirty(editing?.values, editing?.baseline)
  const invalid = useMemo(() => fieldErrors(error?.fields ?? []), [error])

  /**
   * Names already used elsewhere in the portfolio, offered while typing a tag. A project's stack
   * and a skill group are the same vocabulary, so suggesting across both is what keeps "PyTorch"
   * from turning into "pytorch" on one screen and "Pytorch" on another.
   */
  const suggestions = useMemo(() => {
    const names = new Set<string>()
    const collect = (rows: Record<string, any>[] | undefined, column: string) => {
      for (const row of rows ?? []) {
        const raw = row[column]
        try {
          const values = typeof raw === 'string' ? JSON.parse(raw) : raw
          if (Array.isArray(values)) values.forEach((v) => typeof v === 'string' && names.add(v))
        } catch {
          // A corrupt cell is not worth a suggestion, and certainly not worth a crash.
        }
      }
    }
    collect(lists.projects, 'stack')
    collect(lists.skills, 'items')
    return [...names].sort()
  }, [lists])

  const load = useCallback(() => refresh(ui.type), [refresh, ui.type])

  useEffect(() => {
    onDirty?.(dirty)
    return () => onDirty?.(false)
  }, [dirty, onDirty])

  useEffect(() => {
    if (state === 'saving' || state === 'publishing') return
    setState(dirty ? 'dirty' : 'saved')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty])

  const open = useCallback(
    (row: Record<string, any>) => {
      const values = drafts ? withDraft(row, ui.fields) : hydrate(row, ui.fields)
      setEditing({ creating: false, row, values, baseline: values, version: row.updated_at })
      setError(null)
      setNotice(null)
    },
    [drafts, ui.fields, setError],
  )

  const create = useCallback(() => {
    const values = { ...ui.defaults }
    setEditing({ creating: true, row: {}, values, baseline: values })
    setError(null)
    setNotice(null)
  }, [ui.defaults, setError])

  const close = () => {
    setEditing(null)
    setError(null)
    setLeaving(false)
    onOpen?.(null)
  }

  /**
   * The URL is what says which item is open, so a bookmarked or refreshed editor comes back to
   * the same row. `new` is the one id that means "not a row yet".
   */
  useEffect(() => {
    if (!openId) {
      setEditing(null)
      return
    }
    if (openId === 'new') {
      if (!editing) create()
      return
    }
    if (editing && editing.row.id === openId) return
    const row = items.find((i) => i.id === openId)
    if (row) open(row)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, items])

  /**
   * Saving never clears the editor on failure — the author's work stays exactly where it is and
   * the bar offers another attempt.
   */
  const save = async (): Promise<boolean> => {
    if (!editing) return false
    setState('saving')
    setNotice(null)

    const ok = await run(async () => {
      if (editing.creating) {
        const created = await api.create(
          ui.type,
          payload(editing.values, ui.fields, { published: editing.values.published ?? 0 }),
        )
        setEditing({ ...editing, creating: false, row: { ...editing.row, id: created.id } })
        // The URL stops saying 'new' the moment the row exists, so a refresh reopens it.
        onOpen?.(created.id)
        return
      }
      const body = payload(editing.values, ui.fields, { expectedUpdatedAt: editing.version })
      const saved = drafts
        ? await api.saveDraft(editing.row.id, body)
        : await api.update(ui.type, editing.row.id, body)
      setEditing({
        ...editing,
        baseline: editing.values,
        version: (saved as { updatedAt?: string }).updatedAt ?? editing.version,
      })
    })

    if (!ok) {
      setState('failed')
      return false
    }
    setState('saved')
    setNotice(
      editing.creating
        ? 'Draft saved. Nothing is public until you publish.'
        : drafts
          ? 'Saved. Your edits are not public until you publish.'
          : `Saved. ${PROPAGATION}`,
    )
    await load()
    return true
  }

  useSaveShortcut(() => void save(), !!editing && (dirty || state === 'failed'))

  const publish = async () => {
    if (!editing) return
    if (dirty && !(await save())) return
    setState('publishing')
    const ok = await run(async () => {
      const done = await api.publish(editing.row.id, editing.version)
      setEditing((e) =>
        e ? { ...e, row: { ...e.row, id: done.id, published: 1 }, version: done.updatedAt } : e,
      )
    })
    setState(ok ? 'saved' : 'failed')
    if (ok) setNotice(`Published. ${PROPAGATION}`)
    await load()
  }

  const discardDraft = async () => {
    if (!editing) return
    setDiscarding(false)
    const ok = await run(() => api.discardDraft(editing.row.id, editing.version))
    if (!ok) return
    const fresh = await load()
    const row = fresh.find((i) => i.id === editing.row.id)
    if (row) open(row)
    setNotice('Pending edits discarded. The published version is unchanged.')
  }

  const togglePublish = async (item: Record<string, any>) => {
    if (item.published) {
      await run(() => api.update(ui.type, item.id, { published: 0 }))
    } else if (drafts) {
      await run(() => api.publish(item.id, item.updated_at))
    } else {
      await run(() => api.update(ui.type, item.id, { published: 1 }))
    }
    await load()
  }

  const duplicate = async (item: Record<string, any>) => {
    let created: { id: string } | null = null
    if (!(await run(async () => void (created = await api.duplicate(item.id))))) return
    await load()
    setNotice('Copied. The copy is not published, and its slug has “-copy” on the end.')
    if (created) onOpen?.((created as { id: string }).id)
  }

  const quickSave = async (item: Record<string, any>, values: Record<string, unknown>) => {
    const ok = await run(() =>
      api.update(ui.type, item.id, { ...values, expectedUpdatedAt: item.updated_at }),
    )
    if (ok) {
      setNotice(`Saved. ${PROPAGATION}`)
      await load()
    }
    return ok
  }

  /**
   * Reordering is confirmed, not optimistic. The previous version swapped the rows on screen and
   * never looked at the answer, so a refused reorder left the list showing an order the database
   * did not have — and the next save wrote from that.
   */
  const move = async (item: Record<string, any>, by: number) => {
    const index = items.findIndex((i) => i.id === item.id)
    const target = index + by
    if (index < 0 || target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    if (await run(() => api.reorder(ui.type, next.map((i) => i.id)))) await load()
  }

  const remove = async (item: Record<string, any>) => {
    setConfirming(null)
    await run(() => api.remove(ui.type, item.id))
    if (editing?.row.id === item.id) close()
    await load()
  }

  if (editing) {
    const published = !!editing.row.published
    const hasDraft = drafts && !editing.creating
    const note = editing.creating
      ? 'Not public yet.'
      : drafts
        ? published
          ? dirty || editing.row.draft
            ? 'The published version is still live. Your edits are not public until you publish.'
            : 'Live.'
          : 'Not public yet. Publish when you are ready.'
        : published
          ? 'This item is live — saving updates the public site.'
          : 'Not public yet.'

    const sections = grouped(ui.fields)
    const title = editing.values[ui.titleCol]

    return (
      <div style={s(CARD)}>
        <div style={s('display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px')}>
          <h1 style={s('margin:0;font-size:16px')}>
            {editing.creating ? `New ${ui.singular}` : title || `Untitled ${ui.singular}`}
          </h1>
          {ui.publishable && !editing.creating ? (
            <>
              {published ? (
                <StatusBadge tone="live">Published</StatusBadge>
              ) : (
                <StatusBadge tone="quiet">Not published</StatusBadge>
              )}
              {editing.row.draft ? <StatusBadge tone="pending">Unpublished changes</StatusBadge> : null}
            </>
          ) : null}
        </div>

        {error ? <Banner tone="error">{error.message}</Banner> : null}
        {notice ? <Banner tone="ok">{notice}</Banner> : null}

        {drafts ? (
          <Group title="Preview" summary="How this will look" open={false}>
            <Preview
              values={editing.values}
              published={editing.creating ? undefined : editing.row}
              isPublished={published}
            />
          </Group>
        ) : null}

        {sections.map((section, i) =>
          section.title ? (
            <Group key={section.title} title={section.title} open={i === 0}>
              {section.fields.map((field) => (
                <Field
                  key={field.col}
                  field={field}
                  value={editing.values[field.col]}
                  error={invalid[field.col]}
                  form={editing.values}
                  suggest={suggestions}
                  onChange={(v) =>
                    setEditing({ ...editing, values: { ...editing.values, [field.col]: v } })
                  }
                />
              ))}
            </Group>
          ) : (
            section.fields.map((field) => (
              <Field
                key={field.col}
                field={field}
                value={editing.values[field.col]}
                error={invalid[field.col]}
                form={editing.values}
                suggest={suggestions}
                onChange={(v) =>
                  setEditing({ ...editing, values: { ...editing.values, [field.col]: v } })
                }
              />
            ))
          ),
        )}

        <SaveBar state={state} note={note}>
          <Button onClick={() => (dirty ? setLeaving(true) : close())} disabled={busy}>
            Close
          </Button>
          {hasDraft && editing.row.draft ? (
            <Button onClick={() => setDiscarding(true)} disabled={busy}>
              Discard pending edits
            </Button>
          ) : null}
          <Button onClick={save} disabled={busy || (!dirty && state !== 'failed')}>
            {state === 'failed' ? 'Retry save' : drafts && !editing.creating ? 'Save changes' : 'Save'}
          </Button>
          {drafts && !editing.creating ? (
            <Button tone="accent" onClick={publish} disabled={busy}>
              {published ? 'Publish changes' : 'Publish'}
            </Button>
          ) : null}
        </SaveBar>

        {leaving ? <DiscardPrompt onStay={() => setLeaving(false)} onDiscard={close} /> : null}
        {discarding ? (
          <Confirm
            title="Discard pending edits?"
            message="The published version stays exactly as it is. The edits you have not published are lost."
            confirmLabel="Discard"
            onCancel={() => setDiscarding(false)}
            onConfirm={discardDraft}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div>
      {error ? <Banner tone="error">{error.message}</Banner> : null}
      {!error && listError ? <Banner tone="error">{listError}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}

      <ItemList
        ui={ui}
        items={items}
        siteOrigin={siteOrigin}
        busy={busy}
        quickNote={
          drafts
            ? 'A quick edit is written straight to the live project. Pending edits, if there are any, still replace it when you publish.'
            : `Saving here updates the public site. ${PROPAGATION}`
        }
        onOpen={(id) => onOpen?.(id)}
        onDuplicate={duplicate}
        onDelete={setConfirming}
        onTogglePublished={togglePublish}
        onMove={move}
        onQuickSave={quickSave}
      />

      {confirming ? (
        <Confirm
          title={`Delete “${confirming[ui.titleCol] || `this ${ui.singular}`}”?`}
          message="It is removed from the public portfolio. Files it owns go too, unless something else still uses them."
          onCancel={() => setConfirming(null)}
          onConfirm={() => remove(confirming)}
        />
      ) : null}
    </div>
  )
}
