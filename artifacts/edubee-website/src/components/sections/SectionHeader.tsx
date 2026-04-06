interface SectionHeaderProps {
  eyebrow?: string
  heading: string
  subheading?: string
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeader({ eyebrow, heading, subheading, align = 'center', className = '' }: SectionHeaderProps) {
  const a = align === 'center' ? 'text-center items-center' : 'text-left items-start'
  return (
    <div className={`flex flex-col gap-3 mb-12 ${a} ${className}`}>
      {eyebrow && (
        <span className="text-xs font-semibold uppercase tracking-widest text-[#F5821F]">{eyebrow}</span>
      )}
      <h2 className="text-[28px] sm:text-[32px] font-bold text-neutral-900 leading-tight max-w-2xl">{heading}</h2>
      {subheading && (
        <p className="text-sm sm:text-base text-neutral-600 max-w-xl leading-relaxed">{subheading}</p>
      )}
    </div>
  )
}
