import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, MapPin, CheckCircle, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { sanityFetch } from '@/lib/sanity/client'
import { ALL_FAQ_QUERY } from '@/lib/sanity/queries'
import { localise } from '@/lib/sanity/locale'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
function link(path: string) { return `${BASE}${path}` }

const STATIC_FAQ_KEYS = ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10']

function FaqAccordion({ items }: { items: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="overflow-hidden transition-all"
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: open === i ? '0 4px 16px rgba(255,144,57,0.15)' : '2px 3px 5px rgba(0,0,0,0.06)',
            border: open === i ? '1px solid rgba(255,144,57,0.4)' : '1px solid transparent',
          }}
        >
          <button
            className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="font-semibold text-sm sm:text-base" style={{ color: '#200E00' }}>{item.question}</span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: open === i ? '#FF9039' : '#F6F4F0' }}
            >
              {open === i
                ? <ChevronUp size={16} color="#fff" />
                : <ChevronDown size={16} style={{ color: '#613717' }} />
              }
            </div>
          </button>
          {open === i && (
            <div
              className="px-5 sm:px-6 pb-5 text-sm leading-relaxed"
              style={{ color: '#613717', borderTop: '1px solid rgba(255,144,57,0.15)', paddingTop: 12 }}
            >
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
    <div style={{ background: '#FFFBF6', fontFamily: 'Inter, sans-serif' }}>

      {/* ══════════════════════════════════
          HERO — orange gradient
      ══════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #FF9039 0%, #E36909 100%)',
          marginTop: -83,
          paddingTop: 'calc(83px + 60px)',
          paddingBottom: 60,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='84' height='48.5'%3E%3Cpolygon points='28,0 14,24.25 -14,24.25 -28,0 -14,-24.25 14,-24.25' fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='1'/%3E%3Cpolygon points='70,24.25 56,48.5 28,48.5 14,24.25 28,0 56,0' fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='1'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'repeat',
            backgroundSize: '84px 48.5px',
          }}
        />
        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-8 text-center">
          <span
            className="inline-block px-5 py-1.5 rounded-full text-sm font-semibold mb-6"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
          >
            SUPPORT
          </span>
          <h1 className="font-bold text-white mb-4 text-3xl sm:text-4xl xl:text-[52px]" style={{ lineHeight: '98%' }}>
            How can we help?
          </h1>
          <p className="text-white/80 text-base sm:text-lg font-light mx-auto" style={{ maxWidth: 480 }}>
            Browse our FAQ or get in touch with our team directly — we're here to help your agency succeed.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════
          FAQ — cream bg, full-width accordion
      ══════════════════════════════════ */}
      <section style={{ background: '#F6F4F0', padding: '60px 0' }} id="faq">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">

            {/* Left: label + search + info */}
            <div className="w-full lg:w-[320px] lg:flex-shrink-0">
              <p className="font-semibold uppercase tracking-widest text-sm mb-3" style={{ color: '#613717' }}>FAQ</p>
              <h2 className="font-bold mb-3 text-2xl sm:text-3xl" style={{ color: '#613717', lineHeight: '98%' }}>
                Frequently Asked Questions
              </h2>
              <p className="text-sm mb-6" style={{ color: '#613717', fontWeight: 300, lineHeight: '1.6' }}>
                Can't find your answer? Contact us directly and our team will get back to you within 24 hours.
              </p>

              {/* Search */}
              <div className="relative mb-6">
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-[14px] text-sm outline-none transition-all"
                  style={{
                    background: '#fff',
                    border: '1.5px solid rgba(255,144,57,0.3)',
                    padding: '12px 16px',
                    color: '#200E00',
                    boxShadow: '2px 3px 6px rgba(0,0,0,0.06)',
                  }}
                />
              </div>

              {/* Quick contact card */}
              <div
                className="rounded-[21px] p-6"
                style={{ background: 'linear-gradient(180deg, #E07F34 0%, #EC7E29 100%)' }}
              >
                <p className="font-bold text-white mb-4 text-base">Still need help?</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail size={15} style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
                    <a href="mailto:info@edubee.co" className="text-sm text-white hover:underline">info@edubee.co</a>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin size={15} style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0, marginTop: 2 }} />
                    <p className="text-sm text-white/80 leading-relaxed">Melbourne VIC 3000, Australia</p>
                  </div>
                </div>
                <a
                  href="#contact"
                  className="block w-full text-center mt-5 py-2.5 rounded-[28px] text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: '#fff', color: '#D76811' }}
                >
                  Contact Us →
                </a>
              </div>
            </div>

            {/* Right: accordion */}
            <div className="flex-1 min-w-0">
              {filtered.length > 0
                ? <FaqAccordion items={filtered} />
                : <p className="text-center text-sm py-8" style={{ color: '#613717' }}>No results found.</p>
              }
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          CONTACT FORM — white bg
      ══════════════════════════════════ */}
      <section style={{ background: '#FFFBF6', padding: '60px 0' }} id="contact">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">

            {/* Left: form */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold uppercase tracking-widest text-sm mb-3" style={{ color: '#613717' }}>CONTACT US</p>
              <h2 className="font-bold mb-2 text-2xl sm:text-3xl" style={{ color: '#613717', lineHeight: '98%' }}>
                Get in touch with us.
              </h2>
              <p className="text-sm mb-8" style={{ color: '#613717', fontWeight: 300, lineHeight: '1.6' }}>
                Fill out the form below and our team will get back to you within 1 business day.
              </p>

              {submitted ? (
                <div
                  className="rounded-[21px] p-10 sm:p-14 text-center"
                  style={{ background: '#fff', boxShadow: '3px 4px 6.1px rgba(0,0,0,0.08)' }}
                >
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="font-bold text-xl mb-2" style={{ color: '#613717' }}>Message sent!</h3>
                  <p className="text-sm" style={{ color: '#613717', fontWeight: 300 }}>We'll get back to you within 1 business day.</p>
                </div>
              ) : (
                <div
                  className="rounded-[21px] p-6 sm:p-8 space-y-5"
                  style={{ background: '#fff', boxShadow: '3px 4px 6.1px rgba(0,0,0,0.08)' }}
                >
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
                  <Input label={t('contact.message')} multiline rows={5} placeholder="Tell us about your agency..." value={form.message} onChange={update('message')} />
                  <button
                    onClick={handleSubmit}
                    className="w-full py-4 rounded-[28px] font-semibold text-white text-base transition-all hover:opacity-90 hover:scale-[1.01]"
                    style={{ background: '#FF9039' }}
                  >
                    {t('contact.submit')}
                  </button>
                  <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
                    {t('contact.betaNote')}
                  </p>
                </div>
              )}
            </div>

            {/* Right: contact info + response time */}
            <div className="w-full lg:w-[320px] lg:flex-shrink-0 space-y-5">
              <div
                className="rounded-[21px] p-6"
                style={{ background: '#fff', boxShadow: '3px 4px 6.1px rgba(0,0,0,0.08)' }}
              >
                <p className="font-bold text-sm mb-5" style={{ color: '#613717' }}>Contact Details</p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,144,57,0.12)' }}>
                      <Mail size={14} style={{ color: '#FF9039' }} />
                    </div>
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Email</p>
                      <a href="mailto:info@edubee.co" className="text-sm font-medium hover:underline" style={{ color: '#613717' }}>info@edubee.co</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,144,57,0.12)' }}>
                      <MapPin size={14} style={{ color: '#FF9039' }} />
                    </div>
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Address</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#613717' }}>Suite 804, 343 Little Collins Street<br />Melbourne VIC 3000, Australia</p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="rounded-[21px] p-6"
                style={{ background: 'linear-gradient(180deg, #E07F34 0%, #EC7E29 100%)' }}
              >
                <p className="font-bold text-white mb-3 text-base">Response Time</p>
                <p className="text-sm text-white/80 mb-4" style={{ lineHeight: '1.6' }}>
                  We aim to respond to all enquiries within 1 business day.
                </p>
                <div className="space-y-2.5">
                  {[
                    'General enquiries — within 24 hours',
                    'Technical issues — same business day',
                    'Billing questions — within 24 hours',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-white/90">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.25)' }}>
                        <Check size={10} color="white" strokeWidth={3} />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick links */}
              <div
                className="rounded-[21px] p-6"
                style={{ background: '#fff', boxShadow: '3px 4px 6.1px rgba(0,0,0,0.08)' }}
              >
                <p className="font-bold text-sm mb-4" style={{ color: '#613717' }}>Quick Links</p>
                <div className="space-y-2">
                  {[
                    { label: 'FAQ', href: '#faq' },
                    { label: 'View Pricing', href: link('/pricing') },
                    { label: 'Book a Demo', href: link('/support/consulting') },
                    { label: 'Get Started Free', href: link('/admin/register') },
                  ].map(item => (
                    <a
                      key={item.label}
                      href={item.href}
                      className="flex items-center justify-between py-2 text-sm font-medium transition-colors hover:text-[#FF9039]"
                      style={{ color: '#613717', borderBottom: '1px solid #F0EDE8' }}
                    >
                      {item.label}
                      <span style={{ color: '#FF9039' }}>→</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          CTA BANNER
      ══════════════════════════════════ */}
      <section style={{ background: '#FF9039', padding: '60px 0' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 text-center">
          <h2 className="text-white font-bold mb-3 text-2xl sm:text-3xl xl:text-[40px]" style={{ lineHeight: '98%' }}>
            Ready to streamline your agency?
          </h2>
          <p className="text-white/80 mb-8 text-sm sm:text-base font-light">
            Start with our free LITE plan today — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={link('/admin/register')}
              className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 font-semibold rounded-[28px] transition-all hover:scale-105 text-base sm:text-lg"
              style={{ background: 'white', color: '#E7873C' }}
            >
              Start for Free
            </a>
            <a
              href="#contact"
              className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 font-semibold rounded-[28px] border-2 border-white text-white transition-all hover:bg-white/10 text-base sm:text-lg"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

    </div>
  )
}
