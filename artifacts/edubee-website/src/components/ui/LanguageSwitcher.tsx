import { useState, useEffect, useRef } from 'react'
import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'en', label: 'English',      flag: '🇦🇺' },
  { code: 'ko', label: 'Korean',        flag: '🇰🇷' },
  { code: 'ja', label: '日本語',        flag: '🇯🇵' },
  { code: 'zh', label: '简体中文',      flag: '🇨🇳' },
  { code: 'th', label: 'ภาษาไทย',      flag: '🇹🇭' },
  { code: 'vi', label: 'Tiếng Việt',   flag: '🇻🇳' },
]

export function LanguageSwitcher({ mode = 'dropdown' }: { mode?: 'dropdown' | 'pills' }) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cur = LANGS.find(l => l.code === i18n.language) || LANGS[0]

  const change = (code: string) => {
    i18n.changeLanguage(code)
    if (typeof document !== 'undefined') document.documentElement.lang = code
    setOpen(false)
  }

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  if (mode === 'pills') return (
    <div className="flex flex-wrap gap-2">
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => change(l.code)}
          className={`px-3 py-1.5 rounded-[999px] text-xs font-medium transition-all ${i18n.language === l.code ? 'bg-[#F5821F] text-white' : 'bg-[#F4F3F1] text-[#57534E] hover:bg-[#FEF0E3] hover:text-[#F5821F]'}`}
        >
          {l.flag} {l.code.toUpperCase()}
        </button>
      ))}
    </div>
  )

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#57534E] hover:bg-[#F4F3F1] hover:text-[#1C1917] transition-all"
      >
        <Globe size={15} />
        <span className="hidden sm:inline">{cur.flag} {cur.label}</span>
        <span className="sm:hidden">{cur.flag}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-40">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-[#E8E6E2] rounded-xl shadow-lg overflow-hidden z-50 animate-slide-down">
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => change(l.code)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${i18n.language === l.code ? 'text-[#F5821F] font-semibold border-l-2 border-[#F5821F] bg-[#FEF0E3]' : 'text-[#57534E] hover:bg-[#F4F3F1] hover:text-[#1C1917]'}`}
            >
              <span>{l.flag}</span><span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
