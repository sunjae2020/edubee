import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CURRENCY_SYMBOLS: Record<string, string> = { AUD: "A$", USD: "$", SGD: "S$", PHP: "₱", THB: "฿", KRW: "₩", JPY: "¥", GBP: "£" };

function DualAmount({ amount, currency, audEquivalent }: { amount?: string | number | null; currency?: string | null; audEquivalent?: string | number | null }) {
  if (!amount) return <span className="text-muted-foreground">—</span>;
  const sym = CURRENCY_SYMBOLS[currency ?? "AUD"] ?? (currency ?? "AUD");
  const num = Number(amount);
  const aud = Number(audEquivalent);
  return (
    <span>
      <span className="font-semibold">{sym}{num.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
      {currency && currency !== "AUD" && aud > 0 && <span className="ml-2 text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">≈ A${aud.toFixed(2)}</span>}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  sent: "bg-blue-100 text-blue-800 border-blue-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  overdue: "bg-red-100 text-red-800 border-red-200",
};

interface Invoice { id: string; invoiceNumber?: string | null; contractId?: string | null; totalAmount?: string | null; currency?: string | null; originalCurrency?: string | null; originalAmount?: string | null; audEquivalent?: string | null; status?: string | null; issuedAt?: string | null; dueDate?: string | null; paidAt?: string | null; }

export default function MyInvoices() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-invoices"],
    queryFn: () => axios.get(`${BASE}/api/my-accounting/invoices`).then(r => r.data),
  });
  const rows: Invoice[] = data?.data ?? [];

  const total = rows.reduce((s, r) => s + Number(r.totalAmount ?? 0), 0);
  const paid = rows.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.totalAmount ?? 0), 0);
  const outstanding = rows.filter(r => r.status === "sent" || r.status === "overdue").reduce((s, r) => s + Number(r.totalAmount ?? 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-[#F08301]/10 flex items-center justify-center"><FileText className="w-5 h-5 text-[#F08301]" /></div>
        <div><h1 className="text-lg font-bold">My Invoices</h1><p className="text-xs text-muted-foreground">Invoices issued to you — view, track and download</p></div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Total Invoiced", value: `A$${total.toLocaleString("en-AU", { minimumFractionDigits: 2 })}` },
          { label: "Paid", value: `A$${paid.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`, color: "text-green-700" },
          { label: "Outstanding", value: `A$${outstanding.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`, color: outstanding > 0 ? "text-red-600" : "" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">{k.label}</div>
            <div className={`text-base font-bold ${k.color ?? ""}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><FileText className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No invoices yet</p></div>
      ) : (
        <div className="rounded-lg border overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Invoice #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Contract</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Issued</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Due</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{r.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.contractId?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3 text-right"><DualAmount amount={r.originalAmount ?? r.totalAmount} currency={r.originalCurrency ?? r.currency} audEquivalent={r.audEquivalent} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.issuedAt ? new Date(r.issuedAt).toLocaleDateString("en-AU") : "—"}</td>
                  <td className={`px-4 py-3 text-xs ${r.status === "overdue" ? "text-red-600 font-medium" : "text-muted-foreground"}`}>{r.dueDate ?? "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_COLORS[r.status ?? "draft"] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>{r.status ?? "draft"}</span></td>
                  <td className="px-4 py-3"><Button size="sm" variant="ghost" className="h-6 px-2 gap-1 text-[10px]"><Download className="w-3 h-3" /> PDF</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
