import { useState, useMemo } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Plus, TrendingUp, ArrowRight, Clock, Trash2, Zap, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CURRENCIES_STORAGE_KEY = "exchange-rate-managed-currencies";
const DEFAULT_CURRENCIES = ["USD", "SGD", "PHP", "THB", "KRW", "JPY", "GBP", "EUR", "NZD", "CNY"];

function loadManagedCurrencies(): string[] {
  try {
    const stored = localStorage.getItem(CURRENCIES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...DEFAULT_CURRENCIES];
}

function saveManagedCurrencies(list: string[]) {
  try { localStorage.setItem(CURRENCIES_STORAGE_KEY, JSON.stringify(list)); } catch {}
}

const PREVIEW_STORAGE_KEY = "exchange-rate-preview-currencies";
const DEFAULT_PREVIEW = ["KRW", "JPY", "THB", "PHP", "USD", "SGD", "GBP"];

function loadPreviewCurrencies(): string[] {
  try {
    const stored = localStorage.getItem(PREVIEW_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_PREVIEW;
}

function savePreviewCurrencies(list: string[]) {
  try { localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(list)); } catch {}
}

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

const WORLD_CURRENCIES: { code: string; name: string; flag: string }[] = [
  { code: "USD", name: "US Dollar",            flag: "🇺🇸" },
  { code: "EUR", name: "Euro",                  flag: "🇪🇺" },
  { code: "GBP", name: "British Pound",         flag: "🇬🇧" },
  { code: "JPY", name: "Japanese Yen",          flag: "🇯🇵" },
  { code: "KRW", name: "South Korean Won",      flag: "🇰🇷" },
  { code: "CNY", name: "Chinese Yuan",          flag: "🇨🇳" },
  { code: "SGD", name: "Singapore Dollar",      flag: "🇸🇬" },
  { code: "PHP", name: "Philippine Peso",       flag: "🇵🇭" },
  { code: "THB", name: "Thai Baht",             flag: "🇹🇭" },
  { code: "NZD", name: "New Zealand Dollar",    flag: "🇳🇿" },
  { code: "CAD", name: "Canadian Dollar",       flag: "🇨🇦" },
  { code: "HKD", name: "Hong Kong Dollar",      flag: "🇭🇰" },
  { code: "INR", name: "Indian Rupee",          flag: "🇮🇳" },
  { code: "MYR", name: "Malaysian Ringgit",     flag: "🇲🇾" },
  { code: "IDR", name: "Indonesian Rupiah",     flag: "🇮🇩" },
  { code: "VND", name: "Vietnamese Dong",       flag: "🇻🇳" },
  { code: "TWD", name: "Taiwan Dollar",         flag: "🇹🇼" },
  { code: "CHF", name: "Swiss Franc",           flag: "🇨🇭" },
  { code: "SEK", name: "Swedish Krona",         flag: "🇸🇪" },
  { code: "NOK", name: "Norwegian Krone",       flag: "🇳🇴" },
  { code: "DKK", name: "Danish Krone",          flag: "🇩🇰" },
  { code: "ZAR", name: "South African Rand",    flag: "🇿🇦" },
  { code: "BRL", name: "Brazilian Real",        flag: "🇧🇷" },
  { code: "MXN", name: "Mexican Peso",          flag: "🇲🇽" },
  { code: "AED", name: "UAE Dirham",            flag: "🇦🇪" },
  { code: "SAR", name: "Saudi Riyal",           flag: "🇸🇦" },
  { code: "QAR", name: "Qatari Riyal",          flag: "🇶🇦" },
  { code: "KWD", name: "Kuwaiti Dinar",         flag: "🇰🇼" },
  { code: "PKR", name: "Pakistani Rupee",       flag: "🇵🇰" },
  { code: "BDT", name: "Bangladeshi Taka",      flag: "🇧🇩" },
  { code: "LKR", name: "Sri Lankan Rupee",      flag: "🇱🇰" },
  { code: "MMK", name: "Myanmar Kyat",          flag: "🇲🇲" },
  { code: "KHR", name: "Cambodian Riel",        flag: "🇰🇭" },
  { code: "LAK", name: "Lao Kip",              flag: "🇱🇦" },
  { code: "BND", name: "Brunei Dollar",         flag: "🇧🇳" },
  { code: "NPR", name: "Nepalese Rupee",        flag: "🇳🇵" },
  { code: "PLN", name: "Polish Zloty",          flag: "🇵🇱" },
  { code: "CZK", name: "Czech Koruna",          flag: "🇨🇿" },
  { code: "HUF", name: "Hungarian Forint",      flag: "🇭🇺" },
  { code: "RON", name: "Romanian Leu",          flag: "🇷🇴" },
  { code: "TRY", name: "Turkish Lira",          flag: "🇹🇷" },
  { code: "RUB", name: "Russian Ruble",         flag: "🇷🇺" },
  { code: "UAH", name: "Ukrainian Hryvnia",     flag: "🇺🇦" },
  { code: "EGP", name: "Egyptian Pound",        flag: "🇪🇬" },
  { code: "NGN", name: "Nigerian Naira",        flag: "🇳🇬" },
  { code: "KES", name: "Kenyan Shilling",       flag: "🇰🇪" },
  { code: "CLP", name: "Chilean Peso",          flag: "🇨🇱" },
  { code: "COP", name: "Colombian Peso",        flag: "🇨🇴" },
  { code: "PEN", name: "Peruvian Sol",          flag: "🇵🇪" },
  { code: "ARS", name: "Argentine Peso",        flag: "🇦🇷" },
];

const FLAG: Record<string, string> = Object.fromEntries(
  [{ code: "AUD", flag: "🇦🇺" }, ...WORLD_CURRENCIES].map(c => [c.code, c.flag])
);
const NAMES: Record<string, string> = Object.fromEntries(
  [{ code: "AUD", name: "Australian Dollar" }, ...WORLD_CURRENCIES].map(c => [c.code, c.name])
);

const PREVIEW_CURRENCIES = ["KRW", "JPY", "THB", "PHP", "USD", "SGD", "GBP"];

const defaultForm = {
  fromCurrency: "AUD",
  toCurrency: "KRW",
  rate: "",
  effectiveDate: new Date().toISOString().slice(0, 10),
  source: "manual",
};

function fmtDate(d: string | null | undefined): string {
  return formatDate(d);
}

function fmtDateTime(d: string | null | undefined): string {
  return formatDateTime(d);
}

export default function ExchangeRates() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const { sortBy, sortDir, onSort } = useSortState();
  const [form, setForm] = useState(defaultForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ updated: string[]; skipped: string[]; date: string } | null>(null);
  const [previewCurrencies, setPreviewCurrencies] = useState<string[]>(loadPreviewCurrencies);
  const [showAddPreview, setShowAddPreview] = useState(false);
  const [previewCurrencySearch, setPreviewCurrencySearch] = useState("");
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  const [managedCurrencies, setManagedCurrencies] = useState<string[]>(loadManagedCurrencies);
  const [showManageCurrencies, setShowManageCurrencies] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");

  const allCurrencies = useMemo(() => ["AUD", ...managedCurrencies], [managedCurrencies]);

  function addManagedCurrency(code: string) {
    if (!code || managedCurrencies.includes(code)) return;
    const next = [...managedCurrencies, code];
    setManagedCurrencies(next);
    saveManagedCurrencies(next);
  }

  function removeManagedCurrency(code: string) {
    const next = managedCurrencies.filter(c => c !== code);
    setManagedCurrencies(next);
    saveManagedCurrencies(next);
  }

  function addToPreview(ccy: string) {
    if (!ccy || previewCurrencies.includes(ccy)) return;
    const next = [...previewCurrencies, ccy];
    setPreviewCurrencies(next);
    savePreviewCurrencies(next);
  }

  function removeFromPreview(ccy: string) {
    const next = previewCurrencies.filter(c => c !== ccy);
    setPreviewCurrencies(next);
    savePreviewCurrencies(next);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: () => axios.get(`${BASE}/api/exchange-rates`).then(r => r.data),
  });
  const rates: ExchangeRate[] = data?.data ?? [];
  const sorted = useSorted(rates, sortBy, sortDir);

  const { data: syncInfo } = useQuery({
    queryKey: ["exchange-rates-sync-info"],
    queryFn: () => axios.get(`${BASE}/api/exchange-rates/sync-info`).then(r => r.data),
    refetchInterval: 60_000,
  });

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
      // Auto-add both currencies to managed list and Live Preview
      setManagedCurrencies(prev => {
        const next = [...prev];
        for (const code of [vars.fromCurrency, vars.toCurrency]) {
          if (code !== "AUD" && !next.includes(code)) next.push(code);
        }
        saveManagedCurrencies(next);
        return next;
      });
      setPreviewCurrencies(prev => {
        const next = [...prev];
        for (const code of [vars.fromCurrency, vars.toCurrency]) {
          if (code !== "AUD" && !next.includes(code)) next.push(code);
        }
        savePreviewCurrencies(next);
        return next;
      });
      setShowCreate(false);
      setForm(defaultForm);
      setFromSearch("");
      setToSearch("");
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

  const syncMutation = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/exchange-rates/sync`).then(r => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["exchange-rates"] });
      qc.invalidateQueries({ queryKey: ["exchange-rates-sync-info"] });
      setSyncResult(res);
      if (res.success) {
        toast({
          title: "Sync complete",
          description: `${res.updated.length} currencies updated (${res.updated.join(", ") || "none"})`,
        });
      } else {
        toast({ title: "Sync failed", description: res.error, variant: "destructive" });
      }
    },
    onError: () => toast({ title: "Sync failed", variant: "destructive" }),
  });

  const previewRate = form.rate ? Number(form.rate) : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[--e-orange]/10 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-[--e-orange]" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Exchange Rates</h1>
            <p className="text-xs text-muted-foreground">Currency conversion rates — base currency AUD 🇦🇺</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setShowManageCurrencies(true)}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Manage Currencies
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-[--e-orange] text-[--e-orange] hover:bg-[--e-orange-lt]"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <Zap className="w-3.5 h-3.5" />
            {syncMutation.isPending ? "Syncing…" : "Sync Now"}
          </Button>
          <Button size="sm" className="bg-[--e-orange] hover:bg-[#d97706] text-white gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Rate
          </Button>
        </div>
      </div>

      {/* Auto-sync status banner */}
      <div className="rounded-xl border bg-white p-3 flex items-center gap-3 text-sm">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <RefreshCw className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Auto Exchange Rate Sync</p>
          <p className="text-xs text-muted-foreground">
            Automatically synced daily at midnight (Australia/Sydney, AEST/AEDT) from open.er-api.com
          </p>
        </div>
        <div className="text-right shrink-0">
          {syncInfo?.lastSyncedAt ? (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Last synced: {fmtDateTime(syncInfo.lastSyncedAt)}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertCircle className="w-3.5 h-3.5" />
              No auto-sync yet
            </div>
          )}
        </div>
      </div>

      {/* Sync result toast-style summary */}
      {syncResult && (
        <div className={`rounded-lg border p-3 text-sm flex items-start gap-3 ${syncResult.updated.length > 0 ? "bg-green-50 border-green-200" : "bg-gray-50"}`}>
          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Sync Result ({syncResult.date})</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Updated: <span className="text-green-700 font-medium">{syncResult.updated.join(", ") || "none"}</span>
              {syncResult.skipped.length > 0 && <> &nbsp;|&nbsp; Skipped: {syncResult.skipped.join(", ")}</>}
            </p>
          </div>
          <button className="ml-auto text-muted-foreground hover:text-foreground text-xs" onClick={() => setSyncResult(null)}>✕</button>
        </div>
      )}

      {/* AUD Preview Strip */}
      <div className="bg-gradient-to-r from-[--e-orange]/5 to-[#F08301]/10 rounded-xl border border-[--e-orange]/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-[--e-orange] uppercase tracking-wide">Live Preview — 1 AUD equals</p>
          <button
            onClick={() => setShowAddPreview(v => !v)}
            className="flex items-center gap-1 text-[11px] font-medium text-[--e-orange] hover:text-[#d97706] border border-[--e-orange]/40 hover:border-[--e-orange] rounded-md px-2 py-0.5 bg-white transition-colors"
            title="Add currency"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {previewCurrencies.map(ccy => {
            const rate = audToX[ccy];
            const hasRate = rate != null;
            const display = hasRate
              ? rate >= 100
                ? rate.toLocaleString("en-AU", { maximumFractionDigits: 0 })
                : rate.toFixed(4)
              : null;
            return (
              <div key={ccy} className="relative bg-white rounded-lg border px-3 py-2 text-center group">
                <button
                  onClick={() => removeFromPreview(ccy)}
                  className="absolute top-1 right-1 p-0.5 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  title={`Remove ${ccy}`}
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="text-lg">{FLAG[ccy] ?? "🏳️"}</div>
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
          {previewCurrencies.length === 0 && (
            <div className="col-span-full text-xs text-muted-foreground text-center py-4">
              No currencies to display. Use the "Add" button above to add currencies.
            </div>
          )}
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
                <div key={r.id} className="bg-white rounded-lg border p-4 hover:border-[--e-orange]/50 hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl leading-none">{FLAG[r.fromCurrency] ?? "🏳️"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        {r.fromCurrency}
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        {r.toCurrency}
                        {r.source === "auto" && (
                          <span className="px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">Auto</span>
                        )}
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
                  <SortableTh col="fromCurrency" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">From</SortableTh>
                  <SortableTh col="toCurrency" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">To</SortableTh>
                  <SortableTh col="rate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rate</SortableTh>
                  <SortableTh col="effectiveDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Effective</SortableTh>
                  <SortableTh col="source" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Source</SortableTh>
                  <SortableTh col="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Added</SortableTh>
                  <th className="px-4 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No rates yet.
                    </td>
                  </tr>
                ) : sorted.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-[--e-orange-lt] group">
                    <td className="px-4 py-2 font-medium">{FLAG[r.fromCurrency]} {r.fromCurrency}</td>
                    <td className="px-4 py-2">{FLAG[r.toCurrency]} {r.toCurrency}</td>
                    <td className="px-4 py-2 text-right font-mono text-sm">
                      {Number(r.rate) >= 1000
                        ? Number(r.rate).toLocaleString("en-AU", { maximumFractionDigits: 2 })
                        : Number(r.rate).toFixed(6)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{fmtDate(r.effectiveDate)}</td>
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] capitalize ${r.source === "auto" ? "bg-blue-50 text-blue-600" : "bg-muted text-muted-foreground"}`}>
                        {r.source === "auto" ? "Auto" : r.source ?? "manual"}
                      </span>
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
      <Dialog open={showCreate} onOpenChange={v => { if (!v) { setShowCreate(false); setForm(defaultForm); setFromSearch(""); setToSearch(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Exchange Rate</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              💡 Once added, exchange rates are automatically updated daily at midnight (Australia/Sydney time).
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">From Currency</Label>
                <Select value={form.fromCurrency} onValueChange={v => { setForm(f => ({ ...f, fromCurrency: v })); setFromSearch(""); }}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 sticky top-0 bg-white z-10">
                      <Input
                        placeholder="Search…"
                        value={fromSearch}
                        onChange={e => setFromSearch(e.target.value)}
                        className="h-7 text-xs"
                        onKeyDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    {[{ code: "AUD", name: "Australian Dollar", flag: "🇦🇺" }, ...WORLD_CURRENCIES]
                      .filter(c => {
                        const q = fromSearch.trim().toLowerCase();
                        return !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
                      })
                      .map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">To Currency</Label>
                <Select value={form.toCurrency} onValueChange={v => { setForm(f => ({ ...f, toCurrency: v })); setToSearch(""); }}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 sticky top-0 bg-white z-10">
                      <Input
                        placeholder="Search…"
                        value={toSearch}
                        onChange={e => setToSearch(e.target.value)}
                        className="h-7 text-xs"
                        onKeyDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    {[{ code: "AUD", name: "Australian Dollar", flag: "🇦🇺" }, ...WORLD_CURRENCIES]
                      .filter(c => {
                        const q = toSearch.trim().toLowerCase();
                        return !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
                      })
                      .map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</SelectItem>)
                    }
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
              <div className="rounded-lg bg-[--e-orange]/5 border border-[--e-orange]/20 px-3 py-2 text-sm text-center">
                <span className="font-medium">1 {form.fromCurrency}</span>
                <span className="text-muted-foreground mx-2">=</span>
                <span className="font-bold text-[--e-orange]">
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
                className="flex-1 bg-[--e-orange] hover:bg-[#d97706] text-white"
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

      {/* Add to Preview Dialog */}
      <Dialog open={showAddPreview} onOpenChange={v => { if (!v) setShowAddPreview(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Select Live Preview Currencies</span>
              <span className="text-xs font-normal text-muted-foreground">— Live rates per 1 AUD</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            {/* Currently shown */}
            {previewCurrencies.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Currently shown (click to remove)</p>
                <div className="grid grid-cols-4 gap-2">
                  {previewCurrencies.map(ccy => {
                    const rate = audToX[ccy];
                    const hasRate = rate != null;
                    const display = hasRate
                      ? rate >= 100
                        ? rate.toLocaleString("en-AU", { maximumFractionDigits: 0 })
                        : rate.toFixed(4)
                      : null;
                    return (
                      <button
                        key={ccy}
                        onClick={() => removeFromPreview(ccy)}
                        className="relative flex flex-col items-center bg-[--e-orange]/10 border border-[--e-orange]/40 rounded-lg px-2 py-2.5 hover:bg-red-50 hover:border-red-300 transition-colors group"
                        title={`Remove ${ccy}`}
                      >
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3 text-red-400" />
                        </div>
                        <span className="text-xl leading-none">{FLAG[ccy] ?? "🏳️"}</span>
                        <span className="text-[11px] font-semibold mt-1">{ccy}</span>
                        {hasRate ? (
                          <span className="text-[10px] text-[--e-orange] font-mono mt-0.5">{display}</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground mt-0.5">—</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available to add — all world currencies */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Add Currency</p>
              <Input
                placeholder="Search by code or name (e.g. CAD, Canadian)…"
                value={previewCurrencySearch}
                onChange={e => setPreviewCurrencySearch(e.target.value)}
                className="h-8 text-sm mb-2"
              />
              {(() => {
                const allWorld = [{ code: "AUD", name: "Australian Dollar", flag: "🇦🇺" }, ...WORLD_CURRENCIES];
                const q = previewCurrencySearch.trim().toLowerCase();
                const filtered = allWorld.filter(c => {
                  if (previewCurrencies.includes(c.code)) return false;
                  if (!q) return true;
                  return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
                });
                if (filtered.length === 0) return (
                  <p className="text-xs text-muted-foreground py-2 text-center">No currencies found.</p>
                );
                return (
                  <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
                    {filtered.map(c => {
                      const rate = audToX[c.code];
                      const hasRate = rate != null;
                      const display = hasRate
                        ? rate >= 100
                          ? rate.toLocaleString("en-AU", { maximumFractionDigits: 0 })
                          : rate.toFixed(4)
                        : null;
                      return (
                        <button
                          key={c.code}
                          onClick={() => { addToPreview(c.code); setPreviewCurrencySearch(""); }}
                          className="flex flex-col items-center bg-white border border-border rounded-lg px-2 py-2.5 hover:border-[--e-orange] hover:bg-[--e-orange-lt] transition-colors"
                          title={`Add ${c.code} — ${c.name}`}
                        >
                          <span className="text-xl leading-none">{c.flag}</span>
                          <span className="text-[11px] font-semibold mt-1">{c.code}</span>
                          {hasRate ? (
                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{display}</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground mt-0.5">—</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end pt-1">
              <Button size="sm" variant="outline" onClick={() => setShowAddPreview(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={v => { if (!v) setConfirmDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Exchange Rate?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">
            Deleting this rate may remove the currency from landing page and package pricing displays.
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

      {/* Manage Currencies Dialog */}
      <Dialog open={showManageCurrencies} onOpenChange={setShowManageCurrencies}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Currencies</DialogTitle>
          </DialogHeader>

          {/* Current currencies */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Active Currencies ({managedCurrencies.length})
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
              {managedCurrencies.map(code => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-sm font-medium"
                >
                  <span>{FLAG[code] ?? ""}</span>
                  <span>{code}</span>
                  <button
                    className="ml-0.5 hover:text-destructive transition-colors"
                    onClick={() => removeManagedCurrency(code)}
                    title={`Remove ${code}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {managedCurrencies.length === 0 && (
                <p className="text-xs text-muted-foreground">No currencies configured.</p>
              )}
            </div>
          </div>

          {/* Add new currency */}
          <div className="border-t pt-3 mt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Add Currency
            </p>
            <Input
              placeholder="Search by code or name (e.g. CAD, Canadian)…"
              value={currencySearch}
              onChange={e => setCurrencySearch(e.target.value)}
              className="h-8 text-sm mb-2"
            />
            <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
              {WORLD_CURRENCIES
                .filter(c => {
                  if (managedCurrencies.includes(c.code) || c.code === "AUD") return false;
                  if (!currencySearch.trim()) return true;
                  const q = currencySearch.trim().toLowerCase();
                  return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
                })
                .map(c => (
                  <button
                    key={c.code}
                    onClick={() => { addManagedCurrency(c.code); setCurrencySearch(""); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted text-left transition-colors"
                  >
                    <span className="text-base">{c.flag}</span>
                    <span className="font-medium">{c.code}</span>
                    <span className="text-muted-foreground truncate">{c.name}</span>
                    <Plus className="w-3.5 h-3.5 ml-auto shrink-0 text-[--e-orange]" />
                  </button>
                ))}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={() => setShowManageCurrencies(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
