import { defineType, defineField } from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'announcementBanner',
      title: 'Announcement Banner',
      type: 'object',
      fields: [
        { name: 'enabled', type: 'boolean', title: 'Show Banner', initialValue: true },
        {
          name: 'text',
          type: 'object',
          title: 'Banner Text',
          fields: [
            { name: 'en', type: 'string', title: 'English' },
            { name: 'ko', type: 'string', title: '한국어' },
            { name: 'ja', type: 'string', title: '日本語' },
            { name: 'zh', type: 'string', title: '中文' },
            { name: 'th', type: 'string', title: 'ภาษาไทย' },
            { name: 'vi', type: 'string', title: 'Tiếng Việt' },
          ],
        },
        {
          name: 'cta',
          type: 'object',
          title: 'CTA Button',
          fields: [
            { name: 'label', type: 'string', title: 'Label' },
            { name: 'href', type: 'string', title: 'URL' },
          ],
        },
      ],
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social Links',
      type: 'object',
      fields: [
        { name: 'linkedin', type: 'url', title: 'LinkedIn' },
        { name: 'facebook', type: 'url', title: 'Facebook' },
        { name: 'instagram', type: 'url', title: 'Instagram' },
        { name: 'youtube', type: 'url', title: 'YouTube' },
      ],
    }),
    defineField({
      name: 'defaultSeo',
      title: 'Default SEO',
      type: 'seo',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Site Settings' }
    },
  },
})
