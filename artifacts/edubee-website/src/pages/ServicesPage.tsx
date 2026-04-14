import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
function link(path: string) { return `${BASE}${path}` }

const CORE_SERVICES = [
  {
    icon: '🎓',
    title: 'Student Management',
    desc: 'Track every student from first enquiry to graduation. Consultation history, profiles, and 6-stage workflow all in one place.',
    features: ['Consultation history & profiling', 'Quotation & contract creation', '6-stage workflow tracking', 'Visa lodgement & approval', 'Re-enrollment reminders'],
    href: '/services/student',
  },
  {
    icon: '🏫',
    title: 'School Management',
    desc: 'Manage your entire school partner database — contracts, fees, commission rates, and application requirements in one searchable hub.',
    features: ['School database & contracts', 'Commission rate management', 'Program & course catalog', 'School application tracking', 'Document management'],
    href: '/services/school',
  },
  {
    icon: '🤝',
    title: 'Partner Management',
    desc: 'Track referral partners, agreements, and commission payouts. Manage every relationship with full transparency.',
    features: ['Partner agreement database', 'Commission calculation', 'Referral source tracking', 'Performance analytics', 'Payment records'],
    href: '/services/partner',
  },
  {
    icon: '🏢',
    title: 'Agency Management',
    desc: 'Manage multi-branch agency operations from a single dashboard. Staff access controls, performance visibility, and branch-level data.',
    features: ['Multi-branch operations', 'Staff access control', 'Performance visibility', 'Head office dashboard', 'Branch management'],
    href: '/services/agency',
  },
  {
    icon: '💳',
    title: 'Tuition & Commission',
    desc: "Automated commission tracking and invoicing. Know exactly what you're owed — and what's been paid — at a glance.",
    features: ['Commission auto-calculation', 'Invoice generation', 'Payment status tracking', 'GST & tax management', 'Multi-currency support'],
    href: '/services/tuition',
  },
  {
    icon: '📊',
    title: 'Branch Operations',
    desc: 'Connect head office and overseas branches with real-time sync. Same platform, same data, anywhere in the world.',
    features: ['Real-time data sync', 'Branch performance reports', 'Staff management', 'Payroll management', 'Franchise dashboard'],
    href: '/services/branch',
  },
]

const AI_FEATURES = [
  {
    icon: '🤖',
    title: 'AI Chatbot',
    desc: 'Deploy a 24/7 AI student support assistant. Instantly answer common enquiries, qualify leads, and book consultations without lifting a finger.',
    features: ['24/7 automated support', 'Lead qualification', 'Appointment booking', 'FAQ automation', 'Handoff to human agents'],
  },
  {
    icon: '📝',
    title: 'AI Smart Form',
    desc: 'Intelligent application forms that auto-complete from existing student data. Reduce errors, save time, and delight students.',
    features: ['Auto-complete from student data', 'Smart field validation', 'Document uploads', 'Progress tracking', 'Error prevention'],
  },
  {
    icon: '📚',
    title: 'AI Study Advisor',
    desc: 'Intelligent course and school recommendations powered by AI. Match each student to the perfect program based on their goals and profile.',
    features: ['Profile-based matching', 'Budget optimization', 'School comparison', 'Career path guidance', 'Real-time availability'],
  },
]

export default function ServicesPage() {
  const { t } = useTranslation()

  return (
    <div style={{ background: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>

      {/* ───────── HERO ───────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: '#FFFBF7',
          paddingTop: 80,
          paddingBottom: 80,
          backgroundImage: 'url(https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1440&auto=format&fit=crop&q=60)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'rgba(255,251,247,0.88)' }} />
        <div className="relative z-10 max-w-[1280px] mx-auto px-8 text-center">
          <span
            className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-5"
            style={{ background: 'rgba(231,135,60,0.15)', color: '#E7873C' }}
          >
            All Services
          </span>
          <h1
            className="font-bold mb-5"
            style={{ fontSize: 'clamp(32px, 4vw, 56px)', color: '#200E00', lineHeight: '98%' }}
          >
            Everything your agency needs,<br />in one platform.
          </h1>
          <p className="mx-auto" style={{ fontSize: 18, fontWeight: 300, color: '#613717', lineHeight: '22px', maxWidth: 560 }}>
            From Student Management to AI automation — Edubee gives international education agencies the tools to operate at their best.
          </p>
        </div>
      </section>

      {/* ───────── CORE SERVICES ───────── */}
      <section style={{ background: '#FF9039', padding: '80px 0' }}>
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="mb-10">
            <h2 className="font-bold" style={{ fontSize: 'clamp(28px, 3vw, 48px)', color: '#613717', lineHeight: '98%' }}>
              Core Services
            </h2>
            <p className="mt-3" style={{ fontSize: 16, color: '#7A3F0E', fontWeight: 400 }}>
              The tools that every study abroad agency needs to operate efficiently.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CORE_SERVICES.map((s, i) => (
              <div
                key={i}
                className="bg-white rounded-[21px] p-8 flex flex-col hover:shadow-2xl transition-all cursor-pointer"
                style={{ boxShadow: '3px 4px 6.1px rgba(0,0,0,0.15)' }}
                onClick={() => window.location.href = link(s.href)}
              >
                <div className="text-4xl mb-4">{s.icon}</div>
                <h3 className="font-bold mb-3" style={{ fontSize: 21, color: '#613717' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: '#000000', fontWeight: 300, lineHeight: '22px' }}>{s.desc}</p>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {s.features.map((f, j) => (
                    <li key={j} className="text-sm" style={{ color: '#613717', fontWeight: 200, lineHeight: '18px' }}>• {f}</li>
                  ))}
                </ul>
                <a
                  href={link(s.href)}
                  className="inline-flex items-center gap-1 font-semibold italic underline"
                  style={{ color: '#432208', fontSize: 19 }}
                >
                  Get started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── OFFICE PHOTO BREAK ───────── */}
      <section className="relative overflow-hidden" style={{ height: 400 }}>
        <img
          src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1440&auto=format&fit=crop&q=80"
          alt="Modern office"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white font-bold text-center" style={{ fontSize: 'clamp(24px, 3vw, 36px)', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            Built for agencies that think globally.
          </p>
        </div>
      </section>

      {/* ───────── AI-POWERED FEATURES ───────── */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1440&auto=format&fit=crop&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '80px 0',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(115.49deg, rgba(39,39,39,0.95) 15.14%, rgba(10,9,8,0.95) 92.66%)' }} />
        <div className="relative z-10 max-w-[1280px] mx-auto px-8">
          <div className="text-center mb-12">
            <span
              className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-5"
              style={{ background: 'rgba(255,144,57,0.25)', color: '#FF9039' }}
            >
              AI Powered Features
            </span>
            <h2 className="text-white font-bold mb-3" style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', lineHeight: '98%' }}>
              The future of study abroad,<br />powered by AI
            </h2>
            <p className="text-white/60 mx-auto" style={{ fontSize: 17, fontWeight: 300, maxWidth: 600 }}>
              New AI tools that automate the repetitive and enhance the human touch.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {AI_FEATURES.map((f, i) => (
              <div
                key={i}
                className="rounded-[21px] p-7"
                style={{ background: 'rgba(255,144,57,0.15)', border: '1px solid rgba(255,144,57,0.3)' }}
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-white text-xl mb-3">{f.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed mb-5">{f.desc}</p>
                <ul className="space-y-1.5 mb-6">
                  {f.features.map((feat, j) => (
                    <li key={j} className="text-sm text-white/60">• {feat}</li>
                  ))}
                </ul>
                <button
                  className="px-5 py-2.5 rounded-[28px] font-semibold text-sm transition-all hover:opacity-90"
                  style={{ background: '#FF9039', color: 'white' }}
                >
                  Request Early Access
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CTA BANNER ───────── */}
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
