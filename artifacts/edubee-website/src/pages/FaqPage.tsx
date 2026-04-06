import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Accordion } from '@/components/ui/Accordion'
import { Input } from '@/components/ui/Input'
import { FadeIn } from '@/components/ui/FadeIn'
import { CtaBanner } from '@/components/sections/CtaBanner'
import { PageBackground } from '@/components/ui/PageBackground'
import { JsonLd } from '@/components/seo/JsonLd'
import { sanityFetch } from '@/lib/sanity/client'
import { ALL_FAQ_QUERY } from '@/lib/sanity/queries'
import { localise } from '@/lib/sanity/locale'

const STATIC_FAQ_KEYS = ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10']

export default function FaqPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [faqData, setFaqData] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    sanityFetch<any[]>(ALL_FAQ_QUERY).then(d => { if (d?.length) setFaqData(d) }).catch(() => {})
  }, [])

  const items = faqData.length > 0
    ? faqData.map(item => ({ question: localise(item.question, lang), answer: localise(item.answer, lang) }))
    : STATIC_FAQ_KEYS.map(k => ({ question: t(`faq.${k}`), answer: t(`faq.a${k.slice(1)}`) }))

  const filtered = search
    ? items.filter(item =>
        item.question.toLowerCase().includes(search.toLowerCase()) ||
        item.answer.toLowerCase().includes(search.toLowerCase())
      )
    : items

  const faqSchema = items.map(item => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  }))

  return (
    <div>
      <JsonLd type="FAQPage" data={{ mainEntity: faqSchema }} />
      <section className="py-20 bg-white border-b border-neutral-200 relative overflow-hidden">
        <PageBackground variant="dots" />
        <div className="max-w-[800px] mx-auto px-6 relative z-10">
          <FadeIn>
            <h1 className="text-[32px] font-bold text-neutral-900 mb-4 text-center">{t('faq.heading')}</h1>
            <div className="mt-6">
              <Input
                placeholder={t('faq.search')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </FadeIn>
        </div>
      </section>
      <section className="py-16 bg-neutral-50">
        <div className="max-w-[800px] mx-auto px-6">
          <FadeIn>
            {filtered.length > 0 ? (
              <Accordion items={filtered} />
            ) : (
              <p className="text-center text-sm text-neutral-500 py-8">{t('common.error')}</p>
            )}
          </FadeIn>
        </div>
      </section>
      <CtaBanner />
    </div>
  )
}
