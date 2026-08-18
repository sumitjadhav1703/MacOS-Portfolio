'use client'

import { useEffect, useRef } from 'react'
import type { AppId } from './types'

/**
 * The menu bar's channel to the focused window.
 *
 * Most menu items are store actions, and those need nothing extra. A handful — clearing the
 * Shell, copying the open source file, retrying the last question — act on state that lives
 * inside one component and has no business in the reducer. Those travel as a window event,
 * the same way the wallpaper picker is opened (`os:pickwall` in shell/Wallpaper.tsx).
 *
 * One event, one detail shape. Do not grow this into a command registry: if a menu item needs
 * more than a name, it probably belongs in the store instead.
 */
const EVENT = 'os:cmd'

export type AppCommand = { app: AppId; cmd: string }

export const runCmd = (app: AppId, cmd: string): void => {
  window.dispatchEvent(new CustomEvent<AppCommand>(EVENT, { detail: { app, cmd } }))
}

/**
 * Listen for the commands addressed to one app.
 *
 * The handler is held in a ref so a caller can pass an inline closure — which every one of them
 * does — without the listener being torn down and rebuilt on each render.
 */
export function useAppCommand(app: AppId, handler: (cmd: string) => void): void {
  const latest = useRef(handler)
  latest.current = handler

  useEffect(() => {
    const onCmd = (e: Event) => {
      const detail = (e as CustomEvent<AppCommand>).detail
      if (detail?.app === app) latest.current(detail.cmd)
    }
    window.addEventListener(EVENT, onCmd)
    return () => window.removeEventListener(EVENT, onCmd)
  }, [app])
}
