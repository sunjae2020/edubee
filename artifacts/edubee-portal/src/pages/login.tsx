import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Eye, EyeOff, ArrowRight, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { useTenantTheme } from "@/hooks/use-tenant-theme";

const defaultLogoImg = `${import.meta.env.BASE_URL}edubee-logo.png`;

const PARTNER_ROLES = ["hotel", "pickup", "institute", "tour"];

function getHomePath(role: string | null | undefined) {
  if (role === "student") return "/student/dashboard";
  if (PARTNER_ROLES.includes(role ?? "")) return "/partner/dashboard";
  return "/dashboard";
}

interface Tenant {
  id: string;
  name: string;
  subdomain: string | null;
}

/** dev환경 여부: localhost 또는 .replit.app 도메인 */
function isDevEnv() {
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h.endsWith(".replit.app") || h.endsWith(".repl.co");
}

/** 서브도메인에서 테넌트 슬러그 추출 */
function getTenantSlugFromDomain(): string | null {
  const h = window.location.hostname;
  const match = h.match(/^([^.]+)\.edubee\.co$/);
  if (match && !["www", "app", "portal"].includes(match[1])) return match[1];
  return null;
}

export default function LoginPage() {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]           = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const { login, isAuthenticated }  = useAuth();
  const [, navigate]                = useLocation();
  const { theme }                   = useTenantTheme();

  // テナント選択 (dev only)
  const [tenants, setTenants]               = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>("");   // subdomain
  const [showTenantSelector, setShowTenantSelector] = useState(false);

  const primary = theme.primaryColor;
  const dk      = darken(primary, 15);

  // 도메인에 서브도메인이 없는 개발 환경이면 테넌트 목록 로드
  useEffect(() => {
    if (isDevEnv() && !getTenantSlugFromDomain()) {
      setShowTenantSelector(true);
      fetch("/api/portal/public/tenants")
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d.data)) {
            setTenants(d.data);
            if (d.data.length > 0) setSelectedTenant(d.data[0].subdomain ?? "");
          }
        })
        .catch(() => {});
    }
  }, []);

  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      // dev 환경에서 선택된 테넌트를 localStorage에 저장 → api.ts의 headers()가 읽어서 X-Organisation-Id로 전송
      if (showTenantSelector && selectedTenant) {
        localStorage.setItem("portal_tenant_slug", selectedTenant);
      } else {
        localStorage.removeItem("portal_tenant_slug");
      }

      const result = await login(email.trim(), password);
      const role = result.portalRole;
      const homePath = getHomePath(role);
      if (result.mustChangePassword) {
        const profilePath =
          role === "student" ? "/student/profile" :
          PARTNER_ROLES.includes(role ?? "") ? "/partner/profile" :
          "/profile";
        navigate(`${profilePath}?force=1`);
      } else {
        navigate(homePath);
      }
    } catch (err: any) {
      setError(err?.message ?? "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  }

  const logoSrc = theme.logoUrl ?? defaultLogoImg;

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Left brand panel ── */}
      <div
        className="hidden md:flex flex-col justify-between w-[42%] lg:w-[40%] min-h-screen p-10 sticky top-0 h-screen"
        style={{ background: primary }}
      >
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            {theme.logoUrl ? (
              <img
                src={theme.logoUrl}
                alt={theme.companyName}
                className="h-10 w-auto object-contain"
                style={{ maxWidth: "160px", filter: "brightness(0) invert(1)" }}
              />
            ) : (
              <img
                src={defaultLogoImg}
                alt="Edubee"
                className="h-10 w-auto object-contain"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            )}
          </div>

          {/* Portal icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>

          <h1 className="text-white text-2xl font-bold leading-snug mb-3">
            {theme.organisationId ? theme.companyName : "Edubee"} Portal
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
            Secure access for agents, partners, and students.
            Sign in to manage your account, bookings, and documents.
          </p>
        </div>

        {/* Footer features */}
        <div className="space-y-3">
          {[
            "Agent & partner commissions",
            "Booking & contract management",
            "Student progress tracking",
          ].map(f => (
            <div key={f} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.20)" }}
              >
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.9)" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2 mb-8">
            {theme.logoUrl ? (
              <img src={theme.logoUrl} alt={theme.companyName} className="h-8 w-auto object-contain" />
            ) : (
              <img src={defaultLogoImg} alt="Edubee" className="h-8 w-auto object-contain" />
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1C1917] mb-1">Sign in to Portal</h2>
            <p className="text-sm text-[#57534E]">
              {theme.organisationId
                ? `Welcome back to ${theme.companyName}`
                : "Enter your credentials to access the portal."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA]">
                <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                <p className="text-xs text-[#DC2626]">{error}</p>
              </div>
            )}

            {/* ── 개발환경 테넌트 선택기 ── */}
            {showTenantSelector && tenants.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">
                  Organisation
                  <span className="ml-1.5 text-[#A8A29E] font-normal">(dev environment)</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedTenant}
                    onChange={e => setSelectedTenant(e.target.value)}
                    disabled={isLoading}
                    className="w-full h-10 pl-3 pr-8 text-sm rounded-lg border border-[#E8E6E2] bg-white text-[#1C1917] outline-none appearance-none cursor-pointer"
                    onFocus={e => (e.target.style.borderColor = primary)}
                    onBlur={e => (e.target.style.borderColor = "#E8E6E2")}
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.subdomain ?? t.id}>{t.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[#A8A29E]" />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">Email</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                required
                disabled={isLoading}
                className="w-full h-10 px-3 text-sm rounded-lg border border-[#E8E6E2] bg-white text-[#1C1917]
                  placeholder:text-[#A8A29E] outline-none transition-all"
                onFocus={e => (e.target.style.borderColor = primary)}
                onBlur={e => (e.target.style.borderColor = "#E8E6E2")}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  required
                  disabled={isLoading}
                  className="w-full h-10 px-3 pr-10 text-sm rounded-lg border border-[#E8E6E2] bg-white text-[#1C1917]
                    placeholder:text-[#A8A29E] outline-none transition-all"
                  onFocus={e => (e.target.style.borderColor = primary)}
                  onBlur={e => (e.target.style.borderColor = "#E8E6E2")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#57534E] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold text-white transition-all
                disabled:opacity-65 disabled:cursor-not-allowed"
              style={{ background: isLoading ? dk : primary }}
              onMouseEnter={e => { if (!isLoading) (e.currentTarget.style.background = dk); }}
              onMouseLeave={e => { if (!isLoading) (e.currentTarget.style.background = primary); }}
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center mt-6 text-xs text-[#A8A29E]">
            Need access? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

function darken(hex: string, pct: number): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return hex;
  const f = 1 - pct / 100;
  return "#" + [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)]
    .map(v => Math.round(v * f).toString(16).padStart(2, "0")).join("");
}
