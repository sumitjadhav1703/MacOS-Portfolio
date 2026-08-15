import { ImageResponse } from 'next/og'
import { getContent } from '../src/data/server'
import { OG_SIZE, OgCard } from '../src/og/card'

export const alt = "Sumit Jadhav — Portfolio OS"
export const size = OG_SIZE
export const contentType = 'image/png'

export default async function Image() {
  const { projects } = await getContent()
  return new ImageResponse(
    (
      <OgCard
        title="Sumit Jadhav"
        tagline="AI & Data Science · an interactive desktop portfolio"
        stack={['Generative AI', 'RAG systems', 'Deep learning', `${projects.length} projects`]}
        status={{ label: 'Open to AI/ML internships', ok: true }}
        windowTitle="About"
      />
    ),
    size,
  )
}
