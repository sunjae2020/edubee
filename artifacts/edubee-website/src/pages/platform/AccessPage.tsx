import { Monitor, Wifi, Smartphone, Globe } from 'lucide-react'
import { FadeIn } from '@/components/ui/FadeIn'
import { Button } from '@/components/ui/Button'
import { CtaBanner } from '@/components/sections/CtaBanner'
import { PageBackground } from '@/components/ui/PageBackground'

const ACCESS_OPTIONS = [
  { icon: Monitor,    title: 'Office',           sub: 'PC browser',            body: 'Log in from any modern browser on your office desktop or laptop. No installation required.' },
  { icon: Wifi,       title: 'Home',             sub: 'Any internet connection', body: 'Work remotely from home using the same interface. All data is synced in real time.' },
  { icon: Smartphone, title: 'On the Go',        sub: 'Smartphone / tablet',    body: 'Mobile-optimised interface. Manage students, check KPIs, and receive alerts from your phone.' },
  { icon: Globe,      title: 'Overseas Branch',  sub: 'Same system worldwide',  body: 'Branches in Korea, Japan, China, or any country access the same platform. One source of truth.' },
]

export default function AccessPage() {
  return (
    <div>
      <section className="py-20 bg-white relative overflow-hidden">
        <PageBackground variant="orbits" />
        <div className="max-w-[800px] mx-auto px-6 relative z-10">
          <FadeIn>
            <h1 className="text-[32px] font-bold text-neutral-900 mb-4">Access & Environment</h1>
            <p className="text-neutral-600 mb-12">Edubee is a cloud-based platform. Use it from anywhere — your office, home, phone, or an overseas branch.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
              {ACCESS_OPTIONS.map(({ icon: Icon, title, sub, body }) => (
                <div key={title} className="p-6 bg-neutral-50 rounded-[12px] border border-neutral-200">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF0E3] flex items-center justify-center mb-4">
                    <Icon size={20} className="text-[#F5821F]" />
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-900 mb-0.5">{title}</h3>
                  <p className="text-xs text-[#F5821F] font-medium mb-2">{sub}</p>
                  <p className="text-sm text-neutral-600 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#FEF0E3] border border-[#F5821F]/20 rounded-[12px] p-5 mb-10">
              <p className="text-sm text-neutral-700 leading-relaxed">
                <strong className="text-[#F5821F]">Cloud-first:</strong> All your data lives securely in the cloud. Even if a device is lost or replaced, your data is completely unaffected. Simply log in on a new device and continue.
              </p>
            </div>
            <Button variant="primary" href="/register">Start for Free →</Button>
          </FadeIn>
        </div>
      </section>
      <CtaBanner />
    </div>
  )
}
