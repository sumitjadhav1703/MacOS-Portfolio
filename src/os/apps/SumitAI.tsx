import { useEffect, useRef, useState } from 'react'
import { answerFrom } from '../../data/content'
import { useContent } from '../content'
import { EASE } from '../anim'
import { s } from '../css'
import { useReducedMotion, useTheme } from '../useTheme'

type Source = { type: string; slug: string; title: string }
type Msg = { from: 'them' | 'me'; text: string; sources?: Source[] }

const OPENING =
  "Ask me about Sumit's projects, stack, education or how to reach him. I answer from his portfolio only."

const RATE_LIMITED = 'That is a lot of questions at once. Give it a minute and ask again.'

const API = process.env.NEXT_PUBLIC_API_URL

/** How many prior turns travel with a question, matching the cap the Worker enforces. */
const HISTORY = 6

/** The reveal cadence from the original design. Kept — it is what the window feels like. */
const WORD_MS = 26

function historyOf(msgs: Msg[]): { role: string; content: string }[] {
  // The opening bubble is chrome, not a turn: it was never asked for and answers nothing.
  return msgs.slice(1, -1).slice(-HISTORY).map((m) => ({
    role: m.from === 'me' ? 'user' : 'assistant',
    content: m.text,
  }))
}

/**
 * Ask Sumit.
 *
 * The window sends the question to the Worker, which grounds it in the published portfolio and
 * answers with a real model. Everything below that is unchanged from when it matched keywords
 * locally — same bubbles, same word-by-word reveal, same suggestion chips.
 *
 * `answerFrom` has not gone anywhere. It is what runs when there is no API configured (the
 * standalone build), and what runs when the Worker or the assistant is unreachable. A recruiter
 * with a flaky connection gets the old deterministic answer, never an empty window.
 */
export function SumitAI() {
  const content = useContent()
  const reduced = useReducedMotion()
  const { accent } = useTheme()
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'them', text: OPENING }])
  const [typing, setTyping] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [retry, setRetry] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number>(0)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, typing, pending])

  useEffect(() => () => window.clearInterval(timer.current), [])

  function reveal(text: string, sources?: Source[]) {
    const done = () => setMsgs((prev) => [...prev, { from: 'them', text, sources }])
    if (reduced) {
      done()
      return
    }

    // Word-by-word reveal, the same pacing as the original.
    const words = text.split(' ')
    let i = 0
    setTyping('')
    window.clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      i += 1
      setTyping(words.slice(0, i).join(' '))
      if (i >= words.length) {
        window.clearInterval(timer.current)
        setTyping(null)
        done()
      }
    }, WORD_MS)
  }

  async function ask(question: string) {
    const q = question.trim()
    if (!q || pending) return

    setRetry(null)
    const asked: Msg[] = [...msgs, { from: 'me', text: q }]
    setMsgs(asked)

    if (!API) {
      reveal(answerFrom(content, q))
      return
    }

    setPending(true)
    try {
      const response = await fetch(`${API}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, history: historyOf(asked) }),
      })

      // A rate limit is not a failure to retry — it is an answer, and retrying is the one
      // thing that makes it worse. Say so and offer nothing to click.
      if (response.status === 429) {
        const body = await response.json().catch(() => null)
        reveal(typeof body?.error === 'string' ? body.error : RATE_LIMITED)
        return
      }

      const body = await response.json().catch(() => null)
      if (!response.ok || typeof body?.answer !== 'string') throw new Error('unavailable')
      reveal(body.answer, Array.isArray(body.sources) ? body.sources : undefined)
    } catch {
      setRetry(q)
      reveal(answerFrom(content, q))
    } finally {
      setPending(false)
    }
  }

  function clear() {
    window.clearInterval(timer.current)
    setMsgs([{ from: 'them', text: OPENING }])
    setTyping(null)
    setRetry(null)
    setPending(false)
  }

  const bubble = (from: Msg['from']) =>
    from === 'me'
      ? s(
          'align-self:flex-end;max-width:82%;padding:11px 14px;border-radius:16px 16px 5px 16px;background:var(--s-line);border:1px solid var(--s-fill-2);font-size:13px;line-height:1.6',
        )
      : s(
          'align-self:flex-start;max-width:82%;padding:11px 14px;border-radius:16px 16px 16px 5px;background:var(--s-bubble);border:1px solid var(--s-fill-2);font-size:13px;line-height:1.6;min-height:20px',
        )

  const chip = {
    ...s(
      'padding:7px 12px;border-radius:999px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:12px;cursor:default',
    ),
    transition: `background .28s ${EASE}`,
  }

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
          <div key={i} style={s('display:flex;flex-direction:column;gap:6px')}>
            <div style={bubble(m.from)}>{m.text}</div>
            {m.sources?.length ? <Sources sources={m.sources} /> : null}
          </div>
        ))}

        {typing !== null ? <div style={bubble('them')}>{typing}</div> : null}
        {pending ? (
          <div style={{ ...bubble('them'), opacity: 0.6 }} aria-live="polite">
            Reading the portfolio…
          </div>
        ) : null}

        {msgs.length === 1 && !pending ? (
          <div style={s('display:flex;flex-wrap:wrap;gap:7px;margin-top:2px')}>
            {content.os.aiSuggestions.map((q) => (
              <div key={q} data-chipbtn="1" role="button" style={chip} onClick={() => ask(q)}>
                {q}
              </div>
            ))}
          </div>
        ) : null}

        {retry && typing === null && !pending ? (
          <div style={s('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
            <span style={s('font-size:11px;color:var(--s-dim)')}>
              Answered offline — the assistant could not be reached.
            </span>
            <div data-chipbtn="1" role="button" style={chip} onClick={() => ask(retry)}>
              Try again
            </div>
          </div>
        ) : null}
      </div>

      <div
        style={s(
          'padding:12px 16px;border-top:1px solid var(--s-line);display:flex;gap:10px;align-items:center;background:var(--s-side)',
        )}
      >
        {msgs.length > 1 ? (
          <div
            data-btn="1"
            role="button"
            aria-label="Clear conversation"
            title="Clear conversation"
            onClick={clear}
            style={s(
              'font-size:11px;color:var(--s-dim);cursor:default;flex:none;padding:4px 2px',
            )}
          >
            Clear
          </div>
        ) : null}

        <input
          id="ai-in"
          type="text"
          placeholder={pending ? 'Thinking…' : 'Ask something…'}
          aria-label="Ask Sumit"
          maxLength={600}
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
            opacity: pending ? 0.5 : 1,
            transition: `filter .28s ${EASE}`,
          }}
        >
          ↑
        </div>
      </div>
    </div>
  )
}

/**
 * What the answer was drawn from. Projects link to their page; a skill group or an experience
 * entry has no route of its own, so it is named without being a link.
 */
function Sources({ sources }: { sources: Source[] }) {
  return (
    <div style={s('display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start;max-width:82%')}>
      {sources.map((src) => {
        const label = s(
          'padding:3px 9px;border-radius:999px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:11px;color:var(--s-dim);text-decoration:none',
        )
        return src.slug ? (
          <a key={`${src.type}-${src.title}`} href={`/projects/${src.slug}`} style={label}>
            {src.title}
          </a>
        ) : (
          <span key={`${src.type}-${src.title}`} style={label}>
            {src.title}
          </span>
        )
      })}
    </div>
  )
}
