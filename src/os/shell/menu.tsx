'use client'

import type { ReactNode } from 'react'
import { s } from '../css'
import type { MenuEntry } from '../types'

export const MENU_ITEM = 'padding:5px 10px;border-radius:6px;cursor:default;white-space:nowrap'

export const MENU_SURFACE =
  'padding:5px;border-radius:11px;background:var(--s-pop);backdrop-filter:var(--s-blur);-webkit-backdrop-filter:var(--s-blur);border:1px solid var(--s-line);box-shadow:var(--s-shadow-pop);color:var(--s-text);text-shadow:none'

export function MenuRow({
  label,
  hint,
  disabled,
  onPick,
}: {
  label: ReactNode
  hint?: string
  disabled?: boolean
  onPick: () => void
}) {
  return (
    <div
      data-mi={disabled ? undefined : '1'}
      style={{
        ...s(MENU_ITEM),
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        opacity: disabled ? 0.4 : 1,
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onPick()
      }}
    >
      <span style={s('flex:1')}>{label}</span>
      {hint ? (
        <span style={s('color:var(--s-faint);font-family:ui-monospace,Menlo,monospace;font-size:11.5px')}>
          {hint}
        </span>
      ) : null}
    </div>
  )
}

export const MenuDivider = () => (
  <div style={s('height:1px;background:var(--s-line);margin:5px 8px')} />
)

/** Renders a list of entries; used by the menu bar and every context menu. */
export function MenuEntries({ entries, onDone }: { entries: MenuEntry[]; onDone?: () => void }) {
  return (
    <>
      {entries.map((entry, i) =>
        'divider' in entry ? (
          <MenuDivider key={`div-${i}`} />
        ) : (
          <MenuRow
            key={entry.label}
            label={entry.label}
            hint={entry.hint}
            disabled={entry.disabled}
            onPick={() => {
              entry.onPick()
              onDone?.()
            }}
          />
        ),
      )}
    </>
  )
}
