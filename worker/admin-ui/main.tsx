import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
// The desktop's stylesheet, for its --s-* palette. The chrome selectors inside it key off ids
// this page does not use, so only the custom properties apply.
import '../../src/styles/os.css'
import './admin.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
