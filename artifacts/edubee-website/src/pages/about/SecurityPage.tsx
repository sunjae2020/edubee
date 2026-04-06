import { Shield, Server, Lock, Database } from 'lucide-react'
import { FadeIn } from '@/components/ui/FadeIn'
import { CtaBanner } from '@/components/sections/CtaBanner'
import { PageBackground } from '@/components/ui/PageBackground'

const SECURITY_ITEMS = [
  { icon: Server,   title: 'IDC Data Centre',       body: 'Edubee servers are hosted in a secure Internet Data Centre (IDC) with physical access controls, fire suppression, redundant power (UPS + generator), and 24/7 monitoring.' },
  { icon: Lock,     title: 'Access Control',         body: "Only authorised users can access your data via a username and password. Edubee staff cannot view your agency's data under any circumstances. If remote assistance is required, a temporary login is created with your explicit consent and destroyed immediately after use." },
  { icon: Database, title: 'Dual Redundant Backup',  body: 'All data is stored across two distributed database servers. Automatic scheduled backups ensure that in the event of hardware failure, your data can be fully restored quickly.' },
  { icon: Shield,   title: 'Firewall Protection',    body: 'Multiple layers of firewall and intrusion detection protect the system from external threats. All connections are encrypted via HTTPS/TLS.' },
]

export default function SecurityPage() {
  return (
    <div>
      <section className="py-20 bg-white relative overflow-hidden">
        <PageBackground variant="circuit" />
        <div className="max-w-[800px] mx-auto px-6 relative z-10">
          <FadeIn>
            <h1 className="text-[32px] font-bold text-neutral-900 mb-4">Security & Data Policy</h1>
            <p className="text-neutral-600 mb-12">Your agency's data is your most valuable asset. Here is how we protect it.</p>
            <div className="space-y-6">
              {SECURITY_ITEMS.map(({ icon: Icon, title, body }, i) => (
                <div key={i} className="flex gap-5 p-6 bg-neutral-50 rounded-[12px] border border-neutral-200">
                  <div className="w-11 h-11 rounded-xl bg-[#FEF0E3] flex items-center justify-center flex-shrink-0">
                    <Icon size={22} className="text-[#F5821F]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900 mb-2">{title}</h3>
                    <p className="text-sm text-neutral-600 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>
      <CtaBanner />
    </div>
  )
}
