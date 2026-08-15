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
      ['left:12px;top:19px;width:30px;height:21px;border-radius:2px 4px 4px 4px;background:rgba(255,255,255,.94)', 'ink'],
      ['left:12px;top:26px;width:30px;height:1.5px;background:rgba(20,40,90,.3)', 'ink'],
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
      ['left:26px;top:12px;width:2.2px;height:13px;border-radius:2px;background:rgba(255,255,255,.92)', 'ink'],
      ['left:22.5px;top:19px;width:9px;height:9px;border-right:2.2px solid rgba(255,255,255,.92);border-bottom:2.2px solid rgba(255,255,255,.92);border-radius:0 0 2px 0;transform:rotate(45deg)', 'inkline'],
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
  { id: 'about', tip: 'About', grad: 'linear-gradient(180deg,#8e97a6,#4c545f)', inks: [] },
  { id: 'resume', tip: 'Resume', grad: 'linear-gradient(180deg,#f26a63,#c33026)', inks: [] },
  { id: 'skills', tip: 'Skills', grad: 'linear-gradient(180deg,#a97bf0,#6a3ec0)', inks: [] },
  { id: 'experience', tip: 'Experience', grad: 'linear-gradient(180deg,#5cc36a,#2b8743)', inks: [] },
  { id: 'education', tip: 'Education', grad: 'linear-gradient(180deg,#4ea3f5,#1c62c9)', inks: [] },
  { id: 'certificates', tip: 'Certificates', grad: 'linear-gradient(180deg,#f79a3e,#cd6212)', inks: [] },
]

export const iconFor = (id: string): IconSpec | undefined =>
  ICONS.find((icon) => icon.id === id) ?? EXTRA_ICONS.find((icon) => icon.id === id)

/** The icon face itself, sized by `size`; the dock and Launchpad share it. */
export function AppIcon({ spec, size = 54, initial }: { spec: IconSpec; size?: number; initial?: string }) {
  const scale = size / 54
  return (
    <div style={{ ...s('position:relative'), width: size, height: size }}>
      <div
        data-iconface="1"
        style={{
          ...s(
            'position:absolute;inset:0;overflow:hidden;box-shadow:0 8px 16px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.3),inset 0 0 0 .5px var(--s-glass-icon-ring)',
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
    </div>
  )
}
