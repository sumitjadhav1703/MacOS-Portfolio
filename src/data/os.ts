import type { AppId } from '../os/types'

/** Shell responses. Values render as plain text unless listed in TERM_HTML. */
export const TERM: Record<string, string> = {
  help: 'Commands: about, projects, project <name>, skills, education, experience, resume, contact, links, whoami, neofetch, open <app>, clear',
  about:
    'Sumit Jadhav — third-year B.Tech, AI & Data Science, JNEC / MGM University. Focus: generative AI, RAG, applied deep learning.',
  // Seed only. `Terminal.tsx` builds this line from the published projects instead of printing
  // it, the way the neofetch "Projects" count is derived — a hand-kept copy of the project
  // list is exactly the thing that drifts, and this one did.
  projects:
    'pm25 · sar-yield · airbnb · movie-recommendation-system · emotion-classification-pipeline · credit-risk-ml-system · emotion-classification-with-bigru · heart-disease-risk-prediction · next-word-prediction · mental-health-score · ai-video · multi-agent · linkedin-post-agent · research-topic-classification  → try: project credit',
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
  ['Projects', '14'],
  ['Status', 'Ready'],
]

/**
 * Short names the Shell's `project <name>` accepts beyond the slug itself.
 *
 * The CMS slugs grew long — `emotion-classification-with-bigru` is not something anyone types —
 * so every project keeps a handle. `project-lazarus` and `project-sar` are gone from here
 * because they are gone from the CMS; pointing an alias at a project that no longer exists is
 * how `/projects/sar` came to be the one URL nothing served.
 */
export const PROJ_ALIAS: Record<string, AppId> = {
  video: 'project-ai-video',
  rag: 'project-ai-video',
  'pm2.5': 'project-pm25',
  pollution: 'project-pm25',
  sar: 'project-sar-yield',
  yield: 'project-sar-yield',
  agents: 'project-multi-agent',
  nyc: 'project-airbnb',
  movies: 'project-movie-recommendation-system',
  movie: 'project-movie-recommendation-system',
  linkedin: 'project-linkedin-post-agent',
  bigru: 'project-emotion-classification-with-bigru',
  'mental-health': 'project-mental-health-score',
  'next-word': 'project-next-word-prediction',
  heart: 'project-heart-disease-risk-prediction',
  'emotion-pipeline': 'project-emotion-classification-pipeline',
  credit: 'project-credit-risk-ml-system',
  'credit-risk': 'project-credit-risk-ml-system',
  cora: 'project-research-topic-classification',
  gnn: 'project-research-topic-classification',
  'research-topic': 'project-research-topic-classification',
}

/**
 * Ask Sumit's knowledge base: keyword list → answer. First match wins.
 * Seeds the CMS; the live matcher is `answerFrom` in src/data/content.ts.
 *
 * Keys are matched with `question.includes(key)`, so they must be the words a recruiter
 * actually types, not the words the answers happen to contain. The vocabulary an AI/ML
 * recruiter arrives with — rag, llm, langchain, pytorch, embeddings — is the whole point
 * of this index; `os.test.ts` fails if any of it falls through to `AI_FALLBACK`.
 *
 * Order matters twice over: the first hit wins, and a short key is a substring of longer
 * words. Project entries come before the broad ones so `langchain` reaches the project
 * that used it, and bare `ai` is deliberately absent — it is inside `email`.
 */
export const KB: [string[], string][] = [
  [
    [
      'ai video',
      'video assistant',
      'video',
      'rag',
      'retrieval',
      'langchain',
      'mistral',
      'pgvector',
      'vector db',
      'vector database',
      'embedding',
      'multimodal',
      'multi-modal',
      'chunk',
      'semantic search',
    ],
    'The AI Video Assistant is a RAG and multi-modal pipeline on LangChain, Mistral AI, FastAPI, Docker and pgvector, with a Streamlit interface. Transcribe, embed, retrieve, answer. It is the clearest example of retrieval-augmented generation in the portfolio.',
  ],
  [
    ['pm2.5', 'pm25', 'pollution', 'forecast', 'convlstm', 'fourier', 'neural operator', 'air quality', 'time series', 'spatio'],
    'PM2.5 Forecasting pairs ConvLSTM with a Fourier Neural Operator for grid pollution forecasting. Built for ANRF AISEHack Phase 2 at IIT Delhi and deployed on Hugging Face Spaces.',
  ],
  [
    ['sar', 'crop', 'yield', 'gujarat', 'sokhda', 'capella', 'satellite', 'remote sensing', 'x-band', 'radar', 'unsupervised', 'gdal', 'sentinel-2'],
    'SAR Crop Yield Forecasting is a validation-first yield pipeline for 966 farm plots in Sokhda, Gujarat, built on six Capella Space X-band SAR passes: they derive a season-complete canopy signal that modulates the yield estimate over 447.5 hectares — groundnut, maize, rice, bajra and cotton.',
  ],
  [
    [
      'credit risk',
      'credit',
      'xgboost',
      'shap',
      'explainab',
      'calibrat',
      'default probability',
      'underwriting',
      'loan',
      'tabular',
      'threshold',
    ],
    'The Credit Risk ML System estimates default probability with a calibrated XGBoost classifier — 5-fold sigmoid calibration, a decision threshold tuned on precision-recall F1 — and explains every prediction with SHAP. 92% test accuracy and 0.81 F1 on the default class over 6,305 held-out samples, served as a FastAPI endpoint with Pydantic validation and a browser underwriting dashboard.',
  ],
  [
    [
      'research topic',
      'cora',
      'graph neural',
      'gnn',
      'gcn',
      'citation',
      'pytorch geometric',
      'node classification',
      'graph',
      'onnx',
    ],
    'Research Topic Classification is a two-layer Graph Convolutional Network over the Cora citation network: 2,708 papers, 10,556 citation edges, 1,433-dimensional features, classified into seven topics. 79.2% accuracy and 0.782 macro-F1, against 58.1% for a random forest on the features alone — the citation edges are what the graph buys. Exported to ONNX and served through FastAPI with a Streamlit front end.',
  ],
  [
    ['movie', 'recommend', 'tf-idf', 'tfidf', 'cosine', 'similarity', 'content-based', 'collaborative'],
    'The Movie Recommendation System is content-based: TF-IDF over movie metadata with cosine similarity, served through FastAPI behind a Streamlit interface. Live demo, GitHub and API docs are all published.',
  ],
  [
    ['linkedin post', 'post agent', 'langgraph', 'human-in-the-loop', 'human in the loop', 'autonomous', 'content generation'],
    'The LinkedIn Post Agent is a LangGraph agent with two execution modes — human-in-the-loop, where a person approves or revises each draft, and fully autonomous generation. FastAPI behind a React and TypeScript front end, deployed and public.',
  ],
  [
    ['bigru', 'gru', 'emotion', 'sentiment', 'six-class', 'keras', 'text classification'],
    'Two emotion classifiers, deliberately: one is a Bidirectional GRU in TensorFlow/Keras serving six-class emotion over FastAPI, the other a TF-IDF and Logistic Regression pipeline with NLTK preprocessing on Streamlit. Same task, a deep model against a classical baseline.',
  ],
  [
    ['mental health', 'wellness', 'random forest', 'regression', 'student'],
    'Mental Health Score estimates a continuous student wellness score from demographic, social-media and lifestyle inputs using a tuned Random Forest regressor, served over FastAPI with Pydantic validation.',
  ],
  [
    ['next word', 'next-word', 'lstm', 'n-gram', 'ngram', 'autocomplete', 'language model'],
    'Next Word Prediction compares two approaches on the same corpus — an LSTM sequence model in TensorFlow and a lightweight n-gram model — over 3,038 quotes and an 8,978-word vocabulary, deployed on Streamlit.',
  ],
  [
    ['heart', 'disease', 'knn', 'k-nearest', 'clinical', 'risk prediction', 'medical'],
    'Heart Disease Risk Prediction classifies a case as low or high risk from clinical and exercise features with a K-Nearest Neighbours model on Streamlit. It is labelled educational on the card, because it is.',
  ],
  [
    ['multi-agent', 'multi agent', 'agent', 'research system', 'research ai', 'orchestrat', 'critic'],
    'The Multi-Agent Research System is a four-agent LangChain pipeline — Search, Reader, Writer, Critic. Self-rated 5/10: it was built to understand orchestration, not to ship.',
  ],
  [
    ['airbnb', 'nyc', 'classification', 'classifier', 'supervised', 'pandas'],
    'NYC Airbnb Room Type Classification is a Scikit-learn model served through FastAPI with Pandas doing the cleaning. The code is public on GitHub.',
  ],
  [
    [
      'stack',
      'tech',
      'tools',
      'language',
      'python',
      'skill',
      'framework',
      'librar',
      'pytorch',
      'tensorflow',
      'scikit',
      'sklearn',
      'opencv',
      'numpy',
    ],
    "Python first: PyTorch, TensorFlow, Scikit-learn, OpenCV. For generative AI it's LangChain, Mistral AI, FastAPI, Docker and pgvector. Application work is Electron, React and Vitest.",
  ],
  [
    [
      'generative',
      'genai',
      'gen ai',
      'llm',
      'large language',
      'nlp',
      'transformer',
      'deep learning',
      'neural net',
      'fine-tun',
      'fine tun',
      'prompt',
      'machine learning',
      ' ml ',
    ],
    'Sumit works on generative AI and applied deep learning: RAG pipelines on LangChain and Mistral AI, multi-agent orchestration, and spatio-temporal deep learning (ConvLSTM plus a Fourier Neural Operator). PyTorch and TensorFlow for the modelling, FastAPI and Docker to serve it.',
  ],
  [
    ['deploy', 'docker', 'fastapi', 'hugging face', 'huggingface', 'production', 'hosting', 'cloudflare', 'serve'],
    'Deployed work: PM2.5 Forecasting on Hugging Face Spaces, the AI Video Assistant behind FastAPI in Docker, and this desktop itself on Vercel with a Cloudflare Worker over D1 and R2 serving its content and Workers AI answering these questions.',
  ],
  [
    ['education', 'college', 'study', 'degree', 'jnec', 'university', 'mgm', 'b.tech', 'btech', 'diploma', 'cgpa', 'graduat'],
    "Third-year B.Tech in AI & Data Science at MGM's Jawaharlal Nehru Engineering College, MGM University, entered by lateral transfer from a Diploma in Computer Engineering.",
  ],
  [
    ['experience', 'intern', 'hire', 'job', 'work', 'available', 'opportunit', 'role', 'position', 'notice period', 'relocat'],
    'Sumit is targeting an AI/ML engineering internship. The track record is competition and independent work: two ANRF AISEHack entries and twelve published projects, most of them deployed — RAG, multi-agent, NLP classifiers and spatio-temporal forecasting.',
  ],
  [
    ['contact', 'email', 'reach', 'linkedin', 'github', 'kaggle', 'phone', 'call'],
    'Email jadhavsumit534@gmail.com. Also on GitHub (sumitjadhav1703), Kaggle and Hugging Face (sumit1703) and LinkedIn (sumit-jadhav-1703s).',
  ],
  [
    ['code', 'source', 'how is this built', 'this site', 'desktop', 'next.js', 'nextjs', 'react', 'typescript'],
    'This desktop is a React and TypeScript application built with Next.js — the window manager, dock, Shell and search are all components. Open the Code app to read the sources.',
  ],
  [
    ['resume', 'cv', 'download'],
    "The resume is a PDF. Grab it from the Resume button in the menu bar, the Resume app, or ask the Shell for 'resume'.",
  ],
  [
    ['project', 'portfolio', 'what have you built', 'show me'],
    'Twelve published projects: the AI Video Assistant (RAG), PM2.5 Forecasting, SAR Crop Yield Forecasting, the Multi-Agent Research System, the LinkedIn Post Agent, the NYC Airbnb classifier, a movie recommender, two emotion classifiers, Mental Health Score, Next Word Prediction and Heart Disease Risk Prediction. Ask about any of them.',
  ],
]

/**
 * The reply when nothing matches. It names real projects on purpose: the previous version
 * offered "Lazarus Sentinel" and "SAR crop mapping", neither of which is in the portfolio any
 * more, so the one message whose whole job is to redirect was sending people nowhere.
 */
export const AI_FALLBACK =
  "I only know Sumit's portfolio. Try asking about the AI Video Assistant's RAG pipeline, PM2.5 forecasting, SAR crop-yield forecasting, the multi-agent research system, the credit-risk model, the Cora graph classifier, the LinkedIn post agent, the emotion classifiers, his stack, education or how to reach him."

/**
 * The chips shown before the first question. Seed values only — the live list comes from
 * `os.aiSuggestions` in D1 and is editable in /admin, so these are what a standalone build
 * ships with, not a list to keep in step with the projects.
 *
 * Written for the person actually reading: a recruiter deciding in thirty seconds whether the
 * portfolio is worth more of their time.
 */
export const AI_SUGGESTIONS = [
  'What has Sumit built with RAG?',
  'Which projects are deployed and public?',
  'What ML technologies does Sumit use?',
  'Tell me about the SAR crop-yield work',
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
