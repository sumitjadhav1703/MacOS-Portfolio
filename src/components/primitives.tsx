import type { ReactNode } from 'react'
import { EASE } from '../os/anim'
import { s } from '../os/css'
import { Icon, PlatformIcon, hasIcon, hostLabel, tagSlug } from '../lib/icons'
import type {
  Decision,
  FlowStep,
  Incident,
  Limit,
  Metric,
  ProjectLink,
  ProjectSection,
  SectionRole,
  TimelineStep,
} from '../data/projects'

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
export function Chip({
  label,
  color,
  brand,
  delay,
}: {
  label: string
  color?: string
  /** Draw the mark in the brand's own colour — see `Icon`. */
  brand?: boolean
  delay?: number
}) {
  const slug = tagSlug(label)
  return (
    <span
      data-chip="1"
      style={{
        ...s(
          'display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:11.5px;background:var(--s-fill-2);border:1px solid var(--s-line)',
        ),
        color: color ?? 'var(--s-text)',
        ...(delay === undefined ? {} : { animation: `lpTile .34s ${EASE} ${delay}ms backwards` }),
      }}
    >
      {slug && hasIcon(slug) ? <Icon slug={slug} size={13} brand={brand} /> : null}
      {label}
    </span>
  )
}

export function Chips({
  items,
  color,
  brand,
  stagger,
}: {
  items: string[]
  color?: string
  brand?: boolean
  /** Milliseconds between chips, or 0 for none. Capped by the caller. */
  stagger?: number
}) {
  return (
    <div style={s('display:flex;flex-wrap:wrap;gap:7px;margin:14px 0 18px')}>
      {items.map((item, i) => (
        <Chip
          key={item}
          label={item}
          color={color}
          brand={brand}
          delay={stagger ? Math.min(i * stagger, 240) : undefined}
        />
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
          // Was a literal white at 45%, which is invisible on the light theme's window.
          background: ok ? 'var(--s-ok)' : 'var(--s-faint)',
        }}
      />
      {label}
    </span>
  )
}

/**
 * A stepper: numbered, colour-coded steps of equal width joined by a rule. The grid wraps to as
 * many columns as fit, so a six-step pipeline reads as one row in a wide window and a column on
 * a phone, never as ragged pills with an arrow dangling off the end of a line.
 */
export function FlowDiagram({ steps }: { steps: FlowStep[] }) {
  return (
    <ol
      style={s(
        'list-style:none;margin:6px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,168px),1fr));gap:14px 10px',
      )}
    >
      {steps.map(([name, caption], i) => {
        const colour = `var(--s-flow-${(i % 4) + 1})`
        return (
          <li key={`${name}-${i}`} style={s('display:flex;flex-direction:column;gap:8px;min-width:0')}>
            <div aria-hidden="true" style={s('display:flex;align-items:center;gap:8px')}>
              <span
                style={{
                  ...s(
                    'flex:none;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;color:#fff',
                  ),
                  background: colour,
                }}
              >
                {i + 1}
              </span>
              {i < steps.length - 1 ? (
                <span style={s('flex:1;height:2px;border-radius:1px;background:var(--s-line-2)')} />
              ) : null}
            </div>
            <div
              style={{
                ...s('flex:1;padding:11px 13px;border-radius:12px;border:1px solid var(--s-line);border-top-width:3px'),
                borderTopColor: colour,
                background: `color-mix(in srgb, ${colour} 7%, var(--s-fill))`,
              }}
            >
              <div style={s('font-weight:650;font-size:12.5px')}>{name}</div>
              {caption ? (
                <div style={s('color:var(--s-dim);font-size:11.5px;margin-top:3px;line-height:1.4')}>{caption}</div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function MetricGrid({ rows }: { rows: Metric[] }) {
  return (
    <div
      style={s(
        'display:grid;grid-template-columns:repeat(auto-fit,minmax(136px,1fr));gap:10px;margin-top:4px',
      )}
    >
      {rows.map(([label, value, hint, source]) => (
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
          {source ? (
            <a
              href={source}
              {...externalAttrs(source)}
              aria-label={`Proof for ${label}`}
              style={s('display:inline-block;font-size:11px;margin-top:6px')}
            >
              Proof ↗
            </a>
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

// ── Engineering evidence (docs/engineering-evidence.md) ─────────────────────────────────────

const CARD = 'padding:12px 14px;border-radius:12px;background:var(--s-fill);border:1px solid var(--s-line)'
const LABEL = 'font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--s-faint)'

function Labelled({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div style={s('margin-top:8px')}>
      <div style={s(LABEL)}>{name}</div>
      <div style={s('font-size:12.5px;line-height:1.5;margin-top:2px')}>{children}</div>
    </div>
  )
}

function EvidenceLinks({ links }: { links?: ProjectLink[] }) {
  if (!links?.length) return null
  return (
    <Labelled name="Evidence">
      <span style={s('display:flex;flex-wrap:wrap;gap:4px 12px')}>
        {links.map((link) => (
          <a key={link.url} href={link.url} {...externalAttrs(link.url)}>
            {link.label} ↗
          </a>
        ))}
      </span>
    </Labelled>
  )
}

export function DecisionCard({ decision: d }: { decision: Decision }) {
  return (
    <div style={s(CARD)}>
      <div style={s('font-weight:600;font-size:13px')}>{d.question}</div>
      <div style={s('display:flex;flex-wrap:wrap;gap:6px;margin-top:8px')} aria-label="Options considered">
        {d.options.map((option) => {
          const chosen = option === d.chosen
          return (
            <span
              key={option}
              style={{
                ...s('padding:3px 9px;border-radius:999px;font-size:11.5px;border:1px solid var(--s-line)'),
                background: chosen ? 'var(--s-accent)' : 'var(--s-fill-2)',
                color: chosen ? 'var(--s-on-accent)' : 'var(--s-dim)',
              }}
            >
              {chosen ? '✓ ' : ''}
              {option}
            </span>
          )
        })}
      </div>
      <Labelled name="Why">{d.why}</Labelled>
      {d.better || d.worse ? (
        <div style={s('display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0 14px')}>
          {d.better ? <Labelled name="Got better">{d.better}</Labelled> : null}
          {d.worse ? <Labelled name="Got worse">{d.worse}</Labelled> : null}
        </div>
      ) : null}
      {d.trigger ? <Labelled name="Revisit when">{d.trigger}</Labelled> : null}
      <EvidenceLinks links={d.evidence} />
    </div>
  )
}

/** Collapsed to a log line — title and root cause — so a list of them never becomes a wall. */
export function IncidentCard({ incident: i }: { incident: Incident }) {
  return (
    <details style={s(CARD)}>
      <summary style={s('cursor:pointer;list-style-position:outside')}>
        <span style={s('font-weight:600;font-size:13px')}>{i.title}</span>
        <div style={s('color:var(--s-dim);font-size:12px;margin-top:2px')}>
          <span style={s('color:var(--s-warn);font-family:ui-monospace,monospace')}>root cause </span>
          {i.cause}
        </div>
      </summary>
      <Labelled name="Expected">{i.expected}</Labelled>
      <Labelled name="Observed">{i.observed}</Labelled>
      <Labelled name="Fix">{i.fix}</Labelled>
      {i.verified ? <Labelled name="Verified by">{i.verified}</Labelled> : null}
      {i.learned ? <Labelled name="Learned">{i.learned}</Labelled> : null}
      <EvidenceLinks links={i.evidence} />
    </details>
  )
}

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol style={s('list-style:none;margin:4px 0 0;padding:0 0 0 14px;border-left:2px solid var(--s-line)')}>
      {steps.map(([stage, text, url], i) => (
        <li key={`${stage}-${i}`} style={s('position:relative;margin-bottom:12px')}>
          <span
            aria-hidden="true"
            style={s(
              'position:absolute;left:-20px;top:5px;width:10px;height:10px;border-radius:50%;background:var(--s-accent)',
            )}
          />
          <div style={s('font-weight:600;font-size:12.5px')}>{stage}</div>
          <div style={s('color:var(--s-dim);font-size:12.5px;line-height:1.5')}>
            {text}
            {url ? (
              <>
                {' '}
                <a href={url} {...externalAttrs(url)} aria-label={`Evidence for ${stage}`}>
                  Evidence ↗
                </a>
              </>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function LimitsList({ rows }: { rows: Limit[] }) {
  return (
    <div style={s('display:grid;gap:8px;margin-top:4px')}>
      {rows.map(([limit, why, next]) => (
        <div
          key={limit}
          style={s(`${CARD};display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0 14px`)}
        >
          <Labelled name="Limitation">{limit}</Labelled>
          <Labelled name="Why it matters">{why}</Labelled>
          {next ? <Labelled name="Next">{next}</Labelled> : null}
        </div>
      ))}
    </div>
  )
}

const ROLE_LABEL: Record<SectionRole, string> = {
  fact: 'Fact · supported by data',
  interpretation: 'Interpretation',
  limitation: 'Limitation · not proven',
}

function SectionContent({ body }: { body: ProjectSection['body'] }) {
  if ('text' in body) return <span>{body.text}</span>
  if ('flow' in body) return <FlowDiagram steps={body.flow} />
  if ('metrics' in body) return <MetricGrid rows={body.metrics} />
  if ('decision' in body) return <DecisionCard decision={body.decision} />
  if ('incident' in body) return <IncidentCard incident={body.incident} />
  if ('timeline' in body) return <Timeline steps={body.timeline} />
  if ('limits' in body) return <LimitsList rows={body.limits} />
  if ('chart' in body) return <SarChart />
  // A kind this build does not know — a newer CMS than this client. Render nothing, not a guess.
  return null
}

export function SectionBody({ section }: { section: ProjectSection }) {
  const role = section.role && ROLE_LABEL[section.role]
  return (
    <>
      {role ? <div style={s(`${LABEL};margin-bottom:6px;color:var(--s-dim)`)}>{role}</div> : null}
      <SectionContent body={section.body} />
    </>
  )
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

/**
 * Attributes that send a link to a new tab — every external link in the app goes through this,
 * so the `mailto:` exception is stated once.
 */
export function externalAttrs(url: string) {
  return url.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noopener noreferrer' }
}

export function LinkButton({ label, url }: { label: string; url: string }) {
  const host = hostLabel(url)
  return (
    <a
      href={url}
      data-btn="1"
      {...externalAttrs(url)}
      style={{
        ...s(
          'display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:10px;color:#fff;font-weight:600;font-size:12.5px;text-decoration:none',
        ),
        background: 'var(--s-accent)',
        transition: `filter .28s ${EASE}`,
      }}
    >
      <PlatformIcon url={url} size={14} />
      {label}
      {host ? <span style={s('font-weight:500;opacity:.72')}>{host}</span> : null}
    </a>
  )
}
