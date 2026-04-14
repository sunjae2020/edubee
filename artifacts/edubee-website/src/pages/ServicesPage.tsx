import { ArrowRight } from 'lucide-react'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
function link(path: string) { return `${BASE}${path}` }

const CORE_SERVICES = [
  {
    icon: '🎓',
    title: 'Student Management',
    desc: 'Track every student from first enquiry to graduation. Consultation history, profiles, and 6-stage workflow all in one place.',
    features: [
      'Consultation history & profiling',
      'Quotation & contract creation',
      '6-stage workflow tracking',
      'Visa lodgement & approval',
      'Re-enrollment reminders',
    ],
    href: '/services/student',
  },
  {
    icon: '🏫',
    title: 'School Management',
    desc: 'Manage your entire school partner database — contracts, fees, commission rates, and application requirements in one searchable hub.',
    features: [
      'School database & contracts',
      'Commission rate management',
      'Program & course catalog',
      'School application tracking',
      'Document management',
    ],
    href: '/services/school',
  },
  {
    icon: '🤝',
    title: 'Partner Management',
    desc: 'Track referral partners, agreements, and commission payouts. Manage every relationship with full transparency.',
    features: [
      'Partner agreement database',
      'Commission calculation',
      'Referral source tracking',
      'Performance analytics',
      'Payment records',
    ],
    href: '/services/partner',
  },
  {
    icon: '🏢',
    title: 'Agency Management',
    desc: 'Manage multi-branch agency operations from a single dashboard. Staff access control, performance visibility, and branch-level data.',
    features: [
      'Multi-branch operations',
      'Staff account management',
      'Role-based access control',
      'Head office dashboard',
      'Branch performance reports',
    ],
    href: '/services/agency',
  },
  {
    icon: '💳',
    title: 'Tuition & Commission',
    desc: "Automated commission tracking and invoicing. Know exactly what you're owed — and what's been paid — at a glance.",
    features: [
      'Commission auto-calculation',
      'Invoice generation',
      'Payment status tracking',
      'GST & tax management',
      'Financial reporting',
    ],
    href: '/services/tuition',
  },
  {
    icon: '📊',
    title: 'Branch Operations',
    desc: 'Connect head office and overseas branches with real-time sync. Same platform, same data, anywhere in the world.',
    features: [
      'Real-time data sync',
      'Branch-level reporting',
      'Inter-branch student transfer',
      'Payroll management',
      'Operations dashboard',
    ],
    href: '/services/branch',
  },
]

const AI_FEATURES = [
  {
    icon: '🤖',
    title: 'AI Chatbot',
    desc: 'Deploy a 24/7 AI student support assistant. Instantly answer common enquiries, qualify leads, and book consultations — without lifting a finger.',
    features: [
      '24/7 automated responses',
      'Lead qualification',
      'Appointment booking',
      'Multi-language support',
      'Handoff to human agent',
    ],
  },
  {
    icon: '📝',
    title: 'AI Smart Form',
    desc: 'Intelligent application forms that auto-complete from existing student data. Reduce errors, save time, and delight students.',
    features: [
      'Auto-fill from student profile',
      'Smart field validation',
      'Document upload prompts',
      'Progress saving',
      'Submission notifications',
    ],
  },
  {
    icon: '📚',
    title: 'AI Study Advisor',
    desc: 'Personalised course and school recommendations powered by AI. Match each student to the perfect program based on their goals and profile.',
    features: [
      'Profile-based matching',
      'School ranking analysis',
      'Budget optimisation',
      'Visa success prediction',
      'Personalised report export',
    ],
  },
]

export default function ServicesPage() {
  return (
    <div style={{ background: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>

      {/* ═══════════════════════════════════════════
          1. HERO  — cream bg + floating white card
      ═══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: '#FFFBF7',
          height: 575,
          backgroundImage: 'url(https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1440&auto=format&fit=crop&q=60)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          backgroundBlendMode: 'color-burn',
          marginTop: -83,
        }}
      >
        {/* Floating white card centred in hero */}
        <div className="absolute inset-0 flex items-center justify-center px-6" style={{ paddingTop: 83 }}>
          <div
            className="w-full flex flex-col items-center justify-center"
            style={{
              maxWidth: 899,
              minHeight: 273,
              background: '#FFFFFF',
              borderRadius: 19,
              padding: '36px 48px',
              boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
            }}
          >
            {/* "All Services" pill  */}
            <div className="mb-6">
              <span
                className="inline-block px-5 py-1.5 rounded-full font-semibold"
                style={{ background: '#3C3C3C', color: '#F8984D', fontSize: 15, lineHeight: '98%' }}
              >
                All Services
              </span>
            </div>
            <h1
              className="font-bold text-center mb-4"
              style={{ fontSize: 40, color: '#613717', lineHeight: '98%', maxWidth: 915 }}
            >
              Everything your agency needs, in one platform.
            </h1>
            <p
              className="text-center"
              style={{ fontSize: 15, fontWeight: 300, color: '#613717', lineHeight: '18px', maxWidth: 500 }}
            >
              From student management to AI automation — Edubee gives international education agencies the tools to operate at their best.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          2. CORE SERVICES  —  orange bg, white cards
      ═══════════════════════════════════════════ */}
      <section style={{ background: '#FF9039', padding: '80px 0' }}>
        <div className="max-w-[1280px] mx-auto px-[128px]">
          <h2
            className="font-bold mb-2"
            style={{ fontSize: 48, color: '#613717', lineHeight: '98%' }}
          >
            Core Services
          </h2>
          <p className="mb-10" style={{ fontSize: 16, fontWeight: 300, color: '#613717', lineHeight: '19px' }}>
            The essential tools every study abroad agency needs to operate efficiently.
          </p>

          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
            {CORE_SERVICES.slice(0, 3).map((s, i) => (
              <ServiceCard key={i} service={s} />
            ))}
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CORE_SERVICES.slice(3, 6).map((s, i) => (
              <ServiceCard key={i + 3} service={s} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          3. OFFICE PHOTO BREAK
      ═══════════════════════════════════════════ */}
      <section style={{ height: 341, overflow: 'hidden', position: 'relative' }}>
        <img
          src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1493&auto=format&fit=crop&q=80"
          alt="Modern office"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }}
        />
      </section>

      {/* ═══════════════════════════════════════════
          4. AI-POWERED FEATURES  —  dark gradient bg, orange cards
      ═══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1440&auto=format&fit=crop&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'soft-light',
          backgroundColor: '#1a1a1a',
          padding: '80px 0',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(115.49deg, rgba(39,39,39,0.9) 15.14%, rgba(10,9,8,0.9) 92.66%)' }} />
        <div className="relative z-10 max-w-[1280px] mx-auto px-8">

          {/* Header */}
          <div className="text-center mb-12">
            <div className="mb-5">
              <span
                className="inline-block px-5 py-2 rounded-full font-semibold"
                style={{ background: '#3C3C3C', color: '#F8984D', fontSize: 16, lineHeight: '98%' }}
              >
                AI-Powered Features
              </span>
            </div>
            <h2
              className="text-white font-bold mb-4"
              style={{ fontSize: 48, lineHeight: '98%' }}
            >
              The future of study abroad,<br />powered by AI
            </h2>
            <p className="text-white font-light mx-auto" style={{ fontSize: 17, lineHeight: '21px', maxWidth: 767 }}>
              New AI tools that automate the repetitive and enhance the human touch.
            </p>
          </div>

          {/* AI Cards — orange bg, dark text */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {AI_FEATURES.map((f, i) => (
              <div
                key={i}
                className="rounded-[21px] p-8 flex flex-col"
                style={{
                  background: '#FF9039',
                  boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
                  minHeight: 435,
                }}
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-bold mb-3" style={{ fontSize: 21, color: '#3A1900', lineHeight: '25px' }}>
                  {f.title}
                </h3>
                <p className="mb-5" style={{ fontSize: 18, fontWeight: 300, color: '#3A1900', lineHeight: '22px', letterSpacing: '-0.02em', flex: 1 }}>
                  {f.desc}
                </p>
                <ul className="space-y-1 mb-6">
                  {f.features.map((feat, j) => (
                    <li key={j} style={{ fontSize: 15, fontWeight: 200, color: '#3A1900', lineHeight: '18px' }}>
                      {feat}
                    </li>
                  ))}
                </ul>
                {/* Outlined button — black border, dark text */}
                <button
                  className="w-full rounded-[24px] font-light transition-all hover:bg-black/10"
                  style={{
                    border: '1px solid #000000',
                    fontSize: 16,
                    color: '#3A1900',
                    height: 33,
                    lineHeight: '19px',
                  }}
                >
                  Request Early Access
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          5. CTA BANNER  —  orange bg
      ═══════════════════════════════════════════ */}
      <section style={{ background: '#FF9039', padding: '130px 0' }}>
        <div className="max-w-[1280px] mx-auto px-8 text-center">
          <h2
            className="text-white font-bold mb-4"
            style={{ fontSize: 48, lineHeight: '98%' }}
          >
            Ready to streamline your agency?
          </h2>
          <p
            className="text-white mb-10"
            style={{ fontSize: 24, fontWeight: 300, lineHeight: '29px' }}
          >
            Start with our free LITE plan today — no credit card required.
          </p>
          <div className="flex items-center justify-center gap-5 flex-wrap">
            {/* White pill — orange text */}
            <a
              href={link('/admin/register')}
              className="inline-flex items-center justify-center font-bold transition-all hover:scale-105"
              style={{
                background: '#FDFCFC',
                color: '#D76811',
                fontSize: 24,
                width: 233,
                height: 57,
                borderRadius: 8,
              }}
            >
              Start for Free
            </a>
            {/* Outlined white — white text */}
            <a
              href={link('/support/contact')}
              className="inline-flex items-center justify-center font-bold text-white transition-all hover:bg-white/10"
              style={{
                border: '1px solid #FFFFFF',
                fontSize: 24,
                width: 212,
                height: 57,
                borderRadius: 8,
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

/* ── Service card component ── */
function ServiceCard({ service }: { service: typeof CORE_SERVICES[0] }) {
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
  return (
    <div
      className="bg-white flex flex-col cursor-pointer hover:shadow-2xl transition-all"
      style={{
        borderRadius: 21,
        boxShadow: '3px 4px 6.1px rgba(0,0,0,0.15)',
        minHeight: 453,
        padding: '34px 34px 34px 34px',
      }}
      onClick={() => { window.location.href = `${BASE}${service.href}` }}
    >
      <div className="text-3xl mb-4">{service.icon}</div>
      <h3
        className="font-bold mb-3"
        style={{ fontSize: 21, color: '#613717', lineHeight: '25px' }}
      >
        {service.title}
      </h3>
      <p
        className="mb-5"
        style={{ fontSize: 18, fontWeight: 300, color: '#000000', lineHeight: '22px', letterSpacing: '-0.01em' }}
      >
        {service.desc}
      </p>
      <ul className="space-y-1 flex-1">
        {service.features.map((f, i) => (
          <li key={i} style={{ fontSize: 15, fontWeight: 200, color: '#613717', lineHeight: '18px' }}>
            {f}
          </li>
        ))}
      </ul>
      <a
        href={`${BASE}${service.href}`}
        className="inline-block italic underline mt-5"
        style={{ fontSize: 19, color: '#432208', fontWeight: 400 }}
        onClick={e => e.stopPropagation()}
      >
        Get started
      </a>
    </div>
  )
}
