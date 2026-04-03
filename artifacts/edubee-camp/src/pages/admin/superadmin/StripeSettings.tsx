import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import {
  Check, X, Copy, Loader2, RefreshCw, ShieldCheck,
  AlertTriangle, ExternalLink, Zap, CreditCard,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanPriceRow {
  id:                  string;
  code:                string;
  name:                string;
  priceMonthly:        string | null;
  priceAnnually:       string | null;
  stripePriceMonthly:  string | null;
  stripePriceAnnually: string | null;
  isActive:            boolean;
}

interface StripeSettingsData {
  plans:     PlanPriceRow[];
  keyStatus: { secretKey: boolean; webhookSecret: boolean };
  webhookUrl: string;
}

interface TestResult {
  success:     boolean;
  accountId?:  string;
  displayName?: string | null;
  country?:    string | null;
  email?:      string | null;
  error?:      string;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const card  = "bg-white border border-[#E8E6E2] rounded-xl overflow-hidden";
const inp   = [
  "w-full h-9 px-3 border border-[#E8E6E2] rounded-lg text-sm font-mono text-[#1C1917]",
  "bg-white placeholder-[#A8A29E]",
  "focus:outline-none focus:border-[#F5821F] focus:shadow-[0_0_0_3px_rgba(245,130,31,0.15)]",
  "transition",
].join(" ");

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-[#E8E6E2] hover:border-[#F5821F] hover:text-[#F5821F] transition-colors text-[#57534E]"
    >
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Key Status Badge ─────────────────────────────────────────────────────────
function KeyBadge({ set, label }: { set: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#E8E6E2] last:border-0">
      <span className="text-sm text-[#57534E]">{label}</span>
      <span className={[
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        set
          ? "bg-green-50 text-green-700"
          : "bg-red-50 text-red-600",
      ].join(" ")}>
        {set ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
        {set ? "Set" : "Not set"}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StripeSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery<StripeSettingsData>({
    queryKey: ["superadmin-stripe-settings"],
    queryFn:  () => axios.get(`${BASE}/api/superadmin/stripe-settings`).then(r => r.data),
  });

  // Local edits for price IDs
  const [edits, setEdits] = useState<Record<string, { monthly: string; annually: string }>>({});
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  const getEdit = (planId: string, plan: PlanPriceRow) => ({
    monthly:  edits[planId]?.monthly  ?? (plan.stripePriceMonthly  ?? ""),
    annually: edits[planId]?.annually ?? (plan.stripePriceAnnually ?? ""),
  });

  const setEdit = (planId: string, field: "monthly" | "annually", value: string) => {
    setEdits(prev => ({
      ...prev,
      [planId]: { ...prev[planId], [field]: value },
    }));
  };

  const save = useMutation({
    mutationFn: () => {
      if (!data) throw new Error("No data");
      const plans = data.plans.map(p => ({
        id:                  p.id,
        stripePriceMonthly:  getEdit(p.id, p).monthly,
        stripePriceAnnually: getEdit(p.id, p).annually,
      }));
      return axios.put(`${BASE}/api/superadmin/stripe-settings`, { plans }).then(r => r.data);
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Stripe Price IDs updated successfully." });
      qc.invalidateQueries({ queryKey: ["superadmin-stripe-settings"] });
      setEdits({});
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.error ?? "Save failed", variant: "destructive" });
    },
  });

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data: result } = await axios.post(`${BASE}/api/superadmin/stripe-settings/test`);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, error: err?.response?.data?.error ?? "Connection failed" });
    } finally {
      setTesting(false);
    }
  };

  const isDirty = Object.keys(edits).length > 0;

  // ─── States ────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-[#A8A29E]">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
    </div>
  );

  if (error || !data) return (
    <div className="p-8 text-red-500">Failed to load Stripe settings.</div>
  );

  const { plans, keyStatus, webhookUrl } = data;
  const allKeysSet = keyStatus.secretKey && keyStatus.webhookSecret;

  // Paid plans only (Enterprise = custom, skip)
  const paidPlans = plans.filter(p => p.code !== "enterprise");

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Stripe Settings</h1>
          <p className="text-sm text-[#57534E] mt-1">
            Configure Stripe API keys and Price IDs for each billing plan.
          </p>
        </div>
        <a
          href="https://dashboard.stripe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-[#57534E] border border-[#E8E6E2] rounded-lg hover:border-[#F5821F] hover:text-[#F5821F] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Stripe Dashboard
        </a>
      </div>

      {/* ─── Status Banner ───────────────────────────────────────────────── */}
      {!allKeysSet && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Stripe is not fully configured</p>
            <p className="mt-0.5 text-amber-700">
              Add <code className="font-mono bg-amber-100 px-1 rounded">STRIPE_SECRET_KEY</code> and{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">STRIPE_WEBHOOK_SECRET</code> in{" "}
              <strong>Replit Secrets</strong> to enable payments.
            </p>
          </div>
        </div>
      )}

      {/* ─── Section 1: API Keys ─────────────────────────────────────────── */}
      <div className={card}>
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[#E8E6E2]">
          <ShieldCheck className="w-4.5 h-4.5 text-[#F5821F]" />
          <h2 className="font-semibold text-[#1C1917]">API Keys</h2>
          <span className="ml-auto text-xs text-[#A8A29E]">Managed via Replit Secrets</span>
        </div>
        <div className="px-6 py-2">
          <KeyBadge set={keyStatus.secretKey}     label="STRIPE_SECRET_KEY" />
          <KeyBadge set={keyStatus.webhookSecret} label="STRIPE_WEBHOOK_SECRET" />
        </div>

        {/* Test Connection */}
        <div className="px-6 pb-5 pt-3 border-t border-[#E8E6E2]">
          <div className="flex items-center gap-3">
            <button
              onClick={testConnection}
              disabled={testing || !keyStatus.secretKey}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1C1917] text-white text-sm font-medium rounded-lg hover:bg-[#2C2927] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {testing
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Zap className="w-3.5 h-3.5" />}
              {testing ? "Testing…" : "Test Connection"}
            </button>
            {!keyStatus.secretKey && (
              <p className="text-xs text-[#A8A29E]">Set STRIPE_SECRET_KEY first</p>
            )}
          </div>

          {testResult && (
            <div className={[
              "mt-3 p-3 rounded-lg text-sm",
              testResult.success
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-700",
            ].join(" ")}>
              {testResult.success ? (
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 text-green-600" />
                  <div>
                    <p className="font-semibold">Connected ✓</p>
                    {testResult.displayName && <p>Account: {testResult.displayName}</p>}
                    {testResult.email      && <p>Email: {testResult.email}</p>}
                    {testResult.country    && <p>Country: {testResult.country?.toUpperCase()}</p>}
                    <p className="text-xs text-green-600 mt-0.5">{testResult.accountId}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <X className="w-4 h-4 mt-0.5 text-red-600" />
                  <p>{testResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Section 2: Webhook URL ──────────────────────────────────────── */}
      <div className={card}>
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[#E8E6E2]">
          <RefreshCw className="w-4 h-4 text-[#F5821F]" />
          <h2 className="font-semibold text-[#1C1917]">Webhook Endpoint</h2>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-[#57534E]">
            Register this URL in your{" "}
            <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer"
               className="text-[#F5821F] hover:underline">Stripe Webhook settings</a>{" "}
            to receive billing events.
          </p>
          <div className="flex items-center gap-2 p-3 bg-[#FAFAF9] border border-[#E8E6E2] rounded-lg">
            <code className="flex-1 text-sm font-mono text-[#1C1917] break-all">{webhookUrl || "Configure APP_URL first"}</code>
            {webhookUrl && <CopyBtn text={webhookUrl} />}
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-[#57534E] mb-2">Required webhook events:</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "checkout.session.completed",
                "customer.subscription.updated",
                "customer.subscription.deleted",
                "invoice.payment_succeeded",
                "invoice.payment_failed",
              ].map(e => (
                <span key={e} className="px-2 py-0.5 bg-[#F4F3F1] border border-[#E8E6E2] rounded text-xs font-mono text-[#57534E]">
                  {e}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Section 3: Price IDs ────────────────────────────────────────── */}
      <div className={card}>
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[#E8E6E2]">
          <CreditCard className="w-4 h-4 text-[#F5821F]" />
          <h2 className="font-semibold text-[#1C1917]">Plan Price IDs</h2>
          <span className="ml-auto text-xs text-[#A8A29E]">
            Find these in Stripe → Products → Pricing
          </span>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[180px_1fr_1fr] gap-4 px-6 py-3 border-b border-[#E8E6E2] bg-[#FAFAF9]">
          <span className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Plan</span>
          <span className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Monthly Price ID</span>
          <span className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Annual Price ID</span>
        </div>

        {/* Plan rows */}
        <div className="divide-y divide-[#E8E6E2]">
          {paidPlans.map(plan => {
            const e = getEdit(plan.id, plan);
            const changed = e.monthly !== (plan.stripePriceMonthly ?? "") ||
                            e.annually !== (plan.stripePriceAnnually ?? "");
            return (
              <div key={plan.id} className={[
                "grid grid-cols-[180px_1fr_1fr] gap-4 px-6 py-4 items-center",
                changed ? "bg-[#FEF0E3]/30" : "",
              ].join(" ")}>
                {/* Plan name */}
                <div>
                  <p className="text-sm font-semibold text-[#1C1917] capitalize">{plan.name}</p>
                  <p className="text-xs text-[#A8A29E] mt-0.5">
                    ${Number(plan.priceMonthly ?? 0).toFixed(0)}/mo · ${Number(plan.priceAnnually ?? 0).toFixed(0)}/yr
                  </p>
                </div>

                {/* Monthly Price ID */}
                <div className="relative">
                  <input
                    className={inp}
                    value={e.monthly}
                    onChange={ev => setEdit(plan.id, "monthly", ev.target.value)}
                    placeholder="price_xxxxxxxxxxxxxxxx"
                  />
                  {e.monthly && e.monthly.startsWith("price_") && (
                    <Check className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-green-500" />
                  )}
                </div>

                {/* Annual Price ID */}
                <div className="relative">
                  <input
                    className={inp}
                    value={e.annually}
                    onChange={ev => setEdit(plan.id, "annually", ev.target.value)}
                    placeholder="price_xxxxxxxxxxxxxxxx"
                  />
                  {e.annually && e.annually.startsWith("price_") && (
                    <Check className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-green-500" />
                  )}
                </div>
              </div>
            );
          })}

          {/* Enterprise row — informational */}
          <div className="grid grid-cols-[180px_1fr_1fr] gap-4 px-6 py-4 items-center bg-[#FAFAF9]">
            <div>
              <p className="text-sm font-semibold text-[#1C1917]">Enterprise</p>
              <p className="text-xs text-[#A8A29E] mt-0.5">Custom pricing</p>
            </div>
            <div className="col-span-2 text-xs text-[#A8A29E] italic">
              Enterprise plans are handled offline — no Stripe checkout required.
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="px-6 py-4 border-t border-[#E8E6E2] flex items-center justify-between bg-[#FAFAF9]">
          <p className="text-xs text-[#A8A29E]">
            Price IDs are stored securely in the database.
          </p>
          <button
            onClick={() => save.mutate()}
            disabled={!isDirty || save.isPending}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#F5821F] text-white text-sm font-semibold rounded-lg hover:bg-[#D96A0A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save Price IDs
          </button>
        </div>
      </div>

      {/* ─── Section 4: How to get Price IDs ────────────────────────────── */}
      <div className="p-5 bg-[#FAFAF9] border border-[#E8E6E2] rounded-xl">
        <p className="text-sm font-semibold text-[#1C1917] mb-3">How to get Stripe Price IDs</p>
        <ol className="space-y-1.5 text-sm text-[#57534E] list-decimal list-inside">
          <li>Go to <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="text-[#F5821F] hover:underline">Stripe Dashboard → Products</a></li>
          <li>Create a product for each plan (Solo, Starter, Growth)</li>
          <li>Add two prices per product: one Monthly, one Annual</li>
          <li>Copy the <code className="font-mono bg-[#F4F3F1] px-1 rounded">price_xxx</code> ID for each and paste above</li>
          <li>Click <strong>Save Price IDs</strong></li>
        </ol>
      </div>

    </div>
  );
}
