import { useEffect, useState } from 'react'
import { SPRING } from '../anim'
import { s } from '../css'
import { useOs } from '../store'
import { useReducedMotion } from '../useTheme'

const LIFETIME = 3200
/** Two at once. A third would reach the second row of desk icons. */
const STACK = 2

/**
 * Transient notifications, top-right under the menu bar.
 *
 * Expiry is local state, not a `dismissNotif` dispatch: removing the notification from the
 * store to hide its toast is what left Notification Center permanently reading "No new
 * notifications" — the record died with the animation. The toast is a view of the record now,
 * and Notification Center keeps the record until the visitor clears it.
 *
 * A `quiet` notification is recorded and never toasted. Opening an app is the case: the window
 * appearing is the feedback, and a toast for it sat directly on top of the desk icons a visitor
 * uses to open the next one.
 */
export function Toasts() {
  const { notifications } = useOs()
  const reduced = useReducedMotion()
  const [expired, setExpired] = useState<number[]>([])

  const loud = notifications.filter((n) => !n.quiet)

  useEffect(() => {
    if (!loud.length) return
    const timers = loud.map((n) =>
      window.setTimeout(() => setExpired((prev) => (prev.includes(n.id) ? prev : [...prev, n.id])), LIFETIME),
    )
    return () => timers.forEach(window.clearTimeout)
    // `loud` is derived, so depend on the ids it carries rather than a fresh array each render.
  }, [loud.map((n) => n.id).join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const showing = loud.filter((n) => !expired.includes(n.id)).slice(0, STACK)

  return (
    <div
      id="toasts"
      // Toasts are the only feedback several actions give; without this a screen reader
      // never hears that anything happened.
      role="status"
      aria-live="polite"
      style={s(
        'position:absolute;top:calc(var(--s-menubar-h) + 16px);right:14px;z-index:var(--z-toast);display:flex;flex-direction:column;gap:8px;pointer-events:none',
      )}
    >
      {showing.map((n) => (
        <div
          key={n.id}
          style={{
            ...s(
              'padding:10px 12px;border-radius:11px;background:var(--s-pop);-webkit-backdrop-filter:var(--s-blur);backdrop-filter:var(--s-blur);border:1px solid var(--s-line);box-shadow:var(--s-shadow-pop);color:var(--s-text);font-size:12px;width:236px',
            ),
            animation: reduced ? 'none' : `toastIn .4s ${SPRING} both`,
          }}
        >
          <div style={s('font-weight:600;font-size:12.5px')}>{n.title}</div>
          <div style={s('color:var(--s-dim);margin-top:2px')}>{n.msg}</div>
        </div>
      ))}
    </div>
  )
}
