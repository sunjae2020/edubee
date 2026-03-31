import { useState } from "react";
import { Link } from "wouter";
import { Mail, Loader2, CheckCircle2, ArrowLeft, Lock } from "lucide-react";
import logoImg from "@assets/edubee_logo_800x310b_1773796715563.png";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const INPUT_CLS = `w-full h-10 px-3 text-sm rounded-lg border border-[#E8E6E2] bg-white text-[#1C1917]
  placeholder:text-[#A8A29E] outline-none transition-all
  focus:border-[#F5821F] focus:shadow-[0_0_0_3px_rgba(245,130,31,0.15)]`;
const INPUT_ERR = `w-full h-10 px-3 text-sm rounded-lg border border-[#DC2626] bg-white text-[#1C1917]
  placeholder:text-[#A8A29E] outline-none transition-all
  focus:border-[#DC2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.12)]`;
const BTN_PRIMARY = `w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold text-white bg-[#F5821F]
  hover:bg-[#D96A0A] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(245,130,31,0.25)]
  disabled:opacity-65 disabled:cursor-not-allowed disabled:transform-none transition-all`;

export default function ForgotPassword() {
  const [email, setEmail]       = useState("");
  const [error, setError]       = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed) { setError("Please enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || "An unexpected error occurred. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Left brand panel ── */}
      <div className="hidden md:flex flex-col justify-between w-[40%] lg:w-[38%] min-h-screen p-10 sticky top-0 h-screen"
        style={{ background: "#F5821F" }}>
        <div>
          <div className="flex items-center gap-3 mb-10">
            <img src={logoImg} alt="Edubee" className="h-12 w-auto object-contain"
              style={{ filter: "brightness(0) invert(1)" }} />
          </div>

          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-6">
            <Lock className="w-7 h-7 text-white" />
          </div>

          <h1 className="text-white text-2xl font-bold leading-snug mb-3">
            Forgot Your Password?
          </h1>
          <p className="text-white/90 text-sm leading-relaxed">
            No worries — it happens to everyone. Enter your work email and we'll send you a link to reset your password.
          </p>
        </div>

        <div className="space-y-3">
          {[
            "Reset link sent to your email",
            "Link expires in 1 hour",
            "Your data stays secure",
          ].map(f => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-white text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2 mb-8">
            <img src={logoImg} alt="Edubee" className="h-8 w-auto object-contain" />
          </div>

          {success ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8" style={{ color: "#16A34A" }} />
              </div>
              <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Check Your Email</h2>
              <p className="text-sm text-[#57534E] leading-relaxed mb-2">
                We've sent a password reset link to
              </p>
              <p className="text-sm font-semibold text-[#1C1917] mb-6 break-all">{email}</p>
              <p className="text-xs text-[#A8A29E] mb-8 leading-relaxed">
                Didn't receive the email? Check your spam folder or{" "}
                <button
                  onClick={() => { setSuccess(false); setEmail(""); }}
                  className="text-[#F5821F] font-medium hover:underline"
                >
                  try again
                </button>.
              </p>
              <Link href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#F5821F] hover:bg-[#D96A0A] transition-all">
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          ) : (
            /* ── Email form ── */
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#1C1917] mb-1">Reset Password</h2>
                <p className="text-sm text-[#57534E]">
                  Enter the email address associated with your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(""); }}
                      placeholder="name@agency.com"
                      className={`${error ? INPUT_ERR : INPUT_CLS} pl-9`}
                      autoFocus
                    />
                  </div>
                  {error && <p className="mt-1 text-xs text-[#DC2626]">{error}</p>}
                </div>

                <button type="submit" disabled={isLoading} className={BTN_PRIMARY}>
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    : "Send Reset Link"}
                </button>
              </form>

              <p className="text-center mt-6 text-[13px] text-[#57534E]">
                <Link href="/login"
                  className="inline-flex items-center gap-1 text-[#F5821F] font-medium hover:underline">
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
