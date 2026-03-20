import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Plus, TrendingUp, ArrowRight, Clock, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CURRENCIES = ["USD", "SGD", "PHP", "THB", "KRW", "JPY", "GBP", "EUR", "NZD", "CNY"];

interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  source?: string;
  effectiveDate: string;
  createdAt?: string;
  updatedAt?: string;
}

const FLAG: Record<string, string> = {
  USD: "🇺🇸", SGD: "🇸🇬", PHP: "🇵🇭", THB: "🇹🇭",
  KRW: "🇰🇷", JPY: "🇯🇵", GBP: "🇬🇧", EUR: "🇪🇺",
  NZD: "🇳🇿", CNY: "🇨🇳", AUD: "🇦🇺",
};
const NAMES: Record<string, string> = {
  USD: "US Dollar", SGD: "Singapore Dollar", PHP: "Philippine Peso",
  THB: "Thai Baht", KRW: "South Korean Won", JPY: "Japanese Yen",
  GBP: "British Pound", EUR: "Euro", NZD: "New Zealand Dollar",
  CNY: "Chinese Yuan", AUD: "Australian Dollar",
};

const PREVIEW_CURRENCIES = ["KRW", "JPY", "THB", "PHP", "USD", "SGD", "GBP"];

const defaultForm = {
  fromCurrency: "AUD",
  toCurrency: "KRW",
  rate: "",
  effectiveDate: new Date().toISOString().slice(0, 10),
  source: "manual",
};

function fmtDate(dateStr?: string) {
  if (!dateStr) return "—";
  try { return format(parseISO(dateStr), "MMM d, yyyy"); } catch { return dateStr; }
}

function fmtDateTime(dateStr?: string) {
  if (!dateStr) return "—";
  try { return format(parseISO(dateStr), "MMM d, yyyy HH:mm"); } catch { return dateStr; }
}

export default function ExchangeRates() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: () => axios.get(`${BASE}/api/exchange-rates`).then(r => r.data),
  });
  const rates: ExchangeRate[] = data?.data ?? [];

  // Build a latest-rate lookup per currency pair
  const latestRates = useMemo(() => {
    return Object.values(
      rates.reduce<Record<string, ExchangeRate>>((acc, r) => {
        const key = `${r.fromCurrency}-${r.toCurrency}`;
        if (!acc[key] || r.effectiveDate > acc[key].effectiveDate) acc[key] = r;
        return acc;
      }, {})
    );
  }, [rates]);

  // Build AUD→X rates for preview section
  const audToX = useMemo(() => {
    const map: Record<string, number> = { AUD: 1 };
    latestRates.forEach(r => {
      if (r.fromCurrency === "AUD") map[r.toCurrency] = Number(r.rate);
      else if (r.toCurrency === "AUD") map[r.fromCurrency] = 1 / Number(r.rate);
    });
    return map;
  }, [latestRates]);

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      axios.post(`${BASE}/api/exchange-rates`, payload).then(r => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["exchange-rates"] });
      const rateNum = Number(vars.rate);
      const rateDisplay = rateNum >= 1000
        ? rateNum.toLocaleString("en-AU", { maximumFractionDigits: 0 })
        : rateNum.toFixed(4);
      toast({
        title: "Exchange rate saved",
        description: `1 ${vars.fromCurrency} = ${rateDisplay} ${vars.toCurrency}`,
      });
      setShowCreate(false);
      setForm(defaultForm);
    },
    onError: () => toast({ title: "Failed to add rate", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/exchange-rates/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exchange-rates"] });
      toast({ title: "Exchange rate deleted" });
      setConfirmDeleteId(null);
    },
    onError: () => toast({ title: "Failed to delete rate", variant: "destructive" }),
  });

  const previewRate = form.rate ? Number(form.rate) : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F5821F]/10 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-[#F5821F]" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Exchange Rates</h1>
            <p className="text-xs text-muted-foreground">Currency conversion rates — base currency AUD 🇦🇺</p>
          </div>
        </div>
        <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Rate
        </Button>
      </div>

      {/* AUD Preview Strip */}
      <div className="bg-gradient-to-r from-[#F5821F]/5 to-[#F08301]/10 rounded-xl border border-[#F5821F]/20 p-4">
        <p className="text-xs font-semibold text-[#F5821F] uppercase tracking-wide mb-3">Live Preview — 1 AUD equals</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {PREVIEW_CURRENCIES.map(ccy => {
            const rate = audToX[ccy];
            const hasRate = rate != null;
            const display = hasRate
              ? rate >= 100
                ? rate.toLocaleString("en-AU", { maximumFractionDigits: 0 })
                : rate.toFixed(4)
              : null;
            return (
              <div key={ccy} className="bg-white rounded-lg border px-3 py-2 text-center">
                <div className="text-lg">{FLAG[ccy]}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{ccy}</div>
                {isLoading ? (
                  <Skeleton className="h-4 w-12 mx-auto mt-1" />
                ) : hasRate ? (
                  <div className="font-bold text-sm text-foreground mt-0.5">{display}</div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-0.5">—</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rate Cards — Latest per Pair */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Current Rates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {isLoading
            ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)
            : latestRates.length === 0
            ? <p className="text-sm text-muted-foreground col-span-3">No rates configured. Click "Add Rate" to get started.</p>
            : latestRates.map(r => (
                <div key={r.id} className="bg-white rounded-lg border p-4 hover:border-[#F5821F]/50 hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl leading-none">{FLAG[r.fromCurrency] ?? "🏳️"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        {r.fromCurrency}
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        {r.toCurrency}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{NAMES[r.fromCurrency] ?? r.fromCurrency}</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-right shrink-0">
                        <div className="font-bold text-base">
                          {Number(r.rate) >= 1000
                            ? Number(r.rate).toLocaleString("en-AU", { maximumFractionDigits: 0 })
                            : Number(r.rate).toFixed(4)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{fmtDate(r.effectiveDate)}</div>
                      </div>
                      <button
                        onClick={() => setConfirmDeleteId(r.id)}
                        className="mt-0.5 p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete this rate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {(r.updatedAt || r.createdAt) && (
                    <div className="mt-2 pt-2 border-t flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Updated {fmtDateTime(r.updatedAt ?? r.createdAt)}
                    </div>
                  )}
                </div>
              ))}
        </div>
      </div>

      {/* Rate History Table */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" /> Rate History
        </h2>
        {isLoading ? <Skeleton className="h-40" /> : (
          <div className="rounded-lg border overflow-x-auto bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">From</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">To</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rate</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Effective</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Source</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Added</th>
                  <th className="px-4 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No rates yet.
                    </td>
                  </tr>
                ) : [...rates].reverse().map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-[#FEF0E3] group">
                    <td className="px-4 py-2 font-medium">{FLAG[r.fromCurrency]} {r.fromCurrency}</td>
                    <td className="px-4 py-2">{FLAG[r.toCurrency]} {r.toCurrency}</td>
                    <td className="px-4 py-2 text-right font-mono text-sm">
                      {Number(r.rate) >= 1000
                        ? Number(r.rate).toLocaleString("en-AU", { maximumFractionDigits: 2 })
                        : Number(r.rate).toFixed(6)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{fmtDate(r.effectiveDate)}</td>
                    <td className="px-4 py-2">
                      <span className="px-1.5 py-0.5 bg-muted rounded text-[11px] capitalize">{r.source ?? "manual"}</span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">{fmtDateTime(r.createdAt)}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setConfirmDeleteId(r.id)}
                        className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Rate Dialog */}
      <Dialog open={showCreate} onOpenChange={v => { if (!v) { setShowCreate(false); setForm(defaultForm); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Exchange Rate</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">From Currency</Label>
                <Select value={form.fromCurrency} onValueChange={v => setForm(f => ({ ...f, fromCurrency: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUD">🇦🇺 AUD</SelectItem>
                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{FLAG[c]} {c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">To Currency</Label>
                <Select value={form.toCurrency} onValueChange={v => setForm(f => ({ ...f, toCurrency: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUD">🇦🇺 AUD</SelectItem>
                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{FLAG[c]} {c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Rate (1 {form.fromCurrency} = ? {form.toCurrency})</Label>
              <Input
                type="number" step="0.000001"
                value={form.rate}
                onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                className="mt-1 h-8 text-sm font-mono"
                placeholder={form.fromCurrency === "AUD" && form.toCurrency === "KRW" ? "e.g. 880" : "e.g. 0.00108"}
              />
            </div>

            {/* Live preview inside dialog */}
            {previewRate !== null && previewRate > 0 && (
              <div className="rounded-lg bg-[#F5821F]/5 border border-[#F5821F]/20 px-3 py-2 text-sm text-center">
                <span className="font-medium">1 {form.fromCurrency}</span>
                <span className="text-muted-foreground mx-2">=</span>
                <span className="font-bold text-[#F5821F]">
                  {previewRate >= 100
                    ? previewRate.toLocaleString("en-AU", { maximumFractionDigits: 0 })
                    : previewRate.toFixed(4)}
                </span>
                <span className="ml-1 text-muted-foreground">{form.toCurrency}</span>
              </div>
            )}

            <div>
              <Label className="text-xs">Effective Date</Label>
              <Input type="date" value={form.effectiveDate} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} className="mt-1 h-8 text-sm" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1 bg-[#F5821F] hover:bg-[#d97706] text-white"
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.rate || form.fromCurrency === form.toCurrency}
              >
                {createMutation.isPending ? "Saving…" : "Save Rate"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowCreate(false); setForm(defaultForm); }}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={v => { if (!v) setConfirmDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Exchange Rate?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">
            이 환율 데이터를 삭제하면 랜딩페이지 및 패키지 가격에 해당 통화가 더 이상 표시되지 않을 수 있습니다.
          </p>
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => confirmDeleteId && deleteMutation.mutate(confirmDeleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
