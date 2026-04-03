import { Link } from "wouter";
import { buildFullName } from "@/lib/nameUtils";
import type { NameFields } from "@/lib/nameUtils";

interface ClientNameDisplayProps {
  fields:     NameFields;
  accountId?: string | null;
  size?:      "sm" | "md" | "lg";
  className?: string;
}

export function ClientNameDisplay({
  fields,
  accountId,
  size = "md",
  className = "",
}: ClientNameDisplayProps) {
  const fullName     = buildFullName(fields);
  const originalName = fields.originalName?.trim();
  const englishName  = fields.englishName?.trim();

  const fontSizes = {
    sm: { original: "text-[11px]", full: "text-xs",   english: "text-[11px]" },
    md: { original: "text-xs",     full: "text-sm",   english: "text-xs"     },
    lg: { original: "text-sm",     full: "text-base", english: "text-sm"     },
  };
  const fs = fontSizes[size];

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      {accountId ? (
        <Link
          href={`/admin/crm/accounts/${accountId}`}
          className={`${fs.full} font-semibold text-[--e-orange] hover:text-[--e-orange-hover] hover:underline transition-colors leading-tight`}
        >
          {fullName}
        </Link>
      ) : (
        <span className={`${fs.full} font-semibold text-[#1C1917] leading-tight`}>
          {fullName}
        </span>
      )}
      {originalName && (
        <span className={`${fs.original} text-[#57534E] leading-tight`} title="Original Name">
          {originalName}
        </span>
      )}
      {englishName && englishName !== fields.firstName && (
        <span className={`${fs.english} text-[#A8A29E] leading-tight`}>
          ({englishName})
        </span>
      )}
    </div>
  );
}
