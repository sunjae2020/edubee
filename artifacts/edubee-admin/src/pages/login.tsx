import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/public/language-switcher";
import { useTenantThemeCtx } from "@/hooks/use-tenant-theme";
import logoImg from "@assets/edubee_logo_800x310b_1773796715563.png";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { emoji: "👑", label: "Super Admin",  email: "superadmin@edubee.co", password: "Admin123!" },
  { emoji: "🛡️", label: "Admin",        email: "admin@edubee.co",       password: "Admin123!" },
  { emoji: "📋", label: "Coordinator", email: "coordinator@edubee.co", password: "Admin123!" },
  { emoji: "💼", label: "Consultant",  email: "agent@edubee.co",       password: "Admin123!" },
];

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const theme = useTenantThemeCtx();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [filledEmail, setFilledEmail] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (isAuthenticated) {
    return <Redirect to={(user as any)?.role === "super_admin" ? "/superadmin" : "/admin/dashboard"} />;
  }

  function fillDemo(acc: typeof DEMO_ACCOUNTS[0]) {
    form.setValue("email", acc.email);
    form.setValue("password", acc.password);
    setSelectedEmail(acc.email);
    setFilledEmail(acc.email);
    setTimeout(() => setFilledEmail(null), 2500);
  }

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      await login(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login failed", description: error.message || "Invalid credentials." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "var(--e-bg-page)" }}>
      <div className="w-full max-w-sm px-4 py-10 space-y-6">
        <div className="flex flex-col items-center gap-3 mb-2">
          <img
            src={theme.logoUrl ?? logoImg}
            alt={theme.companyName}
            className="h-9 w-auto object-contain"
          />
          <p className="text-sm font-medium" style={{ color: "var(--e-text-2)" }}>
            {theme.organisationId ? theme.companyName : "Admin Portal"}
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

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '40px',
                  backgroundColor: '#F5821F',
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

          {!theme.organisationId && (
            <div>
              <div className="relative mb-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: "var(--e-border)" }} />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 text-xs" style={{ background: "var(--e-bg-surface)", color: "var(--e-text-3)" }}>Demo accounts — click to fill</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    title={acc.email}
                    onClick={() => fillDemo(acc)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: selectedEmail === acc.email ? "var(--e-orange-lt)" : "var(--e-bg-muted)",
                      color: selectedEmail === acc.email ? "var(--e-orange)" : "var(--e-text-2)",
                      border: `1px solid ${selectedEmail === acc.email ? "var(--e-orange-shadow-40)" : "var(--e-border)"}`,
                    }}
                  >
                    <span>{acc.emoji}</span>
                    <span>{acc.label}</span>
                  </button>
                ))}
              </div>

              {filledEmail && (
                <p className="mt-2 text-xs font-medium" style={{ color: "#16A34A" }}>✓ Filled: {filledEmail}</p>
              )}
            </div>
          )}
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
  );
}
