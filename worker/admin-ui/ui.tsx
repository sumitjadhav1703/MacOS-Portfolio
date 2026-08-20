// Small shared pieces for the admin. Styling follows the repo convention: CSS declaration
// strings through s(), colours from the --s-* custom properties os.css defines.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { s } from '../../src/os/css'
export { fieldErrors } from './forms'

/** The one non-token colour in the admin: a red that reads as danger in both themes. */
export const DANGER = '#e06a6a'

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
  label,
}: {
  children: ReactNode
  onClick?: () => void
  tone?: 'plain' | 'accent' | 'danger'
  type?: 'button' | 'submit'
  disabled?: boolean
  /** Accessible name, for buttons whose visible content is a glyph. */
  label?: string
}) {
  const base =
    'border-radius:8px;padding:7px 13px;font-size:13px;cursor:pointer;border:1px solid var(--s-line);'
  const tones = {
    plain: 'background:var(--s-fill);color:var(--s-text)',
    accent: 'background:var(--s-accent);color:var(--s-on-accent);border-color:transparent',
    danger: `background:transparent;color:${DANGER};border-color:rgba(224,106,106,.45)`,
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-focusable
      style={{ ...s(base + tones[tone]), opacity: disabled ? 0.5 : 1 }}
    >
      {children}
    </button>
  )
}

export function Label({
  text,
  hint,
  error,
  footer,
  children,
}: {
  text: string
  hint?: string
  error?: string
  /** Anything interactive that belongs with the field — a resolved icon, an Open link. Rendered
   *  outside the <label>, because a link inside one is claimed by the label's own click. */
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div style={s('margin-bottom:14px')}>
      <label style={s('display:block')}>
        <span style={s('display:block;font-size:12px;color:var(--s-dim);margin-bottom:5px')}>{text}</span>
        {children}
      </label>
      {footer}
      {error ? (
        <span
          role="alert"
          style={{ ...s('display:block;font-size:11px;margin-top:4px'), color: DANGER }}
        >
          {error}
        </span>
      ) : hint ? (
        <span style={s('display:block;font-size:11px;color:var(--s-faint);margin-top:4px')}>{hint}</span>
      ) : null}
    </div>
  )
}

// The caller's own `style` is merged on top rather than dropped, so a control can be made shorter
// or made to span a grid without a second component existing to say so.
export const Input = ({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} data-focusable style={{ ...s(FIELD), ...style }} />
)

export const Textarea = ({ style, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    data-focusable
    style={{ ...s(FIELD + ';min-height:90px;resize:vertical'), ...style }}
  />
)

export const Select = ({ style, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} data-focusable style={{ ...s(FIELD), ...style }} />
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
  const colour = tone === 'error' ? DANGER : 'var(--s-ok)'
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

/** Destructive and discarding actions always route through this — nothing is lost on a single click. */
export function Confirm({
  title,
  message,
  confirmLabel = 'Delete',
  onCancel,
  onConfirm,
}: {
  title?: string
  message: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onCancel()
      // Tab stays inside the dialog. Without this the next Tab lands on the page behind the
      // overlay, where a keyboard user cannot see what they have selected.
      if (e.key !== 'Tab') return
      const stops = panel.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea')
      if (!stops?.length) return
      const first = stops[0]!
      const last = stops[stops.length - 1]!
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    // Focus moves into the dialog and back out again, so a keyboard user is not left behind the
    // overlay tabbing through a page they cannot see.
    const previous = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLElement>('button')?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [onCancel])

  return (
    <div
      onClick={onCancel}
      style={s(
        'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;' +
          'justify-content:center;z-index:50;padding:16px',
      )}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? message}
        onClick={(e) => e.stopPropagation()}
        style={s(CARD + ';max-width:380px;width:100%')}
      >
        {title ? <h2 style={s('margin:0 0 8px;font-size:15px')}>{title}</h2> : null}
        <div style={s('font-size:14px;margin-bottom:16px')}>{message}</div>
        <div style={s('display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap')}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button tone="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export type ActionError = { message: string; fields: string[]; status: number }

/**
 * Runs an async action, surfacing whatever it throws rather than a blank screen. The Worker's
 * per-field messages are kept apart from the summary so the form can put each one under the input
 * it belongs to instead of joining them into one unplaceable sentence.
 */
export function useAction() {
  const [error, setError] = useState<ActionError | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      return true
    } catch (e) {
      const err = e as { message?: string; fields?: string[]; status?: number }
      setError({
        message: err.message ?? 'Something went wrong.',
        fields: err.fields ?? [],
        status: err.status ?? 0,
      })
      return false
    } finally {
      setBusy(false)
    }
  }

  return { error, busy, run, setError }
}

export type SaveState = 'saved' | 'dirty' | 'saving' | 'failed' | 'publishing'

/**
 * The one place the author learns whether their work is on the server. It stays put at the bottom
 * of an editor, because "did that save?" is a question you ask while looking at the form, not
 * after a green banner has already faded.
 */
export function SaveBar({
  state,
  note,
  children,
}: {
  state: SaveState
  /** What publishing this particular thing would do. Said plainly; never "instantly everywhere". */
  note?: string
  children: ReactNode
}) {
  const label: Record<SaveState, string> = {
    saved: 'Saved',
    dirty: 'Unsaved changes',
    saving: 'Saving…',
    failed: 'Save failed — your changes are still here',
    publishing: 'Publishing…',
  }
  const colour = state === 'failed' ? DANGER : state === 'dirty' ? 'var(--s-text)' : 'var(--s-dim)'

  return (
    <div
      style={s(
        'position:sticky;bottom:0;display:flex;align-items:center;gap:12px;flex-wrap:wrap;' +
          'margin:18px -18px -18px;padding:14px 18px;border-top:1px solid var(--s-line);' +
          'background:var(--s-chrome);border-radius:0 0 12px 12px',
      )}
    >
      <div style={s('flex:1;min-width:180px')}>
        <div role="status" aria-live="polite" style={{ ...s('font-size:13px'), color: colour }}>
          {label[state]}
        </div>
        {note ? (
          <div style={s('font-size:11px;color:var(--s-faint);margin-top:3px')}>{note}</div>
        ) : null}
      </div>
      <div style={s('display:flex;gap:8px;flex-wrap:wrap')}>{children}</div>
    </div>
  )
}

/**
 * Dirtiness by value comparison against the last saved state. A deep compare of a form this size
 * costs nothing measurable, and it means closing a field you opened and did not change leaves the
 * editor clean — which a change-counting flag would get wrong.
 */
export function useDirty(current: unknown, baseline: unknown): boolean {
  const dirty = useMemo(
    () => JSON.stringify(current ?? null) !== JSON.stringify(baseline ?? null),
    [current, baseline],
  )

  // The browser's own prompt is the only thing that can stop a tab close or a reload.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  return dirty
}

/** Leaving an editor with unsaved work asks first. Nothing in the admin discards silently. */
export function DiscardPrompt({
  onStay,
  onDiscard,
}: {
  onStay: () => void
  onDiscard: () => void
}) {
  return (
    <Confirm
      title="You have unsaved changes"
      message="Leaving now throws away the edits you have not saved."
      confirmLabel="Discard"
      onCancel={onStay}
      onConfirm={onDiscard}
    />
  )
}

/**
 * One collapsible part of an editor. Spec §12 asks that a project not be one long form; this is
 * how a form declares its own parts, so the editor stays a list of fields rather than a layout.
 *
 * It is a real <details>, so the arrow, the keyboard behaviour and find-in-page all come from the
 * browser rather than from a state flag that has to be kept right.
 */
export function Group({
  title,
  summary,
  open = true,
  children,
}: {
  title: string
  /** A short line about what is inside, shown next to the heading. */
  summary?: string
  open?: boolean
  children: ReactNode
}) {
  return (
    <details
      open={open}
      style={s('border:1px solid var(--s-line);border-radius:10px;margin-bottom:12px;background:var(--s-fill)')}
    >
      <summary
        data-focusable
        style={s('cursor:pointer;padding:11px 14px;font-size:13px;list-style:revert')}
      >
        {title}
        {summary ? (
          <span style={s('color:var(--s-faint);font-size:11px;margin-left:8px')}>{summary}</span>
        ) : null}
      </summary>
      <div style={s('padding:4px 14px 14px')}>{children}</div>
    </details>
  )
}

/** Published / Draft / Unpublished changes, in the one shape they are always drawn. */
export function StatusBadge({ tone, children }: { tone: 'live' | 'quiet' | 'pending'; children: ReactNode }) {
  const colour = tone === 'live' ? 'var(--s-ok)' : tone === 'pending' ? '#d79a4a' : 'var(--s-faint)'
  return (
    <span
      style={{
        ...s('display:inline-block;border-radius:999px;padding:2px 8px;font-size:11px;white-space:nowrap'),
        border: `1px solid ${colour}`,
        color: colour,
      }}
    >
      {children}
    </span>
  )
}

/**
 * A row's picture, or the space where one would be. The box is drawn either way so a list of
 * projects does not jump about as covers load or go missing.
 */
export function Thumb({ src, alt, size = 44 }: { src?: string; alt: string; size?: number }) {
  const box = s(
    `width:${size}px;height:${size}px;flex:none;border-radius:8px;border:1px solid var(--s-line);` +
      'background:var(--s-fill);overflow:hidden',
  )
  if (!src) {
    return (
      <div
        aria-hidden
        style={{
          ...box,
          ...s('display:flex;align-items:center;justify-content:center;color:var(--s-faint);font-size:16px'),
        }}
      >
        ◻
      </div>
    )
  }
  return <img src={src} alt={alt} loading="lazy" style={{ ...box, objectFit: 'cover' }} />
}

/**
 * ⌘S / Ctrl+S saves, instead of offering to save the page as HTML. Bound only while an editor is
 * open and has something to save, so the browser keeps the key everywhere else (spec §40).
 */
export function useSaveShortcut(save: () => void, enabled: boolean) {
  const latest = useRef(save)
  latest.current = save

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        latest.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
