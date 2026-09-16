import { describe, expect, it } from 'vitest'
import { FALLBACK, answerFrom } from './content'
import { AI_SUGGESTIONS, KB } from './os'

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
      ['Tell me about SAR Crop Mapping', 'SAR Crop Mapping'],
      ['Any LLM work?', 'generative AI and applied deep learning'],
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
