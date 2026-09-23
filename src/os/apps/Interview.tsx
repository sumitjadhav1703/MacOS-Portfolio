'use client'

import { useMemo, useState } from 'react'
import { Body, PageHead, SectionBody } from '../../components/primitives'
import { interviewQuestions } from '../../data/interview'
import { useContent } from '../content'
import { s } from '../css'

/**
 * Project Interview. The questions come from `interviewQuestions`, which only asks what a
 * project's own sections can answer, and "Show answer" reveals that section as stored. There is
 * no model in this window on purpose: an interview answer that could be made up would defeat the
 * point of having the evidence layer at all. Loaded with next/dynamic — it is not first paint.
 */
export function Interview() {
  const { projects } = useContent()
  const withQuestions = useMemo(
    () =>
      projects
        .map((project) => ({ project, questions: interviewQuestions(project.sections) }))
        .filter((entry) => entry.questions.length > 0)
        // Best-documented first, so the window opens on the project with the most to ask about.
        .sort((a, b) => b.questions.length - a.questions.length),
    [projects],
  )
  const [slug, setSlug] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [shown, setShown] = useState<Set<number>>(new Set())

  const current = withQuestions.find((e) => e.project.slug === slug) ?? withQuestions[0]
  if (!current) {
    return (
      <Body>
        <PageHead title="Project Interview" sub="No project documents enough material for interview questions yet." />
      </Body>
    )
  }

  const categories = [...new Set(current.questions.map((q) => q.category))]
  const questions = current.questions.filter((q) => !category || q.category === category)
  const toggle = (i: number) =>
    setShown((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  return (
    <Body>
      <PageHead
        title="Project Interview"
        sub="Questions an interviewer would ask, drawn only from what each project documents. Every answer is the project's own section."
      />
      <label style={s('display:flex;align-items:center;gap:10px;margin-top:16px;font-size:12.5px;color:var(--s-dim)')}>
        Project
        <select
          value={current.project.slug}
          onChange={(e) => {
            setSlug(e.target.value)
            setCategory(null)
            setShown(new Set())
          }}
          style={s(
            'flex:1;min-width:0;padding:7px 10px;border-radius:8px;border:1px solid var(--s-line);background:var(--s-fill);color:var(--s-text);font:inherit',
          )}
        >
          {withQuestions.map(({ project }) => (
            <option key={project.slug} value={project.slug}>
              {project.title}
            </option>
          ))}
        </select>
      </label>

      <div role="group" aria-label="Question category" style={s('display:flex;flex-wrap:wrap;gap:6px;margin-top:12px')}>
        {[null, ...categories].map((c) => {
          const active = c === category
          return (
            <button
              key={c ?? 'all'}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(c)}
              style={{
                ...s('padding:4px 11px;border-radius:999px;font:inherit;font-size:11.5px;border:1px solid var(--s-line);cursor:default'),
                background: active ? 'var(--s-accent)' : 'var(--s-fill-2)',
                color: active ? 'var(--s-on-accent)' : 'var(--s-text)',
              }}
            >
              {c ?? 'All'}
            </button>
          )
        })}
      </div>

      <ol style={s('list-style:none;margin:16px 0 0;padding:0;display:grid;gap:10px')}>
        {questions.map((q) => {
          const open = shown.has(q.section)
          const section = current.project.sections[q.section]!
          return (
            <li key={q.section} style={s('border:1px solid var(--s-line);border-radius:12px;padding:12px 14px;background:var(--s-fill)')}>
              <div style={s('font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--s-faint)')}>
                {q.category}
              </div>
              <div style={s('font-weight:600;font-size:13.5px;margin-top:3px')}>{q.question}</div>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggle(q.section)}
                style={s('margin-top:8px;padding:0;border:0;background:none;font:inherit;font-size:12px;color:var(--s-accent);cursor:default')}
              >
                {open ? 'Hide answer' : 'Show answer'}
              </button>
              {open ? (
                <div style={s('margin-top:10px;font-size:13px')}>
                  {section.heading ? (
                    <div style={s('font-size:11px;color:var(--s-dim);margin-bottom:6px')}>From “{section.heading}”</div>
                  ) : null}
                  <SectionBody section={section} />
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
      <div style={s('margin-top:16px;font-size:12px;color:var(--s-dim)')}>
        <a href={`/projects/${current.project.slug}`}>Read the full {current.project.title} write-up</a>
      </div>
    </Body>
  )
}
