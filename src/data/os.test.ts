import { describe, expect, it } from 'vitest'
import { FALLBACK, answerFrom } from './content'
import { PROJECTS, slugOf } from './projects'
import { AI_SUGGESTIONS, KB, PROJ_ALIAS, TERM } from './os'

/**
 * Ask Sumit answers through Workers AI when an API origin is configured. When one is not —
 * a cloned standalone build, or a deploy that lost its env var — every answer comes from
 * `KB` instead, and a keyword it does not hold returns `AI_FALLBACK`.
 *
 * A recruiter evaluating AI work types "RAG" before anything else, so that word falling
 * through is worse than no assistant at all: it says the portfolio does not contain the one
 * thing it is built to show. This file is the guard on that vocabulary.
 */
const RECRUITER_VOCABULARY = [
  'What did Sumit build with RAG?',
  'Has he used retrieval augmented generation?',
  'Any LLM work?',
  'Does he know large language models?',
  'What generative AI has he shipped?',
  'Tell me about his GenAI experience',
  'Is there any NLP or transformer work?',
  'How much deep learning has he done?',
  'What machine learning does he do?',
  'Has he fine-tuned a model?',
  'Does he do prompt engineering?',
  'What are his skills?',
  'Which frameworks does he use?',
  'Does he know PyTorch?',
  'TensorFlow experience?',
  'Has he used scikit-learn?',
  'Does he use LangChain?',
  'Any experience with Mistral?',
  'What about embeddings?',
  'Has he worked with a vector database?',
  'Does he know pgvector?',
  'Anything multimodal?',
  'Has he deployed anything to production?',
  'Does he use Docker?',
  'FastAPI experience?',
  'Is anything on Hugging Face?',
  'Tell me about the ConvLSTM work',
  'What is the Fourier Neural Operator project?',
  'Any time series forecasting?',
  'Has he done remote sensing?',
  'What unsupervised work has he done?',
  'Tell me about the multi-agent orchestration',
  'Any supervised classification?',
  'Where does he study?',
  'What is his B.Tech in?',
  'Is he available for an internship?',
  'What role is he looking for?',
  'How do I reach him?',
  'What is his email?',
  'How is this site built?',
  'Is it React?',
  // The seven projects the CMS added after this index was first written.
  'Tell me about the movie recommender',
  'Has he done anything with TF-IDF?',
  'What is the LinkedIn Post Agent?',
  'Any LangGraph work?',
  'Does he do human-in-the-loop agents?',
  'Tell me about the BiGRU emotion classifier',
  'Any sentiment analysis?',
  'What is Mental Health Score?',
  'Has he used Random Forest?',
  'Tell me about next word prediction',
  'Any LSTM work?',
  'What is the heart disease project?',
  'Has he used KNN?',
  'Has he done any credit risk modelling?',
  'Does he use XGBoost?',
  'Any explainable AI or SHAP work?',
  'Has he calibrated a classifier?',
  'What graph neural network work has he done?',
  'Does he know GNNs?',
  'Any PyTorch Geometric experience?',
  'Tell me about the Cora citation network project',
]

describe('Ask Sumit offline index', () => {
  it('answers every question a recruiter arrives with', () => {
    for (const question of RECRUITER_VOCABULARY) {
      expect(answerFrom(FALLBACK, question), question).not.toBe(FALLBACK.os.aiFallback)
    }
  })

  it('answers its own suggestion chips', () => {
    for (const chip of AI_SUGGESTIONS) {
      expect(answerFrom(FALLBACK, chip), chip).not.toBe(FALLBACK.os.aiFallback)
    }
  })

  it('routes each question to the answer it asked for, not the first short key that matched', () => {
    const cases: [string, string][] = [
      ['What is his email?', 'jadhavsumit534@gmail.com'],
      ['What did Sumit build with RAG?', 'RAG and multi-modal pipeline'],
      ['Does he know PyTorch?', 'Python first'],
      ['Tell me about the SAR crop-yield work', 'SAR Crop Yield Forecasting'],
      ['Any LLM work?', 'generative AI and applied deep learning'],
      // Both of these arrived after the last sync and are the reason for this one. `graph`
      // and `credit` are short enough to be caught by something earlier if the order slips.
      ['Does he use XGBoost?', 'Credit Risk ML System'],
      ['Tell me about the Cora citation network project', 'Graph Convolutional Network'],
    ]
    for (const [question, expected] of cases) {
      expect(answerFrom(FALLBACK, question), question).toContain(expected)
    }
  })

  it('still falls back on a question the portfolio genuinely cannot answer', () => {
    expect(answerFrom(FALLBACK, 'What is the capital of France?')).toBe(FALLBACK.os.aiFallback)
  })

  it('keeps every keyword lowercase, since the matcher lowercases the question only', () => {
    for (const [keys] of KB) {
      for (const key of keys) expect(key, key).toBe(key.toLowerCase())
    }
  })
})

/**
 * Drift guards.
 *
 * `src/data` is the compiled-in mirror of what the CMS serves, and it had gone badly out of
 * step: `project-lazarus` still shipped a prerendered page and a knowledge-base entry for a
 * project the CMS no longer holds, `project-sar` claimed `/projects/sar` while D1 had renamed
 * it `sar-yield`, and the Shell's own `projects` listing named six of twelve. Nothing failed,
 * because nothing checked that these five lists agreed with each other.
 */
describe('the compiled-in content agrees with itself', () => {
  const ids = new Set(PROJECTS.map((p) => p.id))
  const slugs = PROJECTS.map(slugOf)

  it('answers for every published project by name', () => {
    for (const project of FALLBACK.projects) {
      expect(answerFrom(FALLBACK, project.title), project.title).not.toBe(FALLBACK.os.aiFallback)
      expect(answerFrom(FALLBACK, project.desktopLabel), project.desktopLabel).not.toBe(
        FALLBACK.os.aiFallback,
      )
    }
  })

  it('aliases only point at projects that exist', () => {
    for (const [alias, target] of Object.entries(PROJ_ALIAS)) {
      expect(ids.has(target), `${alias} → ${target}`).toBe(true)
    }
  })

  it('gives every project a desktop label', () => {
    for (const project of FALLBACK.projects) {
      expect(project.desktopLabel.length, project.id).toBeGreaterThan(0)
    }
  })

  it("lists exactly the published slugs in the Shell's `projects` output", () => {
    const listed = TERM.projects.split('→')[0]!.split('·').map((s) => s.trim())
    expect(listed.sort()).toEqual([...slugs].sort())
  })

  it('offers a `project <name>` example the Shell can actually resolve', () => {
    const example = TERM.projects.split('→ try: project ')[1]?.trim()
    expect(example).toBeTruthy()
    expect(slugs.includes(example!) || example! in PROJ_ALIAS, example).toBe(true)
  })
})
