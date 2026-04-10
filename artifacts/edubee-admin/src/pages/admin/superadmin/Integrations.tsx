import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Mail, CreditCard, HardDrive, Globe, CheckCircle2, XCircle,
  ExternalLink, Copy, Check, RefreshCw, Loader2, Cable, ImageIcon,
} from "lucide-react";
import { useState } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Design tokens ─────────────────────────────────────────────────────────────
const card = "bg-white border border-[#E8E6E2] rounded-xl overflow-hidden";

function StatusBadge({ connected }: { connected: boolean }) {
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

// ── Coming Soon card ──────────────────────────────────────────────────────────
function ComingSoonCard({ icon: Icon, name, description }: { icon: any; name: string; description: string }) {
  return (
    <div className={`${card} p-5 opacity-60`}>
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

      {/* ── Active Integrations ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-[#A8A29E] uppercase tracking-widest">Active Integrations</h2>

        {/* Resend */}
        <div className={card}>
          <div className="p-5 border-b border-[#E8E6E2]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] flex items-center justify-center shrink-0">
                <Mail size={18} className="text-(--e-orange)" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-[#1C1917]">Resend</h3>
                  <StatusBadge connected={resend?.connected} />
                </div>
                <p className="text-xs text-[#A8A29E] mt-0.5">Transactional email service — invitations, notifications, alerts</p>
              </div>
              <a
                href={resend?.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 text-xs text-[#A8A29E] hover:text-(--e-orange) transition-colors"
              >
                <ExternalLink size={12} /> Dashboard
              </a>
            </div>
          </div>
          <div className="p-5 space-y-3 bg-[#FAFAF9]">
            <Field label="API Key" value={resend?.apiKeyMasked ?? ""} masked />
            <Field label="From Email" value={resend?.fromEmail ?? ""} />
            {!resend?.connected && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Set <code className="font-mono">RESEND_API_KEY</code> and <code className="font-mono">FROM_EMAIL</code> environment variables to enable email sending.
              </div>
            )}
          </div>
        </div>

        {/* Stripe */}
        <div className={card}>
          <div className="p-5 border-b border-[#E8E6E2]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center shrink-0">
                <CreditCard size={18} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-[#1C1917]">Stripe</h3>
                  <StatusBadge connected={stripe?.connected} />
                  {stripe?.webhookConfigured && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      <CheckCircle2 size={11} /> Webhook active
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#A8A29E] mt-0.5">Payment processing — subscription billing, plan upgrades</p>
              </div>
              <a
                href={stripe?.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 text-xs text-[#A8A29E] hover:text-(--e-orange) transition-colors"
              >
                <ExternalLink size={12} /> Dashboard
              </a>
            </div>
          </div>
          <div className="p-5 space-y-3 bg-[#FAFAF9]">
            <Field label="Secret Key" value={stripe?.secretKeyMasked ?? ""} masked />
            <Field label="Webhook Endpoint" value={stripe?.webhookUrl ?? ""} />
            {!stripe?.connected && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Set <code className="font-mono">STRIPE_SECRET_KEY</code> environment variable. Configure the webhook in the Stripe dashboard.
              </div>
            )}
            <div className="pt-1">
              <a
                href="/admin/superadmin/stripe-settings"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-(--e-orange) hover:underline"
              >
                <CreditCard size={12} /> Manage Stripe plan pricing →
              </a>
            </div>
          </div>
        </div>

        {/* Cloud Storage */}
        <div className={card}>
          <div className="p-5 border-b border-[#E8E6E2]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0F9FF] flex items-center justify-center shrink-0">
                <HardDrive size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-[#1C1917]">Cloud Storage</h3>
                  <StatusBadge connected={storage?.connected} />
                </div>
                <p className="text-xs text-[#A8A29E] mt-0.5">File & document storage — AWS S3 or Cloudflare R2</p>
              </div>
              <a
                href={storage?.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 text-xs text-[#A8A29E] hover:text-(--e-orange) transition-colors"
              >
                <ExternalLink size={12} /> Docs
              </a>
            </div>
          </div>
          <div className="p-5 space-y-3 bg-[#FAFAF9]">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bucket" value={storage?.bucket ?? ""} />
              <Field label="Region" value={storage?.region ?? ""} />
            </div>
            <Field label="Access Key" value={storage?.keyMasked ?? ""} masked />
            {!storage?.connected && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Set <code className="font-mono">AWS_ACCESS_KEY_ID</code> (or <code className="font-mono">R2_ACCESS_KEY_ID</code>), <code className="font-mono">AWS_REGION</code>, and <code className="font-mono">S3_BUCKET</code> to enable file uploads.
              </div>
            )}
          </div>
        </div>

        {/* Cloudinary */}
        <div className={card}>
          <div className="p-5 border-b border-[#E8E6E2]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0F4FF] flex items-center justify-center shrink-0">
                <ImageIcon size={18} className="text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-[#1C1917]">Cloudinary</h3>
                  <StatusBadge connected={cloudinary?.connected} />
                  {cloudinary?.hasSecret && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <CheckCircle2 size={11} /> Secret set
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#A8A29E] mt-0.5">
                  Image & media CDN — logo uploads, profile photos, document thumbnails
                </p>
              </div>
              <a
                href={cloudinary?.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 text-xs text-[#A8A29E] hover:text-(--e-orange) transition-colors"
              >
                <ExternalLink size={12} /> Console
              </a>
            </div>
          </div>
          <div className="p-5 space-y-3 bg-[#FAFAF9]">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cloud Name" value={cloudinary?.cloudName ?? ""} />
              <Field label="API Key" value={cloudinary?.apiKeyMasked ?? ""} masked />
            </div>
            {cloudinary?.uploadPreset && (
              <Field label="Upload Base URL" value={cloudinary.uploadPreset} />
            )}
            {!cloudinary?.connected && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Set <code className="font-mono">CLOUDINARY_CLOUD_NAME</code>, <code className="font-mono">CLOUDINARY_API_KEY</code>, and <code className="font-mono">CLOUDINARY_API_SECRET</code> environment variables to enable media uploads.
              </div>
            )}
          </div>
        </div>
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
