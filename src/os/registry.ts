import type { AppId } from './types'

export const TITLES: Record<AppId, string> = {
  finder: 'Workspace',
  terminal: 'Shell',
  safari: 'Safari',
  'sumit-ai': 'Ask Sumit',
  about: 'About',
  resume: 'Sumit_Jadhav_Resume.pdf',
  contact: 'Reach Out',
  settings: 'System',
  trash: 'Trash',
  code: 'Code',
  skills: 'Skills',
  education: 'Education',
  experience: 'Experience',
  certificates: 'Certificates',
  'project-ai-video': 'AI Video Assistant',
  'project-multi-agent': 'Multi-Agent Research System',
  'project-pm25': 'PM2.5 Forecasting',
  'project-airbnb': 'NYC Airbnb Room Type Classification',
  'project-sar': 'SAR Crop Mapping',
  'project-lazarus': 'Lazarus Sentinel',
}

/** Default window size per app; anything unlisted opens at 780×520. */
export const SIZE: Partial<Record<AppId, [number, number]>> = {
  terminal: [720, 440],
  safari: [900, 600],
  finder: [860, 520],
  'sumit-ai': [620, 560],
  about: [640, 470],
  resume: [820, 620],
  contact: [700, 520],
  settings: [820, 560],
  trash: [520, 320],
  skills: [720, 520],
  education: [720, 420],
  experience: [720, 460],
  certificates: [700, 400],
  code: [880, 560],
}

/** Which dock item bounces / shows a running dot for a given app. */
export const DOCK_FOR: Partial<Record<AppId, AppId>> = {
  finder: 'finder',
  terminal: 'terminal',
  safari: 'safari',
  'sumit-ai': 'sumit-ai',
  contact: 'contact',
  settings: 'settings',
  trash: 'trash',
  code: 'code',
}

export const isAppId = (v: string): v is AppId => v in TITLES

export const DEFAULT_SIZE: [number, number] = [780, 520]
