// What the admin renders for each content type. Deliberately mirrors worker/tables.ts: the
// Worker validates, this describes. If the two ever disagree the Worker wins — a form that lets
// you type something invalid gets a message back, it does not write bad data.

export type Input =
  | 'text'
  | 'textarea'
  | 'bool'
  | 'number'
  | 'lines' // string[], one per line
  | 'pairs' // [string, string][], "left :: right"
  | 'map' // Record<string,string>, "key :: value"
  | 'kb' // [string[], string][], "keyword, keyword :: answer"
  | 'links' // [{label,url}], "label :: url"
  | 'sections' // the project section editor
  | 'file' // an R2 upload; stores the object key

export type FieldUI = {
  col: string
  label: string
  input: Input
  hint?: string
  /** Upload category for `file` inputs. */
  kind?: string
  accept?: string
}

export type CollectionUI = {
  type: string
  title: string
  singular: string
  /** Columns shown in the list, in order. */
  columns: { col: string; label: string }[]
  fields: FieldUI[]
  defaults: Record<string, unknown>
  /** Types with a published flag get publish/unpublish actions and a status column. */
  publishable: boolean
}

const ORDER_DEFAULTS = { published: 0, display_order: 0 }

export const COLLECTIONS: CollectionUI[] = [
  {
    type: 'projects',
    title: 'Projects',
    singular: 'project',
    publishable: true,
    columns: [
      { col: 'title', label: 'Project' },
      { col: 'slug', label: 'Slug' },
    ],
    defaults: { slug: '', title: '', desktop_label: '', tagline: '', status_label: '', status_ok: 1, stack: [], sections: [], links: [], aliases: [], note: '', caveat: '', cover_key: '', featured: 0, ...ORDER_DEFAULTS },
    fields: [
      { col: 'title', label: 'Title', input: 'text' },
      {
        col: 'slug',
        label: 'Slug',
        input: 'text',
        hint: 'Lower case, digits and dashes. Becomes /projects/<slug> and the window id.',
      },
      {
        col: 'desktop_label',
        label: 'Desktop label',
        input: 'text',
        hint: 'Short name for the desktop icon, Finder and Launchpad. Blank uses the title.',
      },
      { col: 'tagline', label: 'Tagline', input: 'text' },
      { col: 'status_label', label: 'Status label', input: 'text' },
      { col: 'status_ok', label: 'Status reads as good', input: 'bool' },
      { col: 'stack', label: 'Stack', input: 'lines', hint: 'One technology per line.' },
      { col: 'sections', label: 'Sections', input: 'sections' },
      { col: 'links', label: 'Links', input: 'links', hint: 'One per line: label :: https://…' },
      {
        col: 'aliases',
        label: 'Shell aliases',
        input: 'lines',
        hint: 'Extra names the Shell’s `project <name>` command accepts, besides the slug.',
      },
      { col: 'note', label: 'Note', input: 'textarea' },
      { col: 'caveat', label: 'Caveat', input: 'textarea' },
      { col: 'cover_key', label: 'Cover image', input: 'file', kind: 'projects', accept: 'image/*' },
      { col: 'featured', label: 'Featured', input: 'bool' },
    ],
  },
  {
    type: 'certificates',
    title: 'Certificates',
    singular: 'certificate',
    publishable: true,
    columns: [
      { col: 'title', label: 'Certificate' },
      { col: 'issuer', label: 'Issuer' },
    ],
    defaults: { title: '', issuer: '', issue_date: '', credential_url: '', file_key: '', image_key: '', ...ORDER_DEFAULTS },
    fields: [
      { col: 'title', label: 'Title', input: 'text' },
      { col: 'issuer', label: 'Issuer', input: 'text' },
      { col: 'issue_date', label: 'Issued', input: 'text', hint: 'YYYY, YYYY-MM or YYYY-MM-DD.' },
      { col: 'credential_url', label: 'Credential URL', input: 'text' },
      { col: 'file_key', label: 'Certificate file', input: 'file', kind: 'certificates', accept: 'application/pdf,image/*' },
      { col: 'image_key', label: 'Preview image', input: 'file', kind: 'certificates', accept: 'image/*' },
    ],
  },
  {
    type: 'experience',
    title: 'Experience',
    singular: 'entry',
    publishable: true,
    columns: [{ col: 'title', label: 'Entry' }],
    defaults: { title: '', detail: '', hint: '', ...ORDER_DEFAULTS },
    fields: [
      { col: 'title', label: 'Title', input: 'text' },
      { col: 'detail', label: 'Detail', input: 'textarea' },
      { col: 'hint', label: 'Hint', input: 'text' },
    ],
  },
  {
    type: 'education',
    title: 'Education',
    singular: 'entry',
    publishable: true,
    columns: [{ col: 'title', label: 'Entry' }],
    defaults: { title: '', detail: '', hint: '', ...ORDER_DEFAULTS },
    fields: [
      { col: 'title', label: 'Title', input: 'text' },
      { col: 'detail', label: 'Detail', input: 'textarea' },
      { col: 'hint', label: 'Hint', input: 'text' },
    ],
  },
  {
    type: 'skills',
    title: 'Skills',
    singular: 'group',
    publishable: true,
    columns: [{ col: 'heading', label: 'Group' }],
    defaults: { heading: '', items: [], ...ORDER_DEFAULTS },
    fields: [
      { col: 'heading', label: 'Heading', input: 'text' },
      { col: 'items', label: 'Skills', input: 'lines', hint: 'One per line.' },
    ],
  },
  {
    type: 'social-links',
    title: 'Social links',
    singular: 'link',
    publishable: true,
    columns: [
      { col: 'label', label: 'Link' },
      { col: 'handle', label: 'Handle' },
    ],
    defaults: { slug: '', label: '', handle: '', url: '', pill: 0, ...ORDER_DEFAULTS },
    fields: [
      { col: 'label', label: 'Label', input: 'text' },
      {
        col: 'slug',
        label: 'Icon slug',
        input: 'text',
        hint: 'email, github, linkedin, kaggle, huggingface — resolved by src/lib/icons.',
      },
      { col: 'handle', label: 'Handle', input: 'text' },
      { col: 'url', label: 'URL', input: 'text' },
      { col: 'pill', label: 'Show as a pill in About and Contact', input: 'bool' },
    ],
  },
]

export const SITE_FIELDS: FieldUI[] = [
  { col: 'name', label: 'Name', input: 'text' },
  { col: 'initials', label: 'Initials', input: 'text' },
  { col: 'subtitle', label: 'Subtitle', input: 'text' },
  { col: 'paragraphs', label: 'About paragraphs', input: 'lines', hint: 'One paragraph per line.' },
  { col: 'email', label: 'Email', input: 'text' },
  { col: 'resume_key', label: 'Resume PDF', input: 'file', kind: 'resume', accept: 'application/pdf' },
]

export const OS_FIELDS: FieldUI[] = [
  { col: 'term', label: 'Shell commands', input: 'map', hint: 'One per line: command :: response.' },
  { col: 'neofetch_art', label: 'Neofetch art', input: 'textarea' },
  { col: 'neofetch_rows', label: 'Neofetch rows', input: 'pairs', hint: 'label :: value. A row labelled "Projects" is filled with the live count.' },
  { col: 'kb', label: 'Ask Sumit answers', input: 'kb', hint: 'keyword, keyword :: answer. First match wins.' },
  { col: 'ai_fallback', label: 'Ask Sumit fallback', input: 'textarea' },
  { col: 'ai_suggestions', label: 'Suggested questions', input: 'lines' },
  { col: 'shortcuts', label: 'Shortcut sheet', input: 'pairs', hint: 'keys :: description.' },
]
