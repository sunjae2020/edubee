import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Handshake, Plus, Send } from "lucide-react";

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

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  sent: "bg-blue-100 text-blue-800 border-blue-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  overdue: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "draft").toLowerCase();
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_COLORS[s] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>{s}</span>;
}

interface Invoice { id: string; invoiceNumber?: string | null; contractId?: string | null; invoiceType?: string | null; totalAmount?: string | null; currency?: string | null; originalCurrency?: string | null; originalAmount?: string | null; audEquivalent?: string | null; status?: string | null; issuedAt?: string | null; dueDate?: string | null; notes?: string | null; }

export default function PartnerInvoices() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Invoice | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices-partner"],
    queryFn: () => axios.get(`${BASE}/api/invoices?invoiceType=partner`).then(r => r.data),
  });
  const rows: Invoice[] = data?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Invoice> }) => axios.put(`${BASE}/api/invoices/${id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices-partner"] }); toast({ title: "Invoice updated" }); setSelected(null); },
  });

  const total = rows.reduce((s, r) => s + Number(r.totalAmount ?? 0), 0);
  const paid = rows.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.totalAmount ?? 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F08301]/10 flex items-center justify-center"><Handshake className="w-5 h-5 text-[#F08301]" /></div>
          <div><h1 className="text-lg font-bold">Partner Invoices</h1><p className="text-xs text-muted-foreground">Invoices payable to service providers — institutes, hotels, pickup & tours</p></div>
        </div>
        <Button size="sm" className="bg-[#F08301] hover:bg-[#d97706] text-white gap-1.5" onClick={() => toast({ title: "Feature coming soon" })}>
          <Plus className="w-3.5 h-3.5" /> New Invoice
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Total Payable", value: `A$${total.toLocaleString("en-AU", { minimumFractionDigits: 2 })}` },
          { label: "Paid", value: `A$${paid.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`, color: "text-green-700" },
          { label: "Outstanding", value: `A$${(total - paid).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`, color: total - paid > 0 ? "text-yellow-700" : "" },
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Invoice #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Contract</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Due</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">No partner invoices yet</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="px-4 py-3 font-mono text-xs">{r.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.contractId?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3"><span className="px-1.5 py-0.5 bg-muted rounded text-[11px] capitalize">{r.invoiceType?.replace("partner_", "") ?? "—"}</span></td>
                  <td className="px-4 py-3 text-right"><DualAmount amount={r.originalAmount ?? r.totalAmount} currency={r.originalCurrency ?? r.currency} audEquivalent={r.audEquivalent} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.dueDate ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    {r.status === "sent" && (
                      <Button size="sm" className="h-6 text-[10px] px-2 bg-green-600 hover:bg-green-700 text-white" onClick={e => { e.stopPropagation(); updateMutation.mutate({ id: r.id, payload: { status: "paid", paidAt: new Date().toISOString() } }); }}>Mark Paid</Button>
                    )}
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
