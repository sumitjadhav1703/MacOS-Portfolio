// Project Interview: the questions a technical interviewer would ask about one project, derived
// from what the project actually documents. Each question points at the section that answers it,
// and the window reveals that section — the stored text, not a model's paraphrase — so nothing
// the interview says can be more than the portfolio already says. A project with no documented
// material gets no questions; there is no generic fallback list.

import type { ProjectSection } from './projects'

export type InterviewCategory =
  | 'Problem understanding'
  | 'Architecture decisions'
  | 'Failure analysis'
  | 'Experiments'
  | 'Results'
  | 'Improvements'

export type InterviewQuestion = {
  category: InterviewCategory
  question: string
  /** The section that answers it, by position in `project.sections`. */
  section: number
}

export function interviewQuestions(sections: ProjectSection[]): InterviewQuestion[] {
  const out: InterviewQuestion[] = []
  sections.forEach((section, i) => {
    const { body } = section
    const heading = section.heading?.trim()
    const ask = (category: InterviewCategory, question: string) => out.push({ category, question, section: i })
    if ('decision' in body) {
      const others = body.decision.options.filter((o) => o !== body.decision.chosen)
      ask(
        'Architecture decisions',
        others.length
          ? `Why ${body.decision.chosen} rather than ${others.join(' or ')}?`
          : `${body.decision.question} Why ${body.decision.chosen}?`,
      )
    } else if ('incident' in body) {
      ask('Failure analysis', `What went wrong with "${body.incident.title}", and how did you find the root cause?`)
    } else if ('timeline' in body) {
      if (body.timeline.length > 1) ask('Experiments', 'Walk me through how this project changed — what evidence caused each iteration?')
    } else if ('limits' in body) {
      if (body.limits.length) ask('Improvements', body.limits.some((l) => l[2]) ? 'What are the known limitations, and what would you improve next?' : 'What are the known limitations, and why do they matter?')
    } else if ('flow' in body) {
      if (body.flow.length) ask('Architecture decisions', `Walk me through the ${heading ? heading.toLowerCase() : 'pipeline'}.`)
    } else if ('metrics' in body) {
      const first = body.metrics[0]
      if (first) ask('Results', `How was ${first[0]} measured, and what does ${first[1]} tell you?`)
    } else if ('text' in body && i === 0 && body.text.trim()) {
      ask('Problem understanding', 'What problem does this project solve?')
    }
  })
  return out
}
