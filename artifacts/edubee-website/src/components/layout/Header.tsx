import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
const logoSrc = '/edubee-logo.png'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
function link(path: string) { return `${BASE}${path}` }

const NAV = [
  { key: 'services', href: '/services' },
  { key: 'platform', href: '/program' },
  { key: 'pricing',  href: '/pricing' },
  { key: 'about',    href: '/about' },
  { key: 'support',  href: '/support' },
]

export function Header() {
  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-14 transition-shadow duration-200 ${scrolled ? 'bg-white shadow-[0_1px_12px_rgba(0,0,0,0.08)]' : ''}`}
        style={!scrolled ? {
          backgroundImage: 'radial-gradient(circle, rgba(245,130,31,0.13) 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
          backgroundColor: '#ffffff',
        } : undefined}
      >
        <div className="max-w-[1280px] mx-auto px-6 h-full flex items-center justify-between gap-4">
          <a href={link('/')} className="flex items-center flex-shrink-0">
            <img src={logoSrc} alt="Edubee.co" className="h-[42px] w-auto" />
          </a>

          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {NAV.map(item => (
              <a
                key={item.key}
                href={link(item.href)}
                className="px-3 py-2 text-sm text-[#57534E] hover:text-[#1C1917] hover:bg-[#F4F3F1] rounded-lg transition-all"
              >
                {t(`nav.${item.key}`)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            <LanguageSwitcher mode="dropdown" />
            <Button variant="ghost" size="sm" href="/admin/login" className="hidden sm:inline-flex">{t('nav.login')}</Button>
            <Button variant="primary" size="sm" href="/admin/register">{t('nav.startFree')}</Button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-[#57534E] hover:bg-[#F4F3F1]"
            >
              {mobileOpen ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-14 left-0 right-0 bottom-0 bg-white overflow-y-auto animate-fade-in">
            <div className="p-4 space-y-1">
              {NAV.map(item => (
                <a
                  key={item.key}
                  href={link(item.href)}
                  className="block px-4 py-3 text-sm text-[#57534E] font-medium rounded-lg hover:bg-[#F4F3F1] hover:text-[#1C1917] transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {t(`nav.${item.key}`)}
                </a>
              ))}
              <div className="pt-4 border-t border-[#E8E6E2] space-y-2">
                <Button variant="secondary" fullWidth href="/admin/login">{t('nav.login')}</Button>
                <Button variant="primary" fullWidth href="/admin/register">{t('nav.startFree')}</Button>
              </div>
              <div className="pt-4 border-t border-[#E8E6E2]">
                <p className="text-xs text-[#A8A29E] mb-2 uppercase tracking-wider font-medium">Language</p>
                <LanguageSwitcher mode="pills" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
