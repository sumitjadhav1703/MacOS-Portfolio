// The list screen for any content type — and for projects, the main screen of the whole CMS.
//
// One row design covers every type; what differs is declared in schema.ts (which column is the
// headline, which one is the picture, what search looks at). Searching, filtering and sorting
// are pure functions in filters.ts, so what a row does is the only thing decided here.

import { useMemo, useState } from 'react'
import type { CollectionUI } from './schema'
import { ALL, applyQuery, canReorder, relative } from './filters'
import type { Query, Row } from './filters'
import { Field } from './Fields'
import { Button, CARD, Input, Select, StatusBadge, Thumb, Toggle } from './ui'
import { s } from '../../src/os/css'

const LINE = 'font-size:11px;color:var(--s-faint);margin-top:3px'

/** Published, not published, or published with edits waiting — the three states a row can be in. */
function Status({ item, publishable }: { item: Row; publishable: boolean }) {
  if (!publishable) return null
  return (
    <span style={s('display:flex;gap:6px;flex-wrap:wrap')}>
      {item.published ? (
        <StatusBadge tone="live">Published</StatusBadge>
      ) : (
        <StatusBadge tone="quiet">Not published</StatusBadge>
      )}
      {item.draft ? <StatusBadge tone="pending">Unpublished changes</StatusBadge> : null}
      {item.featured ? <StatusBadge tone="quiet">Featured</StatusBadge> : null}
    </span>
  )
}

/**
 * The handful of fields that get changed on their own, edited in place (spec §32). Deliberately
 * not every field: an editor that can do everything is the editor, and it already exists.
 */
function QuickEdit({
  ui,
  item,
  busy,
  note,
  onCancel,
  onSave,
}: {
  ui: CollectionUI
  item: Row
  busy: boolean
  note: string
  onCancel: () => void
  onSave: (values: Record<string, unknown>) => void
}) {
  const [values, setValues] = useState<Record<string, any>>(() => {
    const out: Record<string, any> = {}
    for (const col of ui.quick) out[col] = item[col] ?? ''
    if (ui.publishable) out.published = item.published ? 1 : 0
    if ('featured' in item) out.featured = item.featured ? 1 : 0
    return out
  })

  return (
    <div style={s('flex-basis:100%;border-top:1px solid var(--s-line);margin-top:12px;padding-top:14px')}>
      {ui.quick.map((col) => {
        const field = ui.fields.find((f) => f.col === col)
        if (!field) return null
        return (
          <Field
            key={col}
            field={{ ...field, hint: undefined }}
            value={values[col]}
            form={values}
            onChange={(v) => setValues({ ...values, [col]: v })}
          />
        )
      })}
      {ui.publishable ? (
        <Toggle
          label="Published"
          checked={!!values.published}
          onChange={(v) => setValues({ ...values, published: v ? 1 : 0 })}
        />
      ) : null}
      {'featured' in item ? (
        <Toggle
          label="Featured"
          checked={!!values.featured}
          onChange={(v) => setValues({ ...values, featured: v ? 1 : 0 })}
        />
      ) : null}
      <div style={s('font-size:11px;color:var(--s-faint);margin-bottom:10px')}>{note}</div>
      <div style={s('display:flex;gap:8px;flex-wrap:wrap')}>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button tone="accent" onClick={() => onSave(values)} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

export function ItemList({
  ui,
  items,
  siteOrigin,
  busy,
  quickNote,
  onOpen,
  onDuplicate,
  onDelete,
  onTogglePublished,
  onMove,
  onQuickSave,
}: {
  ui: CollectionUI
  items: Row[]
  siteOrigin: string
  busy: boolean
  /** What a quick save actually does to this type, said plainly. */
  quickNote: string
  onOpen: (id: string | null) => void
  onDuplicate: (item: Row) => void
  onDelete: (item: Row) => void
  onTogglePublished: (item: Row) => void
  onMove: (item: Row, by: number) => void
  onQuickSave: (item: Row, values: Record<string, unknown>) => Promise<boolean>
}) {
  const [query, setQuery] = useState<Query>(ALL)
  const [quick, setQuick] = useState<string | null>(null)

  const shown = useMemo(
    () => applyQuery(items, query, ui.searchCols, ui.titleCol),
    [items, query, ui.searchCols, ui.titleCol],
  )
  const ordered = canReorder(query)
  const filtered = shown.length !== items.length

  return (
    <div>
      <div style={s('display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap')}>
        <h1 style={s('margin:0;font-size:16px')}>{ui.title}</h1>
        <Button tone="accent" onClick={() => onOpen('new')}>
          Add {ui.singular}
        </Button>
      </div>

      <div style={s('display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap')}>
        <Input
          type="search"
          value={query.text}
          placeholder={`Search ${ui.title.toLowerCase()}`}
          aria-label={`Search ${ui.title.toLowerCase()}`}
          style={s('flex:1;min-width:180px;width:auto')}
          onChange={(e) => setQuery({ ...query, text: e.target.value })}
        />
        {ui.publishable ? (
          <Select
            value={query.status}
            aria-label="Filter by status"
            style={s('width:auto;flex:none')}
            onChange={(e) => setQuery({ ...query, status: e.target.value as Query['status'] })}
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="unpublished">Not published</option>
            {ui.duplicable ? <option value="changes">Unpublished changes</option> : null}
            {ui.duplicable ? <option value="featured">Featured</option> : null}
          </Select>
        ) : null}
        <Select
          value={query.sort}
          aria-label="Sort"
          style={s('width:auto;flex:none')}
          onChange={(e) => setQuery({ ...query, sort: e.target.value as Query['sort'] })}
        >
          <option value="order">Your order</option>
          <option value="recent">Recently changed</option>
          <option value="title">A – Z</option>
        </Select>
      </div>

      <div style={s(CARD + ';padding:0;overflow:hidden')}>
        {items.length === 0 ? (
          <div style={s('padding:24px;color:var(--s-faint);font-size:13px')}>
            Nothing here yet. “Add {ui.singular}” starts one.
          </div>
        ) : null}
        {items.length > 0 && shown.length === 0 ? (
          <div style={s('padding:24px;color:var(--s-faint);font-size:13px')}>
            Nothing matches that. <button
              type="button"
              onClick={() => setQuery(ALL)}
              data-focusable
              style={s('border:0;background:none;color:var(--s-accent);cursor:pointer;font:inherit')}
            >
              Clear the filters
            </button>
          </div>
        ) : null}

        {shown.map((item, i) => {
          const thumb = ui.thumbCol && item[ui.thumbCol] ? `/files/${item[ui.thumbCol]}` : undefined
          return (
            <div
              key={item.id}
              style={s(
                'display:flex;align-items:flex-start;gap:12px;padding:14px 16px;flex-wrap:wrap;' +
                  (i ? 'border-top:1px solid var(--s-line)' : ''),
              )}
            >
              {ui.thumbCol ? <Thumb src={thumb} alt="" /> : null}

              <div style={s('flex:1;min-width:180px')}>
                <div style={s('font-size:13px')}>{item[ui.titleCol] || `Untitled ${ui.singular}`}</div>
                {ui.subtitleCol && item[ui.subtitleCol] ? (
                  <div style={s('font-size:12px;color:var(--s-dim);margin-top:2px')}>
                    {String(item[ui.subtitleCol]).slice(0, 140)}
                  </div>
                ) : null}
                <div style={s('display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:7px')}>
                  <Status item={item} publishable={ui.publishable} />
                  <span style={s(LINE + ';margin-top:0')}>
                    {(ui.metaCols ?? []).map((c) => item[c]).filter(Boolean).join(' · ')}
                    {(ui.metaCols ?? []).some((c) => item[c]) ? ' · ' : ''}
                    <time dateTime={String(item.updated_at ?? '')} title={String(item.updated_at ?? '')}>
                      edited {relative(item.updated_at)}
                    </time>
                  </span>
                </div>
              </div>

              <div style={s('display:flex;gap:6px;flex-wrap:wrap;align-items:center')}>
                {ordered ? (
                  <>
                    <Button label={`Move ${item[ui.titleCol]} up`} onClick={() => onMove(item, -1)}>
                      ↑
                    </Button>
                    <Button label={`Move ${item[ui.titleCol]} down`} onClick={() => onMove(item, 1)}>
                      ↓
                    </Button>
                  </>
                ) : null}
                {ui.type === 'projects' && item.published ? (
                  <a
                    href={`${siteOrigin}/projects/${item.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={s('font-size:12px;padding:0 4px')}
                  >
                    View live
                  </a>
                ) : null}
                <Button onClick={() => setQuick(quick === item.id ? null : item.id)}>
                  {quick === item.id ? 'Close' : 'Quick edit'}
                </Button>
                <Button onClick={() => onOpen(item.id)}>Edit</Button>
                {ui.publishable ? (
                  <Button onClick={() => onTogglePublished(item)} disabled={busy}>
                    {item.published ? 'Unpublish' : 'Publish'}
                  </Button>
                ) : null}
                {ui.duplicable ? (
                  <Button onClick={() => onDuplicate(item)} disabled={busy}>
                    Duplicate
                  </Button>
                ) : null}
                <Button tone="danger" onClick={() => onDelete(item)}>
                  Delete
                </Button>
              </div>

              {quick === item.id ? (
                <QuickEdit
                  ui={ui}
                  item={item}
                  busy={busy}
                  note={quickNote}
                  onCancel={() => setQuick(null)}
                  onSave={async (values) => {
                    if (await onQuickSave(item, values)) setQuick(null)
                  }}
                />
              ) : null}
            </div>
          )
        })}
      </div>

      {filtered && shown.length ? (
        <p style={s('font-size:11px;color:var(--s-faint);margin-top:10px')}>
          Showing {shown.length} of {items.length}.
          {ordered ? '' : ' Reordering is only offered when the list is showing everything in your own order.'}
        </p>
      ) : null}
    </div>
  )
}
