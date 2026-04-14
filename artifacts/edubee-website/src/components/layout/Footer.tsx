import { useTranslation } from 'react-i18next'
import { Mail, MapPin } from 'lucide-react'
const logoSrc = '/edubee-logo.png'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
function link(path: string) { return `${BASE}${path}` }

const LINKS = {
  services: [
    { l: 'Student Management', h: '/services/student' },
    { l: 'School Management',  h: '/services/school' },
    { l: 'Tuition Management', h: '/services/tuition' },
    { l: 'Branch Management',  h: '/services/branch' },
    { l: 'AI Features',        h: '/services' },
  ],
  platform: [
    { l: 'Program Overview',  h: '/program/overview' },
    { l: 'Operations',        h: '/program/operations' },
    { l: 'Marketing Reports', h: '/program/marketing' },
    { l: 'Access Guide',      h: '/program/access' },
  ],
  company: [
    { l: 'About Edubee', h: '/about/company' },
    { l: 'Why Edubee',   h: '/about/why' },
    { l: 'Security',     h: '/about/security' },
    { l: 'Pricing',      h: '/pricing' },
  ],
  support: [
    { l: 'FAQ',        h: '/support/faq' },
    { l: 'Contact Us', h: '/support/contact' },
    { l: 'Consulting', h: '/support/consulting' },
    { l: 'Notices',    h: '/support/notices' },
  ],
}

const SOCIAL_ICONS = [
  { label: 'Facebook', href: '#', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
  )},
  { label: 'Instagram', href: '#', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
  )},
  { label: 'LinkedIn', href: '#', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
  )},
  { label: 'YouTube', href: '#', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/></svg>
  )},
  { label: 'Twitter/X', href: '#', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  )},
]

/* SVG honeycomb tile — flat-top hexagons, circumradius R=28 */
const HEX_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='84' height='48.5'>
  <polygon points='28,0 14,24.25 -14,24.25 -28,0 -14,-24.25 14,-24.25'
    fill='none' stroke='rgba(255,255,255,0.055)' stroke-width='1'/>
  <polygon points='70,24.25 56,48.5 28,48.5 14,24.25 28,0 56,0'
    fill='none' stroke='rgba(255,255,255,0.055)' stroke-width='1'/>
</svg>`
const HEX_URL = `url("data:image/svg+xml,${encodeURIComponent(HEX_SVG)}")`

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer style={{ background: '#111110', fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* Honeycomb pattern overlay */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: HEX_URL,
          backgroundRepeat: 'repeat',
          backgroundSize: '84px 48.5px',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <div className="relative" style={{ zIndex: 1 }}>
      <div className="max-w-[1280px] mx-auto px-8 pt-14 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-10">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <a href={link('/')} className="flex items-center mb-4">
              <img
                src={logoSrc}
                alt="Edubee.co"
                className="h-8 w-auto"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </a>
            <p className="text-sm mb-5" style={{ color: '#9CA3AF', lineHeight: '1.6' }}>
              The CRM built for study abroad agencies. Manage students, schools, commissions, and branches — all in one place.
            </p>
            <div className="space-y-2 mb-6">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#6B7280' }} />
                <span className="text-xs" style={{ color: '#6B7280' }}>info@edubee.co</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} style={{ color: '#6B7280' }} />
                <a href="mailto:info@edubee.co" className="text-xs transition-colors hover:text-[#FF9039]" style={{ color: '#6B7280' }}>
                  info@edubee.co
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {SOCIAL_ICONS.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[#FF9039]/20"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {([
            { key: 'services', label: 'SERVICES' },
            { key: 'platform', label: 'PLATFORM' },
            { key: 'company',  label: 'COMPANY' },
            { key: 'support',  label: 'SUPPORT' },
          ] as const).map(col => (
            <div key={col.key}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#4B5563' }}>
                {col.label}
              </p>
              <ul className="space-y-2.5">
                {LINKS[col.key].map(lnk => (
                  <li key={lnk.h}>
                    <a
                      href={link(lnk.h)}
                      className="text-sm transition-colors hover:text-[#FF9039]"
                      style={{ color: '#9CA3AF' }}
                    >
                      {lnk.l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-xs" style={{ color: '#4B5563' }}>
            © {new Date().getFullYear()} Edubee.co — All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {['Privacy Policy', 'Terms of Service'].map(item => (
              <a key={item} href="#" className="text-xs transition-colors hover:text-[#FF9039]" style={{ color: '#4B5563' }}>
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
      </div>
    </footer>
  )
}
