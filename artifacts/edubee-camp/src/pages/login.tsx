import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
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

const DEMO_ACCOUNTS = [
  { emoji: "👑", label: "Super Admin",   email: "superadmin@edubee.com",  password: "password123" },
  { emoji: "🛡️", label: "Admin",         email: "admin@edubee.com",        password: "password123" },
  { emoji: "📋", label: "Coordinator",   email: "coordinator@edubee.com",  password: "password123" },
  { emoji: "🎓", label: "Agent",         email: "agent@edubee.com",        password: "password123" },
  { emoji: "🏫", label: "Institute",     email: "institute@example.com",   password: "password123" },
  { emoji: "🏨", label: "Hotel",         email: "hotel@example.com",       password: "password123" },
  { emoji: "🚗", label: "Pickup",        email: "driver@pickup.com",       password: "password123" },
  { emoji: "🗺️", label: "Tour",          email: "guide@tours.com",         password: "password123" },
  { emoji: "👪", label: "Parent",        email: "parent@example.com",      password: "password123" },
];

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [filledEmail, setFilledEmail] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (isAuthenticated) return <Redirect to="/admin/dashboard" />;

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
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#FAFAF9" }}>
      <div className="w-full max-w-sm px-4 py-10 space-y-6">
        <div className="flex flex-col items-center gap-3 mb-2">
          <img src={logoImg} alt="Edubee Camp" className="h-9 w-auto object-contain" />
          <p className="text-sm" style={{ color: "#57534E" }}>Admin Portal</p>
        </div>

        <div
          className="rounded-xl p-6 space-y-5"
          style={{ background: "#FFFFFF", border: "1px solid #E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium uppercase tracking-[0.05em]" style={{ color: "#57534E" }}>Email</FormLabel>
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
                    <FormLabel className="text-xs font-medium uppercase tracking-[0.05em]" style={{ color: "#57534E" }}>Password</FormLabel>
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
                          style={{ color: "#A8A29E" }}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-10 font-semibold gap-2" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </form>
          </Form>

          <div>
            <div className="relative mb-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: "#E8E6E2" }} />
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 text-xs" style={{ background: "#FFFFFF", color: "#A8A29E" }}>Demo accounts — click to fill</span>
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
                    background: selectedEmail === acc.email ? "#FEF0E3" : "#F4F3F1",
                    color: selectedEmail === acc.email ? "#F5821F" : "#57534E",
                    border: `1px solid ${selectedEmail === acc.email ? "rgba(245,130,31,0.4)" : "#E8E6E2"}`,
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
        </div>

        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
