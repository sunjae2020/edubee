import { seoObject } from './objects/seo'
import { blogPost } from './documents/blogPost'
import { faqItem } from './documents/faqItem'
import { pricingPlan } from './documents/pricingPlan'
import { notice } from './documents/notice'
import { siteSettings } from './documents/siteSettings'
import { heroBanner } from './documents/heroBanner'

export const schemaTypes = [
  seoObject,
  blogPost,
  faqItem,
  pricingPlan,
  notice,
  siteSettings,
  heroBanner,
]
