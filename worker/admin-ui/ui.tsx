// Small shared pieces for the admin. Styling follows the repo convention: CSS declaration
// strings through s(), colours from the --s-* custom properties os.css defines.

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { s } from '../../src/os/css'

export const CARD =
  'background:var(--s-win);border:1px solid var(--s-line);border-radius:12px;padding:18px'
const FIELD =
  'width:100%;background:var(--s-input);color:var(--s-text);border:1px solid var(--s-line);' +
  'border-radius:8px;padding:8px 10px;font:inherit;font-size:13px'

export function Button({
  children,
  onClick,
  tone = 'plain',
  type = 'button',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  tone?: 'plain' | 'accent' | 'danger'
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const base =
    'border-radius:8px;padding:7px 13px;font-size:13px;cursor:pointer;border:1px solid var(--s-line);'
  const tones = {
    plain: 'background:var(--s-fill);color:var(--s-text)',
    accent: 'background:var(--s-accent);color:var(--s-on-accent);border-color:transparent',
    danger: 'background:transparent;color:#e06a6a;border-color:rgba(224,106,106,.45)',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-focusable
      style={{ ...s(base + tones[tone]), opacity: disabled ? 0.5 : 1 }}
    >
      {children}
    </button>
  )
}

export function Label({ text, hint, children }: { text: string; hint?: string; children: ReactNode }) {
  return (
    <label style={s('display:block;margin-bottom:14px')}>
      <span style={s('display:block;font-size:12px;color:var(--s-dim);margin-bottom:5px')}>{text}</span>
      {children}
      {hint ? (
        <span style={s('display:block;font-size:11px;color:var(--s-faint);margin-top:4px')}>{hint}</span>
      ) : null}
    </label>
  )
}

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} data-focusable style={s(FIELD)} />
)

export const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} data-focusable style={s(FIELD + ';min-height:90px;resize:vertical')} />
)

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} data-focusable style={s(FIELD)} />
)

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label style={s('display:flex;align-items:center;gap:8px;margin-bottom:14px;cursor:pointer')}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-focusable
      />
      <span style={s('font-size:13px')}>{label}</span>
    </label>
  )
}

/** Errors and successes both land here; nothing is ever reported only to the console. */
export function Banner({ tone, children }: { tone: 'error' | 'ok'; children: ReactNode }) {
  const colour = tone === 'error' ? '#e06a6a' : 'var(--s-ok)'
  return (
    <div
      style={{
        ...s('border-radius:8px;padding:9px 12px;font-size:13px;margin-bottom:14px'),
        border: `1px solid ${colour}`,
        color: colour,
      }}
    >
      {children}
    </div>
  )
}

/** Destructive actions always route through this — nothing deletes on a single click. */
export function Confirm({
  message,
  onCancel,
  onConfirm,
}: {
  message: string
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      onClick={onCancel}
      style={s(
        'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;' +
          'justify-content:center;z-index:50',
      )}
    >
      <div onClick={(e) => e.stopPropagation()} style={s(CARD + ';max-width:380px')}>
        <div style={s('font-size:14px;margin-bottom:16px')}>{message}</div>
        <div style={s('display:flex;gap:8px;justify-content:flex-end')}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button tone="danger" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Runs an async action, surfacing whatever it throws as a message rather than a blank screen. */
export function useAction() {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      return true
    } catch (e) {
      const err = e as { message?: string; fields?: string[] }
      setError(err.fields?.length ? err.fields.join(' · ') : (err.message ?? 'Something went wrong.'))
      return false
    } finally {
      setBusy(false)
    }
  }

  return { error, busy, run, setError }
}
