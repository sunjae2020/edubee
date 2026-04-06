import { CheckCircle } from 'lucide-react'
import { FadeIn } from '@/components/ui/FadeIn'
import { Button } from '@/components/ui/Button'
import { CtaBanner } from '@/components/sections/CtaBanner'
import { PageBackground } from '@/components/ui/PageBackground'

const STRENGTHS = [
  { title: 'Study Abroad Specialists',   body: 'Not a generic CRM. Built exclusively for international education agencies — every feature matches your exact workflow.' },
  { title: 'Affordable Pricing',         body: 'Comparable international CRMs cost $100+/month. Edubee starts free and scales at a fraction of the cost.' },
  { title: 'All-in-One Platform',        body: 'Student management, school database, commissions, accounting, branch operations — no need to switch between multiple tools.' },
  { title: 'Works Anywhere',             body: 'Web-based. Works on your office PC, home laptop, smartphone, or at an overseas branch — same experience everywhere.' },
  { title: '6-Language Support',         body: 'Built for multilingual agencies. Switch between English, Korean, Japanese, Chinese, Thai, and Vietnamese instantly.' },
  { title: 'Enterprise-Grade Security',  body: 'IDC data centre hosting, redundant database backups, strict access controls — your data is as secure as a banking system.' },
]

const FOR_YOU_IF = [
  'You feel that a CRM is necessary but the cost is a barrier',
  'You want to unify head office and branch student management',
  'You are managing growing student numbers with manual spreadsheets',
  'You need multi-branch accounting and payroll in one system',
  'You want data-driven marketing insights without Excel analysis',
]

export default function WhyPage() {
  return (
    <div>
      <section className="py-20 bg-white relative overflow-hidden">
        <PageBackground variant="dots" />
        <div className="max-w-[800px] mx-auto px-6 relative z-10">
          <FadeIn>
            <h1 className="text-[32px] font-bold text-neutral-900 mb-12">Why Edubee?</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
              {STRENGTHS.map((s, i) => (
                <div key={i} className="p-5 bg-neutral-50 rounded-[12px] border border-neutral-200">
                  <div className="w-8 h-8 rounded-lg bg-[#FEF0E3] flex items-center justify-center mb-3">
                    <CheckCircle size={16} className="text-[#F5821F]" />
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-900 mb-1.5">{s.title}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-6">Edubee is for you if...</h2>
            <div className="space-y-3">
              {FOR_YOU_IF.map(item => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-neutral-700">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex gap-3 flex-wrap">
              <Button variant="primary" href="/register">Start for Free →</Button>
              <Button variant="secondary" href="/pricing">View Pricing</Button>
            </div>
          </FadeIn>
        </div>
      </section>
      <CtaBanner />
    </div>
  )
}
