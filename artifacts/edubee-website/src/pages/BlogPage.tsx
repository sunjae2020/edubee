import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { FadeIn } from '@/components/ui/FadeIn'
import { PageBackground } from '@/components/ui/PageBackground'
import { sanityFetch, urlFor } from '@/lib/sanity/client'
import { ALL_POSTS_QUERY } from '@/lib/sanity/queries'
import { localise } from '@/lib/sanity/locale'

const CATEGORIES = [
  { value: '',             label: 'All' },
  { value: 'study-abroad', label: 'Study Abroad' },
  { value: 'edubee-news',  label: 'Edubee News' },
  { value: 'marketing',    label: 'Marketing' },
  { value: 'visa',         label: 'Visa' },
]

export default function BlogPage() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [posts, setPosts] = useState<any[]>([])
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sanityFetch<any[]>(ALL_POSTS_QUERY)
      .then(d => setPosts(d || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = category ? posts.filter(p => p.category === category) : posts

  return (
    <div>
      <section className="py-16 bg-white border-b border-neutral-200 relative overflow-hidden">
        <PageBackground variant="wave" />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <FadeIn>
            <h1 className="text-[32px] font-bold text-neutral-900 mb-6">Blog</h1>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    category === c.value
                      ? 'bg-[#F5821F] text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-[#FEF0E3] hover:text-[#F5821F]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-16 bg-neutral-50">
        <div className="max-w-[1280px] mx-auto px-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white border border-neutral-200 rounded-[12px] overflow-hidden animate-pulse">
                  <div className="h-48 bg-neutral-100" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 bg-neutral-100 rounded w-1/3" />
                    <div className="h-5 bg-neutral-100 rounded w-3/4" />
                    <div className="h-3 bg-neutral-100 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-neutral-400 text-sm">No posts yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((post, i) => {
                const title   = localise(post.title, lang)
                const excerpt = localise(post.excerpt, lang)
                const imgUrl  = post.coverImage ? urlFor(post.coverImage)?.width(640).height(360).url() : null
                return (
                  <FadeIn key={post._id} delay={i * 60}>
                    <a href={`/blog/${post.slug?.current}`} className="block h-full">
                      <Card hoverable className="overflow-hidden !p-0 h-full">
                        {imgUrl ? (
                          <img src={imgUrl} alt={title} className="w-full h-48 object-cover" />
                        ) : (
                          <div className="w-full h-48 bg-[#FEF0E3] flex items-center justify-center">
                            <span className="text-[#F5821F] font-bold text-2xl">e</span>
                          </div>
                        )}
                        <div className="p-5">
                          <div className="flex items-center gap-3 mb-3">
                            {post.category && <Badge variant="brand">{post.category}</Badge>}
                            {post.publishedAt && (
                              <span className="flex items-center gap-1 text-xs text-neutral-400">
                                <Calendar size={11} />{post.publishedAt.slice(0, 10)}
                              </span>
                            )}
                          </div>
                          <h2 className="text-base font-semibold text-neutral-900 mb-2 line-clamp-2">{title}</h2>
                          {excerpt && <p className="text-sm text-neutral-600 leading-relaxed line-clamp-3">{excerpt}</p>}
                        </div>
                      </Card>
                    </a>
                  </FadeIn>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
