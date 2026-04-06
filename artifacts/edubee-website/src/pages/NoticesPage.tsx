import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, Pin } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { FadeIn } from '@/components/ui/FadeIn'
import { PageBackground } from '@/components/ui/PageBackground'
import { sanityFetch } from '@/lib/sanity/client'
import { ALL_NOTICES_QUERY } from '@/lib/sanity/queries'
import { localise } from '@/lib/sanity/locale'

export default function NoticesPage() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [notices, setNotices] = useState<any[]>([])

  useEffect(() => {
    sanityFetch<any[]>(ALL_NOTICES_QUERY).then(d => setNotices(d || [])).catch(() => {})
  }, [])

  return (
    <div>
      <section className="py-16 bg-white border-b border-neutral-200 relative overflow-hidden">
        <PageBackground variant="wave" />
        <div className="max-w-[800px] mx-auto px-6 relative z-10">
          <FadeIn><h1 className="text-[28px] font-bold text-neutral-900">Notices</h1></FadeIn>
        </div>
      </section>
      <section className="py-12 bg-neutral-50">
        <div className="max-w-[800px] mx-auto px-6">
          {notices.length === 0 ? (
            <FadeIn><p className="text-neutral-400 text-sm text-center py-12">No notices yet.</p></FadeIn>
          ) : (
            <div className="space-y-3">
              {notices.map((notice, i) => (
                <FadeIn key={notice._id} delay={i * 50}>
                  <a
                    href={`/support/notices/${notice._id}`}
                    className="flex items-center justify-between p-5 bg-white border border-neutral-200 rounded-[12px] hover:border-[#F5821F] hover:shadow-[0_2px_12px_rgba(245,130,31,0.10)] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {notice.isImportant
                        ? <Pin size={15} className="text-[#F5821F] flex-shrink-0" />
                        : <Bell size={15} className="text-neutral-400 flex-shrink-0" />
                      }
                      <div>
                        {notice.isImportant && <Badge variant="brand" className="mb-1">Important</Badge>}
                        <p className="text-sm font-semibold text-neutral-900">{localise(notice.title, lang)}</p>
                      </div>
                    </div>
                    <span className="text-xs text-neutral-400 flex-shrink-0 ml-4">{notice.publishedAt?.slice(0, 10)}</span>
                  </a>
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
