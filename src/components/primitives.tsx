import { Fragment, type ReactNode } from 'react'
import { EASE } from '../os/anim'
import { s } from '../os/css'
import { Icon, hasIcon, tagSlug } from '../lib/icons'
import type { FlowStep, Metric, ProjectSection } from '../data/projects'

/** Window body: scrolls, with the design's reading measure. */
export function Body({ children }: { children: ReactNode }) {
  return (
    <div
      data-appbody="1"
      style={s('height:100%;overflow:auto;padding:30px 34px 36px;line-height:1.62;font-size:13.5px')}
    >
      {children}
    </div>
  )
}

export function PageHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <>
      <h2 style={s('margin:0 0 6px;font-size:25px;letter-spacing:-.02em;font-weight:700')}>{title}</h2>
      <div style={s('color:var(--s-dim);font-size:13.5px;margin-bottom:4px')}>{sub ?? ''}</div>
    </>
  )
}

export function Sec({ heading, children }: { heading?: string; children: ReactNode }) {
  return (
    <div style={s('margin-top:22px')}>
      {heading ? (
        <div
          style={s(
            'font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--s-faint);margin-bottom:8px',
          )}
        >
          {heading}
        </div>
      ) : null}
      <div style={s('color:var(--s-text)')}>{children}</div>
    </div>
  )
}

/** A tag chip. Conceptual tags (no sourced logo) render as a plain label. */
export function Chip({ label, color }: { label: string; color?: string }) {
  const slug = tagSlug(label)
  return (
    <span
      style={{
        ...s(
          'display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:11.5px;background:var(--s-fill-2);border:1px solid var(--s-line)',
        ),
        color: color ?? 'var(--s-text)',
      }}
    >
      {slug && hasIcon(slug) ? <Icon slug={slug} size={13} /> : null}
      {label}
    </span>
  )
}

export function Chips({ items, color }: { items: string[]; color?: string }) {
  return (
    <div style={s('display:flex;flex-wrap:wrap;gap:7px;margin:14px 0 18px')}>
      {items.map((item) => (
        <Chip key={item} label={item} color={color} />
      ))}
    </div>
  )
}

export function StatusPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      style={{
        ...s(
          'display:inline-flex;align-items:center;gap:7px;padding:4px 11px;border-radius:999px;font-size:11.5px',
        ),
        background: ok ? 'rgba(48,209,88,.14)' : 'var(--s-fill)',
        border: `1px solid ${ok ? 'rgba(48,209,88,.35)' : 'var(--s-line)'}`,
      }}
    >
      <span
        style={{
          ...s('width:6px;height:6px;border-radius:50%'),
          background: ok ? '#30d158' : 'rgba(255,255,255,.45)',
        }}
      />
      {label}
    </span>
  )
}

export function FlowDiagram({ steps }: { steps: FlowStep[] }) {
  return (
    <div style={s('display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:4px')}>
      {steps.map(([name, caption], i) => (
        <Fragment key={name}>
          <div style={s('display:flex;align-items:center;gap:8px')}>
            <div
              style={s(
                'padding:9px 12px;border-radius:10px;background:var(--s-fill);border:1px solid var(--s-line);min-width:94px',
              )}
            >
              <div style={s('font-weight:600;font-size:12px')}>{name}</div>
              {caption ? (
                <div style={s('color:var(--s-dim);font-size:11px;margin-top:2px;line-height:1.35')}>
                  {caption}
                </div>
              ) : null}
            </div>
            {i < steps.length - 1 ? (
              <span style={s('color:var(--s-faint);font-size:14px')}>→</span>
            ) : null}
          </div>
        </Fragment>
      ))}
    </div>
  )
}

export function MetricGrid({ rows }: { rows: Metric[] }) {
  return (
    <div
      style={s(
        'display:grid;grid-template-columns:repeat(auto-fit,minmax(136px,1fr));gap:10px;margin-top:4px',
      )}
    >
      {rows.map(([label, value, hint]) => (
        <div
          key={label}
          style={s('padding:12px 14px;border-radius:12px;background:var(--s-fill);border:1px solid var(--s-line)')}
        >
          <div
            style={s(
              'font-size:19px;font-weight:700;letter-spacing:-.01em;font-variant-numeric:tabular-nums',
            )}
          >
            {value}
          </div>
          <div style={s('color:var(--s-dim);font-size:11.5px;margin-top:2px')}>{label}</div>
          {hint ? (
            <div style={s('color:var(--s-faint);font-size:11px;margin-top:4px;line-height:1.4')}>
              {hint}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

/** The SAR experiment log: MSE falling from the first run to the best run. */
export function SarChart() {
  const bars = [
    ['100%', 'rgba(255,190,120,.85)', 'rgba(255,190,120,.25)'],
    ['62%', 'rgba(255,190,120,.7)', 'rgba(255,190,120,.2)'],
    ['48%', 'rgba(255,190,120,.6)', 'rgba(255,190,120,.18)'],
    ['38%', 'rgba(120,230,190,.85)', 'rgba(120,230,190,.25)'],
  ] as const
  return (
    <div>
      <div
        style={s(
          'margin-top:20px;display:flex;align-items:flex-end;gap:14px;height:120px;padding:16px;border-radius:12px;background:var(--s-fill);border:1px solid var(--s-line)',
        )}
      >
        {bars.map(([height, from, to], i) => (
          <div
            key={i}
            style={{
              ...s('flex:1;border-radius:6px 6px 3px 3px'),
              height,
              background: `linear-gradient(180deg,${from},${to})`,
            }}
          />
        ))}
      </div>
      <div
        style={s(
          'display:flex;justify-content:space-between;font-size:11px;color:var(--s-faint);margin-top:8px',
        )}
      >
        <span>MSE ≈ 3568 (first run)</span>
        <span>1348.108 (best)</span>
      </div>
    </div>
  )
}

export function SectionBody({ section }: { section: ProjectSection }) {
  const { body } = section
  if ('text' in body) return <span>{body.text}</span>
  if ('flow' in body) return <FlowDiagram steps={body.flow} />
  if ('metrics' in body) return <MetricGrid rows={body.metrics} />
  return <SarChart />
}

export function Caveat({ children }: { children: ReactNode }) {
  return (
    <div
      style={s(
        'margin-top:22px;padding:12px 14px;border-radius:12px;background:var(--s-fill);border:1px solid var(--s-line);color:var(--s-dim);font-size:12.5px',
      )}
    >
      {children}
    </div>
  )
}

export function LinkButton({ label, url }: { label: string; url: string }) {
  const external = !url.startsWith('mailto:')
  return (
    <a
      href={url}
      data-btn="1"
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      style={{
        ...s(
          'display:inline-block;padding:9px 16px;border-radius:10px;color:#fff;font-weight:600;font-size:12.5px;text-decoration:none',
        ),
        background: 'var(--s-accent)',
        transition: `filter .28s ${EASE}`,
      }}
    >
      {label}
    </a>
  )
}
