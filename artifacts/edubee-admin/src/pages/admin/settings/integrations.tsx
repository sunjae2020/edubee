import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Zap, MessageSquare, Chrome, Building2,
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Loader2, Save, Cable,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Design tokens ─────────────────────────────────────────────────────────────
const card = "bg-white border border-[#E8E6E2] rounded-xl overflow-hidden";
const inp  = [
  "w-full h-9 px-3 border border-[#E8E6E2] rounded-lg text-sm text-[#1C1917]",
  "bg-white placeholder-[#D4D0CB]",
  "focus:outline-none focus:border-(--e-orange) focus:shadow-[0_0_0_3px_var(--e-orange-ring)]",
  "transition",
].join(" ");
const label = "text-[11px] font-medium text-[#57534E] uppercase tracking-wide";

function StatusBadge({ connected, comingSoon }: { connected?: boolean; comingSoon?: boolean }) {
  if (comingSoon) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F3F1] text-[#A8A29E] border border-[#E8E6E2] uppercase tracking-wide">
      Coming Soon
    </span>
  );
  return connected ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
      <CheckCircle2 size={11} /> Connected
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F4F3F1] text-[#A8A29E] border border-[#E8E6E2]">
      <XCircle size={11} /> Not configured
    </span>
  );
}

// ── Accordion card wrapper ─────────────────────────────────────────────────────
function IntegrationCard({
  icon: Icon, iconBg, iconColor, name, description,
  badge, children, defaultOpen = false,
}: {
  icon: any; iconBg: string; iconColor: string;
  name: string; description: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={card}>
      <button
        className="w-full p-5 flex items-center gap-3 text-left"
        onClick={() => children && setOpen(o => !o)}
      >
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon size={18} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[#1C1917]">{name}</h3>
            {badge}
          </div>
          <p className="text-xs text-[#A8A29E] mt-0.5">{description}</p>
        </div>
        {children && (
          open
            ? <ChevronUp size={16} className="text-[#A8A29E] shrink-0" />
            : <ChevronDown size={16} className="text-[#A8A29E] shrink-0" />
        )}
      </button>
      {open && children && (
        <div className="border-t border-[#E8E6E2] p-5 bg-[#FAFAF9]">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TenantIntegrations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["tenant-integrations"],
    queryFn: () => axios.get(`${BASE}/api/tenant-integrations`).then(r => r.data),
  });

  // SMTP form state
  const [smtp, setSmtp] = useState<Record<string, any> | null>(null);
  const smtpVal = (k: string) => smtp?.[k] ?? data?.smtp?.[k] ?? "";
  const setSmtpField = (k: string, v: any) => setSmtp(s => ({ ...(s ?? data?.smtp ?? {}), [k]: v }));

  // Zapier form state
  const [zapierUrl, setZapierUrl] = useState("");

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      axios.put(`${BASE}/api/tenant-integrations`, payload).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Integration settings saved" });
      qc.invalidateQueries({ queryKey: ["tenant-integrations"] });
      setSmtp(null);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.response?.data?.error ?? "Save failed", variant: "destructive" });
    },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-(--e-orange)" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-[#1C1917]">Integrations</h1>
        <p className="text-sm text-[#A8A29E] mt-0.5">
          Connect external services to extend your CRM's capabilities.
        </p>
      </div>

      {/* ── Email ──────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-[#A8A29E] uppercase tracking-widest">Email</h2>

        <IntegrationCard
          icon={Mail}
          iconBg="bg-[#FFF7ED]"
          iconColor="text-(--e-orange)"
          name="Custom SMTP"
          description="Send emails from your own email server instead of the platform default"
          badge={<StatusBadge connected={data?.smtp?.enabled} />}
          defaultOpen={false}
        >
          <div className="space-y-4">
            {/* Enable toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setSmtpField("enabled", !smtpVal("enabled"))}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${smtpVal("enabled") ? "bg-(--e-orange)" : "bg-[#D4D0CB]"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${smtpVal("enabled") ? "translate-x-5" : ""}`} />
              </div>
              <span className="text-sm text-[#1C1917]">Use custom SMTP</span>
            </label>

            {smtpVal("enabled") && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className={label}>SMTP Host</label>
                    <input className={inp} value={smtpVal("host")} onChange={e => setSmtpField("host", e.target.value)} placeholder="smtp.example.com" />
                  </div>
                  <div>
                    <label className={label}>Port</label>
                    <input className={inp} type="number" value={smtpVal("port")} onChange={e => setSmtpField("port", Number(e.target.value))} placeholder="587" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>SMTP Username</label>
                    <input className={inp} value={smtpVal("user")} onChange={e => setSmtpField("user", e.target.value)} placeholder="user@example.com" />
                  </div>
                  <div>
                    <label className={label}>SMTP Password</label>
                    <input className={inp} type="password" value={smtpVal("password") ?? ""} onChange={e => setSmtpField("password", e.target.value)} placeholder="••••••••" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>From Email</label>
                    <input className={inp} value={smtpVal("fromEmail")} onChange={e => setSmtpField("fromEmail", e.target.value)} placeholder="noreply@yourdomain.com" />
                  </div>
                  <div>
                    <label className={label}>From Name</label>
                    <input className={inp} value={smtpVal("fromName")} onChange={e => setSmtpField("fromName", e.target.value)} placeholder="Your Company" />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => saveMutation.mutate({ smtp: smtp ?? data?.smtp })}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: "var(--e-orange)" }}
            >
              {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Email Settings
            </button>
          </div>
        </IntegrationCard>
      </section>

      {/* ── Automation ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-[#A8A29E] uppercase tracking-widest">Automation</h2>

        <IntegrationCard
          icon={Zap}
          iconBg="bg-[#FFF7ED]"
          iconColor="text-amber-600"
          name="Zapier"
          description="Connect your CRM to 5,000+ apps via Zapier webhooks"
          badge={<StatusBadge connected={data?.zapier?.enabled} />}
        >
          <div className="space-y-3">
            <div>
              <label className={label}>Zapier Webhook URL</label>
              <input
                className={inp}
                value={zapierUrl || data?.zapier?.webhookUrl || ""}
                onChange={e => setZapierUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
              />
            </div>
            <p className="text-xs text-[#A8A29E]">
              Create a Zap in Zapier using the "Webhooks by Zapier" trigger, then paste the webhook URL above.
            </p>
            <button
              onClick={() => saveMutation.mutate({ zapier: { enabled: true, webhookUrl: zapierUrl || data?.zapier?.webhookUrl } })}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: "var(--e-orange)" }}
            >
              {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Zapier Settings
            </button>
          </div>
        </IntegrationCard>
      </section>

      {/* ── Coming Soon ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-[#A8A29E] uppercase tracking-widest">Coming Soon</h2>
        <div className="space-y-3 opacity-60 pointer-events-none">
          <IntegrationCard
            icon={MessageSquare}
            iconBg="bg-[#F0FDF4]"
            iconColor="text-green-600"
            name="Slack"
            description="Get real-time notifications in your Slack workspace"
            badge={<StatusBadge comingSoon />}
          />
          <IntegrationCard
            icon={Chrome}
            iconBg="bg-[#EFF6FF]"
            iconColor="text-blue-600"
            name="Google Workspace"
            description="Sync contacts and calendar events with Google"
            badge={<StatusBadge comingSoon />}
          />
          <IntegrationCard
            icon={Building2}
            iconBg="bg-[#FFF0F6]"
            iconColor="text-pink-600"
            name="HubSpot"
            description="Sync leads and contacts with HubSpot CRM"
            badge={<StatusBadge comingSoon />}
          />
          <IntegrationCard
            icon={Cable}
            iconBg="bg-[#F5F3FF]"
            iconColor="text-purple-600"
            name="Make (Integromat)"
            description="Build advanced automation workflows with Make"
            badge={<StatusBadge comingSoon />}
          />
        </div>
      </section>
    </div>
  );
}
