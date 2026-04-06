import { useTranslation } from 'react-i18next'
import { Bot, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FadeIn } from '@/components/ui/FadeIn'
import { CtaBanner } from '@/components/sections/CtaBanner'
import { PageBackground } from '@/components/ui/PageBackground'

const features = [
  '24/7 automated multilingual responses (EN/KO/JA/ZH/TH/VI)',
  'Auto lead capture to CRM',
  'Human handoff for complex inquiries',
  'Chat history tracking',
]

export default function AiChatbotPage() {
  const { t } = useTranslation()
  return (
    <div>
      <section className="py-20 bg-white border-b border-neutral-200 relative overflow-hidden">
        <PageBackground variant="dots" />
        <div className="max-w-[800px] mx-auto px-6 relative z-10">
          <FadeIn>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#FEF0E3] flex items-center justify-center">
                <Bot size={24} className="text-[#F5821F]" />
              </div>
              <Badge variant="new">{t('common.newBadge')}</Badge>
            </div>
            <h1 className="text-[32px] font-bold text-neutral-900 mb-6">{t('home.ai.chatbotTitle')}</h1>
            <p className="text-base text-neutral-600 leading-relaxed mb-10">{t('home.ai.chatbotBody')}</p>
            <div className="space-y-3 mb-10">
              {features.map(f => (
                <div key={f} className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                  <span className="text-sm text-neutral-700">{f}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button variant="primary" href="/register">{t('common.startFree')}</Button>
              <Button variant="secondary" href="/services">{t('nav.services')}</Button>
            </div>
          </FadeIn>
        </div>
      </section>
      <CtaBanner />
    </div>
  )
}
