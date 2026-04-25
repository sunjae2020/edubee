import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { applyThemeToDom } from "@/hooks/use-tenant-theme";
import {
  Save, Loader2, Palette, Code2, AlertTriangle,
  ChevronDown, ChevronUp, Upload, Link, Sun, Moon,
  LayoutDashboard, Users, FileText, Settings, Bell, Search,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E6E2] p-6 space-y-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center gap-2 border-b border-[#E8E6E2] pb-3">
        <Icon size={16} className="text-(--e-orange)" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-[#E8E6E2] cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          maxLength={7}
          className="flex-1 h-10 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm font-mono focus:outline-none focus:border-(--e-orange) uppercase"
          placeholder="var(--e-orange)"
        />
      </div>
    </div>
  );
}

function UploadZone({
  label, hint, accept, previewHeight,
  value, isPending, onFile, onClear, onUrl,
}: {
  label: string;
  hint: string;
  accept: string;
  previewHeight: string;
  value?: string | null;
  isPending: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
  onUrl?: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">{label}</label>

      {value ? (
        <div className={`relative w-full ${previewHeight} rounded-xl border border-[#E8E6E2] bg-[#FAFAF9] flex items-center justify-center overflow-hidden group`}>
          <img src={value} alt={label} className="max-h-full max-w-full object-contain p-3" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isPending}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-white text-[#1C1917] shadow flex items-center gap-1.5 disabled:opacity-50"
            >
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
              Change
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={isPending}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-white text-red-500 shadow disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className={`w-full ${previewHeight} rounded-xl border-2 border-dashed border-[#E8E6E2] flex flex-col items-center justify-center gap-2 hover:border-(--e-orange) hover:bg-(--e-orange-lt) transition-colors disabled:opacity-50 cursor-pointer`}
        >
          {isPending ? (
            <Loader2 size={22} className="animate-spin text-(--e-orange)" />
          ) : (
            <>
              <Upload size={22} className="text-[#A8A29E]" />
              <span className="text-xs font-medium text-[#57534E]">Click to upload</span>
              <span className="text-[10px] text-[#A8A29E]">{hint}</span>
            </>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={() => setShowUrlInput(p => !p)}
        className="flex items-center gap-1.5 text-[11px] text-[#A8A29E] hover:text-[#57534E] transition-colors"
      >
        <Link size={10} />
        {showUrlInput ? "Hide URL input" : "Or enter URL manually"}
      </button>

      {showUrlInput && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={urlValue}
            onChange={e => setUrlValue(e.target.value)}
            placeholder={`https://cdn.example.com/${label.toLowerCase()}.png`}
            className="flex-1 h-9 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-xs focus:outline-none focus:border-(--e-orange) bg-white"
          />
          <button
            type="button"
            onClick={() => { if (urlValue.trim() && onUrl) { onUrl(urlValue.trim()); setShowUrlInput(false); setUrlValue(""); } }}
            disabled={!urlValue.trim()}
            className="h-9 px-3 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--e-orange)" }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

export default function Branding() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCss, setShowCss] = useState(false);
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");

  const { data: branding, isLoading } = useQuery<any>({
    queryKey: ["settings-branding"],
    queryFn: () => axios.get(`${BASE}/api/settings/branding`).then(r => r.data),
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const merged = { ...branding, ...form };

  const set = (key: string) => (val: string) => setForm(p => ({ ...p, [key]: val }));

  const colorMutation = useMutation({
    mutationFn: (data: any) => axios.put(`${BASE}/api/settings/branding`, data).then(r => r.data),
    onSuccess: (_res, variables) => {
      qc.invalidateQueries({ queryKey: ["settings-branding"] });
      setForm(p => {
        const next = { ...p };
        delete next.primaryColor;
        delete next.secondaryColor;
        delete next.accentColor;
        delete next.customCss;
        return next;
      });
      applyThemeToDom({
        organisationId: null,
        companyName:    branding?.companyName ?? "",
        logoUrl:        variables.logoUrl     ?? branding?.logoUrl     ?? null,
        logoDarkUrl:    variables.logoDarkUrl ?? branding?.logoDarkUrl ?? null,
        faviconUrl:     variables.faviconUrl  ?? branding?.faviconUrl  ?? null,
        primaryColor:   variables.primaryColor   ?? branding?.primaryColor   ?? "var(--e-orange)",
        secondaryColor: variables.secondaryColor ?? branding?.secondaryColor ?? "#1C1917",
        accentColor:    variables.accentColor    ?? branding?.accentColor    ?? "var(--e-orange-lt)",
        customCss:      variables.customCss ?? branding?.customCss ?? null,
        subdomain:      null,
        planType:       branding?.planType ?? "starter",
        features:       branding?.features ?? {},
      });
      toast({ title: "Saved", description: "Branding settings updated." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save branding.", variant: "destructive" }),
  });

  const uploadFile = (
    file: File,
    endpoint: string,
    payloadKey: string,
    responseKey: string,
    formKey: string,
  ) => new Promise<void>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target?.result as string;
        const res = await axios.post(`${BASE}${endpoint}`, { [payloadKey]: base64 });
        qc.invalidateQueries({ queryKey: ["settings-branding"] });
        setForm(p => ({ ...p, [formKey]: res.data[responseKey] }));
        toast({ title: "Uploaded", description: res.data.message });
        resolve();
      } catch (err: any) {
        const msg = err.response?.data?.message || "Upload failed.";
        toast({ title: "Upload failed", description: msg, variant: "destructive" });
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const logoMutation = useMutation({
    mutationFn: (file: File) =>
      uploadFile(file, "/api/settings/branding/logo", "logoBase64", "logoUrl", "logoUrl"),
  });

  const logoDarkMutation = useMutation({
    mutationFn: (file: File) =>
      uploadFile(file, "/api/settings/branding/logo-dark", "logoDarkBase64", "logoDarkUrl", "logoDarkUrl"),
  });

  const faviconMutation = useMutation({
    mutationFn: (file: File) =>
      uploadFile(file, "/api/settings/branding/favicon", "faviconBase64", "faviconUrl", "faviconUrl"),
  });

  const handleSave = () => {
    colorMutation.mutate({
      primaryColor:   merged.primaryColor   || "var(--e-orange)",
      secondaryColor: merged.secondaryColor || "#1C1917",
      accentColor:    merged.accentColor    || "var(--e-orange-lt)",
      customCss:      merged.customCss,
    });
  };

  const primary   = merged.primaryColor   || "var(--e-orange)";
  const secondary = merged.secondaryColor || "#1C1917";
  const accent    = merged.accentColor    || "var(--e-orange-lt)";

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="animate-spin text-(--e-orange)" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#1C1917]">Branding</h1>
          <p className="text-sm text-[#57534E] mt-0.5">Customise your logo, colours, and visual identity</p>
        </div>
        <button
          onClick={handleSave}
          disabled={colorMutation.isPending}
          className="h-10 px-5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
          style={{ background: "var(--e-orange)" }}
        >
          {colorMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Branding
        </button>
      </div>

      {/* Logo & Favicon Upload */}
      <Card title="Logo & Favicon" icon={Palette}>
        <div className="grid grid-cols-3 gap-6">
          <UploadZone
            label="Logo (Light)"
            hint="PNG, JPG, SVG, WEBP — max 2MB"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            previewHeight="h-28"
            value={merged.logoUrl}
            isPending={logoMutation.isPending}
            onFile={(file) => logoMutation.mutate(file)}
            onClear={() => {
              setForm(p => ({ ...p, logoUrl: "" }));
              colorMutation.mutate({ logoUrl: null });
            }}
            onUrl={(url) => {
              setForm(p => ({ ...p, logoUrl: url }));
              colorMutation.mutate({ logoUrl: url });
            }}
          />
          <div className="space-y-2">
            <div className="rounded-xl border border-[#E8E6E2] overflow-hidden">
              <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-[#E8E6E2]" style={{ background: "#131211" }}>
                <Moon size={10} style={{ color: "#A8A29E" }} />
                <span className="text-[10px] font-medium" style={{ color: "#A8A29E" }}>Dark background preview</span>
              </div>
              <div className="h-16 flex items-center justify-center" style={{ background: "#0F0E0D" }}>
                {merged.logoDarkUrl
                  ? <img src={merged.logoDarkUrl} alt="Dark logo preview" className="max-h-10 max-w-full object-contain" />
                  : merged.logoUrl
                    ? <img src={merged.logoUrl} alt="Logo on dark" className="max-h-10 max-w-full object-contain opacity-60" />
                    : <span className="text-[10px]" style={{ color: "#57534E" }}>No dark logo set</span>
                }
              </div>
            </div>
            <UploadZone
              label="Logo (Dark)"
              hint="PNG, SVG with transparency — max 2MB"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              previewHeight="h-0 hidden"
              value={null}
              isPending={logoDarkMutation.isPending}
              onFile={(file) => logoDarkMutation.mutate(file)}
              onClear={() => {
                setForm(p => ({ ...p, logoDarkUrl: "" }));
                colorMutation.mutate({ logoDarkUrl: null });
              }}
              onUrl={(url) => {
                setForm(p => ({ ...p, logoDarkUrl: url }));
                colorMutation.mutate({ logoDarkUrl: url });
              }}
            />
          </div>
          <UploadZone
            label="Favicon"
            hint="ICO or PNG 32×32px — max 500KB"
            accept="image/x-icon,image/vnd.microsoft.icon,image/png"
            previewHeight="h-28"
            value={merged.faviconUrl}
            isPending={faviconMutation.isPending}
            onFile={(file) => faviconMutation.mutate(file)}
            onClear={() => {
              setForm(p => ({ ...p, faviconUrl: "" }));
              colorMutation.mutate({ faviconUrl: null });
            }}
            onUrl={(url) => {
              setForm(p => ({ ...p, faviconUrl: url }));
              colorMutation.mutate({ faviconUrl: url });
            }}
          />
        </div>
      </Card>

      {/* Colours */}
      <Card title="Colour Settings" icon={Palette}>
        <div className="grid grid-cols-3 gap-6">
          <ColorPicker label="Primary Colour"   value={primary}   onChange={set("primaryColor")} />
          <ColorPicker label="Secondary Colour" value={secondary} onChange={set("secondaryColor")} />
          <ColorPicker label="Accent Colour"    value={accent}    onChange={set("accentColor")} />
        </div>

        {/* Live preview — Light / Dark tab */}
        <div className="rounded-xl border border-[#E8E6E2] overflow-hidden mt-2">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-[#E8E6E2]" style={{ background: "#F4F3F1" }}>
            <button
              onClick={() => setPreviewMode("light")}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2"
              style={previewMode === "light"
                ? { background: "#fff", borderColor: primary, color: primary }
                : { background: "transparent", borderColor: "transparent", color: "#A8A29E" }}
            >
              <Sun size={12} /> Light View
            </button>
            <button
              onClick={() => setPreviewMode("dark")}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2"
              style={previewMode === "dark"
                ? { background: "#131211", borderColor: primary, color: primary }
                : { background: "transparent", borderColor: "transparent", color: "#A8A29E" }}
            >
              <Moon size={12} /> Dark View
            </button>
          </div>

          {/* ── Light Preview ── */}
          {previewMode === "light" && (
            <div className="p-4" style={{ background: accent }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: secondary }}>Light Mode Preview</p>
              {/* Mini UI shell */}
              <div className="rounded-xl overflow-hidden border border-[#E8E6E2] flex" style={{ height: 200, background: "#FAFAF9" }}>
                {/* Sidebar */}
                <div className="w-36 shrink-0 flex flex-col border-r border-[#E8E6E2]" style={{ background: "#FAFAF9" }}>
                  {/* Logo area */}
                  <div className="h-10 flex items-center px-3 border-b border-[#E8E6E2]" style={{ background: "#fff" }}>
                    {merged.logoUrl
                      ? <img src={merged.logoUrl} alt="logo" className="h-5 object-contain" />
                      : <div className="h-5 w-16 rounded" style={{ background: primary, opacity: 0.8 }} />
                    }
                  </div>
                  {/* Nav items */}
                  <div className="flex-1 px-2 py-2 space-y-0.5">
                    {[
                      { icon: LayoutDashboard, label: "Dashboard", active: false },
                      { icon: Users,           label: "Contacts",  active: true  },
                      { icon: FileText,        label: "Contracts", active: false },
                      { icon: Settings,        label: "Settings",  active: false },
                    ].map(({ icon: Icon, label, active }) => (
                      <div key={label} className="flex items-center gap-1.5 px-2 h-7 rounded-lg text-[10px] font-medium"
                        style={{ background: active ? `${primary}18` : "transparent", color: active ? primary : "#78716C" }}>
                        <Icon size={11} style={{ color: active ? primary : "#A8A29E" }} />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Content */}
                <div className="flex-1 flex flex-col">
                  {/* Topbar */}
                  <div className="h-10 flex items-center justify-between px-3 border-b border-[#E8E6E2]" style={{ background: "#fff" }}>
                    <span className="text-xs font-semibold" style={{ color: secondary }}>Contacts</span>
                    <div className="flex items-center gap-2">
                      <Bell size={13} color="#A8A29E" />
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: primary }}>A</div>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="flex-1 p-3 space-y-2">
                    {/* Search + button row */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-6 rounded-lg border border-[#E8E6E2] flex items-center gap-1.5 px-2" style={{ background: "#fff" }}>
                        <Search size={10} color="#A8A29E" /><span className="text-[9px] text-[#A8A29E]">Search…</span>
                      </div>
                      <div className="h-6 px-2 rounded-lg text-[9px] font-semibold text-white flex items-center" style={{ background: primary }}>+ New</div>
                    </div>
                    {/* Table rows */}
                    {["Kim Sunjae", "Park Jiyeon", "Lee Junho"].map((name, i) => (
                      <div key={name} className="flex items-center justify-between h-6 px-2 rounded"
                        style={{ background: i === 0 ? `${primary}10` : "#fff", border: `1px solid #E8E6E2` }}>
                        <span className="text-[9px] font-medium" style={{ color: secondary }}>{name}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full text-white" style={{ background: primary }}>Active</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Colour swatches */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <button className="h-8 px-3 rounded-lg text-xs font-semibold text-white" style={{ background: primary }}>Primary Button</button>
                <button className="h-8 px-3 rounded-lg text-xs font-semibold border-2" style={{ color: primary, borderColor: primary, background: "transparent" }}>Outline Button</button>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: primary, color: "#fff" }}>Active</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border" style={{ color: secondary, borderColor: secondary }}>Neutral</span>
              </div>
            </div>
          )}

          {/* ── Dark Preview ── */}
          {previewMode === "dark" && (
            <div className="p-4" style={{ background: "#0F0E0D" }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: primary }}>Dark Mode Preview</p>
              {/* Mini UI shell */}
              <div className="rounded-xl overflow-hidden flex" style={{ height: 200, border: "1px solid #393532" }}>
                {/* Sidebar */}
                <div className="w-36 shrink-0 flex flex-col" style={{ background: "#0F0E0D", borderRight: "1px solid #393532" }}>
                  {/* Logo area */}
                  <div className="h-10 flex items-center px-3" style={{ background: "#181614", borderBottom: "1px solid #393532" }}>
                    {(merged.logoDarkUrl || merged.logoUrl)
                      ? <img src={merged.logoDarkUrl || merged.logoUrl} alt="logo" className="h-5 object-contain" />
                      : <div className="h-5 w-16 rounded" style={{ background: primary, opacity: 0.85 }} />
                    }
                  </div>
                  {/* Nav items */}
                  <div className="flex-1 px-2 py-2 space-y-0.5">
                    {[
                      { icon: LayoutDashboard, label: "Dashboard", active: false },
                      { icon: Users,           label: "Contacts",  active: true  },
                      { icon: FileText,        label: "Contracts", active: false },
                      { icon: Settings,        label: "Settings",  active: false },
                    ].map(({ icon: Icon, label, active }) => (
                      <div key={label} className="flex items-center gap-1.5 px-2 h-7 rounded-lg text-[10px] font-medium"
                        style={{ background: active ? `${primary}22` : "transparent", color: active ? primary : "#6B6865" }}>
                        <Icon size={11} style={{ color: active ? primary : "#57534E" }} />
                        {label}
                      </div>
                    ))}
                  </div>
                  {/* User area */}
                  <div className="h-10 flex items-center gap-2 px-3" style={{ borderTop: "1px solid #2A2725" }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ background: primary }}>A</div>
                    <div>
                      <div className="text-[9px] font-semibold" style={{ color: "#F5F0EB" }}>Admin</div>
                      <div className="text-[8px]" style={{ color: "#6B6865" }}>admin@edubee.co</div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="flex-1 flex flex-col" style={{ background: "#131211" }}>
                  {/* Topbar */}
                  <div className="h-10 flex items-center justify-between px-3" style={{ background: "#181614", borderBottom: "1px solid #393532" }}>
                    <span className="text-xs font-semibold" style={{ color: "#F5F0EB" }}>Contacts</span>
                    <div className="flex items-center gap-2">
                      <Bell size={13} color="#57534E" />
                      <div className="h-6 px-2 rounded-lg text-[9px] font-semibold flex items-center gap-1" style={{ background: `${primary}25`, color: primary, border: `1px solid ${primary}40` }}>
                        <Moon size={9} /> Dark View
                      </div>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="flex-1 p-3 space-y-2">
                    {/* Search + button row */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-6 rounded-lg flex items-center gap-1.5 px-2" style={{ background: "#2A2725", border: "1px solid #393532" }}>
                        <Search size={10} color="#57534E" /><span className="text-[9px]" style={{ color: "#6B6865" }}>Search…</span>
                      </div>
                      <div className="h-6 px-2 rounded-lg text-[9px] font-semibold text-white flex items-center" style={{ background: primary }}>+ New</div>
                    </div>
                    {/* Table rows */}
                    {[
                      { name: "Kim Sunjae",  active: true  },
                      { name: "Park Jiyeon", active: false },
                      { name: "Lee Junho",   active: false },
                    ].map(({ name, active }, i) => (
                      <div key={name} className="flex items-center justify-between h-6 px-2 rounded"
                        style={{ background: i === 0 ? "#2A2725" : "#1C1A18", border: "1px solid #393532" }}>
                        <span className="text-[9px] font-medium" style={{ color: "#F5F0EB" }}>{name}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full"
                          style={{ background: active ? `${primary}30` : "#2A2725", color: active ? primary : "#6B6865", border: `1px solid ${active ? primary + "50" : "#393532"}` }}>
                          {active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Colour swatches on dark */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <button className="h-8 px-3 rounded-lg text-xs font-semibold text-white" style={{ background: primary }}>Primary Button</button>
                <button className="h-8 px-3 rounded-lg text-xs font-semibold border-2" style={{ color: primary, borderColor: primary, background: "transparent" }}>Outline Button</button>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: `${primary}30`, color: primary, border: `1px solid ${primary}50` }}>Active Badge</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: "#A8A29E", border: "1px solid #393532" }}>Neutral Badge</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Custom CSS */}
      <div className="bg-white rounded-xl border border-[#E8E6E2]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <button
          onClick={() => setShowCss(p => !p)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-(--e-orange)" strokeWidth={1.5} />
            <span className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide">Advanced: Custom CSS</span>
          </div>
          {showCss ? <ChevronUp size={16} className="text-[#A8A29E]" /> : <ChevronDown size={16} className="text-[#A8A29E]" />}
        </button>

        {showCss && (
          <div className="px-6 pb-6 space-y-3 border-t border-[#E8E6E2] pt-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" strokeWidth={1.5} />
              <p className="text-xs text-amber-700">Incorrect CSS may break the UI. Use with caution.</p>
            </div>
            <textarea
              value={merged.customCss || ""}
              onChange={e => set("customCss")(e.target.value)}
              className="w-full h-48 px-3 py-2 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm font-mono focus:outline-none focus:border-(--e-orange) resize-none bg-[#FAFAF9]"
              placeholder={`/* Custom CSS */\n.sidebar { background: #1C1917; }`}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end pb-6">
        <button
          onClick={handleSave}
          disabled={colorMutation.isPending}
          className="h-10 px-6 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
          style={{ background: "var(--e-orange)" }}
        >
          {colorMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Branding
        </button>
      </div>
    </div>
  );
}
