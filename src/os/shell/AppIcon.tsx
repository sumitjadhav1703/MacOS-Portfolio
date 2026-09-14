'use client'

import { s } from '../css'
import type { AppId } from '../types'

/** An icon is a tinted face plus a few hand-drawn ink shapes — no bitmaps anywhere. */
export type IconSpec = {
  id: AppId | 'launchpad'
  tip: string
  grad: string
  inks: [string, 'ink' | 'inkline'][]
}

export const ICONS: IconSpec[] = [
  {
    id: 'finder',
    tip: 'Workspace',
    grad: 'linear-gradient(180deg,#5d8df6,#2a55c6)',
    inks: [
      // The split face: pale left half, deep right half, eyes and a smile.
      ['left:13px;top:12px;width:14px;height:30px;border-radius:4px 0 0 4px;background:rgba(255,255,255,.96)', 'ink'],
      ['left:27px;top:12px;width:14px;height:30px;border-radius:0 4px 4px 0;background:rgba(12,28,68,.72)', 'ink'],
      ['left:18.5px;top:19px;width:3px;height:7px;border-radius:2px;background:rgba(16,34,78,.85)', 'ink'],
      ['left:32.5px;top:19px;width:3px;height:7px;border-radius:2px;background:rgba(255,255,255,.95)', 'ink'],
      ['left:18px;top:28px;width:18px;height:8px;border-bottom:2.2px solid rgba(120,155,215,.9);border-radius:0 0 10px 10px', 'inkline'],
    ],
  },
  {
    id: 'launchpad',
    tip: 'Launchpad',
    grad: 'linear-gradient(180deg,#8e97a6,#4c545f)',
    inks: [
      ['left:14px;top:14px;width:10px;height:10px;border-radius:3px;background:rgba(255,255,255,.92)', 'ink'],
      ['left:30px;top:14px;width:10px;height:10px;border-radius:3px;background:rgba(255,255,255,.92)', 'ink'],
      ['left:14px;top:30px;width:10px;height:10px;border-radius:3px;background:rgba(255,255,255,.92)', 'ink'],
      ['left:30px;top:30px;width:10px;height:10px;border-radius:3px;background:rgba(255,255,255,.92)', 'ink'],
    ],
  },
  {
    id: 'safari',
    tip: 'Safari',
    grad: 'linear-gradient(180deg,#4aa3f0,#1b63c4)',
    inks: [
      ['left:13px;top:13px;width:28px;height:28px;border-radius:50%;border:1.8px solid rgba(255,255,255,.9)', 'inkline'],
      ['left:20px;top:20px;width:14px;height:14px;border-radius:2px;background:rgba(255,255,255,.95);transform:rotate(45deg)', 'ink'],
      ['left:25.5px;top:16px;width:3px;height:11px;border-radius:2px;background:#ef5350;transform:rotate(45deg)', 'ink'],
    ],
  },
  {
    id: 'terminal',
    tip: 'Shell',
    grad: 'linear-gradient(180deg,#3b424c,#14171b)',
    inks: [
      ['left:14px;top:22px;width:10px;height:2.4px;border-radius:2px;background:rgba(255,255,255,.92);transform:rotate(38deg);transform-origin:left center', 'ink'],
      ['left:14px;top:34px;width:10px;height:2.4px;border-radius:2px;background:rgba(255,255,255,.92);transform:rotate(-38deg);transform-origin:left center', 'ink'],
      ['left:28px;top:34px;width:13px;height:2.4px;border-radius:2px;background:rgba(255,255,255,.62)', 'ink'],
    ],
  },
  {
    id: 'sumit-ai',
    tip: 'Ask Sumit',
    grad: 'linear-gradient(180deg,#9370f4,#4a2cb2)',
    inks: [
      ['left:18px;top:18px;width:18px;height:18px;border-radius:50%;border:1.6px solid rgba(255,255,255,.72)', 'inkline'],
      ['left:24.5px;top:24.5px;width:5px;height:5px;border-radius:50%;background:#fff', 'ink'],
    ],
  },
  {
    id: 'code',
    tip: 'Code',
    grad: 'linear-gradient(180deg,#4e5a6e,#1e242d)',
    inks: [
      ['left:31px;top:21px;width:11px;height:11px;border-right:2.2px solid rgba(255,255,255,.9);border-top:2.2px solid rgba(255,255,255,.9);border-radius:0 2px 0 0;transform:rotate(45deg)', 'inkline'],
      ['left:26px;top:15px;width:2.2px;height:24px;border-radius:2px;background:rgba(255,255,255,.55);transform:rotate(14deg)', 'ink'],
    ],
  },
  {
    id: 'contact',
    tip: 'Reach Out',
    grad: 'linear-gradient(180deg,#53b7a9,#1c7a6d)',
    inks: [
      ['left:12px;top:17px;width:30px;height:20px;border-radius:3px;background:rgba(255,255,255,.95)', 'ink'],
      // The flap, drawn as a downward border triangle across the top of the body — the one
      // shape that reads as an envelope rather than as a folder at 26px.
      ['left:12px;top:17px;width:0;height:0;border-left:15px solid transparent;border-right:15px solid transparent;border-top:12px solid rgba(24,110,99,.55)', 'ink'],
    ],
  },
  {
    id: 'settings',
    tip: 'System',
    grad: 'linear-gradient(180deg,#828c9a,#3a414b)',
    inks: [
      ['left:12px;top:26px;right:12px;height:1.8px;border-radius:2px;background:rgba(255,255,255,.62)', 'ink'],
      ['left:12px;top:35px;right:12px;height:1.8px;border-radius:2px;background:rgba(255,255,255,.62)', 'ink'],
      ['left:29px;top:13px;width:7px;height:9px;border-radius:2.5px;background:#fff', 'ink'],
      ['left:16px;top:22px;width:7px;height:9px;border-radius:2.5px;background:#fff', 'ink'],
      ['left:33px;top:31px;width:7px;height:9px;border-radius:2.5px;background:#fff', 'ink'],
    ],
  },
  {
    id: 'trash',
    tip: 'Trash',
    grad: 'linear-gradient(180deg,var(--s-glass-icon),var(--s-glass-icon))',
    inks: [
      ['left:23px;top:10px;width:8px;height:3px;border-radius:2px 2px 0 0;background:var(--s-glass-icon-ink);opacity:.85', 'ink'],
      ['left:17px;top:19px;width:20px;height:24px;border-radius:2px 2px 6px 6px;border:1.6px solid var(--s-glass-icon-ink);opacity:.85', 'inkline'],
    ],
  },
]

/** Icons for the apps that have no dock slot; Launchpad still needs a face for them. */
export const EXTRA_ICONS: IconSpec[] = [
  {
    id: 'about',
    tip: 'About',
    grad: 'linear-gradient(180deg,#8e97a6,#4c545f)',
    inks: [
      ['left:13px;top:13px;width:28px;height:28px;border-radius:50%;border:2px solid rgba(255,255,255,.9)', 'inkline'],
      ['left:25.7px;top:19px;width:2.6px;height:2.6px;border-radius:50%;background:#fff', 'ink'],
      ['left:25.7px;top:24px;width:2.6px;height:13px;border-radius:2px;background:#fff', 'ink'],
    ],
  },
  {
    id: 'resume',
    tip: 'Resume',
    grad: 'linear-gradient(180deg,#f26a63,#c33026)',
    inks: [
      ['left:16px;top:11px;width:22px;height:31px;border-radius:3px;background:rgba(255,255,255,.94)', 'ink'],
      ['left:20px;top:18px;width:14px;height:2px;border-radius:1px;background:rgba(0,0,0,.3)', 'ink'],
      ['left:20px;top:24px;width:14px;height:2px;border-radius:1px;background:rgba(0,0,0,.22)', 'ink'],
      ['left:20px;top:30px;width:9px;height:2px;border-radius:1px;background:rgba(0,0,0,.22)', 'ink'],
    ],
  },
  {
    id: 'skills',
    tip: 'Skills',
    grad: 'linear-gradient(180deg,#a97bf0,#6a3ec0)',
    inks: [
      ['left:14px;top:16px;width:26px;height:5px;border-radius:3px;background:rgba(255,255,255,.94)', 'ink'],
      ['left:14px;top:25px;width:17px;height:5px;border-radius:3px;background:rgba(255,255,255,.78)', 'ink'],
      ['left:14px;top:34px;width:22px;height:5px;border-radius:3px;background:rgba(255,255,255,.62)', 'ink'],
    ],
  },
  {
    id: 'experience',
    tip: 'Experience',
    grad: 'linear-gradient(180deg,#5cc36a,#2b8743)',
    inks: [
      ['left:22px;top:14px;width:10px;height:8px;border-radius:2px 2px 0 0;border:2px solid rgba(255,255,255,.94)', 'inkline'],
      ['left:13px;top:21px;width:28px;height:19px;border-radius:3px;background:rgba(255,255,255,.94)', 'ink'],
      ['left:13px;top:29px;width:28px;height:1.8px;background:rgba(0,0,0,.22)', 'ink'],
    ],
  },
  {
    id: 'education',
    tip: 'Education',
    grad: 'linear-gradient(180deg,#4ea3f5,#1c62c9)',
    inks: [
      ['left:22px;top:24px;width:10px;height:12px;border-radius:0 0 3px 3px;background:rgba(255,255,255,.72)', 'ink'],
      ['left:14px;top:11px;width:26px;height:26px;border-radius:2px;background:rgba(255,255,255,.94);transform:scaleY(.46) rotate(45deg)', 'ink'],
      ['left:38px;top:22px;width:2px;height:13px;border-radius:1px;background:rgba(255,255,255,.72)', 'ink'],
    ],
  },
  {
    id: 'certificates',
    tip: 'Certificates',
    grad: 'linear-gradient(180deg,#f79a3e,#cd6212)',
    inks: [
      ['left:17px;top:10px;width:20px;height:20px;border-radius:50%;border:2.4px solid rgba(255,255,255,.94)', 'inkline'],
      ['left:20px;top:28px;width:5px;height:14px;border-radius:1px;background:rgba(255,255,255,.8);transform:rotate(-9deg)', 'ink'],
      ['left:29px;top:28px;width:5px;height:14px;border-radius:1px;background:rgba(255,255,255,.8);transform:rotate(9deg)', 'ink'],
    ],
  },
  {
    id: 'monitor',
    tip: 'System Monitor',
    grad: 'linear-gradient(180deg,#4bc0c8,#1a7f8c)',
    inks: [
      ['left:14px;top:32px;width:6px;height:9px;border-radius:2px;background:rgba(255,255,255,.94)', 'ink'],
      ['left:24px;top:24px;width:6px;height:17px;border-radius:2px;background:rgba(255,255,255,.94)', 'ink'],
      ['left:34px;top:16px;width:6px;height:25px;border-radius:2px;background:rgba(255,255,255,.94)', 'ink'],
    ],
  },
]

export const iconFor = (id: string): IconSpec | undefined =>
  ICONS.find((icon) => icon.id === id) ?? EXTRA_ICONS.find((icon) => icon.id === id)

/**
 * The icon face itself, sized by `size`; the dock and Launchpad share it.
 *
 * `badge` is a two-or-three character pill in the corner. Ask Sumit uses it: the assistant is
 * the most interesting thing on this desktop and it was indistinguishable from a chat window.
 */
export function AppIcon({
  spec,
  size = 54,
  initial,
  badge,
}: {
  spec: IconSpec
  size?: number
  initial?: string
  badge?: string
}) {
  const scale = size / 54
  return (
    <div style={{ ...s('position:relative'), width: size, height: size }}>
      <div
        data-iconface="1"
        style={{
          ...s(
            // Three insets, not one: a specular top edge, a soft floor shade for roundness, and
            // a hairline ring so the face keeps an edge against a bright wallpaper.
            'position:absolute;inset:0;overflow:hidden;box-shadow:0 8px 16px rgba(0,0,0,.36),0 2px 4px rgba(0,0,0,.22),inset 0 1.5px 0 rgba(255,255,255,.42),inset 0 -10px 20px rgba(0,0,0,.18),inset 0 0 0 .5px var(--s-glass-icon-ring);transition:box-shadow .22s ease,filter .22s ease',
          ),
          borderRadius: 15 * scale,
          ['--icon-grad' as string]: spec.grad,
          background: spec.grad,
        }}
      >
        <div style={{ ...s('position:absolute;inset:0'), background: 'var(--s-icon-spec)' }} />
      </div>
      {spec.inks.length ? (
        <div style={{ ...s('position:absolute;inset:0'), transform: `scale(${scale})`, transformOrigin: 'top left', width: 54, height: 54 }}>
          {spec.inks.map(([css, kind], i) => (
            <div key={i} {...{ [`data-${kind}`]: '1' }} style={{ ...s(css), position: 'absolute' }} />
          ))}
        </div>
      ) : (
        <div
          style={{
            ...s(
              'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700',
            ),
            fontSize: 17 * scale,
          }}
        >
          {initial ?? spec.tip.slice(0, 2)}
        </div>
      )}
      {badge ? (
        <span
          data-iconbadge="1"
          style={{
            ...s(
              'position:absolute;display:flex;align-items:center;justify-content:center;border-radius:999px;background:var(--s-accent);color:#fff;font-weight:700;letter-spacing:.04em;box-shadow:0 2px 5px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.35)',
            ),
            right: -2 * scale,
            top: -2 * scale,
            height: 17 * scale,
            padding: `0 ${5.5 * scale}px`,
            fontSize: 9.5 * scale,
          }}
        >
          {badge}
        </span>
      ) : null}
    </div>
  )
}
