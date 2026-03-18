import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, Mail, Globe, Phone, Send } from "lucide-react";

const CURRENCIES = ["AUD", "USD", "SGD", "PHP", "THB", "KRW", "JPY", "GBP"];
const LANGUAGES = [
  { code: "en", label: "🇦🇺 English" },
  { code: "ko", label: "🇰🇷 Korean" },
  { code: "ja", label: "🇯🇵 Japanese" },
  { code: "th", label: "🇹🇭 Thai" },
];

export default function GeneralSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    platformName: "Edubee Camp",
    defaultCurrency: "AUD",
    supportEmail: "support@edubee.com",
    supportPhone: "+61 2 9000 0000",
    smtpHost: "smtp.edubee.com",
    smtpPort: "587",
    smtpUser: "noreply@edubee.com",
    smtpPassword: "",
    activeLanguages: ["en", "ko", "ja", "th"],
  });

  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    toast({ title: "Settings saved successfully" });
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleLang(code: string) {
    setSettings(s => ({
      ...s, activeLanguages: s.activeLanguages.includes(code)
        ? s.activeLanguages.filter(l => l !== code)
        : [...s.activeLanguages, code],
    }));
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#F08301]/10 flex items-center justify-center"><Settings className="w-5 h-5 text-[#F08301]" /></div>
        <div><h1 className="text-lg font-bold">General Settings</h1><p className="text-xs text-muted-foreground">Platform-wide configuration — accessible to Super Admin only</p></div>
      </div>

      {/* Platform */}
      <section className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-[#F08301]" /> Platform</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Platform Name</Label>
            <Input value={settings.platformName} onChange={e => setSettings(s => ({ ...s, platformName: e.target.value }))} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Default Currency</Label>
            <Select value={settings.defaultCurrency} onValueChange={v => setSettings(s => ({ ...s, defaultCurrency: v }))}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Support Contacts */}
      <section className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2"><Phone className="w-4 h-4 text-[#F08301]" /> Support Contacts</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Support Email</Label>
            <Input type="email" value={settings.supportEmail} onChange={e => setSettings(s => ({ ...s, supportEmail: e.target.value }))} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Support Phone</Label>
            <Input value={settings.supportPhone} onChange={e => setSettings(s => ({ ...s, supportPhone: e.target.value }))} className="mt-1 h-8 text-sm" />
          </div>
        </div>
      </section>

      {/* SMTP */}
      <section className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2"><Mail className="w-4 h-4 text-[#F08301]" /> Email (SMTP)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">SMTP Host</Label>
            <Input value={settings.smtpHost} onChange={e => setSettings(s => ({ ...s, smtpHost: e.target.value }))} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">SMTP Port</Label>
            <Input value={settings.smtpPort} onChange={e => setSettings(s => ({ ...s, smtpPort: e.target.value }))} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">SMTP Username</Label>
            <Input value={settings.smtpUser} onChange={e => setSettings(s => ({ ...s, smtpUser: e.target.value }))} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">SMTP Password</Label>
            <Input type="password" value={settings.smtpPassword} onChange={e => setSettings(s => ({ ...s, smtpPassword: e.target.value }))} className="mt-1 h-8 text-sm" placeholder="••••••••" />
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => toast({ title: "Test email sent to support email address" })}>
          <Send className="w-3.5 h-3.5" /> Test Email
        </Button>
      </section>

      {/* Languages */}
      <section className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-[#F08301]" /> Active Languages</h2>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => (
            <button key={lang.code} onClick={() => toggleLang(lang.code)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${settings.activeLanguages.includes(lang.code) ? "bg-[#F08301] text-white border-[#F08301]" : "border-muted-foreground/30 text-muted-foreground hover:border-[#F08301]/50"}`}>
              {lang.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">🇦🇺 English is always shown with the Australian flag on Edubee Camp.</p>
      </section>

      <Button className="bg-[#F08301] hover:bg-[#d97706] text-white" onClick={handleSave}>
        {saved ? "Saved ✓" : "Save Settings"}
      </Button>
    </div>
  );
}
