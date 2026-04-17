const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
function link(path: string) { return `${BASE}${path}` }

const STAGES = [
  { n: 1, title: 'Consultation', sub: 'Profiling & estimates' },
  { n: 2, title: 'School Application', sub: 'Documents & fees' },
  { n: 3, title: 'Visa Processing', sub: 'Lodgement & approval' },
  { n: 4, title: 'Payment Management', sub: 'Batch processing' },
  { n: 5, title: 'Post-Enrollment', sub: 'Tuition & changes' },
  { n: 6, title: 'Re-enrollment', sub: 'Auto reminders' },
]

const OPS = [
  {
    period: 'Daily',
    items: ['New enquiry notifications', 'SMS & email auto-responses', 'Daily student status update', 'Lead qualification summary'],
  },
  {
    period: 'Weekly',
    items: ['Weekly performance summary', 'Commission adjustments', 'School communication log', 'Agent activity reports'],
  },
  {
    period: 'Monthly',
    items: ['Monthly revenue report', 'Commission calculation', 'School commission statements', 'Marketing for partners'],
  },
]

const METRICS = [
  { icon: '📢', label: 'Lead Sources', desc: 'Know which channels drive the most enquiries automatically calculated.' },
  { icon: '📈', label: 'Conversion Rate', desc: 'Track enquiry to enrolment conversion across all consultants and branches.' },
  { icon: '💵', label: 'Revenue by Channel', desc: 'Understand which referral source and school generates the most revenue.' },
  { icon: '🎯', label: 'Campaign ROI', desc: 'Track return on investment for every marketing campaign automatically.' },
]

const ACCESS = [
  { icon: '📶', title: 'Web-Based, No Install', desc: 'Run Edubee entirely in your browser. No downloads, no updates — just log in from any device.' },
  { icon: '🌐', title: 'Global Multi-Branch', desc: 'Head office, overseas branches, and remote staff all share real-time data on a single platform.' },
  { icon: '🌍', title: '6-Language Interface', desc: 'Your team can use the platform in English, Korean, Chinese, Japanese, Vietnamese, or Thai.' },
  { icon: '⚡', title: 'Fast & Reliable', desc: 'Hosted on enterprise infrastructure with 99.9% uptime SLA and end-to-end encrypted data.' },
]

export default function PlatformPage() {
  return (
    <div style={{ background: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>

      {/* ═══════════════════════════════════════════
          1. HERO — cream bg, hexagon pattern
      ═══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden flex flex-col items-center justify-center text-center"
        style={{
          background: '#FFFBF7',
          marginTop: -83,
          paddingTop: 140,
          paddingBottom: 80,
        }}
      >
        {/* Decorative hexagon dots pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(227,105,9,0.12) 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative z-10 max-w-[720px] mx-auto px-4 sm:px-8">
          <div className="mb-5">
            <span
              className="inline-block px-5 py-1.5 rounded-full font-semibold text-sm"
              style={{ background: '#3C3C3C', color: '#F8984D' }}
            >
              Platform
            </span>
          </div>
          <h1
            className="font-bold mb-5 text-2xl sm:text-3xl xl:text-[44px]"
            style={{ color: '#3B1A06', lineHeight: '110%' }}
          >
            Built for how study abroad agencies<br className="hidden sm:block" /> actually work.
          </h1>
          <p
            className="mb-8 text-sm sm:text-base mx-auto"
            style={{ fontWeight: 300, color: '#7A5535', lineHeight: '1.6', maxWidth: 540 }}
          >
            Every student follows a structured journey. Edubee maps that process — from first contact to post-enrolment — with automation that saves hours every week.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={link('/admin/register')}
              className="inline-flex items-center justify-center font-bold transition-all hover:scale-105 text-base"
              style={{
                background: '#FF9039',
                color: '#FFFFFF',
                height: 50,
                paddingLeft: 36,
                paddingRight: 36,
                borderRadius: 40,
              }}
            >
              Start for Free
            </a>
            <a
              href={link('/support/contact')}
              className="inline-flex items-center justify-center font-bold transition-all hover:bg-orange-50 text-base"
              style={{
                border: '2px solid #FF9039',
                color: '#FF9039',
                height: 50,
                paddingLeft: 36,
                paddingRight: 36,
                borderRadius: 40,
              }}
            >
              Book a Demo
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          2. 6-STAGE WORKFLOW — warm photo bg
      ═══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1440&auto=format&fit=crop&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          padding: '64px 0',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'rgba(44,20,4,0.72)' }} />
        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-8">
          <div className="mb-8">
            <span
              className="inline-block px-4 py-1.5 rounded-full font-semibold text-xs mb-4"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#F8984D' }}
            >
              Process Overview
            </span>
            <h2
              className="font-bold text-2xl sm:text-3xl xl:text-[38px] text-white mb-3"
              style={{ lineHeight: '110%' }}
            >
              The 6-Stage Student Workflow
            </h2>
            <p
              className="text-sm sm:text-base"
              style={{ fontWeight: 300, color: 'rgba(255,255,255,0.75)', lineHeight: '1.5', maxWidth: 520 }}
            >
              Every student follows a structured journey ensuring nothing falls through the cracks.
            </p>
          </div>

          {/* Steps connector */}
          <div
            className="rounded-[18px] p-6 sm:p-8"
            style={{ background: 'rgba(255,255,255,0.96)' }}
          >
            {/* Desktop: horizontal connector line */}
            <div className="hidden lg:flex items-start gap-0 relative">
              <div
                className="absolute top-5 left-[calc(100%/12)] right-[calc(100%/12)] h-px"
                style={{ background: '#E36909', opacity: 0.35 }}
              />
              {STAGES.map((s, i) => (
                <div key={s.n} className="flex-1 flex flex-col items-center text-center px-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm mb-3 relative z-10"
                    style={{ background: '#FF9039' }}
                  >
                    {s.n}
                  </div>
                  <p className="font-semibold text-sm sm:text-base mb-1" style={{ color: '#3B1A06' }}>{s.title}</p>
                  <p className="text-xs" style={{ color: '#9C6A3A', fontWeight: 300 }}>{s.sub}</p>
                </div>
              ))}
            </div>
            {/* Mobile: vertical list */}
            <div className="lg:hidden grid grid-cols-2 sm:grid-cols-3 gap-4">
              {STAGES.map(s => (
                <div key={s.n} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
                    style={{ background: '#FF9039' }}
                  >
                    {s.n}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#3B1A06' }}>{s.title}</p>
                    <p className="text-xs" style={{ color: '#9C6A3A', fontWeight: 300 }}>{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          3. OPERATIONS AUTOMATION — orange bg
      ═══════════════════════════════════════════ */}
      <section style={{ background: '#FF9039', padding: '64px 0' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
          <div className="text-center mb-10">
            <span
              className="inline-block px-4 py-1.5 rounded-full font-semibold text-xs mb-5"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#FFF' }}
            >
              Operations Automation
            </span>
            <h2
              className="font-bold text-white text-2xl sm:text-3xl xl:text-[42px] mb-3"
              style={{ lineHeight: '110%' }}
            >
              Automate the routine.<br />Focus on students.
            </h2>
            <p
              className="text-sm sm:text-base mx-auto"
              style={{ fontWeight: 300, color: 'rgba(255,255,255,0.85)', lineHeight: '1.5', maxWidth: 520 }}
            >
              Edubee runs your admin in the background so your team can focus on consulting, not clicking.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {OPS.map((op, i) => (
              <div
                key={i}
                className="rounded-[18px] p-6"
                style={{ background: 'rgba(255,255,255,0.18)' }}
              >
                <h3
                  className="font-bold text-base sm:text-lg mb-4"
                  style={{ color: '#3B1A06' }}
                >
                  {op.period}
                </h3>
                <ul className="space-y-2">
                  {op.items.map((item, j) => (
                    <li
                      key={j}
                      className="text-xs sm:text-sm"
                      style={{ fontWeight: 300, color: '#3B1A06', lineHeight: '1.5' }}
                    >
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          4. MARKETING REPORTS — split layout
      ═══════════════════════════════════════════ */}
      <section className="overflow-hidden" style={{ background: '#FAF5ED' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left — text */}
            <div>
              <span
                className="inline-block px-4 py-1.5 rounded-full font-semibold text-xs mb-5"
                style={{ background: '#3C3C3C', color: '#F8984D' }}
              >
                Marketing Reports
              </span>
              <h2
                className="font-bold text-2xl sm:text-3xl xl:text-[38px] mb-4"
                style={{ color: '#3B1A06', lineHeight: '110%' }}
              >
                Automate the routine.<br />Focus on students.
              </h2>
              <p
                className="text-sm sm:text-base"
                style={{ fontWeight: 300, color: '#7A5535', lineHeight: '1.6', maxWidth: 440 }}
              >
                Edubee automatically generates daily updates, overseas partners, and reporting reports so your team can focus on consulting, not admin.
              </p>
            </div>
            {/* Right — 2×2 metric cards */}
            <div className="grid grid-cols-2 gap-4">
              {METRICS.map((m, i) => (
                <div
                  key={i}
                  className="rounded-[18px] p-5"
                  style={{
                    background: '#FFFFFF',
                    boxShadow: '0 2px 12px rgba(100,50,0,0.08)',
                  }}
                >
                  <div className="text-2xl mb-3">{m.icon}</div>
                  <h3
                    className="font-bold text-sm sm:text-base mb-2"
                    style={{ color: '#3B1A06' }}
                  >
                    {m.label}
                  </h3>
                  <p
                    className="text-xs sm:text-sm"
                    style={{ fontWeight: 300, color: '#7A5535', lineHeight: '1.5' }}
                  >
                    {m.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          5. ACCESS & ENVIRONMENT — cream bg
      ═══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ background: '#FFFBF7', padding: '72px 0' }}
      >
        {/* Hex dot pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(227,105,9,0.10) 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-8">
          <div className="mb-10">
            <span
              className="inline-block px-4 py-1.5 rounded-full font-semibold text-xs mb-5"
              style={{ background: '#3C3C3C', color: '#F8984D' }}
            >
              Access & Environment
            </span>
            <h2
              className="font-bold text-2xl sm:text-3xl xl:text-[38px] mb-3"
              style={{ color: '#3B1A06', lineHeight: '110%' }}
            >
              Use Edubee from anywhere in the world.
            </h2>
            <p
              className="text-sm sm:text-base"
              style={{ fontWeight: 300, color: '#7A5535', lineHeight: '1.5', maxWidth: 500 }}
            >
              Your office PC, home laptop, overseas branch, or mobile — same experience, same data, always in sync.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {ACCESS.map((a, i) => (
              <div
                key={i}
                className="rounded-[18px] p-6 flex items-start gap-4"
                style={{
                  background: '#FFFFFF',
                  boxShadow: '0 2px 12px rgba(100,50,0,0.07)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-[12px] flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: '#FEF0E3' }}
                >
                  {a.icon}
                </div>
                <div>
                  <h3
                    className="font-bold text-base mb-1"
                    style={{ color: '#3B1A06' }}
                  >
                    {a.title}
                  </h3>
                  <p
                    className="text-sm"
                    style={{ fontWeight: 300, color: '#7A5535', lineHeight: '1.5' }}
                  >
                    {a.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          6. CTA BANNER
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
