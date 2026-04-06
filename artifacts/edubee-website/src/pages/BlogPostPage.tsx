import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'wouter'
import { PortableText } from '@portabletext/react'
import { ArrowLeft, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FadeIn } from '@/components/ui/FadeIn'
import { PageBackground } from '@/components/ui/PageBackground'
import { JsonLd } from '@/components/seo/JsonLd'
import { sanityFetch, urlFor } from '@/lib/sanity/client'
import { POST_BY_SLUG_QUERY } from '@/lib/sanity/queries'
import { localise, localiseBlock } from '@/lib/sanity/locale'

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    sanityFetch<any>(POST_BY_SLUG_QUERY, { slug })
      .then(setPost)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <div className="py-40 text-center text-neutral-400 text-sm">Loading...</div>
  if (!post) return (
    <div className="py-40 text-center">
      <h1 className="text-xl font-bold text-neutral-900 mb-4">Post not found</h1>
      <Button variant="secondary" href="/blog">← Back to Blog</Button>
    </div>
  )

  const title  = localise(post.title, lang)
  const body   = localiseBlock(post.body, lang)
  const imgUrl = post.coverImage ? urlFor(post.coverImage)?.width(1200).height(600).url() : null

  return (
    <div className="relative overflow-hidden">
      <PageBackground variant="dots" />
      <JsonLd type="Article" data={{ title, publishedAt: post.publishedAt, ogImage: imgUrl }} />
      <article className="max-w-[800px] mx-auto px-6 py-16 relative z-10">
        <FadeIn>
          <div className="mb-8">
            <a href="/blog" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-[#F5821F] transition-colors mb-6">
              <ArrowLeft size={14} /> Back to Blog
            </a>
            <div className="flex items-center gap-3 mb-4">
              {post.category && <Badge variant="brand">{post.category}</Badge>}
              {post.publishedAt && (
                <span className="flex items-center gap-1 text-xs text-neutral-400">
                  <Calendar size={11} />{post.publishedAt.slice(0, 10)}
                </span>
              )}
            </div>
            <h1 className="text-[28px] sm:text-[36px] font-bold text-neutral-900 leading-tight mb-6">{title}</h1>
          </div>
          {imgUrl && <img src={imgUrl} alt={title} className="w-full rounded-[12px] mb-10 object-cover max-h-[480px]" />}
          <div className="prose prose-neutral prose-sm sm:prose-base max-w-none prose-headings:font-bold prose-headings:text-neutral-900 prose-p:text-neutral-700 prose-p:leading-relaxed prose-a:text-[#F5821F] prose-a:no-underline hover:prose-a:underline prose-strong:text-neutral-900">
            {body.length > 0
              ? <PortableText value={body} />
              : <p className="text-neutral-400">Content coming soon.</p>
            }
          </div>
          <div className="mt-12 pt-8 border-t border-neutral-200">
            <Button variant="secondary" href="/blog">← Back to Blog</Button>
          </div>
        </FadeIn>
      </article>
    </div>
  )
}
