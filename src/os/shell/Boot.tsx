import { useEffect, useState } from 'react'
import { s } from '../css'
import { useDispatch } from '../store'
import { useReducedMotion } from '../useTheme'

/**
 * Startup curtain. It plays for 2.1s, then the desktop opens its startup app.
 * Reduced motion skips straight to the desktop.
 */
export function Boot() {
  const reduced = useReducedMotion()
  const dispatch = useDispatch()
  const [gone, setGone] = useState(reduced)

  useEffect(() => {
    if (reduced) {
      dispatch({ type: 'booted' })
      return
    }
    const hide = window.setTimeout(() => setGone(true), 2200)
    const boot = window.setTimeout(() => dispatch({ type: 'booted' }), 2000)
    return () => {
      window.clearTimeout(hide)
      window.clearTimeout(boot)
    }
  }, [reduced, dispatch])

  if (gone) return null

  return (
    <div
      id="boot"
      style={s(
        'position:absolute;inset:0;z-index:500;background:#0b0d0f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;animation:bootOut 2.1s cubic-bezier(.32,.72,0,1) forwards',
      )}
    >
      <div
        style={s(
          'display:flex;flex-direction:column;align-items:center;gap:14px;animation:markIn .8s cubic-bezier(.32,.72,0,1) both',
        )}
      >
        <div
          style={s(
            'width:60px;height:60px;border-radius:14px;border:1px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:600;letter-spacing:.06em;color:#f2f3f5',
          )}
        >
          SJ
        </div>
        <div
          style={s(
            'font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:rgba(233,234,236,.5)',
          )}
        >
          Sumit's Portfolio OS
        </div>
      </div>
      <div
        style={s(
          'width:190px;height:4px;border-radius:3px;background:rgba(255,255,255,.15);overflow:hidden',
        )}
      >
        <div
          style={s(
            'height:100%;background:#fff;border-radius:3px;animation:bootBar 1.7s cubic-bezier(.32,.72,0,1) forwards',
          )}
        />
      </div>
    </div>
  )
}
