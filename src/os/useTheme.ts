'use client'

import { PACKS } from './packs'
import { useOs } from './store'
import { useMedia } from './useMedia'
import type { Prefs } from './types'
import type { CSSProperties } from 'react'

/** True when animation should be suppressed — the preference overrides the OS setting. */
export function useReducedMotion(): boolean {
  const { prefs } = useOs()
  const system = useMedia('(prefers-reduced-motion: reduce)')
  return prefs.reduceMotion ?? system
}

/** Everything the root element needs to dress the desktop for the current preferences. */
export function useTheme() {
  const { prefs } = useOs()
  const systemDark = useMedia('(prefers-color-scheme: dark)')
  const theme: 'dark' | 'light' =
    prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme
  const pack = PACKS[prefs.pack] ?? PACKS.graphite

  return {
    theme,
    pack,
    accent: pack.accent,
    /** Spread onto the [data-root] element — the stylesheet keys off these. */
    rootProps: {
      'data-root': '1',
      'data-theme': theme,
      'data-opaque': prefs.opaque ? '1' : '0',
      'data-contrast': prefs.contrast ? '1' : '0',
      'data-lowpower': prefs.lowPower ? '1' : '0',
      'data-dockstyle': prefs.dockStyle,
      'data-icons': pack.icons,
    } as Record<string, string>,
    rootVars: {
      '--s-accent': pack.accent,
      '--s-dock': pack.dock[theme],
      '--s-dock-glass': pack.glass[theme],
    } as CSSProperties,
  }
}

/**
 * The desk's Brightness slider, or `none` when it is where it started.
 *
 * `brightness(1)` is not free. Any filter but `none` promotes the element to its own composited
 * layer, and a full-viewport layer is rastered at 8 bits with no dithering — measured on a wide
 * gradient, the identity filter alone cut it from 1366 colour transitions to 771 and widened
 * the flattest band from 3px to 8px. That is the contouring a dropped wallpaper shows.
 */
export const brightnessFilter = (prefs: Prefs) => {
  const bright = prefs.bright || 100
  return bright === 100 ? 'none' : `brightness(${bright / 100})`
}
