import type { ReactElement } from 'react'

/**
 * The 1200×630 preview card, shaped like one of the desktop's windows: chrome bar with
 * traffic lights, dark glass body, stack chips.
 *
 * Satori (behind next/og) has no CSS variables and no default `display`, so the palette is
 * inlined from src/styles/os.css and every container sets `display: flex` explicitly.
 */
const INK = {
  win: '#16181c',
  chrome: '#1b1e23',
  border: 'rgba(255,255,255,.11)',
  line: 'rgba(255,255,255,.12)',
  fill2: 'rgba(255,255,255,.09)',
  text: '#f2f3f5',
  dim: 'rgba(242,243,245,.66)',
  faint: 'rgba(242,243,245,.44)',
  accent: '#3a6df0',
  ok: '#30d158',
  desk: 'linear-gradient(178deg,#1c222b 0%,#141a22 48%,#0c1016 100%)',
}

export type CardProps = {
  title: string
  tagline: string
  stack?: string[]
  status?: { label: string; ok: boolean }
  /** Window title bar caption — the app name a visitor would see on the desktop. */
  windowTitle?: string
}

export function OgCard({
  title,
  tagline,
  stack = [],
  status,
  windowTitle = 'Portfolio OS',
}: CardProps): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        padding: 56,
        backgroundImage: INK.desk,
        backgroundColor: '#0e1013',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          borderRadius: 22,
          border: `1px solid ${INK.border}`,
          backgroundColor: INK.win,
          overflow: 'hidden',
          boxShadow: '0 24px 56px rgba(0,0,0,.5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 60,
            paddingLeft: 22,
            paddingRight: 22,
            backgroundColor: INK.chrome,
            borderBottom: `1px solid ${INK.line}`,
          }}
        >
          <div style={{ display: 'flex', gap: 10 }}>
            {['#d0655b', '#cfa04a', '#5c9c63'].map((color) => (
              <div
                key={color}
                style={{ display: 'flex', width: 15, height: 15, borderRadius: 15, backgroundColor: color }}
              />
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              flex: 1,
              justifyContent: 'center',
              marginLeft: -70,
              color: INK.dim,
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            {windowTitle}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            paddingLeft: 56,
            paddingRight: 56,
            paddingTop: 48,
            paddingBottom: 44,
          }}
        >
          {status ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                alignSelf: 'flex-start',
                gap: 12,
                paddingLeft: 18,
                paddingRight: 18,
                paddingTop: 8,
                paddingBottom: 8,
                borderRadius: 999,
                fontSize: 20,
                color: INK.text,
                backgroundColor: status.ok ? 'rgba(48,209,88,.14)' : 'rgba(255,255,255,.05)',
                border: `1px solid ${status.ok ? 'rgba(48,209,88,.35)' : INK.line}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: 10,
                  height: 10,
                  borderRadius: 10,
                  backgroundColor: status.ok ? INK.ok : INK.faint,
                }}
              />
              {status.label}
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              marginTop: status ? 30 : 0,
              fontSize: title.length > 34 ? 62 : 76,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              lineHeight: 1.08,
              color: INK.text,
            }}
          >
            {title}
          </div>

          <div style={{ display: 'flex', marginTop: 18, fontSize: 30, color: INK.dim, lineHeight: 1.35 }}>
            {tagline}
          </div>

          <div style={{ display: 'flex', flex: 1 }} />

          {stack.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {stack.slice(0, 6).map((tag) => (
                <div
                  key={tag}
                  style={{
                    display: 'flex',
                    paddingLeft: 18,
                    paddingRight: 18,
                    paddingTop: 9,
                    paddingBottom: 9,
                    borderRadius: 999,
                    fontSize: 22,
                    color: INK.text,
                    backgroundColor: INK.fill2,
                    border: `1px solid ${INK.line}`,
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginTop: 30,
              fontSize: 22,
              color: INK.faint,
            }}
          >
            <div
              style={{
                display: 'flex',
                width: 34,
                height: 34,
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: INK.fill2,
                border: `1px solid ${INK.line}`,
                color: INK.text,
                fontSize: 17,
                fontWeight: 700,
              }}
            >
              SJ
            </div>
            Sumit Jadhav · AI &amp; Data Science
            <div style={{ display: 'flex', flex: 1 }} />
            <div style={{ display: 'flex', color: INK.accent }}>sumitjadhav.dev</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const OG_SIZE = { width: 1200, height: 630 }
