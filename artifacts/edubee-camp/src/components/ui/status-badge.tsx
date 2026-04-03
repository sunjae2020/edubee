import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/_/g, ' ');

  let variantClass = "bg-[#F4F3F1] text-[#57534E]";

  if (['active', 'approved', 'contracted', 'qualified', 'converted', 'completed', 'confirmed'].includes(normalized)) {
    variantClass = "bg-[#DCFCE7] text-[#16A34A]";
  } else if (['pending', 'under review', 'new', 'submitted', 'processing'].includes(normalized)) {
    variantClass = "bg-[#FEF9C3] text-[#CA8A04]";
  } else if (['rejected', 'cancelled', 'lost', 'disputed'].includes(normalized)) {
    variantClass = "bg-[#FEF2F2] text-[#DC2626]";
  } else if (['draft'].includes(normalized)) {
    variantClass = "bg-[#F4F3F1] text-[#57534E]";
  } else if (['in progress', 'interview scheduled', 'contacted'].includes(normalized)) {
    variantClass = "bg-(--e-orange-lt) text-(--e-orange)";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize whitespace-nowrap",
        variantClass,
        className
      )}
    >
      {normalized}
    </span>
  );
}
