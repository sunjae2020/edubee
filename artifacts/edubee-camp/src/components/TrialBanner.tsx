import { useTenantThemeCtx } from "@/hooks/use-tenant-theme";
import { Clock, ArrowRight, X } from "lucide-react";
import { useState } from "react";
import axios from "axios";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function TrialBanner() {
  const theme = useTenantThemeCtx();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (dismissed) return null;
  if (theme.planStatus !== "trial") return null;
  if (!theme.trialEndsAt) return null;

  const trialEnd = new Date(theme.trialEndsAt);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const isUrgent = daysLeft <= 3;

  async function handleUpgrade() {
    setLoading(true);
    try {
      const { data } = await axios.post(`${BASE}/api/settings/plan/checkout`, {
        planCode:  "starter",
        interval:  "monthly",
        returnUrl: window.location.href,
      });
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Checkout failed", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm ${
      isUrgent
        ? "bg-red-500 text-white"
        : "bg-[#FEF0E3] text-[#78716C] border-b border-[#F5821F]/20"
    }`}>
      <Clock size={14} className={isUrgent ? "text-white" : "text-[#F5821F]"} />
      <span className="flex-1">
        {isUrgent
          ? <><strong>Hurry!</strong> Your free trial ends in <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong>. Upgrade to keep access.</>
          : <>Your free trial ends in <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong>. Upgrade to continue after the trial.</>
        }
      </span>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
          isUrgent
            ? "bg-white text-red-500 hover:bg-red-50"
            : "bg-[#F5821F] text-white hover:bg-[#E06E10]"
        }`}
      >
        Upgrade now <ArrowRight size={11} />
      </button>
      <button
        onClick={() => setDismissed(true)}
        className={`ml-1 opacity-60 hover:opacity-100 transition-opacity ${isUrgent ? "text-white" : "text-[#A8A29E]"}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}
