'use client'

import { useCallback, useEffect, useState } from 'react'
import { s } from '../css'
import { useDispatch, useOs } from '../store'
import { useReducedMotion } from '../useTheme'

/** How long the bar runs, and how long the curtain lingers behind it. */
const BEAT = 2000
const FADE = 2200

/**
 * The startup curtain, reused by every power state.
 *
 * `bar` runs the progress animation; `fading` plays the same dissolve the boot has always
 * played. Shut Down keeps neither: it is meant to sit there until someone comes back.
 */
export function Curtain({
  label,
  bar,
  fading,
  onClick,
  children,
}: {
  label: string
  bar?: boolean
  fading?: boolean
  onClick?: () => void
  children?: React.ReactNode
}) {
  return (
    <div
      id="boot"
      style={{
        ...s(
          'position:absolute;inset:0;z-index:500;background:#0b0d0f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px',
        ),
        animation: fading ? `bootOut ${FADE / 1000}s cubic-bezier(.32,.72,0,1) forwards` : undefined,
        cursor: onClick ? 'default' : undefined,
      }}
      onClick={onClick}
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
          {label}
        </div>
      </div>
      {bar ? (
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
      ) : null}
      {children}
    </div>
  )
}

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
    const hide = window.setTimeout(() => setGone(true), FADE)
    const boot = window.setTimeout(() => dispatch({ type: 'booted' }), BEAT)
    return () => {
      window.clearTimeout(hide)
      window.clearTimeout(boot)
    }
  }, [reduced, dispatch])

  if (gone) return null

  return <Curtain label="Sumit's Portfolio OS" bar fading />
}

/**
 * Sleep, Restart and Shut Down.
 *
 * None of them tear the desktop down: windows, Spaces and preferences are still in the store
 * behind the curtain, so waking lands on exactly the desk that was left. Restart is the only
 * one on a timer, and it reuses the boot beat rather than inventing a longer wait — a fake
 * delay is the one thing that makes a power state feel like a screensaver.
 */
export function PowerOverlay() {
  const { power } = useOs()
  const dispatch = useDispatch()
  const reduced = useReducedMotion()
  const wake = useCallback(() => dispatch({ type: 'power', state: 'on' }), [dispatch])

  useEffect(() => {
    if (power !== 'restart') return
    const t = window.setTimeout(wake, reduced ? 0 : BEAT)
    return () => window.clearTimeout(t)
  }, [power, reduced, wake])

  // Any key wakes a sleeping machine, the same as any click does.
  useEffect(() => {
    if (power !== 'sleep') return
    window.addEventListener('keydown', wake)
    return () => window.removeEventListener('keydown', wake)
  }, [power, wake])

  if (power === 'on') return null

  if (power === 'sleep') {
    return (
      <div
        id="power-sleep"
        role="button"
        aria-label="Wake"
        tabIndex={0}
        onClick={wake}
        style={s(
          'position:absolute;inset:0;z-index:500;background:rgba(4,5,7,.97);cursor:default;display:flex;align-items:flex-end;justify-content:center;padding-bottom:56px;color:rgba(233,234,236,.34);font-size:12px;letter-spacing:.12em;text-transform:uppercase',
        )}
      >
        Click or press a key to wake
      </div>
    )
  }

  if (power === 'restart') return <Curtain label="Restarting" bar />

  return (
    <Curtain label="Sumit's Portfolio OS" onClick={wake}>
      <div
        role="button"
        aria-label="Power on"
        style={s(
          'font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:rgba(233,234,236,.42);padding:8px 16px;border:1px solid rgba(255,255,255,.18);border-radius:9px',
        )}
      >
        Power on
      </div>
    </Curtain>
  )
}
