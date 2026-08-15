import { useEffect } from 'react'
import { SPRING } from '../anim'
import { s } from '../css'
import { useDispatch, useOs } from '../store'
import { useReducedMotion } from '../useTheme'

const LIFETIME = 3200

export function Toasts() {
  const { notifications } = useOs()
  const dispatch = useDispatch()
  const reduced = useReducedMotion()

  // Each toast clears itself; the notification stays in the calendar popover list.
  useEffect(() => {
    if (!notifications.length) return
    const timers = notifications.map((n) =>
      window.setTimeout(() => dispatch({ type: 'dismissNotif', id: n.id }), LIFETIME),
    )
    return () => timers.forEach(window.clearTimeout)
  }, [notifications, dispatch])

  return (
    <div
      id="toasts"
      style={s(
        'position:absolute;top:40px;right:14px;z-index:190;display:flex;flex-direction:column;gap:8px;pointer-events:none',
      )}
    >
      {notifications.map((n) => (
        <div
          key={n.id}
          style={{
            ...s(
              'padding:10px 12px;border-radius:11px;background:var(--s-pop);backdrop-filter:var(--s-blur);border:1px solid var(--s-line);box-shadow:var(--s-shadow-pop);color:var(--s-text);font-size:12px;width:236px',
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
