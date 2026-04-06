import { useEffect, useState } from 'react'
import { useParams } from 'wouter'
import { useTranslation } from 'react-i18next'
import { PortableText } from '@portabletext/react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FadeIn } from '@/components/ui/FadeIn'
import { PageBackground } from '@/components/ui/PageBackground'
import { sanityFetch } from '@/lib/sanity/client'
import { NOTICE_BY_ID_QUERY } from '@/lib/sanity/queries'
import { localise, localiseBlock } from '@/lib/sanity/locale'

export default function NoticePage() {
  const { id } = useParams<{ id: string }>()
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [notice, setNotice] = useState<any>(null)

  useEffect(() => {
    if (!id) return
    sanityFetch<any>(NOTICE_BY_ID_QUERY, { id }).then(setNotice).catch(() => {})
  }, [id])

  if (!notice) return <div className="py-40 text-center text-neutral-400 text-sm">Loading...</div>

  return (
    <div className="relative overflow-hidden">
      <PageBackground variant="topography" />
      <article className="max-w-[800px] mx-auto px-6 py-16 relative z-10">
      <FadeIn>
        <a href="/support/notices" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-[#F5821F] mb-6">
          <ArrowLeft size={14} /> Back to Notices
        </a>
        {notice.isImportant && <Badge variant="brand" className="mb-4">Important</Badge>}
        <h1 className="text-[28px] font-bold text-neutral-900 mb-2">{localise(notice.title, lang)}</h1>
        <p className="text-xs text-neutral-400 mb-8">{notice.publishedAt?.slice(0, 10)}</p>
        <div className="prose prose-neutral prose-sm max-w-none prose-p:text-neutral-700 prose-p:leading-relaxed">
          <PortableText value={localiseBlock(notice.body, lang)} />
        </div>
        <div className="mt-10 pt-6 border-t border-neutral-200">
          <Button variant="secondary" href="/support/notices">← Back to Notices</Button>
        </div>
      </FadeIn>
    </article>
    </div>
  )
}
