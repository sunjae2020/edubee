import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
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
    { l: 'Program Overview',    h: '/program/overview' },
    { l: 'Operations',          h: '/program/operations' },
    { l: 'Marketing Reports',   h: '/program/marketing' },
    { l: 'Access Guide',        h: '/program/access' },
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

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="bg-[#111110]" style={{
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66 L0 50 L0 16 L28 0 L56 16 L56 50 Z' fill='none' stroke='rgba(255,255,255,0.05)' stroke-width='1'/%3E%3Cpath d='M28 66 L28 100' fill='none' stroke='rgba(255,255,255,0.05)' stroke-width='1'/%3E%3C/svg%3E\")",
      backgroundSize: '56px 100px',
    }}>
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <a href={link('/')} className="flex items-center mb-3">
              <img
                src={logoSrc}
                alt="Edubee.co"
                className="h-7 w-auto"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </a>
            <p className="text-sm text-[#9CA3AF] mb-4 leading-relaxed">{t('footer.tagline')}</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs text-[#6B7280]">
                <MapPin size={13} className="flex-shrink-0 mt-0.5 text-[#6B7280]"/>
                <span>{t('footer.address')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <Mail size={13} className="text-[#6B7280]"/>
                <a href="mailto:info@edubee.co" className="hover:text-[#F5821F] transition-colors">{t('footer.email')}</a>
              </div>
            </div>
          </div>
          {(['services', 'platform', 'company', 'support'] as const).map(col => (
            <div key={col}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-3">
                {t(`footer.${col === 'services' ? 'col1' : col === 'platform' ? 'col2' : col === 'company' ? 'col3' : 'col4'}`)}
              </p>
              <ul className="space-y-2">
                {LINKS[col].map(lnk => (
                  <li key={lnk.h}>
                    <a href={link(lnk.h)} className="text-sm text-[#9CA3AF] hover:text-[#F5821F] transition-colors">{lnk.l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-[#4B5563]">{t('footer.copyright')}</p>
          <LanguageSwitcher mode="pills" />
        </div>
      </div>
    </footer>
  )
}
