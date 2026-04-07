import { useState, FormEvent } from 'react'
import { Input } from '@/components/ui/Input'
import { PageBackground } from '@/components/ui/PageBackground'
import { Loader2, CheckCircle } from 'lucide-react'

const logoSrc = '/edubee-logo.png'

export default function RegisterPage() {
  const [agencyName, setAgencyName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!agencyName || !firstName || !lastName || !email || !password) {
      setError('Please fill in all required fields.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisation: {
            name: agencyName,
            phone_number: phone || undefined,
          },
          user: {
            first_name: firstName,
            last_name: lastName,
            email,
            password,
          },
          account: {
            account_type: 'Agent',
            plan: 'lite',
          },
          service_modules: [],
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'EMAIL_ALREADY_EXISTS') {
          setError('This email is already registered. Please sign in.')
        } else {
          setError(data.message || 'Registration failed. Please try again.')
        }
        return
      }

      setSuccess(true)
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-neutral-50 py-16 px-6 relative overflow-hidden">
        <PageBackground variant="orbits" />
        <div className="w-full max-w-sm relative z-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Account Created!</h1>
          <p className="text-sm text-neutral-500 mb-8">
            Your Edubee CRM account is ready. Sign in to get started.
          </p>
          <a
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              height: '40px',
              padding: '0 24px',
              backgroundColor: '#F5821F',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Go to Sign In →
          </a>
        </div>
      </div>
    )
  }

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

        <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-[12px] p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-[8px] px-3 py-2">
              {error}
            </div>
          )}

          <Input
            label="Agency / Company Name"
            placeholder="My Study Agency"
            value={agencyName}
            onChange={e => setAgencyName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="Jason"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Last Name"
              placeholder="KIM"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
            />
          </div>
          <Input
            label="Phone"
            type="tel"
            placeholder="+61 4xx xxx xxx"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
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
            placeholder="Min. 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: '40px',
              backgroundColor: '#F5821F',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Create Free Account →'}
          </button>

          <p className="text-xs text-neutral-400 text-center">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>

        <p className="text-center text-sm text-neutral-500 mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-[#F5821F] font-semibold">Sign in</a>
        </p>
      </div>
    </div>
  )
}
