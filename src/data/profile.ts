// Every link Sumit is reachable at, in one place. Transcribed from PROFILE_LINKS in
// legacy/portfolio-os.html.

export type ProfileLink = {
  /** Icon slug, resolved by lib/icons. */
  slug: string
  label: string
  handle: string
  url: string
  /** Shown as a pill in the About header, as well as in the Contact grid. */
  pill: boolean
}

export const PROFILE_LINKS: ProfileLink[] = [
  {
    slug: 'email',
    label: 'Email',
    handle: 'jadhavsumit534@gmail.com',
    url: 'mailto:jadhavsumit534@gmail.com',
    pill: false,
  },
  {
    slug: 'github',
    label: 'GitHub',
    handle: 'github.com/sumitjadhav1703',
    url: 'https://github.com/sumitjadhav1703',
    pill: true,
  },
  {
    slug: 'linkedin',
    label: 'LinkedIn',
    handle: 'linkedin.com/in/sumit-jadhav-1703s',
    url: 'https://linkedin.com/in/sumit-jadhav-1703s',
    pill: true,
  },
  {
    slug: 'kaggle',
    label: 'Kaggle',
    handle: 'kaggle.com/sumit1703',
    url: 'https://kaggle.com/sumit1703',
    pill: true,
  },
  {
    slug: 'huggingface',
    label: 'Hugging Face',
    handle: 'huggingface.co/sumit1703',
    url: 'https://huggingface.co/sumit1703',
    pill: true,
  },
]

export const EMAIL = 'jadhavsumit534@gmail.com'
