'use client'

import { useCallback, type MouseEvent as ReactMouseEvent } from 'react'
import { s } from '../css'
import { useDispatch, useOs } from '../store'
import { MENU_SURFACE, MenuEntries } from './menu'
import type { MenuEntry } from '../types'

const WIDTH = 210
/** menu.tsx renders a row as padding:5px 10px at 13px — about 25.6px. */
const ROW = 26

/**
 * Right-click menus. One instance lives on the desktop; anything that wants a menu opens
 * it through `useContextMenu()` rather than rendering its own surface.
 */
export function ContextMenu() {
  const { contextMenu } = useOs()
  const dispatch = useDispatch()
  if (!contextMenu) return null

  const { x, y, entries } = contextMenu
  // Keep the menu on screen when it is opened near the right or bottom edge.
  const height = entries.reduce((sum, e) => sum + ('divider' in e ? 11 : ROW), 12)
  // Math.min alone had no lower bound: a viewport narrower than the menu produced a
  // negative left and the menu opened off the side of the screen.
  const left = Math.max(8, Math.min(x, window.innerWidth - WIDTH - 8))
  const top = Math.min(y, Math.max(8, window.innerHeight - height - 8))

  return (
    <div
      data-contextmenu="1"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        ...s(MENU_SURFACE),
        position: 'absolute',
        left,
        top,
        width: WIDTH,
        zIndex: 'var(--z-context-menu)',
        fontSize: 13,
      }}
    >
      <MenuEntries entries={entries} onDone={() => dispatch({ type: 'contextMenu', menu: null })} />
    </div>
  )
}

/** Returns an `onContextMenu` handler that opens the shared menu with these entries. */
export function useContextMenu() {
  const dispatch = useDispatch()
  return useCallback(
    (entries: MenuEntry[]) => (event: ReactMouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      dispatch({ type: 'contextMenu', menu: { x: event.clientX, y: event.clientY, entries } })
    },
    [dispatch],
  )
}
