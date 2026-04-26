import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface AccordionItem {
  question: string
  answer: string
}

export function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="divide-y divide-[#E8E6E2] border border-[#E8E6E2] rounded-[12px] overflow-hidden">
      {items.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-semibold text-[#1C1917] hover:bg-[#F4F3F1] transition-colors"
          >
            {item.question}
            <ChevronDown
              size={16}
              className={`text-[#A8A29E] flex-shrink-0 ml-4 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
            />
          </button>
          {open === i && (
            <div className="px-6 pb-5 text-sm text-[#57534E] leading-relaxed bg-[#F4F3F1]">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
