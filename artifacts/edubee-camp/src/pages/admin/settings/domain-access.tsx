import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Globe, Loader2, CheckCircle2, XCircle, Lock, AlertTriangle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function DomainAccess() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: domain, isLoading } = useQuery<any>({
    queryKey: ["settings-domain"],
    queryFn: () => axios.get(`${BASE}/api/settings/domain`).then(r => r.data),
  });

  const [subdomain, setSubdomain]     = useState("");
  const [availability, setAvailability] = useState<null | boolean>(null);
  const [checking, setChecking]       = useState(false);
  const [saving, setSaving]           = useState(false);

  const currentSubdomain = subdomain || domain?.subdomain || "";

  const checkAvailability = async () => {
    if (!subdomain.trim()) return;
    setChecking(true);
    setAvailability(null);
    try {
      const r = await axios.post(`${BASE}/api/settings/domain/check`, { subdomain: subdomain.trim() });
      setAvailability(r.data.available);
    } catch {
      toast({ title: "Error", description: "Could not check availability.", variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  const saveDomain = async () => {
    if (!subdomain.trim() || availability === false) return;
    setSaving(true);
    try {
      await axios.put(`${BASE}/api/settings/domain`, { subdomain: subdomain.trim() });
      qc.invalidateQueries({ queryKey: ["settings-domain"] });
      toast({ title: "Saved", description: "Subdomain updated successfully." });
      setSubdomain("");
      setAvailability(null);
    } catch {
      toast({ title: "Error", description: "Failed to save subdomain.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const inp = "flex-1 h-10 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm focus:outline-none focus:border-[#F5821F] bg-white";

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="animate-spin text-[#F5821F]" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 px-4">
      <div>
        <h1 className="text-lg font-semibold text-[#1C1917]">Domain & Access</h1>
        <p className="text-sm text-[#57534E] mt-0.5">Configure your subdomain and custom domain settings</p>
      </div>

      {/* Subdomain */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] p-6 space-y-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2 border-b border-[#E8E6E2] pb-3">
          <Globe size={16} className="text-[#F5821F]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide">Subdomain Settings</h2>
        </div>

        {domain?.subdomain && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#F4F3F1] text-sm">
            <Globe size={14} className="text-[#A8A29E]" />
            <span className="text-[#57534E]">Current subdomain:</span>
            <span className="font-semibold text-[#1C1917]">{domain.subdomain}.edubee.com</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">New Subdomain</label>
          <div className="flex items-center gap-2">
            <input
              className={inp}
              value={subdomain}
              onChange={e => { setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setAvailability(null); }}
              placeholder="your-agency"
            />
            <span className="text-sm text-[#57534E] whitespace-nowrap">.edubee.com</span>
            <button
              onClick={checkAvailability}
              disabled={!subdomain.trim() || checking}
              className="h-10 px-4 rounded-lg text-sm font-medium border border-[#E8E6E2] text-[#57534E] hover:bg-[#F4F3F1] disabled:opacity-50 whitespace-nowrap"
            >
              {checking ? <Loader2 size={13} className="animate-spin" /> : "Check Availability"}
            </button>
          </div>

          {availability === true && (
            <div className="flex items-center gap-1.5 text-green-600 text-sm">
              <CheckCircle2 size={14} /> <span>Available! Ready to use.</span>
            </div>
          )}
          {availability === false && (
            <div className="flex items-center gap-1.5 text-red-500 text-sm">
              <XCircle size={14} /> <span>Already taken. Try a different subdomain.</span>
            </div>
          )}
        </div>

        {availability === true && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" strokeWidth={1.5} />
              <p className="text-xs text-amber-700">
                Changing your subdomain will invalidate the current URL. All existing links using the old subdomain will stop working.
              </p>
            </div>
            <button
              onClick={saveDomain}
              disabled={saving}
              className="h-10 px-5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
              style={{ background: "#F5821F" }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              Save Subdomain
            </button>
          </div>
        )}
      </div>

      {/* Custom Domain */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] p-6 space-y-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2 border-b border-[#E8E6E2] pb-3">
          <Lock size={16} className="text-[#A8A29E]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide">Custom Domain</h2>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#F5821F]/10 text-[#F5821F] font-semibold">
            Professional Plan+
          </span>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-lg bg-[#F4F3F1]">
          <Lock size={16} className="text-[#A8A29E] shrink-0" />
          <div>
            <p className="text-sm font-medium text-[#1C1917]">Custom domain is available on Professional plan and above</p>
            <p className="text-xs text-[#A8A29E] mt-0.5">Upgrade your plan to use a custom domain like <span className="font-mono">crm.myagency.com.au</span></p>
          </div>
        </div>

        <div className="space-y-2 opacity-50 pointer-events-none">
          <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Custom Domain</label>
          <input
            className="w-full h-10 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm bg-white"
            placeholder="crm.myagency.com.au"
            disabled
          />
          <div className="text-xs text-[#A8A29E] space-y-1">
            <p className="font-medium">DNS Setup:</p>
            <p>Add a CNAME record pointing to <span className="font-mono">app.edubee.com</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
