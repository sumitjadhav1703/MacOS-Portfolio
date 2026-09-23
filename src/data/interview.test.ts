import { describe, expect, it } from 'vitest'
import { interviewQuestions } from './interview'
import type { ProjectSection } from './projects'

describe('interviewQuestions', () => {
  it('asks only what a section can answer, and points at that section', () => {
    const sections: ProjectSection[] = [
      { heading: 'What it is', body: { text: 'A forecaster.' } },
      {
        heading: 'Projection rule',
        body: {
          decision: {
            question: 'Which rule?',
            options: ['Flat hold', 'Decaying limb'],
            chosen: 'Flat hold',
            why: 'w',
            better: 'b',
            worse: 'x',
          },
        },
      },
      { body: { incident: { title: 'OOM on Render', expected: '', observed: '', cause: '', fix: '' } } },
      { heading: 'Results', body: { metrics: [['RMSE', '0.93']] } },
    ]
    expect(interviewQuestions(sections)).toEqual([
      { category: 'Problem understanding', question: 'What problem does this project solve?', section: 0 },
      { category: 'Architecture decisions', question: 'Why Flat hold rather than Decaying limb?', section: 1 },
      {
        category: 'Failure analysis',
        question: 'What went wrong with "OOM on Render", and how did you find the root cause?',
        section: 2,
      },
      { category: 'Results', question: 'How was RMSE measured, and what does 0.93 tell you?', section: 3 },
    ])
  })

  it('invents nothing for a project that documents nothing', () => {
    expect(interviewQuestions([])).toEqual([])
    expect(interviewQuestions([{ body: { metrics: [] } }, { body: { timeline: [['only', 'one']] } }])).toEqual([])
  })
})
