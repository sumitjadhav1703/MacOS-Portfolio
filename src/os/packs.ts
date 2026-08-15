import type { AppId, FolderTint, PackId } from './types'

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

export const PACKS: Record<PackId, Pack> = {
  graphite: {
    name: 'Graphite',
    note: 'Neutral desktop grey-blue',
    accent: '#3a6df0',
    icons: 'tinted',
    prefers: 'dark',
    wall: {
      dark: 'linear-gradient(178deg,#1c222b 0%,#141a22 48%,#0c1016 100%)',
      light: 'linear-gradient(178deg,#eaeef3 0%,#dde4ec 48%,#cbd4df 100%)',
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
      dark: 'radial-gradient(120% 92% at 24% 10%,#2c2456 0%,#181640 44%,#0a0b1c 100%)',
      light: 'radial-gradient(120% 92% at 24% 10%,#eae5fb 0%,#dcdcf3 46%,#c9cee9 100%)',
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
      light: 'linear-gradient(168deg,#f6f2ea 0%,#eae5da 46%,#d9d6cb 100%)',
      dark: 'linear-gradient(168deg,#282520 0%,#1c1a16 48%,#131210 100%)',
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

/** Finder-only folder tinting. Fixed palette, not a colour wheel. */
export const FOLDER_TINTS: Record<FolderTint, [string, string]> = {
  blue: ['#4ea3f5', '#1c62c9'],
  green: ['#5cc36a', '#2b8743'],
  sand: ['#f79a3e', '#cd6212'],
  rose: ['#f26a63', '#c33026'],
  violet: ['#a97bf0', '#6a3ec0'],
  graphite: ['#8e97a6', '#4c545f'],
}

/** Default folder colours for the projects the site shipped with. */
export const FOLDER_COLORS: Partial<Record<AppId, [string, string]>> = {
  'project-lazarus': ['#5cc36a', '#2b8743'],
  'project-ai-video': ['#4ea3f5', '#1c62c9'],
  'project-pm25': ['#f6cd4c', '#cf9611'],
  'project-sar': ['#f79a3e', '#cd6212'],
  'project-multi-agent': ['#a97bf0', '#6a3ec0'],
  'project-airbnb': ['#f26a63', '#c33026'],
}

const TINT_CYCLE = Object.values(FOLDER_TINTS)

/**
 * The colour a project folder gets. The six original projects keep the exact pairs above; a
 * project added through the CMS takes the next tint in the palette, so it looks deliberate
 * rather than defaulting to grey.
 */
export function folderColorFor(id: AppId, index: number): [string, string] {
  return FOLDER_COLORS[id] ?? TINT_CYCLE[index % TINT_CYCLE.length]!
}
