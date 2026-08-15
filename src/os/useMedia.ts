'use client'

import { useSyncExternalStore } from 'react'

/**
 * Media queries read through useSyncExternalStore rather than useState, so the server
 * snapshot is a plain `false` and the first client paint matches the prerendered HTML.
 */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Below this width the desktop metaphor is replaced by the stacked mobile page. */
export const useIsMobile = () => useMedia('(max-width: 767px)')

/** True once the component is running in the browser. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

/** Network reachability, as the menu bar and Control Center report it. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('online', onChange)
      window.addEventListener('offline', onChange)
      return () => {
        window.removeEventListener('online', onChange)
        window.removeEventListener('offline', onChange)
      }
    },
    () => navigator.onLine,
    () => true,
  )
}
