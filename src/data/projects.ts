// Project content, transcribed from the Portfolio OS design (legacy/portfolio-os.html,
// PROJECT_DATA). Copy is unchanged — only the shape is typed.

/** A flow diagram row: [step, caption]. */
export type FlowStep = [string, string]

/** A metric row: [label, value, hint?]. */
export type Metric = [string, string, string?]

export type SectionBody =
  | { text: string }
  | { flow: FlowStep[] }
  | { metrics: Metric[] }
  | { chart: 'sar-mse' }

export type ProjectSection = {
  heading?: string
  body: SectionBody
}

export type ProjectLink = {
  label: string
  url: string
}

export type Project = {
  id: string
  title: string
  tagline: string
  status: { label: string; ok: boolean }
  stack: string[]
  sections: ProjectSection[]
  links: ProjectLink[]
  /** Shown under the links — a qualification about what is and is not published. */
  note?: string
  /** Shown as a bordered aside — a caveat about the claims on the card. */
  caveat?: string
}

export const PROJECTS: Project[] = [
  {
    id: 'project-lazarus',
    title: 'Lazarus Sentinel',
    tagline: 'Desktop SSH safety terminal · Electron + React',
    status: { label: 'Code + live deployment', ok: true },
    stack: ['Electron', 'React', 'GitHub Actions', 'Vitest'],
    sections: [
      {
        heading: 'What it is',
        body: {
          text: 'A desktop terminal that puts a safety layer in front of SSH sessions, packaged as an Electron app with a React interface.',
        },
      },
      {
        heading: 'Architecture',
        body: {
          flow: [
            ['React renderer', 'Terminal UI, session list'],
            ['Electron main', 'Process + IPC boundary'],
            ['Safety layer', 'Command review before send'],
            ['SSH session', 'Remote host'],
          ],
        },
      },
      {
        heading: 'Engineering record',
        body: {
          metrics: [
            ['Commits', '278'],
            ['CI', 'GitHub Actions'],
            ['Tests', 'Vitest', 'Unit suite in CI'],
            ['Deployment', 'Live'],
          ],
        },
      },
    ],
    links: [],
    caveat:
      'Repository and live deployment URLs pending — no button is shown until real links are supplied. The diagram describes the stack listed above, not a published internal spec.',
  },

  {
    id: 'project-ai-video',
    title: 'AI Video Assistant',
    tagline: 'Multi-modal RAG pipeline',
    status: { label: 'Live demo · code private', ok: true },
    stack: ['LangChain', 'Mistral AI', 'FastAPI', 'Docker', 'PostgreSQL / pgvector', 'Streamlit'],
    sections: [
      {
        heading: 'What it is',
        body: {
          text: 'A RAG and multi-modal pipeline for transcription, summarisation and conversational Q&A over uploaded media.',
        },
      },
      {
        heading: 'Pipeline',
        body: {
          flow: [
            ['Upload', 'Video / audio'],
            ['Transcribe', 'Speech to text'],
            ['Embed', 'pgvector store'],
            ['Retrieve', 'Top-k chunks'],
            ['Mistral AI', 'Grounded answer'],
          ],
        },
      },
      {
        heading: 'Deployment',
        body: {
          flow: [
            ['Streamlit', 'Interface layer'],
            ['FastAPI', 'Service layer'],
            ['Docker', 'Packaging'],
            ['Render', 'API hosting'],
          ],
        },
      },
    ],
    links: [],
    caveat: 'Demo URL pending. Source is private, so no repository link is shown.',
  },

  {
    id: 'project-pm25',
    title: 'PM2.5 Forecasting',
    tagline: 'ConvLSTM + Fourier Neural Operator hybrid',
    status: { label: 'Live · public demo', ok: true },
    stack: ['ConvLSTM', 'Fourier Neural Operator', 'Hugging Face Spaces'],
    sections: [
      {
        heading: 'Model',
        body: {
          text: 'A hybrid spatio-temporal network pairing ConvLSTM encoders with a Fourier Neural Operator for grid-level PM2.5 forecasting.',
        },
      },
      {
        heading: 'Architecture',
        body: {
          flow: [
            ['Gridded input', 'Spatio-temporal frames'],
            ['ConvLSTM', 'Local temporal encoder'],
            ['Fourier operator', 'Global spectral pass'],
            ['Forecast', 'Grid-level PM2.5'],
          ],
        },
      },
      { heading: 'Context', body: { text: 'ANRF AISEHack Phase 2, IIT Delhi. Team MGM.' } },
    ],
    links: [
      { label: 'Live Demo', url: 'https://huggingface.co/spaces/sumit1703/pm25-forecasting' },
    ],
  },

  {
    id: 'project-sar',
    title: 'SAR Crop Mapping',
    tagline: 'Unsupervised MSE optimisation on X-band SAR',
    status: { label: 'Case study · code private', ok: false },
    stack: ['Capella Space X-band SAR', 'Unsupervised optimisation', 'Remote sensing'],
    sections: [
      {
        heading: 'Task',
        body: {
          text: 'Estimate crop areas — rice, cotton, maize, bajra, groundnut — for 29 villages in Gujarat from Capella Space X-band SAR imagery. ANRF AISEHack 2026, Round 1.',
        },
      },
      {
        heading: 'Architecture',
        body: {
          flow: [
            ['Capella X-band', 'Scene tiles'],
            ['Preprocessing', 'Speckle + calibration'],
            ['Unsupervised fit', 'MSE objective'],
            ['Per-village area', '5 crop classes'],
          ],
        },
      },
      {
        heading: 'Results',
        body: {
          metrics: [
            ['Best MSE', '1348.108', 'From ≈3568 on the first run'],
            ['Documented experiments', '26+'],
            ['Villages', '29', 'Gujarat'],
            ['Crop classes', '5', 'Rice, cotton, maize, bajra, groundnut'],
          ],
        },
      },
      {
        heading: 'The experiment log',
        body: {
          text: '26+ documented experiments. MSE moved from roughly 3568 to a best of 1348.108.',
        },
      },
      { body: { chart: 'sar-mse' } },
    ],
    links: [],
  },

  {
    id: 'project-multi-agent',
    title: 'Multi-Agent Research System',
    tagline: 'Four-agent pipeline — a learning project',
    status: { label: 'Code private · no deployment', ok: false },
    stack: ['LangChain', 'Search / Reader / Writer / Critic'],
    sections: [
      {
        heading: 'Pipeline',
        body: {
          flow: [
            ['Search', 'Finds sources'],
            ['Reader', 'Extracts claims'],
            ['Writer', 'Drafts the brief'],
            ['Critic', 'Reviews and returns'],
          ],
        },
      },
      {
        heading: 'Honest assessment',
        body: {
          text: 'Self-rated 5/10. Built to understand agent orchestration rather than to ship; the interesting part is where the handoffs break down.',
        },
      },
    ],
    links: [],
  },

  {
    id: 'project-airbnb',
    title: 'NYC Airbnb Room Type Classification',
    tagline: 'Supervised classification, served over an API',
    status: { label: 'Code public', ok: true },
    stack: ['Scikit-learn', 'FastAPI', 'Pandas'],
    sections: [
      {
        heading: 'What it does',
        body: {
          text: 'Classifies NYC Airbnb listings by room type from listing features, served through a FastAPI endpoint.',
        },
      },
      {
        heading: 'Architecture',
        body: {
          flow: [
            ['Listing data', 'Pandas cleaning'],
            ['Features', 'Encoded inputs'],
            ['Scikit-learn', 'Room-type classifier'],
            ['FastAPI', 'Prediction endpoint'],
          ],
        },
      },
    ],
    links: [
      {
        label: 'View Code',
        url: 'https://github.com/sumitjadhav1703/NYC_Airbnb_Room_Type_Classification',
      },
    ],
    note: 'Deployment URL unconfirmed — no live demo button until one is verified.',
  },
]

/**
 * URL slug for a project: `project-sar` → `sar`. Routes, metadata and OG cards all derive
 * from this array, so adding a project here is the only step a new page needs.
 */
export const slugOf = (project: Project): string => project.id.replace(/^project-/, '')

export const projectBySlug = (slug: string): Project | undefined =>
  PROJECTS.find((project) => slugOf(project) === slug)

/** Short, shareable summary used for og:description and the card subtitle. */
export const summaryOf = (project: Project): string =>
  `${project.tagline} · ${project.stack.slice(0, 4).join(', ')}`
