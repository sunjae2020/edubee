import { defineType, defineField } from 'sanity'

export const blogPost = defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'object',
      validation: R => R.required(),
      fields: [
        { name: 'en', type: 'string', title: 'English' },
        { name: 'ko', type: 'string', title: '한국어' },
        { name: 'ja', type: 'string', title: '日本語' },
        { name: 'zh', type: 'string', title: '中文' },
        { name: 'th', type: 'string', title: 'ภาษาไทย' },
        { name: 'vi', type: 'string', title: 'Tiếng Việt' },
      ],
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title.en', maxLength: 96 },
      validation: R => R.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'object',
      fields: [
        { name: 'en', type: 'text', title: 'English', rows: 3 },
        { name: 'ko', type: 'text', title: '한국어', rows: 3 },
        { name: 'ja', type: 'text', title: '日本語', rows: 3 },
        { name: 'zh', type: 'text', title: '中文', rows: 3 },
        { name: 'th', type: 'text', title: 'ภาษาไทย', rows: 3 },
        { name: 'vi', type: 'text', title: 'Tiếng Việt', rows: 3 },
      ],
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'object',
      fields: [
        { name: 'en', type: 'array', title: 'English', of: [{ type: 'block' }] },
        { name: 'ko', type: 'array', title: '한국어', of: [{ type: 'block' }] },
        { name: 'ja', type: 'array', title: '日本語', of: [{ type: 'block' }] },
        { name: 'zh', type: 'array', title: '中文', of: [{ type: 'block' }] },
        { name: 'th', type: 'array', title: 'ภาษาไทย', of: [{ type: 'block' }] },
        { name: 'vi', type: 'array', title: 'Tiếng Việt', of: [{ type: 'block' }] },
      ],
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { value: 'crm-tips', title: 'CRM Tips' },
          { value: 'study-abroad', title: 'Study Abroad' },
          { value: 'agency-management', title: 'Agency Management' },
          { value: 'product-updates', title: 'Product Updates' },
        ],
      },
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
  ],
  preview: {
    select: { title: 'title.en', media: 'coverImage' },
    prepare({ title, media }) {
      return { title: title || 'Untitled', media }
    },
  },
})
