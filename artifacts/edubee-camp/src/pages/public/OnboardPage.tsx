import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import axios from "axios";
import { CheckCircle2, XCircle, Loader2, Building2, User, Globe, ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Step = 1 | 2 | 3;

interface FormData {
  orgName: string;
  subdomain: string;
  country: string;
  phone: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
  adminPasswordConfirm: string;
  agreeTerms: boolean;
}

const COUNTRIES = [
  "Australia", "South Korea", "Japan", "Philippines", "Singapore",
  "Thailand", "United Kingdom", "United States", "New Zealand", "Canada", "Other",
];

function slugify(val: string) {
  return val.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
}

export default function OnboardPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>({
    orgName: "", subdomain: "", country: "", phone: "",
    adminFullName: "", adminEmail: "", adminPassword: "",
    adminPasswordConfirm: "", agreeTerms: false,
  });
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [subdomainMsg, setSubdomainMsg] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState<{ loginUrl: string; campUrl: string } | null>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (key: keyof FormData, val: string | boolean) =>
    setForm(f => ({ ...f, [key]: val }));

  // Auto-generate subdomain from org name
  useEffect(() => {
    if (form.orgName && !form.subdomain) {
      set("subdomain", slugify(form.orgName));
    }
  }, [form.orgName]);

  // Live subdomain check
  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const sub = form.subdomain.trim();
    if (!sub) { setSubdomainStatus("idle"); return; }
    if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(sub)) {
      setSubdomainStatus("invalid");
      setSubdomainMsg("3–32 chars, lowercase letters/numbers/hyphens only");
      return;
    }
    setSubdomainStatus("checking");
    checkTimer.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${BASE}/api/public/check-subdomain?subdomain=${sub}`);
        if (data.available) {
          setSubdomainStatus("available");
          setSubdomainMsg("Available!");
        } else {
          setSubdomainStatus("taken");
          setSubdomainMsg(data.reason ?? "Already taken");
        }
      } catch {
        setSubdomainStatus("idle");
      }
    }, 500);
  }, [form.subdomain]);

  const step1Valid = form.orgName.trim().length >= 2 && subdomainStatus === "available";
  const step2Valid =
    form.adminFullName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail) &&
    form.adminPassword.length >= 8 &&
    form.adminPassword === form.adminPasswordConfirm &&
    form.agreeTerms;

  async function handleSubmit() {
    if (!step2Valid) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const { data } = await axios.post(`${BASE}/api/public/onboard`, {
        orgName:       form.orgName.trim(),
        subdomain:     form.subdomain.trim(),
        country:       form.country,
        phone:         form.phone.trim(),
        adminFullName: form.adminFullName.trim(),
        adminEmail:    form.adminEmail.trim().toLowerCase(),
        adminPassword: form.adminPassword,
      });
      setSuccess({
        loginUrl: data.loginUrl,
        campUrl:  `https://${form.subdomain.trim()}.edubee.co/camp/`,
      });
      setStep(3);
    } catch (err: any) {
      setSubmitError(err.response?.data?.error ?? "Something went wrong, please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success && step === 3) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#E8E6E2] shadow-sm p-10 w-full max-w-lg text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-[#1C1917] mb-2">Your portal is ready! 🎉</h1>
          <p className="text-[#57534E] mb-6">
            <strong>{form.orgName}</strong> is now live on Edubee CAMP.<br />
            You have <strong>14 days free trial</strong> — no credit card required.
          </p>
          <div className="bg-[#FEF0E3] rounded-xl p-4 mb-6 text-left">
            <p className="text-xs text-[#A8A29E] uppercase tracking-wider mb-1">Your Portal URL</p>
            <p className="text-[#F5821F] font-bold text-lg">{success.campUrl}</p>
          </div>
          <p className="text-sm text-[#A8A29E] mb-6">A welcome email with login details has been sent to <strong>{form.adminEmail}</strong></p>
          <a
            href={success.loginUrl}
            className="inline-flex items-center gap-2 bg-[#F5821F] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#E06E10] transition-colors"
          >
            Go to my portal <ArrowRight size={16} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#E8E6E2] px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#F5821F] flex items-center justify-center">
          <span className="text-white font-bold text-sm">E</span>
        </div>
        <span className="font-semibold text-[#1C1917]">Edubee CAMP</span>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-xl">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8 justify-center">
            {[
              { n: 1, label: "Organisation", icon: <Building2 size={14} /> },
              { n: 2, label: "Admin Account", icon: <User size={14} /> },
            ].map(({ n, label, icon }) => (
              <div key={n} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  step === n
                    ? "bg-[#F5821F] text-white"
                    : step > n
                    ? "bg-green-100 text-green-700"
                    : "bg-[#F4F3F1] text-[#A8A29E]"
                }`}>
                  {step > n ? <CheckCircle2 size={12} /> : icon}
                  {label}
                </div>
                {n < 2 && <div className="w-6 h-px bg-[#E8E6E2]" />}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E6E2] shadow-sm overflow-hidden">
            {/* Step 1 */}
            {step === 1 && (
              <div className="p-8">
                <h2 className="text-xl font-bold text-[#1C1917] mb-1">Create your camp portal</h2>
                <p className="text-[#78716C] text-sm mb-6">Set up your organisation's unique space on Edubee</p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1.5">
                      Organisation Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.orgName}
                      onChange={e => {
                        set("orgName", e.target.value);
                        set("subdomain", slugify(e.target.value));
                      }}
                      placeholder="Sunny Camp Academy"
                      className="w-full px-3 py-2.5 rounded-lg border border-[#E8E6E2] focus:outline-none focus:ring-2 focus:ring-[#F5821F]/20 focus:border-[#F5821F] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1.5">
                      Portal Subdomain <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-0">
                      <input
                        type="text"
                        value={form.subdomain}
                        onChange={e => set("subdomain", slugify(e.target.value))}
                        placeholder="sunnycamp"
                        className="flex-1 px-3 py-2.5 rounded-l-lg border border-r-0 border-[#E8E6E2] focus:outline-none focus:ring-2 focus:ring-[#F5821F]/20 focus:border-[#F5821F] text-sm font-mono"
                      />
                      <span className="px-3 py-2.5 bg-[#F4F3F1] border border-l-0 border-[#E8E6E2] rounded-r-lg text-sm text-[#78716C]">.edubee.co</span>
                    </div>
                    {form.subdomain && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                        {subdomainStatus === "checking" && <><Loader2 size={12} className="animate-spin text-[#A8A29E]" /><span className="text-[#A8A29E]">Checking…</span></>}
                        {subdomainStatus === "available" && <><CheckCircle2 size={12} className="text-green-500" /><span className="text-green-600">{subdomainMsg}</span></>}
                        {(subdomainStatus === "taken" || subdomainStatus === "invalid") && <><XCircle size={12} className="text-red-400" /><span className="text-red-500">{subdomainMsg}</span></>}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-[#A8A29E]">
                      Students will apply at <span className="font-mono text-[#78716C]">{form.subdomain || "yourcamp"}.edubee.co/camp/</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Country</label>
                      <select
                        value={form.country}
                        onChange={e => set("country", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-[#E8E6E2] focus:outline-none focus:ring-2 focus:ring-[#F5821F]/20 focus:border-[#F5821F] text-sm bg-white"
                      >
                        <option value="">Select country</option>
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => set("phone", e.target.value)}
                        placeholder="+61 400 000 000"
                        className="w-full px-3 py-2.5 rounded-lg border border-[#E8E6E2] focus:outline-none focus:ring-2 focus:ring-[#F5821F]/20 focus:border-[#F5821F] text-sm"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!step1Valid}
                  className="mt-8 w-full flex items-center justify-center gap-2 bg-[#F5821F] text-white py-3 rounded-lg font-semibold hover:bg-[#E06E10] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="p-8">
                <h2 className="text-xl font-bold text-[#1C1917] mb-1">Admin account</h2>
                <p className="text-[#78716C] text-sm mb-6">This will be the primary administrator for <strong>{form.orgName}</strong></p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1.5">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.adminFullName}
                      onChange={e => set("adminFullName", e.target.value)}
                      placeholder="Jane Kim"
                      className="w-full px-3 py-2.5 rounded-lg border border-[#E8E6E2] focus:outline-none focus:ring-2 focus:ring-[#F5821F]/20 focus:border-[#F5821F] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1.5">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.adminEmail}
                      onChange={e => set("adminEmail", e.target.value)}
                      placeholder="jane@sunnycamp.com"
                      className="w-full px-3 py-2.5 rounded-lg border border-[#E8E6E2] focus:outline-none focus:ring-2 focus:ring-[#F5821F]/20 focus:border-[#F5821F] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1.5">
                      Password <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={form.adminPassword}
                        onChange={e => set("adminPassword", e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full px-3 py-2.5 pr-10 rounded-lg border border-[#E8E6E2] focus:outline-none focus:ring-2 focus:ring-[#F5821F]/20 focus:border-[#F5821F] text-sm"
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E]">
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {form.adminPassword && form.adminPassword.length < 8 && (
                      <p className="mt-1 text-xs text-red-500">Minimum 8 characters</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1.5">
                      Confirm Password <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={form.adminPasswordConfirm}
                      onChange={e => set("adminPasswordConfirm", e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-3 py-2.5 rounded-lg border border-[#E8E6E2] focus:outline-none focus:ring-2 focus:ring-[#F5821F]/20 focus:border-[#F5821F] text-sm"
                    />
                    {form.adminPasswordConfirm && form.adminPassword !== form.adminPasswordConfirm && (
                      <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                    )}
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.agreeTerms}
                      onChange={e => set("agreeTerms", e.target.checked)}
                      className="mt-0.5 accent-[#F5821F]"
                    />
                    <span className="text-sm text-[#57534E]">
                      I agree to Edubee's{" "}
                      <a href="https://edubee.co/terms" target="_blank" rel="noreferrer" className="text-[#F5821F] underline">Terms of Service</a>
                      {" "}and{" "}
                      <a href="https://edubee.co/privacy" target="_blank" rel="noreferrer" className="text-[#F5821F] underline">Privacy Policy</a>
                    </span>
                  </label>
                </div>

                {submitError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-600">
                    <XCircle size={14} /> {submitError}
                  </div>
                )}

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg border border-[#E8E6E2] text-[#57534E] hover:bg-[#F4F3F1] text-sm font-medium transition-colors"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!step2Valid || submitting}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#F5821F] text-white py-3 rounded-lg font-semibold hover:bg-[#E06E10] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? <><Loader2 size={16} className="animate-spin" /> Creating portal…</> : <>Create portal <ArrowRight size={16} /></>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Trial info */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-[#A8A29E]">
            <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-400" /> 14-day free trial</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-400" /> No credit card required</span>
            <span className="flex items-center gap-1"><Globe size={11} className="text-green-400" /> Live instantly</span>
          </div>

          <p className="mt-3 text-center text-xs text-[#A8A29E]">
            Already have an account?{" "}
            <a href="/login" className="text-[#F5821F] hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
