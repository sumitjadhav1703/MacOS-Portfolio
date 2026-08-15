import { useState, type ReactNode } from 'react'
import { useContent } from '../content'
import { s } from '../css'
import { ProjectWindow } from '../apps/ProjectWindow'
import { About, Certificates, Education, Experience, Skills } from '../apps/simple'
import { Contact } from '../apps/Contact'

const TILES: [string, string][] = [
  ['projects', 'Projects'],
  ['skills', 'Skills'],
  ['experience', 'Experience'],
  ['resume', 'Resume'],
  ['education', 'Education'],
  ['contact', 'Contact'],
]

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={`m-${id}`} style={s('padding-top:22px')}>
      <div
        style={s(
          'font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--s-faint);margin-bottom:10px',
        )}
      >
        {title}
      </div>
      {children}
    </section>
  )
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div style={s('padding:16px 18px;border-radius:16px;background:var(--s-win);border:1px solid var(--s-line)')}>
      {children}
    </div>
  )
}

/**
 * Below 768px the desktop metaphor stops earning its keep, so the same content
 * renders as a stacked, scrollable page — exactly as the original did.
 */
export function MobileShell() {
  const { site, projects } = useContent()
  const [open, setOpen] = useState<string | null>(null)

  const go = (id: string) => {
    document.getElementById(`m-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      id="mobile"
      style={s(
        'position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;z-index:400;background:var(--s-desk);color:var(--s-text);user-select:text;-webkit-overflow-scrolling:touch',
      )}
    >
      <div style={s('padding:26px 20px 20px;border-bottom:1px solid var(--s-line);background:var(--s-win)')}>
        <div style={s('display:flex;align-items:center;gap:14px')}>
          <div
            style={s(
              'width:52px;height:52px;flex:none;border-radius:13px;background:var(--s-fill-2);box-shadow:inset 0 0 0 1px var(--s-line);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600;letter-spacing:.04em',
            )}
          >
            SJ
          </div>
          <div style={s('min-width:0')}>
            <div style={s('font-size:20px;font-weight:700;letter-spacing:-.02em')}>Sumit Jadhav</div>
            <div style={s('color:var(--s-dim);font-size:13px;margin-top:2px')}>
              AI &amp; Data Science · B.Tech, JNEC
            </div>
          </div>
        </div>
        <div style={s('color:var(--s-dim);font-size:13.5px;line-height:1.6;margin-top:14px')}>
          Generative AI, RAG systems and applied deep learning. Looking for an AI/ML engineering
          internship.
        </div>
        <div style={s('display:flex;gap:8px;margin-top:16px')}>
          <a
            href={site.resumeUrl}
            download="Sumit_Jadhav_Resume.pdf"
            style={s(
              'flex:1;min-height:44px;display:flex;align-items:center;justify-content:center;border-radius:11px;background:var(--s-accent);color:#fff;font-weight:600;font-size:14px;text-decoration:none',
            )}
          >
            Resume
          </a>
          <a
            href={`mailto:${site.email}`}
            style={s(
              'flex:1;min-height:44px;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:11px;background:var(--s-fill-2);border:1px solid var(--s-line);color:var(--s-text);font-weight:600;font-size:14px;text-decoration:none',
            )}
          >
            Email
          </a>
        </div>
      </div>

      <div style={s('display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:18px 20px 6px')}>
        {TILES.map(([id, label]) => (
          <div
            key={id}
            data-mtile="1"
            role="button"
            onClick={() => go(id)}
            style={s(
              'min-height:74px;border-radius:14px;background:var(--s-fill);border:1px solid var(--s-line);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:600',
            )}
          >
            {label}
          </div>
        ))}
      </div>

      <div id="m-sections" style={s('padding:8px 20px 46px')}>
        <Section id="projects" title="Projects">
          {projects.map((project) => (
            <div
              key={project.id}
              style={s(
                'border-radius:16px;background:var(--s-win);border:1px solid var(--s-line);overflow:hidden;margin-bottom:9px',
              )}
            >
              <div
                data-mrow="1"
                role="button"
                onClick={() => setOpen((cur) => (cur === project.id ? null : project.id))}
                style={s(
                  'min-height:56px;display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:default',
                )}
              >
                <span
                  style={s(
                    'width:26px;height:20px;flex:none;border-radius:4px 7px 4px 4px;background:linear-gradient(180deg,#4ea3f5,#1c62c9)',
                  )}
                />
                <span style={s('flex:1;font-weight:600;font-size:14px')}>{project.title}</span>
                <span
                  style={{
                    ...s('color:var(--s-faint);font-size:15px;transition:transform .25s ease'),
                    transform: open === project.id ? 'rotate(90deg)' : 'none',
                  }}
                >
                  ›
                </span>
              </div>
              {open === project.id ? (
                <div style={s('padding:0 16px 14px;border-top:1px solid var(--s-line)')}>
                  <ProjectWindow project={project} />
                </div>
              ) : null}
            </div>
          ))}
        </Section>

        <Section id="resume" title="Resume">
          <Card>
            <div style={s('font-weight:600;font-size:14px')}>Sumit_Jadhav_Resume.pdf</div>
            <div style={s('color:var(--s-dim);font-size:13px;margin-top:4px;line-height:1.55')}>
              Download the full document, or read the sections below.
            </div>
            <a
              href={site.resumeUrl}
              download="Sumit_Jadhav_Resume.pdf"
              style={s(
                'display:inline-flex;margin-top:12px;min-height:44px;align-items:center;padding:0 18px;border-radius:11px;background:var(--s-accent);color:#fff;font-weight:600;font-size:14px;text-decoration:none',
              )}
            >
              Download PDF
            </a>
          </Card>
        </Section>

        <Section id="skills" title="Skills">
          <Card>
            <Skills />
          </Card>
        </Section>
        <Section id="experience" title="Experience">
          <Card>
            <Experience />
          </Card>
        </Section>
        <Section id="education" title="Education">
          <Card>
            <Education />
          </Card>
        </Section>
        <Section id="certificates" title="Certificates">
          <Card>
            <Certificates />
          </Card>
        </Section>
        <Section id="contact" title="Contact">
          <Card>
            <Contact />
          </Card>
        </Section>
        <Section id="about" title="About">
          <Card>
            <About />
          </Card>
        </Section>

        <div style={s('padding:28px 2px 6px;color:var(--s-faint);font-size:12px;line-height:1.6')}>
          On a larger screen this portfolio opens as a desktop environment with windows, a dock and
          search.
        </div>
      </div>
    </div>
  )
}
