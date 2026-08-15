import type { ComponentType } from 'react'
import { PROJECTS } from '../../data/projects'
import type { AppId } from '../types'
import { CodeViewer } from './CodeViewer'
import { Contact } from './Contact'
import { Finder } from './Finder'
import { ProjectWindow } from './ProjectWindow'
import { Resume } from './Resume'
import { Safari } from './Safari'
import { Settings } from './Settings'
import { SumitAI } from './SumitAI'
import { Terminal } from './Terminal'
import { About, Certificates, Education, Experience, Skills, Trash } from './simple'

const projectWindows: Partial<Record<AppId, ComponentType>> = Object.fromEntries(
  PROJECTS.map((project) => [project.id, () => <ProjectWindow project={project} />]),
)

export const APP_CONTENT: Record<AppId, ComponentType> = {
  ...(projectWindows as Record<AppId, ComponentType>),
  finder: Finder,
  terminal: Terminal,
  safari: Safari,
  'sumit-ai': SumitAI,
  about: About,
  resume: Resume,
  contact: Contact,
  settings: Settings,
  trash: Trash,
  code: CodeViewer,
  skills: Skills,
  education: Education,
  experience: Experience,
  certificates: Certificates,
}
