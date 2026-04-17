import { useEffect, useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
function link(path: string) { return `${BASE}${path}` }

type PricingRow = {
  plan: string; price: string; students: string; storage: string;
  schoolDB: boolean; remote: boolean; highlighted: boolean; contact: boolean;
}

const PRICING_TABLE_FALLBACK: PricingRow[] = [
  { plan: 'LITE',       price: 'Free',    students: '30/mo',     storage: '5 GB',    schoolDB: false, remote: false, highlighted: false, contact: false },
  { plan: 'SOLO',       price: '$79/mo',  students: '100/mo',    storage: '10 GB',   schoolDB: false, remote: false, highlighted: false, contact: false },
  { plan: 'STARTER',    price: '$199/mo', students: '500/mo',    storage: '50 GB',   schoolDB: true,  remote: false, highlighted: true,  contact: false },
  { plan: 'GROWTH',     price: '$449/mo', students: '2000/mo',   storage: '200 GB',  schoolDB: true,  remote: true,  highlighted: false, contact: false },
  { plan: 'ENTERPRISE', price: '',        students: 'Unlimited',  storage: 'Unlimited', schoolDB: true, remote: true, highlighted: false, contact: true },
]

function mapApiToPricingRow(p: any): PricingRow {
  const monthly = parseFloat(p.priceMonthly ?? '0') || 0
  const maxStudents = p.maxStudents ?? 0
  const isContact = maxStudents >= 9999
  const students = isContact ? 'Unlimited' : `${maxStudents}/mo`
  const gb = p.storageGb ?? 0
  const storage = gb >= 9999 ? 'Unlimited' : gb >= 1000 ? `${(gb / 1000).toFixed(0)} TB` : `${gb} GB`
  const price = monthly === 0 ? 'Free' : isContact ? '' : `$${monthly % 1 === 0 ? monthly.toFixed(0) : monthly.toFixed(2)}/mo`
  return {
    plan: (p.name || p.code || '').toUpperCase(),
    price, students, storage,
    schoolDB: !!(p.featureCommission || p.featureServiceModules || p.featureVisa),
    remote: !!(p.featureAiAssistant || p.featureApiAccess || p.featureWhiteLabel),
    highlighted: !!p.isPopular, contact: isContact,
  }
}

const SERVICES = [
  { icon: '🎓', title: 'Student Management', desc: 'Track every student from first enquiry to graduation. Consultation history, profiles, and 6-stage workflow all in one place.', href: '/services/student' },
  { icon: '🏫', title: 'School Management', desc: 'Manage your entire school partner database — contracts, fees, commission rates, and application requirements in one searchable hub.', href: '/services/school' },
  { icon: '🤝', title: 'Partner Management', desc: 'Track referral partners, agreements, and commission payouts. Manage every relationship with full transparency.', href: '/services/partner' },
  { icon: '🏢', title: 'Agency Management', desc: 'Manage multi-branch agency operations from a single dashboard. Staff access controls, performance visibility, and branch-level data.', href: '/services/agency' },
  { icon: '💳', title: 'Tuition & Commission', desc: "Automated commission tracking and invoicing. Know exactly what you're owed — and what's been paid — at a glance.", href: '/services/tuition' },
  { icon: '📊', title: 'Branch Operations', desc: 'Connect head office and overseas branches with real-time sync. Same platform, same data, anywhere in the world.', href: '/services/branch' },
]

const AI_FEATURES = [
  { icon: '🤖', title: 'AI Chatbot', desc: 'Deploy a 24/7 AI student support assistant. Instantly answer common enquiries, qualify leads, and book consultations without lifting a finger.', badge: 'Request Early Access', features: ['24/7 automated multilingual responses', 'Auto lead capture to CRM', 'Human handoff for complex inquiries', 'Chat history tracking'] },
  { icon: '📝', title: 'AI Smart Form', desc: 'Intelligent application forms that auto-complete from existing student data. Reduce errors, save time, and delight students.', badge: 'Request Early Access', features: ['Smart field auto-complete', 'Document upload handling', 'Reduces errors by 80%', 'Students apply in under 5 mins'] },
  { icon: '📚', title: 'AI Study Advisor', desc: 'Intelligent course and school recommendations powered by AI. Match each student to the perfect program based on their goals and profile.', badge: 'Request Early Access', features: ['Profile-based matching', 'Budget optimisation', 'School comparison tool', 'Career path guidance'] },
]

const WORKFLOW_STEPS = [
  { num: '1', title: 'Consultation', sub: 'Profiling & estimates' },
  { num: '2', title: 'School Application', sub: 'Documents & fees' },
  { num: '3', title: 'Visa Processing', sub: 'Lodgement & approval' },
  { num: '4', title: 'Payment Management', sub: 'Batch processing' },
  { num: '5', title: 'Post-Enrollment', sub: 'Tuition & changes' },
  { num: '6', title: 'Re-enrollment', sub: 'Auto reminders' },
]

const CHALLENGE_FEATURES = [
  { icon: '🎓', title: 'Centralised Student Data' },
  { icon: '📊', title: 'Manual Reporting' },
  { icon: '💸', title: 'Lost Commissions' },
  { icon: '✅', title: 'Live Student Status' },
]

const SECURITY_ITEMS = [
  { icon: '🔒', title: 'SOC 2-Style Access Control', desc: 'Role-based permissions down to field level.' },
  { icon: '🛡️', title: 'Multi-Layer Encryption', desc: 'AES-256 at rest. TLS 1.3 in transit. Always.' },
  { icon: '🏦', title: 'Redundant Backups', desc: 'Automated daily backups with point-in-time recovery.' },
]

export default function HomePage() {
  const [pricingTable, setPricingTable] = useState<PricingRow[]>(PRICING_TABLE_FALLBACK)

  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '')
    fetch(`${base}/api/public/platform-plans`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.success && Array.isArray(d.data) && d.data.length > 0) setPricingTable(d.data.map(mapApiToPricingRow)) })
      .catch(() => {})
  }, [])

  return (
    <div style={{ background: '#FFFBF6', fontFamily: 'Inter, sans-serif' }}>
      {/* ═══════════════════════════════════════════
          1. HERO
      ═══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          marginTop: -83,
          backgroundImage: 'url(/hero-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 25%',
          minHeight: 480,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.42) 55%, rgba(0,0,0,0.08) 100%)' }}
        />

        <div className="relative z-10 flex flex-col" style={{ minHeight: 480 }}>
          <div className="flex-1 flex items-center py-28 md:py-0 md:h-[786px]">
            <div className="w-full px-5 sm:px-10 xl:px-[122px]">
              <h1
                className="font-bold text-white mb-5"
                style={{ lineHeight: '98%', textShadow: '3px 2px 2px rgba(0,0,0,0.25)', maxWidth: 702 }}
              >
                <span className="block text-4xl sm:text-5xl xl:text-[56px]">Focus on Consulting,</span>
                <span className="block text-4xl sm:text-5xl xl:text-[56px]">Leave the rest to Edubee</span>
              </h1>
              <p
                className="text-white mb-8 text-base sm:text-lg"
                style={{ fontWeight: 300, lineHeight: '1.4', textShadow: '0px 4px 4px rgba(0,0,0,0.25)', maxWidth: 476 }}
              >
                The all-in-one CRM built exclusively for international education agencies. Manage students, schools, visas, tuition, and branch staff — from one platform, anywhere in the world.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <a
                  href={link('/admin/register')}
                  className="inline-flex items-center justify-center px-8 font-medium rounded-[49px] transition-opacity hover:opacity-90 text-lg sm:text-2xl"
                  style={{ background: '#FDFCFC', color: '#D76811', height: 57 }}
                >
                  Start for Free
                </a>
                <a
                  href={link('/support/consulting')}
                  className="inline-flex items-center justify-center px-8 font-medium rounded-[49px] border border-white text-white transition-all hover:bg-white/10 text-lg sm:text-2xl"
                  style={{ height: 57 }}
                >
                  Book a Demo
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════
          2. TRUST BAR
      ═══════════════════════════════════════════ */}
      <section style={{ background: '#E36909' }} className="py-5 md:py-0 md:h-[98px] flex items-center">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 w-full">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-center">
            <span className="font-extrabold text-white text-sm sm:text-base lg:text-[20px]" style={{ lineHeight: '118.83%' }}>
              IT TRUSTED BY STUDY ABROAD AGENCIES IN
            </span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {['Australia', 'Canada', 'USA', 'Philippines', 'Korea'].map((c, i) => (
                <div key={c} className="flex items-center gap-4">
                  {i > 0 && <div className="hidden sm:block" style={{ width: 0, height: 27, borderLeft: '2px solid #FFFFFF' }} />}
                  <span className="text-white text-sm sm:text-base lg:text-[20px]" style={{ fontWeight: 300, lineHeight: '118.83%' }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════
          3. CHALLENGE
      ═══════════════════════════════════════════ */}
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
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 xl:px-[80px]">
          <div
            className="rounded-[26px] px-6 sm:px-10 xl:px-12 py-10 sm:py-12"
            style={{ background: 'linear-gradient(180deg, #E07F34 0%, #EC7E29 100%)' }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left: heading text */}
              <div>
                <p className="uppercase font-semibold text-white/80 mb-5 text-xs tracking-widest">THE ONE STOP</p>
                <h2 className="font-bold text-white mb-4 text-2xl sm:text-3xl xl:text-[36px]" style={{ lineHeight: '112%' }}>
                  Running an agency shouldn't mean drowning in spreadsheets.
                </h2>
                <p className="text-white/85 text-sm sm:text-[15px]" style={{ fontWeight: 300, lineHeight: '1.6' }}>
                  Most study abroad agencies manage students in Excel, track commissions in separate files, and report to branch staff by email. As your agency grows, this breaks down fast.
                </p>
              </div>

              {/* Right: 2×2 grid of white cards */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {CHALLENGE_FEATURES.map((f, i) => (
                  <div
                    key={i}
                    className="rounded-[16px] p-5 sm:p-6 flex flex-col gap-3"
                    style={{ background: 'rgba(255,255,255,0.93)', minHeight: 130 }}
                  >
                    <span className="text-3xl">{f.icon}</span>
                    <span className="font-semibold text-sm sm:text-[15px] leading-snug" style={{ color: '#7A3B10' }}>
                      {f.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════
          4. FEATURES — warm photo bg, 6 white cards
      ═══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1440&auto=format&fit=crop&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '72px 0',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'rgba(246,234,218,0.78)' }} />
        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-8">
          <div className="text-center mb-10">
            <p className="font-semibold uppercase tracking-widest mb-3 text-sm" style={{ color: '#E36909' }}>WHAT EDUBEE DOES</p>
            <h2 className="font-bold text-2xl sm:text-3xl xl:text-[48px]" style={{ color: '#3B1A06', lineHeight: '98%' }}>
              Everything your agency needs, in one place.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map((s, i) => (
              <div
                key={i}
                className="bg-white rounded-[21px] p-6 sm:p-7 hover:shadow-2xl transition-all cursor-pointer group"
                style={{ boxShadow: '3px 4px 10px rgba(180,100,20,0.10)' }}
                onClick={() => { window.location.href = link(s.href) }}
              >
                <div className="text-3xl mb-4">{s.icon}</div>
                <h3 className="font-bold mb-2 text-base sm:text-[18px]" style={{ color: '#613717' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600 mb-4">{s.desc}</p>
                <span className="font-semibold italic underline group-hover:text-[#E7873C] transition-colors text-sm sm:text-[15px]" style={{ color: '#432208' }}>
                  Get started
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════
          5. HOW IT WORKS — numbered steps
      ═══════════════════════════════════════════ */}
      <section style={{ background: '#F6F4F0', padding: '60px 0' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
          <div className="text-center mb-10">
            <p className="font-semibold uppercase tracking-widest mb-3 text-sm" style={{ color: '#613717' }}>HOW IT WORKS</p>
            <h2 className="font-bold text-xl sm:text-2xl xl:text-[40px]" style={{ color: '#613717', lineHeight: '98%' }}>
              A structured workflow for every student journey.
            </h2>
          </div>

          <div className="rounded-[23px] bg-white pt-8 pb-10 px-5 sm:px-8" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            {/* Dot + line — hidden on mobile */}
            <div className="hidden md:flex items-center justify-between mb-2 px-4">
              {WORKFLOW_STEPS.map((_, i) => (
                <div key={i} className="flex items-center flex-1">
                  <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: '#F8984D' }} />
                  {i < WORKFLOW_STEPS.length - 1 && <div className="flex-1 h-px" style={{ background: '#F8984D' }} />}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-2">
              {WORKFLOW_STEPS.map((step, i) => (
                <div key={i} className="text-center py-3 md:py-0">
                  <span className="block font-bold text-4xl sm:text-5xl lg:text-[52px]" style={{ color: '#B54F00', lineHeight: '63px' }}>
                    {step.num}
                  </span>
                  <h4 className="font-bold text-xs sm:text-sm mb-1" style={{ color: '#613717' }}>{step.title}</h4>
                  <p className="text-xs text-gray-500">{step.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════
          6. AI FEATURES
      ═══════════════════════════════════════════ */}
      <section style={{ padding: '60px 0', background: '#FFFBF6' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
            <div className="w-full lg:w-[340px] lg:flex-shrink-0">
              <p className="font-semibold uppercase tracking-widest mb-4 text-sm" style={{ color: '#613717' }}>NEW — AI-POWERED</p>
              <h2 className="font-bold mb-4 text-2xl sm:text-3xl xl:text-[40px]" style={{ color: '#613717', lineHeight: '98%' }}>
                Smarter consulting, powered by AI.
              </h2>
              <p className="text-sm" style={{ color: '#613717', lineHeight: '17px', letterSpacing: '-0.03em' }}>
                Edubee's AI suite automates routine tasks so your team can focus on building student relationships.
              </p>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-5">
              {AI_FEATURES.map((f, i) => (
                <div
                  key={i}
                  className="rounded-[26px] p-6 sm:p-7 flex flex-col"
                  style={{ background: '#FFFBF6', boxShadow: '4px 4px 9.5px -3px rgba(0,0,0,0.15)' }}
                >
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="font-bold mb-2 text-lg sm:text-[22px]" style={{ color: '#B54F00' }}>{f.title}</h3>
                  <p className="text-sm mb-4 leading-relaxed" style={{ color: '#000', fontWeight: 300, lineHeight: '16px' }}>{f.desc}</p>
                  <ul className="space-y-1 mb-5 flex-1">
                    {f.features.map((feat, j) => (
                      <li key={j} className="font-semibold text-xs sm:text-[13px]" style={{ color: '#B54F00', lineHeight: '14px' }}>
                        • {feat}
                      </li>
                    ))}
                  </ul>
                  <button
                    className="w-full py-2.5 rounded-[28px] font-medium text-white text-sm transition-opacity hover:opacity-90"
                    style={{ background: '#FF9039' }}
                  >
                    {f.badge}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════
          7. STOP RE-ENTERING DATA
      ═══════════════════════════════════════════ */}
      <section style={{ background: '#FAFAF9', padding: '60px 0' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-center">
            <div className="flex-1 w-full">
              <div
                className="rounded-2xl overflow-x-auto"
                style={{
                  background: '#1E1E2E',
                  padding: '24px',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  lineHeight: '1.7',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ color: '#75715E', marginBottom: 12 }}># Student Data — Auto-synced across all modules</div>
                <div style={{ color: '#A6E22E' }}>
                  <span style={{ color: '#F92672' }}>student</span>
                  <span style={{ color: '#A6E22E' }}> = </span>
                  <span style={{ color: '#E6DB74' }}>create_student</span>
                  <span style={{ color: '#F8F8F2' }}>(&#123;</span>
                </div>
                <div style={{ color: '#F8F8F2' }}>&nbsp;&nbsp;<span style={{ color: '#AE81FF' }}>name</span>: <span style={{ color: '#E6DB74' }}>"Kim Minjun"</span>,</div>
                <div style={{ color: '#F8F8F2' }}>&nbsp;&nbsp;<span style={{ color: '#AE81FF' }}>visa_status</span>: <span style={{ color: '#E6DB74' }}>"approved"</span>,</div>
                <div style={{ color: '#F8F8F2' }}>&nbsp;&nbsp;<span style={{ color: '#AE81FF' }}>commission_due</span>: <span style={{ color: '#AE81FF' }}>3200</span>,</div>
                <div style={{ color: '#F8F8F2' }}>&nbsp;&nbsp;<span style={{ color: '#AE81FF' }}>school</span>: <span style={{ color: '#E6DB74' }}>"UNSW Sydney"</span></div>
                <div style={{ color: '#F8F8F2' }}>&#125;)</div>
                <div style={{ color: '#75715E', marginTop: 12 }}># ✓ CRM updated &nbsp; ✓ Invoice generated &nbsp; ✓ Commission tracked</div>
                <div style={{ color: '#75715E' }}># ✓ Dashboard synced &nbsp; ✓ Staff notified</div>
              </div>
            </div>

            <div className="flex-1 w-full lg:max-w-[450px]">
              <h2 className="font-bold mb-4 text-2xl sm:text-3xl xl:text-[40px]" style={{ color: '#613717', lineHeight: '98%' }}>
                Stop re-entering data. Start running your agency.
              </h2>
              <p className="mb-6 text-sm sm:text-base" style={{ color: '#613717', fontWeight: 300, lineHeight: '1.4', letterSpacing: '-0.03em' }}>
                One input. Every report. Edubee eliminates duplicate data entry — everything flows automatically into your reports, dashboards, and staff KPIs.
              </p>
              <div className="space-y-3">
                {['Auto-sync across CRM, finance & docs', 'Real-time dashboards for every branch', 'Staff KPIs updated automatically'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#FF9039' }}>
                      <Check size={12} color="white" strokeWidth={3} />
                    </div>
                    <span className="text-sm" style={{ color: '#613717' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════
          8. PRICING TABLE
      ═══════════════════════════════════════════ */}
      <section style={{ background: '#FFFBF6', padding: '60px 0' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
          <div className="text-center mb-10">
            <p className="font-semibold uppercase tracking-widest mb-2 text-sm" style={{ color: '#613717' }}>PRICING</p>
            <h2 className="font-bold mb-2 text-2xl sm:text-3xl xl:text-[40px]" style={{ color: '#613717', lineHeight: '98%' }}>
              Transparent pricing. No surprises.
            </h2>
          </div>

          {/* Mobile: card layout */}
          <div className="sm:hidden space-y-4">
            {pricingTable.map((row, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-5"
                style={{
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  borderLeft: row.highlighted ? '3px solid #FF9039' : '3px solid transparent',
                  background: row.highlighted ? 'rgba(255,144,57,0.04)' : 'white',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm" style={{ color: '#613717' }}>{row.plan}</span>
                    {row.highlighted && <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: '#FF9039' }}>Popular</span>}
                  </div>
                  <span className="font-semibold text-sm" style={{ color: '#200E00' }}>
                    {row.contact ? 'Contact us' : row.price}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                  <span>{row.students} students</span>
                  <span>{row.storage} storage</span>
                  <span>{row.schoolDB ? '✓ School DB' : '— School DB'}</span>
                  <span>{row.remote ? '✓ Multi-Branch' : '— Multi-Branch'}</span>
                </div>
                <a
                  href={link(row.contact ? '/support/contact' : '/admin/register')}
                  className="inline-flex items-center gap-1 text-sm font-semibold"
                  style={{ color: '#E7873C' }}
                >
                  {row.contact ? 'Contact' : 'Get started'} <ArrowRight size={14} />
                </a>
              </div>
            ))}
          </div>

          {/* Tablet+: table layout */}
          <div className="hidden sm:block overflow-x-auto rounded-xl" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <table className="w-full bg-white">
              <thead>
                <tr style={{ background: '#F6F4F0', borderBottom: '2px solid #E8E6E2' }}>
                  {['Plan', 'Monthly Price', 'Active Students', 'Storage', 'School DB', 'Multi-Branch', ''].map((h, i) => (
                    <th key={i} className="px-4 lg:px-6 py-4 text-left text-sm font-semibold" style={{ color: '#613717' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pricingTable.map((row, i) => (
                  <tr
                    key={i}
                    className="transition-colors hover:bg-orange-50/40 border-b last:border-b-0"
                    style={{
                      background: row.highlighted ? 'rgba(255,144,57,0.04)' : 'white',
                      borderColor: '#F0EDE8',
                      borderLeft: row.highlighted ? '3px solid #FF9039' : '3px solid transparent',
                    }}
                  >
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm" style={{ color: '#613717' }}>{row.plan}</span>
                        {row.highlighted && <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: '#FF9039' }}>Popular</span>}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 font-semibold text-sm" style={{ color: '#200E00' }}>
                      {row.contact ? <span style={{ color: '#613717' }}>Contact us</span> : row.price}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-sm text-gray-600">{row.students}</td>
                    <td className="px-4 lg:px-6 py-4 text-sm text-gray-600">{row.storage}</td>
                    <td className="px-4 lg:px-6 py-4">
                      {row.schoolDB ? <Check size={16} color="#FF9039" strokeWidth={2.5} /> : <span className="text-gray-300 text-lg">—</span>}
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      {row.remote ? <Check size={16} color="#FF9039" strokeWidth={2.5} /> : <span className="text-gray-300 text-lg">—</span>}
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <a
                        href={link(row.contact ? '/support/contact' : '/admin/register')}
                        className="inline-flex items-center gap-1 text-sm font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: '#E7873C' }}
                      >
                        {row.contact ? 'Contact' : 'Get started'} <ArrowRight size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-sm text-gray-400 mt-5">All plans include a 14-day free trial. No credit card required.</p>
        </div>
      </section>
      {/* ═══════════════════════════════════════════
          9. SECURITY
      ═══════════════════════════════════════════ */}
      <section style={{ background: '#FFFBF6', padding: '60px 0' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-center">
            <div className="flex-1">
              <h2 className="font-bold mb-4 text-2xl sm:text-3xl xl:text-[40px]" style={{ color: '#613717', lineHeight: '98%' }}>
                Your data is safe with Edubee.
              </h2>
              <p className="mb-8 text-sm sm:text-base" style={{ fontWeight: 300, color: '#613717', lineHeight: '1.4' }}>
                Enterprise-grade security built for agencies that handle sensitive student visa and financial data.
              </p>
              <div className="space-y-5">
                {SECURITY_ITEMS.map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl" style={{ background: 'rgba(255,144,57,0.12)' }}>
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm mb-1" style={{ color: '#613717' }}>{item.title}</h4>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full">
              <img
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=80"
                alt="Security"
                className="w-full rounded-2xl object-cover"
                style={{ height: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
              />
            </div>
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════
          10. CTA BANNER
      ═══════════════════════════════════════════ */}
      <section style={{ background: '#FF9039', padding: '60px 0' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 text-center">
          <h2 className="text-white font-bold mb-3 text-2xl sm:text-3xl xl:text-[40px]" style={{ lineHeight: '98%' }}>
            Ready to streamline your agency?
          </h2>
          <p className="text-white/80 mb-8 text-sm sm:text-base" style={{ fontWeight: 300 }}>
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
  );
}
