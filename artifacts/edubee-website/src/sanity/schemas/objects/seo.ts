import { defineType, defineField } from 'sanity'

export const seoObject = defineType({
  name: 'seo',
  title: 'SEO Settings',
  type: 'object',
  fields: [
    defineField({
      name: 'metaTitle',
      title: 'Meta Title (50-60 chars)',
      type: 'object',
      fields: [
        { name: 'en', type: 'string', title: 'English' },
        { name: 'ko', type: 'string', title: 'Korean' },
        { name: 'ja', type: 'string', title: '日本語' },
        { name: 'zh', type: 'string', title: '中文' },
        { name: 'th', type: 'string', title: 'ภาษาไทย' },
        { name: 'vi', type: 'string', title: 'Tiếng Việt' },
      ],
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description (120-160 chars)',
      type: 'object',
      fields: [
        { name: 'en', type: 'text', title: 'English', rows: 3 },
        { name: 'ko', type: 'text', title: 'Korean', rows: 3 },
        { name: 'ja', type: 'text', title: '日本語', rows: 3 },
        { name: 'zh', type: 'text', title: '中文', rows: 3 },
        { name: 'th', type: 'text', title: 'ภาษาไทย', rows: 3 },
        { name: 'vi', type: 'text', title: 'Tiếng Việt', rows: 3 },
      ],
    }),
    defineField({
      name: 'ogImage',
      title: 'OG Image (1200×630)',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'canonicalUrl',
      title: 'Canonical URL (optional)',
      type: 'url',
    }),
    defineField({
      name: 'noIndex',
      title: 'No Index',
      type: 'boolean',
      initialValue: false,
    }),
  ],
})
