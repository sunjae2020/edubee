import { useEffect, useState } from 'react'
import { Check, X, ArrowRight } from 'lucide-react'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
function link(path: string) { return `${BASE}${path}` }

const STATIC_PLANS = [
  {
    planName: 'LITE',
    price: 'Free',
    isContact: false,
    studentsPerMonth: '30/mo',
    storage: '5 GB',
    schoolDB: false,
    remote: false,
    partnerList: false,
    highlighted: false,
    ctaUrl: '/admin/register',
    ctaLabel: 'Get Started Free',
  },
  {
    planName: 'SOLO',
    price: '$79',
    isContact: false,
    studentsPerMonth: '100/mo',
    storage: '10 GB',
    schoolDB: false,
    remote: false,
    partnerList: true,
    highlighted: false,
    ctaUrl: '/admin/register',
    ctaLabel: 'Get SOLO',
  },
  {
    planName: 'STARTER',
    price: '$199',
    isContact: false,
    studentsPerMonth: '500/mo',
    storage: '50 GB',
    schoolDB: true,
    remote: false,
    partnerList: true,
    highlighted: true,
    ctaUrl: '/admin/register',
    ctaLabel: 'Get STARTER',
  },
  {
    planName: 'GROWTH',
    price: '$449',
    isContact: false,
    studentsPerMonth: '2,000/mo',
    storage: '200 GB',
    schoolDB: true,
    remote: true,
    partnerList: true,
    highlighted: false,
    ctaUrl: '/admin/register',
    ctaLabel: 'Get GROWTH',
  },
  {
    planName: 'ENTERPRISE',
    price: '',
    isContact: true,
    studentsPerMonth: 'Unlimited',
    storage: 'Unlimited',
    schoolDB: true,
    remote: true,
    partnerList: true,
    highlighted: false,
    ctaUrl: '/support/contact',
    ctaLabel: 'Contact Us',
  },
]

type Plan = typeof STATIC_PLANS[0]

function mapApiPlan(p: any): Plan {
  const monthly = parseFloat(p.priceMonthly ?? '0') || 0
  const maxStudents = p.maxStudents ?? 0
  const storageGb = p.storageGb ?? 0
  const isContact = maxStudents >= 9999
  const isFree = monthly === 0 && !isContact
  return {
    planName: (p.name || p.code || '').toUpperCase(),
    price: isFree ? 'Free' : isContact ? '' : `$${monthly % 1 === 0 ? monthly.toFixed(0) : monthly.toFixed(2)}`,
    isContact,
    studentsPerMonth: isContact ? 'Unlimited' : `${maxStudents}/mo`,
    storage: storageGb >= 9999 ? 'Unlimited' : storageGb >= 1000 ? `${(storageGb / 1000).toFixed(0)} TB` : `${storageGb} GB`,
    schoolDB: !!(p.featureCommission || p.featureServiceModules || p.featureVisa),
    remote: !!(p.featureAiAssistant || p.featureApiAccess || p.featureWhiteLabel),
    partnerList: true,
    highlighted: !!p.isPopular,
    ctaUrl: isContact ? '/support/contact' : '/admin/register',
    ctaLabel: isContact ? 'Contact Us' : isFree ? 'Get Started Free' : `Get ${(p.name || p.code || '').toUpperCase()}`,
  }
}

const FEATURES = [
  { key: 'studentsPerMonth', label: 'Active Students' },
  { key: 'storage',         label: 'Storage' },
  { key: 'schoolDB',        label: 'School Database', bool: true },
  { key: 'remote',          label: 'Remote Support', bool: true },
  { key: 'partnerList',     label: 'Partner Supplier List', bool: true },
]

const REFUND_ITEMS = [
  'Free (LITE) plan — Cancel anytime, no cost.',
  'Paid plans — Full refund within 7 days of payment.',
  'After 7 days: no refund for current period; auto-renewal stops next cycle.',
  'No lock-in period. No cancellation fee.',
]

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>(STATIC_PLANS)

  useEffect(() => {
    const B = import.meta.env.BASE_URL.replace(/\/$/, '')
    fetch(`${B}/api/public/platform-plans`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.success && Array.isArray(d.data) && d.data.length > 0) setPlans(d.data.map(mapApiPlan)) })
      .catch(() => {})
  }, [])

  return (
    <div style={{ background: '#FFFBF6', fontFamily: 'Inter, sans-serif' }}>

      {/* ══════════════════════════════════
          HERO — orange gradient bg
      ══════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #FF9039 0%, #E36909 100%)',
          padding: '100px 0 80px',
          marginTop: -83,
          paddingTop: 'calc(83px + 60px)',
        }}
      >
        {/* Subtle hex overlay */}
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
            className="inline-block px-5 py-1.5 rounded-full font-semibold text-sm mb-6"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
          >
            PRICING
          </span>
          <h1
            className="font-bold text-white mb-4 text-3xl sm:text-4xl xl:text-[52px]"
            style={{ lineHeight: '98%' }}
          >
            Simple, transparent pricing<br className="hidden sm:block" /> for every agency.
          </h1>
          <p className="text-white/80 text-base sm:text-lg font-light">
            No setup fees. No lock-in contracts. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════
          PLAN CARDS
      ══════════════════════════════════ */}
      <section style={{ background: '#FFFBF6', padding: '60px 0' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8">

          {/* Card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
            {plans.map((plan, i) => (
              <div
                key={plan.planName}
                className="flex flex-col"
                style={{
                  background: plan.highlighted ? '#FF9039' : '#FFFFFF',
                  borderRadius: 21,
                  padding: '28px 24px',
                  boxShadow: plan.highlighted
                    ? '0 8px 32px rgba(255,144,57,0.35)'
                    : '3px 4px 6.1px rgba(0,0,0,0.10)',
                  position: 'relative',
                }}
              >
                {plan.highlighted && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold"
                    style={{ background: '#200E00', color: '#FF9039', whiteSpace: 'nowrap' }}
                  >
                    Most Popular
                  </div>
                )}

                <p
                  className="font-bold text-lg mb-1"
                  style={{ color: plan.highlighted ? '#fff' : '#613717' }}
                >
                  {plan.planName}
                </p>

                <div className="mb-6">
                  {plan.isContact ? (
                    <p className="font-bold text-2xl sm:text-3xl" style={{ color: plan.highlighted ? '#fff' : '#200E00' }}>
                      Contact Us
                    </p>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-3xl sm:text-4xl" style={{ color: plan.highlighted ? '#fff' : '#200E00' }}>
                        {plan.price}
                      </span>
                      {plan.price !== 'Free' && (
                        <span className="text-sm" style={{ color: plan.highlighted ? 'rgba(255,255,255,0.7)' : '#613717' }}>/mo</span>
                      )}
                    </div>
                  )}
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {FEATURES.map(f => {
                    const val = (plan as any)[f.key]
                    return (
                      <li key={f.key} className="flex items-center gap-2 text-sm">
                        {f.bool ? (
                          val
                            ? <Check size={15} strokeWidth={2.5} style={{ color: plan.highlighted ? '#fff' : '#FF9039', flexShrink: 0 }} />
                            : <X size={15} strokeWidth={2} style={{ color: plan.highlighted ? 'rgba(255,255,255,0.4)' : '#D1D5DB', flexShrink: 0 }} />
                        ) : (
                          <Check size={15} strokeWidth={2.5} style={{ color: plan.highlighted ? '#fff' : '#FF9039', flexShrink: 0 }} />
                        )}
                        <span style={{ color: plan.highlighted ? (f.bool && !val ? 'rgba(255,255,255,0.4)' : '#fff') : (f.bool && !val ? '#9CA3AF' : '#613717') }}>
                          {f.bool ? f.label : val}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                <a
                  href={link(plan.ctaUrl)}
                  className="block w-full text-center py-3 rounded-[28px] font-semibold text-sm transition-all hover:opacity-90"
                  style={
                    plan.highlighted
                      ? { background: '#fff', color: '#D76811' }
                      : { background: '#FF9039', color: '#fff' }
                  }
                >
                  {plan.ctaLabel}
                </a>
              </div>
            ))}
          </div>
          <p className="text-center text-sm mt-5" style={{ color: '#9CA3AF' }}>
            All prices exclude GST (AUD).
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════
          FEATURE COMPARISON — dark bg table
      ══════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: '#200E00',
          padding: '60px 0',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
          <h2 className="font-bold text-white text-center mb-10 text-2xl sm:text-3xl" style={{ lineHeight: '98%' }}>
            Everything included in every plan.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: '🎓', title: 'Student Management', desc: 'Full student lifecycle from enquiry to graduation.' },
              { icon: '🏫', title: 'School Database', desc: 'Manage school partners, commissions, and programs.' },
              { icon: '💳', title: 'Commission Tracking', desc: 'Auto-calculate and invoice school commissions.' },
              { icon: '📊', title: 'Reports & Analytics', desc: 'Live dashboards for performance and revenue.' },
              { icon: '🌏', title: 'Multi-language', desc: 'Platform available in EN, KO, JA, ZH, TH.' },
              { icon: '🔒', title: 'Enterprise Security', desc: 'AES-256 encryption, role-based access, daily backups.' },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-[18px] p-6 flex items-start gap-4"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <span className="text-3xl flex-shrink-0">{item.icon}</span>
                <div>
                  <h4 className="font-bold text-white mb-1 text-sm sm:text-base">{item.title}</h4>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          REFUND POLICY — cream bg
      ══════════════════════════════════ */}
      <section style={{ background: '#F6F4F0', padding: '60px 0' }}>
        <div className="max-w-[900px] mx-auto px-4 sm:px-8">
          <div className="text-center mb-10">
            <p className="font-semibold uppercase tracking-widest text-sm mb-2" style={{ color: '#613717' }}>REFUND POLICY</p>
            <h2 className="font-bold text-2xl sm:text-3xl" style={{ color: '#613717', lineHeight: '98%' }}>Refund Policy</h2>
          </div>
          <div className="bg-white rounded-[21px] p-6 sm:p-8 space-y-4" style={{ boxShadow: '3px 4px 6.1px rgba(0,0,0,0.08)' }}>
            {REFUND_ITEMS.map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(255,144,57,0.15)' }}
                >
                  <Check size={13} style={{ color: '#FF9039' }} strokeWidth={3} />
                </div>
                <p className="text-sm" style={{ color: '#613717', lineHeight: '1.6' }}>{item}</p>
              </div>
            ))}
            <div className="flex items-start gap-4 pt-2 border-t" style={{ borderColor: '#F0EDE8' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(255,144,57,0.15)' }}>
                <ArrowRight size={12} style={{ color: '#FF9039' }} strokeWidth={3} />
              </div>
              <p className="text-sm" style={{ color: '#613717', lineHeight: '1.6' }}>
                Refund requests:{' '}
                <a href="mailto:info@edubee.co" className="font-semibold underline" style={{ color: '#E7873C' }}>
                  info@edubee.co
                </a>
              </p>
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
