import { useEffect, useRef, useState } from 'react'
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

  const timers = useRef(new Map<number, number>())

  const loud = notifications.filter((n) => !n.quiet)
  const showing = loud.filter((n) => !expired.includes(n.id)).slice(0, STACK)

  // The clock starts when a toast is *shown*, not when it arrives. Scheduling every loud
  // notification meant three landing together all expired on the same timer, and the one the
  // stack was holding back was marked seen without ever being painted.
  //
  // One timer per id, kept in a ref: re-running this on each render is cheap, and it means a
  // toast's countdown is never restarted by a later notification joining the stack.
  useEffect(() => {
    for (const n of showing) {
      if (timers.current.has(n.id)) continue
      const handle = window.setTimeout(() => {
        timers.current.delete(n.id)
        setExpired((prev) => (prev.includes(n.id) ? prev : [...prev, n.id]))
      }, LIFETIME)
      timers.current.set(n.id, handle)
    }
  })

  // Forget ids the store has dropped, so this does not grow for the life of the session.
  const liveIds = notifications.map((n) => n.id).join(',')
  useEffect(() => {
    const live = new Set(notifications.map((n) => n.id))
    setExpired((prev) => {
      const kept = prev.filter((id) => live.has(id))
      return kept.length === prev.length ? prev : kept
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveIds])

  const pending = timers.current
  useEffect(() => () => pending.forEach(window.clearTimeout), [pending])

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
