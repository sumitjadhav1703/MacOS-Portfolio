import { ImageResponse } from 'next/og'
import { PROJECTS } from '../src/data/projects'
import { OG_SIZE, OgCard } from '../src/og/card'

export const alt = "Sumit Jadhav — Portfolio OS"
export const size = OG_SIZE
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <OgCard
        title="Sumit Jadhav"
        tagline="AI & Data Science · an interactive desktop portfolio"
        stack={['Generative AI', 'RAG systems', 'Deep learning', `${PROJECTS.length} projects`]}
        status={{ label: 'Open to AI/ML internships', ok: true }}
        windowTitle="About"
      />
    ),
    size,
  )
}
