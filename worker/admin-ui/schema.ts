// What the admin renders for each content type. Deliberately mirrors worker/tables.ts: the
// Worker validates, this describes. If the two ever disagree the Worker wins — a form that lets
// you type something invalid gets a message back, it does not write bad data.

export type Input =
  | 'text'
  | 'textarea'
  | 'url' // a single link, checked against the same schemes the Worker accepts
  | 'slug' // lower-case identifier, suggested from another field until you touch it
  | 'bool'
  | 'date' // YYYY, YYYY-MM or YYYY-MM-DD
  | 'chips' // string[] — one tag per chip, with the icon it resolves to
  | 'paragraphs' // string[] — one textarea per entry
  | 'links' // [{label,url}] — label, URL, resolved platform
  | 'pairs' // [string, string][] — two columns of rows
  | 'map' // Record<string,string> — the same rows, keyed
  | 'kb' // [string[], string][] — keyword chips and an answer
  | 'sections' // the project body editor
  | 'file' // an R2 upload; stores the object key

export type FieldUI = {
  col: string
  label: string
  input: Input
  hint?: string
  /** Which editor section this belongs to. Fields with no group sit above the first one. */
  group?: string
  /** Upload category for `file` inputs. */
  kind?: string
  accept?: string
  /** `slug` inputs follow this column until the author edits the slug themselves. */
  from?: string
  /** Column headings for `pairs`, `map` and `links` rows. */
  columns?: [string, string]
  /** Placeholder for the entry a `chips` field is about to add. */
  placeholder?: string
}

export type CollectionUI = {
  type: string
  title: string
  singular: string
  /** The row's headline, and the field quick edit renames. */
  titleCol: string
  /** The line under it, when the type has one worth reading. */
  subtitleCol?: string
  /** Extra values shown small, after the status. */
  metaCols?: string[]
  /** R2 key column drawn as the row's thumbnail. */
  thumbCol?: string
  /** Columns global and in-list search look at. JSON cells are searched as their own text. */
  searchCols: string[]
  /** Columns quick edit offers, besides Published. Kept short on purpose (spec §32). */
  quick: string[]
  fields: FieldUI[]
  defaults: Record<string, unknown>
  /** Types with a published flag get publish/unpublish actions and a status column. */
  publishable: boolean
  /** Only projects can be duplicated; nothing else is expensive enough to be worth copying. */
  duplicable?: boolean
}

const ORDER_DEFAULTS = { published: 0, display_order: 0 }

export const COLLECTIONS: CollectionUI[] = [
  {
    type: 'projects',
    title: 'Projects',
    singular: 'project',
    publishable: true,
    duplicable: true,
    titleCol: 'title',
    subtitleCol: 'tagline',
    metaCols: ['status_label'],
    thumbCol: 'cover_key',
    searchCols: ['title', 'tagline', 'slug', 'stack', 'status_label', 'note', 'desktop_label', 'aliases'],
    quick: ['title', 'status_label'],
    defaults: { slug: '', title: '', desktop_label: '', tagline: '', status_label: '', status_ok: 1, stack: [], sections: [], links: [], aliases: [], note: '', caveat: '', cover_key: '', featured: 0, ...ORDER_DEFAULTS },
    fields: [
      { col: 'title', label: 'Title', input: 'text', group: 'Basic info' },
      {
        col: 'slug',
        label: 'Slug',
        input: 'slug',
        from: 'title',
        group: 'Basic info',
        hint: 'Becomes /projects/<slug> and the window id. Suggested from the title until you change it.',
      },
      {
        col: 'desktop_label',
        label: 'Desktop label',
        input: 'text',
        group: 'Basic info',
        hint: 'Short name for the desktop icon, Finder and Launchpad. Blank uses the title.',
      },
      {
        col: 'aliases',
        label: 'Shell aliases',
        input: 'chips',
        group: 'Basic info',
        placeholder: 'another name',
        hint: 'Extra names the Shell’s `project <name>` command accepts, besides the slug.',
      },
      { col: 'tagline', label: 'Tagline', input: 'text', group: 'Basic info' },
      { col: 'status_label', label: 'Status label', input: 'text', group: 'Basic info' },
      { col: 'status_ok', label: 'Status reads as good', input: 'bool', group: 'Basic info' },

      { col: 'links', label: 'Links', input: 'links', group: 'Links', columns: ['Label', 'URL'] },

      {
        col: 'stack',
        label: 'Technologies',
        input: 'chips',
        group: 'Technology stack',
        placeholder: 'PyTorch',
        hint: 'The icon is looked up from the name. Nothing to configure.',
      },

      { col: 'sections', label: 'Sections', input: 'sections', group: 'Project content' },
      { col: 'note', label: 'Note', input: 'textarea', group: 'Project content' },
      { col: 'caveat', label: 'Caveat', input: 'textarea', group: 'Project content' },

      { col: 'cover_key', label: 'Cover image', input: 'file', kind: 'projects', accept: 'image/png,image/jpeg,image/webp', group: 'Media' },

      { col: 'featured', label: 'Featured', input: 'bool', group: 'Display' },
    ],
  },
  {
    type: 'certificates',
    title: 'Certificates',
    singular: 'certificate',
    publishable: true,
    titleCol: 'title',
    subtitleCol: 'issuer',
    metaCols: ['issue_date'],
    thumbCol: 'image_key',
    searchCols: ['title', 'issuer', 'issue_date'],
    quick: ['title', 'issuer'],
    defaults: { title: '', issuer: '', issue_date: '', credential_url: '', file_key: '', image_key: '', ...ORDER_DEFAULTS },
    fields: [
      { col: 'title', label: 'Title', input: 'text', group: 'Basic info' },
      { col: 'issuer', label: 'Issuer', input: 'text', group: 'Basic info' },
      { col: 'issue_date', label: 'Issued', input: 'date', group: 'Basic info', hint: 'YYYY, YYYY-MM or YYYY-MM-DD.' },
      { col: 'credential_url', label: 'Credential URL', input: 'url', group: 'Basic info' },
      { col: 'file_key', label: 'Certificate file', input: 'file', kind: 'certificates', accept: 'application/pdf,image/png,image/jpeg,image/webp', group: 'Files' },
      { col: 'image_key', label: 'Preview image', input: 'file', kind: 'certificates', accept: 'image/png,image/jpeg,image/webp', group: 'Files' },
    ],
  },
  {
    type: 'experience',
    title: 'Experience',
    singular: 'entry',
    publishable: true,
    titleCol: 'title',
    subtitleCol: 'detail',
    searchCols: ['title', 'detail', 'hint'],
    quick: ['title'],
    defaults: { title: '', detail: '', hint: '', ...ORDER_DEFAULTS },
    fields: [
      {
        col: 'title',
        label: 'Role and company',
        input: 'text',
        hint: 'One line, as the About window shows it — “Research Intern · Acme”.',
      },
      { col: 'detail', label: 'What you did', input: 'textarea' },
      { col: 'hint', label: 'Dates or location', input: 'text', hint: 'The small grey line beside the entry.' },
    ],
  },
  {
    type: 'education',
    title: 'Education',
    singular: 'entry',
    publishable: true,
    titleCol: 'title',
    subtitleCol: 'detail',
    searchCols: ['title', 'detail', 'hint'],
    quick: ['title'],
    defaults: { title: '', detail: '', hint: '', ...ORDER_DEFAULTS },
    fields: [
      {
        col: 'title',
        label: 'Institution and program',
        input: 'text',
        hint: 'One line — “B.Tech Computer Engineering · Somewhere University”.',
      },
      { col: 'detail', label: 'Detail', input: 'textarea' },
      { col: 'hint', label: 'Dates or grade', input: 'text', hint: 'The small grey line beside the entry.' },
    ],
  },
  {
    type: 'skills',
    title: 'Skills',
    singular: 'group',
    publishable: true,
    titleCol: 'heading',
    searchCols: ['heading', 'items'],
    quick: ['heading'],
    defaults: { heading: '', items: [], ...ORDER_DEFAULTS },
    fields: [
      { col: 'heading', label: 'Group name', input: 'text', hint: 'AI / ML, Web, Tooling…' },
      {
        col: 'items',
        label: 'Skills in this group',
        input: 'chips',
        placeholder: 'PyTorch',
        hint: 'The icon is looked up from the name.',
      },
    ],
  },
  {
    type: 'social-links',
    title: 'Social links',
    singular: 'link',
    publishable: true,
    titleCol: 'label',
    subtitleCol: 'handle',
    searchCols: ['label', 'handle', 'url', 'slug'],
    quick: ['label', 'handle'],
    defaults: { slug: '', label: '', handle: '', url: '', pill: 0, ...ORDER_DEFAULTS },
    fields: [
      { col: 'label', label: 'Label', input: 'text' },
      { col: 'url', label: 'URL', input: 'url', hint: 'The icon follows this. Change the URL and the mark changes with it.' },
      { col: 'handle', label: 'Handle', input: 'text', hint: 'What is shown beside the icon — github.com/you, or an address.' },
      {
        col: 'slug',
        label: 'Icon fallback',
        input: 'slug',
        from: 'label',
        hint: 'Only used when the URL resolves to nothing.',
      },
      { col: 'pill', label: 'Show as a pill in About and Contact', input: 'bool' },
    ],
  },
]

export const SITE_FIELDS: FieldUI[] = [
  { col: 'name', label: 'Name', input: 'text', group: 'Identity' },
  { col: 'initials', label: 'Initials', input: 'text', group: 'Identity', hint: 'Up to four characters, used by the avatar.' },
  { col: 'subtitle', label: 'Subtitle', input: 'text', group: 'Identity' },
  { col: 'paragraphs', label: 'About paragraphs', input: 'paragraphs', group: 'About' },
  { col: 'email', label: 'Email', input: 'text', group: 'Contact' },
]

/** The resume has its own screen; this is the field that screen writes. */
export const RESUME_FIELD: FieldUI = {
  col: 'resume_key',
  label: 'Resume PDF',
  input: 'file',
  kind: 'resume',
  accept: 'application/pdf',
}

export const OS_FIELDS: FieldUI[] = [
  {
    col: 'term',
    label: 'Shell commands',
    input: 'map',
    group: 'Terminal',
    columns: ['Command', 'Response'],
    hint: 'Typed in the Shell. `project <name>` and the built-ins are code, not content.',
  },
  { col: 'neofetch_art', label: 'Neofetch art', input: 'textarea', group: 'Terminal' },
  {
    col: 'neofetch_rows',
    label: 'Neofetch rows',
    input: 'pairs',
    group: 'Terminal',
    columns: ['Label', 'Value'],
    hint: 'A row labelled “Projects” is filled with the live count.',
  },
  {
    col: 'kb',
    label: 'Answers',
    input: 'kb',
    group: 'Ask Sumit',
    hint: 'Each answer is found by its keywords. First match wins, so put the specific ones first.',
  },
  {
    col: 'ai_fallback',
    label: 'Fallback answer',
    input: 'textarea',
    group: 'Ask Sumit',
    hint: 'Used when nothing matches and the AI worker is unavailable.',
  },
  { col: 'ai_suggestions', label: 'Suggested questions', input: 'chips', group: 'Ask Sumit', placeholder: 'What did you build?' },
  {
    col: 'shortcuts',
    label: 'Shortcut sheet',
    input: 'pairs',
    group: 'Shortcuts',
    columns: ['Keys', 'What it does'],
  },
]

/** Fields in the order declared, gathered into the groups they named. Ungrouped ones stay put. */
export function grouped(fields: FieldUI[]): { title: string | null; fields: FieldUI[] }[] {
  const out: { title: string | null; fields: FieldUI[] }[] = []
  for (const field of fields) {
    const title = field.group ?? null
    const last = out[out.length - 1]
    if (last && last.title === title) last.fields.push(field)
    else out.push({ title, fields: [field] })
  }
  return out
}
