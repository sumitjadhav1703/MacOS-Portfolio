import { titleOf } from '../registry'
import type { FinderPath } from '../types'

/**
 * What the Finder sidebar calls each place, which is not always what the window is called.
 *
 * `titleOf('resume')` is `Sumit_Jadhav_Resume.pdf` — right on a title bar, far too long for a
 * 186px sidebar row. Every other section is named after itself, so only the exception is
 * listed and the registry stays the single source for window titles.
 */
const SHORT: Partial<Record<FinderPath, string>> = { resume: 'Resume' }

export const finderLabel = (path: FinderPath): string =>
  SHORT[path] ?? (path === 'projects' ? 'Projects' : path === '/' ? 'Portfolio' : titleOf(path))

/** The ` — Where` a Finder window appends to its title. Empty at the root. */
export const finderCrumb = (path: FinderPath): string =>
  path === '/' ? '' : ` — ${finderLabel(path)}`
