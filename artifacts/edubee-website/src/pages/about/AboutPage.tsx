import { useTranslation } from 'react-i18next'
import { Building2, Star, Shield, CheckCircle, Server, Lock, Database, MapPin, Mail, Users, Globe, DollarSign, Layers } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FadeIn } from '@/components/ui/FadeIn'
import { CtaBanner } from '@/components/sections/CtaBanner'
import { PageBackground } from '@/components/ui/PageBackground'

const STRENGTH_ICONS = [Layers, DollarSign, Building2, Globe, Users, Shield]
const SECURITY_ICONS = [Server, Lock, Database, Shield]

export default function AboutPage() {
  const { t } = useTranslation()

  const strengths = STRENGTH_ICONS.map((Icon, i) => ({
    icon: Icon,
    title: t(`aboutPage.why.s${i + 1}Title`),
    body:  t(`aboutPage.why.s${i + 1}Body`),
  }))

  const forYouItems = [1, 2, 3, 4, 5].map(i => t(`aboutPage.why.fy${i}`))

  const securityItems = SECURITY_ICONS.map((Icon, i) => ({
    icon: Icon,
    title: t(`aboutPage.security.s${i + 1}Title`),
    body:  t(`aboutPage.security.s${i + 1}Body`),
  }))

  return (
    <div>
      {/* Hero */}
      <section className="pt-6 pb-20 bg-white border-b border-neutral-200 relative overflow-hidden">
        <PageBackground variant="wave" />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <FadeIn className="max-w-2xl">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#F5821F] mb-4 px-3 py-1 bg-[#FEF0E3] rounded-full">{t('aboutPage.hero.eyebrow')}</span>
            <h1 className="text-[40px] font-bold text-neutral-900 mb-5 leading-tight">{t('aboutPage.hero.heading')}<br /><span className="text-[#F5821F]">{t('aboutPage.hero.headingOrange')}</span></h1>
            <p className="text-base text-neutral-600 leading-relaxed mb-8">{t('aboutPage.hero.sub')}</p>
            <div className="flex gap-3 flex-wrap">
              <Button variant="primary" href="/register">{t('common.startFree')}</Button>
              <Button variant="secondary" href="/support">{t('common.contactUs')}</Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <FadeIn>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FEF0E3] flex items-center justify-center">
                  <Building2 size={20} className="text-[#F5821F]" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-[#F5821F]">{t('aboutPage.story.eyebrow')}</span>
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">{t('aboutPage.story.heading')}</h2>
              <div className="space-y-4 text-sm text-neutral-600 leading-relaxed">
                <p>{t('aboutPage.story.p1')}</p>
                <p>{t('aboutPage.story.p2')}</p>
                <p>{t('aboutPage.story.p3')}</p>
                <p>{t('aboutPage.story.p4')}</p>
              </div>
            </FadeIn>
            <FadeIn delay={150}>
              <div className="bg-white border border-neutral-200 rounded-[16px] p-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-5">{t('aboutPage.story.companyDetails')}</p>
                <div className="space-y-4">
                  {[
                    { label: t('aboutPage.story.company'),        value: 'Edubee.Co' },
                    { label: t('aboutPage.story.representative'), value: 'Jason KIM' },
                    { label: t('aboutPage.story.founded'),        value: 'Melbourne, Australia' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-3 border-b border-neutral-100">
                      <span className="text-sm text-neutral-500">{label}</span>
                      <span className="text-sm font-semibold text-neutral-900">{value}</span>
                    </div>
                  ))}
                  <div className="flex items-start gap-3 pt-2">
                    <Mail size={15} className="text-[#F5821F] flex-shrink-0 mt-0.5" />
                    <a href="mailto:info@edubee.co" className="text-sm text-[#F5821F] font-medium hover:underline">info@edubee.co</a>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin size={15} className="text-[#F5821F] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-neutral-700 leading-relaxed">Suite 804, 343 Little Collins Street<br />Melbourne VIC 3000, Australia</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 bg-[#FEF0E3] rounded-[14px] p-6 relative overflow-hidden">
                <svg viewBox="0 0 280 100" className="w-full opacity-30" fill="none">
                  <circle cx="140" cy="50" r="45" stroke="#F5821F" strokeWidth="1" strokeDasharray="4 4"/>
                  <circle cx="140" cy="50" r="30" stroke="#F5821F" strokeWidth="1" strokeDasharray="3 3"/>
                  <circle cx="140" cy="50" r="15" stroke="#F5821F" strokeWidth="1"/>
                  <line x1="0" y1="50" x2="280" y2="50" stroke="#F5821F" strokeWidth="0.5"/>
                  <line x1="140" y1="0" x2="140" y2="100" stroke="#F5821F" strokeWidth="0.5"/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-3 h-3 bg-[#F5821F] rounded-full mx-auto mb-1" />
                    <span className="text-xs font-semibold text-[#F5821F]">Melbourne, Australia</span>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Why Edubee */}
      <section className="py-20 bg-white relative overflow-hidden">
        <PageBackground variant="dots" />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <FadeIn className="mb-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF0E3] flex items-center justify-center">
                <Star size={20} className="text-[#F5821F]" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#F5821F]">{t('aboutPage.why.eyebrow')}</span>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t('aboutPage.why.heading')}</h2>
            <p className="text-sm text-neutral-500 max-w-xl">{t('aboutPage.why.sub')}</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
            {strengths.map(({ icon: Icon, title, body }, i) => (
              <FadeIn key={title} delay={i * 60}>
                <div className="bg-neutral-50 border border-neutral-200 rounded-[14px] p-6 hover:border-[#F5821F]/30 hover:shadow-sm transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF0E3] flex items-center justify-center mb-4">
                    <Icon size={20} className="text-[#F5821F]" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 mb-2">{title}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">{body}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Is it for you? */}
          <FadeIn>
            <div className="bg-[#FEF0E3] border border-[#F5821F]/20 rounded-[16px] p-8">
              <h3 className="text-lg font-bold text-neutral-900 mb-6">{t('aboutPage.why.forYou')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {forYouItems.map(item => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-neutral-700">{item}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-8 flex-wrap">
                <Button variant="primary" href="/register">{t('common.startFree')}</Button>
                <Button variant="secondary" href="/pricing">{t('nav.pricing')}</Button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 bg-[#111110] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66 L0 50 L0 16 L28 0 L56 16 L56 50 Z' fill='none' stroke='white' stroke-width='1'/%3E%3Cpath d='M28 66 L28 100' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E\")",
          backgroundSize: '56px 100px',
        }} />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <FadeIn className="mb-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Shield size={20} className="text-[#F5821F]" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#F5821F]">{t('aboutPage.security.eyebrow')}</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{t('aboutPage.security.heading')}</h2>
            <p className="text-sm text-neutral-400 max-w-xl">{t('aboutPage.security.sub')}</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {securityItems.map(({ icon: Icon, title, body }, i) => (
              <FadeIn key={title} delay={i * 70}>
                <div className="bg-white/5 border border-white/10 rounded-[14px] p-6 flex gap-5 hover:bg-white/10 transition-all duration-200">
                  <div className="w-11 h-11 rounded-xl bg-[#F5821F]/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={22} className="text-[#F5821F]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">{body}</p>
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
