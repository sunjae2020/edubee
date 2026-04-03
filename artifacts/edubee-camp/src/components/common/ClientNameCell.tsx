import { Link } from "wouter";
import { buildFullName } from "@/lib/nameUtils";
import type { NameFields } from "@/lib/nameUtils";

interface ClientNameCellProps {
  fields:     NameFields;
  accountId?: string | null;
  subLabel?:  string;
}

export function ClientNameCell({ fields, accountId, subLabel }: ClientNameCellProps) {
  const fullName     = buildFullName(fields);
  const originalName = fields.originalName?.trim();

  return (
    <div className="flex flex-col gap-0.5 py-1">
      <div
        className="flex items-center gap-1.5"
        title={originalName ? `${fullName} (${originalName})` : fullName}
      >
        {accountId ? (
          <Link
            href={`/admin/crm/accounts/${accountId}`}
            className="text-sm font-semibold text-[--e-orange] hover:text-[--e-orange-hover] hover:underline transition-colors truncate max-w-[180px]"
          >
            {fullName}
          </Link>
        ) : (
          <span className="text-sm font-semibold text-[#1C1917] truncate max-w-[180px]">
            {fullName}
          </span>
        )}
        {originalName && (
          <span
            className="text-[11px] text-[#57534E] bg-[#F4F3F1] px-1.5 py-0.5 rounded-full truncate max-w-[100px]"
            title={originalName}
          >
            {originalName}
          </span>
        )}
      </div>
      {subLabel && (
        <span className="text-[11px] text-[#A8A29E]">{subLabel}</span>
      )}
    </div>
  );
}
