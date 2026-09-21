import { useState } from 'react'
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
import { pressable } from '../pressable'
import type { Project as BaseProject } from '../../data/projects'
import type { Project } from '../../data/content'

export function ProjectWindow({ project }: { project: BaseProject | Project }) {
  const coverUrl = 'coverUrl' in project ? project.coverUrl : undefined
  // A cover cropped to a 220px band is a banner, not a screenshot: the thing a recruiter
  // actually wants to look at — the app's own interface — is the part `object-fit:cover`
  // throws away. Click swaps the crop for the whole frame at its natural aspect ratio.
  const [expanded, setExpanded] = useState(false)

  return (
    <Body>
      {coverUrl ? (
        <div
          {...pressable(expanded ? 'Collapse the cover image' : 'Show the whole cover image', () =>
            setExpanded((open) => !open),
          )}
          aria-expanded={expanded}
          style={{
            ...s(
              'position:relative;display:block;margin-bottom:18px;border-radius:14px;overflow:hidden;border:1px solid var(--s-line);background:var(--s-fill)',
            ),
            cursor: expanded ? 'zoom-out' : 'zoom-in',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- the CMS serves this from R2,
              outside the loader's configured domains. */}
          <img
            src={coverUrl}
            alt=""
            style={{
              ...s('display:block;width:100%;transition:height .2s ease'),
              // `auto` lets the image state its own aspect ratio, so nothing is cropped.
              height: expanded ? 'auto' : 220,
              objectFit: 'cover',
            }}
          />
          <span
            style={s(
              'position:absolute;right:10px;bottom:10px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;color:var(--s-text);background:var(--s-pop);border:1px solid var(--s-line);-webkit-backdrop-filter:var(--s-blur);backdrop-filter:var(--s-blur)',
            )}
          >
            {expanded ? 'Show less' : 'Show full image'}
          </span>
        </div>
      ) : null}
      <PageHead title={project.title} sub={project.tagline} />
      {/* Links sit with the title, not below the write-up. They are the first thing a visitor
          looks for and used to need a scroll past every section to reach. */}
      <div style={s('display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:14px')}>
        <StatusPill label={project.status.label} ok={project.status.ok} />
        {project.links.map((link) => (
          <LinkButton key={link.url} label={link.label} url={link.url} />
        ))}
      </div>
      <Chips items={project.stack} />

      {project.sections.map((section, i) => (
        <Sec heading={section.heading} key={section.heading ?? i}>
          <SectionBody section={section} />
        </Sec>
      ))}

      {project.note ? (
        <div style={s('margin-top:14px;color:var(--s-dim);font-size:12.5px')}>{project.note}</div>
      ) : null}

      {project.caveat ? <Caveat>{project.caveat}</Caveat> : null}
    </Body>
  )
}

/**
 * Shown when a window is open for a project that is no longer in the loaded content — the CMS
 * unpublished or deleted it while the desktop was on screen. Better than a blank window.
 */
export function MissingProject() {
  return (
    <Body>
      <PageHead title="Not available" sub="This project is no longer published." />
      <div style={s('margin-top:18px;color:var(--s-dim);font-size:13px')}>
        Close this window and pick another from the dock or Launchpad.
      </div>
    </Body>
  )
}
