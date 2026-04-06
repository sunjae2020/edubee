import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HelpCircle, Mail, MapPin, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FadeIn } from '@/components/ui/FadeIn'
import { PageBackground } from '@/components/ui/PageBackground'
import { CtaBanner } from '@/components/sections/CtaBanner'
import { sanityFetch } from '@/lib/sanity/client'
import { ALL_FAQ_QUERY } from '@/lib/sanity/queries'
import { localise } from '@/lib/sanity/locale'

const STATIC_FAQ_KEYS = ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10']

function FaqAccordion({ items }: { items: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="bg-white border border-neutral-200 rounded-[12px] overflow-hidden hover:border-[#F5821F]/30 transition-colors">
          <button
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-sm font-semibold text-neutral-900">{item.question}</span>
            {open === i
              ? <ChevronUp size={16} className="text-[#F5821F] flex-shrink-0" />
              : <ChevronDown size={16} className="text-neutral-400 flex-shrink-0" />
            }
          </button>
          {open === i && (
            <div className="px-5 pb-4 text-sm text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function SupportPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [faqData, setFaqData] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    agencyName: '', yourName: '', phone: '', email: '', website: '', enquiryType: 'general', message: '',
  })
  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

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

  const handleSubmit = () => {
    const mailto = `mailto:info@edubee.co?subject=Enquiry from ${form.agencyName}&body=Agency: ${form.agencyName}%0AName: ${form.yourName}%0APhone: ${form.phone}%0AEmail: ${form.email}%0AType: ${form.enquiryType}%0A%0A${form.message}`
    window.location.href = mailto
    setSubmitted(true)
  }

  return (
    <div>
      {/* Hero */}
      <section className="pt-6 pb-20 bg-white border-b border-neutral-200 relative overflow-hidden">
        <PageBackground variant="dots" />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <FadeIn className="text-center max-w-2xl mx-auto">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#F5821F] mb-4 px-3 py-1 bg-[#FEF0E3] rounded-full">{t('supportPage.hero.eyebrow')}</span>
            <h1 className="text-[40px] font-bold text-neutral-900 mb-4 leading-tight">{t('supportPage.hero.heading')} <span className="text-[#F5821F]">{t('supportPage.hero.headingOrange')}</span></h1>
            <p className="text-base text-neutral-600 leading-relaxed">{t('supportPage.hero.sub')}</p>
          </FadeIn>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-neutral-50 relative overflow-hidden" id="faq">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <FadeIn className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FEF0E3] flex items-center justify-center">
                  <HelpCircle size={20} className="text-[#F5821F]" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-[#F5821F]">FAQ</span>
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-3">{t('supportPage.faq.heading')}</h2>
              <p className="text-sm text-neutral-500 mb-6">{t('supportPage.faq.sub')}</p>
              <Input
                placeholder={t('supportPage.faq.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div className="mt-8 bg-[#FEF0E3] rounded-[14px] p-6 relative overflow-hidden">
                <svg viewBox="0 0 200 140" className="w-full" fill="none">
                  <rect x="20" y="20" width="160" height="100" rx="10" fill="white" stroke="#F5821F" strokeWidth="1.5"/>
                  <rect x="35" y="35" width="80" height="8" rx="4" fill="#F5821F" opacity="0.3"/>
                  <rect x="35" y="50" width="130" height="6" rx="3" fill="#E5E7EB"/>
                  <rect x="35" y="62" width="110" height="6" rx="3" fill="#E5E7EB"/>
                  <rect x="35" y="80" width="80" height="8" rx="4" fill="#F5821F" opacity="0.3"/>
                  <rect x="35" y="95" width="130" height="6" rx="3" fill="#E5E7EB"/>
                  <rect x="35" y="107" width="90" height="6" rx="3" fill="#E5E7EB"/>
                  <circle cx="172" cy="35" r="6" fill="#F5821F" opacity="0.4"/>
                  <line x1="169" y1="35" x2="175" y2="35" stroke="white" strokeWidth="1.5"/>
                  <line x1="172" y1="32" x2="172" y2="38" stroke="white" strokeWidth="1.5"/>
                </svg>
              </div>
            </FadeIn>
            <FadeIn delay={100} className="lg:col-span-2">
              {filtered.length > 0
                ? <FaqAccordion items={filtered} />
                : <p className="text-center text-sm text-neutral-500 py-8">{t('common.error')}</p>
              }
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-white relative overflow-hidden" id="contact">
        <PageBackground variant="wave" />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <FadeIn className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FEF0E3] flex items-center justify-center">
                  <Mail size={20} className="text-[#F5821F]" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-[#F5821F]">{t('supportPage.contact.eyebrow')}</span>
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t('contact.heading')}</h2>
              <p className="text-sm text-neutral-600 mb-8">{t('contact.sub')}</p>
              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-[12px] p-12 text-center">
                  <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-neutral-900 mb-2">{t('contact.successHeading')}</h2>
                  <p className="text-sm text-neutral-600">{t('contact.successBody')}</p>
                </div>
              ) : (
                <div className="bg-neutral-50 border border-neutral-200 rounded-[16px] p-6 sm:p-8 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Input label={t('contact.agencyName')} required placeholder="My Study Agency" value={form.agencyName} onChange={update('agencyName')} />
                    <Input label={t('contact.yourName')} required placeholder="Jason KIM" value={form.yourName} onChange={update('yourName')} />
                    <Input label={t('contact.phone')} required type="tel" placeholder="+61 4xx xxx xxx" value={form.phone} onChange={update('phone')} />
                    <Input label={t('contact.email')} required type="email" placeholder="you@agency.com" value={form.email} onChange={update('email')} />
                  </div>
                  <Input label={t('contact.website')} placeholder="https://youragency.com" value={form.website} onChange={update('website')} />
                  <Input
                    label={t('contact.enquiryType')}
                    select
                    value={form.enquiryType}
                    onChange={update('enquiryType')}
                    options={[
                      { value: 'general',  label: t('contact.enquiryGeneral') },
                      { value: 'service',  label: t('contact.enquiryService') },
                      { value: 'proposal', label: t('contact.enquiryProposal') },
                      { value: 'refund',   label: t('contact.enquiryRefund') },
                    ]}
                  />
                  <Input label={t('contact.message')} multiline rows={5} placeholder="..." value={form.message} onChange={update('message')} />
                  <Button variant="primary" fullWidth onClick={handleSubmit}>{t('contact.submit')}</Button>
                  <p className="text-xs text-neutral-400 text-center">{t('contact.betaNote')}</p>
                </div>
              )}
            </FadeIn>

            <FadeIn delay={200}>
              <div className="space-y-5 pt-2">
                <div className="bg-neutral-50 border border-neutral-200 rounded-[14px] p-6">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-5">{t('supportPage.contact.detailsHeading')}</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Mail size={15} className="text-[#F5821F] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-neutral-500 mb-0.5">{t('supportPage.contact.emailLabel')}</p>
                        <a href="mailto:info@edubee.co" className="text-sm font-medium text-neutral-900 hover:text-[#F5821F] transition-colors">info@edubee.co</a>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin size={15} className="text-[#F5821F] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-neutral-500 mb-0.5">{t('supportPage.contact.addressLabel')}</p>
                        <p className="text-sm text-neutral-700 leading-relaxed">Suite 804, 343 Little Collins Street<br />Melbourne VIC 3000, Australia</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#FEF0E3] border border-[#F5821F]/20 rounded-[14px] p-6">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-3">{t('supportPage.contact.responseHeading')}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed mb-4">{t('supportPage.contact.responseBody')}</p>
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-2 text-xs text-neutral-700">
                        <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                        {t(`supportPage.contact.r${i}`)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <CtaBanner />
    </div>
  )
}
