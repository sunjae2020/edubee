import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { FadeIn } from '@/components/ui/FadeIn'
import { SectionHeader } from '@/components/sections/SectionHeader'
import { CtaBanner } from '@/components/sections/CtaBanner'
import { sanityFetch } from '@/lib/sanity/client'
import { ACTIVE_HERO_QUERY } from '@/lib/sanity/queries'
import { localise } from '@/lib/sanity/locale'
import {
  GraduationCap, School, Handshake, Building2, CreditCard, BarChart3,
  Bot, FileText, BookOpen, CheckCircle, Shield, Database, Cloud,
  AlertTriangle, FileX, Clock,
} from 'lucide-react'

const SERVICE_ICONS = [GraduationCap, School, Handshake, Building2, CreditCard, BarChart3]
const AI_ICONS = [Bot, FileText, BookOpen]
const PROBLEM_ICONS = [FileX, Clock, AlertTriangle]

type PricingRow = {
  plan: string; price: string; students: string; storage: string;
  schoolDB: boolean; remote: boolean; highlighted: boolean; comingSoon: boolean;
}

const PRICING_TABLE_FALLBACK: PricingRow[] = [
  { plan: 'SOLO',       price: '$79/mo',   students: '100/mo',    storage: '10 GB',  schoolDB: false, remote: false, highlighted: false, comingSoon: false },
  { plan: 'STARTER',    price: '$199/mo',  students: '500/mo',    storage: '50 GB',  schoolDB: true,  remote: false, highlighted: true,  comingSoon: false },
  { plan: 'GROWTH',     price: '$449/mo',  students: '2000/mo',   storage: '200 GB', schoolDB: true,  remote: true,  highlighted: false, comingSoon: false },
  { plan: 'ENTERPRISE', price: 'Free',     students: 'Unlimited', storage: '9.9 TB', schoolDB: true,  remote: true,  highlighted: false, comingSoon: false },
]

function mapApiToPricingRow(p: any): PricingRow {
  const monthly = parseFloat(p.priceMonthly ?? '0') || 0
  const students = (p.maxStudents >= 9999) ? 'Unlimited' : `${p.maxStudents}/mo`
  const gb = p.storageGb ?? 0
  const storage = gb >= 9999
    ? 'Unlimited'
    : gb >= 1000
      ? `${(gb / 1000).toFixed(0)} TB`
      : `${gb} GB`
  const isFree = monthly === 0
  const price = isFree ? 'Free' : `$${monthly % 1 === 0 ? monthly.toFixed(0) : monthly.toFixed(2)}/mo`
  return {
    plan: (p.name || p.code || '').toUpperCase(),
    price,
    students,
    storage,
    schoolDB: !!(p.featureCommission || p.featureServiceModules || p.featureVisa),
    remote: !!(p.featureAiAssistant || p.featureApiAccess || p.featureWhiteLabel),
    highlighted: !!p.isPopular,
    comingSoon: false,
  }
}

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [hero, setHero] = useState<any>(null)
  const [pricingTable, setPricingTable] = useState<PricingRow[]>(PRICING_TABLE_FALLBACK)

  useEffect(() => {
    sanityFetch(ACTIVE_HERO_QUERY).then(setHero).catch(() => {})
  }, [])

  useEffect(() => {
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
    fetch(`${BASE}/api/public/platform-plans`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.success && Array.isArray(d.data) && d.data.length > 0) {
          setPricingTable(d.data.map(mapApiToPricingRow))
        }
      })
      .catch(() => {})
  }, [])

  const heroHeadline = hero ? localise(hero.headline, lang) : null
  const heroSub      = hero ? localise(hero.subheadline, lang) : null

  return (
    <div>
      {/* 1. HERO */}
      <section
        className="bg-white pb-24 border-b border-neutral-200 relative overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(245,130,31,0.13) 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }}
      >
        {/* Left — honeycomb hexagon cluster */}
        <svg
          aria-hidden="true"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[340px] h-[400px] pointer-events-none select-none"
          viewBox="0 0 340 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hexagons */}
          {[
            { cx: 60,  cy: 80,  r: 44 },
            { cx: 136, cy: 80,  r: 44 },
            { cx: 98,  cy: 156, r: 44 },
            { cx: 174, cy: 156, r: 44 },
            { cx: 60,  cy: 232, r: 44 },
            { cx: 136, cy: 232, r: 44 },
            { cx: 22,  cy: 156, r: 44 },
            { cx: 98,  cy: 308, r: 44 },
          ].map(({ cx, cy, r }, i) => (
            <polygon
              key={i}
              points={[0,1,2,3,4,5].map(k => {
                const a = (Math.PI / 180) * (60 * k - 30)
                return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
              }).join(' ')}
              stroke="#F5821F"
              strokeWidth="1.5"
              fill="rgba(245,130,31,0.04)"
              opacity={0.55 - i * 0.04}
            />
          ))}
          {/* Small accent dots */}
          <circle cx="200" cy="60"  r="6" fill="#F5821F" opacity="0.18" />
          <circle cx="230" cy="200" r="4" fill="#F5821F" opacity="0.12" />
          <circle cx="30"  cy="360" r="8" fill="#F5821F" opacity="0.10" />
        </svg>

        {/* Right — soft organic illustration */}
        <svg
          aria-hidden="true"
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[520px] h-[560px] pointer-events-none select-none"
          viewBox="0 0 520 560"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Large soft background circle */}
          <circle cx="360" cy="260" r="190" fill="rgba(245,130,31,0.04)" />
          <circle cx="360" cy="260" r="145" fill="rgba(245,130,31,0.04)" />
          <circle cx="360" cy="260" r="100" fill="rgba(245,130,31,0.05)" />

          {/* Concentric arc rings */}
          <circle cx="360" cy="260" r="190" stroke="#F5821F" strokeWidth="1" opacity="0.14" />
          <circle cx="360" cy="260" r="145" stroke="#F5821F" strokeWidth="1" opacity="0.18" />
          <circle cx="360" cy="260" r="100" stroke="#F5821F" strokeWidth="1.5" opacity="0.22" />
          <circle cx="360" cy="260" r="58"  stroke="#F5821F" strokeWidth="2"   opacity="0.28" fill="rgba(245,130,31,0.07)" />

          {/* Soft dashed orbit */}
          <ellipse cx="360" cy="260" rx="190" ry="70" stroke="#F5821F" strokeWidth="1" strokeDasharray="6 5" opacity="0.15" transform="rotate(-20 360 260)" />
          <ellipse cx="360" cy="260" rx="145" ry="55" stroke="#F5821F" strokeWidth="1" strokeDasharray="5 5" opacity="0.12" transform="rotate(30 360 260)" />

          {/* Central soft blob / glow */}
          <circle cx="360" cy="260" r="32" fill="rgba(245,130,31,0.12)" />
          <circle cx="360" cy="260" r="18" fill="rgba(245,130,31,0.22)" />

          {/* Floating soft dots on orbit paths */}
          <circle cx="360" cy="72"  r="10" fill="rgba(245,130,31,0.30)" />
          <circle cx="516" cy="198" r="7"  fill="rgba(245,130,31,0.22)" />
          <circle cx="462" cy="428" r="9"  fill="rgba(245,130,31,0.20)" />
          <circle cx="218" cy="340" r="6"  fill="rgba(245,130,31,0.18)" />
          <circle cx="196" cy="178" r="8"  fill="rgba(245,130,31,0.16)" />

          {/* Soft curved accent lines */}
          <path d="M 200 100 Q 290 60 380 90"  stroke="#F5821F" strokeWidth="1.5" strokeLinecap="round" opacity="0.18" />
          <path d="M 160 320 Q 260 370 340 340" stroke="#F5821F" strokeWidth="1.5" strokeLinecap="round" opacity="0.15" />
          <path d="M 440 110 Q 490 200 480 310"  stroke="#F5821F" strokeWidth="1.5" strokeLinecap="round" opacity="0.16" />

          {/* Small scattered soft dots */}
          <circle cx="140" cy="230" r="5" fill="#F5821F" opacity="0.13" />
          <circle cx="300" cy="460" r="7" fill="#F5821F" opacity="0.10" />
          <circle cx="490" cy="400" r="5" fill="#F5821F" opacity="0.12" />
          <circle cx="420" cy="60"  r="4" fill="#F5821F" opacity="0.16" />
          <circle cx="100" cy="440" r="9" stroke="#F5821F" strokeWidth="1" fill="none" opacity="0.14" />
          <circle cx="500" cy="100" r="6" stroke="#F5821F" strokeWidth="1" fill="none" opacity="0.18" />
        </svg>

        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto">
              <Badge variant="brand" className="mb-6">{t('home.hero.eyebrow')}</Badge>
              <h1 className="text-[38px] sm:text-[48px] font-bold text-neutral-900 leading-[1.15] mb-6">
                {heroHeadline || (
                  <>{t('home.hero.headline1')}<br /><span className="text-[#F5821F]">{t('home.hero.headline2')}</span></>
                )}
              </h1>
              <p className="text-base sm:text-lg text-neutral-600 leading-relaxed mb-8 max-w-2xl mx-auto">
                {heroSub || t('home.hero.subheadline')}
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
                <Button variant="primary" size="lg" href={hero?.ctaPrimary?.href || '/register'}>
                  {hero?.ctaPrimary?.label || t('home.hero.ctaPrimary')}
                </Button>
                <Button variant="secondary" size="lg" href={hero?.ctaSecondary?.href || '/support/consulting'}>
                  {hero?.ctaSecondary?.label || t('home.hero.ctaSecondary')}
                </Button>
              </div>
              <div className="flex items-center justify-center gap-6 text-xs text-neutral-400 flex-wrap">
                {[t('home.hero.trust1'), t('home.hero.trust2'), t('home.hero.trust3')].map((trust, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-green-500" />{trust}
                  </span>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 2. SOCIAL PROOF */}
      <section className="py-8 bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-[1280px] mx-auto px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">
            {t('home.socialProof.label')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12">
            {['🇦🇺 Australia','🇨🇦 Canada','🇺🇸 USA','🇵🇭 Philippines','🇰🇷 Korea'].map(c => (
              <span key={c} className="text-sm font-medium text-neutral-500">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* 3. PROBLEM */}
      <section className="py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6">
          <FadeIn>
            <SectionHeader eyebrow={t('home.problem.label')} heading={t('home.problem.heading')} subheading={t('home.problem.body')} />
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: PROBLEM_ICONS[0], title: t('home.problem.card1Title'), body: t('home.problem.card1Body') },
              { icon: PROBLEM_ICONS[1], title: t('home.problem.card2Title'), body: t('home.problem.card2Body') },
              { icon: PROBLEM_ICONS[2], title: t('home.problem.card3Title'), body: t('home.problem.card3Body') },
            ].map(({ icon: Icon, title, body }, i) => (
              <FadeIn key={i} delay={i * 100}>
                <Card className="border-l-4 border-l-red-200">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                    <Icon size={20} className="text-red-500" />
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900 mb-2">{title}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">{body}</p>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SERVICES */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-[1280px] mx-auto px-6">
          <FadeIn>
            <SectionHeader eyebrow={t('home.services.label')} heading={t('home.services.heading')} />
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: SERVICE_ICONS[0], title: t('home.services.s1Title'), body: t('home.services.s1Body'), href: '/services/student' },
              { icon: SERVICE_ICONS[1], title: t('home.services.s2Title'), body: t('home.services.s2Body'), href: '/services/school' },
              { icon: SERVICE_ICONS[2], title: t('home.services.s3Title'), body: t('home.services.s3Body'), href: '/services/partner' },
              { icon: SERVICE_ICONS[3], title: t('home.services.s4Title'), body: t('home.services.s4Body'), href: '/services/agency' },
              { icon: SERVICE_ICONS[4], title: t('home.services.s5Title'), body: t('home.services.s5Body'), href: '/services/tuition' },
              { icon: SERVICE_ICONS[5], title: t('home.services.s6Title'), body: t('home.services.s6Body'), href: '/services/branch' },
            ].map(({ icon: Icon, title, body, href }, i) => (
              <FadeIn key={i} delay={i * 80}>
                <Card hoverable className="h-full" onClick={() => { window.location.href = href }}>
                  <div className="w-10 h-10 rounded-xl bg-[#FEF0E3] flex items-center justify-center mb-4">
                    <Icon size={20} className="text-[#F5821F]" />
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900 mb-2">{title}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed mb-4">{body}</p>
                  <span className="text-xs font-semibold text-[#F5821F]">{t('common.learnMore')}</span>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 5. WORKFLOW */}
      <section className="py-20 bg-white relative overflow-hidden">
        {/* Background globe illustration */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          viewBox="0 0 1280 420"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Large globe centered */}
          <circle cx="640" cy="210" r="340" stroke="#F5821F" strokeWidth="1" opacity="0.07" />
          <circle cx="640" cy="210" r="260" stroke="#F5821F" strokeWidth="1" opacity="0.07" />
          <circle cx="640" cy="210" r="180" stroke="#F5821F" strokeWidth="1" opacity="0.06" />

          {/* Latitude lines */}
          {[-120,-70,-20,30,80,130].map((dy, i) => (
            <ellipse key={i} cx="640" cy="210" rx="340" ry={Math.abs(dy) < 30 ? 340 : Math.sqrt(340*340 - dy*dy)} stroke="#F5821F" strokeWidth="0.8" opacity="0.05" transform={`translate(0 ${dy})`} />
          ))}
          {/* Longitude lines */}
          <ellipse cx="640" cy="210" rx="60"  ry="340" stroke="#F5821F" strokeWidth="0.8" opacity="0.055" />
          <ellipse cx="640" cy="210" rx="130" ry="340" stroke="#F5821F" strokeWidth="0.8" opacity="0.05"  />
          <ellipse cx="640" cy="210" rx="220" ry="340" stroke="#F5821F" strokeWidth="0.8" opacity="0.05"  />
          <ellipse cx="640" cy="210" rx="300" ry="340" stroke="#F5821F" strokeWidth="0.8" opacity="0.045" />

          {/* Equator */}
          <line x1="300" y1="210" x2="980" y2="210" stroke="#F5821F" strokeWidth="1" opacity="0.09" />

          {/* Location pins */}
          {[
            { x: 390, y: 145 }, { x: 510, y: 175 }, { x: 620, y: 155 },
            { x: 740, y: 170 }, { x: 845, y: 155 }, { x: 920, y: 200 },
          ].map(({ x, y }, i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="10" fill="rgba(245,130,31,0.12)" stroke="#F5821F" strokeWidth="1.5" opacity="0.55" />
              <circle cx={x} cy={y} r="4"  fill="#F5821F" opacity="0.45" />
              <circle cx={x} cy={y} r="18" stroke="#F5821F" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.22" />
            </g>
          ))}

          {/* Connecting arcs between pins */}
          <path d="M390,145 Q450,90  510,175" stroke="#F5821F" strokeWidth="1.2" strokeDasharray="5 4" opacity="0.25" />
          <path d="M510,175 Q565,120 620,155" stroke="#F5821F" strokeWidth="1.2" strokeDasharray="5 4" opacity="0.25" />
          <path d="M620,155 Q680,120 740,170" stroke="#F5821F" strokeWidth="1.2" strokeDasharray="5 4" opacity="0.25" />
          <path d="M740,170 Q793,110 845,155" stroke="#F5821F" strokeWidth="1.2" strokeDasharray="5 4" opacity="0.25" />
          <path d="M845,155 Q883,130 920,200" stroke="#F5821F" strokeWidth="1.2" strokeDasharray="5 4" opacity="0.25" />

          {/* Soft glow under pins */}
          {[
            { x: 390, y: 145 }, { x: 510, y: 175 }, { x: 620, y: 155 },
            { x: 740, y: 170 }, { x: 845, y: 155 }, { x: 920, y: 200 },
          ].map(({ x, y }, i) => (
            <circle key={i} cx={x} cy={y} r="28" fill="rgba(245,130,31,0.05)" />
          ))}
        </svg>

        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <FadeIn>
            <SectionHeader eyebrow={t('home.workflow.label')} heading={t('home.workflow.heading')} />
          </FadeIn>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1,2,3,4,5,6].map(n => (
              <FadeIn key={n} delay={n * 60}>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[#FEF0E3] border-2 border-[#F5821F] text-[#F5821F] font-bold text-sm flex items-center justify-center mx-auto mb-3">
                    {n}
                  </div>
                  <p className="text-sm font-semibold text-neutral-900 mb-1">{t(`home.workflow.stage${n}Title`)}</p>
                  <p className="text-xs text-neutral-500">{t(`home.workflow.stage${n}Body`)}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 6. AI FEATURES */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-[1280px] mx-auto px-6">
          <FadeIn>
            <SectionHeader eyebrow={t('home.ai.eyebrow')} heading={t('home.ai.heading')} subheading={t('home.ai.subheadline')} />
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: AI_ICONS[0], title: t('home.ai.chatbotTitle'), body: t('home.ai.chatbotBody'), href: '/services/ai-chatbot' },
              { icon: AI_ICONS[1], title: t('home.ai.formTitle'),    body: t('home.ai.formBody'),    href: '/services/ai-form' },
              { icon: AI_ICONS[2], title: t('home.ai.studyTitle'),   body: t('home.ai.studyBody'),   href: '/services/ai-study' },
            ].map(({ icon: Icon, title, body, href }, i) => (
              <FadeIn key={i} delay={i * 100}>
                <Card hoverable className="relative" onClick={() => { window.location.href = href }}>
                  <Badge variant="new" className="absolute top-4 right-4">{t('common.newBadge')}</Badge>
                  <div className="w-10 h-10 rounded-xl bg-[#FEF0E3] flex items-center justify-center mb-4">
                    <Icon size={20} className="text-[#F5821F]" />
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900 mb-2">{title}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">{body}</p>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 7. AUTOMATION */}
      <section className="py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <SectionHeader align="left" heading={t('home.automation.heading')} subheading={t('home.automation.body')} />
              <div className="grid grid-cols-2 gap-4 mt-6">
                {(['daily','weekly','monthly','auto'] as const).map(key => (
                  <div key={key} className="p-4 bg-neutral-50 rounded-[12px] border border-neutral-200">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#F5821F]">{t(`home.automation.${key}`)}</span>
                    <p className="text-sm text-neutral-600 mt-1">{t(`home.automation.${key}Body`)}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={200}>
              <div className="bg-neutral-900 rounded-[12px] p-6 text-white font-mono text-sm space-y-3">
                {[
                  { label: 'Branch income reconciled',  time: '00:00' },
                  { label: 'Visa expiry alerts sent',   time: '06:00' },
                  { label: 'Commission reminders',      time: '09:00' },
                  { label: 'Weekly KPI report ready',   time: 'Mon 09:00' },
                  { label: 'Monthly dashboard updated', time: '1st 00:00' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                      <span className="text-neutral-300">{item.label}</span>
                    </div>
                    <span className="text-neutral-500 text-xs">{item.time}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* 8. PRICING PREVIEW */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-[1280px] mx-auto px-6">
          <FadeIn>
            <SectionHeader heading={t('home.pricingPreview.heading')} />
          </FadeIn>
          <FadeIn delay={100}>
            <div className="overflow-x-auto">
              <table className="w-full bg-white border border-neutral-200 rounded-[12px] overflow-hidden text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    {[
                      t('home.pricingPreview.colPlan'),
                      t('home.pricingPreview.colPrice'),
                      t('home.pricingPreview.colStudents'),
                      t('home.pricingPreview.colStorage'),
                      t('home.pricingPreview.colSchoolDB'),
                      t('home.pricingPreview.colRemote'),
                    ].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pricingTable.map(row => (
                    <tr key={row.plan} className={`transition-colors ${row.highlighted ? 'bg-[#FEF0E3]' : 'hover:bg-neutral-50'}`}>
                      <td className="px-5 py-4 font-semibold text-neutral-900">
                        {row.plan}
                        {row.highlighted && <Badge variant="brand" className="ml-2">Popular</Badge>}
                      </td>
                      <td className="px-5 py-4">
                        {row.comingSoon
                          ? <Badge variant="neutral">{t('home.pricingPreview.comingSoon')}</Badge>
                          : <span className={`font-semibold ${row.highlighted ? 'text-[#F5821F]' : 'text-neutral-900'}`}>{row.price}</span>
                        }
                      </td>
                      <td className="px-5 py-4 text-neutral-600">{row.students}</td>
                      <td className="px-5 py-4 text-neutral-600">{row.storage}</td>
                      <td className="px-5 py-4">{row.schoolDB ? <CheckCircle size={16} className="text-green-500" /> : <span className="text-neutral-300">—</span>}</td>
                      <td className="px-5 py-4">{row.remote   ? <CheckCircle size={16} className="text-green-500" /> : <span className="text-neutral-300">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-neutral-400 mt-3 text-center">{t('home.pricingPreview.noteGst')}</p>
            <div className="text-center mt-6">
              <Button variant="secondary" href="/pricing">{t('home.pricingPreview.viewFull')}</Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 9. SECURITY */}
      <section className="py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6">
          <FadeIn>
            <SectionHeader heading={t('home.security.heading')} />
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: Database, title: t('home.security.s1Title'), body: t('home.security.s1Body') },
              { icon: Shield,   title: t('home.security.s2Title'), body: t('home.security.s2Body') },
              { icon: Cloud,    title: t('home.security.s3Title'), body: t('home.security.s3Body') },
            ].map(({ icon: Icon, title, body }, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="flex gap-4 p-6 bg-neutral-50 rounded-[12px] border border-neutral-200">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF0E3] flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-[#F5821F]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-1.5">{title}</h3>
                    <p className="text-sm text-neutral-600 leading-relaxed">{body}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 10. CTA */}
      <CtaBanner />
    </div>
  )
}
