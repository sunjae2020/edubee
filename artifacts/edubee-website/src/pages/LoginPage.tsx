import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PageBackground } from '@/components/ui/PageBackground'
const logoSrc = '/edubee-logo.png'

const DEMO_ACCOUNTS = [
  { label: 'Agency Admin', email: 'admin@demo.edubee.co', password: 'Demo@1234' },
  { label: 'Branch Staff', email: 'staff@demo.edubee.co', password: 'Demo@1234' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [filled, setFilled] = useState<string | null>(null)

  function fillDemo(account: typeof DEMO_ACCOUNTS[0]) {
    setEmail(account.email)
    setPassword(account.password)
    setFilled(account.label)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-neutral-50 py-16 px-6 relative overflow-hidden">
      <PageBackground variant="orbits" />
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <a href="/" className="inline-block mb-6">
            <img src={logoSrc} alt="Edubee.co" className="h-10 w-auto mx-auto" />
          </a>
          <h1 className="text-xl font-bold text-neutral-900">Welcome back</h1>
          <p className="text-sm text-neutral-500 mt-1">Sign in to your Edubee account</p>
        </div>

        <div className="mb-4">
          <p className="text-xs text-neutral-400 text-center mb-2 uppercase tracking-wider font-medium">Demo accounts — click to fill</p>
          <div className="flex gap-2">
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.label}
                onClick={() => fillDemo(acc)}
                className={`flex-1 text-xs py-2 px-3 rounded-[8px] border transition-all duration-150 text-left ${
                  filled === acc.label
                    ? 'border-[#F5821F] bg-[#FEF0E3] text-[#F5821F] font-semibold'
                    : 'border-[#E8E6E2] bg-white text-neutral-600 hover:border-[#F5821F] hover:text-[#F5821F]'
                }`}
              >
                <span className="block font-semibold">{acc.label}</span>
                <span className="block text-[10px] opacity-70 truncate">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-[12px] p-6 space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@agency.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <Button variant="primary" fullWidth href="https://edubee.co/login">Sign In</Button>
          <div className="text-center">
            <a href="https://edubee.co/register" className="text-xs text-neutral-500 hover:text-[#F5821F]">Forgot password?</a>
          </div>
        </div>
        <p className="text-center text-sm text-neutral-500 mt-6">
          Don't have an account?{' '}
          <a href="/register" className="text-[#F5821F] font-semibold hover:text-[#D96A0A]">Start for free →</a>
        </p>
      </div>
    </div>
  )
}
