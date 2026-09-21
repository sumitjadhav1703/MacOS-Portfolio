import type { ComponentType } from 'react'
import type { Content } from '../../data/content'
import type { StaticAppId, AppId } from '../types'
import { CodeViewer } from './CodeViewer'
import { Contact } from './Contact'
import { Finder } from './Finder'
import { MissingProject, ProjectWindow } from './ProjectWindow'
import { Safari } from './Safari'
import { Settings } from './Settings'
import { SumitAI } from './SumitAI'
import { SystemMonitor } from './SystemMonitor'
import { Terminal } from './Terminal'
import { SECTION_CONTENT, Trash } from './simple'

export const APP_CONTENT: Record<StaticAppId, ComponentType> = {
  finder: Finder,
  terminal: Terminal,
  safari: Safari,
  'sumit-ai': SumitAI,
  contact: Contact,
  settings: Settings,
  trash: Trash,
  code: CodeViewer,
  monitor: SystemMonitor,
  // The six the Finder sidebar also renders in place — declared once, in simple.tsx.
  ...SECTION_CONTENT,
}

/**
 * Resolves a window id to its content. Project windows are looked up in the loaded content
 * rather than in a compile-time map, which is what lets a project added through the CMS open
 * like any other. A window whose project has since been deleted says so instead of blanking.
 */
export function appContentFor(id: AppId, content: Content): ComponentType {
  const staticApp = APP_CONTENT[id as StaticAppId]
  if (staticApp) return staticApp

  const project = content.projects.find((p) => p.id === id)
  return project ? () => <ProjectWindow project={project} /> : MissingProject
}
