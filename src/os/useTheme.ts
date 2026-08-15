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

export const brightnessFilter = (prefs: Prefs) => `brightness(${(prefs.bright || 100) / 100})`
