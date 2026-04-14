import { useState, useEffect } from 'react'
import { Menu, X, Globe, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'th', label: 'ภาษาไทย' },
]

export function Header() {
  const { t, i18n } = useTranslation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 h-[83px] transition-all duration-200"
        style={{
          background: '#F6F4F0',
          boxShadow: scrolled ? '0px 4px 4px rgba(0,0,0,0.25)' : '0px 4px 4px rgba(0,0,0,0.25)',
        }}
      >
        <div className="max-w-[1440px] mx-auto px-8 h-full flex items-center justify-between">
          <a href={link('/')} className="flex items-center flex-shrink-0">
            <img src={logoSrc} alt="Edubee.co" className="h-[42px] w-auto" />
          </a>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map(item => (
              <a
                key={item.key}
                href={link(item.href)}
                className="px-4 py-2 text-[17px] font-medium text-[#200E00] hover:text-[#E7873C] transition-colors"
              >
                {t(`nav.${item.key}`)}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 text-[17px] font-semibold text-[#200E00] hover:text-[#E7873C] transition-colors"
              >
                <Globe size={18} />
                <span>{currentLang.label}</span>
                <ChevronDown size={15} />
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-[#E8E6E2] py-1 z-50 min-w-[130px]">
                    {LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        onClick={() => { i18n.changeLanguage(l.code); setLangOpen(false) }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-[#FEF0E3] transition-colors ${l.code === i18n.language ? 'text-[#E7873C] font-semibold' : 'text-[#200E00]'}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <a
              href={link('/admin/login')}
              className="text-[17px] font-semibold text-[#200E00] hover:text-[#E7873C] transition-colors"
            >
              {t('nav.login')}
            </a>

            <a
              href={link('/admin/register')}
              className="px-5 py-2 text-[17px] font-medium text-white rounded-[28px] hover:opacity-90 transition-opacity"
              style={{ background: '#E7873C' }}
            >
              {t('nav.startFree')}
            </a>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg text-[#200E00]"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-[83px] left-0 right-0 bottom-0 bg-[#F6F4F0] overflow-y-auto">
            <div className="p-5 space-y-1">
              {NAV.map(item => (
                <a
                  key={item.key}
                  href={link(item.href)}
                  className="block px-4 py-3 text-base font-medium text-[#200E00] hover:text-[#E7873C] transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {t(`nav.${item.key}`)}
                </a>
              ))}
              <div className="pt-4 border-t border-[#E8E6E2] space-y-3">
                <a
                  href={link('/admin/login')}
                  className="block w-full text-center px-4 py-3 text-base font-semibold text-[#200E00] border border-[#E8E6E2] rounded-xl"
                >
                  {t('nav.login')}
                </a>
                <a
                  href={link('/admin/register')}
                  className="block w-full text-center px-4 py-3 text-base font-medium text-white rounded-[28px]"
                  style={{ background: '#E7873C' }}
                >
                  {t('nav.startFree')}
                </a>
              </div>
              <div className="pt-4 border-t border-[#E8E6E2]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E] mb-3">Language</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { i18n.changeLanguage(l.code); setMobileOpen(false) }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${l.code === i18n.language ? 'bg-[#E7873C] text-white' : 'bg-white text-[#200E00] border border-[#E8E6E2]'}`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
