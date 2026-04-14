import { useTranslation } from 'react-i18next'
import { Check, Mail, MapPin, Shield, Server, Lock, Database } from 'lucide-react'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
function link(path: string) { return `${BASE}${path}` }

const WHY_ITEMS = [
  { icon: '🎯', title: 'Built for Education Agencies', desc: 'Every feature is designed specifically for international study abroad agencies — not adapted from generic CRM software.' },
  { icon: '💰', title: 'Transparent Pricing', desc: 'No hidden fees, no surprise charges. What you see is what you pay. Cancel anytime with no penalty.' },
  { icon: '🏢', title: 'Multi-Branch Ready', desc: 'Connect head office and overseas branches with real-time data sync. One platform, one truth, any country.' },
  { icon: '🌏', title: 'Global & Multilingual', desc: 'Platform available in English, Korean, Japanese, Chinese, and Thai. Built for agencies operating across borders.' },
  { icon: '👥', title: 'Agency-First Support', desc: 'Our team has run study abroad agencies. We understand your workflow before you even explain it.' },
  { icon: '🔒', title: 'Enterprise Security', desc: 'SOC 2-style access control, AES-256 encryption, and automated daily backups — protecting your student data.' },
]

const SECURITY_ITEMS = [
  { Icon: Server, title: 'Isolated Tenant Data', desc: 'Each agency\'s data is stored in a completely separate database schema. No shared tables, no data leaks.' },
  { Icon: Lock, title: 'AES-256 Encryption', desc: 'All data is encrypted at rest with AES-256. All connections use TLS 1.3 in transit. Always.' },
  { Icon: Database, title: 'Automated Backups', desc: 'Daily automated backups with point-in-time recovery. Your data is always recoverable.' },
  { Icon: Shield, title: 'Role-Based Access', desc: 'Fine-grained permissions by staff role and branch. Staff only see what they need to see.' },
]

export default function AboutPage() {
  const { t } = useTranslation()

  return (
    <div style={{ background: '#FFFBF6', fontFamily: 'Inter, sans-serif' }}>

      {/* ══════════════════════════════════
          HERO — dark photo bg
      ══════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1440&auto=format&fit=crop&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          minHeight: 480,
          marginTop: -83,
          paddingTop: 'calc(83px + 60px)',
          paddingBottom: 60,
        }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.1) 100%)' }} />
        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-8 xl:px-[100px]">
          <span
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: 'rgba(255,144,57,0.25)', color: '#FF9039', border: '1px solid rgba(255,144,57,0.4)' }}
          >
            ABOUT EDUBEE
          </span>
          <h1 className="font-bold text-white mb-5 text-3xl sm:text-4xl xl:text-[52px]" style={{ lineHeight: '98%', maxWidth: 640 }}>
            Built by agency people,<br />
            <span style={{ color: '#FF9039' }}>for agency people.</span>
          </h1>
          <p className="text-white/80 mb-8 text-sm sm:text-base" style={{ fontWeight: 300, lineHeight: '1.6', maxWidth: 480 }}>
            Edubee CRM was founded with a single mission: to give study abroad agencies the tools they need to run efficiently and grow confidently — without the enterprise price tag.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={link('/admin/register')}
              className="inline-flex items-center justify-center px-8 py-3.5 font-semibold rounded-[28px] transition-all hover:scale-105 text-base"
              style={{ background: '#FF9039', color: '#fff' }}
            >
              Start for Free →
            </a>
            <a
              href={link('/support/contact')}
              className="inline-flex items-center justify-center px-8 py-3.5 font-semibold rounded-[28px] border border-white text-white transition-all hover:bg-white/10 text-base"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          OUR STORY — two column
      ══════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1497366216548-37526070297c?w=1440&auto=format&fit=crop&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'soft-light',
          backgroundColor: '#F0C090',
          padding: '60px 0',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
          <div
            className="rounded-[26px] px-5 sm:px-10 xl:px-14 py-10"
            style={{ background: 'linear-gradient(180deg, #E07F34 0%, #EC7E29 100%)' }}
          >
            <div className="flex flex-col lg:flex-row gap-10 items-start">
              {/* Left: story */}
              <div className="flex-1 min-w-0">
                <p className="uppercase font-semibold text-white/80 mb-4 text-sm tracking-wider">OUR STORY</p>
                <h2 className="font-bold text-white mb-5 text-2xl sm:text-3xl" style={{ lineHeight: '98%' }}>
                  From frustration to solution.
                </h2>
                <div className="space-y-4 text-sm sm:text-base" style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 300, lineHeight: '1.7' }}>
                  <p>{t('aboutPage.story.p1')}</p>
                  <p>{t('aboutPage.story.p2')}</p>
                  <p>{t('aboutPage.story.p3')}</p>
                </div>
              </div>

              {/* Right: company card */}
              <div className="flex-shrink-0 w-full lg:w-[400px]">
                <div
                  className="rounded-[21px] p-6 sm:p-7"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.4)' }}
                >
                  <p className="uppercase font-semibold text-white/70 text-xs tracking-wider mb-5">COMPANY DETAILS</p>
                  <div className="space-y-3">
                    {[
                      { label: 'Company',        value: 'Edubee.Co' },
                      { label: 'Representative', value: 'Jason KIM' },
                      { label: 'Founded',        value: 'Melbourne, Australia' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                        <span className="text-sm text-white/60">{label}</span>
                        <span className="text-sm font-semibold text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail size={14} style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
                      <a href="mailto:info@edubee.co" className="text-sm text-white hover:underline">info@edubee.co</a>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin size={14} style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0, marginTop: 2 }} />
                      <p className="text-sm text-white/80 leading-relaxed">Suite 804, 343 Little Collins Street<br />Melbourne VIC 3000, Australia</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          WHY EDUBEE — dark bg, 6 cards
      ══════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1440&auto=format&fit=crop&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '60px 0',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'rgba(12,8,4,0.88)' }} />
        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-8">
          <div className="text-center mb-10">
            <p className="font-semibold uppercase tracking-widest text-white/50 mb-3 text-sm">WHY CHOOSE EDUBEE</p>
            <h2 className="font-bold text-white text-2xl sm:text-3xl xl:text-[44px]" style={{ lineHeight: '98%' }}>
              The CRM agencies actually want to use.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {WHY_ITEMS.map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-[21px] p-6 sm:p-7 hover:shadow-2xl transition-all"
                style={{ boxShadow: '3px 4px 6.1px rgba(0,0,0,0.15)' }}
              >
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="font-bold mb-2 text-base sm:text-[17px]" style={{ color: '#613717' }}>{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Is it for you? */}
          <div
            className="rounded-[26px] px-5 sm:px-10 xl:px-14 py-10"
            style={{ background: 'linear-gradient(180deg, #E07F34 0%, #EC7E29 100%)' }}
          >
            <h3 className="font-bold text-white mb-6 text-xl sm:text-2xl">Is Edubee right for you?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {[
                'You manage 10+ active international students',
                'You work with multiple school partners',
                'You have 2+ staff members handling students',
                'You operate across multiple countries or branches',
                'You want to automate commission tracking and invoicing',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(255,255,255,0.25)' }}>
                    <Check size={12} color="white" strokeWidth={3} />
                  </div>
                  <p className="text-sm text-white/90">{item}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={link('/admin/register')}
                className="inline-flex items-center justify-center px-8 py-3.5 font-semibold rounded-[28px] transition-all hover:scale-105 text-base"
                style={{ background: '#fff', color: '#D76811' }}
              >
                Start for Free
              </a>
              <a
                href={link('/pricing')}
                className="inline-flex items-center justify-center px-8 py-3.5 font-semibold rounded-[28px] border border-white text-white transition-all hover:bg-white/10 text-base"
              >
                View Pricing
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          SECURITY — dark bg
      ══════════════════════════════════ */}
      <section
        style={{
          background: '#111110',
          padding: '60px 0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Honeycomb overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='84' height='48.5'%3E%3Cpolygon points='28,0 14,24.25 -14,24.25 -28,0 -14,-24.25 14,-24.25' fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3Cpolygon points='70,24.25 56,48.5 28,48.5 14,24.25 28,0 56,0' fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'repeat',
            backgroundSize: '84px 48.5px',
          }}
        />
        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-8">
          <div className="text-center mb-10">
            <p className="font-semibold uppercase tracking-widest text-white/40 mb-3 text-sm">SECURITY</p>
            <h2 className="font-bold text-white text-2xl sm:text-3xl xl:text-[44px]" style={{ lineHeight: '98%' }}>
              Your data is safe with Edubee.
            </h2>
            <p className="text-white/60 mt-3 text-sm sm:text-base mx-auto" style={{ maxWidth: 500 }}>
              Enterprise-grade security built for agencies that handle sensitive student visa and financial data.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {SECURITY_ITEMS.map(({ Icon, title, desc }, i) => (
              <div
                key={i}
                className="rounded-[21px] p-6 sm:p-7 flex items-start gap-5"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,144,57,0.2)' }}
                >
                  <Icon size={22} style={{ color: '#FF9039' }} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-2 text-base">{title}</h4>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>{desc}</p>
                </div>
              </div>
            ))}
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
              href={link('/support/contact')}
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
