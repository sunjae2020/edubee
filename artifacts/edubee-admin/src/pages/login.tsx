import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link, useLocation } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowRight, Loader2, MonitorCheck, LockKeyhole } from "lucide-react";
import { LanguageSwitcher } from "@/components/public/language-switcher";
import { useTenantThemeCtx } from "@/hooks/use-tenant-theme";
import logoImg from "@assets/edubee_logo_800x310b_1773796715563.png";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const theme = useTenantThemeCtx();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [lockedMessage, setLockedMessage] = useState("");
  const [, setLocation] = useLocation();

  const urlParams = new URLSearchParams(window.location.search);
  const previewOrg = urlParams.get("org");
  const isPreviewMode = !!previewOrg;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // If already authenticated and not in preview mode, redirect to dashboard
  if (isAuthenticated && !isPreviewMode) {
    // Platform admin: role=super_admin + no organisation → /superadmin
    // Tenant super admin (ts, myagency, etc.): role=super_admin + organisation present → /admin/dashboard
    const isPlatformAdmin = (user as any)?.role === "super_admin" && !(user as any)?.organisationId;
    return <Redirect to={isPlatformAdmin ? "/superadmin" : "/admin/dashboard"} />;
  }

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      setIsAccountLocked(false);
      await login(data);
    } catch (error: any) {
      const msg: string = error.message || "";
      const isLocked = /locked/i.test(msg) || error.status === 429;
      if (isLocked) {
        setIsAccountLocked(true);
        setLockedMessage(msg.replace(/^HTTP \d+ ?:?\s*/i, ""));
      } else {
        toast({ variant: "destructive", title: "Login failed", description: msg || "Invalid credentials." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: "var(--e-bg-page)" }}>
      {/* Preview mode banner */}
      {isPreviewMode && (
        <div className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium"
          style={{ background: "#1C1917", color: "#FCD34D" }}>
          <div className="flex items-center gap-2">
            <MonitorCheck className="w-3.5 h-3.5" />
            <span>Preview mode: <strong>{previewOrg}</strong> tenant login screen</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <button
                onClick={() => setLocation((user as any)?.role === "super_admin" ? "/superadmin" : "/admin/dashboard")}
                className="underline underline-offset-2 opacity-80 hover:opacity-100"
              >
                Go to dashboard →
              </button>
            )}
            <a href="/admin/login" className="underline underline-offset-2 opacity-80 hover:opacity-100">
              Exit preview
            </a>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-sm px-4 py-10 space-y-6">
        <div className="flex flex-col items-center gap-3 mb-2">
          <img
            src={theme.logoUrl ?? logoImg}
            alt={theme.companyName}
            className="h-9 w-auto object-contain"
          />
          <p className="text-sm font-medium" style={{ color: "var(--e-text-2)" }}>
            {theme.organisationId ? theme.companyName : "Edubee CRM"}
          </p>
        </div>

        <div
          className="rounded-xl p-6 space-y-5"
          style={{ background: "var(--e-bg-surface)", border: "1px solid var(--e-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-[0.05em]" style={{ color: "var(--e-text-2)" }}>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-[0.05em]" style={{ color: "var(--e-text-2)" }}>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-10 pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                          style={{ color: "var(--e-text-3)" }}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end -mt-1">
                <Link href="/forgot-password" className="text-xs" style={{ color: 'var(--e-orange)' }}>
                  Forgot password?
                </Link>
              </div>

              {isAccountLocked && (
                <div style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderLeft: "4px solid #DC2626",
                  borderRadius: "8px",
                  padding: "16px",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <LockKeyhole style={{ width: "18px", height: "18px", color: "#DC2626", flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <p style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: 600, color: "#991B1B" }}>
                        Account Locked
                      </p>
                      <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#7F1D1D", lineHeight: 1.6 }}>
                        {lockedMessage || "Account locked after too many failed attempts. An unlock link has been sent to your email."}
                      </p>
                      <Link href="/forgot-password" style={{
                        display: "inline-block",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#F5821F",
                        textDecoration: "none",
                      }}>
                        Reset password to unlock immediately →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '40px',
                  backgroundColor: 'var(--e-orange)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </Form>

        </div>

        {!theme.organisationId && (
          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#57534E' }}>
            Don't have an account?{' '}
            <Link href="/register" style={{ color: 'var(--e-orange)', fontWeight: 500 }}>
              Start for free →
            </Link>
          </p>
        )}

        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
      </div>
    </div>
  );
}
