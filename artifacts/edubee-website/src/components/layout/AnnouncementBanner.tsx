import { useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function AnnouncementBanner() {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div className="bg-[#FEF0E3] border-b border-[#F5821F]/20 px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
      <span className="text-[#57534E] text-center">{t('banner.text')}</span>
      <a href="/register" className="text-[#F5821F] font-semibold hover:text-[#D96A0A] transition-colors whitespace-nowrap">
        {t('banner.cta')}
      </a>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 text-[#A8A29E] hover:text-[#57534E] flex-shrink-0"
      >
        <X size={14}/>
      </button>
    </div>
  )
}
