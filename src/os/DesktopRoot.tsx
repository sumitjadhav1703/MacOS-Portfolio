'use client'

import { ContentProvider } from './content'
import { Desktop } from './shell/Desktop'
import { OsProvider } from './store'
import type { Content } from '../data/content'
import type { AppId } from './types'

/**
 * Client boundary for the whole desktop. Server components (the routes) render this and
 * pass which window should be open on arrival — that is how /projects/<slug> lands on the
 * project it advertises.
 */
export function DesktopRoot({ initialApp, content }: { initialApp?: AppId; content?: Content }) {
  return (
    <ContentProvider initial={content}>
      <OsProvider>
        <Desktop initialApp={initialApp} />
      </OsProvider>
    </ContentProvider>
  )
}
