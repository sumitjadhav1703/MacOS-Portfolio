import { Body, Chips, PageHead, Sec } from '../../components/primitives'
import { Icon } from '../../lib/icons'
import { PROFILE_LINKS } from '../../data/profile'
import { EDUCATION, EXPERIENCE, PROFILE, SKILL_GROUPS } from '../../data/sections'
import { s } from '../css'

const ext = (url: string) =>
  url.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noopener noreferrer' }

export function ProfilePills() {
  return (
    <div style={s('display:flex;flex-wrap:wrap;gap:8px;margin-top:20px')}>
      {PROFILE_LINKS.filter((l) => l.pill).map((l) => (
        <a
          key={l.url}
          href={l.url}
          {...ext(l.url)}
          style={s(
            'display:inline-flex;align-items:center;gap:8px;padding:7px 13px;border-radius:9px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:12.5px;text-decoration:none;color:var(--s-text)',
          )}
        >
          <Icon slug={l.slug} size={14} />
          {l.label}
        </a>
      ))}
    </div>
  )
}

export function ProfileCards() {
  return (
    <>
      {PROFILE_LINKS.map((l) => (
        <a
          key={l.url}
          href={l.url}
          {...ext(l.url)}
          style={s(
            'display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:13px;background:var(--s-fill);border:1px solid var(--s-line);text-decoration:none;color:var(--s-text)',
          )}
        >
          <span style={s('color:var(--s-dim);display:flex;flex:none')}>
            <Icon slug={l.slug} size={18} />
          </span>
          <span style={s('min-width:0')}>
            <span style={s('display:block;font-weight:600;font-size:13px')}>{l.label}</span>
            <span
              style={s(
                'display:block;color:var(--s-dim);font-size:12px;margin-top:2px;overflow:hidden;text-overflow:ellipsis',
              )}
            >
              {l.handle}
            </span>
          </span>
        </a>
      ))}
    </>
  )
}

export function About() {
  return (
    <Body>
      <div style={s('display:flex;align-items:center;gap:16px;margin-bottom:22px')}>
        <div
          style={s(
            'width:58px;height:58px;border-radius:12px;background:var(--s-fill-2);box-shadow:inset 0 0 0 1px var(--s-line);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;letter-spacing:-.01em;flex:none',
          )}
        >
          {PROFILE.initials}
        </div>
        <div>
          <div style={s('font-size:22px;font-weight:700;letter-spacing:-.02em')}>{PROFILE.name}</div>
          <div style={s('color:var(--s-dim)')}>{PROFILE.subtitle}</div>
        </div>
      </div>
      {PROFILE.paragraphs.map((text, i) => (
        <p key={text} style={i === 0 ? s('margin:0;color:var(--s-text)') : s('color:var(--s-text)')}>
          {text}
        </p>
      ))}
      <ProfilePills />
      <div style={s('margin-top:24px;color:var(--s-dim);font-size:12.5px')}>
        Double-click a folder, open Shell, or press ⌘K to search.
      </div>
    </Body>
  )
}

export function Skills() {
  return (
    <Body>
      <PageHead title="Skills" />
      {SKILL_GROUPS.map((group) => (
        <Sec heading={group.heading} key={group.heading}>
          <Chips items={group.items} />
        </Sec>
      ))}
    </Body>
  )
}

export function Education() {
  return (
    <Body>
      <PageHead title="Education" />
      {EDUCATION.map((entry, i) => (
        <div
          key={entry.title}
          style={{
            ...s('padding:16px 18px;border-radius:14px;background:var(--s-fill);border:1px solid var(--s-line)'),
            marginTop: i === 0 ? 20 : 12,
          }}
        >
          <div style={s('font-weight:600;font-size:15px')}>{entry.title}</div>
          <div style={s('color:var(--s-dim);margin-top:3px')}>{entry.detail}</div>
          {entry.hint ? (
            <div style={s('color:var(--s-faint);font-size:12.5px;margin-top:6px')}>{entry.hint}</div>
          ) : null}
        </div>
      ))}
    </Body>
  )
}

export function Experience() {
  return (
    <Body>
      <PageHead title="Experience" sub="Independent and competition work" />
      <div
        style={s(
          'margin-top:20px;border-left:2px solid var(--s-line-2);padding-left:18px;display:flex;flex-direction:column;gap:18px',
        )}
      >
        {EXPERIENCE.map((entry) => (
          <div key={entry.title}>
            <div style={s('font-weight:600')}>{entry.title}</div>
            <div style={s('color:var(--s-dim);font-size:12.5px')}>{entry.detail}</div>
          </div>
        ))}
      </div>
    </Body>
  )
}

export function Certificates() {
  return (
    <Body>
      <PageHead title="Certificates" />
      <div style={s('margin-top:18px;color:var(--s-dim)')}>
        No certificates have been supplied for this build. Add them and they will appear here.
      </div>
    </Body>
  )
}

export function Trash() {
  return (
    <Body>
      <div
        style={s(
          'height:100%;display:flex;align-items:center;justify-content:center;color:var(--s-faint)',
        )}
      >
        Trash is empty.
      </div>
    </Body>
  )
}
