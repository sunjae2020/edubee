import { defineType, defineField } from 'sanity'

export const pricingPlan = defineType({
  name: 'pricingPlan',
  title: 'Pricing Plan',
  type: 'document',
  fields: [
    defineField({
      name: 'planName',
      title: 'Plan Name',
      type: 'string',
      validation: R => R.required(),
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
    }),
    defineField({
      name: 'price',
      title: 'Pricing',
      type: 'object',
      fields: [
        { name: 'amount', type: 'number', title: 'Amount AUD/mo (0=Free)' },
        { name: 'isFree', type: 'boolean', title: 'Is Free Plan', initialValue: false },
        { name: 'isComingSoon', type: 'boolean', title: 'Coming Soon', initialValue: false },
      ],
    }),
    defineField({
      name: 'badge',
      title: 'Badge Label (e.g. "Most Popular", "Beta Free")',
      type: 'string',
    }),
    defineField({
      name: 'limits',
      title: 'Limits',
      type: 'object',
      fields: [
        { name: 'students', type: 'number', title: 'Students/mo (0=unlimited)' },
        { name: 'storage', type: 'string', title: 'Storage (e.g. "5 GB")' },
        { name: 'schoolDb', type: 'boolean', title: 'School DB Access' },
        { name: 'remoteSupport', type: 'boolean', title: 'Remote Support' },
        { name: 'branches', type: 'number', title: 'Branch Accounts (0=unlimited)' },
      ],
    }),
    defineField({
      name: 'features',
      title: 'Features',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'text', type: 'string', title: 'Feature Text' },
            { name: 'included', type: 'boolean', title: 'Included', initialValue: true },
          ],
        },
      ],
    }),
    defineField({
      name: 'highlighted',
      title: 'Highlight this plan (most popular)',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'comingSoon',
      title: 'Coming Soon (disable CTA)',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  orderings: [
    { title: 'Display Order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'planName', subtitle: 'price.amount' },
    prepare({ title, subtitle }) {
      return { title, subtitle: subtitle === 0 ? 'Free' : `AUD $${subtitle}/mo` }
    },
  },
})
