import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, Mail, Globe, Phone, Send, Loader2, CheckCircle2, Eye, EyeOff, ExternalLink, Key } from "lucide-react";

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

  const [resend, setResend] = useState({
    apiKey: "",
    from: "",
    fromName: "Edubee Camp",
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [testTarget, setTestTarget] = useState("");

  const { data: generalData, isLoading: loadingGeneral } = useQuery({
    queryKey: ["settings-general"],
    queryFn: () => axios.get(`${BASE}/api/settings/general`).then(r => r.data),
  });

  const { data: resendData, isLoading: loadingResend } = useQuery({
    queryKey: ["settings-resend"],
    queryFn: () => axios.get(`${BASE}/api/settings/resend`).then(r => r.data),
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
    if (resendData) {
      setResend(s => ({
        ...s,
        from: resendData.from ?? "",
        fromName: resendData.fromName ?? "Edubee Camp",
      }));
    }
  }, [resendData]);

  const saveGeneral = useMutation({
    mutationFn: () => axios.put(`${BASE}/api/settings/general`, general).then(r => r.data),
    onSuccess: () => toast({ title: "General settings saved" }),
    onError: () => toast({ variant: "destructive", title: "Failed to save settings" }),
  });

  const saveResend = useMutation({
    mutationFn: () => axios.put(`${BASE}/api/settings/resend`, {
      apiKey: resend.apiKey || undefined,
      from: resend.from,
      fromName: resend.fromName,
    }).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Resend settings saved" });
      setResend(s => ({ ...s, apiKey: "" }));
    },
    onError: () => toast({ variant: "destructive", title: "Failed to save Resend settings" }),
  });

  const sendTestEmail = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/settings/test-email`, { to: testTarget || resend.from }).then(r => r.data),
    onSuccess: (data) => toast({
      title: "✉️ Test email sent!",
      description: `Delivered to ${data.sentTo} via Resend`,
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

  const loading = loadingGeneral || loadingResend;

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Resend Email */}
      <section className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#F5821F]" /> Email (Resend)
          </h2>
          <a
            href="https://resend.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[#F5821F] hover:underline"
          >
            <Key className="w-3 h-3" /> Get API Key
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="rounded-lg bg-[#FEF0E3] border border-[#F5821F]/20 px-4 py-3 text-xs text-[#92400E] space-y-1">
          <p className="font-medium">Resend 설정 방법</p>
          <ol className="list-decimal list-inside space-y-0.5 text-[#A16207]">
            <li><a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a>에서 계정 생성</li>
            <li>Domains 메뉴에서 발송 도메인 추가 및 인증 (DNS 설정)</li>
            <li>API Keys 메뉴에서 API 키 생성</li>
            <li>아래 필드에 API 키와 발송 이메일 주소를 입력 후 저장</li>
          </ol>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label className="text-xs">API Key</Label>
            <div className="relative mt-1">
              <Input
                type={showApiKey ? "text" : "password"}
                value={resend.apiKey}
                onChange={e => setResend(s => ({ ...s, apiKey: e.target.value }))}
                className="h-8 text-sm pr-9 font-mono"
                placeholder={resendData?.hasApiKey ? "re_••••••••  (저장됨)" : "re_xxxxxxxxxxxxxxxxxxxx"}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowApiKey(v => !v)}
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {resendData?.hasApiKey && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" /> API 키가 저장되어 있습니다. 변경하려면 새 키를 입력하세요.
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs">발송 이메일 주소 (From)</Label>
            <Input
              value={resend.from}
              onChange={e => setResend(s => ({ ...s, from: e.target.value }))}
              className="mt-1 h-8 text-sm"
              placeholder="noreply@yourdomain.com"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Resend에서 인증된 도메인의 이메일이어야 합니다.</p>
          </div>
          <div>
            <Label className="text-xs">발송자 이름 (From Name)</Label>
            <Input
              value={resend.fromName}
              onChange={e => setResend(s => ({ ...s, fromName: e.target.value }))}
              className="mt-1 h-8 text-sm"
              placeholder="Edubee Camp"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => saveResend.mutate()} disabled={saveResend.isPending || loading}>
            {saveResend.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveResend.isSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
            저장
          </Button>

          <div className="flex items-center gap-1.5 ml-auto">
            <Input
              value={testTarget}
              onChange={e => setTestTarget(e.target.value)}
              placeholder="테스트 수신 이메일..."
              className="h-8 text-xs w-52"
              type="email"
            />
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs shrink-0" onClick={() => sendTestEmail.mutate()} disabled={sendTestEmail.isPending}>
              {sendTestEmail.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              테스트 발송
            </Button>
          </div>
        </div>
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
