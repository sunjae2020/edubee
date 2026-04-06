import { defineType, defineField } from 'sanity'

export const faqItem = defineType({
  name: 'faqItem',
  title: 'FAQ Item',
  type: 'document',
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
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
      name: 'answer',
      title: 'Answer',
      type: 'object',
      validation: R => R.required(),
      fields: [
        { name: 'en', type: 'text', title: 'English', rows: 4 },
        { name: 'ko', type: 'text', title: '한국어', rows: 4 },
        { name: 'ja', type: 'text', title: '日本語', rows: 4 },
        { name: 'zh', type: 'text', title: '中文', rows: 4 },
        { name: 'th', type: 'text', title: 'ภาษาไทย', rows: 4 },
        { name: 'vi', type: 'text', title: 'Tiếng Việt', rows: 4 },
      ],
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { value: 'general', title: 'General' },
          { value: 'billing', title: 'Billing & Plans' },
          { value: 'features', title: 'Features' },
          { value: 'security', title: 'Security' },
          { value: 'technical', title: 'Technical' },
        ],
      },
      initialValue: 'general',
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      initialValue: 99,
    }),
  ],
  preview: {
    select: { title: 'question.en' },
    prepare({ title }) {
      return { title: title || 'Untitled FAQ' }
    },
  },
  orderings: [
    { title: 'Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
})
