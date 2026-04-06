interface JsonLdProps {
  type: 'Organization' | 'WebSite' | 'FAQPage' | 'Article' | 'SoftwareApplication'
  data?: Record<string, any>
}

export function JsonLd({ type, data = {} }: JsonLdProps) {
  const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.edubee.co'

  const schemas: Record<string, object> = {
    Organization: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Edubee CRM',
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'info@edubee.co',
        contactType: 'customer support',
        areaServed: 'Worldwide',
      },
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Suite 804, 343 Little Collins Street',
        addressLocality: 'Melbourne',
        addressRegion: 'VIC',
        postalCode: '3000',
        addressCountry: 'AU',
      },
      sameAs: [],
      ...data,
    },
    WebSite: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Edubee CRM',
      url: SITE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
      ...data,
    },
    FAQPage: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [],
      ...data,
    },
    Article: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      publisher: {
        '@type': 'Organization',
        name: 'Edubee CRM',
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
      },
      ...data,
    },
    SoftwareApplication: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Edubee CRM',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'AUD',
      },
      ...data,
    },
  }

  const schema = schemas[type] || {}

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  )
}
