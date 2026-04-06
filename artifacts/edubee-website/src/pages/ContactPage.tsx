import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Mail, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FadeIn } from '@/components/ui/FadeIn'
import { PageBackground } from '@/components/ui/PageBackground'

export default function ContactPage() {
  const { t } = useTranslation()
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    agencyName: '', yourName: '', phone: '', email: '', website: '', enquiryType: 'general', message: '',
  })
  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = () => {
    const mailto = `mailto:info@edubee.co?subject=Enquiry from ${form.agencyName}&body=Agency: ${form.agencyName}%0AName: ${form.yourName}%0APhone: ${form.phone}%0AEmail: ${form.email}%0AType: ${form.enquiryType}%0A%0A${form.message}`
    window.location.href = mailto
    setSubmitted(true)
  }

  return (
    <section className="py-20 bg-neutral-50 min-h-[70vh] relative overflow-hidden">
      <PageBackground variant="wave" />
      <div className="max-w-[1280px] mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <FadeIn className="lg:col-span-2">
            <h1 className="text-[28px] font-bold text-neutral-900 mb-2">{t('contact.heading')}</h1>
            <p className="text-sm text-neutral-600 mb-8">{t('contact.sub')}</p>
            {submitted ? (
              <div className="bg-white border border-neutral-200 rounded-[12px] p-12 text-center">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-neutral-900 mb-2">{t('contact.successHeading')}</h2>
                <p className="text-sm text-neutral-600">{t('contact.successBody')}</p>
              </div>
            ) : (
              <div className="bg-white border border-neutral-200 rounded-[12px] p-6 sm:p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input label={t('contact.agencyName')} required placeholder="My Study Agency" value={form.agencyName} onChange={update('agencyName')} />
                  <Input label={t('contact.yourName')} required placeholder="Jason KIM" value={form.yourName} onChange={update('yourName')} />
                  <Input label={t('contact.phone')} required type="tel" placeholder="+61 4xx xxx xxx" value={form.phone} onChange={update('phone')} />
                  <Input label={t('contact.email')} required type="email" placeholder="you@agency.com" value={form.email} onChange={update('email')} />
                </div>
                <Input label={t('contact.website')} placeholder="https://youragency.com" value={form.website} onChange={update('website')} />
                <Input
                  label={t('contact.enquiryType')}
                  select
                  value={form.enquiryType}
                  onChange={update('enquiryType')}
                  options={[
                    { value: 'general',  label: t('contact.enquiryGeneral') },
                    { value: 'service',  label: t('contact.enquiryService') },
                    { value: 'proposal', label: t('contact.enquiryProposal') },
                    { value: 'refund',   label: t('contact.enquiryRefund') },
                  ]}
                />
                <Input label={t('contact.message')} multiline rows={5} placeholder="..." value={form.message} onChange={update('message')} />
                <Button variant="primary" fullWidth onClick={handleSubmit}>{t('contact.submit')}</Button>
                <p className="text-xs text-neutral-400 text-center">{t('contact.betaNote')}</p>
              </div>
            )}
          </FadeIn>

          <FadeIn delay={200}>
            <div className="space-y-6 pt-2">
              <div className="bg-white border border-neutral-200 rounded-[12px] p-6">
                <h3 className="text-sm font-semibold text-neutral-900 mb-4">Contact Details</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Mail size={15} className="text-[#F5821F] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-neutral-500">Email</p>
                      <a href="mailto:info@edubee.co" className="text-sm font-medium text-neutral-900 hover:text-[#F5821F]">info@edubee.co</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin size={15} className="text-[#F5821F] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-neutral-500">Address</p>
                      <p className="text-sm text-neutral-700 leading-relaxed">Suite 804, 343 Little Collins Street<br />Melbourne VIC 3000, Australia</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}
