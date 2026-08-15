import { useEffect } from 'react'
import { useDispatch, useOpenApp, useOs } from './store'

/** Keyboard map from the design's shortcut sheet. */
export function useHotkeys() {
  const { active, spotlight, activeSpace, spaces } = useOs()
  const dispatch = useDispatch()
  const openApp = useOpenApp()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true

      const meta = e.metaKey || e.ctrlKey

      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        dispatch({ type: 'overlay', name: 'spotlight' })
        return
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'closeTransient' })
        return
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        openApp('finder-projects')
        return
      }
      // Tiling: ⌃⌘← / ⌃⌘→ put the front window on half the screen.
      if (e.ctrlKey && e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && active) {
        e.preventDefault()
        dispatch({
          type: 'snap',
          app: active,
          zone: e.key === 'ArrowLeft' ? 'left' : 'right',
          viewport: { w: window.innerWidth, h: window.innerHeight },
        })
        return
      }
      // Spaces: ⌃← / ⌃→ move between desktops. `meta` treats Ctrl as ⌘ elsewhere, so the
      // Space bindings have to test the real modifiers.
      if (e.ctrlKey && !e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()
        const next = activeSpace + (e.key === 'ArrowLeft' ? -1 : 1)
        if (next >= 1 && next <= spaces) dispatch({ type: 'space', index: next })
        return
      }
      if (e.key === 'F4') {
        e.preventDefault()
        dispatch({ type: 'overlay', name: 'launchpad' })
        return
      }
      if ((meta && e.key === 'ArrowUp') || e.key === 'F3') {
        e.preventDefault()
        dispatch({ type: 'overlay', name: 'mission' })
        return
      }
      if (meta && e.key === ',') {
        e.preventDefault()
        openApp('settings')
        return
      }
      if (meta && e.key.toLowerCase() === 'w' && active) {
        e.preventDefault()
        dispatch({ type: 'close', app: active })
        return
      }
      if (meta && e.key.toLowerCase() === 'm' && active) {
        e.preventDefault()
        dispatch({ type: 'minimize', app: active })
        return
      }
      // '?' only counts when the visitor is not typing into a field.
      if (e.key === '?' && !typing && !spotlight) {
        e.preventDefault()
        dispatch({ type: 'overlay', name: 'shortcuts' })
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, spotlight, activeSpace, spaces, dispatch, openApp])
}
