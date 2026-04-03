import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import {
  Globe, Loader2, CheckCircle2, XCircle, Lock, AlertTriangle,
  Copy, ExternalLink, RefreshCw, ShieldCheck, Clock, Info,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Helpers ───────────────────────────────────────────────────────────────────

function copyToClipboard(text: string, label: string, toast: any) {
  navigator.clipboard.writeText(text).then(() => {
    toast({ title: `${label} copied` });
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: "#FEF9C3", color: "#854D0E", label: "Pending" },
    verified: { bg: "#DCFCE7", color: "#166534", label: "Verified" },
    failed:   { bg: "#FFF1F2", color: "#9F1239", label: "Failed"  },
  };
  const s = map[status] ?? map.pending;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      {status === "verified" ? <CheckCircle2 size={11} /> : status === "failed" ? <XCircle size={11} /> : <Clock size={11} />}
      {s.label}
    </span>
  );
}

function DnsRecordRow({ type, hostname, value, ttl }: {
  type: string; hostname: string; value: string; ttl?: number;
}) {
  const { toast } = useToast();
  return (
    <tr className="border-b border-[#F4F3F1] last:border-0">
      <td className="py-3 pr-4">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono bg-[#F4F3F1] text-[#1C1917]">
          {type}
        </span>
      </td>
      <td className="py-3 pr-4">
        <span className="font-mono text-sm text-[#1C1917]">{hostname}</span>
      </td>
      <td className="py-3 pr-4 max-w-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-[#57534E] truncate">{value}</span>
          <button
            onClick={() => copyToClipboard(value, type + " value", toast)}
            className="shrink-0 p-1 rounded hover:bg-[#F4F3F1] text-[#A8A29E] hover:text-[#57534E] transition-colors"
            title="Copy to clipboard"
          >
            <Copy size={13} />
          </button>
        </div>
      </td>
      <td className="py-3 text-sm text-[#A8A29E]">{ttl ? `${ttl}s` : "Auto"}</td>
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DomainAccess() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: domain, isLoading } = useQuery<any>({
    queryKey: ["settings-domain"],
    queryFn: () => axios.get(`${BASE}/api/settings/domain`).then(r => r.data),
  });

  const { data: dnsInstructions, refetch: refetchDns } = useQuery<any>({
    queryKey: ["settings-dns-instructions"],
    queryFn: () => axios.get(`${BASE}/api/settings/domain/dns-instructions`).then(r => r.data),
    retry: false,
    throwOnError: false,
  });

  const [subdomain, setSubdomain]       = useState("");
  const [availability, setAvailability] = useState<null | boolean>(null);
  const [checking, setChecking]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [customDomainInput, setCustomDomainInput] = useState("");

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

  const registerCustomDomain = useMutation({
    mutationFn: () =>
      axios.put(`${BASE}/api/settings/domain/custom`, { customDomain: customDomainInput.trim() }).then(r => r.data),
    onSuccess: (data) => {
      toast({ title: "Domain registered", description: data.message });
      setCustomDomainInput("");
      qc.invalidateQueries({ queryKey: ["settings-domain"] });
      refetchDns();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? "Failed to register domain.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const verifyDns = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/settings/domain/custom/verify`).then(r => r.data),
    onSuccess: (data) => {
      if (data.verified) {
        toast({ title: "DNS Verified!", description: "Your custom domain is active." });
      } else {
        toast({
          title: "Not verified yet",
          description: data.message ?? "DNS records not found. Allow up to 48 hours for propagation.",
          variant: "destructive",
        });
      }
      qc.invalidateQueries({ queryKey: ["settings-domain"] });
      refetchDns();
    },
    onError: (e: any) => {
      toast({ title: "Verification failed", description: e?.response?.data?.message, variant: "destructive" });
    },
  });

  const inp = "flex-1 h-10 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm focus:outline-none focus:border-[--e-orange] bg-white";
  const canCustomDomain = domain?.planType !== "solo" && domain?.planType !== "starter";

  const cname = dnsInstructions?.customDomain?.cnameRecord;
  const txt   = dnsInstructions?.customDomain?.txtRecord;
  const guides = dnsInstructions?.customDomain?.providerGuides;

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="animate-spin text-[--e-orange]" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 px-4">
      <div>
        <h1 className="text-lg font-semibold text-[#1C1917]">Domain & Access</h1>
        <p className="text-sm text-[#57534E] mt-0.5">Configure your subdomain and custom domain settings</p>
      </div>

      {/* ── Subdomain ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] p-6 space-y-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2 border-b border-[#E8E6E2] pb-3">
          <Globe size={16} className="text-[--e-orange]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide">Subdomain</h2>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] font-semibold flex items-center gap-1">
            <ShieldCheck size={11} /> Managed by Edubee
          </span>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#F0FDF4] border border-[#A7F3D0] text-sm text-[#166534]">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>Subdomain (e.g. <span className="font-mono font-semibold">abc.edubee.co</span>) is automatically managed by Edubee. No DNS setup required on your end.</p>
        </div>

        {domain?.subdomain && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#F4F3F1] text-sm">
            <Globe size={14} className="text-[#A8A29E]" />
            <span className="text-[#57534E]">Current:</span>
            <span className="font-mono font-semibold text-[#1C1917]">{domain.subdomain}.edubee.co</span>
            <button
              onClick={() => copyToClipboard(`${domain.subdomain}.edubee.co`, "URL", toast)}
              className="ml-auto p-1 rounded hover:bg-[#E8E6E2] text-[#A8A29E] hover:text-[#57534E] transition-colors"
            >
              <Copy size={13} />
            </button>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Change Subdomain</label>
          <div className="flex items-center gap-2">
            <input
              className={inp}
              value={subdomain}
              onChange={e => { setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setAvailability(null); }}
              placeholder="your-agency"
            />
            <span className="text-sm text-[#57534E] whitespace-nowrap">.edubee.co</span>
            <button
              onClick={checkAvailability}
              disabled={!subdomain.trim() || checking}
              className="h-10 px-4 rounded-lg text-sm font-medium border border-[#E8E6E2] text-[#57534E] hover:bg-[#F4F3F1] disabled:opacity-50 whitespace-nowrap"
            >
              {checking ? <Loader2 size={13} className="animate-spin" /> : "Check"}
            </button>
          </div>
          {availability === true && (
            <div className="flex items-center gap-1.5 text-green-600 text-sm">
              <CheckCircle2 size={14} /> Available!
            </div>
          )}
          {availability === false && (
            <div className="flex items-center gap-1.5 text-red-500 text-sm">
              <XCircle size={14} /> Already taken. Try another.
            </div>
          )}
        </div>

        {availability === true && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" strokeWidth={1.5} />
              <p className="text-xs text-amber-700">Changing your subdomain will break any existing links using the old URL.</p>
            </div>
            <button
              onClick={saveDomain}
              disabled={saving}
              className="h-10 px-5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
              style={{ background: "var(--e-orange)" }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              Save Subdomain
            </button>
          </div>
        )}
      </div>

      {/* ── Custom Domain ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] p-6 space-y-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2 border-b border-[#E8E6E2] pb-3">
          <Lock size={16} className={canCustomDomain ? "text-[--e-orange]" : "text-[#A8A29E]"} strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide">Custom Domain</h2>
          {!canCustomDomain && (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[--e-orange]/10 text-[--e-orange] font-semibold">
              Growth Plan+
            </span>
          )}
          {canCustomDomain && domain?.customDomain && (
            <div className="ml-auto flex items-center gap-2">
              <StatusBadge status={domain?.dnsStatus ?? "pending"} />
            </div>
          )}
        </div>

        {!canCustomDomain ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-[#F4F3F1]">
            <Lock size={16} className="text-[#A8A29E] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#1C1917]">Custom domain is available on Growth plan and above</p>
              <p className="text-xs text-[#A8A29E] mt-0.5">Use a custom domain like <span className="font-mono">crm.myagency.com.au</span></p>
            </div>
          </div>
        ) : (
          <>
            {/* Current custom domain */}
            {domain?.customDomain && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#F4F3F1] text-sm">
                <Globe size={14} className="text-[#A8A29E]" />
                <span className="text-[#57534E]">Current:</span>
                <span className="font-mono font-semibold text-[#1C1917]">{domain.customDomain}</span>
                <button
                  onClick={() => copyToClipboard(domain.customDomain, "Domain", toast)}
                  className="ml-auto p-1 rounded hover:bg-[#E8E6E2] text-[#A8A29E] hover:text-[#57534E] transition-colors"
                >
                  <Copy size={13} />
                </button>
              </div>
            )}

            {/* Register / change domain */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">
                {domain?.customDomain ? "Change Custom Domain" : "Register Custom Domain"}
              </label>
              <div className="flex items-center gap-2">
                <input
                  className={inp}
                  value={customDomainInput}
                  onChange={e => setCustomDomainInput(e.target.value.toLowerCase())}
                  placeholder="crm.myagency.com.au"
                />
                <button
                  onClick={() => registerCustomDomain.mutate()}
                  disabled={!customDomainInput.trim() || registerCustomDomain.isPending}
                  className="h-10 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5"
                  style={{ background: "var(--e-orange)" }}
                >
                  {registerCustomDomain.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                  {domain?.customDomain ? "Update" : "Register"}
                </button>
              </div>
              <p className="text-xs text-[#A8A29E]">
                Enter the domain you own (e.g. <span className="font-mono">crm.myagency.com.au</span>). After registering, set the DNS records below.
              </p>
            </div>

            {/* DNS Records Table */}
            {(cname || txt) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">
                    DNS Records to Configure
                  </p>
                  <button
                    onClick={() => verifyDns.mutate()}
                    disabled={verifyDns.isPending}
                    className="h-8 px-3 rounded-lg text-xs font-semibold border border-[#E8E6E2] text-[#57534E] hover:border-[--e-orange] hover:text-[--e-orange] flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {verifyDns.isPending
                      ? <Loader2 size={12} className="animate-spin" />
                      : <RefreshCw size={12} />}
                    Verify DNS
                  </button>
                </div>

                <div className="rounded-xl border border-[#E8E6E2] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#FAFAF9]">
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#57534E] uppercase tracking-wide border-b border-[#E8E6E2]">Type</th>
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#57534E] uppercase tracking-wide border-b border-[#E8E6E2]">Hostname</th>
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#57534E] uppercase tracking-wide border-b border-[#E8E6E2]">Record / Value</th>
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#57534E] uppercase tracking-wide border-b border-[#E8E6E2]">TTL</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#F4F3F1] px-4">
                      {cname && (
                        <tr>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono bg-blue-50 text-blue-700">CNAME</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-sm text-[#1C1917]">{cname.host}</span>
                              <button onClick={() => copyToClipboard(cname.host, "Hostname", toast)} className="p-0.5 rounded hover:bg-[#F4F3F1] text-[#A8A29E] hover:text-[#57534E]"><Copy size={12} /></button>
                            </div>
                            <p className="text-[11px] text-[#A8A29E] mt-0.5">
                              Points your domain root to Edubee
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-sm text-[#1C1917] break-all">{cname.value}</span>
                              <button onClick={() => copyToClipboard(cname.value, "CNAME value", toast)} className="shrink-0 p-0.5 rounded hover:bg-[#F4F3F1] text-[#A8A29E] hover:text-[#57534E]"><Copy size={12} /></button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-[#A8A29E]">{cname.ttl}s</td>
                        </tr>
                      )}
                      {txt && (
                        <tr>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono bg-amber-50 text-amber-700">TXT</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-sm text-[#1C1917]">{txt.host}</span>
                              <button onClick={() => copyToClipboard(txt.host, "TXT hostname", toast)} className="p-0.5 rounded hover:bg-[#F4F3F1] text-[#A8A29E] hover:text-[#57534E]"><Copy size={12} /></button>
                            </div>
                            <p className="text-[11px] text-[#A8A29E] mt-0.5">Domain ownership verification</p>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-sm text-[#1C1917] break-all">{txt.value}</span>
                              <button onClick={() => copyToClipboard(txt.value, "TXT value", toast)} className="shrink-0 p-0.5 rounded hover:bg-[#F4F3F1] text-[#A8A29E] hover:text-[#57534E]"><Copy size={12} /></button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-[#A8A29E]">{txt.ttl}s</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" strokeWidth={1.5} />
                  <p className="text-xs text-amber-700">
                    DNS propagation can take up to <strong>48 hours</strong>.
                    Add both CNAME and TXT records to your DNS provider, then click <strong>Verify DNS</strong>.
                  </p>
                </div>

                {/* Provider Links */}
                {guides && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-[#57534E]">Setup guides for common DNS providers:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(guides).map(([name, url]) => (
                        <a
                          key={name}
                          href={url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[--e-orange] hover:underline capitalize"
                        >
                          {name} <ExternalLink size={10} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* If domain is registered but no dns instructions yet (just registered) */}
            {domain?.customDomain && !cname && !txt && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-[#F4F3F1] text-sm text-[#57534E]">
                <Info size={14} className="mt-0.5 shrink-0" />
                <p>DNS records are being prepared. Refresh the page in a moment to see the configuration instructions.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
