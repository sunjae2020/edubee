import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FadeIn } from '@/components/ui/FadeIn'
import { CtaBanner } from '@/components/sections/CtaBanner'
import { PageBackground } from '@/components/ui/PageBackground'

// Static fallback plans (used if API is unavailable)
const STATIC_PLANS = [
  {
    planName: 'LITE',
    price: { amount: 0, isFree: true, betaFree: false, comingSoon: false },
    studentsPerMonth: '50/mo',
    storage: '10 GB',
    schoolDB: false,
    remote: false,
    highlighted: false,
    ctaUrl: '/register',
  },
  {
    planName: 'PLUS',
    price: { amount: 9.90, isFree: false, betaFree: true, comingSoon: false },
    studentsPerMonth: 'Unlimited',
    storage: '100 GB',
    schoolDB: false,
    remote: false,
    highlighted: true,
    ctaUrl: '/register',
  },
  {
    planName: 'BUSINESS',
    price: { amount: 19.90, isFree: false, betaFree: false, comingSoon: false },
    studentsPerMonth: 'Unlimited',
    storage: '500 GB',
    schoolDB: true,
    remote: false,
    highlighted: false,
    ctaUrl: '/register',
  },
  {
    planName: 'ENTERPRISE',
    price: { amount: 39.90, isFree: false, betaFree: false, comingSoon: false },
    studentsPerMonth: 'Unlimited',
    storage: '1 TB',
    schoolDB: true,
    remote: true,
    highlighted: false,
    ctaUrl: '/support/contact',
  },
]

type UiPlan = typeof STATIC_PLANS[0]

function mapApiPlan(p: any): UiPlan {
  const monthly = parseFloat(p.priceMonthly ?? '0') || 0
  const isFree = monthly === 0
  return {
    planName: (p.name || p.code || '').toUpperCase(),
    price: {
      amount: monthly,
      isFree,
      betaFree: !isFree && !!p.isPopular,
      comingSoon: false,
    },
    studentsPerMonth: p.maxStudents ? `${p.maxStudents}/mo` : 'Unlimited',
    storage: p.storageGb ? (p.storageGb >= 1000 ? `${p.storageGb / 1000} TB` : `${p.storageGb} GB`) : '10 GB',
    schoolDB: !!(p.featureCommission || p.featureServiceModules || p.featureVisa),
    remote: !!(p.featureAiAssistant || p.featureApiAccess || p.featureWhiteLabel),
    highlighted: !!p.isPopular,
    ctaUrl: '/register',
  }
}

function PriceDisplay({ price }: { price: UiPlan['price'] }) {
  const { t } = useTranslation()
  if (price.comingSoon) return <Badge variant="neutral">{t('pricing.comingSoon')}</Badge>
  if (price.isFree) return <span className="text-3xl font-bold text-neutral-900">Free</span>
  if (price.betaFree) return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-[#F5821F]">Free</span>
        <Badge variant="brand">{t('pricing.betaFree')}</Badge>
      </div>
      <span className="text-sm text-neutral-400 line-through">${price.amount.toFixed(2)}/mo</span>
    </div>
  )
  return (
    <div>
      <span className="text-3xl font-bold text-neutral-900">${price.amount.toFixed(2)}</span>
      <span className="text-sm text-neutral-500">/mo</span>
    </div>
  )
}

export default function PricingPage() {
  const { t } = useTranslation()
  const [plans, setPlans] = useState<UiPlan[]>(STATIC_PLANS)

  useEffect(() => {
    fetch('/api/public/platform-plans')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.success && Array.isArray(d.data) && d.data.length > 0) {
          setPlans(d.data.map(mapApiPlan))
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div>
      <section className="pt-6 pb-20 bg-white border-b border-neutral-200 relative overflow-hidden">
        <PageBackground variant="diagonal" />
        <div className="max-w-[1280px] mx-auto px-6 text-center relative z-10">
          <FadeIn>
            <h1 className="text-[32px] font-bold text-neutral-900 mb-4">{t('pricing.heading')}</h1>
            <p className="text-base text-neutral-600 max-w-lg mx-auto">{t('pricing.sub')}</p>
          </FadeIn>
        </div>
      </section>

      <section className="py-16 bg-neutral-50">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => (
              <FadeIn key={plan.planName} delay={i * 80}>
                <div className={`bg-white border rounded-[12px] p-6 flex flex-col h-full transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] ${plan.highlighted ? 'border-[#F5821F] shadow-[0_0_0_2px_#F5821F]' : 'border-neutral-200'}`}>
                  {plan.highlighted && <Badge variant="brand" className="mb-4 self-start">{t('pricing.mostPopular')}</Badge>}
                  <h2 className="text-xl font-bold text-neutral-900 mb-4">{plan.planName}</h2>
                  <div className="mb-6"><PriceDisplay price={plan.price} /></div>
                  <ul className="space-y-2.5 mb-6 flex-1 text-sm">
                    <li className="flex items-center gap-2 text-neutral-700">
                      <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                      {plan.studentsPerMonth} students/mo
                    </li>
                    <li className="flex items-center gap-2 text-neutral-700">
                      <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                      {plan.storage} storage
                    </li>
                    <li className="flex items-center gap-2 text-neutral-700">
                      {plan.schoolDB
                        ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                        : <X size={14} className="text-neutral-300 flex-shrink-0" />}
                      School database
                    </li>
                    <li className="flex items-center gap-2 text-neutral-700">
                      {plan.remote
                        ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                        : <X size={14} className="text-neutral-300 flex-shrink-0" />}
                      Remote support
                    </li>
                    <li className="flex items-center gap-2 text-neutral-700">
                      <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                      Partner supplier list
                    </li>
                  </ul>
                  <Button
                    variant={plan.highlighted ? 'primary' : 'secondary'}
                    fullWidth
                    href={plan.price.comingSoon ? '/support/contact' : (plan.ctaUrl || '/register')}
                  >
                    {plan.price.comingSoon
                      ? t('pricing.comingSoon')
                      : (plan.price.isFree || plan.price.betaFree
                        ? t('pricing.ctaPrimary')
                        : `Get ${plan.planName}`)}
                  </Button>
                </div>
              </FadeIn>
            ))}
          </div>
          <p className="text-xs text-neutral-400 text-center mt-4">{t('home.pricingPreview.noteGst')}</p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">{t('pricing.refundHeading')}</h2>
          <div className="space-y-3">
            {['refund1', 'refund2', 'refund3', 'refund4'].map(key => (
              <div key={key} className="flex items-start gap-3">
                <CheckCircle size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-neutral-600">{t(`pricing.${key}`)}</p>
              </div>
            ))}
            <div className="flex items-start gap-3">
              <CheckCircle size={15} className="text-[#F5821F] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-600">{t('pricing.refundContact')}</p>
            </div>
          </div>
        </div>
      </section>

      <CtaBanner />
    </div>
  )
}
