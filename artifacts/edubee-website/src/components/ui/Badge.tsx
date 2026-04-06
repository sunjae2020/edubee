import { ReactNode } from 'react'

type V = 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'new'

const C: Record<V, string> = {
  brand:   'bg-[#FEF0E3] text-[#F5821F]',
  success: 'bg-[#DCFCE7] text-[#16A34A]',
  warning: 'bg-[#FEF9C3] text-[#CA8A04]',
  danger:  'bg-[#FEF2F2] text-[#DC2626]',
  neutral: 'bg-[#F4F3F1] text-[#57534E]',
  new:     'bg-[#F5821F] text-white',
}

export function Badge({ children, variant='neutral', className='' }: { children: ReactNode; variant?: V; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-[999px] text-xs font-medium ${C[variant]} ${className}`}>
      {children}
    </span>
  )
}
