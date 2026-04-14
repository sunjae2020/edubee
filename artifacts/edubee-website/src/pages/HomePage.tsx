import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Check } from 'lucide-react'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
function link(path: string) { return `${BASE}${path}` }

type PricingRow = {
  plan: string; price: string; students: string; storage: string;
  schoolDB: boolean; remote: boolean; highlighted: boolean; contact: boolean;
}

const PRICING_TABLE_FALLBACK: PricingRow[] = [
  { plan: 'LITE',       price: 'Free',    students: '30/mo',    storage: '5 GB',    schoolDB: false, remote: false, highlighted: false, contact: false },
  { plan: 'SOLO',       price: '$79/mo',  students: '100/mo',   storage: '10 GB',   schoolDB: false, remote: false, highlighted: false, contact: false },
  { plan: 'STARTER',    price: '$199/mo', students: '500/mo',   storage: '50 GB',   schoolDB: true,  remote: false, highlighted: true,  contact: false },
  { plan: 'GROWTH',     price: '$449/mo', students: '2000/mo',  storage: '200 GB',  schoolDB: true,  remote: true,  highlighted: false, contact: false },
  { plan: 'ENTERPRISE', price: '',        students: 'Unlimited', storage: 'Unlimited', schoolDB: true, remote: true, highlighted: false, contact: true },
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
  { icon: '🎓', title: 'Student Management', desc: 'Track every student from first enquiry to graduation. Consultation history, profiles, and 6-stage workflow all in one place.' },
  { icon: '🏫', title: 'School Management', desc: 'Manage your entire school partner database — contracts, fees, commission rates, and application requirements in one searchable hub.' },
  { icon: '🤝', title: 'Partner Management', desc: 'Track referral partners, agreements, and commission payouts. Manage every relationship with full transparency.' },
  { icon: '🏢', title: 'Agency Management', desc: 'Manage multi-branch agency operations from a single dashboard. Staff access controls, performance visibility, and branch-level data.' },
  { icon: '💳', title: 'Tuition & Commission', desc: 'Automated commission tracking and invoicing. Know exactly what you\'re owed — and what\'s been paid — at a glance.' },
  { icon: '📊', title: 'Branch Operations', desc: 'Connect head office and overseas branches with real-time sync. Same platform, same data, anywhere in the world.' },
]

const AI_FEATURES = [
  { icon: '🤖', title: 'AI Chatbot', desc: 'Deploy a 24/7 AI student support assistant. Instantly answer common enquiries, qualify leads, and book consultations without lifting a finger.', badge: 'Request Early Access' },
  { icon: '📝', title: 'AI Smart Form', desc: 'Intelligent application forms that auto-complete from existing student data. Reduce errors, save time, and delight students.', badge: 'Request Early Access' },
  { icon: '📚', title: 'AI Study Advisor', desc: 'Intelligent course and school recommendations powered by AI. Match each student to the perfect program based on their goals and profile.', badge: 'Request Early Access' },
]

const WORKFLOW_STEPS = [
  { num: '1', title: 'Consultation', sub: 'Profiling & estimates' },
  { num: '2', title: 'School Application', sub: 'Documents & fees' },
  { num: '3', title: 'Visa Processing', sub: 'Lodgement & approval' },
  { num: '4', title: 'Payment Management', sub: 'Batch processing' },
  { num: '5', title: 'Post-Enrollment', sub: 'Tuition & changes' },
  { num: '6', title: 'Re-enrollment', sub: 'Auto reminders' },
]

const SECURITY_ITEMS = [
  { icon: '🔒', title: 'SOC 2-Style Access Control', desc: 'Role-based permissions down to field level.' },
  { icon: '🛡️', title: 'Multi-Layer Encryption', desc: 'AES-256 at rest. TLS 1.3 in transit. Always.' },
  { icon: '🏦', title: 'Redundant Backups', desc: 'Automated daily backups. Point-in-time recovery.' },
]

export default function HomePage() {
  const { t, i18n } = useTranslation()
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

      {/* ───────── 1. HERO ───────── */}
      <section
        className="relative overflow-hidden"
        style={{
          height: 'calc(100vh - 83px)',
          minHeight: 560,
          maxHeight: 900,
          backgroundImage: 'url(https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1440&auto=format&fit=crop&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.05) 100%)' }} />
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-[1280px] mx-auto px-8 w-full">
            <div className="max-w-[680px]">
              <h1
                className="font-bold text-white mb-5"
                style={{ fontSize: 'clamp(36px, 4vw, 56px)', lineHeight: '98%', textShadow: '3px 2px 2px rgba(0,0,0,0.25)' }}
              >
                Focus on Consulting,<br />Leave the rest to Edubee
              </h1>
              <p
                className="text-white mb-8"
                style={{ fontSize: 19, fontWeight: 300, lineHeight: '23px', textShadow: '0px 4px 4px rgba(0,0,0,0.25)', maxWidth: 476 }}
              >
                The all-in-one CRM built exclusively for international education agencies. Manage students, schools, visas, tuition, and branch staff — from one platform, anywhere in the world.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <a
                  href={link('/admin/register')}
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-white font-semibold rounded-[28px] transition-opacity hover:opacity-90"
                  style={{ background: '#E7873C', fontSize: 17 }}
                >
                  Start for Free
                </a>
                <a
                  href={link('/support/consulting')}
                  className="inline-flex items-center gap-2 px-7 py-3.5 font-semibold rounded-[28px] border-2 border-white text-white transition-all hover:bg-white hover:text-[#613717]"
                  style={{ fontSize: 17 }}
                >
                  Book a Demo
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── TRUST BAR ───────── */}
      <section style={{ background: '#E36909', padding: '0 0' }}>
        <div className="max-w-[1280px] mx-auto px-8 py-5 flex items-center justify-center gap-8 flex-wrap">
          {['🇦🇺 Australia', '🇨🇦 Canada', '🇺🇸 USA', '🇵🇭 Philippines', '🇰🇷 Korea', '🇳🇿 New Zealand', '🇬🇧 UK'].map(c => (
            <span key={c} className="text-white font-semibold text-sm">{c}</span>
          ))}
        </div>
      </section>

      {/* ───────── 2. CHALLENGE SECTION ───────── */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1497366216548-37526070297c?w=1440&auto=format&fit=crop&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '80px 0 60px',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
        <div className="relative z-10 max-w-[1280px] mx-auto px-8">
          <div
            className="rounded-[26px] p-10 md:p-14"
            style={{ background: 'linear-gradient(180deg, #E07F34 0%, #EC7E29 100%)', maxWidth: 1280 }}
          >
            <div className="flex flex-col lg:flex-row gap-10 items-start">
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm uppercase tracking-widest mb-4 opacity-80">THE CHALLENGE</p>
                <h2 className="text-white font-bold mb-5" style={{ fontSize: 'clamp(28px, 3vw, 40px)', lineHeight: '98%' }}>
                  Running an agency shouldn't mean drowning in spreadsheets.
                </h2>
                <p className="text-white opacity-80" style={{ fontSize: 17, fontWeight: 300, lineHeight: '21px', maxWidth: 496 }}>
                  Most study abroad agencies manage students in Excel, track commissions in separate files, and report to branch staff by email. As your agency grows, this breaks down fast.
                </p>
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 lg:max-w-[700px]">
                {[
                  { icon: '📂', title: 'Data Silos', desc: 'Student info scattered across Excel, email, and Google Sheets — impossible to get a clear view.' },
                  { icon: '⏰', title: 'Manual Tracking', desc: 'Hours wasted re-entering data between systems. Every update is a potential error.' },
                  { icon: '⚠️', title: 'Missed Commissions', desc: 'Tracking what you\'re owed across dozens of schools is a full-time job — and things slip through.' },
                ].map((c, i) => (
                  <div key={i} className="bg-white/20 rounded-2xl p-5 backdrop-blur-sm">
                    <div className="text-2xl mb-3">{c.icon}</div>
                    <h3 className="text-white font-bold text-base mb-2">{c.title}</h3>
                    <p className="text-white/80 text-sm leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── 3. FEATURES / WHAT EDUBEE DOES ───────── */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1440&auto=format&fit=crop&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '80px 0',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'rgba(15,10,5,0.82)' }} />
        <div className="relative z-10 max-w-[1280px] mx-auto px-8">
          <div className="text-center mb-12">
            <p className="text-white/60 font-semibold text-sm uppercase tracking-widest mb-3">WHAT EDUBEE DOES</p>
            <h2
              className="text-white font-bold"
              style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', lineHeight: '98%', textShadow: '2px 4px 4px rgba(0,0,0,0.25)' }}
            >
              Everything your agency needs, in one place.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map((s, i) => (
              <div
                key={i}
                className="bg-white rounded-[21px] p-7 hover:shadow-xl transition-shadow cursor-pointer"
                style={{ boxShadow: '3px 4px 6.1px rgba(0,0,0,0.15)' }}
                onClick={() => window.location.href = link('/services')}
              >
                <div className="text-3xl mb-4">{s.icon}</div>
                <h3 className="font-bold mb-2" style={{ fontSize: 18, color: '#613717' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600 mb-4">{s.desc}</p>
                <span className="font-semibold italic underline" style={{ color: '#432208', fontSize: 15 }}>Get started</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── 4. HOW IT WORKS ───────── */}
      <section style={{ background: '#F6F4F0', padding: '80px 0' }}>
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="text-center mb-10">
            <p className="font-semibold text-sm uppercase tracking-widest mb-2" style={{ color: '#613717' }}>HOW IT WORKS</p>
            <h2 className="font-bold" style={{ fontSize: 'clamp(28px, 3vw, 40px)', color: '#613717', lineHeight: '98%' }}>
              A structured workflow for every student journey.
            </h2>
          </div>
          <div
            className="rounded-[23px] bg-white p-8 md:p-12"
            style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {WORKFLOW_STEPS.map((step, i) => (
                <div key={i} className="text-center relative">
                  {i < WORKFLOW_STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-orange-200 z-0" style={{ width: 'calc(100% - 20px)', left: '60%' }} />
                  )}
                  <div className="relative z-10">
                    <span
                      className="block font-bold leading-none mb-1"
                      style={{ fontSize: 52, color: '#B54F00', lineHeight: '63px' }}
                    >
                      {step.num}
                    </span>
                    <h4 className="font-bold text-sm mb-1" style={{ color: '#613717' }}>{step.title}</h4>
                    <p className="text-xs text-gray-500">{step.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── 5. AI FEATURES ───────── */}
      <section style={{ padding: '80px 0', background: '#FFFBF6' }}>
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            <div className="lg:w-[340px] flex-shrink-0">
              <p className="font-semibold text-sm uppercase tracking-widest mb-4" style={{ color: '#613717' }}>NEW — AI-POWERED</p>
              <h2 className="font-bold mb-4" style={{ fontSize: 'clamp(28px, 3vw, 40px)', color: '#613717', lineHeight: '98%' }}>
                Smarter consulting, powered by AI.
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: '#613717' }}>
                Edubee's AI suite automates routine tasks so your team can focus on building student relationships.
              </p>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-5">
              {AI_FEATURES.map((f, i) => (
                <div
                  key={i}
                  className="rounded-[21px] p-6 text-white"
                  style={{ background: 'linear-gradient(135deg, #FF9039 0%, #E07030 100%)' }}
                >
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="font-bold text-lg mb-3">{f.title}</h3>
                  <p className="text-sm leading-relaxed opacity-90 mb-5">{f.desc}</p>
                  <button className="px-4 py-2 rounded-full text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors border border-white/30">
                    {f.badge}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── 6. AUTOMATION / STOP RE-ENTERING DATA ───────── */}
      <section style={{ background: '#FAFAF9', padding: '80px 0' }}>
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="flex-1">
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: '#1E1E2E',
                  padding: '32px',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  lineHeight: '1.7',
                  color: '#A6E22E',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ color: '#75715E', marginBottom: 12 }}># Student Data — Auto-synced across all modules</div>
                <div><span style={{ color: '#F92672' }}>student</span> <span style={{ color: '#A6E22E' }}>=</span> <span style={{ color: '#E6DB74' }}>create_student</span>({'{'}</div>
                <div>&nbsp;&nbsp;<span style={{ color: '#AE81FF' }}>name</span>: <span style={{ color: '#E6DB74' }}>"Kim Minjun"</span>,</div>
                <div>&nbsp;&nbsp;<span style={{ color: '#AE81FF' }}>visa_status</span>: <span style={{ color: '#E6DB74' }}>"approved"</span>,</div>
                <div>&nbsp;&nbsp;<span style={{ color: '#AE81FF' }}>commission_due</span>: <span style={{ color: '#AE81FF' }}>3200</span>,</div>
                <div>&nbsp;&nbsp;<span style={{ color: '#AE81FF' }}>school</span>: <span style={{ color: '#E6DB74' }}>"UNSW Sydney"</span></div>
                <div>{'}'}</div>
                <div style={{ marginTop: 12, color: '#75715E' }}># ✓ CRM updated  ✓ Invoice generated  ✓ Commission tracked</div>
                <div style={{ color: '#75715E' }}># ✓ Dashboard synced  ✓ Staff notified</div>
              </div>
            </div>
            <div className="flex-1 lg:max-w-[450px]">
              <h2 className="font-bold mb-4" style={{ fontSize: 'clamp(28px, 3vw, 40px)', color: '#613717', lineHeight: '98%' }}>
                Stop re-entering data. Start running your agency.
              </h2>
              <p className="leading-relaxed mb-6" style={{ fontSize: 17, color: '#613717', fontWeight: 300 }}>
                One input. Every report. Edubee eliminates duplicate data entry — everything flows automatically into your reports, dashboards, and staff KPIs.
              </p>
              <div className="space-y-3">
                {['Auto-sync across CRM, finance & docs', 'Real-time dashboards for every branch', 'Staff KPIs updated automatically'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#FF9039' }}>
                      <Check size={12} color="white" strokeWidth={3} />
                    </div>
                    <span style={{ color: '#613717', fontSize: 15 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── 7. PRICING ───────── */}
      <section style={{ background: '#FFFBF6', padding: '80px 0' }}>
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="text-center mb-12">
            <p className="font-semibold text-sm uppercase tracking-widest mb-2" style={{ color: '#613717' }}>PRICING</p>
            <h2 className="font-bold mb-2" style={{ fontSize: 'clamp(28px, 3vw, 40px)', color: '#613717', lineHeight: '98%' }}>
              Transparent pricing. No surprises.
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: '#F6F4F0' }}>
                  {['Plan', 'Monthly Price', 'Active Students', 'Storage', 'School DB', 'Multi-Branch', ''].map((h, i) => (
                    <th
                      key={i}
                      className="px-6 py-4 text-left text-sm font-semibold"
                      style={{ color: '#613717', borderBottom: '2px solid #E8E6E2' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pricingTable.map((row, i) => (
                  <tr
                    key={i}
                    className="transition-colors hover:bg-orange-50/50"
                    style={{
                      background: row.highlighted ? 'rgba(255,144,57,0.06)' : 'white',
                      borderLeft: row.highlighted ? '3px solid #FF9039' : '3px solid transparent',
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm" style={{ color: '#613717' }}>{row.plan}</span>
                        {row.highlighted && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: '#FF9039' }}>Popular</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-sm" style={{ color: '#200E00' }}>
                      {row.contact ? <span style={{ color: '#613717' }}>Contact us</span> : row.price}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.students}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.storage}</td>
                    <td className="px-6 py-4">
                      {row.schoolDB ? <Check size={16} color="#FF9039" strokeWidth={2.5} /> : <span className="text-gray-300 text-lg">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      {row.remote ? <Check size={16} color="#FF9039" strokeWidth={2.5} /> : <span className="text-gray-300 text-lg">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={link(row.contact ? '/support/contact' : '/admin/register')}
                        className="inline-flex items-center gap-1 text-sm font-semibold transition-colors hover:opacity-80"
                        style={{ color: '#E7873C' }}
                      >
                        {row.contact ? 'Contact' : 'Get started'}
                        <ArrowRight size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">All plans include a 14-day free trial. No credit card required.</p>
        </div>
      </section>

      {/* ───────── 8. SECURITY ───────── */}
      <section
        className="relative overflow-hidden"
        style={{ padding: '80px 0' }}
      >
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="flex-1">
              <p className="font-semibold text-sm uppercase tracking-widest mb-3" style={{ color: '#613717' }}>SECURITY</p>
              <h2 className="font-bold mb-4" style={{ fontSize: 'clamp(28px, 3vw, 40px)', color: '#613717', lineHeight: '98%' }}>
                Your data is safe with Edubee.
              </h2>
              <p className="mb-8" style={{ fontSize: 17, fontWeight: 300, color: '#613717', lineHeight: '21px' }}>
                Enterprise-grade security built for agencies that handle sensitive student visa and financial data.
              </p>
              <div className="space-y-5">
                {SECURITY_ITEMS.map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                      style={{ background: 'rgba(255,144,57,0.12)' }}
                    >
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
            <div className="flex-1">
              <img
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=80"
                alt="Security"
                className="w-full rounded-2xl object-cover"
                style={{ height: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ───────── 9. CTA BANNER ───────── */}
      <section style={{ background: '#FF9039', padding: '80px 0' }}>
        <div className="max-w-[1280px] mx-auto px-8 text-center">
          <h2 className="text-white font-bold mb-3" style={{ fontSize: 'clamp(28px, 3vw, 40px)', lineHeight: '98%' }}>
            Ready to streamline your agency?
          </h2>
          <p className="text-white/80 mb-8" style={{ fontSize: 17, fontWeight: 300 }}>
            Start with our free LITE plan today — no credit card required.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href={link('/admin/register')}
              className="inline-flex items-center gap-2 px-8 py-4 font-semibold rounded-[28px] transition-all hover:scale-105"
              style={{ background: 'white', color: '#E7873C', fontSize: 17 }}
            >
              Start for Free
            </a>
            <a
              href={link('/support/contact')}
              className="inline-flex items-center gap-2 px-8 py-4 font-semibold rounded-[28px] border-2 border-white text-white transition-all hover:bg-white/10"
              style={{ fontSize: 17 }}
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

    </div>
  )
}
