// About / skills / experience / education / certificates copy.
//
// Regenerated from GET /api/content, because this is what the desktop renders when the Worker
// is unreachable and it has to agree with what the CMS actually holds. Re-sync it after an
// /admin edit, the same way src/data/projects.ts is re-synced.

import type { Certificate } from './content'

export const PROFILE = {
  name: 'Sumit Jadhav',
  initials: 'SJ',
  subtitle: 'B.Tech AI & Data Science Student | Python | Machine Learning | Deep Learning | SQL | Building AI/ML Projects',
  paragraphs: [
    'I am a 4th-year B.Tech student in Data Science and Artificial Intelligence at MGM University, JNEC. I am interested in AI/ML, Deep Learning, Data Science, and building real-world projects using Python.',
    'I enjoy working on practical problems such as data preprocessing, model training, evaluation, and improving model performance. My current skills include Python, Machine Learning, Deep Learning, SQL, Data Science, and basic web development.',
    'I am also learning Generative AI and building a GitHub portfolio with clean, well-documented projects. I have worked on academic and personal projects involving machine learning, forecasting, data analysis, and software development.',
    'My goal is to grow as an AI/ML Engineer and gain internship opportunities where I can apply my skills to real-world problems. I am open to learning opportunities, internships, collaborations, and AI/Data Science projects.',
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
    title: 'Web Development Intern · Kalavati Technologies',
    detail: 'Assisted in website development tasks using front-end technologies. Improved my understanding of HTML, CSS, JavaScript, and basic web development workflow. Gained practical exposure to a professional environment and completed assigned development tasks with consistency and attention to detail.',
    hint: 'June 2023 – July 2023 · Aurangabad, Maharashtra',
  },
  {
    title: 'ANRF AISEHack 2026 — SAR Crop Mapping',
    detail: 'Developed a validation-first crop-yield forecasting pipeline for 966 farm plots in Sokhda, Gujarat using six Capella X-band SAR acquisitions. Final forecast: 893.9 t across 447.5 ha.',
    hint: '2 Sep 2026 – 3 Sep 2026 · Goa, India',
  },
  {
    title: 'ANRF AISEHack — PM2.5 Forecasting (Phase 2, IIT Delhi)',
    detail: 'Team MGM. Built a ConvLSTM + Fourier Neural Operator hybrid for spatiotemporal PM2.5 forecasting and deployed the public inference demo on Hugging Face Spaces.',
    hint: '4–5 April 2026 · IIIT Hyderabad, Hyderabad',
  },
  {
    title: 'Independent GenAI & Agent Projects',
    detail: 'Built RAG, multi-agent and agentic applications using LangChain, LangGraph, Mistral AI, FastAPI, Docker and pgvector, including human-in-the-loop and autonomous workflows.',
  },
]

export const EDUCATION: Entry[] = [
  {
    title: 'B.Tech AI & Data Science',
    detail: 'M.G.M\'s Jawaharlal Nehru College of Engineering · Bachelor of Technology, Artificial Intelligence and Data Science',
    hint: '2024 – 2027 , 8.04 CGPA',
  },
  {
    title: 'Diploma in Computer Engineering',
    detail: 'M.G.M Polytechnic · Diploma in Computer Engineering',
    hint: '2021 – June 2024 , 71.65%',
  },
]

export const RESUME_FILE = '/Sumit_Jadhav_Resume.pdf'

/**
 * The certificates the build ships with, so the Certificates window is not empty when the API is
 * unreachable. `fileUrl` and `imageUrl` are deliberately absent: those are R2 objects that only
 * resolve through the Worker, and a compiled-in copy of them would be a dead link in exactly the
 * offline case this list exists for. The issuer's own `credentialUrl` verifies standalone.
 *
 * Ids are the CMS's, so swapping the live list in over this one does not remount every row.
 */
export const CERTIFICATES: Certificate[] = [
  {
    id: 'c5339b53-f711-4c50-be88-29f98385d5d5',
    title: 'Deep Learning Specialization',
    issuer: 'DeepLearning.AI',
    issueDate: '2026-08',
    credentialUrl: 'https://www.coursera.org/account/accomplishments/specialization/VQV42NSU0EW3',
  },
  {
    id: 'd788f353-330f-4d34-bde2-6a0fd324794e',
    title: 'Sequence Models',
    issuer: 'DeepLearning.AI',
    issueDate: '2026-08',
    credentialUrl: 'https://coursera.org/share/24bd1ff1c0056b66021467e7be0c049f',
  },
  {
    id: '8791f4f3-253d-415b-9b17-331b51547531',
    title: 'Hugging Face Agents Course – Certificate of Excellence',
    issuer: 'Hugging Face',
    issueDate: '2026-08',
    credentialUrl: 'https://huggingface.co/spaces/agents-course/Unit4-Final-Certificate',
  },
  {
    id: '1075999b-246f-4fbd-af0c-34e0055f8801',
    title: 'Fundamentals of Agents',
    issuer: 'Hugging Face',
    issueDate: '2026-08',
  },
  {
    id: '12a7c45c-7c04-4d96-8d65-3d87eb9ef414',
    title: 'AI Fluency: Framework & Foundations',
    issuer: 'Anthropic',
    issueDate: '2026-07',
    credentialUrl: 'https://verify.skilljar.com/c/zwd6bwyaa8t6',
  },
  {
    id: '3a4029ae-3769-4623-b0e7-dade85e15c2f',
    title: 'Convolutional Neural Networks',
    issuer: 'DeepLearning.AI',
    issueDate: '2026-07',
    credentialUrl: 'https://coursera.org/verify/J5DD2P9L0QOP',
  },
  {
    id: 'b5526ce6-451b-4b6c-a4b9-63e4680f5fba',
    title: 'Structuring Machine Learning Projects',
    issuer: 'DeepLearning.AI',
    issueDate: '2026-06',
    credentialUrl: 'https://coursera.org/verify/F72X5IDR3T3H',
  },
  {
    id: '917f8f87-b892-452d-919d-671aafc0bfcd',
    title: 'Improving Deep Neural Networks: Hyperparameter Tuning, Regularization and Optimization',
    issuer: 'DeepLearning.AI',
    issueDate: '2026-06',
    credentialUrl: 'https://coursera.org/verify/LN76AEO5ZWEX',
  },
  {
    id: '6ee0134a-845b-42f9-bd1a-607d1c9fbe7f',
    title: 'Neural Networks and Deep Learning',
    issuer: 'DeepLearning.AI',
    issueDate: '2026-05',
    credentialUrl: 'https://coursera.org/verify/BDQ6HLOZK618',
  },
  {
    id: 'dba31b6a-0420-47e6-b682-c09eb2e2b983',
    title: 'Claude Code 101 Certificate of Completion',
    issuer: 'Anthropic',
    issueDate: '2026-03',
    credentialUrl: 'https://verify.skilljar.com/c/5tty8v7ayt4k',
  },
  {
    id: '5d5f7a91-6b70-4d8f-afdb-efc28e610827',
    title: 'Foundations of AI and Machine Learning',
    issuer: 'Microsoft',
    issueDate: '2026-04',
    credentialUrl: 'https://coursera.org/verify/Z7FXQOWEPHXC',
  },
  {
    id: '1012557e-d4ed-490f-b47f-78db791bbb62',
    title: 'Gen AI: Beyond the Chatbot',
    issuer: 'Google Cloud Training Online',
    issueDate: '2026-04',
    credentialUrl: 'https://www.coursera.org/account/accomplishments/verify/LYFI48681LEN',
  },
  {
    id: '74105845-5213-4633-b7be-7f2c8f57709e',
    title: 'Claude 101 Certificate of Completion',
    issuer: 'Anthropic',
    issueDate: '2026-03',
    credentialUrl: 'https://verify.skilljar.com/c/5tty8v7ayt4k',
  },
  {
    id: '58eff12b-68ca-4fa2-86d2-ba36e6a00d35',
    title: 'Intro to Deep Learning',
    issuer: 'Kaggle',
    issueDate: '2026-03',
    credentialUrl: 'https://www.kaggle.com/learn/certification/sumit1703/intro-to-deep-learning',
  },
  {
    id: 'b84474a8-f061-40ec-917d-2bb40f64d4ce',
    title: 'Advanced SQL',
    issuer: 'Kaggle',
    issueDate: '2026-03',
    credentialUrl: 'https://www.kaggle.com/learn/certification/sumit1703/advanced-sql',
  },
  {
    id: '550fdff4-46a8-486a-a0ae-2c7cf395fc09',
    title: 'Intro to SQL',
    issuer: 'Kaggle',
    issueDate: '2026-03',
    credentialUrl: 'https://www.kaggle.com/learn/certification/sumit1703/intro-to-sql',
  },
  {
    id: '0fe2c168-07c6-4db4-b85f-ed2b017a36a8',
    title: 'Claude Code in Action',
    issuer: 'Anthropic',
    issueDate: '2026-03',
    credentialUrl: 'https://verify.skilljar.com/c/zxxhgh7ad5bp',
  },
  {
    id: '012cf960-4385-46c1-886c-8629040317fc',
    title: 'Intermediate Machine Learning',
    issuer: 'Kaggle',
    issueDate: '2026-03',
    credentialUrl: 'https://www.kaggle.com/learn/certification/sumit1703/intermediate-machine-learning',
  },
  {
    id: 'f5b24416-6ad3-4b40-9bb2-64da7d4efa1e',
    title: 'Feature Engineering',
    issuer: 'Kaggle',
    issueDate: '2026-03',
    credentialUrl: 'https://www.kaggle.com/learn/certification/sumit1703/feature-engineering',
  },
  {
    id: '45bd480e-db88-42d1-8244-658b7888a73f',
    title: 'Data Cleaning',
    issuer: 'Kaggle',
    issueDate: '2026-03',
    credentialUrl: 'https://www.kaggle.com/learn/certification/sumit1703/data-cleaning',
  },
  {
    id: '5dbc42ad-77e3-48c7-9b2e-89546fbd0af7',
    title: 'Cyber Security and Cryptography Bootcamp',
    issuer: 'National Institute of Electronics and Information Technology (NIELIT) – Aurangabad',
    issueDate: '2026-03',
  },
  {
    id: 'f54b0a6e-0f8a-40c3-9d12-d1f20abf08ec',
    title: 'Data Visualization',
    issuer: 'Kaggle',
    issueDate: '2026-03',
    credentialUrl: 'https://www.kaggle.com/learn/certification/sumit1703/data-visualization',
  },
  {
    id: 'a5708b9c-f1ba-4954-8714-b3d2b9e96240',
    title: 'Pandas',
    issuer: 'Kaggle',
    issueDate: '2026-03',
    credentialUrl: 'https://www.kaggle.com/learn/certification/sumit1703/pandas',
  },
  {
    id: 'ba3bac27-c907-45d0-a272-f2e6ceeb7c15',
    title: 'Introduction to Programming Using Python',
    issuer: 'Kaggle',
    issueDate: '2026-03',
    credentialUrl: 'https://www.kaggle.com/learn/certification/sumit1703/python',
  },
  {
    id: '6e5ec9bb-079f-4083-b538-3ec25de9c905',
    title: 'Intro to Machine Learning',
    issuer: 'Kaggle',
    issueDate: '2026-03',
    credentialUrl: 'https://www.kaggle.com/learn/certification/sumit1703/intro-to-machine-learning',
  },
]
