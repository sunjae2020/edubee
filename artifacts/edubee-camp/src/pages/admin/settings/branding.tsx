import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Palette, Code2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E6E2] p-6 space-y-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center gap-2 border-b border-[#E8E6E2] pb-3">
        <Icon size={16} className="text-[#F5821F]" strokeWidth={1.5} />
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
          className="flex-1 h-10 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm font-mono focus:outline-none focus:border-[#F5821F] uppercase"
          placeholder="#F5821F"
        />
      </div>
    </div>
  );
}

export default function Branding() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCss, setShowCss] = useState(false);

  const { data: branding, isLoading } = useQuery<any>({
    queryKey: ["settings-branding"],
    queryFn: () => axios.get(`${BASE}/api/settings/branding`).then(r => r.data),
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const merged = { ...branding, ...form };

  const set = (key: string) => (val: string) => setForm(p => ({ ...p, [key]: val }));

  const mutation = useMutation({
    mutationFn: (data: any) => axios.put(`${BASE}/api/settings/branding`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings-branding"] });
      setForm({});
      toast({ title: "Saved", description: "Branding settings updated." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save branding.", variant: "destructive" }),
  });

  const handleSave = () => {
    mutation.mutate({
      logoUrl:        merged.logoUrl,
      faviconUrl:     merged.faviconUrl,
      primaryColor:   merged.primaryColor   || "#F5821F",
      secondaryColor: merged.secondaryColor || "#1C1917",
      accentColor:    merged.accentColor    || "#FEF0E3",
      customCss:      merged.customCss,
    });
  };

  const primary   = merged.primaryColor   || "#F5821F";
  const secondary = merged.secondaryColor || "#1C1917";
  const accent    = merged.accentColor    || "#FEF0E3";

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="animate-spin text-[#F5821F]" />
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
          disabled={mutation.isPending}
          className="h-10 px-5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
          style={{ background: "#F5821F" }}
        >
          {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Branding
        </button>
      </div>

      {/* Logo */}
      <Card title="Logo & Favicon" icon={Palette}>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Logo URL</label>
              <input
                type="url"
                value={merged.logoUrl || ""}
                onChange={e => set("logoUrl")(e.target.value)}
                className="w-full h-10 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm focus:outline-none focus:border-[#F5821F] bg-white"
                placeholder="https://…/logo.png"
              />
              <p className="text-[11px] text-[#A8A29E]">PNG, JPG, SVG — recommended 400×150px</p>
            </div>
            {merged.logoUrl && (
              <div className="w-full h-24 rounded-lg border border-[#E8E6E2] flex items-center justify-center bg-[#FAFAF9] p-3">
                <img src={merged.logoUrl} alt="Logo preview" className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Favicon URL</label>
              <input
                type="url"
                value={merged.faviconUrl || ""}
                onChange={e => set("faviconUrl")(e.target.value)}
                className="w-full h-10 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm focus:outline-none focus:border-[#F5821F] bg-white"
                placeholder="https://…/favicon.ico"
              />
              <p className="text-[11px] text-[#A8A29E]">ICO or PNG 32×32px</p>
            </div>
            {merged.faviconUrl && (
              <div className="w-16 h-16 rounded-lg border border-[#E8E6E2] flex items-center justify-center bg-[#FAFAF9] p-2">
                <img src={merged.faviconUrl} alt="Favicon preview" className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Colours */}
      <Card title="Colour Settings" icon={Palette}>
        <div className="grid grid-cols-3 gap-6">
          <ColorPicker label="Primary Colour"   value={primary}   onChange={set("primaryColor")} />
          <ColorPicker label="Secondary Colour" value={secondary} onChange={set("secondaryColor")} />
          <ColorPicker label="Accent Colour"    value={accent}    onChange={set("accentColor")} />
        </div>

        {/* Live preview */}
        <div className="rounded-xl border border-[#E8E6E2] p-4 mt-2" style={{ background: accent }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: secondary }}>Live Preview</p>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              className="h-9 px-4 rounded-lg text-sm font-semibold text-white"
              style={{ background: primary }}
            >
              Primary Button
            </button>
            <button
              className="h-9 px-4 rounded-lg text-sm font-semibold border-2"
              style={{ color: primary, borderColor: primary, background: "transparent" }}
            >
              Outline Button
            </button>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: primary, color: "#fff" }}
            >
              Active Badge
            </span>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
              style={{ color: secondary, borderColor: secondary }}
            >
              Neutral Badge
            </span>
          </div>
        </div>
      </Card>

      {/* Custom CSS */}
      <div className="bg-white rounded-xl border border-[#E8E6E2]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <button
          onClick={() => setShowCss(p => !p)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-[#F5821F]" strokeWidth={1.5} />
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
              className="w-full h-48 px-3 py-2 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm font-mono focus:outline-none focus:border-[#F5821F] resize-none bg-[#FAFAF9]"
              placeholder={`/* Custom CSS */\n.sidebar { background: #1C1917; }`}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end pb-6">
        <button
          onClick={handleSave}
          disabled={mutation.isPending}
          className="h-10 px-6 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
          style={{ background: "#F5821F" }}
        >
          {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Branding
        </button>
      </div>
    </div>
  );
}
