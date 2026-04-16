import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ThumbnailUploader } from "@/components/shared/ThumbnailUploader";
import { Loader2, Sparkles, Plus, X, ChevronRight, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─── Constants ──────────────────────────────────────────────── */
const COUNTRIES = [
  { code: "AU", flag: "🇦🇺", label: "Australia",      currency: "AUD" },
  { code: "PH", flag: "🇵🇭", label: "Philippines",    currency: "PHP" },
  { code: "SG", flag: "🇸🇬", label: "Singapore",      currency: "SGD" },
  { code: "TH", flag: "🇹🇭", label: "Thailand",       currency: "THB" },
  { code: "KR", flag: "🇰🇷", label: "South Korea",    currency: "KRW" },
  { code: "JP", flag: "🇯🇵", label: "Japan",          currency: "JPY" },
  { code: "US", flag: "🇺🇸", label: "USA",            currency: "USD" },
  { code: "GB", flag: "🇬🇧", label: "United Kingdom", currency: "GBP" },
  { code: "NZ", flag: "🇳🇿", label: "New Zealand",    currency: "NZD" },
  { code: "CA", flag: "🇨🇦", label: "Canada",         currency: "CAD" },
];

const CURRENCIES = [
  { key: "priceAud", label: "AUD", symbol: "A$", flag: "🇦🇺" },
  { key: "pricePhp", label: "PHP", symbol: "₱",  flag: "🇵🇭" },
  { key: "priceSgd", label: "SGD", symbol: "S$", flag: "🇸🇬" },
  { key: "priceThb", label: "THB", symbol: "฿",  flag: "🇹🇭" },
  { key: "priceKrw", label: "KRW", symbol: "₩",  flag: "🇰🇷" },
  { key: "priceJpy", label: "JPY", symbol: "¥",  flag: "🇯🇵" },
  { key: "priceUsd", label: "USD", symbol: "$",  flag: "🇺🇸" },
  { key: "priceGbp", label: "GBP", symbol: "£",  flag: "🇬🇧" },
];

const TABS = [
  { key: "general",    label: "General" },
  { key: "packages",   label: "Packages" },
  { key: "enrollment", label: "Enrollment Spots" },
  { key: "interview",  label: "Interview" },
];

const EMPTY_PKG = {
  name: "Package A", durationDays: "", maxParticipants: "", maxAdults: "", maxStudents: "",
  priceAud: "", pricePhp: "", priceSgd: "", priceThb: "", priceKrw: "", priceJpy: "", priceUsd: "", priceGbp: "",
};

const EMPTY_FORM = {
  nameEn: "", nameKo: "", nameJa: "", nameTh: "",
  descriptionEn: "",
  location: "", countryCode: "AU",
  minAge: "", maxAge: "",
  startDate: "", endDate: "",
  durationText: "",
  inclusions: [] as string[],
  exclusions: [] as string[],
  coordinatorId: "",
  status: "draft",
  sortOrder: "0",
  landingOrder: "",
  thumbnailUrl: "",
  packages: [{ ...EMPTY_PKG }],
  enrollmentSpots: [] as { gradeLabel: string; totalSpots: string }[],
  interviewRequired: false,
  interviewFormat: "online",
  interviewDuration: "30",
  interviewNotes: "",
};

type FormState = typeof EMPTY_FORM;

/* ─── Confidence Badge ───────────────────────────────────────── */
function ConfBadge({ v }: { v?: string }) {
  if (!v) return null;
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    high:   { bg: "bg-green-100", text: "text-green-700", label: "High" },
    medium: { bg: "bg-amber-100", text: "text-amber-700", label: "Med" },
    low:    { bg: "bg-red-100",   text: "text-red-600",   label: "Low" },
  };
  const s = cfg[v] ?? cfg.low;
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", s.bg, s.text)}>{s.label}</span>
  );
}

/* ─── Tag Input ──────────────────────────────────────────────── */
function TagList({
  items, onAdd, onRemove, placeholder, checkIcon,
}: {
  items: string[]; onAdd: (v: string) => void; onRemove: (i: number) => void;
  placeholder: string; checkIcon: string;
}) {
  const [val, setVal] = useState("");
  const add = () => {
    if (val.trim()) { onAdd(val.trim()); setVal(""); }
  };
  return (
    <div>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground mb-3">No items added yet.</p>
      )}
      <div className="mb-3 space-y-0.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 py-2 border-b border-border/50">
            <span className="font-bold text-sm" style={{ color: checkIcon === "✓" ? "#16A34A" : "#DC2626" }}>{checkIcon}</span>
            <span className="flex-1 text-sm text-foreground">{item}</span>
            <button onClick={() => onRemove(i)} className="text-muted-foreground hover:text-destructive transition-colors text-base leading-none">×</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="h-8 text-sm flex-1"
        />
        <Button variant="outline" size="sm" onClick={add} className="h-8 px-3 text-xs">Add</Button>
      </div>
    </div>
  );
}

/* ─── Section card ───────────────────────────────────────────── */
function Sec({ title, children, className, action }: { title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <div className={cn("bg-card rounded-xl border p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ─── Field row ──────────────────────────────────────────────── */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center py-2.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function NewPackageGroup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, packages: [{ ...EMPTY_PKG }] });
  const [tab, setTab] = useState("general");
  const [aiUrl, setAiUrl] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiLogs, setAiLogs] = useState<{ m: string; t: string; ts: string }[]>([]);
  const [aiConf, setAiConf] = useState<Record<string, string>>({});
  const [aiDiff, setAiDiff] = useState<Record<string, unknown> | null>(null);
  const [translating, setTranslating] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { logRef.current?.scrollTo(0, 9999); }, [aiLogs]);

  const upd = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }));
  const updPkg = (i: number, k: string, v: unknown) =>
    setForm(p => ({ ...p, packages: p.packages.map((x, j) => j === i ? { ...x, [k]: v } : x) }));
  const log = (m: string, t = "i") =>
    setAiLogs(p => [...p, { m, t, ts: new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }]);

  /* Coordinators list */
  const { data: coordinators = [] } = useQuery<{ id: string; name: string; subdomain?: string | null; email?: string | null; websiteUrl?: string | null; status?: string | null }[]>({
    queryKey: ["camp-coordinators"],
    queryFn: () => axios.get(`${BASE}/api/crm/coordinators`).then(r => r.data),
    staleTime: 300000,
  });

  /* AI Extract */
  const doExtract = async () => {
    if (!aiUrl.trim() || aiStatus === "loading") return;
    setAiStatus("loading"); setAiLogs([]); setAiDiff(null);
    log("Connecting to AI...");
    log("Analyzing program URL...");
    try {
      const { data } = await axios.post(`${BASE}/api/ai/extract-program`, { url: aiUrl });
      const d = data.data;
      const summary = {
        lang: (d.detectedLang ?? "en").toUpperCase(),
        pkgs: d.packages?.length ?? 0,
        incs: d.inclusions?.length ?? 0,
        spots: d.enrollmentSpots?.length ?? 0,
        prices: (d.packages ?? []).filter((p: any) => p.priceAud || p.priceUsd).length,
      };
      setAiDiff(summary);
      if (d.confidence) setAiConf(d.confidence);
      log(`Language: ${summary.lang}`, "s");
      log(`${summary.pkgs} packages · ${summary.prices} priced · ${summary.incs} inclusions · ${summary.spots} spot groups`, "s");

      setForm(p => ({
        ...p,
        nameEn:       d.nameEn ?? p.nameEn,
        nameKo:       d.nameKo ?? p.nameKo,
        nameJa:       d.nameJa ?? p.nameJa,
        nameTh:       d.nameTh ?? p.nameTh,
        descriptionEn: d.descriptionEn ?? p.descriptionEn,
        location:     d.location ?? p.location,
        countryCode:  d.countryCode ?? p.countryCode,
        minAge:       d.minAge != null ? String(d.minAge) : p.minAge,
        maxAge:       d.maxAge != null ? String(d.maxAge) : p.maxAge,
        startDate:    d.startDate ?? p.startDate,
        endDate:      d.endDate ?? p.endDate,
        durationText: d.durationText ?? p.durationText,
        inclusions:   d.inclusions ?? p.inclusions,
        exclusions:   d.exclusions ?? p.exclusions,
        interviewRequired: d.interviewRequired ?? p.interviewRequired,
        interviewFormat:   d.interviewFormat ?? p.interviewFormat,
        interviewDuration: d.interviewDuration != null ? String(d.interviewDuration) : p.interviewDuration,
        interviewNotes:    d.interviewNotes ?? p.interviewNotes,
        packages: (d.packages?.length ?? 0) > 0
          ? d.packages.map((x: any, i: number) => ({
              ...EMPTY_PKG,
              name: x.name ?? `Package ${String.fromCharCode(65 + i)}`,
              durationDays: x.durationDays != null ? String(x.durationDays) : "",
              maxParticipants: x.maxParticipants != null ? String(x.maxParticipants) : "",
              priceAud: x.priceAud != null ? String(x.priceAud) : "",
              priceUsd: x.priceUsd != null ? String(x.priceUsd) : "",
              priceKrw: x.priceKrw != null ? String(x.priceKrw) : "",
              priceJpy: x.priceJpy != null ? String(x.priceJpy) : "",
              priceThb: x.priceThb != null ? String(x.priceThb) : "",
              pricePhp: x.pricePhp != null ? String(x.pricePhp) : "",
              priceSgd: x.priceSgd != null ? String(x.priceSgd) : "",
              priceGbp: x.priceGbp != null ? String(x.priceGbp) : "",
            }))
          : p.packages,
        enrollmentSpots: (d.enrollmentSpots?.length ?? 0) > 0
          ? d.enrollmentSpots.map((s: any) => ({ gradeLabel: s.gradeLabel ?? "", totalSpots: String(s.totalSpots ?? 15) }))
          : p.enrollmentSpots,
      }));
      setAiStatus("done");
      log("All fields filled. Review and save.", "s");
    } catch (e: any) {
      setAiStatus("error");
      log(`Error: ${e.response?.data?.error ?? e.message}`, "e");
    }
  };

  /* Translate */
  const doTranslate = async (lang: "ko" | "ja" | "th") => {
    setTranslating(lang);
    try {
      const { data } = await axios.post(`${BASE}/api/ai/translate`, {
        nameEn: form.nameEn, descriptionEn: form.descriptionEn, targetLang: lang,
      });
      const sf = lang === "ko" ? "Ko" : lang === "ja" ? "Ja" : "Th";
      setForm(p => ({ ...p, [`name${sf}`]: data.data.name ?? p[`name${sf}` as keyof FormState] }));
      toast({ title: `Translated to ${lang.toUpperCase()}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Translation failed" });
    } finally { setTranslating(null); }
  };

  /* Save */
  const doSave = async () => {
    if (!form.nameEn.trim()) { toast({ variant: "destructive", title: "Name (EN) is required" }); return; }
    setIsSaving(true);
    try {
      const toInt = (v: string) => v === "" ? null : parseInt(v);
      const groupPayload: Record<string, unknown> = {
        nameEn: form.nameEn, nameKo: form.nameKo || null, nameJa: form.nameJa || null, nameTh: form.nameTh || null,
        descriptionEn: form.descriptionEn || null,
        location: form.location || null,
        countryCode: form.countryCode || null,
        minAge: toInt(form.minAge), maxAge: toInt(form.maxAge),
        startDate: form.startDate || null, endDate: form.endDate || null,
        durationText: form.durationText || null,
        inclusionsEn: form.inclusions.length > 0 ? form.inclusions.join("\n") : null,
        exclusionsEn: form.exclusions.length > 0 ? form.exclusions.join("\n") : null,
        coordinatorId: form.coordinatorId || null,
        status: form.status,
        sortOrder: toInt(form.sortOrder) ?? 0,
        landingOrder: toInt(form.landingOrder),
        thumbnailUrl: form.thumbnailUrl || null,
      };

      const { data: group } = await axios.post(`${BASE}/api/package-groups`, groupPayload);
      const groupId = group.id;

      // Create packages
      for (const pkg of form.packages) {
        if (!pkg.name.trim()) continue;
        await axios.post(`${BASE}/api/packages`, {
          packageGroupId: groupId,
          name: pkg.name,
          durationDays: toInt(pkg.durationDays) ?? 1,
          maxParticipants: toInt(pkg.maxParticipants),
          maxAdults: toInt(pkg.maxAdults),
          maxStudents: toInt(pkg.maxStudents),
          priceAud: pkg.priceAud || null, priceUsd: pkg.priceUsd || null,
          priceKrw: pkg.priceKrw || null, priceJpy: pkg.priceJpy || null,
          priceThb: pkg.priceThb || null, pricePhp: pkg.pricePhp || null,
          priceSgd: pkg.priceSgd || null, priceGbp: pkg.priceGbp || null,
        });
      }

      // Create enrollment spots
      for (const spot of form.enrollmentSpots) {
        if (!spot.gradeLabel.trim()) continue;
        await axios.post(`${BASE}/api/enrollment-spots`, {
          packageGroupId: groupId,
          gradeLabel: spot.gradeLabel,
          totalSpots: toInt(spot.totalSpots) ?? 15,
        });
      }

      // Create interview settings
      if (form.interviewRequired) {
        await axios.post(`${BASE}/api/interview-settings`, {
          packageGroupId: groupId,
          isRequired: true,
          format: form.interviewFormat,
          durationMinutes: toInt(form.interviewDuration) ?? 30,
          notes: form.interviewNotes || null,
        }).catch(() => {}); // non-fatal
      }

      toast({ title: "Package group created!" });
      setLocation(`${BASE}/admin/package-groups/${groupId}`);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to save", description: e.response?.data?.error ?? e.message });
    } finally { setIsSaving(false); }
  };

  const cc = COUNTRIES.find(c => c.code === form.countryCode) ?? COUNTRIES[0];
  const totalSpots = form.enrollmentSpots.reduce((s, x) => s + (parseInt(x.totalSpots) || 0), 0);

  return (
    <div className="min-h-screen bg-background">

      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="px-6 pt-3 pb-0">
          <div
            className="text-xs text-muted-foreground mb-1 cursor-pointer hover:text-(--e-orange) flex items-center gap-1 w-fit"
            onClick={() => setLocation(`${BASE}/admin/package-groups`)}
          >
            ← Package Groups
          </div>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-bold text-foreground">
                  {form.nameEn || "New Package Group"}
                </h1>
                <span className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full font-semibold",
                  form.status === "active" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                )}>{form.status}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {[form.location, form.countryCode].filter(Boolean).join(" · ") || "Location · Country"}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Select value={form.status} onValueChange={v => upd("status", v)}>
                <SelectTrigger className="h-8 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["draft", "active", "inactive"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                onClick={doSave}
                disabled={isSaving}
                className="h-8 bg-(--e-orange) hover:bg-[#d97706] text-white text-sm"
              >
                {isSaving ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving…</> : "Save & Create"}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 mt-2">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2.5 text-[13px] border-b-2 transition-colors whitespace-nowrap",
                tab === t.key
                  ? "border-(--e-orange) text-(--e-orange) font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {t.key === "packages" && form.packages.length > 0 && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-muted rounded-full">{form.packages.length}</span>
              )}
              {t.key === "enrollment" && totalSpots > 0 && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-muted rounded-full">{totalSpots}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── AI Strip ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 border-b border-black/20 px-6 py-3.5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">AI Auto-fill</span>
            <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full font-semibold">Gemini 2.0 Flash</span>
            <span className="text-xs text-stone-400 ml-1 hidden sm:block">Paste a program URL → all fields auto-filled</span>
          </div>
          <div className="flex gap-2">
            <input
              value={aiUrl}
              onChange={e => setAiUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doExtract()}
              placeholder="https://campsite.com/program-page"
              className="flex-1 h-9 px-3 bg-white/10 border border-white/15 rounded-lg text-white text-sm placeholder:text-stone-500 outline-none focus:border-(--e-orange)/50"
            />
            <Button
              onClick={doExtract}
              disabled={!aiUrl.trim() || aiStatus === "loading"}
              className={cn("h-9 px-5 text-sm font-semibold text-white border-none", aiStatus === "loading" ? "bg-red-900" : "bg-(--e-orange) hover:bg-[#d97706]")}
            >
              {aiStatus === "loading" ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Analyzing…</> : "Auto-fill from URL"}
            </Button>
          </div>

          {aiLogs.length > 0 && (
            <div ref={logRef} className="mt-2 bg-black/30 rounded-md px-3 py-2 max-h-16 overflow-y-auto flex flex-col gap-0.5">
              {aiLogs.map((l, i) => (
                <span key={i} className={cn("text-[10px]", l.t === "s" ? "text-green-400" : l.t === "e" ? "text-red-400" : "text-stone-400")}>
                  <span className="opacity-50 mr-2">{l.ts}</span>{l.m}
                </span>
              ))}
            </div>
          )}
          {aiDiff && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                `🌐 ${aiDiff.lang}`,
                `📦 ${aiDiff.pkgs} packages`,
                `💰 ${aiDiff.prices} priced`,
                `✓ ${aiDiff.incs} inclusions`,
                `👥 ${aiDiff.spots} spot groups`,
              ].map(b => (
                <span key={b} className="text-[10px] px-2 py-0.5 bg-white/10 text-stone-300 rounded-full">{b}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-5 space-y-4">

        {/* ══ GENERAL TAB ══════════════════════════════════════════ */}
        {tab === "general" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Basic Info */}
              <Sec title="Basic Info">
                <Row label="Name (EN)">
                  <Input value={form.nameEn} onChange={e => upd("nameEn", e.target.value)}
                    placeholder="Program name in English" className="h-8 text-sm" />
                </Row>
                {(["Ko", "Ja", "Th"] as const).map(sf => {
                  const lang = sf.toLowerCase() as "ko" | "ja" | "th";
                  const labels: Record<string, string> = { Ko: "Name (KO)", Ja: "Name (JA)", Th: "Name (TH)" };
                  return (
                    <Row key={sf} label={labels[sf]}>
                      <div className="flex gap-1.5">
                        <Input
                          value={(form as any)[`name${sf}`]}
                          onChange={e => upd(`name${sf}` as any, e.target.value)}
                          placeholder={`${sf === "Ko" ? "Korean" : sf === "Ja" ? "Japanese" : "Thai"} name`}
                          className="h-8 text-sm flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => doTranslate(lang)}
                          disabled={!!translating || !form.nameEn.trim()}
                          className="h-8 px-2.5 text-[11px] border-amber-300 text-amber-700 hover:bg-amber-50 whitespace-nowrap"
                        >
                          {translating === lang ? <Loader2 className="w-3 h-3 animate-spin" /> : "Translate"}
                        </Button>
                      </div>
                    </Row>
                  );
                })}
                <Row label="Location">
                  <Input value={form.location} onChange={e => upd("location", e.target.value)}
                    placeholder="Sydney, Australia" className="h-8 text-sm" />
                </Row>
                <Row label="Country">
                  <Select value={form.countryCode} onValueChange={v => upd("countryCode", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.flag} {c.code} — {c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Min Age">
                  <Input type="number" value={form.minAge} onChange={e => upd("minAge", e.target.value)}
                    placeholder="e.g. 7" className="h-8 text-sm" min={0} max={99} />
                </Row>
                <Row label="Max Age">
                  <Input type="number" value={form.maxAge} onChange={e => upd("maxAge", e.target.value)}
                    placeholder="e.g. 17" className="h-8 text-sm" min={0} max={99} />
                </Row>
                <Row label="Start Date">
                  <input type="date" value={form.startDate} onChange={e => upd("startDate", e.target.value)}
                    className="h-8 px-2 text-sm border rounded-md w-full focus:outline-none focus:ring-1 focus:ring-(--e-orange) border-input" />
                </Row>
                <Row label="End Date">
                  <input type="date" value={form.endDate} onChange={e => upd("endDate", e.target.value)}
                    className="h-8 px-2 text-sm border rounded-md w-full focus:outline-none focus:ring-1 focus:ring-(--e-orange) border-input" />
                </Row>
              </Sec>

              {/* Settings */}
              <Sec title="Settings">
                <Row label="Status">
                  <Select value={form.status} onValueChange={v => upd("status", v)}>
                    <SelectTrigger className="h-8 text-sm w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["draft", "active", "inactive"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Sort Order">
                  <Input type="number" value={form.sortOrder} onChange={e => upd("sortOrder", e.target.value)}
                    className="h-8 text-sm w-20" min={0} />
                </Row>
                <Row label="Landing Order">
                  <Input type="number" value={form.landingOrder} onChange={e => upd("landingOrder", e.target.value)}
                    placeholder="Leave blank = not shown" className="h-8 text-sm" min={1} />
                </Row>
                <Row label="Camp Coordinator">
                  <Select value={form.coordinatorId || "none"} onValueChange={v => upd("coordinatorId", v === "none" ? "" : v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="— No coordinator —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No coordinator assigned —</SelectItem>
                      {coordinators.map(org => (
                        <SelectItem key={org.id} value={org.id}>
                          <span className="flex items-center gap-2">
                            <Building2 className="w-3 h-3 shrink-0 text-(--e-text-3)" />
                            <span>{org.name}</span>
                            {org.subdomain && (
                              <span className="text-xs text-(--e-text-3)">{org.subdomain}.edubee.co</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
                {/* Thumbnail */}
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Thumbnail</p>
                  <ThumbnailUploader
                    currentUrl={form.thumbnailUrl || null}
                    onUploaded={(path: string) => upd("thumbnailUrl", path)}
                  />
                </div>
              </Sec>
            </div>

            {/* Description */}
            <Sec title="Description (EN)" action={<ConfBadge v={aiConf.description} />}>
              <textarea
                value={form.descriptionEn}
                onChange={e => upd("descriptionEn", e.target.value)}
                placeholder="An immersive English language program in Sydney. Students live with host families, attend local schools, and explore iconic Australian landmarks."
                rows={4}
                className="w-full text-sm border border-input rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-(--e-orange) leading-relaxed"
              />
            </Sec>

            {/* Duration */}
            <Sec title="Duration">
              <Row label="Duration">
                <Input value={form.durationText} onChange={e => upd("durationText", e.target.value)}
                  placeholder="e.g. 14 nights 15 days" className="h-8 text-sm" />
              </Row>
            </Sec>

            {/* Inclusions */}
            <Sec title="Inclusions">
              <TagList
                items={form.inclusions}
                onAdd={v => upd("inclusions", [...form.inclusions, v])}
                onRemove={i => upd("inclusions", form.inclusions.filter((_, j) => j !== i))}
                placeholder="Add inclusion (Enter to add)"
                checkIcon="✓"
              />
            </Sec>

            {/* Exclusions */}
            <Sec title="Exclusions">
              <TagList
                items={form.exclusions}
                onAdd={v => upd("exclusions", [...form.exclusions, v])}
                onRemove={i => upd("exclusions", form.exclusions.filter((_, j) => j !== i))}
                placeholder="Add exclusion (Enter to add)"
                checkIcon="✕"
              />
            </Sec>
          </>
        )}

        {/* ══ PACKAGES TAB ═════════════════════════════════════════ */}
        {tab === "packages" && (
          <div className="space-y-3">
            {aiConf.packages && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                <ConfBadge v={aiConf.packages} />
                AI-extracted packages — verify pricing before saving
              </div>
            )}

            {form.packages.map((pkg, idx) => (
              <Sec
                key={idx}
                title=""
                className="!p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-(--e-orange-lt) text-(--e-orange) flex items-center justify-center text-sm font-bold shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <input
                      value={pkg.name}
                      onChange={e => updPkg(idx, "name", e.target.value)}
                      className="border-none outline-none text-base font-bold text-foreground bg-transparent"
                    />
                  </div>
                  {form.packages.length > 1 && (
                    <button
                      onClick={() => setForm(p => ({ ...p, packages: p.packages.filter((_, i) => i !== idx) }))}
                      className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1 hover:bg-red-100"
                    >Remove</button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { k: "durationDays",    l: "Days" },
                    { k: "maxAdults",       l: "Max Adults" },
                    { k: "maxStudents",     l: "Max Students" },
                  ].map(f => (
                    <div key={f.k}>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1">{f.l}</p>
                      <Input type="number" value={(pkg as any)[f.k] ?? ""} onChange={e => updPkg(idx, f.k, e.target.value)}
                        placeholder="—" className="h-8 text-sm" min={0} />
                    </div>
                  ))}
                </div>

                {/* Pricing */}
                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pricing</span>
                    {aiConf.pricing && <ConfBadge v={aiConf.pricing} />}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {CURRENCIES.map(cur => {
                      const isPrimary = cc.currency === cur.label;
                      return (
                        <div key={cur.key} className={cn(
                          "rounded-lg p-2.5 relative",
                          isPrimary ? "border-2 border-(--e-orange) bg-(--e-orange-lt)" : "border border-border bg-card"
                        )}>
                          {isPrimary && (
                            <span className="absolute -top-2 left-2 text-[9px] bg-(--e-orange) text-white px-1.5 py-0.5 rounded-full font-bold">Default</span>
                          )}
                          <div className={cn("text-[10px] mb-1", isPrimary ? "text-orange-600" : "text-muted-foreground")}>
                            {cur.flag} {cur.label}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-muted-foreground shrink-0">{cur.symbol}</span>
                            <input
                              type="number"
                              value={(pkg as any)[cur.key] ?? ""}
                              onChange={e => updPkg(idx, cur.key, e.target.value)}
                              placeholder="0"
                              className={cn(
                                "w-full border-none outline-none bg-transparent",
                                isPrimary ? "text-sm font-bold text-foreground" : "text-sm text-foreground"
                              )}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Sec>
            ))}

            <button
              onClick={() => setForm(p => ({
                ...p,
                packages: [...p.packages, { ...EMPTY_PKG, name: `Package ${String.fromCharCode(65 + p.packages.length)}` }]
              }))}
              className="w-full py-3 border-2 border-dashed border-border rounded-xl bg-card text-muted-foreground text-sm hover:border-(--e-orange) hover:text-(--e-orange) transition-colors font-medium"
            >
              + Add Package
            </button>
          </div>
        )}

        {/* ══ ENROLLMENT SPOTS TAB ══════════════════════════════════ */}
        {tab === "enrollment" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-foreground">Enrollment Spots</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total capacity: <strong>{totalSpots}</strong> spots across {form.enrollmentSpots.length} groups
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 bg-(--e-orange) hover:bg-[#d97706] text-white text-xs"
                  onClick={() => upd("enrollmentSpots", [...form.enrollmentSpots, { gradeLabel: "", totalSpots: "15" }])}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Group
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="h-8 text-xs"
                  onClick={() => upd("enrollmentSpots", ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"].map(g => ({ gradeLabel: g, totalSpots: "15" })))}
                >
                  Quick Setup G7–12
                </Button>
              </div>
            </div>

            {aiConf.enrollment && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mb-3">
                <ConfBadge v={aiConf.enrollment} />
                AI-estimated enrollment — update with actual capacity
              </div>
            )}

            {form.enrollmentSpots.length === 0 ? (
              <div className="bg-card border rounded-xl p-12 text-center">
                <div className="text-4xl mb-3">📊</div>
                <p className="font-semibold text-foreground mb-1">No enrollment spots configured</p>
                <p className="text-xs text-muted-foreground mb-5">Set capacity limits per grade or age group</p>
                <div className="flex gap-3 justify-center">
                  <Button size="sm" className="bg-(--e-orange) hover:bg-[#d97706] text-white text-xs h-8"
                    onClick={() => upd("enrollmentSpots", [{ gradeLabel: "Grade 7", totalSpots: "15" }])}>
                    + Add Group
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-8"
                    onClick={() => upd("enrollmentSpots", ["Grade 7", "Grade 8", "Grade 9", "Grade 10"].map(g => ({ gradeLabel: g, totalSpots: "15" })))}>
                    Grade 7–10 Default
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-card border rounded-xl p-4">
                <div className="grid grid-cols-[1fr_120px_44px] gap-3 mb-2 px-1">
                  {["Grade / Age Group", "Total Spots", ""].map((h, i) => (
                    <div key={i} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {h}
                    </div>
                  ))}
                </div>
                {form.enrollmentSpots.map((sp, i) => {
                  const pct = parseInt(sp.totalSpots) > 0 ? 100 : 0;
                  return (
                    <div key={i} className="grid grid-cols-[1fr_120px_44px] gap-3 mb-3 items-start">
                      <div>
                        <Input
                          value={sp.gradeLabel}
                          onChange={e => {
                            const next = [...form.enrollmentSpots];
                            next[i] = { ...next[i], gradeLabel: e.target.value };
                            upd("enrollmentSpots", next);
                          }}
                          placeholder="e.g. Grade 7, Age 12-14"
                          className="h-8 text-sm mb-1"
                        />
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-(--e-orange) rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <Input
                        type="number"
                        value={sp.totalSpots}
                        onChange={e => {
                          const next = [...form.enrollmentSpots];
                          next[i] = { ...next[i], totalSpots: e.target.value };
                          upd("enrollmentSpots", next);
                        }}
                        className="h-8 text-sm text-center"
                        min={1}
                      />
                      <button
                        onClick={() => upd("enrollmentSpots", form.enrollmentSpots.filter((_, j) => j !== i))}
                        className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 rounded-md transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center pt-3 border-t mt-2">
                  <span className="text-xs text-muted-foreground">{form.enrollmentSpots.length} groups</span>
                  <span className="text-sm font-bold text-foreground">Total: {totalSpots} spots</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ INTERVIEW TAB ════════════════════════════════════════ */}
        {tab === "interview" && (
          <Sec title="Interview Settings">
            <div className="flex items-center gap-4 mb-5 pb-4 border-b">
              <span className="text-sm text-foreground">Interview required</span>
              <Switch
                checked={form.interviewRequired}
                onCheckedChange={v => upd("interviewRequired", v)}
                className="data-[state=checked]:bg-(--e-orange)"
              />
              <span className={cn("text-sm font-medium", form.interviewRequired ? "text-(--e-orange)" : "text-muted-foreground")}>
                {form.interviewRequired ? "Yes" : "No"}
              </span>
            </div>
            {form.interviewRequired && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Format</p>
                  <Select value={form.interviewFormat} onValueChange={v => upd("interviewFormat", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online (Zoom/Teams)</SelectItem>
                      <SelectItem value="video">Video Call</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="in_person">In Person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Duration (minutes)</p>
                  <Input type="number" value={form.interviewDuration} onChange={e => upd("interviewDuration", e.target.value)}
                    className="h-9 text-sm" min={15} step={15} />
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Notes for Applicants</p>
                  <textarea
                    value={form.interviewNotes}
                    onChange={e => upd("interviewNotes", e.target.value)}
                    rows={4}
                    placeholder="Interview preparation notes..."
                    className="w-full text-sm border border-input rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-(--e-orange)"
                  />
                </div>
              </div>
            )}
          </Sec>
        )}

        {/* AI Confidence Footer */}
        {Object.keys(aiConf).length > 0 && (
          <div className="bg-card border rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">AI Extraction Confidence</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(aiConf).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-md border text-xs">
                  <span className="text-foreground/70 capitalize">{k}</span>
                  <ConfBadge v={v} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save CTA at bottom */}
        <div className="flex justify-end gap-3 pt-2 pb-8">
          <Button variant="outline" onClick={() => setLocation(`${BASE}/admin/package-groups`)} className="text-sm">
            Cancel
          </Button>
          <Button
            onClick={doSave}
            disabled={isSaving}
            className="bg-(--e-orange) hover:bg-[#d97706] text-white text-sm"
          >
            {isSaving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</> : "Save & Create Package Group"}
          </Button>
        </div>
      </div>
    </div>
  );
}
