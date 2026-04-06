import React from 'react'

interface InputProps {
  label?: string
  placeholder?: string
  type?: string
  value?: string
  name?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  required?: boolean
  multiline?: boolean
  rows?: number
  select?: boolean
  options?: { value: string; label: string }[]
  className?: string
}

export function Input({ label, placeholder, type='text', value, onChange, required, multiline, rows=4, select, options=[], className='', name }: InputProps) {
  const base = `w-full border-[1.5px] border-[#E8E6E2] rounded-[8px] px-3 text-sm text-[#1C1917] bg-white placeholder:text-[#A8A29E] focus:outline-none focus:border-[#F5821F] focus:shadow-[0_0_0_3px_rgba(245,130,31,0.15)] transition-all duration-200 ${className}`
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="label text-xs font-medium uppercase tracking-wider text-[#57534E]">
          {label}
          {required && <span className="text-[#DC2626] ml-1">*</span>}
        </label>
      )}
      {multiline ? (
        <textarea name={name} placeholder={placeholder} value={value} onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>} rows={rows} required={required} className={`${base} h-auto py-2.5 resize-none`} />
      ) : select ? (
        <select name={name} value={value} onChange={onChange as React.ChangeEventHandler<HTMLSelectElement>} required={required} className={`${base} h-10`}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input name={name} type={type} placeholder={placeholder} value={value} onChange={onChange as React.ChangeEventHandler<HTMLInputElement>} required={required} className={`${base} h-10`} />
      )}
    </div>
  )
}
