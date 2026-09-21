'use client'

import { useCallback, useEffect, useState } from 'react'
import { s } from '../css'
import { useDispatch, useOs } from '../store'
import { useReducedMotion } from '../useTheme'

/** Beat lengths. Full sequence is POWER + DRAW + DISSOLVE; a return visit is DISSOLVE only. */
const POWER = 1400
const DRAW = 2600
const DISSOLVE = 600

/** Set once the full sequence has played in this browser. */
const SEEN_KEY = 'sumit-os-seen-hello'

/**
 * The word, as one continuous cursive stroke.
 *
 * Drawn here rather than traced from Apple's lettering — the point is a handwritten
 * `hello`, not a copy of their artwork. `pathLength` is declared as 1 on the element, so
 * the browser normalises the geometry and the draw is a dash array of 1 counted down to
 * 0. That is what lets this animate with no `getTotalLength()` call, no layout read and no
 * magic length constant, and it is why it renders correctly on the server.
 *
 * Baseline sits at y=155, x-height top at y=100, ascenders reach y=30.
 */
const HELLO =
  // h: entry upstroke, ascender loop, stem, shoulder
  'M 30 155 C 34 120 48 60 76 34 C 92 22 104 32 98 56 C 92 80 82 122 80 152 ' +
  'C 80 118 96 96 116 100 C 132 104 134 126 128 148 C 125 156 130 159 138 155 ' +
  // e: upstroke, the eye looping back over itself, then the bowl
  'C 150 148 164 130 162 118 C 160 108 148 106 142 116 C 136 126 138 144 150 150 ' +
  'C 162 156 176 150 186 140 ' +
  // l
  'C 196 126 208 84 220 52 C 228 30 242 30 236 55 C 230 80 214 126 212 145 ' +
  'C 211 154 219 157 228 152 ' +
  // l
  'C 238 138 250 94 262 62 C 270 40 284 40 278 64 C 272 88 256 136 254 147 ' +
  'C 253 156 261 159 270 154 ' +
  // o: bowl, closed at the top, with an exit flourish
  'C 282 142 294 116 312 108 C 332 100 344 116 340 134 C 336 152 318 162 306 153 ' +
  'C 296 146 300 124 318 114 C 328 109 338 110 348 102'


function Hello() {
  return (
    <svg
      viewBox="0 0 390 200"
      role="img"
      aria-label="hello"
      style={s('width:min(64vw,620px);height:auto;overflow:visible')}
    >
      <defs>
        {/* Fades to nothing at both ends so the stroke emerges from the background
            instead of starting and stopping on a hard dot. */}
        <linearGradient id="hello-ink" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="9%" stopColor="#fff" stopOpacity="1" />
          <stop offset="91%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={HELLO}
        pathLength={1}
        fill="none"
        stroke="url(#hello-ink)"
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 1,
          // cubic-bezier(.42,0,.58,1) is Apple's own easeInEaseOut.
          animation: `helloDraw ${DRAW}ms cubic-bezier(.42,0,.58,1) forwards`,
        }}
      />
    </svg>
  )
}

/**
 * The startup curtain, reused by every power state.
 *
 * `bar` runs the progress animation; `fading` plays the dissolve. Shut Down keeps neither:
 * it is meant to sit there until someone comes back.
 */
export function Curtain({
  label,
  bar,
  fading,
  hello,
  onClick,
  children,
}: {
  label?: string
  bar?: boolean
  fading?: boolean
  /** Swap the mark for the handwritten word, over the colour field. */
  hello?: boolean
  onClick?: () => void
  children?: React.ReactNode
}) {
  return (
    <div
      id="boot"
      style={{
        ...s(
          'position:absolute;inset:0;z-index:var(--z-curtain);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;transition:background .6s ease',
        ),
        background: hello ? 'var(--s-hello-wall)' : 'var(--s-boot-wall)',
        animation: fading ? `bootOut ${DISSOLVE / 1000}s cubic-bezier(.32,.72,0,1) forwards` : undefined,
        cursor: onClick ? 'default' : undefined,
      }}
      onClick={onClick}
    >
      {hello ? (
        <div style={s('animation:helloIn .5s ease both')}>
          <Hello />
        </div>
      ) : (
        <div
          style={s(
            'display:flex;flex-direction:column;align-items:center;gap:14px;animation:markIn .8s cubic-bezier(.32,.72,0,1) both',
          )}
        >
          <div
            style={s(
              'width:60px;height:60px;border-radius:14px;border:1px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:600;letter-spacing:.06em;color:var(--s-boot-fg)',
            )}
          >
            SJ
          </div>
          {label ? (
            <div
              style={s(
                'font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:rgba(233,234,236,.5)',
              )}
            >
              {label}
            </div>
          ) : null}
        </div>
      )}
      {bar ? (
        <div
          style={s(
            'width:190px;height:4px;border-radius:3px;background:rgba(255,255,255,.15);overflow:hidden',
          )}
        >
          <div
            style={{
              ...s('height:100%;background:var(--s-boot-fg);border-radius:3px'),
              animation: `bootBar ${POWER}ms cubic-bezier(.32,.72,0,1) forwards`,
            }}
          />
        </div>
      ) : null}
      {children}
    </div>
  )
}

type Beat = 'power' | 'hello' | 'fade' | 'gone'

/**
 * The startup sequence itself: power-on bar, the handwritten word, then the dissolve.
 *
 * `onBooted` fires when the dissolve *starts*, so the desktop is already painted behind it
 * — the same ordering the single-curtain version had. A visitor who has seen it once skips
 * straight to the dissolve; four and a half seconds is a gift the first time and an
 * obstacle every time after.
 */
function Sequence({
  full,
  onBooted,
  onDone,
}: {
  full: boolean
  onBooted: () => void
  onDone: () => void
}) {
  // First render is the power beat either way, which is what the server prerenders.
  const [beat, setBeat] = useState<Beat>('power')

  useEffect(() => {
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))

    if (full) {
      at(POWER, () => setBeat('hello'))
      at(POWER + DRAW, () => {
        setBeat('fade')
        onBooted()
      })
      at(POWER + DRAW + DISSOLVE, () => setBeat('gone'))
    } else {
      setBeat('fade')
      onBooted()
      at(DISSOLVE, () => setBeat('gone'))
    }

    return () => timers.forEach(window.clearTimeout)
    // Runs once: the beats are a fixed schedule, not a reaction to changing props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (beat === 'gone') onDone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat])

  if (beat === 'gone') return null

  return (
    <Curtain
      bar={beat === 'power'}
      hello={beat === 'hello'}
      fading={beat === 'fade'}
      label={beat === 'power' ? "Sumit's Portfolio OS" : undefined}
    />
  )
}

/**
 * Startup curtain. Reduced motion skips straight to the desktop.
 */
export function Boot() {
  const reduced = useReducedMotion()
  const dispatch = useDispatch()
  const [gone, setGone] = useState(false)
  // null until the effect has read localStorage — the server has no localStorage, and the
  // first client paint has to match what it prerendered.
  const [full, setFull] = useState<boolean | null>(null)

  useEffect(() => {
    if (reduced) {
      dispatch({ type: 'booted' })
      setGone(true)
      return
    }
    let seen = false
    try {
      seen = localStorage.getItem(SEEN_KEY) === '1'
    } catch {
      // Private mode, or storage blocked. Play the full sequence; it is the better default.
    }
    setFull(!seen)
  }, [reduced, dispatch])

  /**
   * Written when the sequence finishes, not when it starts.
   *
   * The flag means "this browser has seen the full startup". Setting it up front made a
   * reload, a tab close or a crash during those four seconds count as having seen it, and the
   * visitor never got the animation again — on a first visit, which is the only visit it
   * plays on.
   */
  const remember = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // Private mode, or storage blocked. The visitor sees it again next time; harmless.
    }
    setGone(true)
  }, [])

  const booted = useCallback(() => dispatch({ type: 'booted' }), [dispatch])

  if (gone) return null
  // Before the effect runs there is nothing to schedule yet, so hold the power beat.
  if (full === null) return <Curtain bar label="Sumit's Portfolio OS" />

  return <Sequence full={full} onBooted={booted} onDone={remember} />
}

/**
 * Sleep, Restart and Shut Down.
 *
 * None of them tear the desktop down: windows, Spaces and preferences are still in the store
 * behind the curtain, so waking lands on exactly the desk that was left. Restart replays the
 * whole startup, which is also the only way to see the `hello` again on purpose.
 */
export function PowerOverlay() {
  const { power } = useOs()
  const dispatch = useDispatch()
  const reduced = useReducedMotion()
  const wake = useCallback(() => dispatch({ type: 'power', state: 'on' }), [dispatch])

  // Any key wakes a sleeping machine, the same as any click does.
  useEffect(() => {
    if (power !== 'sleep') return
    window.addEventListener('keydown', wake)
    return () => window.removeEventListener('keydown', wake)
  }, [power, wake])

  useEffect(() => {
    if (power !== 'restart' || !reduced) return
    wake()
  }, [power, reduced, wake])

  if (power === 'on') return null

  if (power === 'sleep') {
    return (
      <div
        id="power-sleep"
        role="button"
        aria-label="Wake"
        tabIndex={0}
        onClick={wake}
        onKeyDown={wake}
        style={s(
          'position:absolute;inset:0;z-index:var(--z-curtain);background:rgba(4,5,7,.97);cursor:default;display:flex;align-items:flex-end;justify-content:center;padding-bottom:56px;color:rgba(233,234,236,.34);font-size:12px;letter-spacing:.12em;text-transform:uppercase',
        )}
      >
        Click or press a key to wake
      </div>
    )
  }

  if (power === 'restart') {
    if (reduced) return null
    return <Sequence full onBooted={() => {}} onDone={wake} />
  }

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
