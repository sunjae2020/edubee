import { FadeIn } from '@/components/ui/FadeIn'
import { Button } from '@/components/ui/Button'
import { CtaBanner } from '@/components/sections/CtaBanner'
import { PageBackground } from '@/components/ui/PageBackground'

export default function CompanyPage() {
  return (
    <div>
      <section className="py-20 bg-white relative overflow-hidden">
        <PageBackground variant="wave" />
        <div className="max-w-[800px] mx-auto px-6 relative z-10">
          <FadeIn>
            <h1 className="text-[32px] font-bold text-neutral-900 mb-6">About Edubee</h1>
            <div className="space-y-5 text-neutral-700 leading-relaxed text-sm sm:text-base">
              <p>Edubee CRM was founded with a single mission: to give study abroad agencies the tools they need to run efficiently and grow confidently.</p>
              <p>We recognised that international education agencies were managing complex student journeys across spreadsheets, disconnected tools, and manual email reports. As agencies grew — adding overseas branches, hiring consultants, and working with more schools — this approach broke down.</p>
              <p>Edubee brings student management, school database, commission tracking, visa management, branch operations, and marketing analytics into a single cloud-based platform — purpose-built for study abroad agencies.</p>
              <p>We are headquartered in Melbourne, Australia, and serve agencies across South Korea, Japan, China, Southeast Asia, and beyond.</p>
              <div className="bg-neutral-50 border border-neutral-200 rounded-[12px] p-5 mt-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">Company Details</p>
                <div className="space-y-1 text-sm text-neutral-700">
                  <p><strong>Company:</strong> Edubee.Co</p>
                  <p><strong>Representative:</strong> Jason KIM</p>
                  <p><strong>Email:</strong> info@edubee.co</p>
                  <p><strong>Address:</strong> Suite 804, 343 Little Collins Street, Melbourne VIC 3000, Australia</p>
                </div>
              </div>
            </div>
            <div className="mt-10 flex gap-3 flex-wrap">
              <Button variant="primary" href="/register">Start for Free →</Button>
              <Button variant="secondary" href="/support/contact">Contact Us</Button>
            </div>
          </FadeIn>
        </div>
      </section>
      <CtaBanner />
    </div>
  )
}
