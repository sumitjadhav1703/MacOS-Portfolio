// About / skills / experience / education copy, transcribed from contentFor() in
// legacy/portfolio-os.html.

export const PROFILE = {
  name: 'Sumit Jadhav',
  initials: 'SJ',
  subtitle: 'AI & Data Science · Chhatrapati Sambhajinagar, Maharashtra',
  paragraphs: [
    "Third-year B.Tech student in AI & Data Science at MGM's Jawaharlal Nehru Engineering College (JNEC), MGM University, entered by lateral transfer from a Diploma in Computer Engineering.",
    'Focus: generative AI, RAG systems and applied deep learning. Currently looking for an AI/ML engineering internship.',
  ],
}

export type SkillGroup = { heading: string; items: string[] }

export const SKILL_GROUPS: SkillGroup[] = [
  {
    heading: 'Languages & data',
    items: ['Python', 'C++', 'Java', 'SQL', 'JavaScript', 'Pandas', 'NumPy'],
  },
  {
    heading: 'ML & deep learning',
    items: [
      'PyTorch',
      'TensorFlow',
      'Scikit-learn',
      'OpenCV',
      'ConvLSTM',
      'Fourier Neural Operator',
      'Hugging Face',
    ],
  },
  {
    heading: 'Generative AI & MLOps',
    items: [
      'LangChain',
      'RAG architectures',
      'Multi-agent systems',
      'Mistral AI',
      'pgvector',
      'FastAPI',
      'Docker',
      'Streamlit',
      'Git',
    ],
  },
  { heading: 'Application', items: ['Electron', 'React', 'Vitest', 'GitHub Actions'] },
]

export type Entry = { title: string; detail: string; hint?: string }

export const EXPERIENCE: Entry[] = [
  {
    title: 'ANRF AISEHack 2026 — SAR Crop Mapping (Round 1)',
    detail:
      'Crop-area estimation for 29 Gujarat villages from Capella Space X-band SAR. 26+ documented experiments; MSE ≈ 3568 → 1348.108 best.',
  },
  {
    title: 'ANRF AISEHack — PM2.5 Forecasting (Phase 2, IIT Delhi)',
    detail:
      'Team MGM. ConvLSTM + Fourier Neural Operator hybrid, deployed publicly on Hugging Face Spaces.',
  },
  {
    title: 'Applied GenAI projects',
    detail:
      'RAG and multi-agent systems built on LangChain, Mistral AI, FastAPI, Docker and pgvector.',
  },
  {
    title: 'Lazarus Sentinel',
    detail:
      'Electron + React desktop SSH safety terminal. 278 commits, CI on GitHub Actions, Vitest suite, live deploy.',
  },
]

export const EDUCATION: Entry[] = [
  {
    title: 'B.Tech, AI & Data Science',
    detail: "MGM's Jawaharlal Nehru Engineering College (JNEC), MGM University",
    hint: 'Third year · Chhatrapati Sambhajinagar, Maharashtra',
  },
  {
    title: 'Diploma in Computer Engineering',
    detail: 'Entered B.Tech by lateral transfer',
  },
]

export const RESUME_FILE = '/Sumit_Jadhav_Resume.pdf'
