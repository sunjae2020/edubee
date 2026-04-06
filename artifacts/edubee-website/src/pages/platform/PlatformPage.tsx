import { useTranslation } from 'react-i18next'
import { List, Zap, BarChart3, Globe, CheckCircle, ArrowRight, Clock, RefreshCw, TrendingUp, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FadeIn } from '@/components/ui/FadeIn'
import { CtaBanner } from '@/components/sections/CtaBanner'
import { PageBackground } from '@/components/ui/PageBackground'

const STAGE_COLORS = [
  { dot: '#F5821F', bg: '#FEF0E3', border: 'border-[#F5821F]/30' },
  { dot: '#3B82F6', bg: '#EFF6FF', border: 'border-blue-200' },
  { dot: '#10B981', bg: '#ECFDF5', border: 'border-green-200' },
  { dot: '#8B5CF6', bg: '#F5F3FF', border: 'border-purple-200' },
  { dot: '#F59E0B', bg: '#FFFBEB', border: 'border-yellow-200' },
  { dot: '#EC4899', bg: '#FDF2F8', border: 'border-pink-200' },
]

const OPERATION_ICONS = [Clock, RefreshCw, TrendingUp]
const ACCESS_ICONS = [Wifi, Globe, List, Zap]

export default function PlatformPage() {
  const { t } = useTranslation()

  const stages = [1, 2, 3, 4, 5, 6].map(n => ({
    n,
    title: t(`home.workflow.stage${n}Title`),
    body:  t(`home.workflow.stage${n}Body`),
  }))

  const operations = (['daily', 'weekly', 'monthly'] as const).map((period, idx) => ({
    period: t(`platformPage.operations.${period}`),
    icon: OPERATION_ICONS[idx],
    items: [1, 2, 3, 4].map(i => t(`platformPage.operations.${period[0]}${i}`)),
  }))

  const marketingMetrics = [
    { label: t('platformPage.marketing.m1Label'), value: '12+', desc: t('platformPage.marketing.m1Desc') },
    { label: t('platformPage.marketing.m2Label'), value: '↑',   desc: t('platformPage.marketing.m2Desc') },
    { label: t('platformPage.marketing.m3Label'), value: '$',   desc: t('platformPage.marketing.m3Desc') },
    { label: t('platformPage.marketing.m4Label'), value: '%',   desc: t('platformPage.marketing.m4Desc') },
  ]

  const accessFeatures = ACCESS_ICONS.map((Icon, i) => ({
    icon: Icon,
    title: t(`platformPage.access.a${i + 1}Title`),
    desc:  t(`platformPage.access.a${i + 1}Desc`),
  }))

  return (
    <div>
      {/* Hero */}
      <section className="pt-6 pb-20 bg-white border-b border-neutral-200 relative overflow-hidden">
        <PageBackground variant="globe" />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <FadeIn className="text-center max-w-2xl mx-auto">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#F5821F] mb-4 px-3 py-1 bg-[#FEF0E3] rounded-full">{t('platformPage.hero.eyebrow')}</span>
            <h1 className="text-[40px] font-bold text-neutral-900 mb-4 leading-tight">{t('platformPage.hero.heading')}<br /><span className="text-[#F5821F]">{t('platformPage.hero.headingOrange')}</span></h1>
            <p className="text-base text-neutral-600 leading-relaxed">{t('platformPage.hero.sub')}</p>
            <div className="flex gap-3 justify-center mt-8">
              <Button variant="primary" href="/register">{t('common.startFree')}</Button>
              <Button variant="secondary" href="/support">{t('common.bookDemo')}</Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 6-Stage Workflow */}
      <section className="py-20 bg-neutral-50 relative overflow-hidden">
        <PageBackground variant="topography" />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <FadeIn className="mb-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF0E3] flex items-center justify-center">
                <List size={20} className="text-[#F5821F]" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#F5821F]">{t('platformPage.workflow.eyebrow')}</span>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t('platformPage.workflow.heading')}</h2>
            <p className="text-sm text-neutral-500 max-w-xl">{t('platformPage.workflow.sub')}</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stages.map(({ n, title, body }) => {
              const col = STAGE_COLORS[n - 1]
              return (
                <FadeIn key={n} delay={n * 60}>
                  <div className={`bg-white rounded-[14px] border ${col.border} p-6 hover:shadow-md transition-all duration-200`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: col.dot }}>{n}</div>
                      <div className="h-px flex-1 opacity-30" style={{ backgroundColor: col.dot }} />
                    </div>
                    <h3 className="text-base font-semibold text-neutral-900 mb-2">{title}</h3>
                    <p className="text-sm text-neutral-600 leading-relaxed">{body}</p>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* Operations Automation */}
      <section className="py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6">
          <FadeIn className="mb-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF0E3] flex items-center justify-center">
                <Zap size={20} className="text-[#F5821F]" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#F5821F]">{t('platformPage.operations.eyebrow')}</span>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t('platformPage.operations.heading')}</h2>
            <p className="text-sm text-neutral-500 max-w-xl">{t('platformPage.operations.sub')}</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {operations.map(({ period, icon: Icon, items }, i) => (
              <FadeIn key={period} delay={i * 80}>
                <div className="bg-neutral-50 border border-neutral-200 rounded-[14px] overflow-hidden">
                  <div className="bg-[#F5821F]/10 px-6 py-4 flex items-center gap-3 border-b border-[#F5821F]/20">
                    <Icon size={18} className="text-[#F5821F]" />
                    <span className="font-bold text-[#F5821F]">{period}</span>
                  </div>
                  <div className="p-6 space-y-3">
                    {items.map(item => (
                      <div key={item} className="flex items-center gap-2 text-sm text-neutral-700">
                        <ArrowRight size={13} className="text-[#F5821F] flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Marketing Reports */}
      <section className="py-20 bg-[#F5821F] relative overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }} />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <FadeIn className="mb-12 text-center">
            <div className="inline-flex items-center gap-3 mb-3">
              <BarChart3 size={20} className="text-white" />
              <span className="text-xs font-semibold uppercase tracking-widest text-white/80">{t('platformPage.marketing.eyebrow')}</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{t('platformPage.marketing.heading')}</h2>
            <p className="text-sm text-white/80 max-w-xl mx-auto">{t('platformPage.marketing.sub')}</p>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {marketingMetrics.map(({ label, value, desc }, i) => (
              <FadeIn key={label} delay={i * 80}>
                <div className="bg-white/10 backdrop-blur border border-white/20 rounded-[14px] p-6 text-center hover:bg-white/20 transition-all duration-200">
                  <div className="text-3xl font-bold text-white mb-2">{value}</div>
                  <h3 className="text-sm font-semibold text-white mb-2">{label}</h3>
                  <p className="text-xs text-white/70 leading-relaxed">{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Access & Environment */}
      <section className="py-20 bg-neutral-50 relative overflow-hidden">
        <PageBackground variant="circuit" />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <FadeIn className="mb-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF0E3] flex items-center justify-center">
                <Globe size={20} className="text-[#F5821F]" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#F5821F]">{t('platformPage.access.eyebrow')}</span>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t('platformPage.access.heading')}</h2>
            <p className="text-sm text-neutral-500 max-w-xl">{t('platformPage.access.sub')}</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accessFeatures.map(({ icon: Icon, title, desc }, i) => (
              <FadeIn key={title} delay={i * 70}>
                <div className="bg-white border border-neutral-200 rounded-[14px] p-6 flex gap-5 hover:shadow-md transition-all duration-200">
                  <div className="w-12 h-12 rounded-xl bg-[#FEF0E3] flex items-center justify-center flex-shrink-0">
                    <Icon size={22} className="text-[#F5821F]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900 mb-2">{title}</h3>
                    <p className="text-sm text-neutral-600 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner />
    </div>
  )
}
