import { Desktop } from './os/shell/Desktop'
import { OsProvider } from './os/store'

export default function App() {
  return (
    <OsProvider>
      <Desktop />
    </OsProvider>
  )
}
