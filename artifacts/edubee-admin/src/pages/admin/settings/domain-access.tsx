import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import {
  Globe, Loader2, CheckCircle2, XCircle, Lock, AlertTriangle,
  Copy, ExternalLink, RefreshCw, ShieldCheck, Clock, Info,
  Server, Network,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Edubee Nameservers (NS) ─────────────────────────────────────────────────
const EDUBEE_NAMESERVERS = [
  "ns1.edubee.co",
  "ns2.edubee.co",
];

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

// ── DNS Method Tab ─────────────────────────────────────────────────────────────
type DnsMethod = "cname" | "nameserver";

function MethodTab({
  active, onClick, icon, label, description,
}: {
  active: boolean; onClick: () => void;
  icon: React.ReactNode; label: string; description: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all"
      style={{
        borderColor: active ? "var(--e-orange)" : "#E8E6E2",
        background: active ? "var(--e-orange-lt)" : "#FAFAF9",
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: active ? "var(--e-orange)" : "#E8E6E2" }}
      >
        <span style={{ color: active ? "white" : "#57534E" }}>{icon}</span>
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: active ? "var(--e-orange)" : "#1C1917" }}>{label}</p>
        <p className="text-xs text-[#78716C] mt-0.5 leading-snug">{description}</p>
      </div>
      {active && (
        <CheckCircle2 size={16} className="ml-auto shrink-0 mt-1" style={{ color: "var(--e-orange)" }} />
      )}
    </button>
  );
}

// ── CNAME/TXT Setup Section ────────────────────────────────────────────────────
function CnameTxtSection({
  cname, txt, guides, verifyDns, toast,
}: {
  cname: any; txt: any; guides: any;
  verifyDns: any; toast: any;
}) {
  return (
    <div className="space-y-4">
      {/* Step guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
          <Info size={14} /> How to configure CNAME/TXT records
        </p>
        <ol className="space-y-2 text-xs text-blue-700 list-none">
          {[
            "Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.).",
            "Open the DNS management menu (or Zone Editor).",
            "Add each of the CNAME and TXT records below.",
            "After saving, wait for DNS propagation and click the 'Verify DNS' button.",
          ].map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center shrink-0 font-bold text-[10px]">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* DNS records table */}
      {(cname || txt) ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">
              DNS Records to Add
            </p>
            <button
              onClick={() => verifyDns.mutate()}
              disabled={verifyDns.isPending}
              className="h-8 px-3 rounded-lg text-xs font-semibold border border-[#E8E6E2] text-[#57534E] hover:border-(--e-orange) hover:text-(--e-orange) flex items-center gap-1.5 transition-colors disabled:opacity-50"
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
                  {["Type", "Hostname / Name", "Record / Value", "TTL"].map(h => (
                    <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold text-[#57534E] uppercase tracking-wide border-b border-[#E8E6E2]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#F4F3F1]">
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
                      <p className="text-[11px] text-[#A8A29E] mt-0.5">Connect domain root to Edubee</p>
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
                      <p className="text-[11px] text-[#A8A29E] mt-0.5">Verify domain ownership</p>
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
              DNS propagation may take up to <strong>48 hours</strong>.
              After adding both CNAME and TXT records, click <strong>Verify DNS</strong>.
            </p>
          </div>

          {/* Provider guide links */}
          {guides && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-[#57534E]">Setup guides for major DNS providers:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(guides).map(([name, url]) => (
                  <a
                    key={name}
                    href={url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-(--e-orange) hover:underline capitalize"
                  >
                    {name} <ExternalLink size={10} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#F4F3F1] text-sm text-[#57534E]">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>Register a custom domain first to see DNS records here.</p>
        </div>
      )}
    </div>
  );
}

// ── Nameserver (NS) Setup Section ──────────────────────────────────────────────
function NameserverSection({ customDomain, toast }: { customDomain?: string; toast: any }) {
  const registrarSteps = [
    { label: "Log in to your domain registrar", desc: "Log in to the site where you purchased your domain (GoDaddy, Namecheap, Porkbun, etc.)." },
    { label: "Domain Management → Change Nameservers", desc: "On the domain management page, find the 'Nameservers' or 'DNS Servers' option." },
    { label: "Delete all existing nameservers and enter the values below", desc: "Select the Custom / other nameservers option and enter the two values below one by one." },
    { label: "Save and wait for propagation", desc: "Nameserver changes may take up to 48 hours. Once complete, Edubee will be automatically connected." },
  ];

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-purple-800 flex items-center gap-2">
          <Server size={14} /> How to configure Nameservers (NS)
        </p>
        <p className="text-xs text-purple-700 leading-relaxed">
          Changing your domain's nameservers to Edubee connects it automatically
          without needing to add DNS records manually. It's simpler than the CNAME/TXT approach,
          but <strong>existing DNS records (email MX, etc.) will be reset</strong>.
        </p>
      </div>

      {/* Nameserver record card */}
      <div className="rounded-xl border border-[#E8E6E2] overflow-hidden">
        <div className="bg-[#FAFAF9] px-4 py-2.5 border-b border-[#E8E6E2] flex items-center gap-2">
          <Network size={13} className="text-[#57534E]" />
          <span className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Edubee Nameservers</span>
        </div>
        <div className="bg-white divide-y divide-[#F4F3F1]">
          {EDUBEE_NAMESERVERS.map((ns, i) => (
            <div key={ns} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-[#F4F3F1] text-[#57534E] flex items-center justify-center text-[10px] font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="font-mono text-sm font-semibold text-[#1C1917]">{ns}</span>
              </div>
              <button
                onClick={() => copyToClipboard(ns, `NS ${i + 1}`, toast)}
                className="p-1.5 rounded hover:bg-[#F4F3F1] text-[#A8A29E] hover:text-(--e-orange) transition-colors"
                title="Copy"
              >
                <Copy size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Step-by-step guide */}
      <div className="rounded-xl border border-[#E8E6E2] overflow-hidden">
        <div className="bg-[#FAFAF9] px-4 py-2.5 border-b border-[#E8E6E2]">
          <span className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Step-by-Step Setup Guide</span>
        </div>
        <ol className="bg-white divide-y divide-[#F4F3F1]">
          {registrarSteps.map((step, i) => (
            <li key={i} className="px-4 py-3 flex gap-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}
              >
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-[#1C1917]">{step.label}</p>
                <p className="text-xs text-[#78716C] mt-0.5 leading-snug">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Major registrar links */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-[#57534E]">Nameserver change guides by registrar:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { name: "GoDaddy",   url: "https://au.godaddy.com/help/change-nameservers-for-my-domains-664" },
            { name: "Namecheap", url: "https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/" },
            { name: "Cloudflare",url: "https://developers.cloudflare.com/dns/nameservers/update-nameservers/" },
            { name: "Porkbun",   url: "https://kb.porkbun.com/article/22-how-to-change-your-nameservers" },
            { name: "Google Domains", url: "https://support.google.com/domains/answer/3290309" },
            { name: "Squarespace", url: "https://support.squarespace.com/hc/en-us/articles/213469928" },
          ].map(({ name, url }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-[#E8E6E2] text-[#57534E] hover:border-(--e-orange) hover:text-(--e-orange) transition-colors"
            >
              <ExternalLink size={11} />
              {name}
            </a>
          ))}
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
        <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" strokeWidth={1.5} />
        <div className="text-xs text-amber-700 space-y-1">
          <p><strong>Warning:</strong> Changing nameservers will reset all existing DNS records (email MX, SPF, other CNAMEs, etc.).</p>
          <p>If you use an email service, we recommend the <strong>CNAME/TXT approach</strong> instead.</p>
        </div>
      </div>

      {/* Current domain display */}
      {customDomain && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[#F4F3F1] text-sm">
          <Globe size={14} className="text-[#A8A29E]" />
          <span className="text-[#57534E]">Target domain:</span>
          <span className="font-mono font-semibold text-[#1C1917]">{customDomain}</span>
        </div>
      )}
    </div>
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
  const [dnsMethod, setDnsMethod]       = useState<DnsMethod>("cname");

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

  const inp = "flex-1 h-10 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm focus:outline-none focus:border-(--e-orange) bg-white";
  const canCustomDomain = domain?.planType !== "solo" && domain?.planType !== "starter";

  const cname  = dnsInstructions?.customDomain?.cnameRecord;
  const txt    = dnsInstructions?.customDomain?.txtRecord;
  const guides = dnsInstructions?.customDomain?.providerGuides;

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="animate-spin text-(--e-orange)" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 px-4">
      <div>
        <h1 className="text-lg font-semibold text-[#1C1917]">Domain & Access</h1>
        <p className="text-sm text-[#57534E] mt-0.5">Manage subdomain and custom domain settings</p>
      </div>

      {/* ── Subdomain ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] p-6 space-y-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2 border-b border-[#E8E6E2] pb-3">
          <Globe size={16} className="text-(--e-orange)" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide">Subdomain</h2>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] font-semibold flex items-center gap-1">
            <ShieldCheck size={11} /> Managed by Edubee
          </span>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#F0FDF4] border border-[#A7F3D0] text-sm text-[#166534]">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>Subdomains (e.g. <span className="font-mono font-semibold">abc.edubee.co</span>) are managed automatically by Edubee. No separate DNS configuration is required.</p>
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
              <XCircle size={14} /> Already in use. Please try a different name.
            </div>
          )}
        </div>

        {availability === true && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" strokeWidth={1.5} />
              <p className="text-xs text-amber-700">Changing the subdomain will break all existing links that point to your current URL.</p>
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
          <Lock size={16} className={canCustomDomain ? "text-(--e-orange)" : "text-[#A8A29E]"} strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide">Custom Domain</h2>
          {!canCustomDomain && (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-(--e-orange)/10 text-(--e-orange) font-semibold">
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
              <p className="text-sm font-medium text-[#1C1917]">Custom domains are available on the Growth plan and above</p>
              <p className="text-xs text-[#A8A29E] mt-0.5">Use a domain in the format <span className="font-mono">crm.myagency.com.au</span></p>
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

            {/* Domain registration / update */}
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
                Enter a domain you own (e.g. <span className="font-mono">crm.myagency.com.au</span>). After registering, configure DNS below.
              </p>
            </div>

            {/* ── DNS setup method selection ────────────────────────────────── */}
            <div className="space-y-4 pt-2 border-t border-[#F4F3F1]">
              <div>
                <p className="text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-3">Select DNS Setup Method</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <MethodTab
                    active={dnsMethod === "cname"}
                    onClick={() => setDnsMethod("cname")}
                    icon={<Network size={16} />}
                    label="CNAME / TXT method"
                    description="Add records to your existing DNS provider. No impact on email or other services."
                  />
                  <MethodTab
                    active={dnsMethod === "nameserver"}
                    onClick={() => setDnsMethod("nameserver")}
                    icon={<Server size={16} />}
                    label="Nameserver (NS) method"
                    description="Change the entire domain nameservers to Edubee. Simpler to set up but resets existing DNS records."
                  />
                </div>
              </div>

              {/* Content based on selected method */}
              {dnsMethod === "cname" ? (
                <CnameTxtSection
                  cname={cname}
                  txt={txt}
                  guides={guides}
                  verifyDns={verifyDns}
                  toast={toast}
                />
              ) : (
                <NameserverSection
                  customDomain={domain?.customDomain}
                  toast={toast}
                />
              )}
            </div>

            {/* Domain registered but no DNS records yet */}
            {domain?.customDomain && !cname && !txt && dnsMethod === "cname" && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-[#F4F3F1] text-sm text-[#57534E]">
                <Info size={14} className="mt-0.5 shrink-0" />
                <p>DNS records are being prepared. Please refresh the page in a moment.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
