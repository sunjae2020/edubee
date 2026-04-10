import { useTenantThemeCtx } from "@/hooks/use-tenant-theme";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useState } from "react";
import axios from "axios";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SuspendedPage() {
  const theme = useTenantThemeCtx();
  const [loading, setLoading] = useState(false);

  async function handleReactivate() {
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
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E8E6E2] shadow-sm p-10 w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} className="text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-[#1C1917] mb-2">Account Suspended</h1>
        <p className="text-[#78716C] mb-2">
          <strong>{theme.companyName}</strong>'s subscription has expired or a payment issue occurred.
        </p>
        <p className="text-sm text-[#A8A29E] mb-8">
          Reactivate your plan to restore full access to all features and data.
        </p>
        <button
          onClick={handleReactivate}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-[#F5821F] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#E06E10] transition-colors disabled:opacity-50"
        >
          {loading ? "Redirecting…" : <><span>Reactivate Plan</span><ArrowRight size={16} /></>}
        </button>
        <p className="mt-6 text-xs text-[#A8A29E]">
          Need help?{" "}
          <a href="mailto:support@edubee.co" className="text-[#F5821F] hover:underline">Contact support</a>
        </p>
      </div>
    </div>
  );
}
