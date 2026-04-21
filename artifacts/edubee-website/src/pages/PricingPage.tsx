import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
function link(path: string) { return `${BASE}${path}` }

const STATIC_PLANS = [
  {
    planName: 'LITE',
    badge: '',
    price: 'Free',
    priceSub: '',
    isContact: false,
    isFree: true,
    studentsPerMonth: '50/mo',
    storage: '10 MB',
    schoolDB: false,
    remote: false,
    partnerList: true,
    highlighted: false,
    comingSoon: false,
    ctaUrl: '/admin/register',
    ctaLabel: 'Get Started Free',
  },
  {
    planName: 'PLUS',
    badge: 'Most Popular',
    price: 'Free',
    priceSub: 'Free during Beta',
    isContact: false,
    isFree: true,
    studentsPerMonth: 'Unlimited',
    storage: '100 MB',
    schoolDB: true,
    remote: false,
    partnerList: true,
    highlighted: true,
    comingSoon: false,
    ctaUrl: '/admin/register',
    ctaLabel: 'Get Started Free',
  },
  {
    planName: 'BUSINESS',
    badge: '',
    price: '$19.90',
    priceSub: '',
    isContact: false,
    isFree: false,
    studentsPerMonth: 'Unlimited',
    storage: '500 MB',
    schoolDB: true,
    remote: false,
    partnerList: true,
    highlighted: false,
    comingSoon: true,
    ctaUrl: '/admin/register',
    ctaLabel: 'Coming Soon',
  },
  {
    planName: 'ENTERPRISE',
    badge: '',
    price: '$39.90',
    priceSub: '',
    isContact: false,
    isFree: false,
    studentsPerMonth: 'Unlimited',
    storage: '1 GB',
    schoolDB: true,
    remote: true,
    partnerList: true,
    highlighted: false,
    comingSoon: true,
    ctaUrl: '/support/contact',
    ctaLabel: 'Coming Soon',
  },
]


type Plan = typeof STATIC_PLANS[0]

function mapApiPlan(p: any): Plan {
  const monthly = parseFloat(p.priceMonthly ?? '0') || 0
  const maxStudents = p.maxStudents ?? 0
  const storageGb = p.storageGb ?? 0
  const unlimited = maxStudents >= 9999
  const isFree = monthly === 0
  const storageMb = storageGb * 1024
  const storageLabel =
    storageGb >= 9999 ? 'Unlimited'
    : storageGb >= 1 ? `${storageGb} GB`
    : storageMb > 0 ? `${storageMb} MB`
    : '10 MB'
  const studentsLabel = unlimited ? 'Unlimited' : `${maxStudents}/mo`
  const planName = (p.name || p.code || '').toUpperCase()
  const priceSub = isFree && p.isPopular ? 'Free during Beta' : ''
  return {
    planName,
    badge: p.isPopular ? 'Most Popular' : '',
    price: isFree ? 'Free' : `$${monthly % 1 === 0 ? monthly.toFixed(0) : monthly.toFixed(2)}`,
    priceSub,
    isContact: false,
    isFree,
    studentsPerMonth: studentsLabel,
    storage: storageLabel,
    schoolDB: !!(p.featureCommission || p.featureServiceModules || p.featureVisa),
    remote: !!(p.featureAiAssistant || p.featureApiAccess || p.featureWhiteLabel),
    partnerList: true,
    highlighted: !!p.isPopular,
    comingSoon: false,
    ctaUrl: '/admin/register',
    ctaLabel: isFree ? 'Get Started Free' : `Get ${planName}`,
  }
}

const FEATURES = [
  { key: 'studentsPerMonth', label: 'Active Students', bool: false },
  { key: 'storage',          label: 'Storage',         bool: false },
  { key: 'schoolDB',         label: 'School Database', bool: true  },
  { key: 'remote',           label: 'Remote Support',  bool: true  },
  { key: 'partnerList',      label: 'Partner Supplier List', bool: true },
]

const ALL_INCLUDED = [
  { icon: '🎓', title: 'Student Management', desc: 'Full student lifecycle from enquiry to graduation.' },
  { icon: '🏫', title: 'School Database', desc: 'Manage school partners, commissions, and programs.' },
  { icon: '💳', title: 'Commission Tracking', desc: 'Auto-calculate and invoice school commissions.' },
  { icon: '📊', title: 'Reports & Analytics', desc: 'Live dashboards for performance and revenue.' },
  { icon: '🌏', title: 'Multi-language', desc: 'Platform available in EN, KO, JA, ZH, TH.' },
  { icon: '🔒', title: 'Enterprise Security', desc: 'AES-256 encryption, role-based access, daily backups.' },
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
      .then(d => {
        if (d?.success && Array.isArray(d.data) && d.data.length > 0) {
          const activeMapped = d.data.map(mapApiPlan)
          // Merge: use API data for active plans, static data for coming-soon plans
          const merged = STATIC_PLANS.map(staticPlan => {
            const fromApi = activeMapped.find((a: Plan) => a.planName === staticPlan.planName)
            return fromApi ?? staticPlan
          })
          setPlans(merged)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div style={{ background: '#FFFBF7', fontFamily: 'Inter, sans-serif' }}>

      {/* ═══════════════════════════════════════════
          1. HERO — cream bg + dot pattern
      ═══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden flex flex-col items-center justify-center text-center"
        style={{
          background: '#FFFBF7',
          marginTop: -83,
          paddingTop: 150,
          paddingBottom: 80,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(227,105,9,0.12) 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative z-10 max-w-[700px] mx-auto px-4 sm:px-8">
          <div className="mb-5">
            <span
              className="inline-block px-5 py-1.5 rounded-full font-semibold text-sm"
              style={{ background: '#3C3C3C', color: '#F8984D' }}
            >
              Pricing
            </span>
          </div>
          <h1
            className="font-bold mb-5 text-2xl sm:text-3xl xl:text-[46px]"
            style={{ color: '#3B1A06', lineHeight: '108%' }}
          >
            Simple, transparent pricing<br className="hidden sm:block" /> for every agency.
          </h1>
          <p
            className="text-sm sm:text-base"
            style={{ fontWeight: 300, color: '#7A5535', lineHeight: '1.6' }}
          >
            No setup fees. No lock-in contracts. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          2. PLAN CARDS — cream bg
      ═══════════════════════════════════════════ */}
      <section style={{ background: '#FAF5ED', padding: '0 0 72px' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 xl:px-[80px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {plans.map((plan) => (
              <PlanCard key={plan.planName} plan={plan} />
            ))}
          </div>
          <p className="text-center text-xs mt-5" style={{ color: '#B09070' }}>
            All prices exclude GST (AUD).
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          3. EVERYTHING INCLUDED — orange bg
      ═══════════════════════════════════════════ */}
      <section style={{ background: '#FF9039', padding: '72px 0' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
          <div className="text-center mb-10">
            <span
              className="inline-block px-4 py-1.5 rounded-full font-semibold text-xs mb-5"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
            >
              Every Plan
            </span>
            <h2
              className="font-bold text-white text-2xl sm:text-3xl xl:text-[40px] mb-3"
              style={{ lineHeight: '108%' }}
            >
              Everything included in every plan.
            </h2>
            <p
              className="text-sm sm:text-base mx-auto"
              style={{ fontWeight: 300, color: 'rgba(255,255,255,0.82)', lineHeight: '1.5', maxWidth: 480 }}
            >
              Core features available to all users, regardless of plan size.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ALL_INCLUDED.map((item, i) => (
              <div
                key={i}
                className="rounded-[18px] p-6 flex items-start gap-4"
                style={{ background: 'rgba(255,255,255,0.16)' }}
              >
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div>
                  <h4 className="font-bold text-white mb-1 text-sm sm:text-base">{item.title}</h4>
                  <p className="text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.75)', lineHeight: '1.5' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          4. REFUND POLICY — cream bg
      ═══════════════════════════════════════════ */}
      <section style={{ background: '#FAF5ED', padding: '72px 0' }}>
        <div className="max-w-[860px] mx-auto px-4 sm:px-8">
          <div className="text-center mb-10">
            <span
              className="inline-block px-4 py-1.5 rounded-full font-semibold text-xs mb-5"
              style={{ background: '#3C3C3C', color: '#F8984D' }}
            >
              Refund Policy
            </span>
            <h2
              className="font-bold text-2xl sm:text-3xl"
              style={{ color: '#3B1A06', lineHeight: '108%' }}
            >
              Our refund policy
            </h2>
          </div>
          <div
            className="bg-white rounded-[21px] p-6 sm:p-8 space-y-4"
            style={{ boxShadow: '3px 4px 10px rgba(0,0,0,0.06)' }}
          >
            {REFUND_ITEMS.map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(255,144,57,0.15)' }}
                >
                  <Check size={13} style={{ color: '#FF9039' }} strokeWidth={3} />
                </div>
                <p className="text-sm" style={{ color: '#3B1A06', lineHeight: '1.6', fontWeight: 300 }}>{item}</p>
              </div>
            ))}
            <div
              className="flex items-start gap-4 pt-4 border-t"
              style={{ borderColor: '#F0E8DC' }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(255,144,57,0.15)' }}
              >
                <span style={{ color: '#FF9039', fontSize: 12, fontWeight: 700 }}>✉</span>
              </div>
              <p className="text-sm" style={{ color: '#3B1A06', lineHeight: '1.6', fontWeight: 300 }}>
                Refund requests:{' '}
                <a
                  href="mailto:info@edubee.co"
                  className="font-semibold underline"
                  style={{ color: '#E7873C' }}
                >
                  info@edubee.co
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          5. CTA BANNER
      ═══════════════════════════════════════════ */}
      <section style={{ background: '#FF9039', padding: '80px 0' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 text-center">
          <h2
            className="text-white font-bold mb-4 text-2xl sm:text-3xl xl:text-[44px]"
            style={{ lineHeight: '106%' }}
          >
            Ready to streamline your agency?
          </h2>
          <p
            className="text-white mb-10 text-sm sm:text-base"
            style={{ fontWeight: 300, lineHeight: '1.5' }}
          >
            Start with our free LITE plan today — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={link('/admin/register')}
              className="w-full sm:w-auto inline-flex items-center justify-center font-bold transition-all hover:scale-105 text-base sm:text-lg"
              style={{
                background: '#FDFCFC',
                color: '#D76811',
                height: 54,
                paddingLeft: 40,
                paddingRight: 40,
                borderRadius: 40,
              }}
            >
              Start for Free
            </a>
            <a
              href={link('/support/contact')}
              className="w-full sm:w-auto inline-flex items-center justify-center font-bold text-white transition-all hover:bg-white/10 text-base sm:text-lg"
              style={{
                border: '2px solid #FFFFFF',
                height: 54,
                paddingLeft: 40,
                paddingRight: 40,
                borderRadius: 40,
              }}
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

    </div>
  )
}

function PlanCard({ plan }: { plan: Plan }) {
  const dim = plan.comingSoon
  return (
    <div
      className="flex flex-col relative"
      style={{
        background: plan.highlighted ? '#FF9039' : '#FFFFFF',
        borderRadius: 21,
        padding: '32px 24px 28px',
        boxShadow: plan.highlighted
          ? '0 8px 32px rgba(255,144,57,0.30)'
          : '3px 4px 10px rgba(0,0,0,0.08)',
        opacity: dim ? 0.72 : 1,
      }}
    >
      {plan.badge && (
        <div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap"
          style={{ background: '#200E00', color: '#FF9039' }}
        >
          {plan.badge}
        </div>
      )}
      {dim && (
        <div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap"
          style={{ background: '#E8E0D8', color: '#7A5535' }}
        >
          Coming Soon
        </div>
      )}

      <p
        className="font-bold text-base mb-1 tracking-wide"
        style={{ color: plan.highlighted ? 'rgba(255,255,255,0.85)' : '#9C6A3A' }}
      >
        {plan.planName}
      </p>

      <div className="mb-6 mt-1">
        <div className="flex items-baseline gap-1">
          <span
            className="font-bold text-4xl sm:text-[42px]"
            style={{ color: plan.highlighted ? '#fff' : '#3B1A06', lineHeight: '1' }}
          >
            {plan.price}
          </span>
          {!plan.isFree && (
            <span
              className="text-sm ml-1"
              style={{ color: plan.highlighted ? 'rgba(255,255,255,0.65)' : '#9C6A3A' }}
            >
              /mo
            </span>
          )}
        </div>
        {plan.priceSub && (
          <p className="text-xs mt-1.5 font-semibold" style={{ color: plan.highlighted ? 'rgba(255,255,255,0.8)' : '#E07820' }}>
            {plan.priceSub}
          </p>
        )}
      </div>

      <div
        className="mb-5 h-px"
        style={{ background: plan.highlighted ? 'rgba(255,255,255,0.25)' : '#F0E8DC' }}
      />

      <ul className="space-y-3 flex-1 mb-7">
        {FEATURES.map(f => {
          const val = (plan as any)[f.key]
          const active = f.bool ? !!val : true
          return (
            <li key={f.key} className="flex items-center gap-2.5 text-sm">
              {f.bool ? (
                active
                  ? <Check size={15} strokeWidth={2.5} style={{ color: plan.highlighted ? '#fff' : '#FF9039', flexShrink: 0 }} />
                  : <X    size={15} strokeWidth={2}   style={{ color: plan.highlighted ? 'rgba(255,255,255,0.35)' : '#D1D5DB', flexShrink: 0 }} />
              ) : (
                <Check size={15} strokeWidth={2.5} style={{ color: plan.highlighted ? '#fff' : '#FF9039', flexShrink: 0 }} />
              )}
              <span style={{
                color: plan.highlighted
                  ? (f.bool && !active ? 'rgba(255,255,255,0.35)' : '#fff')
                  : (f.bool && !active ? '#C4B5A5' : '#3B1A06'),
                fontWeight: 300,
              }}>
                {f.bool ? f.label : val}
              </span>
            </li>
          )
        })}
      </ul>

      {dim ? (
        <div
          className="block w-full text-center py-3 rounded-[28px] font-semibold text-sm cursor-not-allowed select-none"
          style={{ background: '#E8E0D8', color: '#A8977E' }}
        >
          Coming Soon
        </div>
      ) : (
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
      )}
    </div>
  )
}
