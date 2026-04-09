import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft, MailCheck, AlertCircle } from "lucide-react";
import logoImg from "@assets/edubee_logo_800x310b_1773796715563.png";
import { useTenantThemeCtx } from "@/hooks/use-tenant-theme";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const INPUT_CLS = `w-full h-10 px-3 text-sm rounded-lg border border-[#E8E6E2] bg-white text-[#1C1917]
  placeholder:text-[#A8A29E] outline-none transition-all
  focus:border-(--e-orange) focus:shadow-[0_0_0_3px_var(--e-orange-ring)]`;
const INPUT_ERR = `w-full h-10 px-3 text-sm rounded-lg border border-[#DC2626] bg-white text-[#1C1917]
  placeholder:text-[#A8A29E] outline-none transition-all
  focus:border-[#DC2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.12)]`;
const BTN_PRIMARY = `w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold text-white
  disabled:opacity-65 disabled:cursor-not-allowed disabled:transform-none transition-all`;
const LABEL_CLS = "block text-xs font-medium text-[#57534E] mb-1";
const ERR_CLS = "mt-1 text-xs text-[#DC2626]";

function StrengthBar({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const label = ["", "Weak", "Fair", "Good", "Strong"][score];
  const colors = ["", "#DC2626", "#F59E0B", "#16A34A", "#16A34A"];

  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all"
            style={{ background: i <= score ? colors[score] : "#E8E6E2" }} />
        ))}
      </div>
      <p className="text-xs" style={{ color: colors[score] }}>{label}</p>
    </div>
  );
}

export default function AcceptInvite() {
  const theme = useTenantThemeCtx();
  const logoSrc = theme.logoUrl ?? logoImg;

  const [token, setToken]           = useState("");
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [showCf, setShowCf]         = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [isLoading, setIsLoading]   = useState(false);
  const [success, setSuccess]       = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [tokenErrMsg, setTokenErrMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    setToken(t);
    if (!t) {
      setTokenError(true);
      setTokenErrMsg("No invitation token found. Please check your invite link.");
    }
  }, []);

  function clearErr(key: string) {
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!firstName.trim())         errs.firstName = "First name is required.";
    if (!lastName.trim())          errs.lastName  = "Last name is required.";
    if (!password)                 errs.password  = "Password is required.";
    else if (password.length < 8)  errs.password  = "Password must be at least 8 characters.";
    if (password !== confirm)      errs.confirm   = "Passwords do not match.";

    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/accept-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, firstName: firstName.trim(), lastName: lastName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        const msg = data.message || "An unexpected error occurred.";
        if (res.status === 400 && (msg.includes("expired") || msg.includes("Invalid"))) {
          setTokenError(true);
          setTokenErrMsg(msg);
        } else {
          setErrors({ submit: msg });
        }
      }
    } catch {
      setErrors({ submit: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }

  const brandColor = "var(--e-orange)";
  const brandHover = "var(--e-orange-hover)";

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Left brand panel ── */}
      <div className="hidden md:flex flex-col justify-between w-[40%] lg:w-[38%] min-h-screen p-10 sticky top-0 h-screen"
        style={{ background: brandColor }}>
        <div>
          <div className="flex items-center gap-3 mb-10">
            <img src={logoSrc} alt={theme.companyName ?? "Edubee"} className="h-12 w-auto object-contain"
              style={{ filter: "brightness(0) invert(1)" }} />
          </div>

          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-6">
            <MailCheck className="w-7 h-7 text-white" />
          </div>

          <h1 className="text-white text-2xl font-bold leading-snug mb-3">
            You've been invited!
          </h1>
          <p className="text-white/90 text-sm leading-relaxed">
            Set up your account to access{" "}
            <strong>{theme.companyName ?? "Edubee CRM"}</strong>.
            Choose a strong password to keep your account secure.
          </p>
        </div>

        <div className="space-y-3">
          {[
            "Minimum 8 characters",
            "Include uppercase letters",
            "Mix numbers & symbols for extra security",
          ].map(tip => (
            <div key={tip} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-white text-sm">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2 mb-8">
            <img src={logoSrc} alt={theme.companyName ?? "Edubee"} className="h-8 w-auto object-contain" />
          </div>

          {tokenError ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#FEF2F2] flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-8 h-8" style={{ color: "#DC2626" }} />
              </div>
              <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Link Expired or Invalid</h2>
              <p className="text-sm text-[#57534E] leading-relaxed mb-8">
                {tokenErrMsg || "This invitation link is invalid or has already been used. Please contact your administrator for a new invitation."}
              </p>
              <p className="mt-4 text-[13px] text-[#57534E]">
                <Link href="/login" className="inline-flex items-center gap-1 font-medium hover:underline" style={{ color: brandColor }}>
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Login
                </Link>
              </p>
            </div>

          ) : success ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8" style={{ color: "#16A34A" }} />
              </div>
              <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Account Created!</h2>
              <p className="text-sm text-[#57534E] leading-relaxed mb-8">
                Your account has been set up successfully. You can now sign in with your email and password.
              </p>
              <Link href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
                style={{ background: brandColor }}>
                <ArrowLeft className="w-4 h-4" />
                Go to Login
              </Link>
            </div>

          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#1C1917] mb-1">Set Up Your Account</h2>
                <p className="text-sm text-[#57534E]">
                  Enter your name and create a password to get started.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => { setFirstName(e.target.value); clearErr("firstName"); }}
                      placeholder="First"
                      className={errors.firstName ? INPUT_ERR : INPUT_CLS}
                      autoFocus
                    />
                    {errors.firstName && <p className={ERR_CLS}>{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => { setLastName(e.target.value); clearErr("lastName"); }}
                      placeholder="Last"
                      className={errors.lastName ? INPUT_ERR : INPUT_CLS}
                    />
                    {errors.lastName && <p className={ERR_CLS}>{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLS}>Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={e => { setPassword(e.target.value); clearErr("password"); }}
                      placeholder="Min. 8 characters"
                      className={`${errors.password ? INPUT_ERR : INPUT_CLS} pr-10`}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#57534E] transition-colors">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className={ERR_CLS}>{errors.password}</p>}
                  <StrengthBar password={password} />
                </div>

                <div>
                  <label className={LABEL_CLS}>Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showCf ? "text" : "password"}
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); clearErr("confirm"); }}
                      placeholder="Re-enter password"
                      className={`${errors.confirm ? INPUT_ERR : INPUT_CLS} pr-10`}
                    />
                    <button type="button" onClick={() => setShowCf(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#57534E] transition-colors">
                      {showCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirm && <p className={ERR_CLS}>{errors.confirm}</p>}
                </div>

                {errors.submit && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA]">
                    <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                    <p className="text-xs text-[#DC2626]">{errors.submit}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className={BTN_PRIMARY}
                  style={{ background: isLoading ? undefined : brandColor }}
                >
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
                    : "Create Account"}
                </button>
              </form>

              <p className="text-center mt-6 text-[13px] text-[#57534E]">
                <Link href="/login"
                  className="inline-flex items-center gap-1 font-medium hover:underline"
                  style={{ color: brandColor }}>
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
