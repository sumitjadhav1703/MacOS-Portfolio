import { useState, type ComponentType, type CSSProperties } from 'react'
import { EASE } from '../anim'
import { Body, Chips, MetricGrid, PageHead, StatusPill, externalAttrs } from '../../components/primitives'
import { Icon, PlatformIcon, platformSlug } from '../../lib/icons'
import type { Certificate } from '../../data/content'
import type { ProfileLink } from '../../data/profile'
import { pressable } from '../pressable'
import { useContent } from '../content'
import { s } from '../css'
import { FOLDER_TINTS } from '../packs'
import { useReducedMotion, useTheme } from '../useTheme'
import { Resume } from './Resume'
import type { FinderSection, FolderTint } from '../types'

/**
 * The URL decides the mark. The stored `slug` is only a fallback for a host the resolver does
 * not know — so editing a link in the CMS changes its icon with no further edit.
 */
const linkSlug = (link: ProfileLink) => platformSlug(link.url) ?? link.slug

export function ProfilePills() {
  const links = useContent().socialLinks
  return (
    <div style={s('display:flex;flex-wrap:wrap;gap:8px;margin-top:20px')}>
      {links.filter((l) => l.pill).map((l) => (
        <a
          key={l.url}
          href={l.url}
          {...externalAttrs(l.url)}
          style={s(
            'display:inline-flex;align-items:center;gap:8px;padding:7px 13px;border-radius:9px;background:var(--s-fill-2);border:1px solid var(--s-line);font-size:12.5px;text-decoration:none;color:var(--s-text)',
          )}
        >
          <Icon slug={linkSlug(l)} size={14} />
          {l.label}
        </a>
      ))}
    </div>
  )
}

export function ProfileCards() {
  const links = useContent().socialLinks
  return (
    <>
      {links.map((l) => (
        <a
          key={l.url}
          href={l.url}
          {...externalAttrs(l.url)}
          style={s(
            'display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:13px;background:var(--s-fill);border:1px solid var(--s-line);text-decoration:none;color:var(--s-text)',
          )}
        >
          <span style={s('color:var(--s-dim);display:flex;flex:none')}>
            <Icon slug={linkSlug(l)} size={18} />
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
  const { site, projects, certificates, skills, experience } = useContent()
  const { accent } = useTheme()
  const reduced = useReducedMotion()

  // The badge is a summary of what the CMS already says, not a claim this component owns: it
  // appears only while the published About copy is actually looking for an internship.
  const looking = site.paragraphs.some((text) => /internship/i.test(text))
  const technologies = skills.reduce((n, group) => n + group.items.length, 0)

  const rise = (i: number): CSSProperties =>
    reduced ? {} : { animation: `riseIn .5s ${EASE} ${60 + i * 70}ms backwards` }

  return (
    <Body>
      <div style={{ ...s('display:flex;align-items:center;gap:18px'), ...rise(0) }}>
        <div
          style={{
            ...s(
              'width:72px;height:72px;border-radius:17px;display:flex;align-items:center;justify-content:center;font-size:25px;font-weight:700;letter-spacing:-.01em;flex:none;color:var(--s-on-accent);position:relative;overflow:hidden',
            ),
            background: `linear-gradient(145deg,${accent},var(--s-accent-hi))`,
            boxShadow: 'var(--s-shadow-rest)',
          }}
        >
          {/* The specular sweep every macOS app icon has. It is one gradient, and it is the
              difference between a tile and an icon. */}
          <span
            style={{
              ...s('position:absolute;inset:0;background:var(--s-icon-spec);pointer-events:none'),
              animation: reduced ? 'none' : `heroSheen 5.5s ${EASE} 1.1s infinite`,
            }}
          />
          {site.initials}
        </div>
        <div style={s('min-width:0')}>
          <h2 style={s('margin:0;font-size:27px;font-weight:700;letter-spacing:-.022em')}>{site.name}</h2>
          <div style={s('color:var(--s-dim);margin-top:4px;line-height:1.45')}>{site.subtitle}</div>
          {looking ? (
            <div style={s('margin-top:9px')}>
              <StatusPill label="Open to AI/ML internships" ok />
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ ...s('margin-top:22px'), ...rise(1) }}>
        <MetricGrid
          rows={[
            ['Projects', String(projects.length)],
            ['Certificates', String(certificates.length)],
            ['Technologies', String(technologies)],
            ['Roles & hackathons', String(experience.length)],
          ]}
        />
      </div>

      <div style={{ ...s('margin-top:24px;max-width:66ch'), ...rise(2) }}>
        {site.paragraphs.map((text, i) => (
          <p key={text} style={i === 0 ? s('margin:0 0 14px;color:var(--s-text)') : s('margin:0 0 14px;color:var(--s-text)')}>
            {text}
          </p>
        ))}
      </div>

      <div style={rise(3)}>
        <ProfilePills />
      </div>
      <div style={{ ...s('margin-top:24px;color:var(--s-dim);font-size:12.5px'), ...rise(4) }}>
        Double-click a folder, open Shell, or press ⌘K to search.
      </div>
    </Body>
  )
}

/**
 * One tint per skill group, cycled from the Finder tag palette.
 *
 * This window was thirty identical grey pills, which is a list, not a portrait of what someone
 * can do. The chips now carry each technology's real brand mark — the colour was already in
 * `simple-icons` and was being thrown away in the icon route — and each group is headed in its
 * own tint so the four areas separate at a glance.
 */
const GROUP_TINTS: FolderTint[] = ['blue', 'violet', 'green', 'sand', 'rose', 'graphite']

export function Skills() {
  const groups = useContent().skills
  const reduced = useReducedMotion()
  const total = groups.reduce((n, group) => n + group.items.length, 0)

  return (
    <Body>
      <PageHead title="Skills" sub={`${total} technologies across ${groups.length} areas`} />
      {groups.map((group, g) => {
        const [tint] = FOLDER_TINTS[GROUP_TINTS[g % GROUP_TINTS.length]!]!
        return (
          <div key={group.heading} style={s('margin-top:22px')}>
            <div style={s('display:flex;align-items:center;gap:8px;margin-bottom:8px')}>
              <span
                style={{ ...s('width:7px;height:7px;border-radius:50%;flex:none'), background: tint }}
              />
              <span
                style={{
                  ...s('font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:600'),
                  color: tint,
                }}
              >
                {group.heading}
              </span>
              <span style={s('flex:1;height:1px;background:var(--s-line)')} />
              <span style={s('font-size:11px;color:var(--s-faint);font-variant-numeric:tabular-nums')}>
                {group.items.length}
              </span>
            </div>
            <Chips items={group.items} brand stagger={reduced ? 0 : 18} />
          </div>
        )
      })}
    </Body>
  )
}

export function Education() {
  const entries = useContent().education
  return (
    <Body>
      <PageHead title="Education" />
      {entries.map((entry, i) => (
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
  const entries = useContent().experience
  return (
    <Body>
      <PageHead title="Experience" sub="Independent and competition work" />
      <div
        style={s(
          'margin-top:20px;border-left:2px solid var(--s-line-2);padding-left:18px;display:flex;flex-direction:column;gap:18px',
        )}
      >
        {entries.map((entry) => (
          <div key={entry.title}>
            <div style={s('font-weight:600')}>{entry.title}</div>
            <div style={s('color:var(--s-dim);font-size:12.5px')}>{entry.detail}</div>
          </div>
        ))}
      </div>
    </Body>
  )
}

/**
 * What a certificate actually looks like, when there is something to look at.
 *
 * Three cases, in order. `imageUrl` is the CMS's own preview image. Failing that, the uploaded
 * file is itself an image for 11 of the 25 published today, so it is shown directly. The rest
 * are PDFs, which are framed — and only once the card is opened, because mounting fourteen PDF
 * viewers to render fourteen thumbnails is not a trade worth making.
 *
 * `null` means there is nothing to show: the compiled-in fallback list carries no file URLs at
 * all, deliberately, because those resolve only through the Worker.
 */
const IMAGE = /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i

type Preview = { kind: 'image'; url: string } | { kind: 'pdf'; url: string } | null

function previewOf(certificate: Certificate): Preview {
  if (certificate.imageUrl) return { kind: 'image', url: certificate.imageUrl }
  if (!certificate.fileUrl) return null
  return IMAGE.test(certificate.fileUrl)
    ? { kind: 'image', url: certificate.fileUrl }
    : { kind: 'pdf', url: certificate.fileUrl }
}

function CertificateCard({ certificate, delay }: { certificate: Certificate; delay?: number }) {
  const preview = previewOf(certificate)
  const [open, setOpen] = useState(false)
  const meta = [certificate.issuer, certificate.issueDate].filter(Boolean).join(' · ')

  return (
    <div
      style={{
        ...s('border-radius:14px;background:var(--s-fill);border:1px solid var(--s-line);overflow:hidden'),
        ...(delay === undefined ? {} : { animation: `lpTile .34s ${EASE} ${delay}ms backwards` }),
      }}
    >
      <div style={s('display:flex;gap:14px;padding:16px 18px')}>
        {preview ? (
          <div
            {...pressable(open ? `Hide ${certificate.title}` : `Show ${certificate.title}`, () =>
              setOpen((was) => !was),
            )}
            aria-expanded={open}
            style={{
              ...s(
                'width:74px;height:56px;flex:none;border-radius:9px;overflow:hidden;border:1px solid var(--s-line);background:var(--s-paper);display:flex;align-items:center;justify-content:center;position:relative',
              ),
              cursor: open ? 'zoom-out' : 'zoom-in',
            }}
          >
            {preview.kind === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element -- served from R2 through the
              // Worker, outside the loader's configured domains.
              <img
                src={preview.url}
                alt=""
                loading="lazy"
                style={s('width:100%;height:100%;object-fit:cover;display:block')}
              />
            ) : (
              <span
                style={s(
                  'font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--s-paper-desk)',
                )}
              >
                PDF
              </span>
            )}
          </div>
        ) : null}

        <div style={s('min-width:0;flex:1')}>
          <div style={s('font-weight:600;font-size:15px')}>{certificate.title}</div>
          {meta ? <div style={s('color:var(--s-dim);margin-top:3px')}>{meta}</div> : null}
          <div style={s('display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;align-items:center')}>
            {preview ? (
              <span
                data-chipbtn="1"
                {...pressable(open ? 'Hide the certificate' : 'View the certificate', () =>
                  setOpen((was) => !was),
                )}
                style={s(
                  'display:inline-flex;align-items:center;gap:6px;font-size:12.5px;padding:4px 10px;border-radius:8px;background:var(--s-fill-2);border:1px solid var(--s-line);cursor:default',
                )}
              >
                {open ? 'Hide' : 'View'}
              </span>
            ) : null}
            {certificate.fileUrl ? (
              <a
                href={certificate.fileUrl}
                {...externalAttrs(certificate.fileUrl)}
                style={s('display:inline-flex;align-items:center;gap:6px;font-size:12.5px')}
              >
                <PlatformIcon url={certificate.fileUrl} size={13} />
                Open certificate
              </a>
            ) : null}
            {certificate.credentialUrl ? (
              <a
                href={certificate.credentialUrl}
                {...externalAttrs(certificate.credentialUrl)}
                style={s('display:inline-flex;align-items:center;gap:6px;font-size:12.5px')}
              >
                <PlatformIcon url={certificate.credentialUrl} size={13} />
                Verify credential
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {open && preview ? (
        <div
          style={s(
            'height:460px;border-top:1px solid var(--s-line);background:var(--s-paper-desk);display:flex;align-items:center;justify-content:center;overflow:auto',
          )}
        >
          {preview.kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element -- see above.
            <img
              src={preview.url}
              alt={certificate.title}
              style={s('max-width:100%;max-height:100%;display:block;object-fit:contain')}
            />
          ) : (
            // The Worker sends `frame-ancestors` naming this site for /files/ only; without it
            // this pane is blank and no script can tell that it is.
            <object
              data={`${preview.url}#toolbar=0&navpanes=0&view=FitH`}
              type="application/pdf"
              aria-label={certificate.title}
              style={s('width:100%;height:100%;border:0')}
            >
              {/* A browser with no PDF viewer — and the headless one the e2e suite runs — shows
                  this instead. It is a real link, not an apology. */}
              <div
                style={s(
                  'height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--s-paper-ink);text-align:center;padding:20px',
                )}
              >
                <div style={s('font-size:12.5px')}>This browser cannot display a PDF inline.</div>
                <a
                  href={preview.url}
                  {...externalAttrs(preview.url)}
                  data-btn="1"
                  style={s(
                    'display:inline-flex;align-items:center;gap:8px;padding:8px 15px;border-radius:9px;background:var(--s-accent);color:var(--s-on-accent);font-weight:600;font-size:12.5px;text-decoration:none',
                  )}
                >
                  Open {certificate.title}
                </a>
              </div>
            </object>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function Certificates() {
  const certificates = useContent().certificates
  const reduced = useReducedMotion()

  if (!certificates.length) {
    return (
      <Body>
        <PageHead title="Certificates" />
        <div style={s('margin-top:18px;color:var(--s-dim)')}>
          No certificates have been supplied for this build. Add them and they will appear here.
        </div>
      </Body>
    )
  }

  return (
    <Body>
      <PageHead
        title="Certificates"
        sub={`${certificates.length} from ${new Set(certificates.map((c) => c.issuer)).size} issuers`}
      />
      <div style={s('display:flex;flex-direction:column;gap:12px;margin-top:20px')}>
        {certificates.map((certificate, i) => (
          <CertificateCard
            key={certificate.id}
            certificate={certificate}
            delay={reduced ? undefined : Math.min(i * 16, 240)}
          />
        ))}
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

/**
 * The six sections the Finder sidebar lists, and `apps/index.tsx` folds into `APP_CONTENT`.
 *
 * One table, two readers: the window manager opens these as windows, and Finder renders the
 * same component into its own pane. Declaring it here rather than in `apps/index.tsx` is what
 * keeps Finder from importing the module that imports Finder.
 */
export const SECTION_CONTENT: Record<FinderSection, ComponentType> = {
  skills: Skills,
  certificates: Certificates,
  education: Education,
  experience: Experience,
  resume: Resume,
  about: About,
}
