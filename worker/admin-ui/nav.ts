// The sidebar as a table, not markup — the same trick src/os/shell/appMenus.tsx plays for the
// desktop's menu bar. A screen is added by adding a row here, and the nav renders whatever it
// finds, so there is no second list to keep in step.

export type NavItem = { page: string; label: string }
export type NavGroup = { title: string | null; items: NavItem[] }

export const NAV: NavGroup[] = [
  { title: null, items: [{ page: 'dashboard', label: 'Dashboard' }] },
  {
    title: 'Content',
    items: [
      { page: 'projects', label: 'Projects' },
      { page: 'certificates', label: 'Certificates' },
      { page: 'experience', label: 'Experience' },
      { page: 'education', label: 'Education' },
      { page: 'skills', label: 'Skills' },
      { page: 'site', label: 'Profile' },
      { page: 'social-links', label: 'Social links' },
    ],
  },
  {
    title: 'Media',
    items: [
      { page: 'resume', label: 'Resume' },
      { page: 'assets', label: 'Assets' },
    ],
  },
  // One screen, three groups inside it: Terminal, Ask Sumit, Shortcuts. They are edited together
  // because they are one row in the database and one thing in the reader's head — the shell.
  { title: 'System', items: [{ page: 'os', label: 'Shell & Ask Sumit' }] },
]

/** Every page the sidebar can reach, for validating a hash someone typed or bookmarked. */
export const PAGES: string[] = NAV.flatMap((group) => group.items.map((item) => item.page))

/** The heading a screen shows, and what the browser tab says. */
export function titleOf(page: string): string {
  for (const group of NAV) {
    for (const item of group.items) if (item.page === page) return item.label
  }
  return 'Dashboard'
}
