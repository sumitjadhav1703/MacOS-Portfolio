import {
  Body,
  Caveat,
  Chips,
  LinkButton,
  PageHead,
  Sec,
  SectionBody,
  StatusPill,
} from '../../components/primitives'
import { s } from '../css'
import type { Project } from '../../data/projects'

export function ProjectWindow({ project }: { project: Project }) {
  return (
    <Body>
      <PageHead title={project.title} sub={project.tagline} />
      <div style={s('display:flex;gap:8px;flex-wrap:wrap;margin-top:14px')}>
        <StatusPill label={project.status.label} ok={project.status.ok} />
      </div>
      <Chips items={project.stack} />

      {project.sections.map((section, i) => (
        <Sec heading={section.heading} key={section.heading ?? i}>
          <SectionBody section={section} />
        </Sec>
      ))}

      {project.links.length ? (
        <div style={s('margin-top:24px;display:flex;gap:8px;flex-wrap:wrap')}>
          {project.links.map((link) => (
            <LinkButton key={link.url} label={link.label} url={link.url} />
          ))}
        </div>
      ) : null}

      {project.note ? (
        <div style={s('margin-top:14px;color:var(--s-dim);font-size:12.5px')}>{project.note}</div>
      ) : null}

      {project.caveat ? <Caveat>{project.caveat}</Caveat> : null}
    </Body>
  )
}
