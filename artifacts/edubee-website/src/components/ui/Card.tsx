import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hoverable?: boolean
  padding?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

export function Card({ children, className='', hoverable=false, padding='md', onClick }: CardProps) {
  const p = { sm:'p-4', md:'p-5 sm:p-6', lg:'p-6 sm:p-8' }
  return (
    <div
      className={`bg-white border border-[#E8E6E2] rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-200 ${hoverable?'hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 cursor-pointer':''} ${p[padding]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
