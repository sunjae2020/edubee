import { urlFor } from '@/lib/sanity/client'
import { localise } from '@/lib/sanity/locale'

interface SeoInput {
  seo?: {
    metaTitle?: Record<string, string>
    metaDescription?: Record<string, string>
    ogImage?: any
    canonicalUrl?: string
    noIndex?: boolean
  }
  lang?: string
  pageUrl: string
  fallbackTitle?: string
  fallbackDescription?: string
}

export interface PageMetadata {
  title: string
  description: string
  canonical: string
  ogTitle: string
  ogDescription: string
  ogImage: string
  noIndex: boolean
  hreflang: Record<string, string>
}

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.edubee.co'

export function generatePageMetadata({
  seo,
  lang = 'en',
  pageUrl,
  fallbackTitle,
  fallbackDescription,
}: SeoInput): PageMetadata {
  const title =
    localise(seo?.metaTitle as any, lang) ||
    fallbackTitle ||
    'Edubee CRM — Study Abroad Agency Management Platform'

  const description =
    localise(seo?.metaDescription as any, lang) ||
    fallbackDescription ||
    'The all-in-one CRM for international education agencies. Manage students, schools, visas, tuition, and branches — cloud-based, from anywhere.'

  const ogImageUrl = seo?.ogImage
    ? (urlFor(seo.ogImage)?.width(1200).height(630).url() ?? `${SITE_URL}/og-image.svg`)
    : `${SITE_URL}/og-image.svg`

  const canonical = seo?.canonicalUrl || `${SITE_URL}${pageUrl}`

  const hreflang: Record<string, string> = {
    en: SITE_URL,
    ko: SITE_URL,
    ja: SITE_URL,
    zh: SITE_URL,
    th: SITE_URL,
    vi: SITE_URL,
    'x-default': SITE_URL,
  }

  return {
    title,
    description,
    canonical,
    ogTitle: title,
    ogDescription: description,
    ogImage: ogImageUrl,
    noIndex: seo?.noIndex ?? false,
    hreflang,
  }
}

export function applyPageMetadata(meta: PageMetadata) {
  document.title = meta.title

  const setMeta = (name: string, content: string, isProperty = false) => {
    const attr = isProperty ? 'property' : 'name'
    let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute(attr, name)
      document.head.appendChild(el)
    }
    el.content = content
  }

  setMeta('description', meta.description)
  setMeta('og:title', meta.ogTitle, true)
  setMeta('og:description', meta.ogDescription, true)
  setMeta('og:image', meta.ogImage, true)
  setMeta('og:url', meta.canonical, true)
  setMeta('og:type', 'website', true)
  setMeta('twitter:card', 'summary_large_image')
  setMeta('twitter:title', meta.ogTitle)
  setMeta('twitter:description', meta.ogDescription)
  setMeta('twitter:image', meta.ogImage)

  if (meta.noIndex) setMeta('robots', 'noindex,nofollow')

  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = meta.canonical
}
