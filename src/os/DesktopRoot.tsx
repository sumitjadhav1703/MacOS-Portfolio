'use client'

import { Desktop } from './shell/Desktop'
import { OsProvider } from './store'
import type { AppId } from './types'

/**
 * Client boundary for the whole desktop. Server components (the routes) render this and
 * pass which window should be open on arrival — that is how /projects/<slug> lands on the
 * project it advertises.
 */
export function DesktopRoot({ initialApp }: { initialApp?: AppId }) {
  return (
    <OsProvider>
      <Desktop initialApp={initialApp} />
    </OsProvider>
  )
}
