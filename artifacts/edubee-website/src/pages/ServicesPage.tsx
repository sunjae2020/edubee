import { useTranslation } from 'react-i18next'
import { GraduationCap, School, Handshake, Building2, CreditCard, BarChart3, Bot, FileText, BookOpen, CheckCircle, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FadeIn } from '@/components/ui/FadeIn'
import { CtaBanner } from '@/components/sections/CtaBanner'
import { PageBackground } from '@/components/ui/PageBackground'

const SERVICE_CONFIGS = [
  { key: 'student', icon: GraduationCap, color: '#F5821F', bg: '#FEF0E3', featureCount: 5 },
  { key: 'school',  icon: School,        color: '#3B82F6', bg: '#EFF6FF', featureCount: 5 },
  { key: 'partner', icon: Handshake,     color: '#10B981', bg: '#ECFDF5', featureCount: 5 },
  { key: 'agency',  icon: Building2,     color: '#8B5CF6', bg: '#F5F3FF', featureCount: 5 },
  { key: 'tuition', icon: CreditCard,    color: '#EF4444', bg: '#FEF2F2', featureCount: 5 },
  { key: 'branch',  icon: BarChart3,     color: '#F59E0B', bg: '#FFFBEB', featureCount: 5 },
]

const AI_CONFIGS = [
  { key: 'aiChatbot', icon: Bot,       featureCount: 5 },
  { key: 'aiForm',    icon: FileText,  featureCount: 5 },
  { key: 'aiStudy',   icon: BookOpen,  featureCount: 5 },
]

export default function ServicesPage() {
  const { t } = useTranslation()

  const services = SERVICE_CONFIGS.map(s => ({
    ...s,
    title: t(`servicesPage.${s.key}.title`),
    desc:  t(`servicesPage.${s.key}.desc`),
    features: Array.from({ length: s.featureCount }, (_, i) => t(`servicesPage.${s.key}.f${i + 1}`)),
  }))

  const aiServices = AI_CONFIGS.map(s => ({
    ...s,
    title: t(`servicesPage.${s.key}.title`),
    desc:  t(`servicesPage.${s.key}.desc`),
    features: Array.from({ length: s.featureCount }, (_, i) => t(`servicesPage.${s.key}.f${i + 1}`)),
  }))

  return (
    <div>
      {/* Hero */}
      <section className="pt-6 pb-20 bg-white border-b border-neutral-200 relative overflow-hidden">
        <PageBackground variant="hexagons" />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <FadeIn className="text-center max-w-2xl mx-auto">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#F5821F] mb-4 px-3 py-1 bg-[#FEF0E3] rounded-full">{t('servicesPage.hero.eyebrow')}</span>
            <h1 className="text-[40px] font-bold text-neutral-900 mb-4 leading-tight">{t('servicesPage.hero.heading')}<br /><span className="text-[#F5821F]">{t('servicesPage.hero.headingOrange')}</span></h1>
            <p className="text-base text-neutral-600 leading-relaxed">{t('servicesPage.hero.sub')}</p>
          </FadeIn>
        </div>
      </section>

      {/* Core Services */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-[1280px] mx-auto px-6">
          <FadeIn className="mb-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t('servicesPage.core.heading')}</h2>
            <p className="text-sm text-neutral-500">{t('servicesPage.core.sub')}</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(({ key, icon: Icon, color, bg, title, desc, features }, i) => (
              <FadeIn key={key} delay={i * 70}>
                <div className="bg-white border border-neutral-200 rounded-[16px] overflow-hidden hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] transition-all duration-300 h-full flex flex-col group">
                  <div className="p-6 pb-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${bg} 0%, #ffffff 60%)` }}>
                    <div className="absolute right-0 top-0 w-32 h-32 opacity-10" style={{ color }}>
                      <svg viewBox="0 0 128 128" fill="currentColor"><circle cx="64" cy="64" r="60"/><circle cx="64" cy="64" r="40"/><circle cx="64" cy="64" r="20"/></svg>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 relative z-10" style={{ backgroundColor: bg }}>
                      <Icon size={24} style={{ color }} />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 relative z-10">{title}</h3>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <p className="text-sm text-neutral-600 leading-relaxed mb-5">{desc}</p>
                    <ul className="space-y-2 flex-1 mb-5">
                      {features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm text-neutral-700">
                          <CheckCircle size={13} className="flex-shrink-0" style={{ color }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <a href="/register" className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors" style={{ color }}>
                      {t('servicesPage.ai.getStarted')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* AI Features */}
      <section className="py-20 bg-[#111110] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66 L0 50 L0 16 L28 0 L56 16 L56 50 Z' fill='none' stroke='white' stroke-width='1'/%3E%3Cpath d='M28 66 L28 100' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E\")",
          backgroundSize: '56px 100px',
        }} />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <FadeIn className="mb-12 text-center">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#F5821F] mb-4 px-3 py-1 bg-[#F5821F]/10 rounded-full border border-[#F5821F]/20">
              <Sparkles size={12} /> {t('servicesPage.ai.eyebrow')}
            </span>
            <h2 className="text-2xl font-bold text-white mb-2">{t('servicesPage.ai.heading')}</h2>
            <p className="text-sm text-neutral-400">{t('servicesPage.ai.sub')}</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {aiServices.map(({ key, icon: Icon, title, desc, features }, i) => (
              <FadeIn key={key} delay={i * 100}>
                <div className="bg-white/5 border border-white/10 rounded-[16px] p-6 hover:bg-white/10 transition-all duration-300 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[#F5821F]/20 flex items-center justify-center">
                      <Icon size={22} className="text-[#F5821F]" />
                    </div>
                    <div>
                      <Badge variant="new" className="text-[10px] mb-0.5">{t('common.newBadge')}</Badge>
                      <h3 className="text-base font-bold text-white">{title}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-400 leading-relaxed mb-5">{desc}</p>
                  <ul className="space-y-2 flex-1 mb-6">
                    {features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-neutral-300">
                        <CheckCircle size={13} className="text-[#F5821F] flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button variant="secondary" href="/register" size="sm">{t('servicesPage.ai.earlyAccess')}</Button>
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
