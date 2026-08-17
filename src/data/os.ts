import type { AppId } from '../os/types'

/** Shell responses. Values render as plain text unless listed in TERM_HTML. */
export const TERM: Record<string, string> = {
  help: 'Commands: about, projects, project <name>, skills, education, experience, resume, contact, links, whoami, neofetch, open <app>, clear',
  about:
    'Sumit Jadhav — third-year B.Tech, AI & Data Science, JNEC / MGM University. Focus: generative AI, RAG, applied deep learning.',
  projects: 'lazarus-sentinel · ai-video · pm25 · sar · multi-agent · airbnb  → try: project sar',
  links:
    'github.com/sumitjadhav1703 · kaggle.com/sumit1703 · huggingface.co/sumit1703 · linkedin.com/in/sumit-jadhav-1703s',
  whoami: 'sumit — AI/ML engineering intern candidate.',
  coffee: 'Dependency missing: coffee',
  'sudo make-me-an-ai-engineer': 'Permission denied: keep learning.',
}

export const NEOFETCH_ART = `  ____  _
 / ___|| |
 \\___ \\| |
  ___) | |
 |____/|_|`

export const NEOFETCH_ROWS: [string, string][] = [
  ['OS', "Sumit's Portfolio OS"],
  ['Focus', 'AI / ML'],
  ['Primary language', 'Python'],
  ['Direction', 'Generative AI'],
  ['Projects', '6'],
  ['Status', 'Ready'],
]

export const PROJ_ALIAS: Record<string, AppId> = {
  'lazarus-sentinel': 'project-lazarus',
  lazarus: 'project-lazarus',
  'ai-video': 'project-ai-video',
  pm25: 'project-pm25',
  'pm2.5': 'project-pm25',
  sar: 'project-sar',
  'multi-agent': 'project-multi-agent',
  airbnb: 'project-airbnb',
}

/**
 * Ask Sumit's knowledge base: keyword list → answer. First match wins.
 * Seeds the CMS; the live matcher is `answerFrom` in src/data/content.ts.
 */
export const KB: [string[], string][] = [
  [
    ['stack', 'tech', 'tools', 'language', 'python'],
    "Python first: PyTorch, TensorFlow, Scikit-learn, OpenCV. For generative AI it's LangChain, Mistral AI, FastAPI, Docker and pgvector. Application work is Electron, React and Vitest.",
  ],
  [
    ['lazarus', 'sentinel', 'ssh', 'electron'],
    'Lazarus Sentinel is a desktop SSH safety terminal in Electron and React — 278 commits, GitHub Actions CI, a Vitest suite and a live deployment.',
  ],
  [
    ['ai video', 'video assistant', 'video'],
    'The AI Video Assistant is a RAG and multi-modal pipeline on LangChain, Mistral AI, FastAPI, Docker and pgvector, with a Streamlit interface. Transcribe, embed, retrieve, answer.',
  ],
  [
    ['pm2.5', 'pm25', 'pollution', 'forecast'],
    'PM2.5 Forecasting pairs ConvLSTM with a Fourier Neural Operator for grid pollution forecasting. Built for ANRF AISEHack Phase 2 at IIT Delhi and deployed on Hugging Face Spaces.',
  ],
  [
    ['sar', 'crop', 'gujarat', 'capella', 'satellite'],
    'SAR Crop Mapping estimated crop areas — rice, cotton, maize, bajra, groundnut — for 29 Gujarat villages from Capella Space X-band SAR. 26+ documented experiments took MSE from about 3568 to 1348.108.',
  ],
  [
    ['multi-agent', 'multi agent', 'agent', 'research system'],
    'The Multi-Agent Research System is a four-agent LangChain pipeline — Search, Reader, Writer, Critic. Self-rated 5/10: it was built to understand orchestration, not to ship.',
  ],
  [
    ['airbnb', 'nyc', 'classification', 'classifier'],
    'NYC Airbnb Room Type Classification is a Scikit-learn model served through FastAPI with Pandas doing the cleaning. The code is public on GitHub.',
  ],
  [
    ['education', 'college', 'study', 'degree', 'jnec', 'university'],
    "Third-year B.Tech in AI & Data Science at MGM's Jawaharlal Nehru Engineering College, MGM University, entered by lateral transfer from a Diploma in Computer Engineering.",
  ],
  [
    ['experience', 'intern', 'internship', 'hire', 'job', 'work'],
    'Sumit is targeting an AI/ML engineering internship. The track record is competition and independent work: two ANRF AISEHack entries, applied GenAI projects and Lazarus Sentinel.',
  ],
  [
    ['contact', 'email', 'reach', 'linkedin', 'github', 'kaggle'],
    'Email jadhavsumit534@gmail.com. Also on GitHub (sumitjadhav1703), Kaggle and Hugging Face (sumit1703) and LinkedIn (sumit-jadhav-1703s).',
  ],
  [
    ['code', 'source', 'how is this built', 'this site', 'desktop'],
    'This desktop is a React and TypeScript application built with Next.js — the window manager, dock, Shell and search are all components. Open the Code app to read the sources.',
  ],
  [
    ['resume', 'cv', 'download'],
    "The resume is a PDF. Grab it from the Resume button in the menu bar, the Resume app, or ask the Shell for 'resume'.",
  ],
  [
    ['project', 'portfolio', 'what have you built', 'show me'],
    'Six projects: Lazarus Sentinel, AI Video Assistant, PM2.5 Forecasting, SAR Crop Mapping, the Multi-Agent Research System and the NYC Airbnb classifier. Ask about any of them.',
  ],
]

export const AI_FALLBACK =
  "I only know Sumit's portfolio. Try asking about Lazarus Sentinel, the AI Video Assistant, PM2.5 forecasting, SAR crop mapping, the multi-agent system, his stack, education or how to reach him."

/**
 * The chips shown before the first question. Seed values only — the live list comes from
 * `os.aiSuggestions` in D1 and is editable in /admin, so these are what a standalone build
 * ships with, not a list to keep in step with the projects.
 *
 * Written for the person actually reading: a recruiter deciding in thirty seconds whether the
 * portfolio is worth more of their time.
 */
export const AI_SUGGESTIONS = [
  "What are Sumit's strongest AI projects?",
  'What ML technologies does Sumit use?',
  'Tell me about SAR Crop Mapping',
  "What is Sumit's education?",
  'How do I contact him?',
]

export const SHORTCUTS: [string, string][] = [
  ['⌘K / Ctrl K', 'Search everything'],
  ['F4', 'Launchpad'],
  ['⌃← / ⌃→', 'Previous / next Space'],
  ['⌃⌘← / ⌃⌘→', 'Tile the front window left / right'],
  ['Right-click', 'Desk, folder, dock and title-bar menus'],
  ['?', 'Show this shortcut list'],
  ['⌘↑ / F3', 'Mission Control'],
  ['⌘W', 'Close the front window'],
  ['⌘M', 'Minimise the front window'],
  ['Esc', 'Close overlays and menus'],
  ['Double-click', 'Open a folder, or zoom a title bar'],
]
