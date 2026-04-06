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

// ── Edubee 네임서버 (NS) ────────────────────────────────────────────────────
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

// ── DNS 방법 탭 ────────────────────────────────────────────────────────────────
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

// ── CNAME/TXT 설정 섹션 ────────────────────────────────────────────────────────
function CnameTxtSection({
  cname, txt, guides, verifyDns, toast,
}: {
  cname: any; txt: any; guides: any;
  verifyDns: any; toast: any;
}) {
  return (
    <div className="space-y-4">
      {/* 단계 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
          <Info size={14} /> CNAME/TXT 레코드 설정 방법
        </p>
        <ol className="space-y-2 text-xs text-blue-700 list-none">
          {[
            "도메인 등록 기관(GoDaddy, Namecheap, Cloudflare 등)에 로그인하세요.",
            "DNS 관리 메뉴(또는 Zone Editor)를 여세요.",
            "아래 CNAME 및 TXT 레코드를 각각 추가하세요.",
            "저장 후 DNS 전파를 기다린 뒤 'Verify DNS' 버튼을 클릭하세요.",
          ].map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center shrink-0 font-bold text-[10px]">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* DNS 레코드 테이블 */}
      {(cname || txt) ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">
              추가할 DNS 레코드
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
                      <p className="text-[11px] text-[#A8A29E] mt-0.5">도메인 루트를 Edubee로 연결</p>
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
                      <p className="text-[11px] text-[#A8A29E] mt-0.5">도메인 소유권 인증</p>
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
              DNS 전파는 최대 <strong>48시간</strong>이 소요될 수 있습니다.
              CNAME 및 TXT 레코드를 모두 추가한 후 <strong>Verify DNS</strong>를 클릭하세요.
            </p>
          </div>

          {/* 제공업체별 가이드 링크 */}
          {guides && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-[#57534E]">주요 DNS 제공업체 설정 가이드:</p>
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
          <p>커스텀 도메인을 먼저 등록하면 DNS 레코드가 표시됩니다.</p>
        </div>
      )}
    </div>
  );
}

// ── 네임서버(NS) 설정 섹션 ──────────────────────────────────────────────────────
function NameserverSection({ customDomain, toast }: { customDomain?: string; toast: any }) {
  const registrarSteps = [
    { label: "도메인 등록 기관에 로그인", desc: "GoDaddy, Namecheap, Porkbun 등 도메인을 구매한 사이트에 로그인하세요." },
    { label: "도메인 관리 → 네임서버 변경", desc: "도메인 관리 페이지에서 'Nameservers' 또는 'DNS Servers' 항목을 찾으세요." },
    { label: "기존 네임서버 모두 삭제 후 아래 값 입력", desc: "Custom/다른 네임서버 옵션을 선택하고 아래 두 개를 차례로 입력하세요." },
    { label: "저장 후 전파 대기", desc: "네임서버 변경은 최대 48시간이 소요됩니다. 완료 후 Edubee에 자동 연결됩니다." },
  ];

  return (
    <div className="space-y-4">
      {/* 안내 배너 */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-purple-800 flex items-center gap-2">
          <Server size={14} /> 네임서버(NS) 설정 방법
        </p>
        <p className="text-xs text-purple-700 leading-relaxed">
          도메인의 네임서버를 Edubee로 변경하면 DNS 레코드를 직접 추가할 필요 없이
          자동으로 연결됩니다. CNAME/TXT 방식보다 간단하지만,
          <strong> 기존 DNS 레코드(이메일 MX 등)는 초기화</strong>됩니다.
        </p>
      </div>

      {/* 네임서버 레코드 카드 */}
      <div className="rounded-xl border border-[#E8E6E2] overflow-hidden">
        <div className="bg-[#FAFAF9] px-4 py-2.5 border-b border-[#E8E6E2] flex items-center gap-2">
          <Network size={13} className="text-[#57534E]" />
          <span className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Edubee 네임서버</span>
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

      {/* 단계별 가이드 */}
      <div className="rounded-xl border border-[#E8E6E2] overflow-hidden">
        <div className="bg-[#FAFAF9] px-4 py-2.5 border-b border-[#E8E6E2]">
          <span className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">단계별 설정 가이드</span>
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

      {/* 주요 등록 기관 링크 */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-[#57534E]">등록 기관별 네임서버 변경 가이드:</p>
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

      {/* 경고 */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
        <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" strokeWidth={1.5} />
        <div className="text-xs text-amber-700 space-y-1">
          <p><strong>주의:</strong> 네임서버를 변경하면 기존 DNS 레코드(이메일 MX, SPF, 기타 CNAME 등)가 모두 초기화됩니다.</p>
          <p>이메일 서비스를 사용 중이라면 <strong>CNAME/TXT 방식</strong>을 권장합니다.</p>
        </div>
      </div>

      {/* 현재 도메인 표시 */}
      {customDomain && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[#F4F3F1] text-sm">
          <Globe size={14} className="text-[#A8A29E]" />
          <span className="text-[#57534E]">설정 대상 도메인:</span>
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
        <p className="text-sm text-[#57534E] mt-0.5">서브도메인 및 커스텀 도메인 설정을 관리합니다</p>
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
          <p>서브도메인(예: <span className="font-mono font-semibold">abc.edubee.co</span>)은 Edubee가 자동으로 관리합니다. 별도의 DNS 설정이 필요 없습니다.</p>
        </div>

        {domain?.subdomain && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#F4F3F1] text-sm">
            <Globe size={14} className="text-[#A8A29E]" />
            <span className="text-[#57534E]">현재:</span>
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
          <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">서브도메인 변경</label>
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
              <CheckCircle2 size={14} /> 사용 가능!
            </div>
          )}
          {availability === false && (
            <div className="flex items-center gap-1.5 text-red-500 text-sm">
              <XCircle size={14} /> 이미 사용 중입니다. 다른 이름을 시도하세요.
            </div>
          )}
        </div>

        {availability === true && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" strokeWidth={1.5} />
              <p className="text-xs text-amber-700">서브도메인을 변경하면 기존 URL로 접속하던 링크가 모두 깨집니다.</p>
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
              <p className="text-sm font-medium text-[#1C1917]">커스텀 도메인은 Growth 플랜 이상에서 사용 가능합니다</p>
              <p className="text-xs text-[#A8A29E] mt-0.5"><span className="font-mono">crm.myagency.com.au</span> 형식의 도메인을 사용하세요</p>
            </div>
          </div>
        ) : (
          <>
            {/* 현재 커스텀 도메인 */}
            {domain?.customDomain && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#F4F3F1] text-sm">
                <Globe size={14} className="text-[#A8A29E]" />
                <span className="text-[#57534E]">현재:</span>
                <span className="font-mono font-semibold text-[#1C1917]">{domain.customDomain}</span>
                <button
                  onClick={() => copyToClipboard(domain.customDomain, "Domain", toast)}
                  className="ml-auto p-1 rounded hover:bg-[#E8E6E2] text-[#A8A29E] hover:text-[#57534E] transition-colors"
                >
                  <Copy size={13} />
                </button>
              </div>
            )}

            {/* 도메인 등록 / 변경 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">
                {domain?.customDomain ? "커스텀 도메인 변경" : "커스텀 도메인 등록"}
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
                소유한 도메인을 입력하세요 (예: <span className="font-mono">crm.myagency.com.au</span>). 등록 후 아래에서 DNS를 설정하세요.
              </p>
            </div>

            {/* ── DNS 설정 방법 선택 ─────────────────────────────────────────── */}
            <div className="space-y-4 pt-2 border-t border-[#F4F3F1]">
              <div>
                <p className="text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-3">DNS 설정 방법 선택</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <MethodTab
                    active={dnsMethod === "cname"}
                    onClick={() => setDnsMethod("cname")}
                    icon={<Network size={16} />}
                    label="CNAME / TXT 방식"
                    description="기존 DNS 제공업체에 레코드를 추가합니다. 이메일 등 다른 서비스에 영향 없음"
                  />
                  <MethodTab
                    active={dnsMethod === "nameserver"}
                    onClick={() => setDnsMethod("nameserver")}
                    icon={<Server size={16} />}
                    label="네임서버(NS) 방식"
                    description="도메인의 네임서버 전체를 Edubee로 변경합니다. 설정이 간단하지만 기존 DNS 초기화"
                  />
                </div>
              </div>

              {/* 선택된 방법에 따른 내용 */}
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

            {/* 도메인 등록됐지만 DNS 없는 경우 */}
            {domain?.customDomain && !cname && !txt && dnsMethod === "cname" && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-[#F4F3F1] text-sm text-[#57534E]">
                <Info size={14} className="mt-0.5 shrink-0" />
                <p>DNS 레코드가 준비 중입니다. 잠시 후 페이지를 새로고침하세요.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
