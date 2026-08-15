import { useState } from 'react'
import { Body, PageHead } from '../../components/primitives'
import { EMAIL } from '../../data/profile'
import { s } from '../css'
import { useDispatch } from '../store'
import { ProfileCards } from './simple'

const FIELD =
  'width:100%;margin-top:5px;background:var(--s-input);border:1px solid var(--s-line);border-radius:9px;padding:10px 12px;color:var(--s-text);outline:none;font-family:inherit;font-size:13px'

/** The page never sends anything: the draft is handed to the visitor's own mail client. */
export function Contact() {
  const dispatch = useDispatch()
  const [name, setName] = useState('')
  const [mail, setMail] = useState('')
  const [msg, setMsg] = useState('')
  const [note, setNote] = useState({
    text: 'Opens your own mail client — nothing is sent from this page.',
    color: 'var(--s-faint)',
  })

  function sendMail() {
    if (!msg.trim()) {
      setNote({ text: 'Add a message first.', color: 'var(--s-warn)' })
      return
    }
    const subject = 'Portfolio enquiry' + (name.trim() ? ' from ' + name.trim() : '')
    const body = msg.trim() + (mail.trim() ? `\n\n— ${name.trim() || 'Sent'} (${mail.trim()})` : '')
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setNote({ text: 'Handed to your mail client.', color: 'var(--s-ok)' })
    dispatch({ type: 'notify', title: 'Reach Out', msg: 'Draft opened in your mail client' })
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(EMAIL)
      dispatch({ type: 'notify', title: 'Reach Out', msg: 'Address copied' })
    } catch {
      // Clipboard blocked — the address is spelled out in the Elsewhere grid below.
      setNote({ text: EMAIL, color: 'var(--s-dim)' })
    }
  }

  return (
    <Body>
      <PageHead title="Reach Out" sub="Open to AI/ML engineering internships" />
      <div style={s('display:flex;flex-direction:column;gap:9px;margin-top:20px;max-width:560px')}>
        <div style={s('display:grid;grid-template-columns:1fr 1fr;gap:9px')}>
          <label style={s('display:block')}>
            <span style={s('font-size:11.5px;color:var(--s-dim)')}>Your name</span>
            <input
              id="rc-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={s(FIELD)}
            />
          </label>
          <label style={s('display:block')}>
            <span style={s('font-size:11.5px;color:var(--s-dim)')}>Your email</span>
            <input
              id="rc-mail"
              type="email"
              autoComplete="email"
              value={mail}
              onChange={(e) => setMail(e.target.value)}
              style={s(FIELD)}
            />
          </label>
        </div>
        <label style={s('display:block')}>
          <span style={s('font-size:11.5px;color:var(--s-dim)')}>Message</span>
          <textarea
            id="rc-msg"
            rows={5}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            style={s(FIELD + ';resize:vertical;line-height:1.55')}
          />
        </label>
        <div style={s('display:flex;align-items:center;gap:10px;flex-wrap:wrap')}>
          <span
            data-btn="1"
            tabIndex={0}
            data-focusable="1"
            role="button"
            onClick={sendMail}
            onKeyDown={(e) => e.key === 'Enter' && sendMail()}
            style={{
              ...s(
                'padding:10px 17px;border-radius:10px;color:#fff;font-weight:600;font-size:12.5px;cursor:default',
              ),
              background: 'var(--s-accent)',
            }}
          >
            Compose email
          </span>
          <span
            data-side="1"
            tabIndex={0}
            data-focusable="1"
            role="button"
            onClick={copyAddress}
            onKeyDown={(e) => e.key === 'Enter' && copyAddress()}
            style={s(
              'padding:10px 15px;border-radius:10px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:12.5px;cursor:default',
            )}
          >
            Copy address
          </span>
          <span id="rc-note" style={{ ...s('font-size:12px'), color: note.color }}>
            {note.text}
          </span>
        </div>
      </div>
      <div
        style={s(
          'margin-top:26px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--s-faint)',
        )}
      >
        Elsewhere
      </div>
      <div
        style={s(
          'display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin-top:10px',
        )}
      >
        <ProfileCards />
      </div>
    </Body>
  )
}
