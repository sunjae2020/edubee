import { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps {
  children: ReactNode
  variant?: Variant
  size?: Size
  onClick?: () => void
  href?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
  fullWidth?: boolean
}

const V: Record<Variant, string> = {
  primary:   'bg-[#F5821F] text-white border-transparent hover:bg-[#D96A0A] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(245,130,31,0.25)]',
  secondary: 'bg-white text-[#1C1917] border-[#E8E6E2] hover:border-[#A8A29E] hover:bg-[#F4F3F1]',
  ghost:     'bg-transparent text-[#57534E] border-transparent hover:bg-[#F4F3F1] hover:text-[#1C1917]',
  danger:    'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] hover:bg-[#DC2626] hover:text-white',
}

const S: Record<Size, string> = {
  sm:'px-3 py-1.5 text-xs',
  md:'px-5 py-2.5 text-sm',
  lg:'px-6 py-3 text-base',
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

function resolveHref(href: string): string {
  if (!href) return href
  if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return href
  if (href.startsWith('/') && BASE) return `${BASE}${href}`
  return href
}

export function Button({ children, variant='primary', size='md', onClick, href, type='button', disabled, className='', fullWidth }: ButtonProps) {
  const base = `inline-flex items-center justify-center gap-2 font-semibold rounded-[8px] border-[1.5px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${V[variant]} ${S[size]} ${fullWidth?'w-full':''} ${className}`
  if (href) return <a href={resolveHref(href)} className={base}>{children}</a>
  return <button type={type} onClick={onClick} disabled={disabled} className={base}>{children}</button>
}
