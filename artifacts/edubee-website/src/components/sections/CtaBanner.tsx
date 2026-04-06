import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { FadeIn } from '@/components/ui/FadeIn'

export function CtaBanner() {
  const { t } = useTranslation()
  return (
    <section className="py-20 bg-[#F5821F]">
      <FadeIn>
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <h2 className="text-[28px] font-bold text-white mb-4">{t('home.cta.heading')}</h2>
          <p className="text-white/80 mb-8 max-w-md mx-auto text-sm leading-relaxed">{t('home.cta.sub')}</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button variant="secondary" href="/register" size="lg">{t('home.cta.primary')}</Button>
            <Button
              variant="ghost"
              href="/support/contact"
              size="lg"
              className="text-white border-white/40 hover:bg-white/10 hover:text-white"
            >
              {t('home.cta.secondary')}
            </Button>
          </div>
        </div>
      </FadeIn>
    </section>
  )
}
