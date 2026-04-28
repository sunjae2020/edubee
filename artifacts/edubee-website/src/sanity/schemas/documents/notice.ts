import { defineType, defineField } from 'sanity'

export const notice = defineType({
  name: 'notice',
  title: 'Notice',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
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
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title.en', maxLength: 96 },
      validation: R => R.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'object',
      fields: [
        { name: 'en', type: 'array', title: 'English', of: [{ type: 'block' }] },
        { name: 'ko', type: 'array', title: 'Korean', of: [{ type: 'block' }] },
        { name: 'ja', type: 'array', title: '日本語', of: [{ type: 'block' }] },
        { name: 'zh', type: 'array', title: '中文', of: [{ type: 'block' }] },
        { name: 'th', type: 'array', title: 'ภาษาไทย', of: [{ type: 'block' }] },
        { name: 'vi', type: 'array', title: 'Tiếng Việt', of: [{ type: 'block' }] },
      ],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
    }),
    defineField({
      name: 'important',
      title: 'Important Notice',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: 'title.en', date: 'publishedAt' },
    prepare({ title, date }) {
      return {
        title: title || 'Untitled Notice',
        subtitle: date ? new Date(date).toLocaleDateString() : '',
      }
    },
  },
})
