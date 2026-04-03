import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Check, Eye, EyeOff, Loader2, CheckCircle2, Users, Building2,
  GraduationCap, Briefcase, Handshake, Car, Home, MapPin, Shield,
  ChevronRight, ChevronLeft,
} from "lucide-react";
import logoImg from "@assets/edubee_logo_800x310b_1773796715563.png";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Step = 1 | 2 | 3 | "success";
type AccountType = "Agent" | "School" | "Student" | "Provider" | "Organisation";
type Plan = "LITE" | "PLUS" | "BUSINESS" | "ENTERPRISE";

interface FormState {
  orgName: string;
  phone: string;
  website: string;
  address: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  accountType: AccountType | "";
  plan: Plan;
  serviceModules: string[];
}

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "Agent",        label: "Education Agent",      icon: Users,         desc: "Study abroad agency or sub-agent" },
  { value: "School",       label: "School / Institution", icon: Building2,     desc: "School or educational institution" },
  { value: "Student",      label: "Student",              icon: GraduationCap, desc: "Individual student account" },
  { value: "Provider",     label: "Provider / Partner",   icon: Handshake,     desc: "Service provider or business partner" },
  { value: "Organisation", label: "Organisation",         icon: Briefcase,     desc: "General corporate entity" },
];

const SERVICE_MODULES: { value: string; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "study_abroad",  label: "Study Abroad Management", icon: GraduationCap, desc: "School applications & visa tracking" },
  { value: "pickup",        label: "Airport Pickup",          icon: Car,           desc: "Arrival pickup coordination" },
  { value: "accommodation", label: "Accommodation",           icon: Home,          desc: "Homestay & rental placement" },
  { value: "internship",    label: "Internship & Employment", icon: Briefcase,     desc: "Job placement & internship" },
  { value: "settlement",    label: "Settlement Service",      icon: MapPin,        desc: "Arrival orientation & checklist" },
  { value: "guardian",      label: "Guardian Service",        icon: Shield,        desc: "Student guardian management" },
];

const INPUT_CLS = `w-full h-10 px-3 text-sm rounded-lg border border-[#E8E6E2] bg-white text-[#1C1917]
  placeholder:text-[#A8A29E] outline-none transition-all
  focus:border-(--e-orange) focus:shadow-[0_0_0_3px_var(--e-orange-ring)]`;
const INPUT_ERR = `w-full h-10 px-3 text-sm rounded-lg border border-[#DC2626] bg-white text-[#1C1917]
  placeholder:text-[#A8A29E] outline-none transition-all
  focus:border-[#DC2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.12)]`;
const LABEL_CLS = "block text-xs font-medium text-[#57534E] mb-1";
const ERR_CLS = "mt-1 text-xs text-[#DC2626]";
const SEC_LABEL = "text-xs font-medium uppercase tracking-[0.05em] text-[#57534E] mb-2";
const BTN_PRIMARY = `inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-(--e-orange)
  hover:bg-(--e-orange-hover) hover:-translate-y-px hover:shadow-[0_4px_12px_var(--e-orange-shadow-25)]
  disabled:opacity-65 disabled:cursor-not-allowed disabled:transform-none transition-all`;
const BTN_SECONDARY = `inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-[#1C1917]
  bg-white border border-[#E8E6E2] hover:border-[#A8A29E] hover:bg-[#FAFAF9] transition-all`;

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className={ERR_CLS}>{msg}</p>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className={SEC_LABEL}>{children}</p>
      <div className="h-px bg-[#E8E6E2]" />
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: "Organisation Info" },
    { n: 2, label: "Account Type" },
    { n: 3, label: "Service Plan" },
  ];
  const curr = typeof current === "number" ? current : 3;

  return (
    <div className="flex items-center mb-8">
      {steps.map((s, i) => {
        const done = s.n < curr;
        const active = s.n === curr;
        return (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                ${done ? "bg-(--e-orange) text-white" : active ? "border-2 border-(--e-orange) text-(--e-orange) bg-white" : "border-2 border-[#E8E6E2] text-[#A8A29E] bg-white"}`}>
                {done ? <Check className="w-4 h-4" /> : s.n}
              </div>
              <span className={`mt-1 text-xs font-medium whitespace-nowrap ${active ? "text-(--e-orange)" : done ? "text-[#57534E]" : "text-[#A8A29E]"}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 transition-all ${done ? "bg-(--e-orange)" : "bg-[#E8E6E2]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Register() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>({
    orgName: "", phone: "", website: "", address: "",
    firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
    accountType: "", plan: "PLUS", serviceModules: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ firstName: string; orgName: string; plan: string } | null>(null);

  function set(key: keyof FormState, val: string) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  function toggleModule(val: string) {
    setForm(f => ({
      ...f,
      serviceModules: f.serviceModules.includes(val)
        ? f.serviceModules.filter(m => m !== val)
        : [...f.serviceModules, val],
    }));
  }

  async function goNext1() {
    const errs: Record<string, string> = {};
    if (!form.orgName.trim())   errs.orgName   = "Agency name is required.";
    if (!form.phone.trim())     errs.phone     = "Phone number is required.";
    if (!form.firstName.trim()) errs.firstName = "First name is required.";
    if (!form.lastName.trim())  errs.lastName  = "Last name is required.";
    if (!form.email.trim())     errs.email     = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Please enter a valid email address.";
    if (!form.password)         errs.password  = "Password is required.";
    else if (form.password.length < 8) errs.password = "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match.";

    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      const res = await fetch(`${BASE}/api/auth/check-email?email=${encodeURIComponent(form.email)}`);
      const data = await res.json();
      if (!data.available) {
        setErrors({ email: "This email is already registered. Please log in or use a different email." });
        return;
      }
    } catch {
      setErrors({ email: "Could not verify email. Please try again." });
      return;
    }

    setErrors({});
    setStep(2);
  }

  function goNext2() {
    if (!form.accountType) {
      setErrors({ accountType: "Please select an account type to continue." });
      return;
    }
    setErrors({});
    setStep(3);
  }

  async function submit() {
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisation: {
            name: form.orgName,
            phone_number: form.phone,
            organization_url: form.website,
            address_line_1: form.address,
          },
          user: {
            first_name: form.firstName,
            last_name: form.lastName,
            email: form.email,
            password: form.password,
          },
          account: {
            account_type: form.accountType,
            plan: form.plan,
          },
          service_modules: form.serviceModules,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessData({ firstName: form.firstName, orgName: form.orgName, plan: form.plan });
        setStep("success");
      } else if (data.error === "EMAIL_ALREADY_EXISTS") {
        setErrors({ email: data.message });
        setStep(1);
      } else {
        setErrors({ submit: data.message || "An unexpected error occurred." });
      }
    } catch {
      setErrors({ submit: "Network error. Please check your connection and try again." });
    } finally {
      setIsLoading(false);
    }
  }

  const showPlanSection = form.accountType === "Agent" || form.accountType === "Organisation";

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Left brand panel ── */}
      <div className="hidden md:flex flex-col justify-between w-[40%] lg:w-[38%] min-h-screen p-10 sticky top-0 h-screen"
        style={{ background: "var(--e-orange)" }}>
        <div>
          <div className="flex items-center gap-3 mb-8">
            <img src={logoImg} alt="Edubee" className="h-12 w-auto object-contain"
              style={{ filter: "brightness(0) invert(1)" }} />
          </div>
          <h1 className="text-white text-2xl font-bold leading-snug mb-3">
            All-in-One Platform for Study Abroad Agencies
          </h1>
          <p className="text-white/90 text-sm leading-relaxed">
            Manage students, schools, visas, and commissions — all in one place.
          </p>
        </div>

        <div className="space-y-3">
          {[
            "Student & School Management",
            "Automated Commission Calculation",
            "HQ & Branch Office Integration",
            "Visa & Document Tracking",
          ].map(f => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-white" />
              </div>
              <span className="text-white text-sm">{f}</span>
            </div>
          ))}
          <p className="text-white/75 text-xs pt-2">
            Trusted by study abroad agencies in Australia, Korea, Japan & Thailand
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-[620px] mx-auto px-6 md:px-12 py-10">

          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2 mb-6">
            <img src={logoImg} alt="Edubee" className="h-8 w-auto object-contain" />
          </div>

          {step === "success" && successData ? (
            /* ── Success screen ── */
            <div className="flex flex-col items-center text-center py-12">
              <img src={logoImg} alt="Edubee" className="h-14 w-auto object-contain mb-6" />
              <CheckCircle2 className="w-16 h-16 mb-5" style={{ color: "#16A34A" }} />
              <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Account Created Successfully!</h2>
              <p className="text-base text-[#57534E] mb-1">
                Welcome to Edubee CRM, <strong>{successData.firstName}</strong>!
              </p>
              <p className="text-sm text-[#57534E] mb-8 max-w-md">
                Your agency <strong>"{successData.orgName}"</strong> has been set up with the{" "}
                <strong>{successData.plan}</strong> plan. You're all set to start managing your study abroad business.
              </p>
              <button onClick={() => setLocation("/login")} className={BTN_PRIMARY} style={{ minWidth: 200 }}>
                Go to Login
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-[#1C1917] mb-1">Create Your Free Account</h2>
              <p className="text-sm text-[#57534E] mb-6">Get started with Edubee CRM today — no credit card required.</p>

              <StepIndicator current={step} />

              {/* ── STEP 1 ── */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <SectionLabel>Agency Information</SectionLabel>
                    <div className="space-y-4">
                      <div>
                        <label className={LABEL_CLS}>Agency Name *</label>
                        <input value={form.orgName} onChange={e => set("orgName", e.target.value)}
                          placeholder="e.g. Global Study Agency"
                          className={errors.orgName ? INPUT_ERR : INPUT_CLS} />
                        <FieldError msg={errors.orgName} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Phone Number *</label>
                        <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
                          placeholder="+61 4xx xxx xxx"
                          className={errors.phone ? INPUT_ERR : INPUT_CLS} />
                        <FieldError msg={errors.phone} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Website URL</label>
                        <input type="url" value={form.website} onChange={e => set("website", e.target.value)}
                          placeholder="https://"
                          className={INPUT_CLS} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Address</label>
                        <input value={form.address} onChange={e => set("address", e.target.value)}
                          placeholder="Street address"
                          className={INPUT_CLS} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Your Details</SectionLabel>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={LABEL_CLS}>First Name *</label>
                          <input value={form.firstName} onChange={e => set("firstName", e.target.value)}
                            placeholder="John"
                            className={errors.firstName ? INPUT_ERR : INPUT_CLS} />
                          <FieldError msg={errors.firstName} />
                        </div>
                        <div>
                          <label className={LABEL_CLS}>Last Name *</label>
                          <input value={form.lastName} onChange={e => set("lastName", e.target.value)}
                            placeholder="Smith"
                            className={errors.lastName ? INPUT_ERR : INPUT_CLS} />
                          <FieldError msg={errors.lastName} />
                        </div>
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Work Email *</label>
                        <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                          placeholder="name@agency.com"
                          className={errors.email ? INPUT_ERR : INPUT_CLS} />
                        <FieldError msg={errors.email} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Password *</label>
                        <div className="relative">
                          <input type={showPw ? "text" : "password"}
                            value={form.password} onChange={e => set("password", e.target.value)}
                            placeholder="Min. 8 characters"
                            className={`${errors.password ? INPUT_ERR : INPUT_CLS} pr-10`} />
                          <button type="button" onClick={() => setShowPw(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#57534E] transition-colors">
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <FieldError msg={errors.password} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Confirm Password *</label>
                        <div className="relative">
                          <input type={showConfirm ? "text" : "password"}
                            value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)}
                            placeholder="Re-enter password"
                            className={`${errors.confirmPassword ? INPUT_ERR : INPUT_CLS} pr-10`} />
                          <button type="button" onClick={() => setShowConfirm(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#57534E] transition-colors">
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <FieldError msg={errors.confirmPassword} />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button onClick={goNext1} className={BTN_PRIMARY}>
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-center text-[13px] text-[#57534E]">
                    Already have an account?{" "}
                    <Link href="/login" className="text-(--e-orange) font-medium hover:underline">Log in →</Link>
                  </p>
                </div>
              )}

              {/* ── STEP 2 ── */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-[#1C1917] mb-1">What best describes your organisation?</h3>
                    <p className="text-sm text-[#57534E] mb-4">
                      Your account type determines the features and workflows available to you.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {ACCOUNT_TYPES.map((t, i) => {
                        const Icon = t.icon;
                        const selected = form.accountType === t.value;
                        const isLast = i === ACCOUNT_TYPES.length - 1 && ACCOUNT_TYPES.length % 2 !== 0;
                        return (
                          <div key={t.value} className={isLast ? "col-span-2 flex justify-center" : ""}>
                            <div
                              onClick={() => { set("accountType", t.value); setErrors({}); }}
                              className={`relative cursor-pointer rounded-xl p-5 border transition-all select-none w-full
                                ${isLast ? "max-w-[calc(50%-6px)]" : ""}
                                ${selected
                                  ? "bg-(--e-orange-lt) border-2 border-(--e-orange)"
                                  : "bg-white border-[1.5px] border-[#E8E6E2] hover:bg-[#FAFAF9] hover:border-[#A8A29E] hover:-translate-y-0.5 hover:shadow-sm"
                                }`}
                            >
                              {selected && (
                                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-(--e-orange) flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              )}
                              <Icon className="w-7 h-7 mb-2" style={{ color: "var(--e-orange)" }} />
                              <p className="text-sm font-semibold text-[#1C1917]">{t.label}</p>
                              <p className="text-xs text-[#57534E] mt-0.5">{t.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <FieldError msg={errors.accountType} />
                  </div>

                  <div className="flex justify-between pt-2">
                    <button onClick={() => setStep(1)} className={BTN_SECONDARY}>
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button onClick={goNext2} disabled={!form.accountType} className={BTN_PRIMARY}>
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3 ── */}
              {step === 3 && (
                <div className="space-y-8">
                  {/* Plan selection */}
                  {showPlanSection && (
                    <div>
                      <h3 className="text-base font-semibold text-[#1C1917] mb-1">Choose Your Plan</h3>
                      <p className="text-sm text-[#57534E] mb-4">
                        All plans include a free trial. Upgrade or downgrade at any time.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {/* LITE */}
                        <PlanCard
                          plan="LITE" selected={form.plan === "LITE"}
                          onSelect={() => set("plan", "LITE")}
                          badge={{ label: "FREE", bg: "#16A34A", text: "#fff" }}
                          price="$0 / month"
                          features={[
                            { ok: true,  text: "Up to 50 students / month" },
                            { ok: true,  text: "10 MB storage" },
                            { ok: false, text: "School Database" },
                            { ok: false, text: "Remote Support" },
                          ]}
                          btnLabel="Get Started"
                          disabled={false}
                        />
                        {/* PLUS */}
                        <PlanCard
                          plan="PLUS" selected={form.plan === "PLUS"}
                          onSelect={() => set("plan", "PLUS")}
                          badge={{ label: "BETA FREE", bg: "var(--e-orange-lt)", text: "var(--e-orange)" }}
                          price={<><s className="text-[#A8A29E] font-normal">$9.90</s> $0 / month<br /><span className="text-xs font-normal text-(--e-orange)">Free during Beta</span></>}
                          features={[
                            { ok: true,  text: "Unlimited students" },
                            { ok: true,  text: "100 MB storage" },
                            { ok: false, text: "School Database" },
                            { ok: false, text: "Remote Support" },
                          ]}
                          btnLabel="Select Plan"
                          disabled={false}
                          popular
                        />
                        {/* BUSINESS */}
                        <PlanCard
                          plan="BUSINESS" selected={form.plan === "BUSINESS"}
                          onSelect={() => {}}
                          badge={{ label: "BUSINESS", bg: "#F4F3F1", text: "#57534E" }}
                          price="$19.90 / month"
                          features={[
                            { ok: true,  text: "Unlimited students" },
                            { ok: true,  text: "500 MB storage" },
                            { ok: true,  text: "School Database" },
                            { ok: false, text: "Remote Support" },
                          ]}
                          btnLabel="Coming Soon"
                          disabled
                        />
                        {/* ENTERPRISE */}
                        <PlanCard
                          plan="ENTERPRISE" selected={form.plan === "ENTERPRISE"}
                          onSelect={() => {}}
                          badge={{ label: "ENTERPRISE", bg: "#F4F3F1", text: "#57534E" }}
                          price="$39.90 / month"
                          features={[
                            { ok: true, text: "Unlimited students" },
                            { ok: true, text: "1 GB storage" },
                            { ok: true, text: "School Database" },
                            { ok: true, text: "Remote Support" },
                          ]}
                          btnLabel="Contact Us"
                          disabled
                        />
                      </div>
                      <p className="text-xs text-[#57534E] text-center mt-3">
                        All prices are in AUD and exclude GST. LITE and PLUS plans available now. BUSINESS and ENTERPRISE coming soon.
                      </p>
                    </div>
                  )}

                  {/* Service modules */}
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="h-px flex-1 bg-[#E8E6E2]" />
                      <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#57534E] shrink-0">
                        Additional Service Modules
                      </span>
                      <div className="h-px flex-1 bg-[#E8E6E2]" />
                    </div>
                    <p className="text-sm text-[#57534E] text-center mb-4">
                      Select the services your agency offers. You can add or remove these after sign-up.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {SERVICE_MODULES.map(m => {
                        const Icon = m.icon;
                        const checked = form.serviceModules.includes(m.value);
                        return (
                          <div key={m.value} onClick={() => toggleModule(m.value)}
                            className={`relative cursor-pointer rounded-xl p-4 border transition-all select-none
                              ${checked
                                ? "bg-(--e-orange-lt) border-2 border-(--e-orange)"
                                : "bg-white border border-[#E8E6E2] hover:bg-[#FAFAF9]"
                              }`}
                          >
                            <div className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full border flex items-center justify-center transition-all
                              ${checked ? "bg-(--e-orange) border-(--e-orange)" : "border-[#E8E6E2] bg-white"}`}>
                              {checked && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <Icon className="w-5 h-5 mb-1.5" style={{ color: "var(--e-orange)" }} />
                            <p className="text-xs font-semibold text-[#1C1917] leading-snug">{m.label}</p>
                            <p className="text-[11px] text-[#A8A29E] mt-0.5 leading-snug">{m.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl border border-[#E8E6E2] p-5 bg-[#FAFAF9]">
                    <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#57534E] mb-3">Registration Summary</p>
                    <div className="space-y-2 text-sm">
                      <SummaryRow label="Agency" value={form.orgName} />
                      <SummaryRow label="Admin User" value={`${form.firstName} ${form.lastName} · ${form.email}`} />
                      <div className="flex gap-2 items-start">
                        <span className="text-[#A8A29E] w-28 shrink-0">Account Type</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-(--e-orange-lt) text-(--e-orange)">
                          {form.accountType}
                        </span>
                      </div>
                      {showPlanSection && (
                        <div className="flex gap-2 items-start">
                          <span className="text-[#A8A29E] w-28 shrink-0">Plan</span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#16A34A]">
                            {form.plan}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2 items-start">
                        <span className="text-[#A8A29E] w-28 shrink-0">Services</span>
                        {form.serviceModules.length === 0
                          ? <span className="text-[#A8A29E] text-xs">Basic services only</span>
                          : <div className="flex flex-wrap gap-1">
                              {form.serviceModules.map(m => {
                                const mod = SERVICE_MODULES.find(s => s.value === m);
                                return (
                                  <span key={m} className="px-2 py-0.5 rounded-full text-xs font-medium bg-(--e-orange-lt) text-(--e-orange)">
                                    {mod?.label ?? m}
                                  </span>
                                );
                              })}
                            </div>
                        }
                      </div>
                    </div>
                  </div>

                  {errors.submit && (
                    <p className="text-sm text-[#DC2626] text-center">{errors.submit}</p>
                  )}

                  <div className="flex justify-between pt-2">
                    <button onClick={() => setStep(2)} className={BTN_SECONDARY}>
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button onClick={submit} disabled={isLoading} className={`${BTN_PRIMARY} w-full max-w-[260px]`}>
                      {isLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating your account...</>
                        : "Create Account"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  plan, selected, onSelect, badge, price, features, btnLabel, disabled, popular,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
  badge: { label: string; bg: string; text: string };
  price: React.ReactNode;
  features: { ok: boolean; text: string }[];
  btnLabel: string;
  disabled: boolean;
  popular?: boolean;
}) {
  return (
    <div
      onClick={disabled ? undefined : onSelect}
      className={`relative rounded-xl border transition-all overflow-hidden
        ${disabled ? "opacity-65 cursor-not-allowed" : "cursor-pointer"}
        ${selected && !disabled ? "border-2 border-(--e-orange) bg-(--e-orange-lt) scale-[1.02]" : "border border-[#E8E6E2] bg-white hover:shadow-sm"}`}
    >
      {popular && (
        <div className="w-full py-1.5 text-center text-xs font-semibold text-white" style={{ background: "var(--e-orange)" }}>
          MOST POPULAR
        </div>
      )}
      {selected && !disabled && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-(--e-orange) flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <div className="p-4">
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold mb-2"
          style={{ background: badge.bg, color: badge.text }}>
          {badge.label}
        </span>
        <p className="text-lg font-bold text-[#1C1917] leading-tight mb-3">{price}</p>
        <div className="space-y-1.5 mb-4">
          {features.map(f => (
            <div key={f.text} className="flex items-center gap-2 text-xs">
              <span className={f.ok ? "text-[#16A34A]" : "text-[#A8A29E]"}>
                {f.ok ? "✓" : "✗"}
              </span>
              <span className={f.ok ? "text-[#1C1917]" : "text-[#A8A29E]"}>{f.text}</span>
            </div>
          ))}
        </div>
        <button
          disabled={disabled}
          onClick={e => { e.stopPropagation(); if (!disabled) onSelect(); }}
          className={`w-full py-2 rounded-lg text-xs font-semibold transition-all
            ${disabled
              ? "bg-[#F4F3F1] text-[#A8A29E] cursor-not-allowed"
              : selected
                ? "bg-(--e-orange) text-white"
                : "bg-white border border-[#E8E6E2] text-[#1C1917] hover:border-(--e-orange) hover:text-(--e-orange)"
            }`}
        >
          {btnLabel}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-[#A8A29E] w-28 shrink-0">{label}</span>
      <span className="text-[#1C1917] font-medium break-all">{value}</span>
    </div>
  );
}
