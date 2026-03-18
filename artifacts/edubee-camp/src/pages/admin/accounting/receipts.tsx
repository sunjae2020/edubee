import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CURRENCY_SYMBOLS: Record<string, string> = { AUD: "A$", USD: "$", SGD: "S$", PHP: "₱", THB: "฿", KRW: "₩", JPY: "¥", GBP: "£" };

function DualAmount({ amount, currency, audEquivalent }: { amount?: string | number | null; currency?: string | null; audEquivalent?: string | number | null }) {
  if (!amount) return <span className="text-muted-foreground">—</span>;
  const sym = CURRENCY_SYMBOLS[currency ?? "AUD"] ?? (currency ?? "AUD");
  const num = Number(amount);
  const aud = Number(audEquivalent);
  return (
    <span>
      <span className="font-medium">{sym}{num.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
      {currency && currency !== "AUD" && aud > 0 && <span className="ml-1.5 text-[11px] text-muted-foreground">≈ A${aud.toFixed(2)}</span>}
    </span>
  );
}

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer", credit_card: "Credit Card", paypal: "PayPal", cash: "Cash", crypto: "Crypto",
};

interface Receipt { id: string; receiptNumber?: string | null; invoiceId?: string | null; amount?: string | null; currency?: string | null; originalCurrency?: string | null; originalAmount?: string | null; audEquivalent?: string | null; paymentMethod?: string | null; receiptDate?: string | null; status?: string | null; notes?: string | null; }

export default function Receipts() {
  const { data, isLoading } = useQuery({
    queryKey: ["receipts"],
    queryFn: () => axios.get(`${BASE}/api/receipts`).then(r => r.data),
  });
  const rows: Receipt[] = data?.data ?? [];

  const totalReceived = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const thisMonth = rows.filter(r => r.receiptDate?.slice(0, 7) === new Date().toISOString().slice(0, 7)).reduce((s, r) => s + Number(r.amount ?? 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-[#F08301]/10 flex items-center justify-center"><ClipboardList className="w-5 h-5 text-[#F08301]" /></div>
        <div><h1 className="text-lg font-bold">Receipts</h1><p className="text-xs text-muted-foreground">Payment receipts — confirmed payments received from clients & partners</p></div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Total Received", value: `A$${totalReceived.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`, color: "text-green-700" },
          { label: "This Month", value: `A$${thisMonth.toLocaleString("en-AU", { minimumFractionDigits: 2 })}` },
          { label: "Total Receipts", value: `${rows.length}` },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">{k.label}</div>
            <div className={`text-base font-bold ${k.color ?? ""}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <div className="rounded-lg border overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Receipt #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Invoice</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Method</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
            </tr></thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">No receipts recorded yet</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{r.receiptNumber ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.invoiceId?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-700"><DualAmount amount={r.originalAmount ?? r.amount} currency={r.originalCurrency ?? r.currency} audEquivalent={r.audEquivalent} /></td>
                  <td className="px-4 py-3 text-xs">{METHOD_LABELS[r.paymentMethod ?? ""] ?? r.paymentMethod ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.receiptDate ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${r.status === "confirmed" ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-700 border-gray-200"}`}>{r.status ?? "confirmed"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
