import { getContent } from '../src/data/server'
import { DesktopRoot } from '../src/os/DesktopRoot'

/**
 * The desktop, prerendered with whatever content the CMS holds. `getContent` revalidates rather
 * than fetching per request, so the recruiter is served a static page from the edge and never
 * waits on the API — and the first paint already carries published content, with no swap.
 */
export default async function Home() {
  return <DesktopRoot content={await getContent()} />
}
