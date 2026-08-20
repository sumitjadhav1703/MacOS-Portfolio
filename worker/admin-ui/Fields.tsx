// One form control per FieldUI.
//
// Nothing here asks an author to type a delimiter. Every list-shaped column — links, stack,
// aliases, skills, paragraphs, shell commands, neofetch rows, the Ask Sumit answers, the
// shortcut sheet, and the flow and metrics blocks inside a project section — is edited as rows
// or chips, and the JSON that lands in D1 stays an implementation detail (spec §14, §16, §18,
// §26, §27, §29).
//
// The shapes themselves are still exactly what src/data declares, so the public site needs no
// change to read anything typed here.

import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { FieldUI } from './schema'
import { dateProblem, slugify, urlProblem } from './forms'
import { LinkIcon, TagIcon, platformLabel, tagHasIcon } from './AdminIcon'
import { Button, DANGER, Input, Label, Select, Textarea, Toggle } from './ui'
import { s } from '../../src/os/css'

const ROW = 'display:flex;gap:8px;align-items:flex-start;margin-bottom:8px'
const CELLS = 'flex:1;min-width:0;display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))'
const NOTE = 'font-size:11px;color:var(--s-faint);margin-top:4px'

/** The small red line under a control. Same shape wherever a value is refused. */
const Problem = ({ children }: { children: ReactNode }) => (
  <span role="alert" style={{ ...s('display:block;font-size:11px;margin-top:4px'), color: DANGER }}>
    {children}
  </span>
)

/** The label, hint and error frame every field shares, for controls that are not a single input. */
function Fieldset({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <fieldset style={s('border:0;padding:0;margin:0 0 16px')}>
      <legend style={s('font-size:12px;color:var(--s-dim);padding:0;margin-bottom:6px')}>{label}</legend>
      {children}
      {error ? <Problem>{error}</Problem> : hint ? <span style={s(NOTE)}>{hint}</span> : null}
    </fieldset>
  )
}

/**
 * The one list editor. Everything with more than one entry is built from this — add, remove,
 * reorder and, where it earns its place, duplicate — so the behaviour is identical whether you
 * are editing links, shell commands or the sections of a project.
 */
function Rows<T>({
  label,
  hint,
  error,
  items,
  blank,
  addLabel,
  onChange,
  render,
  duplicable,
  name,
}: {
  label: string
  hint?: string
  error?: string
  items: T[]
  blank: () => T
  addLabel: string
  onChange: (next: T[]) => void
  render: (item: T, set: (next: T) => void, index: number) => ReactNode
  /** Sections earn a Duplicate; a two-column row does not (spec §18). */
  duplicable?: boolean
  /** What one row is called, for the reorder and remove button names. */
  name: string
}) {
  const replace = (i: number, next: T) => onChange(items.map((item, j) => (j === i ? next : item)))
  const move = (i: number, by: number) => {
    const next = [...items]
    const target = i + by
    if (target < 0 || target >= next.length) return
    ;[next[i], next[target]] = [next[target]!, next[i]!]
    onChange(next)
  }

  return (
    <Fieldset label={label} hint={hint} error={error}>
      {items.map((item, i) => (
        <div key={i} style={s(ROW)}>
          <div style={s(CELLS)}>{render(item, (next) => replace(i, next), i)}</div>
          <div style={s('display:flex;gap:4px;flex:none')}>
            <Button label={`Move this ${name} up`} onClick={() => move(i, -1)}>
              ↑
            </Button>
            <Button label={`Move this ${name} down`} onClick={() => move(i, 1)}>
              ↓
            </Button>
            {duplicable ? (
              <Button
                label={`Duplicate this ${name}`}
                onClick={() => onChange([...items.slice(0, i + 1), item, ...items.slice(i + 1)])}
              >
                ⧉
              </Button>
            ) : null}
            <Button
              tone="danger"
              label={`Remove this ${name}`}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              ✕
            </Button>
          </div>
        </div>
      ))}
      <Button onClick={() => onChange([...items, blank()])}>{addLabel}</Button>
    </Fieldset>
  )
}

/**
 * Free-text tags — a project's stack, its shell aliases, a skill group, the suggested questions.
 * Each one shows the mark it resolves to, so "is there an icon for this?" is answered while it is
 * being typed rather than after a deploy (spec §16, §17).
 */
function ChipsField({
  field,
  value,
  error,
  onChange,
  suggest = [],
}: {
  field: FieldUI
  value: unknown
  error?: string
  onChange: (v: string[]) => void
  /** Names already used elsewhere in the portfolio, so spellings stay consistent. */
  suggest?: string[]
}) {
  const items: string[] = Array.isArray(value) ? (value as string[]) : []
  const [entry, setEntry] = useState('')
  const listId = useId()

  const add = (raw: string) => {
    const next = raw.trim()
    if (!next || items.includes(next)) {
      setEntry('')
      return
    }
    onChange([...items, next])
    setEntry('')
  }

  const move = (i: number, by: number) => {
    const next = [...items]
    const target = i + by
    if (target < 0 || target >= next.length) return
    ;[next[i], next[target]] = [next[target]!, next[i]!]
    onChange(next)
  }

  const missing = items.filter((item) => !tagHasIcon(item)).length

  return (
    <Fieldset label={field.label} hint={field.hint} error={error}>
      <div style={s('display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px')}>
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            style={s(
              'display:inline-flex;align-items:center;gap:6px;border:1px solid var(--s-line);' +
                'border-radius:999px;padding:4px 6px 4px 10px;font-size:12px;background:var(--s-fill)',
            )}
          >
            <TagIcon tag={item} size={13} />
            {item}
            <button
              type="button"
              onClick={() => move(i, -1)}
              aria-label={`Move ${item} earlier`}
              data-focusable
              style={s('border:0;background:none;color:var(--s-faint);cursor:pointer;font:inherit;font-size:11px;padding:0 2px')}
            >
              ◂
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              aria-label={`Move ${item} later`}
              data-focusable
              style={s('border:0;background:none;color:var(--s-faint);cursor:pointer;font:inherit;font-size:11px;padding:0 2px')}
            >
              ▸
            </button>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label={`Remove ${item}`}
              data-focusable
              style={s('border:0;background:none;color:var(--s-text);cursor:pointer;font:inherit;padding:0 4px')}
            >
              ×
            </button>
          </span>
        ))}
        {items.length === 0 ? (
          <span style={s('font-size:12px;color:var(--s-faint)')}>Nothing added yet.</span>
        ) : null}
      </div>

      <div style={s('display:flex;gap:8px;align-items:center;flex-wrap:wrap')}>
        <input
          value={entry}
          list={listId}
          placeholder={field.placeholder ?? 'Add one'}
          aria-label={`Add to ${field.label}`}
          data-focusable
          onChange={(e) => {
            // A comma is how people separate these when pasting, so it commits rather than typing.
            const text = e.target.value
            if (text.includes(',')) text.split(',').forEach(add)
            else setEntry(text)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(entry)
            }
            if (e.key === 'Backspace' && !entry && items.length) {
              onChange(items.slice(0, -1))
            }
          }}
          style={s(
            'flex:1;min-width:140px;background:var(--s-input);color:var(--s-text);font:inherit;' +
              'font-size:13px;border:1px solid var(--s-line);border-radius:8px;padding:8px 10px',
          )}
        />
        <datalist id={listId}>
          {suggest.filter((name) => !items.includes(name)).map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <Button onClick={() => add(entry)} disabled={!entry.trim()}>
          Add
        </Button>
      </div>
      {missing ? (
        <span style={s(NOTE)}>
          {missing === 1 ? 'One entry has' : `${missing} entries have`} no matching mark and will show
          the generic one. That is fine — nothing breaks.
        </span>
      ) : null}
    </Fieldset>
  )
}

type Link = { label: string; url: string }

/** Label, URL, and the platform the URL resolves to. There is no icon field to fill in. */
function LinksField({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldUI
  value: unknown
  error?: string
  onChange: (v: Link[]) => void
}) {
  const items: Link[] = Array.isArray(value) ? (value as Link[]) : []
  return (
    <Rows
      label={field.label}
      hint={field.hint}
      error={error}
      name="link"
      items={items}
      blank={() => ({ label: '', url: '' })}
      addLabel="+ Add link"
      onChange={onChange}
      render={(item, set) => {
        const problem = urlProblem(item.url)
        return (
          <>
            <Input
              value={item.label}
              placeholder={field.columns?.[0] ?? 'Label'}
              aria-label="Link label"
              onChange={(e) => set({ ...item, label: e.target.value })}
            />
            <div style={s('min-width:0')}>
              <Input
                value={item.url}
                placeholder={field.columns?.[1] ?? 'https://…'}
                aria-label="Link URL"
                aria-invalid={!!problem}
                onChange={(e) => set({ ...item, url: e.target.value })}
              />
              <div style={s('display:flex;align-items:center;gap:6px;margin-top:5px;flex-wrap:wrap')}>
                <LinkIcon url={item.url} size={13} />
                <span style={s('font-size:11px;color:var(--s-faint)')}>
                  {problem ? '' : platformLabel(item.url) || 'External website'}
                </span>
                {item.url && !problem ? (
                  <a href={item.url} target="_blank" rel="noreferrer" style={s('font-size:11px')}>
                    Open
                  </a>
                ) : null}
              </div>
              {problem ? <Problem>{problem}</Problem> : null}
            </div>
          </>
        )
      }}
    />
  )
}

/** Two columns of text. `pairs` keeps its order; `map` is the same rows keyed by the left one. */
function PairsField({
  field,
  value,
  error,
  keyed,
  onChange,
}: {
  field: FieldUI
  value: unknown
  error?: string
  keyed: boolean
  onChange: (v: unknown) => void
}) {
  const fromValue = (): [string, string][] =>
    keyed
      ? Object.entries((value && typeof value === 'object' ? value : {}) as Record<string, string>)
      : Array.isArray(value)
        ? (value as [string, string][]).map((p) => [p?.[0] ?? '', p?.[1] ?? ''] as [string, string])
        : []

  // A keyed field keeps its own rows. Deriving them from the object would drop a row the moment
  // its key was blank — which is what every new row is, right up until the first character.
  const [rows, setRows] = useState<[string, string][]>(fromValue)
  const mine = useRef('')

  useEffect(() => {
    if (!keyed) return
    const incoming = JSON.stringify(value ?? {})
    if (incoming !== mine.current) setRows(fromValue())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, keyed])

  const items = keyed ? rows : fromValue()

  const emit = (next: [string, string][]) => {
    if (!keyed) {
      onChange(next)
      return
    }
    setRows(next)
    const object = Object.fromEntries(next.filter(([k]) => k.trim()))
    mine.current = JSON.stringify(object)
    onChange(object)
  }

  return (
    <Rows
      label={field.label}
      hint={field.hint}
      error={error}
      name="row"
      items={items}
      blank={(): [string, string] => ['', '']}
      addLabel="+ Add row"
      onChange={emit}
      render={(item, set) => (
        <>
          <Input
            value={item[0]}
            placeholder={field.columns?.[0] ?? 'Name'}
            aria-label={field.columns?.[0] ?? 'Name'}
            onChange={(e) => set([e.target.value, item[1]])}
          />
          <Textarea
            value={item[1]}
            placeholder={field.columns?.[1] ?? 'Value'}
            aria-label={field.columns?.[1] ?? 'Value'}
            style={s('min-height:38px')}
            onChange={(e) => set([item[0], e.target.value])}
          />
        </>
      )}
    />
  )
}

/** An Ask Sumit answer: the words that find it, and what it says. */
function KbField({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldUI
  value: unknown
  error?: string
  onChange: (v: [string[], string][]) => void
}) {
  const items: [string[], string][] = Array.isArray(value)
    ? (value as [string[], string][]).map(
        (entry) =>
          [Array.isArray(entry?.[0]) ? entry[0] : [], typeof entry?.[1] === 'string' ? entry[1] : ''] as [
            string[],
            string,
          ],
      )
    : []

  return (
    <Rows
      label={field.label}
      hint={field.hint}
      error={error}
      name="answer"
      items={items}
      blank={(): [string[], string] => [[], '']}
      addLabel="+ Add answer"
      onChange={onChange}
      render={(item, set) => (
        <div style={s('grid-column:1/-1')}>
          <ChipsField
            field={{ col: 'keywords', label: 'Keywords', input: 'chips', placeholder: 'add a keyword' }}
            value={item[0]}
            onChange={(keys) => set([keys, item[1]])}
          />
          <Textarea
            value={item[1]}
            placeholder="The answer, in Sumit’s voice."
            aria-label="Answer"
            onChange={(e) => set([item[0], e.target.value])}
          />
        </div>
      )}
    />
  )
}

/** The About text: one box per paragraph, so a paragraph can be moved without cutting and pasting. */
function ParagraphsField({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldUI
  value: unknown
  error?: string
  onChange: (v: string[]) => void
}) {
  const items: string[] = Array.isArray(value) ? (value as string[]) : []
  return (
    <Rows
      label={field.label}
      hint={field.hint}
      error={error}
      name="paragraph"
      items={items}
      blank={() => ''}
      addLabel="+ Add paragraph"
      onChange={onChange}
      render={(item, set, i) => (
        <Textarea
          value={item}
          aria-label={`Paragraph ${i + 1}`}
          onChange={(e) => set(e.target.value)}
          style={s('grid-column:1/-1;min-height:80px')}
        />
      )}
    />
  )
}

type SectionBody =
  | { text: string }
  | { flow: [string, string][] }
  | { metrics: [string, string, string?][] }
  | { chart: 'sar-mse' }
type Section = { heading?: string; body: SectionBody }

const bodyKind = (body: SectionBody): string =>
  'text' in body ? 'text' : 'flow' in body ? 'flow' : 'metrics' in body ? 'metrics' : 'chart'

const emptyBody = (kind: string): SectionBody =>
  kind === 'flow'
    ? { flow: [] }
    : kind === 'metrics'
      ? { metrics: [] }
      : kind === 'chart'
        ? { chart: 'sar-mse' }
        : { text: '' }

/** The project body: a list of blocks, each one of the four shapes ProjectWindow knows how to draw. */
function SectionsField({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldUI
  value: unknown
  error?: string
  onChange: (v: Section[]) => void
}) {
  const sections: Section[] = Array.isArray(value) ? (value as Section[]) : []

  return (
    <Rows
      label={field.label}
      hint={field.hint}
      error={error}
      name="section"
      duplicable
      items={sections}
      blank={() => ({ heading: '', body: { text: '' } })}
      addLabel="+ Add section"
      onChange={onChange}
      render={(section, set) => {
        const kind = bodyKind(section.body)
        return (
          <div
            style={s(
              'grid-column:1/-1;border:1px solid var(--s-line);border-radius:10px;padding:12px;background:var(--s-win)',
            )}
          >
            <div style={s('display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap')}>
              <Input
                placeholder="Heading (optional)"
                aria-label="Section heading"
                value={section.heading ?? ''}
                onChange={(e) => set({ ...section, heading: e.target.value })}
              />
              <Select
                value={kind}
                aria-label="Section type"
                style={s('width:auto;flex:none')}
                onChange={(e) => set({ ...section, body: emptyBody(e.target.value) })}
              >
                <option value="text">Text</option>
                <option value="flow">Flow diagram</option>
                <option value="metrics">Metrics</option>
                <option value="chart">SAR chart</option>
              </Select>
            </div>

            {kind === 'text' ? (
              <Textarea
                aria-label="Section text"
                value={(section.body as { text: string }).text}
                onChange={(e) => set({ ...section, body: { text: e.target.value } })}
              />
            ) : null}

            {kind === 'flow' ? (
              <PairsField
                field={{ col: 'flow', label: 'Steps', input: 'pairs', columns: ['Step', 'Caption'] }}
                keyed={false}
                value={(section.body as { flow: [string, string][] }).flow}
                onChange={(flow) => set({ ...section, body: { flow: flow as [string, string][] } })}
              />
            ) : null}

            {kind === 'metrics' ? (
              <Rows
                label="Metrics"
                name="metric"
                items={(section.body as { metrics: [string, string, string?][] }).metrics}
                blank={(): [string, string, string?] => ['', '']}
                addLabel="+ Add metric"
                onChange={(metrics) => set({ ...section, body: { metrics } })}
                render={(metric, setMetric) => (
                  <>
                    <Input
                      value={metric[0]}
                      placeholder="Label"
                      aria-label="Metric label"
                      onChange={(e) => setMetric([e.target.value, metric[1], metric[2]])}
                    />
                    <Input
                      value={metric[1]}
                      placeholder="Value"
                      aria-label="Metric value"
                      onChange={(e) => setMetric([metric[0], e.target.value, metric[2]])}
                    />
                    <Input
                      value={metric[2] ?? ''}
                      placeholder="Hint (optional)"
                      aria-label="Metric hint"
                      onChange={(e) =>
                        setMetric(
                          e.target.value
                            ? [metric[0], metric[1], e.target.value]
                            : ([metric[0], metric[1]] as [string, string, string?]),
                        )
                      }
                    />
                  </>
                )}
              />
            ) : null}

            {kind === 'chart' ? (
              <div style={s('font-size:12px;color:var(--s-faint)')}>
                Renders the built-in SAR MSE chart. Nothing to fill in.
              </div>
            ) : null}
          </div>
        )
      }}
    />
  )
}

const IMAGE = /\.(png|jpg|webp)$/i

/**
 * Upload, replace, detach.
 *
 * The database is only told about a file after the Worker has answered 201, and the field never
 * says "uploaded" before that (spec §21, §22). Replacing swaps the reference; the old object is
 * left in R2 and stays reachable from the Assets screen, because deleting it here would take a
 * cover image away from any other row still pointing at it.
 */
function FileField({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldUI
  value: string
  error?: string
  onChange: (v: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'failed'>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setState('uploading')
    setUploadError(null)
    try {
      const asset = await api.upload(file, field.kind ?? 'misc')
      // Only now — the key exists in R2 and in the assets table.
      onChange(asset.key)
      setState('done')
    } catch (e) {
      setState('failed')
      setUploadError((e as Error).message)
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  const href = value ? `/files/${value}` : ''
  const busy = state === 'uploading'

  return (
    <Fieldset label={field.label} hint={field.hint} error={error}>
      <div style={s('display:flex;gap:10px;align-items:center;flex-wrap:wrap')}>
        {value && IMAGE.test(value) ? (
          <img
            src={href}
            alt={`Current ${field.label.toLowerCase()}`}
            style={s('width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--s-line)')}
          />
        ) : null}
        <div style={s('flex:1;min-width:160px')}>
          {value ? (
            <a href={href} target="_blank" rel="noreferrer" style={s('font-size:12px')}>
              {value.split('/').pop()}
            </a>
          ) : (
            <span style={s('font-size:12px;color:var(--s-faint)')}>Nothing uploaded</span>
          )}
          <div role="status" aria-live="polite" style={s(NOTE)}>
            {busy ? 'Uploading…' : state === 'done' ? 'Uploaded.' : state === 'failed' ? 'Upload failed.' : ''}
          </div>
        </div>
        <Button onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
        </Button>
        {value ? <Button onClick={() => onChange('')}>Detach</Button> : null}
        <input
          ref={input}
          type="file"
          accept={field.accept}
          aria-label={`Choose a file for ${field.label}`}
          style={s('display:none')}
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>
      {uploadError ? <Problem>{uploadError}</Problem> : null}
    </Fieldset>
  )
}

/**
 * The slug follows the title until you edit it yourself, and then never moves again — a slug that
 * kept rewriting itself would quietly change a published URL every time a title was reworded
 * (spec §13).
 */
function SlugField({
  field,
  value,
  source,
  error,
  onChange,
}: {
  field: FieldUI
  value: string
  source: string
  error?: string
  onChange: (v: string) => void
}) {
  const [owned, setOwned] = useState(() => !!value)
  const suggestion = slugify(source)

  useEffect(() => {
    if (owned) return
    if (suggestion !== value) onChange(suggestion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion, owned])

  return (
    <Label
      text={field.label}
      hint={owned ? field.hint : suggestion ? `Suggested from the ${field.from}.` : field.hint}
      error={error}
    >
      <Input
        value={value}
        onChange={(e) => {
          setOwned(true)
          onChange(e.target.value)
        }}
      />
    </Label>
  )
}

/** A URL, checked here for the author's sake and again by the Worker for the database's. */
function UrlField({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldUI
  value: string
  error?: string
  onChange: (v: string) => void
}) {
  const problem = urlProblem(value)
  return (
    <Label text={field.label} hint={field.hint} error={error ?? problem ?? undefined}>
      <Input
        type="url"
        value={value}
        aria-invalid={!!problem}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && !problem ? (
        <span style={s('display:flex;align-items:center;gap:6px;margin-top:5px;font-size:11px;color:var(--s-faint)')}>
          <LinkIcon url={value} size={13} />
          {platformLabel(value) || 'External website'}
          <a href={value} target="_blank" rel="noreferrer" style={s('font-size:11px')}>
            Open
          </a>
        </span>
      ) : null}
    </Label>
  )
}

export function Field({
  field,
  value,
  error,
  onChange,
  form,
  suggest,
}: {
  field: FieldUI
  value: unknown
  error?: string
  onChange: (v: unknown) => void
  /** The rest of the form, for the one field that reads a sibling: the slug. */
  form?: Record<string, any>
  /** Names already in use elsewhere, offered to `chips` fields. */
  suggest?: string[]
}) {
  const text = typeof value === 'string' ? value : ''

  switch (field.input) {
    case 'bool':
      return <Toggle label={field.label} checked={!!value} onChange={(v) => onChange(v ? 1 : 0)} />
    case 'file':
      return <FileField field={field} value={text} error={error} onChange={onChange} />
    case 'sections':
      return <SectionsField field={field} value={value} error={error} onChange={onChange} />
    case 'chips':
      return (
        <ChipsField field={field} value={value} error={error} onChange={onChange} suggest={suggest} />
      )
    case 'paragraphs':
      return <ParagraphsField field={field} value={value} error={error} onChange={onChange} />
    case 'links':
      return <LinksField field={field} value={value} error={error} onChange={onChange} />
    case 'pairs':
      return <PairsField field={field} value={value} error={error} keyed={false} onChange={onChange} />
    case 'map':
      return <PairsField field={field} value={value} error={error} keyed onChange={onChange} />
    case 'kb':
      return <KbField field={field} value={value} error={error} onChange={onChange} />
    case 'url':
      return <UrlField field={field} value={text} error={error} onChange={onChange} />
    case 'slug':
      return (
        <SlugField
          field={field}
          value={text}
          source={String(form?.[field.from ?? ''] ?? '')}
          error={error}
          onChange={onChange}
        />
      )
    case 'date': {
      const problem = dateProblem(text)
      return (
        <Label text={field.label} hint={field.hint} error={error ?? problem ?? undefined}>
          <Input
            value={text}
            placeholder="2026-08"
            aria-invalid={!!problem}
            onChange={(e) => onChange(e.target.value)}
          />
        </Label>
      )
    }
    case 'textarea':
      return (
        <Label text={field.label} hint={field.hint} error={error}>
          <Textarea value={text} onChange={(e) => onChange(e.target.value)} />
        </Label>
      )
    default:
      return (
        <Label text={field.label} hint={field.hint} error={error}>
          <Input value={text} onChange={(e) => onChange(e.target.value)} />
        </Label>
      )
  }
}
