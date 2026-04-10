import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "@/hooks/use-auth";
import {
  Mail, HardDrive, Globe, CheckCircle2, XCircle,
  ExternalLink, Copy, Check, RefreshCw, Loader2,
  Cable, ImageIcon, CreditCard, FlaskConical,
  Settings2, ChevronDown, ChevronUp,
} from "lucide-react";
import { useState } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Design tokens ─────────────────────────────────────────────────────────────
const cardCls = "bg-white border border-[#E8E6E2] rounded-xl overflow-hidden";

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ connected }: { connected?: boolean }) {
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

// ── Copy button ────────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-[#E8E6E2] hover:border-(--e-orange) hover:text-(--e-orange) transition-colors text-[#A8A29E]"
    >
      {copied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Field row ──────────────────────────────────────────────────────────────────
function Field({ label, value, masked }: { label: string; value: string; masked?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-[#A8A29E] uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs text-[#1C1917] bg-[#F4F3F1] px-2.5 py-1.5 rounded-lg font-mono truncate">
          {value || <span className="text-[#D4D0CB] italic">—</span>}
        </code>
        {value && !masked && <CopyBtn text={value} />}
      </div>
    </div>
  );
}

// ── Env var hint tag ───────────────────────────────────────────────────────────
function EnvTag({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F4F3F1] text-[#57534E] text-xs font-mono border border-[#E8E6E2]">
      {name}
      <CopyBtn text={name} />
    </span>
  );
}

// ── Test result inline banner ──────────────────────────────────────────────────
type TestState = { status: "idle" | "loading" | "success" | "error"; message?: string; detail?: string };

function TestResult({ state }: { state: TestState }) {
  if (state.status === "idle") return null;
  if (state.status === "loading") return (
    <div className="flex items-center gap-2 text-xs text-[#57534E] bg-[#F4F3F1] px-3 py-2 rounded-lg">
      <Loader2 size={12} className="animate-spin" /> Running test…
    </div>
  );
  if (state.status === "success") return (
    <div className="flex items-start gap-2 text-xs text-green-800 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
      <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
      <div><strong>Test passed</strong>{state.message ? ` — ${state.message}` : ""}</div>
    </div>
  );
  return (
    <div className="flex items-start gap-2 text-xs text-red-800 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
      <XCircle size={13} className="mt-0.5 shrink-0" />
      <div><strong>Test failed</strong>{state.message ? `: ${state.message}` : ""}</div>
    </div>
  );
}

// ── Integration card ──────────────────────────────────────────────────────────
interface IntegrationCardProps {
  icon: any;
  iconBg: string;
  iconColor: string;
  name: string;
  description: string;
  connected?: boolean;
  extraBadges?: React.ReactNode;
  docsUrl?: string;
  docsLabel?: string;
  // field rows in the info panel
  fields?: React.ReactNode;
  // env vars needed (shown in Configure panel)
  envVars: string[];
  // test endpoint path e.g. "/api/superadmin/integrations/test/resend"
  testEndpoint?: string;
  testSuccessMsg?: (data: any) => string;
  // extra footer link
  footerLink?: { href: string; label: string };
  // optional warning
  warning?: string;
}

function IntegrationCard({
  icon: Icon, iconBg, iconColor, name, description,
  connected, extraBadges, docsUrl, docsLabel = "Dashboard",
  fields, envVars, testEndpoint, testSuccessMsg, footerLink, warning,
}: IntegrationCardProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const [testState, setTestState] = useState<TestState>({ status: "idle" });

  const runTest = async () => {
    if (!testEndpoint) return;
    setTestState({ status: "loading" });
    try {
      const { data } = await axios.post(`${BASE}${testEndpoint}`);
      const msg = testSuccessMsg ? testSuccessMsg(data) : undefined;
      setTestState({ status: "success", message: msg });
    } catch (err: any) {
      const errMsg = err?.response?.data?.error ?? err?.message ?? "Unknown error";
      setTestState({ status: "error", message: errMsg });
    }
    // auto-clear after 8 s
    setTimeout(() => setTestState({ status: "idle" }), 8000);
  };

  return (
    <div className={cardCls}>
      {/* ── Header ── */}
      <div className="p-5 border-b border-[#E8E6E2]">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon size={18} className={iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-[#1C1917]">{name}</h3>
              <StatusBadge connected={connected} />
              {extraBadges}
            </div>
            <p className="text-xs text-[#A8A29E] mt-0.5">{description}</p>
          </div>
          {docsUrl && (
            <a href={docsUrl} target="_blank" rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1 text-xs text-[#A8A29E] hover:text-(--e-orange) transition-colors"
            >
              <ExternalLink size={12} /> {docsLabel}
            </a>
          )}
        </div>
      </div>

      {/* ── Info fields ── */}
      {fields && (
        <div className="p-5 space-y-3 bg-[#FAFAF9] border-b border-[#E8E6E2]">
          {fields}
          {warning && !connected && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {warning}
            </div>
          )}
          {footerLink && (
            <div className="pt-1">
              <a href={footerLink.href}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-(--e-orange) hover:underline"
              >
                <CreditCard size={12} /> {footerLink.label}
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── Action bar ── */}
      <div className="px-5 py-3 flex items-center gap-2 flex-wrap bg-white">
        {/* Configure toggle */}
        <button
          onClick={() => setConfigOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#E8E6E2] hover:border-(--e-orange) hover:text-(--e-orange) transition-colors text-[#57534E]"
        >
          <Settings2 size={12} />
          Configure
          {configOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>

        {/* Test button — only shown when connected */}
        {connected && testEndpoint && (
          <button
            onClick={runTest}
            disabled={testState.status === "loading"}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#E8E6E2] hover:border-indigo-400 hover:text-indigo-600 transition-colors text-[#57534E] disabled:opacity-50"
          >
            {testState.status === "loading"
              ? <Loader2 size={12} className="animate-spin" />
              : <FlaskConical size={12} />}
            {name === "Resend" ? "Send test email" : "Run connection test"}
          </button>
        )}

        {/* Test result inline */}
        {testState.status !== "idle" && (
          <div className="flex-1 min-w-0">
            <TestResult state={testState} />
          </div>
        )}
      </div>

      {/* ── Configure panel ── */}
      {configOpen && (
        <div className="px-5 py-4 border-t border-[#E8E6E2] bg-[#FAFAF9] space-y-3">
          <p className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Required Environment Variables</p>
          <p className="text-xs text-[#A8A29E]">
            Set these in your Replit Secrets (or <code className="font-mono">.env</code>) to configure this integration.
          </p>
          <div className="flex flex-wrap gap-2">
            {envVars.map(v => <EnvTag key={v} name={v} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Coming Soon card ──────────────────────────────────────────────────────────
function ComingSoonCard({ icon: Icon, name, description }: { icon: any; name: string; description: string }) {
  return (
    <div className={`${cardCls} p-5 opacity-60`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F4F3F1] flex items-center justify-center shrink-0">
          <Icon size={18} className="text-[#A8A29E]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[#1C1917]">{name}</h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E8E6E2] text-[#A8A29E] tracking-wide uppercase">
              Coming Soon
            </span>
          </div>
          <p className="text-xs text-[#A8A29E] mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Integrations() {
  const { user } = useAuth();
  const { data, isLoading, refetch, isFetching } = useQuery<any>({
    queryKey: ["superadmin-integrations"],
    queryFn: () => axios.get(`${BASE}/api/superadmin/integrations/status`).then(r => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-(--e-orange)" />
    </div>
  );

  const { resend, stripe, storage, cloudinary } = data ?? {};

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#1C1917]">Integrations</h1>
          <p className="text-sm text-[#A8A29E] mt-0.5">
            Platform-level external service connections. These settings apply to all tenants.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#E8E6E2] hover:border-(--e-orange) hover:text-(--e-orange) transition-colors text-[#57534E] disabled:opacity-50"
        >
          <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Configured services ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-[#A8A29E] uppercase tracking-widest">Platform Services</h2>

        {/* Resend */}
        <IntegrationCard
          icon={Mail}
          iconBg="bg-[#FFF7ED]"
          iconColor="text-(--e-orange)"
          name="Resend"
          description="Transactional email — invitations, notifications, password resets"
          connected={resend?.connected}
          docsUrl={resend?.docsUrl}
          envVars={["RESEND_API_KEY", "FROM_EMAIL"]}
          testEndpoint="/api/superadmin/integrations/test/resend"
          testSuccessMsg={(d) => `Test email sent to ${d.to}`}
          fields={
            <>
              <Field label="API Key" value={resend?.apiKeyMasked ?? ""} masked />
              <Field label="From Email" value={resend?.fromEmail ?? ""} />
            </>
          }
          warning={`Set RESEND_API_KEY and FROM_EMAIL to enable email sending.`}
        />

        {/* Stripe */}
        <IntegrationCard
          icon={CreditCard}
          iconBg="bg-[#F0FDF4]"
          iconColor="text-green-600"
          name="Stripe"
          description="Payment processing — subscription billing, plan upgrades"
          connected={stripe?.connected}
          docsUrl={stripe?.docsUrl}
          docsLabel="Dashboard"
          extraBadges={stripe?.webhookConfigured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <CheckCircle2 size={11} /> Webhook active
            </span>
          )}
          envVars={["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PUBLISHABLE_KEY"]}
          testEndpoint="/api/superadmin/integrations/test/stripe"
          testSuccessMsg={(d) => `Account ${d.accountId}${d.email ? ` (${d.email})` : ""} verified`}
          fields={
            <>
              <Field label="Secret Key" value={stripe?.secretKeyMasked ?? ""} masked />
              <Field label="Webhook Endpoint" value={stripe?.webhookUrl ?? ""} />
            </>
          }
          footerLink={{ href: "/admin/superadmin/stripe-settings", label: "Manage Stripe plan pricing →" }}
          warning="Set STRIPE_SECRET_KEY and configure the webhook in the Stripe dashboard."
        />

        {/* Cloud Storage */}
        <IntegrationCard
          icon={HardDrive}
          iconBg="bg-[#F0F9FF]"
          iconColor="text-blue-600"
          name="Cloud Storage"
          description="File & document storage — AWS S3 or Cloudflare R2"
          connected={storage?.connected}
          docsUrl={storage?.docsUrl}
          docsLabel="Docs"
          envVars={["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "S3_BUCKET"]}
          testEndpoint="/api/superadmin/integrations/test/storage"
          testSuccessMsg={(d) => `Bucket "${d.bucket}" (${d.region}) is accessible`}
          fields={
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bucket" value={storage?.bucket ?? ""} />
                <Field label="Region" value={storage?.region ?? ""} />
              </div>
              <Field label="Access Key" value={storage?.keyMasked ?? ""} masked />
            </div>
          }
          warning="Set AWS_ACCESS_KEY_ID (or R2_ACCESS_KEY_ID), AWS_REGION, and S3_BUCKET to enable file uploads."
        />

        {/* Cloudinary */}
        <IntegrationCard
          icon={ImageIcon}
          iconBg="bg-[#F0F4FF]"
          iconColor="text-indigo-500"
          name="Cloudinary"
          description="Image & media CDN — logo uploads, profile photos, document thumbnails"
          connected={cloudinary?.connected}
          docsUrl={cloudinary?.docsUrl}
          docsLabel="Console"
          extraBadges={cloudinary?.hasSecret && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <CheckCircle2 size={11} /> Secret set
            </span>
          )}
          envVars={["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]}
          testEndpoint="/api/superadmin/integrations/test/cloudinary"
          testSuccessMsg={(d) => `Cloud "${d.cloudName}" responded with status: ${d.status}`}
          fields={
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cloud Name" value={cloudinary?.cloudName ?? ""} />
                <Field label="API Key" value={cloudinary?.apiKeyMasked ?? ""} masked />
              </div>
              {cloudinary?.uploadPreset && (
                <Field label="Upload Base URL" value={cloudinary.uploadPreset} />
              )}
            </>
          }
          warning="Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to enable media uploads."
        />
      </section>

      {/* ── Coming Soon ─────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-[#A8A29E] uppercase tracking-widest">Coming Soon</h2>
        <div className="grid grid-cols-2 gap-4">
          <ComingSoonCard
            icon={Globe}
            name="Cloudflare"
            description="Wildcard SSL & custom domain proxy for all tenant subdomains"
          />
          <ComingSoonCard
            icon={Cable}
            name="Twilio SMS"
            description="Send SMS notifications and alerts to students and staff"
          />
          <ComingSoonCard
            icon={Mail}
            name="SendGrid"
            description="Alternative email provider for high-volume sending"
          />
          <ComingSoonCard
            icon={HardDrive}
            name="Google Drive"
            description="Store and share documents directly in Google Drive"
          />
        </div>
      </section>
    </div>
  );
}
