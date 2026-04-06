export const ALL_POSTS_QUERY = `*[_type=="blogPost"]|order(publishedAt desc){_id,slug,title,excerpt,coverImage,category,publishedAt,featured}`

export const FEATURED_POSTS_QUERY = `*[_type=="blogPost"&&featured==true]|order(publishedAt desc)[0...3]{_id,slug,title,excerpt,coverImage,category,publishedAt}`

export const POST_BY_SLUG_QUERY = `*[_type=="blogPost"&&slug.current==$slug][0]{_id,slug,title,body,coverImage,category,publishedAt,seo}`

export const ALL_FAQ_QUERY = `*[_type=="faqItem"]|order(order asc){_id,question,answer,category,order}`

export const FAQ_BY_CATEGORY_QUERY = `*[_type=="faqItem"&&category==$category]|order(order asc){_id,question,answer,order}`

export const ALL_PRICING_QUERY = `*[_type=="pricingPlan"]|order(order asc){_id,planName,order,price,badge,features,highlighted,comingSoon}`

export const ALL_NOTICES_QUERY = `*[_type=="notice"]|order(publishedAt desc){_id,title,slug,publishedAt,isImportant}`

export const NOTICE_BY_SLUG_QUERY = `*[_type=="notice"&&slug.current==$slug][0]{_id,title,slug,body,publishedAt,isImportant}`

export const NOTICE_BY_ID_QUERY = `*[_type=="notice"&&_id==$id][0]{_id,title,slug,body,publishedAt,isImportant}`

export const SITE_SETTINGS_QUERY = `*[_type=="siteSettings"][0]{announcementBanner,socialLinks,defaultSeo}`

export const HERO_BANNER_QUERY = `*[_type=="heroBanner"&&active==true][0]{headline,subheadline,ctaPrimary,ctaSecondary,backgroundImage}`

export const ACTIVE_HERO_QUERY = `*[_type=="heroBanner"&&active==true][0]{headline,subheadline,ctaPrimary,ctaSecondary,backgroundImage}`

export const ALL_PLANS_QUERY = `*[_type=="pricingPlan"]|order(order asc){_id,planName,order,price,badge,limits,features,highlighted,comingSoon}`

export const SITEMAP_QUERY = `{
  "posts": *[_type=="blogPost"]{slug,_updatedAt},
  "notices": *[_type=="notice"]{slug,_updatedAt}
}`
