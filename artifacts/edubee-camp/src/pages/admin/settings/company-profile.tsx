import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Building2, MapPin, Banknote, Globe2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TIMEZONES = [
  "Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane",
  "Australia/Perth", "Australia/Adelaide", "Asia/Seoul", "Asia/Tokyo",
  "Asia/Bangkok", "Pacific/Auckland", "UTC",
];
const CURRENCIES = ["AUD", "USD", "GBP", "EUR", "KRW", "JPY", "SGD", "THB", "PHP"];
const LANGUAGES  = [
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
  { code: "th", label: "ภาษาไทย" },
];

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E6E2] p-6 space-y-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center gap-2 border-b border-[#E8E6E2] pb-3">
        <Icon size={16} className="text-(--e-orange)" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inp = "w-full h-10 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-(--e-orange) focus:shadow-[0_0_0_3px_var(--e-orange-ring)] bg-white transition-all";
const sel = inp + " cursor-pointer";

export default function CompanyProfile() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: org, isLoading } = useQuery<any>({
    queryKey: ["settings-company"],
    queryFn: () => axios.get(`${BASE}/api/settings/company`).then(r => r.data),
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const merged = { ...org, ...form };

  const f = (key: string) => merged[key] ?? "";
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (data: any) => axios.put(`${BASE}/api/settings/company`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings-company"] });
      setForm({});
      toast({ title: "Saved", description: "Company profile updated successfully." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" }),
  });

  const handleSave = () => {
    mutation.mutate({
      name: f("name"), tradingName: f("tradingName"), abn: f("abn"),
      phone: f("phone"), companyEmail: f("companyEmail"),
      websiteUrl: f("websiteUrl"), description: f("description"),
      addressLine1: f("addressLine1"), addressLine2: f("addressLine2"),
      city: f("city"), state: f("state"), postcode: f("postcode"), country: f("country"),
      bankName: f("bankName"), bankAccName: f("bankAccName"),
      bankBsb: f("bankBsb"), bankAccNumber: f("bankAccNumber"), bankSwift: f("bankSwift"),
      timezone: f("timezone"), defaultCurrency: f("defaultCurrency"), defaultLanguage: f("defaultLanguage"),
    });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="animate-spin text-(--e-orange)" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#1C1917]">Company Profile</h1>
          <p className="text-sm text-[#57534E] mt-0.5">Manage your organisation's information and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={mutation.isPending}
          className="h-10 px-5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
          style={{ background: "var(--e-orange)" }}
        >
          {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </button>
      </div>

      {/* Basic Info */}
      <Card title="Basic Information" icon={Building2}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name" required>
            <input className={inp} value={f("name")} onChange={set("name")} placeholder="Edubee International Pty Ltd" />
          </Field>
          <Field label="Trading Name">
            <input className={inp} value={f("tradingName")} onChange={set("tradingName")} placeholder="Edubee" />
          </Field>
          <Field label="ABN">
            <input className={inp} value={f("abn")} onChange={set("abn")} placeholder="12 345 678 901" />
          </Field>
          <Field label="Phone Number">
            <input className={inp} value={f("phone")} onChange={set("phone")} placeholder="+61 2 0000 0000" />
          </Field>
          <Field label="Company Email">
            <input className={inp} type="email" value={f("companyEmail")} onChange={set("companyEmail")} placeholder="info@example.com.au" />
          </Field>
          <Field label="Website URL">
            <input className={inp} type="url" value={f("websiteUrl")} onChange={set("websiteUrl")} placeholder="https://example.com.au" />
          </Field>
          <div className="col-span-2">
            <Field label="Description">
              <textarea
                className={`${inp} h-24 resize-none py-2`}
                value={f("description")} onChange={set("description")}
                placeholder="Brief description of your organisation…"
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* Address */}
      <Card title="Address" icon={MapPin}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Address Line 1">
              <input className={inp} value={f("addressLine1")} onChange={set("addressLine1")} placeholder="123 Main Street" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Address Line 2">
              <input className={inp} value={f("addressLine2")} onChange={set("addressLine2")} placeholder="Suite 100" />
            </Field>
          </div>
          <Field label="City / Suburb">
            <input className={inp} value={f("city")} onChange={set("city")} placeholder="Sydney" />
          </Field>
          <Field label="State">
            <input className={inp} value={f("state")} onChange={set("state")} placeholder="NSW" />
          </Field>
          <Field label="Postcode">
            <input className={inp} value={f("postcode")} onChange={set("postcode")} placeholder="2000" />
          </Field>
          <Field label="Country">
            <input className={inp} value={f("country") || "Australia"} onChange={set("country")} placeholder="Australia" />
          </Field>
        </div>
      </Card>

      {/* Localisation */}
      <Card title="Localisation" icon={Globe2}>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Timezone">
            <select className={sel} value={f("timezone") || "Australia/Sydney"} onChange={set("timezone")}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>
          <Field label="Default Currency">
            <select className={sel} value={f("defaultCurrency") || "AUD"} onChange={set("defaultCurrency")}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Default Language">
            <select className={sel} value={f("defaultLanguage") || "en"} onChange={set("defaultLanguage")}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      {/* Bank Info */}
      <Card title="Bank Information" icon={Banknote}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bank Name">
            <input className={inp} value={f("bankName")} onChange={set("bankName")} placeholder="Commonwealth Bank" />
          </Field>
          <Field label="Account Name">
            <input className={inp} value={f("bankAccName")} onChange={set("bankAccName")} placeholder="Edubee International Pty Ltd" />
          </Field>
          <Field label="BSB">
            <input className={inp} value={f("bankBsb")} onChange={set("bankBsb")} placeholder="062-000" />
          </Field>
          <Field label="Account Number">
            <input className={inp} value={f("bankAccNumber")} onChange={set("bankAccNumber")} placeholder="12345678" />
          </Field>
          <Field label="SWIFT Code">
            <input className={inp} value={f("bankSwift")} onChange={set("bankSwift")} placeholder="CTBAAU2S" />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end pb-6">
        <button
          onClick={handleSave}
          disabled={mutation.isPending}
          className="h-10 px-6 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
          style={{ background: "var(--e-orange)" }}
        >
          {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </button>
      </div>
    </div>
  );
}
