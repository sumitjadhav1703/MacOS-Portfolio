import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '../src/styles/os.css'
import { SITE_URL } from '../src/site-url'

const DESCRIPTION =
  'Sumit Jadhav — AI & Data Science. Generative AI, RAG systems and applied deep learning, presented as an interactive desktop.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sumit Jadhav — Portfolio OS",
    template: '%s — Sumit Jadhav',
  },
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: "Sumit Jadhav — Portfolio OS",
    title: "Sumit Jadhav — Portfolio OS",
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0e1013',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
