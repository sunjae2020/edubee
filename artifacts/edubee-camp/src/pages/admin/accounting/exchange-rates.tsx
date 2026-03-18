import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Plus, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CURRENCIES = ["USD", "SGD", "PHP", "THB", "KRW", "JPY", "GBP", "EUR", "NZD", "CNY"];

interface ExchangeRate { id: string; fromCurrency: string; toCurrency: string; rate: string; source?: string; effectiveDate: string; createdAt?: string; }

const FLAG: Record<string, string> = { USD: "🇺🇸", SGD: "🇸🇬", PHP: "🇵🇭", THB: "🇹🇭", KRW: "🇰🇷", JPY: "🇯🇵", GBP: "🇬🇧", EUR: "🇪🇺", NZD: "🇳🇿", CNY: "🇨🇳", AUD: "🇦🇺" };
const NAMES: Record<string, string> = { USD: "US Dollar", SGD: "Singapore Dollar", PHP: "Philippine Peso", THB: "Thai Baht", KRW: "South Korean Won", JPY: "Japanese Yen", GBP: "British Pound", EUR: "Euro", NZD: "New Zealand Dollar", CNY: "Chinese Yuan", AUD: "Australian Dollar" };

export default function ExchangeRates() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fromCurrency: "USD", toCurrency: "AUD", rate: "", effectiveDate: new Date().toISOString().slice(0, 10), source: "manual" });

  const { data, isLoading } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: () => axios.get(`${BASE}/api/exchange-rates`).then(r => r.data),
  });
  const rates: ExchangeRate[] = data?.data ?? [];

  // Get latest rate per currency pair
  const latestRates = Object.values(rates.reduce<Record<string, ExchangeRate>>((acc, r) => {
    const key = `${r.fromCurrency}-${r.toCurrency}`;
    if (!acc[key] || r.effectiveDate > acc[key].effectiveDate) acc[key] = r;
    return acc;
  }, {}));

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => axios.post(`${BASE}/api/exchange-rates`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exchange-rates"] }); toast({ title: "Exchange rate added" }); setShowCreate(false); setForm({ fromCurrency: "USD", toCurrency: "AUD", rate: "", effectiveDate: new Date().toISOString().slice(0, 10), source: "manual" }); },
    onError: () => toast({ title: "Failed to add rate", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F08301]/10 flex items-center justify-center"><RefreshCw className="w-5 h-5 text-[#F08301]" /></div>
          <div><h1 className="text-lg font-bold">Exchange Rates</h1><p className="text-xs text-muted-foreground">Currency conversion rates — all values displayed in AUD equivalent</p></div>
        </div>
        <Button size="sm" className="bg-[#F08301] hover:bg-[#d97706] text-white gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Rate
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {isLoading ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />) : latestRates.map(r => (
          <div key={r.id} className="bg-white rounded-lg border p-4 flex items-center gap-3 hover:border-[#F08301]/50 transition-colors">
            <div className="text-2xl">{FLAG[r.fromCurrency] ?? "🏳️"}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{r.fromCurrency} → {r.toCurrency}</div>
              <div className="text-xs text-muted-foreground">{NAMES[r.fromCurrency] ?? r.fromCurrency}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-base">{Number(r.rate).toFixed(4)}</div>
              <div className="text-[10px] text-muted-foreground">{r.effectiveDate}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted/30 rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Rate History</h2>
        {isLoading ? <Skeleton className="h-40" /> : (
          <div className="rounded-lg border overflow-x-auto bg-white">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">From</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">To</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Rate</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Effective Date</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Source</th>
              </tr></thead>
              <tbody>
                {rates.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No rates configured. Click "Add Rate" to get started.</td></tr>
                ) : [...rates].reverse().map(r => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{FLAG[r.fromCurrency]} {r.fromCurrency}</td>
                    <td className="px-4 py-2">{FLAG[r.toCurrency]} {r.toCurrency}</td>
                    <td className="px-4 py-2 text-right font-mono">{Number(r.rate).toFixed(6)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.effectiveDate}</td>
                    <td className="px-4 py-2"><span className="px-1.5 py-0.5 bg-muted rounded text-[11px] capitalize">{r.source ?? "manual"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Exchange Rate</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">From Currency</Label>
                <Select value={form.fromCurrency} onValueChange={v => setForm(f => ({ ...f, fromCurrency: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{FLAG[c]} {c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">To Currency</Label>
                <Select value={form.toCurrency} onValueChange={v => setForm(f => ({ ...f, toCurrency: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUD">🇦🇺 AUD</SelectItem>
                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{FLAG[c]} {c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Rate (1 {form.fromCurrency} = ? {form.toCurrency})</Label><Input type="number" step="0.000001" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} className="mt-1 h-8 text-sm font-mono" placeholder="e.g. 0.00108" /></div>
            <div><Label className="text-xs">Effective Date</Label><Input type="date" value={form.effectiveDate} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} className="mt-1 h-8 text-sm" /></div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1 bg-[#F08301] hover:bg-[#d97706] text-white" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.rate}>
                {createMutation.isPending ? "Adding…" : "Add Rate"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
