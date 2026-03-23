import { useQuery } from "@tanstack/react-query";
import { FileText, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const EMPTY: any[] = [];

interface TaxInvoiceBadgeProps {
  contractProductId: string;
  className?: string;
}

export function TaxInvoiceBadge({ contractProductId, className }: TaxInvoiceBadgeProps) {
  const { data } = useQuery({
    queryKey: ["tax-invoices-cp", contractProductId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/tax-invoices/by-contract-product/${contractProductId}`, {
        credentials: "include",
      });
      if (!res.ok) return { data: EMPTY };
      return res.json();
    },
    enabled: !!contractProductId,
    staleTime: 30_000,
  });

  const invoices: any[] = data?.data ?? EMPTY;
  if (invoices.length === 0) return null;

  const latest = invoices[0];
  const status  = latest.status as "draft" | "sent" | "paid";

  const statusConfig = {
    draft: { label: "Draft",  bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-700" },
    sent:  { label: "Sent",   bg: "bg-blue-50",   border: "border-blue-200",  text: "text-blue-700"  },
    paid:  { label: "Paid",   bg: "bg-green-50",  border: "border-green-200", text: "text-green-700" },
  };
  const cfg = statusConfig[status] ?? statusConfig.draft;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium",
        cfg.bg, cfg.border, cfg.text, className
      )}
      title={`Tax Invoice: ${latest.invoiceRef}`}
    >
      <FileText size={11} />
      {latest.invoiceRef} · {cfg.label}
    </span>
  );
}
