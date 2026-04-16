import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

const ORANGE = "#F5821F";
const ORANGE_DK = "#d26a10";
const BG_PAGE = "#FAFAF9";
const BG_SURFACE = "#FFFFFF";
const BORDER = "#E8E6E2";
const TEXT_2 = "#57534E";
const TEXT_3 = "#A8A29E";

const PARTNER_ROLES = ["hotel", "pickup", "institute", "tour"];

function getHomePath(role: string | null | undefined) {
  if (role === "student") return "/student/dashboard";
  if (PARTNER_ROLES.includes(role ?? "")) return "/partner/dashboard";
  return "/dashboard";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
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

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{ background: BG_PAGE }}
    >
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <img
            src={`${import.meta.env.BASE_URL}edubee-logo.png`}
            alt="Edubee"
            className="h-9 w-auto object-contain"
          />
          <p className="text-sm font-medium" style={{ color: TEXT_2 }}>
            Portal
          </p>
        </div>

        <div
          className="rounded-xl p-6 space-y-5"
          style={{
            background: BG_SURFACE,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-[0.05em]"
                style={{ color: TEXT_2 }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full h-10 px-3 rounded-md text-sm outline-none transition-colors"
                style={{
                  background: BG_SURFACE,
                  border: `1px solid ${BORDER}`,
                  color: "#1C1917",
                }}
                onFocus={(e) => (e.target.style.borderColor = ORANGE)}
                onBlur={(e) => (e.target.style.borderColor = BORDER)}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-[0.05em]"
                style={{ color: TEXT_2 }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full h-10 px-3 pr-10 rounded-md text-sm outline-none transition-colors"
                  style={{
                    background: BG_SURFACE,
                    border: `1px solid ${BORDER}`,
                    color: "#1C1917",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = ORANGE)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: TEXT_3 }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                height: "40px",
                backgroundColor: isLoading ? ORANGE_DK : ORANGE,
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.8 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "background-color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) (e.currentTarget.style.backgroundColor = ORANGE_DK);
              }}
              onMouseLeave={(e) => {
                if (!isLoading) (e.currentTarget.style.backgroundColor = ORANGE);
              }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        <p className="text-center text-xs" style={{ color: TEXT_3 }}>
          Need access? Contact your Edubee administrator.
        </p>
      </div>
    </div>
  );
}
