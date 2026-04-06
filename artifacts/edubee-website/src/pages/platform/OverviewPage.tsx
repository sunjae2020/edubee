import { useTranslation } from 'react-i18next'
import { FadeIn } from '@/components/ui/FadeIn'
import { Button } from '@/components/ui/Button'
import { CtaBanner } from '@/components/sections/CtaBanner'
import { PageBackground } from '@/components/ui/PageBackground'

const STAGE_COLORS = ['bg-[#FEF0E3] border-[#F5821F]', 'bg-blue-50 border-blue-400', 'bg-green-50 border-green-500', 'bg-purple-50 border-purple-400', 'bg-yellow-50 border-yellow-400', 'bg-pink-50 border-pink-400']

export default function OverviewPage() {
  const { t } = useTranslation()
  const stages = [1, 2, 3, 4, 5, 6].map(n => ({
    n,
    title: t(`home.workflow.stage${n}Title`),
    body:  t(`home.workflow.stage${n}Body`),
  }))
  return (
    <div>
      <section className="py-20 bg-white relative overflow-hidden">
        <PageBackground variant="topography" />
        <div className="max-w-[800px] mx-auto px-6 relative z-10">
          <FadeIn>
            <h1 className="text-[32px] font-bold text-neutral-900 mb-4">Program Overview</h1>
            <p className="text-neutral-600 mb-12">Edubee's 6-stage workflow covers every student touchpoint — from first enquiry to re-enrollment.</p>
            <div className="space-y-4">
              {stages.map(({ n, title, body }) => (
                <div key={n} className={`flex gap-5 p-6 rounded-[12px] border-l-4 bg-neutral-50 border border-neutral-200 ${STAGE_COLORS[(n - 1) % STAGE_COLORS.length]}`}>
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-[#F5821F] text-[#F5821F] font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {n}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900 mb-1">{title}</h3>
                    <p className="text-sm text-neutral-600 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <Button variant="primary" href="/register">Start for Free →</Button>
            </div>
          </FadeIn>
        </div>
      </section>
      <CtaBanner />
    </div>
  )
}
