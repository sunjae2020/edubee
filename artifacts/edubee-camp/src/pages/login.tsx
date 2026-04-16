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
import logoImg from "@assets/edubee_logo_800x310b_1773796715563.png";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (isAuthenticated) {
    return <Redirect to={(user as any)?.role === "super_admin" ? "/superadmin" : "/admin/dashboard"} />;
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
          <img src={logoImg} alt="Edubee Camp" className="h-9 w-auto object-contain" />
          <p className="text-sm" style={{ color: "var(--e-text-2)" }}>Admin Portal</p>
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

              <Button type="submit" className="w-full h-10 font-semibold gap-2" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </form>
          </Form>

        </div>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#57534E' }}>
          Don't have an account?{' '}
          <Link href="/register" style={{ color: 'var(--e-orange)', fontWeight: 500 }}>
            Start for free →
          </Link>
        </p>

        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
