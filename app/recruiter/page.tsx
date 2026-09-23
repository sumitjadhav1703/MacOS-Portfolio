import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Chips, IncidentCard, LinkButton, MetricGrid } from '../../src/components/primitives'
import type { Project } from '../../src/data/content'
import { getContent } from '../../src/data/server'
import { s } from '../../src/os/css'

// Recruiter Mode: the portfolio in thirty seconds, without booting the desktop.
//
// Server-rendered from the same `getContent()` bundle every other view reads, so there is no
// second list of facts to drift — a project published in /admin appears here within the same
// revalidation window, and one with no documented evidence simply shows less. Nothing on this
// page is written by hand except the headings.

export const metadata: Metadata = {
  title: 'Recruiter view',
  description: 'Who Sumit is, what he has built, and where to verify it — on one page.',
  alternates: { canonical: '/recruiter' },
}

const EVIDENCE_KINDS = ['decision', 'incident', 'timeline', 'limits'] as const

/** How much documented engineering evidence a project carries — decisions, incidents, timeline, limits, proof links. */
function evidenceCount(project: Project): number {
  return project.sections.reduce((n, section) => {
    const body = section.body as Record<string, unknown>
    if (EVIDENCE_KINDS.some((k) => k in body)) return n + 1
    if (Array.isArray(body.metrics)) return n + (body.metrics as unknown[][]).filter((m) => m[3]).length
    return n
  }, 0)
}

const repoOf = (project: Project) => project.links.find((l) => /github\.com/i.test(l.url))
const demoOf = (project: Project) => project.links.find((l) => !/github\.com/i.test(l.url))

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 style={s('font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--s-faint);margin:34px 0 12px;font-weight:600')}>
      {children}
    </h2>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const repo = repoOf(project)
  const demo = demoOf(project)
  const metrics = project.sections.flatMap((section) => ('metrics' in section.body ? section.body.metrics : [])).slice(0, 3)
  const evidence = evidenceCount(project)
  return (
    <li style={s('padding:16px 18px;border-radius:14px;background:var(--s-win);border:1px solid var(--s-line)')}>
      <div style={s('display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px')}>
        <h3 style={s('margin:0;font-size:16px')}>
          <a href={`/projects/${project.slug}`}>{project.title}</a>
        </h3>
        <span style={s('font-size:12px;color:var(--s-dim)')}>{project.status.label}</span>
        {evidence ? (
          <span style={s('font-size:11.5px;color:var(--s-ok)')}>
            {evidence} documented {evidence === 1 ? 'decision or finding' : 'decisions and findings'}
          </span>
        ) : null}
      </div>
      <p style={s('margin:6px 0 0;color:var(--s-dim);font-size:13.5px;line-height:1.55')}>{project.tagline}</p>
      <Chips items={project.stack.slice(0, 8)} />
      {metrics.length ? <MetricGrid rows={metrics} /> : null}
      <div style={s('display:flex;flex-wrap:wrap;gap:8px;margin-top:12px')}>
        {repo ? <LinkButton label="Code" url={repo.url} /> : null}
        {demo ? <LinkButton label={demo.label.trim() || 'Demo'} url={demo.url} /> : null}
      </div>
    </li>
  )
}

export default async function RecruiterPage() {
  const { site, projects, skills, experience, education, socialLinks, certificates } = await getContent()
  const ranked = [...projects].sort(
    (a, b) => Number(b.featured) - Number(a.featured) || evidenceCount(b) - evidenceCount(a),
  )
  const incidents = projects.flatMap((project) =>
    project.sections.flatMap((section) => ('incident' in section.body ? [{ project, incident: section.body.incident }] : [])),
  )
  const api = process.env.NEXT_PUBLIC_API_URL

  return (
    <div data-root="" data-recruiter="" style={s(
        "height:100%;overflow:auto;background:var(--s-desk);color:var(--s-text);font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,system-ui,'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased",
      )}>
      <main style={s('max-width:880px;margin:0 auto;padding:40px 16px 64px;line-height:1.6;font-size:14px')}>
        <a href="/" style={s('font-size:12.5px')}>
          ← Open the interactive desktop
        </a>
        <h1 style={s('margin:18px 0 4px;font-size:30px;letter-spacing:-.02em')}>{site.name}</h1>
        <p style={s('margin:0;color:var(--s-dim);font-size:15px')}>{site.subtitle}</p>
        {site.paragraphs[0] ? <p style={s('margin:14px 0 0;max-width:68ch')}>{site.paragraphs[0]}</p> : null}

        <nav aria-label="Verify and contact" style={s('display:flex;flex-wrap:wrap;gap:8px;margin-top:20px')}>
          {site.resumeUrl ? <LinkButton label="Resume" url={site.resumeUrl} /> : null}
          {socialLinks.map((link) => (
            <LinkButton key={link.url} label={link.label} url={link.url} />
          ))}
          {site.email && !socialLinks.some((l) => l.url.startsWith('mailto:')) ? (
            <LinkButton label="Email" url={`mailto:${site.email}`} />
          ) : null}
        </nav>

        <H2>Selected work</H2>
        <p style={s('margin:-4px 0 12px;color:var(--s-dim);font-size:12.5px')}>
          Every project links to its code. Metrics link to their proof where one has been attached.
        </p>
        <ul style={s('list-style:none;margin:0;padding:0;display:grid;grid-template-columns:minmax(0,1fr);gap:12px')}>
          {ranked.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </ul>

        {incidents.length ? (
          <>
            <H2>What broke, and how it was found</H2>
            <div style={s('display:grid;grid-template-columns:minmax(0,1fr);gap:8px')}>
              {incidents.map(({ project, incident }) => (
                <div key={`${project.slug}-${incident.title}`}>
                  <div style={s('font-size:11.5px;color:var(--s-dim);margin-bottom:4px')}>
                    <a href={`/projects/${project.slug}`}>{project.title}</a>
                  </div>
                  <IncidentCard incident={incident} />
                </div>
              ))}
            </div>
          </>
        ) : null}

        {skills.length ? (
          <>
            <H2>Technical stack</H2>
            <dl style={s('margin:0;display:grid;gap:10px')}>
              {skills.map((group) => (
                <div key={group.heading}>
                  <dt style={s('font-weight:600;font-size:13px')}>{group.heading}</dt>
                  <dd style={s('margin:0')}>
                    <Chips items={group.items} />
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}

        {experience.length || education.length ? (
          <>
            <H2>Experience and education</H2>
            <ul style={s('margin:0;padding-left:18px;display:grid;gap:8px')}>
              {[...experience, ...education].map((entry) => (
                <li key={entry.title}>
                  <strong>{entry.title}</strong>
                  {entry.hint ? <span style={s('color:var(--s-dim)')}> · {entry.hint}</span> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {certificates.length ? (
          <p style={s('margin-top:18px;color:var(--s-dim);font-size:13px')}>
            {certificates.length} certificates, each with its issuer and credential link, are in the{' '}
            <a href="/">desktop&rsquo;s Certificates window</a>.
          </p>
        ) : null}

        {api ? (
          <>
            <H2>Agent context</H2>
            <div style={s('padding:14px 16px;border-radius:12px;background:var(--s-fill);border:1px solid var(--s-line);font-size:13px')}>
              <p style={s('margin:0')}>
                The same published content is available to MCP-compatible AI agents through a read-only server,
                behind OAuth. <strong>Read: yes · Write: no</strong> — it has no tool that can change anything.
              </p>
              <pre style={s('margin:10px 0 0;padding:10px;border-radius:8px;background:var(--s-input);overflow-x:auto;font-size:12px')}>
                <code>{`claude mcp add --transport http sumit-context ${api}/mcp`}</code>
              </pre>
            </div>
          </>
        ) : null}
      </main>
    </div>
  )
}
