import type { FolderTint, PackId } from './types'

export type Pack = {
  name: string
  note: string
  accent: string
  icons: 'tinted' | 'clear'
  prefers: 'dark' | 'light'
  wall: { dark: string; light: string }
  dock: { dark: string; light: string }
  glass: { dark: string; light: string }
  swatch: [string, string]
}

/**
 * Depth, layered over every pack's own colour.
 *
 * A real desktop picture has a bright bloom and a dark fall-off, and that is what makes the
 * menu bar and dock read as glass floating over something rather than as panels pasted onto
 * a flat gradient. Two extra stops per pack buy most of it and cost no bytes — the packaged
 * photograph is still deliberately absent (it sat on top of all three packs and made them
 * invisible).
 */
const BLOOM = {
  dark: 'radial-gradient(130% 80% at 50% -12%,rgba(255,255,255,.07) 0%,rgba(255,255,255,0) 58%)',
  light: 'radial-gradient(130% 80% at 50% -12%,rgba(255,255,255,.55) 0%,rgba(255,255,255,0) 58%)',
}
const FALLOFF = {
  dark: 'radial-gradient(120% 66% at 50% 116%,rgba(0,0,0,.5) 0%,rgba(0,0,0,0) 62%)',
  light: 'radial-gradient(120% 66% at 50% 116%,rgba(20,26,36,.16) 0%,rgba(20,26,36,0) 62%)',
}

/** Bloom on top, the pack's own layers in the middle, fall-off underneath. */
const desk = (theme: 'dark' | 'light', layers: string) =>
  `${BLOOM[theme]},${layers},${FALLOFF[theme]}`

export const PACKS: Record<PackId, Pack> = {
  graphite: {
    name: 'Graphite',
    note: 'Neutral desktop grey-blue',
    accent: '#3a6df0',
    icons: 'tinted',
    prefers: 'dark',
    wall: {
      dark: desk('dark',
        'radial-gradient(74% 54% at 78% 6%,rgba(93,141,246,.17) 0%,rgba(93,141,246,0) 62%),radial-gradient(58% 48% at 10% 90%,rgba(126,182,222,.09) 0%,rgba(126,182,222,0) 68%),linear-gradient(178deg,#1c222b 0%,#141a22 48%,#0c1016 100%)'),
      light: desk('light',
        'radial-gradient(74% 54% at 78% 4%,rgba(255,255,255,.75) 0%,rgba(255,255,255,0) 60%),radial-gradient(60% 50% at 8% 94%,rgba(93,141,246,.11) 0%,rgba(93,141,246,0) 68%),linear-gradient(178deg,#eaeef3 0%,#dde4ec 48%,#cbd4df 100%)'),
    },
    dock: { dark: 'rgba(18,21,27,.72)', light: 'rgba(250,251,252,.7)' },
    glass: {
      dark: 'linear-gradient(180deg,rgba(210,224,255,.16),rgba(160,180,215,.05))',
      light: 'linear-gradient(180deg,rgba(255,255,255,.62),rgba(232,238,246,.36))',
    },
    swatch: ['#39424f', '#5d8df6'],
  },
  latent: {
    name: 'Latent Space',
    note: 'Deep indigo bloom',
    accent: '#7b5cf0',
    icons: 'tinted',
    prefers: 'dark',
    wall: {
      dark: desk('dark',
        'radial-gradient(54% 42% at 84% 76%,rgba(123,92,240,.22) 0%,rgba(123,92,240,0) 68%),radial-gradient(46% 38% at 6% 32%,rgba(72,190,220,.10) 0%,rgba(72,190,220,0) 70%),radial-gradient(120% 92% at 24% 10%,#2c2456 0%,#181640 44%,#0a0b1c 100%)'),
      light: desk('light',
        'radial-gradient(54% 42% at 84% 78%,rgba(123,92,240,.13) 0%,rgba(123,92,240,0) 70%),radial-gradient(52% 44% at 4% 26%,rgba(255,255,255,.7) 0%,rgba(255,255,255,0) 64%),radial-gradient(120% 92% at 24% 10%,#eae5fb 0%,#dcdcf3 46%,#c9cee9 100%)'),
    },
    dock: { dark: 'rgba(24,20,46,.7)', light: 'rgba(250,249,255,.72)' },
    glass: {
      dark: 'linear-gradient(180deg,rgba(196,178,255,.18),rgba(120,100,210,.06))',
      light: 'linear-gradient(180deg,rgba(255,255,255,.6),rgba(233,229,250,.38))',
    },
    swatch: ['#241f4c', '#7b5cf0'],
  },
  daylight: {
    name: 'Daylight',
    note: 'Light-first, warm paper',
    accent: '#b4552d',
    icons: 'clear',
    prefers: 'light',
    wall: {
      light: desk('light',
        'radial-gradient(70% 52% at 84% 6%,rgba(255,243,219,.9) 0%,rgba(255,243,219,0) 62%),radial-gradient(56% 46% at 4% 96%,rgba(180,85,45,.10) 0%,rgba(180,85,45,0) 66%),linear-gradient(168deg,#f6f2ea 0%,#eae5da 46%,#d9d6cb 100%)'),
      dark: desk('dark',
        'radial-gradient(70% 52% at 84% 6%,rgba(255,206,140,.13) 0%,rgba(255,206,140,0) 62%),radial-gradient(56% 46% at 4% 96%,rgba(180,85,45,.12) 0%,rgba(180,85,45,0) 68%),linear-gradient(168deg,#282520 0%,#1c1a16 48%,#131210 100%)'),
    },
    dock: { light: 'rgba(252,250,246,.7)', dark: 'rgba(30,27,23,.72)' },
    glass: {
      light: 'linear-gradient(180deg,rgba(255,255,255,.66),rgba(244,238,228,.4))',
      dark: 'linear-gradient(180deg,rgba(255,236,210,.14),rgba(180,150,110,.05))',
    },
    swatch: ['#e6dccb', '#b4552d'],
  },
}

export const PACK_BY_NAME: Record<string, PackId> = {
  Graphite: 'graphite',
  'Latent Space': 'latent',
  Daylight: 'daylight',
}

/** Finder tag colours. Fixed palette, not a colour wheel; `blue` is also every folder's default. */
export const FOLDER_TINTS: Record<FolderTint, [string, string]> = {
  blue: ['#4ea3f5', '#1c62c9'],
  green: ['#5cc36a', '#2b8743'],
  sand: ['#f79a3e', '#cd6212'],
  rose: ['#f26a63', '#c33026'],
  violet: ['#a97bf0', '#6a3ec0'],
  graphite: ['#8e97a6', '#4c545f'],
}

/**
 * The colour a folder gets when the visitor has not tagged it.
 *
 * Every folder on a Mac is the same blue, and six differently-coloured folders was the
 * loudest remaining tell that this desktop is not one. Project identity lives in the label
 * and in the window that opens — not in a colour a visitor has to learn. Tagging still
 * recolours a single folder, through the Finder tag row and the desk context menu, exactly
 * as macOS Finder tags do.
 */
export const folderColor = (): [string, string] => FOLDER_TINTS.blue
