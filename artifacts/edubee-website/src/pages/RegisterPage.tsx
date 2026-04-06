import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PageBackground } from '@/components/ui/PageBackground'
const logoSrc = '/edubee-logo.png'

export default function RegisterPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-neutral-50 py-16 px-6 relative overflow-hidden">
      <PageBackground variant="orbits" />
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <a href="/" className="inline-block mb-6">
            <img src={logoSrc} alt="Edubee.co" className="h-10 w-auto mx-auto" />
          </a>
          <h1 className="text-xl font-bold text-neutral-900">Start for Free</h1>
          <p className="text-sm text-neutral-500 mt-1">No credit card required. Free LITE plan.</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-[12px] p-6 space-y-4">
          <Input label="Agency Name" placeholder="My Study Agency" required />
          <Input label="Your Name" placeholder="Jason KIM" required />
          <Input label="Phone" type="tel" placeholder="+61 4xx xxx xxx" required />
          <Input label="Email" type="email" placeholder="you@agency.com" required />
          <Button variant="primary" fullWidth href="https://edubee.co/register">Create Free Account →</Button>
          <p className="text-xs text-neutral-400 text-center">By signing up, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
        <p className="text-center text-sm text-neutral-500 mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-[#F5821F] font-semibold">Sign in</a>
        </p>
      </div>
    </div>
  )
}
