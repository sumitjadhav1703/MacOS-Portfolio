import { useEffect, useRef, useState } from 'react'
import { AI_SUGGESTIONS, aiAnswer } from '../../data/os'
import { EASE } from '../anim'
import { s } from '../css'
import { useReducedMotion, useTheme } from '../useTheme'

type Msg = { from: 'them' | 'me'; text: string }

const OPENING =
  "Ask me about Sumit's projects, stack, education or how to reach him. I answer from his portfolio only."

export function SumitAI() {
  const reduced = useReducedMotion()
  const { accent } = useTheme()
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'them', text: OPENING }])
  const [typing, setTyping] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number>(0)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, typing])

  useEffect(() => () => window.clearInterval(timer.current), [])

  function ask(question: string) {
    const q = question.trim()
    if (!q) return
    setMsgs((prev) => [...prev, { from: 'me', text: q }])
    const answer = aiAnswer(q)

    if (reduced) {
      setMsgs((prev) => [...prev, { from: 'them', text: answer }])
      return
    }

    // Word-by-word reveal, the same pacing as the original.
    const words = answer.split(' ')
    let i = 0
    setTyping('')
    window.clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      i += 1
      setTyping(words.slice(0, i).join(' '))
      if (i >= words.length) {
        window.clearInterval(timer.current)
        setTyping(null)
        setMsgs((prev) => [...prev, { from: 'them', text: answer }])
      }
    }, 26)
  }

  const bubble = (from: Msg['from']) =>
    from === 'me'
      ? s(
          'align-self:flex-end;max-width:82%;padding:11px 14px;border-radius:16px 16px 5px 16px;background:var(--s-line);border:1px solid var(--s-fill-2);font-size:13px;line-height:1.6',
        )
      : s(
          'align-self:flex-start;max-width:82%;padding:11px 14px;border-radius:16px 16px 16px 5px;background:var(--s-bubble);border:1px solid var(--s-fill-2);font-size:13px;line-height:1.6;min-height:20px',
        )

  return (
    <div style={s('height:100%;display:flex;flex-direction:column')}>
      <div
        id="ai-scroll"
        ref={scrollRef}
        style={s(
          'flex:1;overflow:auto;padding:22px 22px 8px;display:flex;flex-direction:column;gap:12px',
        )}
      >
        {msgs.map((m, i) => (
          <div key={i} style={bubble(m.from)}>
            {m.text}
          </div>
        ))}
        {typing !== null ? <div style={bubble('them')}>{typing}</div> : null}
        {msgs.length === 1 ? (
          <div style={s('display:flex;flex-wrap:wrap;gap:7px;margin-top:2px')}>
            {AI_SUGGESTIONS.map((q) => (
              <div
                key={q}
                data-chipbtn="1"
                role="button"
                style={{
                  ...s(
                    'padding:7px 12px;border-radius:999px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:12px;cursor:default',
                  ),
                  transition: `background .28s ${EASE}`,
                }}
                onClick={() => ask(q)}
              >
                {q}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div
        style={s(
          'padding:12px 16px;border-top:1px solid var(--s-line);display:flex;gap:10px;align-items:center;background:var(--s-side)',
        )}
      >
        <input
          id="ai-in"
          type="text"
          placeholder="Ask something…"
          aria-label="Ask Sumit"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            ask(value)
            setValue('')
          }}
          style={s(
            'flex:1;background:var(--s-input);border:1px solid var(--s-line);border-radius:999px;padding:9px 15px;color:var(--s-text);outline:none;font-family:inherit;font-size:13px',
          )}
        />
        <div
          data-btn="1"
          role="button"
          aria-label="Send"
          onClick={() => {
            ask(value)
            setValue('')
          }}
          style={{
            ...s(
              'width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:default;flex:none;color:#fff',
            ),
            background: accent,
            transition: `filter .28s ${EASE}`,
          }}
        >
          ↑
        </div>
      </div>
    </div>
  )
}
