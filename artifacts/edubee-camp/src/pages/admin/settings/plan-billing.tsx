import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { formatDate } from "@/lib/date-format";
import { Loader2, CheckCircle2, Star, Users, GraduationCap, Clock } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function daysLeft(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  trial:     { bg: "#FFFBEB", color: "#92400E", label: "Trial"     },
  active:    { bg: "#F0FDF4", color: "#15803D", label: "Active"    },
  suspended: { bg: "#FFF1F2", color: "#9F1239", label: "Suspended" },
  cancelled: { bg: "#F4F3F1", color: "#57534E", label: "Cancelled" },
};

const FEATURES_LABEL: Record<string, string> = {
  camp_module:   "Camp Module",
  accounting:    "Accounting Module",
  ai_assistant:  "AI Assistant",
};

function PlanCard({
  plan, currentCode, onSelect,
}: {
  plan: any; currentCode: string; onSelect?: () => void;
}) {
  const isCurrent  = plan.code === currentCode;
  const isPopular  = plan.isPopular;
  const feats      = plan.features ?? {};

  return (
    <div
      className="relative rounded-xl border-2 p-6 flex flex-col gap-4 transition-all"
      style={{
        borderColor: isCurrent ? "var(--e-orange)" : "#E8E6E2",
        background:  isCurrent ? "var(--e-orange-lt)" : "white",
        boxShadow:   "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-(--e-orange) text-white">
            <Star size={10} fill="white" /> Most Popular
          </span>
        </div>
      )}

      <div>
        <h3 className="text-base font-bold text-[#1C1917]">{plan.name}</h3>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl font-bold text-[#1C1917]">${Number(plan.priceMonthly).toFixed(0)}</span>
          <span className="text-sm text-[#A8A29E]">/mo</span>
        </div>
        <p className="text-xs text-[#A8A29E] mt-0.5">${Number(plan.priceAnnually).toFixed(0)}/yr (save ~17%)</p>
      </div>

      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-1.5 text-sm text-[#57534E]">
          <Users size={13} className="text-[#A8A29E]" />
          Up to {plan.maxUsers >= 999 ? "Unlimited" : plan.maxUsers} users
        </div>
        <div className="flex items-center gap-1.5 text-sm text-[#57534E]">
          <GraduationCap size={13} className="text-[#A8A29E]" />
          Up to {plan.maxStudents >= 9999 ? "Unlimited" : plan.maxStudents?.toLocaleString()} students
        </div>
        {Object.entries(feats).map(([key, enabled]) => (
          <div key={key} className={`flex items-center gap-1.5 text-sm ${enabled ? "text-[#57534E]" : "text-[#D4D0CB]"}`}>
            <CheckCircle2 size={13} className={enabled ? "text-(--e-orange)" : "text-[#D4D0CB]"} />
            {FEATURES_LABEL[key] ?? key}
          </div>
        ))}
      </div>

      {isCurrent ? (
        <div className="h-10 rounded-lg border-2 border-(--e-orange) text-sm font-semibold text-(--e-orange) flex items-center justify-center">
          Current Plan
        </div>
      ) : (
        <button
          onClick={onSelect}
          className="h-10 rounded-lg border-2 border-[#E8E6E2] text-sm font-semibold text-[#57534E] hover:border-(--e-orange) hover:text-(--e-orange) transition-colors"
        >
          Upgrade
        </button>
      )}
    </div>
  );
}

export default function PlanBilling() {
  const { data: plan,  isLoading: loadingPlan  } = useQuery<any>({
    queryKey: ["settings-plan"],
    queryFn: () => axios.get(`${BASE}/api/settings/plan`).then(r => r.data),
  });

  const { data: plans = [], isLoading: loadingPlans } = useQuery<any[]>({
    queryKey: ["settings-plans-available"],
    queryFn: () => axios.get(`${BASE}/api/settings/plans/available`).then(r => r.data),
  });

  const planStatus = plan?.planStatus ?? "trial";
  const statusInfo = STATUS_STYLE[planStatus] ?? STATUS_STYLE.trial;
  const days       = daysLeft(plan?.trialEndsAt ?? null);

  if (loadingPlan) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="animate-spin text-(--e-orange)" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 px-4">
      <div>
        <h1 className="text-lg font-semibold text-[#1C1917]">Plan & Billing</h1>
        <p className="text-sm text-[#57534E] mt-0.5">View your current plan and compare available options</p>
      </div>

      {/* Current Plan Summary */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#A8A29E] uppercase tracking-wide">Current Plan</p>
            <p className="text-xl font-bold text-[#1C1917] capitalize">{plan?.planType ?? "—"}</p>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: statusInfo.bg, color: statusInfo.color }}
            >
              {statusInfo.label}
            </span>
          </div>
          {planStatus === "trial" && days !== null && (
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end text-amber-700">
                <Clock size={16} strokeWidth={1.5} />
                <span className="text-sm font-semibold">{days} days left in trial</span>
              </div>
              <p className="text-xs text-[#A8A29E] mt-1">Trial ends {plan?.trialEndsAt ? formatDate(plan.trialEndsAt) : "—"}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6 mt-6 pt-4 border-t border-[#E8E6E2]">
          <div>
            <p className="text-xs text-[#A8A29E] uppercase tracking-wide mb-1">Team Members</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#1C1917]">{plan?.currentUsers ?? 0}</span>
              <span className="text-sm text-[#A8A29E]">/ {plan?.maxUsers ?? 5}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#E8E6E2] mt-2">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, ((plan?.currentUsers ?? 0) / (plan?.maxUsers ?? 5)) * 100)}%`,
                  background: "var(--e-orange)",
                }}
              />
            </div>
          </div>
          <div>
            <p className="text-xs text-[#A8A29E] uppercase tracking-wide mb-1">Student Limit</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#1C1917]">—</span>
              <span className="text-sm text-[#A8A29E]">/ {(plan?.maxStudents ?? 100).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Comparison */}
      <div>
        <h2 className="text-sm font-semibold text-[#1C1917] mb-4">Compare Plans</h2>
        {loadingPlans ? (
          <div className="flex items-center justify-center h-24"><Loader2 size={20} className="animate-spin text-(--e-orange)" /></div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {plans.map((p: any) => (
              <PlanCard
                key={p.id}
                plan={p}
                currentCode={plan?.planType ?? "starter"}
                onSelect={() => alert("Upgrade flow coming soon. Contact admin to change plan.")}
              />
            ))}
          </div>
        )}
      </div>

      {/* Payment Info */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide mb-3">Payment Information</h2>
        <div className="p-4 rounded-lg bg-[#F4F3F1] text-sm text-[#57534E]">
          Payment system integration is in preparation. To change your plan or manage billing, please contact your Edubee account manager.
        </div>
      </div>
    </div>
  );
}
