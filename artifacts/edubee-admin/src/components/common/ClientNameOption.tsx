import { buildFullName } from "@/lib/nameUtils";
import type { NameFields } from "@/lib/nameUtils";

interface ClientNameOptionProps {
  fields:       NameFields;
  accountType?: string;
  refNumber?:   string;
}

export function ClientNameOption({ fields, accountType, refNumber }: ClientNameOptionProps) {
  const fullName     = buildFullName(fields);
  const originalName = fields.originalName?.trim();

  return (
    <div className="flex items-center justify-between gap-3 py-0.5 w-full">
      <div className="flex flex-col gap-0">
        <span className="text-sm font-medium text-[#1C1917] leading-tight">{fullName}</span>
        {originalName && (
          <span className="text-[11px] text-[#57534E] leading-tight">{originalName}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {accountType && (
          <span className="text-[10px] text-[#A8A29E] bg-[#F4F3F1] px-1.5 py-0.5 rounded-full">
            {accountType}
          </span>
        )}
        {refNumber && (
          <span className="text-[10px] text-[#A8A29E]">{refNumber}</span>
        )}
      </div>
    </div>
  );
}
