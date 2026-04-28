import { defineType, defineField } from 'sanity'

export const heroBanner = defineType({
  name: 'heroBanner',
  title: 'Hero Banner',
  type: 'document',
  fields: [
    defineField({
      name: 'active',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'headline',
      title: 'Headline',
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
      name: 'subheadline',
      title: 'Subheadline',
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
      name: 'ctaPrimary',
      title: 'Primary CTA',
      type: 'object',
      fields: [
        { name: 'label', type: 'string', title: 'Label' },
        { name: 'href', type: 'string', title: 'URL' },
      ],
    }),
    defineField({
      name: 'ctaSecondary',
      title: 'Secondary CTA',
      type: 'object',
      fields: [
        { name: 'label', type: 'string', title: 'Label' },
        { name: 'href', type: 'string', title: 'URL' },
      ],
    }),
    defineField({
      name: 'backgroundImage',
      title: 'Background Image',
      type: 'image',
      options: { hotspot: true },
    }),
  ],
  preview: {
    select: { title: 'headline.en', active: 'active' },
    prepare({ title, active }) {
      return { title: title || 'Hero Banner', subtitle: active ? '✅ Active' : '⏸ Inactive' }
    },
  },
})
