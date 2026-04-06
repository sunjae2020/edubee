import { useTranslation } from 'react-i18next'
import { FadeIn } from '@/components/ui/FadeIn'
import { Button } from '@/components/ui/Button'
import { CtaBanner } from '@/components/sections/CtaBanner'
import { PageBackground } from '@/components/ui/PageBackground'

const SCHEDULE = [
  { label: 'Branch income reconciled',  time: '00:00 daily' },
  { label: 'Visa expiry alerts sent',   time: '06:00 daily' },
  { label: 'Commission reminders',      time: '09:00 daily' },
  { label: 'Weekly KPI report ready',   time: 'Mon 09:00' },
  { label: 'Monthly dashboard updated', time: '1st of month 00:00' },
]

export default function OperationsPage() {
  const { t } = useTranslation()
  return (
    <div>
      <section className="py-20 bg-white relative overflow-hidden">
        <PageBackground variant="circuit" />
        <div className="max-w-[800px] mx-auto px-6 relative z-10">
          <FadeIn>
            <h1 className="text-[32px] font-bold text-neutral-900 mb-4">Operations Automation</h1>
            <p className="text-neutral-600 mb-12">Edubee automates your routine operations so your team can focus on consulting, not admin.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
              {(['daily', 'weekly', 'monthly', 'auto'] as const).map(key => (
                <div key={key} className="p-5 bg-neutral-50 rounded-[12px] border border-neutral-200">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#F5821F]">{t(`home.automation.${key}`)}</span>
                  <p className="text-sm text-neutral-600 mt-1">{t(`home.automation.${key}Body`)}</p>
                </div>
              ))}
            </div>
            <h2 className="text-lg font-bold text-neutral-900 mb-4">Automation Schedule</h2>
            <div className="bg-neutral-900 rounded-[12px] p-6 text-white font-mono text-sm space-y-3">
              {SCHEDULE.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    <span className="text-neutral-300">{item.label}</span>
                  </div>
                  <span className="text-neutral-500 text-xs">{item.time}</span>
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
