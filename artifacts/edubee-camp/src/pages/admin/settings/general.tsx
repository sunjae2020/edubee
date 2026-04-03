import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Settings, Mail, Globe, Phone, Send, Loader2, CheckCircle2,
  Eye, EyeOff, ExternalLink, Key, Palette, Copy, Check, Upload, ImageIcon, Trash2, CalendarDays,
} from "lucide-react";
import { DATE_FORMAT_OPTIONS, setGlobalDateFormat, type DateFormatKey } from "@/lib/date-format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const CURRENCIES = ["AUD", "USD", "SGD", "PHP", "THB", "KRW", "JPY", "GBP"];
const LANGUAGES = [
  { code: "en", label: "🇦🇺 English" },
  { code: "ko", label: "🇰🇷 Korean" },
  { code: "ja", label: "🇯🇵 Japanese" },
  { code: "th", label: "🇹🇭 Thai" },
];

const TABS = [
  { key: "general", label: "General" },
  { key: "design", label: "Design System" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        });
      }}
      className="ml-1.5 shrink-0 text-stone-400 hover:text-[--e-orange] transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function RuleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E6E2] p-5 space-y-4">
      <h2 className="text-xs font-semibold text-[--e-orange] uppercase tracking-widest border-b border-[--e-orange]/20 pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

function CodeChip({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-stone-100 text-stone-700 rounded px-2 py-0.5 border border-stone-200">
      {code}
      <CopyButton text={code} />
    </span>
  );
}

function RuleRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-4 items-start py-2.5 border-b border-[#E8E6E2] last:border-0">
      <span className="text-xs font-medium text-stone-500 pt-0.5">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

type AssetType = "logo" | "favicon";

function AssetUploader({
  label,
  hint,
  accept,
  currentSrc,
  defaultSrc,
  previewClass,
  onSave,
  onReset,
  saving,
}: {
  label: string;
  hint: string;
  accept: string;
  currentSrc: string;
  defaultSrc: string;
  previewClass: string;
  onSave: (file: File) => void;
  onReset: () => void;
  saving: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  const activeSrc = preview || currentSrc || defaultSrc;
  const hasCustom = !!currentSrc;

  return (
    <div className="flex flex-col sm:flex-row gap-5 items-start">
      {/* Preview box */}
      <div className={`shrink-0 flex items-center justify-center rounded-xl border-2 border-dashed border-[#E8E6E2] bg-stone-50 ${previewClass}`}>
        {activeSrc
          ? <img src={activeSrc} alt={label} className="max-w-full max-h-full object-contain p-2" />
          : <ImageIcon className="w-8 h-8 text-stone-300" />}
      </div>

      {/* Controls */}
      <div className="flex-1 space-y-3">
        <div>
          <p className="text-sm font-medium text-stone-700">{label}</p>
          <p className="text-xs text-stone-400 mt-0.5">{hint}</p>
        </div>
        <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => fileRef.current?.click()}>
            <Upload className="w-3.5 h-3.5" /> Select File
          </Button>
          {preview && (
            <Button
              size="sm"
              className="bg-[--e-orange] hover:bg-[#d97706] text-white gap-1.5 h-8 text-xs"
              onClick={() => {
                const f = fileRef.current?.files?.[0];
                if (f) { onSave(f); setPreview(""); if (fileRef.current) fileRef.current.value = ""; }
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Save
            </Button>
          )}
          {hasCustom && !preview && (
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-stone-500 hover:text-red-600 hover:border-red-300" onClick={onReset}>
              <Trash2 className="w-3.5 h-3.5" /> Reset to Default
            </Button>
          )}
        </div>
        {hasCustom && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Custom asset saved.</p>}
      </div>
    </div>
  );
}

function BrandingSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [savingLogo, setSavingLogo] = useState(false);
  const [savingFavicon, setSavingFavicon] = useState(false);

  const { data: branding } = useQuery({
    queryKey: ["settings-branding"],
    queryFn: () => axios.get(`${BASE}/api/settings/branding`).then(r => r.data),
  });

  async function uploadAsset(file: File, type: AssetType) {
    const setter = type === "logo" ? setSavingLogo : setSavingFavicon;
    setter(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const bodyKey = type === "logo" ? { logoPath: dataUrl } : { faviconPath: dataUrl };
      await axios.put(`${BASE}/api/settings/branding`, bodyKey);
      await qc.invalidateQueries({ queryKey: ["settings-branding"] });
      toast({ title: `${type === "logo" ? "Logo" : "Favicon"} saved successfully` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err?.response?.data?.error ?? err.message });
    } finally {
      setter(false);
    }
  }

  async function resetAsset(type: AssetType) {
    try {
      const bodyKey = type === "logo" ? { logoPath: "" } : { faviconPath: "" };
      await axios.put(`${BASE}/api/settings/branding`, bodyKey);
      await qc.invalidateQueries({ queryKey: ["settings-branding"] });
      toast({ title: `${type === "logo" ? "Logo" : "Favicon"} reset to default` });
    } catch {
      toast({ variant: "destructive", title: "Reset failed" });
    }
  }

  function resolveSrc(path: string | undefined): string {
    if (!path) return "";
    if (path.startsWith("data:")) return path;
    return `${BASE}/api/storage${path}`;
  }

  const logoSrc = resolveSrc(branding?.logoPath);
  const faviconSrc = resolveSrc(branding?.faviconPath);

  return (
    <RuleCard title="Logo & Favicon">
      <div className="space-y-6">
        <AssetUploader
          label="Logo"
          hint="PNG · SVG · WebP recommended / Max 2 MB / Transparent PNG preferred"
          accept="image/png,image/svg+xml,image/webp,image/jpeg"
          currentSrc={logoSrc}
          defaultSrc={`${BASE}/edubee-logo.png`}
          previewClass="w-48 h-24"
          onSave={(f) => uploadAsset(f, "logo")}
          onReset={() => resetAsset("logo")}
          saving={savingLogo}
        />
        <div className="border-t border-[#E8E6E2]" />
        <AssetUploader
          label="Favicon"
          hint="PNG · SVG · ICO recommended / 32×32 px / Max 512 KB"
          accept="image/svg+xml,image/x-icon,image/png"
          currentSrc={faviconSrc}
          defaultSrc={`${BASE}/favicon.svg`}
          previewClass="w-16 h-16"
          onSave={(f) => uploadAsset(f, "favicon")}
          onReset={() => resetAsset("favicon")}
          saving={savingFavicon}
        />
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700 space-y-1">
          <p className="font-medium">How It Works</p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-600">
            <li>The saved logo is automatically applied to invoice, quote, and contract PDFs.</li>
            <li>After saving the favicon, refresh the browser tab for it to take effect.</li>
            <li>Default assets are <code className="bg-amber-100 px-1 rounded">public/edubee-logo.png</code> and <code className="bg-amber-100 px-1 rounded">public/favicon.svg</code>.</li>
          </ul>
        </div>
      </div>
    </RuleCard>
  );
}

function DesignSystemTab() {
  return (
    <div className="space-y-6 max-w-3xl">

      {/* Logo & Favicon */}
      <BrandingSection />

      {/* Colors */}
      <RuleCard title="Brand Colors">
        <RuleRow label="Primary (Orange)">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg border border-stone-200 shrink-0" style={{ background: "var(--e-orange)" }} />
            <div>
              <div className="text-sm font-medium text-stone-800">#F5821F</div>
              <div className="text-xs text-stone-500 mt-0.5">Buttons, section titles, active tabs, accents</div>
            </div>
            <CodeChip code="text-[--e-orange]" />
            <CodeChip code="bg-[--e-orange]" />
          </div>
        </RuleRow>
        <RuleRow label="Primary Hover">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg border border-stone-200 shrink-0" style={{ background: "#d97706" }} />
            <div>
              <div className="text-sm font-medium text-stone-800">#d97706</div>
              <div className="text-xs text-stone-500 mt-0.5">Button hover state</div>
            </div>
            <CodeChip code="hover:bg-[#d97706]" />
          </div>
        </RuleRow>
        <RuleRow label="Section Title Border">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg border border-stone-200 shrink-0" style={{ background: "rgba(245,130,31,0.2)" }} />
            <div>
              <div className="text-sm font-medium text-stone-800">#F5821F / 20% opacity</div>
              <div className="text-xs text-stone-500 mt-0.5">Subtle underline below section titles</div>
            </div>
            <CodeChip code="border-[--e-orange]/20" />
          </div>
        </RuleRow>
        <RuleRow label="Background / Surface">
          <div className="flex items-center gap-3 flex-wrap gap-y-2">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg border border-stone-200 shrink-0" style={{ background: "#F5F4F2" }} />
              <span className="text-xs text-stone-600">Page bg</span>
              <CodeChip code="bg-[#F5F4F2]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg border border-stone-200 shrink-0 bg-white" />
              <span className="text-xs text-stone-600">Card bg</span>
              <CodeChip code="bg-white" />
            </div>
          </div>
        </RuleRow>
        <RuleRow label="Border">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg border-2 shrink-0" style={{ borderColor: "#E8E6E2", background: "white" }} />
            <div>
              <div className="text-sm font-medium text-stone-800">#E8E6E2</div>
              <div className="text-xs text-stone-500 mt-0.5">Card borders, dividers</div>
            </div>
            <CodeChip code="border-[#E8E6E2]" />
          </div>
        </RuleRow>
        <RuleRow label="Status — Active">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#16A34A]">Active</span>
            <CodeChip code="bg-[#DCFCE7] text-[#16A34A]" />
          </div>
        </RuleRow>
        <RuleRow label="Status — Inactive">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#F4F3F1] text-[#57534E]">Inactive</span>
            <CodeChip code="bg-[#F4F3F1] text-[#57534E]" />
          </div>
        </RuleRow>
      </RuleCard>

      {/* Typography */}
      <RuleCard title="Typography">
        <RuleRow label="Section Title">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-[--e-orange] uppercase tracking-widest border-b border-[--e-orange]/20 pb-1.5 w-fit pr-4">
              Section Example
            </div>
            <CodeChip code="text-xs font-semibold text-[--e-orange] uppercase tracking-widest border-b border-[--e-orange]/20 pb-2" />
          </div>
        </RuleRow>
        <RuleRow label="Field Label">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">Field Name</div>
            <CodeChip code="text-xs font-medium text-stone-500 uppercase tracking-wide" />
          </div>
        </RuleRow>
        <RuleRow label="Form Field Label">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-stone-500 mb-1.5">Field Name</div>
            <CodeChip code="text-xs font-medium text-stone-500 mb-1.5 block" />
          </div>
        </RuleRow>
        <RuleRow label="Body Text">
          <div className="space-y-1.5">
            <div className="text-sm text-stone-700">Regular body content</div>
            <CodeChip code="text-sm text-stone-700" />
          </div>
        </RuleRow>
        <RuleRow label="Muted / Secondary">
          <div className="space-y-1.5">
            <div className="text-xs text-stone-400">Metadata, timestamps, hints</div>
            <CodeChip code="text-xs text-stone-400" />
          </div>
        </RuleRow>
        <RuleRow label="Mono / ID">
          <div className="space-y-1.5">
            <div className="text-xs font-mono text-stone-500">c090f882-5f78-410c-afb0...</div>
            <CodeChip code="text-xs font-mono text-stone-500 truncate" />
          </div>
        </RuleRow>
      </RuleCard>

      {/* Layout & Cards */}
      <RuleCard title="Layout & Cards">
        <RuleRow label="Detail Page Card">
          <CodeChip code="bg-white rounded-xl border border-[#E8E6E2] p-5 space-y-4" />
        </RuleRow>
        <RuleRow label="Shared DetailSection">
          <CodeChip code="bg-card rounded-xl border border-border p-5" />
        </RuleRow>
        <RuleRow label="Card Grid Gap">
          <CodeChip code="space-y-5" />
        </RuleRow>
        <RuleRow label="Form Grid (2-col)">
          <CodeChip code="grid grid-cols-2 gap-x-4 gap-y-3" />
        </RuleRow>
        <RuleRow label="Form Grid (responsive)">
          <CodeChip code="grid grid-cols-1 sm:grid-cols-2 gap-4" />
        </RuleRow>
        <RuleRow label="Admin Info Position">
          <span className="text-sm text-stone-700">Always the <strong>last section</strong> on the overview tab — below all content sections</span>
        </RuleRow>
      </RuleCard>

      {/* Buttons */}
      <RuleCard title="Buttons">
        <RuleRow label="Primary (Save)">
          <div className="flex items-center gap-3 flex-wrap">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-[--e-orange] hover:bg-[#d97706] text-white transition-colors">
              Save Changes
            </button>
            <CodeChip code="bg-[--e-orange] hover:bg-[#d97706] text-white" />
          </div>
        </RuleRow>
        <RuleRow label="Outline (Discard)">
          <div className="flex items-center gap-3 flex-wrap">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors">
              Discard
            </button>
            <CodeChip code="variant='outline'" />
          </div>
        </RuleRow>
        <RuleRow label="Size">
          <CodeChip code="size='sm'" />
        </RuleRow>
      </RuleCard>

      {/* Form Inputs */}
      <RuleCard title="Form Inputs">
        <RuleRow label="Standard Input Class">
          <CodeChip code="w-full rounded-lg border border-[#E8E6E2] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[--e-orange]" />
        </RuleRow>
        <RuleRow label="Input Height">
          <CodeChip code="h-9 text-sm" />
        </RuleRow>
        <RuleRow label="Required Marker">
          <div className="flex items-center gap-2">
            <span className="text-sm">Field Name <span className="text-red-500 ml-0.5">*</span></span>
            <CodeChip code="text-red-500 ml-0.5" />
          </div>
        </RuleRow>
        <RuleRow label="Select Dropdown Owner">
          <span className="text-xs text-stone-500">Owner/Assigned Staff fields use a <strong>Select dropdown</strong> populated from <code className="bg-stone-100 px-1 rounded">/api/crm/staff</code></span>
        </RuleRow>
      </RuleCard>

      {/* Detail Page Rules */}
      <RuleCard title="Detail Page Rules">
        <RuleRow label="Edit Mode">
          <div className="text-sm text-stone-700 space-y-1">
            <p><strong>Always-editable inline</strong> — no separate Edit button toggle</p>
            <p className="text-xs text-stone-400">Fields are immediately editable. A "Discard / Save Changes" bar appears at the top only when changes are detected (<code className="bg-stone-100 px-1 rounded">isDirty</code>)</p>
          </div>
        </RuleRow>
        <RuleRow label="Unsaved Changes Bar">
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700 w-fit">
            ● You have unsaved changes — click <strong>Save Changes</strong> to apply.
          </div>
        </RuleRow>
        <RuleRow label="Tab Nav Active">
          <CodeChip code="border-[--e-orange] text-[--e-orange] bg-orange-50/50" />
        </RuleRow>
        <RuleRow label="Tab Nav Inactive">
          <CodeChip code="border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40" />
        </RuleRow>
        <RuleRow label="Admin Info section">
          <span className="text-sm text-stone-700">Uses <code className="bg-stone-100 px-1 rounded text-xs">SystemInfoSection</code> component — always placed as the <strong>last section</strong> of the page. Displays: Record ID, Created On, Modified On, Owner (read-only), Active/Inactive toggle.</span>
        </RuleRow>
        <RuleRow label="SystemInfoSection props">
          <div className="space-y-1">
            <CodeChip code="id" />
            <CodeChip code="recordIdLabel" />
            <CodeChip code="createdAt" />
            <CodeChip code="updatedAt" />
            <CodeChip code="owner / ownerName / ownerLabel" />
            <CodeChip code="isActive" />
            <CodeChip code="onToggleActive" />
          </div>
        </RuleRow>
      </RuleCard>

      {/* Active/Inactive Toggle */}
      <RuleCard title="Active / Inactive Toggle">
        <RuleRow label="Toggle Endpoint">
          <CodeChip code="PATCH /api/services/{type}/{id}/toggle-active" />
        </RuleRow>
        <RuleRow label="CRM Leads">
          <CodeChip code="PATCH /api/crm/leads/:id/toggle-active" />
        </RuleRow>
        <RuleRow label="Contracts">
          <CodeChip code="PATCH /api/contracts/:id/toggle-active" />
        </RuleRow>
        <RuleRow label="Applications">
          <CodeChip code="PATCH /api/applications/:id/toggle-active" />
        </RuleRow>
        <RuleRow label="Active badge">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#16A34A]">Active</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#F4F3F1] text-[#57534E]">Inactive</span>
          </div>
        </RuleRow>
      </RuleCard>

    </div>
  );
}

export default function GeneralSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");

  const [general, setGeneral] = useState({
    platformName: "Edubee Camp",
    defaultCurrency: "AUD",
    supportEmail: "",
    supportPhone: "",
    activeLanguages: ["en", "ko", "ja", "th"] as string[],
    dateFormat: "DD/MM/YYYY" as DateFormatKey,
  });

  const [resend, setResend] = useState({
    apiKey: "",
    from: "",
    fromName: "Edubee Camp",
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [testTarget, setTestTarget] = useState("");

  const { data: generalData, isLoading: loadingGeneral } = useQuery({
    queryKey: ["settings-general"],
    queryFn: () => axios.get(`${BASE}/api/settings/general`).then(r => r.data),
  });

  const { data: resendData, isLoading: loadingResend } = useQuery({
    queryKey: ["settings-resend"],
    queryFn: () => axios.get(`${BASE}/api/settings/resend`).then(r => r.data),
  });

  useEffect(() => {
    if (generalData) {
      const fmt = (generalData.dateFormat ?? "DD/MM/YYYY") as DateFormatKey;
      setGeneral({
        platformName: generalData.platformName ?? "Edubee Camp",
        defaultCurrency: generalData.defaultCurrency ?? "AUD",
        supportEmail: generalData.supportEmail ?? "",
        supportPhone: generalData.supportPhone ?? "",
        activeLanguages: generalData.activeLanguages ?? ["en", "ko", "ja", "th"],
        dateFormat: fmt,
      });
      if (!testTarget) setTestTarget(generalData.supportEmail ?? "");
    }
  }, [generalData]);

  useEffect(() => {
    if (resendData) {
      setResend(s => ({
        ...s,
        from: resendData.from ?? "",
        fromName: resendData.fromName ?? "Edubee Camp",
      }));
    }
  }, [resendData]);

  const saveGeneral = useMutation({
    mutationFn: () => axios.put(`${BASE}/api/settings/general`, general).then(r => r.data),
    onSuccess: () => {
      setGlobalDateFormat(general.dateFormat);
      toast({ title: "General settings saved" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to save settings" }),
  });

  const saveResend = useMutation({
    mutationFn: () => axios.put(`${BASE}/api/settings/resend`, {
      apiKey: resend.apiKey || undefined,
      from: resend.from,
      fromName: resend.fromName,
    }).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Resend settings saved" });
      setResend(s => ({ ...s, apiKey: "" }));
    },
    onError: () => toast({ variant: "destructive", title: "Failed to save Resend settings" }),
  });

  const sendTestEmail = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/settings/test-email`, { to: testTarget || resend.from }).then(r => r.data),
    onSuccess: (data) => toast({
      title: "✉️ Test email sent!",
      description: `Delivered to ${data.sentTo} via Resend`,
    }),
    onError: (err: any) => {
      const detail = err?.response?.data?.detail ?? err?.response?.data?.error ?? err.message;
      toast({ variant: "destructive", title: "Failed to send test email", description: detail });
    },
  });

  function toggleLang(code: string) {
    setGeneral(s => ({
      ...s,
      activeLanguages: s.activeLanguages.includes(code)
        ? s.activeLanguages.filter(l => l !== code)
        : [...s.activeLanguages, code],
    }));
  }

  const loading = loadingGeneral || loadingResend;

  return (
    <div className="p-6 max-w-3xl">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-[--e-orange]/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-[--e-orange]" />
        </div>
        <div>
          <h1 className="text-lg font-bold">General Settings</h1>
          <p className="text-xs text-muted-foreground">Platform-wide configuration — accessible to Super Admin only</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[#E8E6E2] mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              activeTab === t.key
                ? "border-[--e-orange] text-[--e-orange]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            {t.key === "design" && <Palette className="w-3.5 h-3.5" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: General */}
      {activeTab === "general" && (
        <div className="space-y-6">
          {/* Platform */}
          <section className="bg-white rounded-xl border p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-[--e-orange]" /> Platform
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Platform Name</Label>
                <Input value={general.platformName} onChange={e => setGeneral(s => ({ ...s, platformName: e.target.value }))} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Default Currency</Label>
                <Select value={general.defaultCurrency} onValueChange={v => setGeneral(s => ({ ...s, defaultCurrency: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-[--e-orange]" /> Date Format</Label>
                <p className="text-[11px] text-stone-400 mt-0.5 mb-1.5">Applied across all pages — tables, detail views, reports (Admin Info timestamps are excluded).</p>
                <Select value={general.dateFormat} onValueChange={v => setGeneral(s => ({ ...s, dateFormat: v as DateFormatKey }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DATE_FORMAT_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="sm" className="bg-[--e-orange] hover:bg-[#d97706] text-white gap-1.5" onClick={() => saveGeneral.mutate()} disabled={saveGeneral.isPending || loading}>
              {saveGeneral.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveGeneral.isSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
              Save Platform Settings
            </Button>
          </section>

          {/* Support Contacts */}
          <section className="bg-white rounded-xl border p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4 text-[--e-orange]" /> Support Contacts
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Support Email</Label>
                <Input type="email" value={general.supportEmail} onChange={e => setGeneral(s => ({ ...s, supportEmail: e.target.value }))} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Support Phone</Label>
                <Input value={general.supportPhone} onChange={e => setGeneral(s => ({ ...s, supportPhone: e.target.value }))} className="mt-1 h-8 text-sm" />
              </div>
            </div>
            <Button size="sm" className="bg-[--e-orange] hover:bg-[#d97706] text-white gap-1.5" onClick={() => saveGeneral.mutate()} disabled={saveGeneral.isPending || loading}>
              {saveGeneral.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Save Contact Settings
            </Button>
          </section>

          {/* Resend Email */}
          <section className="bg-white rounded-xl border p-5 space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-[--e-orange]" /> Email (Resend)
              </h2>
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[--e-orange] hover:underline"
              >
                <Key className="w-3 h-3" /> Get API Key
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="rounded-lg bg-[--e-orange-lt] border border-[--e-orange]/20 px-4 py-3 text-xs text-[#92400E] space-y-1">
              <p className="font-medium">Resend 설정 방법</p>
              <ol className="list-decimal list-inside space-y-0.5 text-[#A16207]">
                <li><a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a>에서 계정 생성</li>
                <li>Domains 메뉴에서 발송 도메인 추가 및 인증 (DNS 설정)</li>
                <li>API Keys 메뉴에서 API 키 생성</li>
                <li>아래 필드에 API 키와 발송 이메일 주소를 입력 후 저장</li>
              </ol>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-xs">API Key</Label>
                <div className="relative mt-1">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={resend.apiKey}
                    onChange={e => setResend(s => ({ ...s, apiKey: e.target.value }))}
                    className="h-8 text-sm pr-9 font-mono"
                    placeholder={resendData?.hasApiKey ? "re_••••••••  (저장됨)" : "re_xxxxxxxxxxxxxxxxxxxx"}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowApiKey(v => !v)}
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {resendData?.hasApiKey && (
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" /> API 키가 저장되어 있습니다. 변경하려면 새 키를 입력하세요.
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">발송 이메일 주소 (From)</Label>
                <Input
                  value={resend.from}
                  onChange={e => setResend(s => ({ ...s, from: e.target.value }))}
                  className="mt-1 h-8 text-sm"
                  placeholder="noreply@yourdomain.com"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Resend에서 인증된 도메인의 이메일이어야 합니다.</p>
              </div>
              <div>
                <Label className="text-xs">발송자 이름 (From Name)</Label>
                <Input
                  value={resend.fromName}
                  onChange={e => setResend(s => ({ ...s, fromName: e.target.value }))}
                  className="mt-1 h-8 text-sm"
                  placeholder="Edubee Camp"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <Button size="sm" className="bg-[--e-orange] hover:bg-[#d97706] text-white gap-1.5" onClick={() => saveResend.mutate()} disabled={saveResend.isPending || loading}>
                {saveResend.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveResend.isSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                저장
              </Button>

              <div className="flex items-center gap-1.5 ml-auto">
                <Input
                  value={testTarget}
                  onChange={e => setTestTarget(e.target.value)}
                  placeholder="테스트 수신 이메일..."
                  className="h-8 text-xs w-52"
                  type="email"
                />
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs shrink-0" onClick={() => sendTestEmail.mutate()} disabled={sendTestEmail.isPending}>
                  {sendTestEmail.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  테스트 발송
                </Button>
              </div>
            </div>
          </section>

          {/* Languages */}
          <section className="bg-white rounded-xl border p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-[--e-orange]" /> Active Languages
            </h2>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => (
                <button key={lang.code} onClick={() => toggleLang(lang.code)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${general.activeLanguages.includes(lang.code) ? "bg-[--e-orange] text-white border-[--e-orange]" : "border-muted-foreground/30 text-muted-foreground hover:border-[--e-orange]/50"}`}>
                  {lang.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">🇦🇺 English is always shown with the Australian flag on Edubee Camp.</p>
            <Button size="sm" className="bg-[--e-orange] hover:bg-[#d97706] text-white gap-1.5" onClick={() => saveGeneral.mutate()} disabled={saveGeneral.isPending || loading}>
              {saveGeneral.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Save Language Settings
            </Button>
          </section>
        </div>
      )}

      {/* Tab: Design System */}
      {activeTab === "design" && <DesignSystemTab />}
    </div>
  );
}
