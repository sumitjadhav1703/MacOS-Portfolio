// Renders one form control per FieldUI. The list-shaped fields are edited as text — one entry
// per line, parts separated by " :: " — which keeps the whole CMS free of drag-and-drop nested
// form machinery while still round-tripping the exact structures src/data declares.

import { useRef, useState } from 'react'
import { api } from './api'
import type { FieldUI } from './schema'
import { Button, Input, Label, Select, Textarea, Toggle } from './ui'
import { s } from '../../src/os/css'

const SEP = ' :: '

const toLines = (v: unknown): string => (Array.isArray(v) ? (v as string[]).join('\n') : '')
const fromLines = (t: string): string[] => t.split('\n').map((l) => l.trim()).filter(Boolean)

const toPairs = (v: unknown): string =>
  Array.isArray(v) ? (v as [string, string][]).map((p) => (p ?? []).join(SEP)).join('\n') : ''
const fromPairs = (t: string): [string, string][] =>
  fromLines(t).map((l) => {
    const [a, ...rest] = l.split(SEP)
    return [(a ?? '').trim(), rest.join(SEP).trim()]
  })

const toMap = (v: unknown): string =>
  v && typeof v === 'object'
    ? Object.entries(v as Record<string, string>)
        .map(([k, val]) => `${k}${SEP}${val}`)
        .join('\n')
    : ''
const fromMap = (t: string): Record<string, string> => Object.fromEntries(fromPairs(t))

const toKb = (v: unknown): string =>
  Array.isArray(v)
    ? (v as [string[], string][]).map(([keys, answer]) => `${(keys ?? []).join(', ')}${SEP}${answer}`).join('\n')
    : ''
const fromKb = (t: string): [string[], string][] =>
  fromPairs(t).map(([keys, answer]) => [keys.split(',').map((k) => k.trim()).filter(Boolean), answer])

const toLinks = (v: unknown): string =>
  Array.isArray(v) ? (v as { label: string; url: string }[]).map((l) => `${l.label}${SEP}${l.url}`).join('\n') : ''
const fromLinks = (t: string) => fromPairs(t).map(([label, url]) => ({ label, url }))

/** Upload control. The key the Worker generated is what gets stored; the file never names itself. */
function FileField({
  field,
  value,
  onChange,
}: {
  field: FieldUI
  value: string
  onChange: (v: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const asset = await api.upload(file, field.kind ?? 'misc')
      onChange(asset.key)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <Label text={field.label} hint={field.hint}>
      <div style={s('display:flex;gap:8px;align-items:center;flex-wrap:wrap')}>
        {value ? (
          <a href={`/files/${value}`} target="_blank" rel="noreferrer" style={s('font-size:12px')}>
            {value.split('/').pop()}
          </a>
        ) : (
          <span style={s('font-size:12px;color:var(--s-faint)')}>Nothing uploaded</span>
        )}
        <Button onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
        </Button>
        {value ? <Button onClick={() => onChange('')}>Detach</Button> : null}
        <input
          ref={input}
          type="file"
          accept={field.accept}
          style={s('display:none')}
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>
      {error ? <span style={s('display:block;font-size:11px;color:#e06a6a;margin-top:4px')}>{error}</span> : null}
    </Label>
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

/** The project body editor: a list of blocks, each one of the four shapes ProjectWindow renders. */
function SectionsField({ value, onChange }: { value: unknown; onChange: (v: Section[]) => void }) {
  const sections: Section[] = Array.isArray(value) ? (value as Section[]) : []
  const replace = (i: number, next: Section) => onChange(sections.map((sec, j) => (j === i ? next : sec)))
  const move = (i: number, by: number) => {
    const next = [...sections]
    const target = i + by
    if (target < 0 || target >= next.length) return
    ;[next[i], next[target]] = [next[target]!, next[i]!]
    onChange(next)
  }

  return (
    <div style={s('margin-bottom:14px')}>
      <span style={s('display:block;font-size:12px;color:var(--s-dim);margin-bottom:8px')}>Sections</span>
      {sections.map((section, i) => {
        const kind = bodyKind(section.body)
        return (
          <div
            key={i}
            style={s('border:1px solid var(--s-line);border-radius:10px;padding:12px;margin-bottom:10px')}
          >
            <div style={s('display:flex;gap:8px;margin-bottom:10px')}>
              <Input
                placeholder="Heading (optional)"
                value={section.heading ?? ''}
                onChange={(e) => replace(i, { ...section, heading: e.target.value })}
              />
              <Select
                value={kind}
                onChange={(e) => replace(i, { ...section, body: emptyBody(e.target.value) })}
              >
                <option value="text">Text</option>
                <option value="flow">Flow diagram</option>
                <option value="metrics">Metrics</option>
                <option value="chart">SAR chart</option>
              </Select>
            </div>

            {kind === 'text' ? (
              <Textarea
                value={(section.body as { text: string }).text}
                onChange={(e) => replace(i, { ...section, body: { text: e.target.value } })}
              />
            ) : null}

            {kind === 'flow' ? (
              <Textarea
                placeholder={`step${SEP}caption`}
                value={toPairs((section.body as { flow: [string, string][] }).flow)}
                onChange={(e) => replace(i, { ...section, body: { flow: fromPairs(e.target.value) } })}
              />
            ) : null}

            {kind === 'metrics' ? (
              <Textarea
                placeholder={`label${SEP}value${SEP}hint (optional)`}
                value={(section.body as { metrics: [string, string, string?][] }).metrics
                  .map((m) => m.filter(Boolean).join(SEP))
                  .join('\n')}
                onChange={(e) =>
                  replace(i, {
                    ...section,
                    body: {
                      metrics: fromLines(e.target.value).map((line) => {
                        const [label = '', val = '', hint] = line.split(SEP).map((p) => p.trim())
                        return hint ? [label, val, hint] : [label, val]
                      }) as [string, string, string?][],
                    },
                  })
                }
              />
            ) : null}

            {kind === 'chart' ? (
              <div style={s('font-size:12px;color:var(--s-faint)')}>
                Renders the built-in SAR MSE chart. No fields.
              </div>
            ) : null}

            <div style={s('display:flex;gap:6px;margin-top:10px')}>
              <Button onClick={() => move(i, -1)}>↑</Button>
              <Button onClick={() => move(i, 1)}>↓</Button>
              <Button tone="danger" onClick={() => onChange(sections.filter((_, j) => j !== i))}>
                Remove
              </Button>
            </div>
          </div>
        )
      })}
      <Button onClick={() => onChange([...sections, { heading: '', body: { text: '' } }])}>
        Add section
      </Button>
    </div>
  )
}

export function Field({
  field,
  value,
  onChange,
}: {
  field: FieldUI
  value: unknown
  onChange: (v: unknown) => void
}) {
  switch (field.input) {
    case 'bool':
      return <Toggle label={field.label} checked={!!value} onChange={(v) => onChange(v ? 1 : 0)} />
    case 'file':
      return <FileField field={field} value={typeof value === 'string' ? value : ''} onChange={onChange} />
    case 'sections':
      return <SectionsField value={value} onChange={onChange} />
    case 'textarea':
      return (
        <Label text={field.label} hint={field.hint}>
          <Textarea value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />
        </Label>
      )
    case 'lines':
      return (
        <Label text={field.label} hint={field.hint}>
          <Textarea value={toLines(value)} onChange={(e) => onChange(fromLines(e.target.value))} />
        </Label>
      )
    case 'pairs':
      return (
        <Label text={field.label} hint={field.hint}>
          <Textarea value={toPairs(value)} onChange={(e) => onChange(fromPairs(e.target.value))} />
        </Label>
      )
    case 'map':
      return (
        <Label text={field.label} hint={field.hint}>
          <Textarea value={toMap(value)} onChange={(e) => onChange(fromMap(e.target.value))} />
        </Label>
      )
    case 'kb':
      return (
        <Label text={field.label} hint={field.hint}>
          <Textarea value={toKb(value)} onChange={(e) => onChange(fromKb(e.target.value))} />
        </Label>
      )
    case 'links':
      return (
        <Label text={field.label} hint={field.hint}>
          <Textarea value={toLinks(value)} onChange={(e) => onChange(fromLinks(e.target.value))} />
        </Label>
      )
    default:
      return (
        <Label text={field.label} hint={field.hint}>
          <Input value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />
        </Label>
      )
  }
}
