// Tool inputs. Every field is bounded and every object is strict, so nothing a caller sends can
// name a table, a column, a file, a URL or a piece of SQL — there is no field to put one in.

import { z } from 'zod'
import { DOC_TYPES } from './types'
import { MAX_RESULTS, PROFILE_SECTIONS } from './retrieval'

const slug = z.string().regex(/^[a-z0-9-]{1,80}$/, 'Expected a lowercase slug.')

export const searchInput = z
  .object({
    query: z.string().trim().min(1).max(300).describe('What to look for, in plain words.'),
    type: z.enum(['all', ...DOC_TYPES]).optional().describe('Restrict to one kind of record. Default all.'),
    project: slug.optional().describe('Restrict to one project, by slug (see list_projects).'),
    limit: z.number().int().min(1).max(MAX_RESULTS).optional().describe(`At most ${MAX_RESULTS}. Default 5.`),
  })
  .strict()

export const getInput = z
  .object({
    id: z
      .string()
      .regex(/^[a-z]+:[a-z0-9-]{1,80}(\/[a-z0-9-]{1,80})?$/, 'Expected an id returned by search_context.')
      .describe('An id from search_context or list_projects, e.g. "project:sar-yield".'),
    section: slug
      .optional()
      .describe('Optional section, e.g. overview, methodology, architecture, dataset, results, metrics, deployment.'),
  })
  .strict()

export const listInput = z.object({}).strict()

export const profileInput = z
  .object({
    section: z.enum(PROFILE_SECTIONS).optional().describe('One part of the profile. Default: all of it.'),
  })
  .strict()
