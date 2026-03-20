import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, Mail, Globe, Phone, Send, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const CURRENCIES = ["AUD", "USD", "SGD", "PHP", "THB", "KRW", "JPY", "GBP"];
const LANGUAGES = [
  { code: "en", label: "🇦🇺 English" },
  { code: "ko", label: "🇰🇷 Korean" },
  { code: "ja", label: "🇯🇵 Japanese" },
  { code: "th", label: "🇹🇭 Thai" },
];

export default function GeneralSettings() {
  const { toast } = useToast();

  const [general, setGeneral] = useState({
    platformName: "Edubee Camp",
    defaultCurrency: "AUD",
    supportEmail: "",
    supportPhone: "",
    activeLanguages: ["en", "ko", "ja", "th"] as string[],
  });

  const [smtp, setSmtp] = useState({
    host: "",
    port: "587",
    user: "",
    password: "",
    from: "",
    fromName: "Edubee Camp",
    secure: "false",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [testTarget, setTestTarget] = useState("");

  const { data: generalData, isLoading: loadingGeneral } = useQuery({
    queryKey: ["settings-general"],
    queryFn: () => axios.get(`${BASE}/api/settings/general`).then(r => r.data),
  });

  const { data: smtpData, isLoading: loadingSmtp } = useQuery({
    queryKey: ["settings-smtp"],
    queryFn: () => axios.get(`${BASE}/api/settings/smtp`).then(r => r.data),
  });

  useEffect(() => {
    if (generalData) {
      setGeneral({
        platformName: generalData.platformName ?? "Edubee Camp",
        defaultCurrency: generalData.defaultCurrency ?? "AUD",
        supportEmail: generalData.supportEmail ?? "",
        supportPhone: generalData.supportPhone ?? "",
        activeLanguages: generalData.activeLanguages ?? ["en", "ko", "ja", "th"],
      });
      if (!testTarget) setTestTarget(generalData.supportEmail ?? "");
    }
  }, [generalData]);

  useEffect(() => {
    if (smtpData) {
      setSmtp(s => ({
        ...s,
        host: smtpData.host ?? "",
        port: smtpData.port ?? "587",
        user: smtpData.user ?? "",
        from: smtpData.from ?? "",
        fromName: smtpData.fromName ?? "Edubee Camp",
        secure: smtpData.secure ?? "false",
      }));
      if (!testTarget && smtpData.user) setTestTarget(smtpData.user);
    }
  }, [smtpData]);

  const saveGeneral = useMutation({
    mutationFn: () => axios.put(`${BASE}/api/settings/general`, general).then(r => r.data),
    onSuccess: () => toast({ title: "General settings saved" }),
    onError: () => toast({ variant: "destructive", title: "Failed to save settings" }),
  });

  const saveSmtp = useMutation({
    mutationFn: () => axios.put(`${BASE}/api/settings/smtp`, {
      host: smtp.host,
      port: smtp.port,
      user: smtp.user,
      password: smtp.password || undefined,
      from: smtp.from,
      fromName: smtp.fromName,
      secure: smtp.secure,
    }).then(r => r.data),
    onSuccess: () => {
      toast({ title: "SMTP settings saved" });
      setSmtp(s => ({ ...s, password: "" }));
    },
    onError: () => toast({ variant: "destructive", title: "Failed to save SMTP settings" }),
  });

  const sendTestEmail = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/settings/test-email`, { to: testTarget || smtp.user }).then(r => r.data),
    onSuccess: (data) => toast({
      title: "✉️ Test email sent!",
      description: `Delivered to ${data.sentTo} via ${data.host}`,
    }),
    onError: (err: any) => {
      const detail = err?.response?.data?.detail ?? err?.response?.data?.error ?? err.message;
      toast({ variant: "destructive", title: "Failed to send test email", description: detail });
    },
  });

  function toggleLang(code: string) {
    setGeneral(s => ({
      ...s,
      activeLanguages: s.activeLanguages.includes(code)
        ? s.activeLanguages.filter(l => l !== code)
        : [...s.activeLanguages, code],
    }));
  }

  const loading = loadingGeneral || loadingSmtp;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#F5821F]/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-[#F5821F]" />
        </div>
        <div>
          <h1 className="text-lg font-bold">General Settings</h1>
          <p className="text-xs text-muted-foreground">Platform-wide configuration — accessible to Super Admin only</p>
        </div>
      </div>

      {/* Platform */}
      <section className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#F5821F]" /> Platform
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Platform Name</Label>
            <Input value={general.platformName} onChange={e => setGeneral(s => ({ ...s, platformName: e.target.value }))} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Default Currency</Label>
            <Select value={general.defaultCurrency} onValueChange={v => setGeneral(s => ({ ...s, defaultCurrency: v }))}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => saveGeneral.mutate()} disabled={saveGeneral.isPending || loading}>
          {saveGeneral.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveGeneral.isSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
          Save Platform Settings
        </Button>
      </section>

      {/* Support Contacts */}
      <section className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Phone className="w-4 h-4 text-[#F5821F]" /> Support Contacts
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Support Email</Label>
            <Input type="email" value={general.supportEmail} onChange={e => setGeneral(s => ({ ...s, supportEmail: e.target.value }))} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Support Phone</Label>
            <Input value={general.supportPhone} onChange={e => setGeneral(s => ({ ...s, supportPhone: e.target.value }))} className="mt-1 h-8 text-sm" />
          </div>
        </div>
        <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => saveGeneral.mutate()} disabled={saveGeneral.isPending || loading}>
          {saveGeneral.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Save Contact Settings
        </Button>
      </section>

      {/* SMTP */}
      <section className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#F5821F]" /> Email (SMTP)
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">SMTP Host</Label>
            <Input value={smtp.host} onChange={e => setSmtp(s => ({ ...s, host: e.target.value }))} className="mt-1 h-8 text-sm" placeholder="smtp.gmail.com" />
          </div>
          <div>
            <Label className="text-xs">SMTP Port</Label>
            <Input value={smtp.port} onChange={e => setSmtp(s => ({ ...s, port: e.target.value }))} className="mt-1 h-8 text-sm" placeholder="587" />
          </div>
          <div>
            <Label className="text-xs">Username</Label>
            <Input value={smtp.user} onChange={e => setSmtp(s => ({ ...s, user: e.target.value }))} className="mt-1 h-8 text-sm" placeholder="you@gmail.com" />
          </div>
          <div>
            <Label className="text-xs">Password / App Password</Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                value={smtp.password}
                onChange={e => setSmtp(s => ({ ...s, password: e.target.value }))}
                className="h-8 text-sm pr-9"
                placeholder={smtpData?.hasPassword ? "••••••••••••••••  (saved)" : "Enter app password"}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-xs">From Email Address</Label>
            <Input value={smtp.from} onChange={e => setSmtp(s => ({ ...s, from: e.target.value }))} className="mt-1 h-8 text-sm" placeholder="noreply@yourdomain.com" />
          </div>
          <div>
            <Label className="text-xs">From Name</Label>
            <Input value={smtp.fromName} onChange={e => setSmtp(s => ({ ...s, fromName: e.target.value }))} className="mt-1 h-8 text-sm" placeholder="Edubee Camp" />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => saveSmtp.mutate()} disabled={saveSmtp.isPending || loading}>
            {saveSmtp.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveSmtp.isSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
            Save SMTP Settings
          </Button>

          <div className="flex items-center gap-1.5 ml-auto">
            <Input
              value={testTarget}
              onChange={e => setTestTarget(e.target.value)}
              placeholder="Send test to..."
              className="h-8 text-xs w-48"
              type="email"
            />
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs shrink-0" onClick={() => sendTestEmail.mutate()} disabled={sendTestEmail.isPending}>
              {sendTestEmail.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Test
            </Button>
          </div>
        </div>

        {smtpData?.hasPassword && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> SMTP password is saved. Leave the password field blank to keep the current password.
          </p>
        )}
      </section>

      {/* Languages */}
      <section className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#F5821F]" /> Active Languages
        </h2>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => (
            <button key={lang.code} onClick={() => toggleLang(lang.code)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${general.activeLanguages.includes(lang.code) ? "bg-[#F5821F] text-white border-[#F5821F]" : "border-muted-foreground/30 text-muted-foreground hover:border-[#F5821F]/50"}`}>
              {lang.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">🇦🇺 English is always shown with the Australian flag on Edubee Camp.</p>
        <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => saveGeneral.mutate()} disabled={saveGeneral.isPending || loading}>
          {saveGeneral.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Save Language Settings
        </Button>
      </section>
    </div>
  );
}
