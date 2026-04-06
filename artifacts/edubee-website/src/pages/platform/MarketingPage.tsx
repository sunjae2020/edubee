import { BarChart3, CheckCircle } from 'lucide-react'
import { FadeIn } from '@/components/ui/FadeIn'
import { Button } from '@/components/ui/Button'
import { CtaBanner } from '@/components/sections/CtaBanner'
import { PageBackground } from '@/components/ui/PageBackground'

const ANALYTICS = [
  'Country-wise student enrolments',
  'Course popularity trends',
  'Consultant conversion rates',
  'Branch performance comparison',
  'Monthly new registration trends',
]

export default function MarketingPage() {
  return (
    <div>
      <section className="py-20 bg-white relative overflow-hidden">
        <PageBackground variant="diagonal" />
        <div className="max-w-[800px] mx-auto px-6 relative z-10">
          <FadeIn>
            <div className="w-12 h-12 rounded-xl bg-[#FEF0E3] flex items-center justify-center mb-6">
              <BarChart3 size={24} className="text-[#F5821F]" />
            </div>
            <h1 className="text-[32px] font-bold text-neutral-900 mb-4">Marketing Reports</h1>
            <p className="text-neutral-600 mb-8 leading-relaxed">
              Edubee aggregates data across countries, courses, consultants, and branches to provide actionable marketing insights. No more Excel pivot tables — your KPIs are always one click away.
            </p>
            <div className="bg-neutral-50 border border-neutral-200 rounded-[12px] p-6 mb-10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-4">Built-in Analytics</h2>
              <div className="space-y-3">
                {ANALYTICS.map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle size={15} className="text-green-500 flex-shrink-0" />
                    <span className="text-sm text-neutral-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed mb-10">
              All data is presented in visual dashboards updated in real time. Export reports as PDF or CSV for board presentations or partner meetings.
            </p>
            <Button variant="primary" href="/register">Start for Free →</Button>
          </FadeIn>
        </div>
      </section>
      <CtaBanner />
    </div>
  )
}
