import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Plus, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DualPriceDisplay } from "@/components/public/dual-price-display";
import { useDisplayCurrency } from "@/context/DisplayCurrencyContext";
import DatePickerInput from "@/components/shared/DatePickerInput";
import SignaturePad from "@/components/shared/SignaturePad";
import { type PublicProgram, getLocalizedName } from "@/lib/program-utils";
import axios from "axios";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ───────────────────────────────────────────────────────────────────
type Adult = {
  firstName: string; lastName: string; relationship: string;
  dateOfBirth: string; nationality: string; passportNumber: string;
  phone: string; email: string; whatsapp: string; lineId: string;
  isEmergencyContact: boolean;
};

// Child now includes full student detail fields
type Child = {
  firstName: string; lastName: string;
  dateOfBirth: string; gender: string;
  nationality: string; passportNumber: string; passportExpiry: string;
  grade: string; enrollmentSpotId: string;
  schoolName: string; englishLevel: string;
  medicalConditions: string; dietaryRequirements: string; specialNeeds: string;
};

// Main applicant: contact info only (no student detail fields)
type MainApplicant = {
  firstName: string; lastName: string;
  fullNameNative: string; englishName: string;
  phone: string; whatsapp: string; lineId: string;
};

const mkApplicant = (): MainApplicant => ({
  firstName: "", lastName: "", fullNameNative: "", englishName: "",
  phone: "", whatsapp: "", lineId: "",
});
const mkAdult = (): Adult => ({
  firstName: "", lastName: "", relationship: "", dateOfBirth: "", nationality: "",
  passportNumber: "", phone: "", email: "", whatsapp: "", lineId: "",
  isEmergencyContact: false,
});
const mkChild = (): Child => ({
  firstName: "", lastName: "",
  dateOfBirth: "", gender: "",
  nationality: "", passportNumber: "", passportExpiry: "",
  grade: "", enrollmentSpotId: "",
  schoolName: "", englishLevel: "",
  medicalConditions: "", dietaryRequirements: "", specialNeeds: "",
});

function calcAge(dob: string): number | null {
  if (!dob) return null;
  const b = new Date(dob), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() - b.getMonth() < 0 || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a >= 0 ? a : null;
}

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
function Inp({ value, onChange, placeholder, type = "text", disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition disabled:opacity-50" />
  );
}
function Sel({ value, onChange, children, disabled }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition disabled:opacity-50">
      {children}
    </select>
  );
}
function Fld({ label, required, error, children, span2 }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode; span2?: boolean;
}) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
function Section({ id, icon, title, subtitle, children, collapsible = false }: {
  id: string; icon: string; title: string; subtitle?: string; children: React.ReactNode; collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div id={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-6 py-4 text-left ${collapsible ? "cursor-pointer hover:bg-gray-50" : "cursor-default"}`}
      >
        <span className="text-2xl leading-none">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-gray-900 text-base block">{title}</span>
          {subtitle && <span className="text-xs text-gray-400 mt-0.5 block">{subtitle}</span>}
        </div>
        {collapsible && (open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />)}
      </button>
      {open && <div className="px-6 pb-6 space-y-4">{children}</div>}
    </div>
  );
}

// ─── Student Detail Fields (shared between child cards) ────────────────────
function StudentDetailFields({
  child, idx, upChild, selectedProgram, t,
}: {
  child: Child; idx: number;
  upChild: (i: number, k: keyof Child, v: string) => void;
  selectedProgram: PublicProgram | null;
  t: (key: string, opts?: object) => string;
}) {
  return (
    <>
      <div className="col-span-2 border-t border-gray-100 pt-3 mt-1">
        <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide mb-3">Student Details</p>
      </div>

      <Fld label={t("apply.dateOfBirth")} required>
        <div className="flex items-center gap-2">
          <DatePickerInput value={child.dateOfBirth} onChange={v => upChild(idx, "dateOfBirth", v)} className="flex-1" fromYear={1990} toYear={new Date().getFullYear()} />
          {calcAge(child.dateOfBirth) !== null && (
            <span className="text-sm text-gray-500 whitespace-nowrap">{t("apply.age", { age: calcAge(child.dateOfBirth) })}</span>
          )}
        </div>
      </Fld>

      <Fld label={t("apply.gender")} required>
        <Sel value={child.gender} onChange={v => upChild(idx, "gender", v)}>
          <option value="">Select…</option>
          <option value="male">{t("apply.male")}</option>
          <option value="female">{t("apply.female")}</option>
          <option value="other">{t("apply.other")}</option>
        </Sel>
      </Fld>

      <Fld label={t("apply.nationality")} required>
        <Inp value={child.nationality} onChange={v => upChild(idx, "nationality", v)} placeholder="e.g. Korean" />
      </Fld>

      <Fld label={t("apply.englishLevel")} required>
        <Sel value={child.englishLevel} onChange={v => upChild(idx, "englishLevel", v)}>
          <option value="">Select…</option>
          {["Beginner", "Elementary", "Pre-Intermediate", "Intermediate", "Upper-Intermediate", "Advanced", "Native"].map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </Sel>
      </Fld>

      <Fld label={t("apply.passportNumber")}>
        <Inp value={child.passportNumber} onChange={v => upChild(idx, "passportNumber", v)} placeholder="e.g. M12345678" />
      </Fld>

      <Fld label={t("apply.passportExpiry")}>
        <DatePickerInput value={child.passportExpiry} onChange={v => upChild(idx, "passportExpiry", v)} fromYear={new Date().getFullYear()} toYear={new Date().getFullYear() + 20} />
      </Fld>

      <Fld label={t("apply.grade")} required>
        {selectedProgram?.spotSummary ? (
          <Sel value={child.enrollmentSpotId} onChange={id => {
            upChild(idx, "enrollmentSpotId", id);
            const g = selectedProgram.spotSummary!.grades.find(x => x.id === id);
            if (g) upChild(idx, "grade", g.label);
          }}>
            <option value="">Select grade…</option>
            {selectedProgram.spotSummary.grades.map(g => (
              <option key={g.id} value={g.id} disabled={g.status === "full"}>
                {g.status === "full" ? `${g.label} (Full)` : `${g.label} (${g.available} spots)`}
              </option>
            ))}
          </Sel>
        ) : (
          <Inp value={child.grade} onChange={v => upChild(idx, "grade", v)} placeholder="e.g. Grade 8" />
        )}
      </Fld>

      <Fld label={t("apply.schoolName")}>
        <Inp value={child.schoolName} onChange={v => upChild(idx, "schoolName", v)} placeholder="e.g. Seoul Middle School" />
      </Fld>

      <Fld label={t("apply.medicalConditions")} span2>
        <Inp value={child.medicalConditions} onChange={v => upChild(idx, "medicalConditions", v)} placeholder="Any allergies, medications, or conditions…" />
      </Fld>

      <Fld label={t("apply.dietaryRequirements")} span2>
        <Inp value={child.dietaryRequirements} onChange={v => upChild(idx, "dietaryRequirements", v)} placeholder="Vegetarian, halal, etc." />
      </Fld>

      <Fld label={t("apply.specialNeeds")} span2>
        <Inp value={child.specialNeeds} onChange={v => upChild(idx, "specialNeeds", v)} placeholder="Any additional support needed…" />
      </Fld>
    </>
  );
}

// ─── Markdown → HTML ─────────────────────────────────────────────────────────
function mdToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3 class='font-semibold text-base mt-3 mb-1 text-gray-900'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class='font-bold text-lg mt-4 mb-1 text-gray-900'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class='font-bold text-xl mt-5 mb-2 text-gray-900'>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/^---$/gm, "<hr class='border-gray-200 my-3'>")
    .replace(/^- (.+)$/gm, "<li class='ml-5 list-disc'>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li class='ml-5 list-decimal'>$2</li>")
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  formInfo: { id: string; name: string; description: string | null };
  programs: PublicProgram[];
  defaultProgramId?: string;
  partnerCode?: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CampApplicationFullPage({ formInfo, programs, defaultProgramId, partnerCode }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { displayCurrency } = useDisplayCurrency();
  const topRef = useRef<HTMLDivElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Form state ──
  const [programId, setProgramId] = useState(defaultProgramId || "");
  const [packageId, setPackageId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [howHeard, setHowHeard] = useState("");
  const [refCode, setRefCode] = useState(partnerCode || "");
  const [specialRequests, setSpecialRequests] = useState("");
  const [applicant, setApplicant] = useState<MainApplicant>(mkApplicant());
  const [adults, setAdults] = useState<Adult[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [signatureDate, setSignatureDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [termsContent, setTermsContent] = useState<string | null>(null);
  const [termsLang, setTermsLang] = useState<string | null>(null);

  const selectedProgram = programs.find(p => p.id === programId) || null;
  const selectedPackage = selectedProgram?.packages.find(p => p.id === packageId) || null;

  useEffect(() => { if (defaultProgramId) setProgramId(defaultProgramId); }, [defaultProgramId]);
  useEffect(() => {
    if (selectedProgram?.startDate) setStartDate(selectedProgram.startDate);
    else if (programId) setStartDate("");
  }, [programId, selectedProgram?.startDate]);

  // Fetch terms content from API
  useEffect(() => {
    if (!formInfo?.id) return;
    // We need the slug — formInfo has an id, look up the slug or pass it
    const slug = window.location.pathname.split("/").filter(Boolean).pop() ?? "";
    axios.get(`${BASE}/api/public/form/${slug}/terms?lang=${lang}`)
      .then(r => {
        setTermsContent(r.data.content ?? null);
        setTermsLang(r.data.language ?? null);
      })
      .catch(() => { /* no terms configured yet */ });
  }, [formInfo?.id, lang]);

  function upApplicant<K extends keyof MainApplicant>(k: K, v: MainApplicant[K]) {
    setApplicant(p => ({ ...p, [k]: v }));
  }
  function upAdult<K extends keyof Adult>(i: number, k: K, v: Adult[K]) {
    setAdults(a => a.map((x, j) => j === i ? { ...x, [k]: v } : x));
  }
  function upChild<K extends keyof Child>(i: number, k: K, v: Child[K]) {
    setChildren(c => c.map((x, j) => j === i ? { ...x, [k]: v } : x));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!programId) e.programId = t("common.required");
    if (!applicant.firstName) e.firstName = t("common.required");
    if (!applicant.lastName) e.lastName = t("common.required");
    if (!applicant.phone) e.phone = t("common.required");
    if (!emergencyContactName.trim()) e.emergencyContactName = t("common.required");
    if (!emergencyContactPhone.trim()) e.emergencyContactPhone = t("common.required");
    if (!termsAccepted) e.terms = "Please read and accept the Terms & Conditions.";
    if (!signatureImage) e.signatureName = "Please draw your signature above.";
    if (!signatureDate) e.signatureDate = t("common.required");
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const firstKey = Object.keys(e)[0];
      document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const participants = [
        {
          participantType: "primary_student",
          firstName: applicant.firstName, lastName: applicant.lastName,
          fullName: `${applicant.firstName} ${applicant.lastName.toUpperCase()}`.trim(),
          fullNameNative: applicant.fullNameNative || undefined,
          englishName: applicant.englishName || undefined,
          phone: applicant.phone || undefined,
          whatsapp: applicant.whatsapp || undefined,
          lineId: applicant.lineId || undefined,
        },
        ...adults.map(a => ({
          participantType: "adult" as const,
          firstName: a.firstName, lastName: a.lastName,
          fullName: `${a.firstName} ${a.lastName.toUpperCase()}`.trim(),
          dateOfBirth: a.dateOfBirth || undefined,
          nationality: a.nationality || undefined,
          passportNumber: a.passportNumber || undefined,
          relationshipToStudent: a.relationship || undefined,
          isEmergencyContact: a.isEmergencyContact,
          email: a.email || undefined,
          phone: a.phone || undefined,
          whatsapp: a.whatsapp || undefined,
          lineId: a.lineId || undefined,
        })),
        ...children.map(c => ({
          participantType: "child" as const,
          firstName: c.firstName, lastName: c.lastName,
          fullName: `${c.firstName} ${c.lastName.toUpperCase()}`.trim(),
          dateOfBirth: c.dateOfBirth || undefined,
          gender: c.gender || undefined,
          nationality: c.nationality || undefined,
          passportNumber: c.passportNumber || undefined,
          passportExpiry: c.passportExpiry || undefined,
          grade: c.grade || undefined,
          enrollmentSpotId: c.enrollmentSpotId || undefined,
          schoolName: c.schoolName || undefined,
          englishLevel: c.englishLevel || undefined,
          medicalConditions: c.medicalConditions || undefined,
          dietaryRequirements: c.dietaryRequirements || undefined,
          specialNeeds: c.specialNeeds || undefined,
        })),
      ];
      const { data } = await axios.post(`${BASE}/api/public/applications`, {
        packageGroupId: programId,
        packageId: packageId || undefined,
        preferredStartDate: startDate || undefined,
        referralSource: howHeard || undefined,
        referralAgentCode: refCode || undefined,
        primaryLanguage: lang,
        specialRequests: specialRequests || undefined,
        termsAccepted: true,
        signatureImage: signatureImage ?? undefined,
        signatureDate: signatureDate,
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactPhone: emergencyContactPhone || undefined,
        participants,
      });
      setSubmitted(data.applicationNumber);
      topRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string } } };
      setErrors({ submit: axErr.response?.data?.message || "Submission failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t("apply.successTitle")}</h2>
          <p className="text-3xl font-mono font-bold text-orange-500 my-4">{submitted}</p>
          <p className="text-gray-500 text-sm">{t("apply.successMessage", { number: submitted })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Sticky Header */}
      <div ref={topRef} className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">{formInfo.name}</h1>
            {formInfo.description && <p className="text-xs text-gray-500 mt-0.5">{formInfo.description}</p>}
          </div>
          <img src={`${BASE}/edubee-logo.svg`} alt="Edubee" className="h-8 opacity-80"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

          {/* ── Section 1: Program ── */}
          <Section id="sec-program" icon="📋" title={t("apply.programSelection")}>
            <div id="field-programId">
              <Fld label={t("nav.programs")} required error={errors.programId}>
                <Sel value={programId} onChange={v => { setProgramId(v); setPackageId(""); }}>
                  <option value="">{t("apply.selectProgram")}</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{getLocalizedName(p, lang)} — {p.location} {p.countryFlag}</option>
                  ))}
                </Sel>
              </Fld>
            </div>

            {selectedProgram && selectedProgram.packages.length > 0 && (
              <Fld label="Package">
                <Sel value={packageId} onChange={setPackageId}>
                  <option value="">{t("apply.selectPackage")}</option>
                  {selectedProgram.packages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — {pkg.durationDays} {t("programs.days")}
                      {pkg.displayFormatted ? ` (${pkg.displayFormatted})` : ""}
                    </option>
                  ))}
                </Sel>
              </Fld>
            )}

            {selectedPackage && selectedPackage.displayPrice != null && (
              <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] text-orange-600 uppercase tracking-wide font-semibold mb-1">Selected Package</p>
                  <p className="text-sm font-semibold text-gray-900 mb-1">{selectedPackage.name} · {selectedPackage.durationDays} {t("programs.days")}</p>
                  <DualPriceDisplay localAmount={selectedPackage.displayPrice} localCurrency={selectedPackage.displayCurrency} countryCode={selectedProgram?.countryCode} size="detail" />
                </div>
                {selectedProgram && displayCurrency !== selectedProgram.primaryCurrency && (
                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 max-w-[130px] leading-relaxed">
                    💱 Billing in {selectedProgram.primaryCurrency}
                  </p>
                )}
              </div>
            )}

            {selectedProgram?.startDate ? (
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 flex items-center gap-3">
                <span className="text-xl">📅</span>
                <div>
                  <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide mb-0.5">Program Dates (Fixed)</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedProgram.startDate}{selectedProgram.endDate ? ` – ${selectedProgram.endDate}` : ""}
                  </p>
                </div>
              </div>
            ) : (
              <Fld label={t("apply.preferredStartDate")}>
                <DatePickerInput value={startDate} onChange={setStartDate} fromYear={new Date().getFullYear()} toYear={new Date().getFullYear() + 5} />
              </Fld>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Fld label={t("apply.howHeard")}>
                <Sel value={howHeard} onChange={setHowHeard}>
                  <option value="">Select…</option>
                  {["Instagram", "Facebook", "Google", "YouTube", "Referral", "Education Fair", "School", "Other"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Sel>
              </Fld>
              <Fld label={t("apply.referralCode")}>
                <Inp value={refCode} onChange={setRefCode} placeholder="e.g. AGENT-KIM" />
              </Fld>
            </div>

            <Fld label={t("apply.specialRequests")}>
              <textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} rows={2}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 resize-none"
                placeholder="Any special requests or notes…" />
            </Fld>
          </Section>

          {/* ── Section 2: Main Applicant ── */}
          <Section id="sec-applicant" icon="👤" title="Main Applicant Information"
            subtitle="The person submitting this application (parent / guardian / student)">
            <div className="grid grid-cols-2 gap-4">
              <div id="field-firstName">
                <Fld label={t("apply.firstName")} required error={errors.firstName}>
                  <Inp value={applicant.firstName} onChange={v => upApplicant("firstName", v)} placeholder="e.g. Ji-won" />
                </Fld>
              </div>
              <div id="field-lastName">
                <Fld label={t("apply.lastName")} required error={errors.lastName}>
                  <Inp value={applicant.lastName} onChange={v => upApplicant("lastName", v)} placeholder="e.g. Kim" />
                </Fld>
              </div>
              <Fld label={t("apply.nativeName")}>
                <Inp value={applicant.fullNameNative} onChange={v => upApplicant("fullNameNative", v)} placeholder="김지원" />
              </Fld>
              <Fld label={t("apply.englishName")}>
                <Inp value={applicant.englishName} onChange={v => upApplicant("englishName", v)} placeholder="e.g. Kevin" />
              </Fld>
              <div id="field-phone">
                <Fld label={t("apply.phone")} required error={errors.phone}>
                  <Inp value={applicant.phone} onChange={v => upApplicant("phone", v)} placeholder="+82 10-0000-0000" />
                </Fld>
              </div>
              <Fld label={t("apply.whatsapp")}>
                <Inp value={applicant.whatsapp} onChange={v => upApplicant("whatsapp", v)} placeholder="+82 10-0000-0000" />
              </Fld>
              <Fld label="LINE ID" span2>
                <Inp value={applicant.lineId} onChange={v => upApplicant("lineId", v)} placeholder="@lineid" />
              </Fld>
            </div>
          </Section>

          {/* ── Section 3: Students (Children) ── */}
          <Section id="sec-children" icon="🎓" title="Additional Children (Students)"
            subtitle="Add each student attending the program" collapsible>
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">Each student's full details are required for enrollment.</p>
                {children.length < 5 && (
                  <Button type="button" size="sm" variant="outline" className="gap-1 rounded-full text-xs h-7 px-3 shrink-0"
                    onClick={() => setChildren([...children, mkChild()])}>
                    <Plus className="w-3 h-3" /> Add Student
                  </Button>
                )}
              </div>

              {children.length === 0 && (
                <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-400">No students added yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Click "Add Student" to add a student's information.</p>
                </div>
              )}

              {children.map((child, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">Student {idx + 1}</span>
                    <button type="button" onClick={() => setChildren(children.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Fld label={t("apply.firstName")} required>
                      <Inp value={child.firstName} onChange={v => upChild(idx, "firstName", v)} placeholder="e.g. Ji-won" />
                    </Fld>
                    <Fld label={t("apply.lastName")} required>
                      <Inp value={child.lastName} onChange={v => upChild(idx, "lastName", v)} placeholder="e.g. Kim" />
                    </Fld>
                    <StudentDetailFields child={child} idx={idx} upChild={upChild} selectedProgram={selectedProgram} t={t} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Section 4: Accompanying Adults ── */}
          <Section id="sec-adults" icon="👨‍👩‍👧" title={t("apply.adultsLabel")}
            subtitle="Optional — parents or guardians accompanying the student" collapsible>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">Add adults travelling with the student(s).</p>
              {adults.length < 4 && (
                <Button type="button" size="sm" variant="outline" className="gap-1 rounded-full text-xs h-7 px-3 shrink-0"
                  onClick={() => setAdults([...adults, mkAdult()])}>
                  <Plus className="w-3 h-3" /> {t("apply.addAdult")}
                </Button>
              )}
            </div>

            {adults.length === 0 && (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
                <p className="text-sm text-gray-400">No accompanying adults added.</p>
              </div>
            )}

            {adults.map((adult, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl p-4 mb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Adult {idx + 1}</span>
                  <button type="button" onClick={() => setAdults(adults.filter((_, i) => i !== idx))}
                    className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Fld label={t("apply.firstName")} required><Inp value={adult.firstName} onChange={v => upAdult(idx, "firstName", v)} /></Fld>
                  <Fld label={t("apply.lastName")} required><Inp value={adult.lastName} onChange={v => upAdult(idx, "lastName", v)} /></Fld>
                  <Fld label={t("apply.relationship")} required>
                    <Sel value={adult.relationship} onChange={v => upAdult(idx, "relationship", v)}>
                      <option value="">Select…</option>
                      {["Parent", "Guardian", "Sibling", "Grandparent", "Teacher", "Other"].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </Sel>
                  </Fld>
                  <Fld label={t("apply.nationality")}><Inp value={adult.nationality} onChange={v => upAdult(idx, "nationality", v)} /></Fld>
                  <Fld label={t("apply.phone")} required><Inp value={adult.phone} onChange={v => upAdult(idx, "phone", v)} /></Fld>
                  <Fld label={t("apply.email")}><Inp type="email" value={adult.email} onChange={v => upAdult(idx, "email", v)} /></Fld>
                  <Fld label={t("apply.whatsapp")}><Inp value={adult.whatsapp} onChange={v => upAdult(idx, "whatsapp", v)} /></Fld>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={adult.isEmergencyContact}
                    onChange={e => upAdult(idx, "isEmergencyContact", e.target.checked)} className="rounded" />
                  {t("apply.isEmergencyContact")}
                </label>
              </div>
            ))}
          </Section>

          {/* ── Section 5: Emergency Contact ── */}
          <Section id="sec-emergency" icon="🚨" title="Emergency Contact"
            subtitle="Person to contact in case of emergency (if different from main applicant)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Fld label="Emergency Contact Name" required error={errors.emergencyContactName}>
                <Inp
                  value={emergencyContactName}
                  onChange={setEmergencyContactName}
                  placeholder="Full name"
                />
              </Fld>
              <Fld label="Emergency Contact Phone" required error={errors.emergencyContactPhone}>
                <Inp
                  value={emergencyContactPhone}
                  onChange={setEmergencyContactPhone}
                  placeholder="+82 10-1234-5678"
                />
              </Fld>
            </div>
          </Section>

          {/* ── Section 6: Terms & Conditions ── */}
          <Section id="sec-terms" icon="📄" title="Terms & Conditions">

            {/* Terms content box */}
            <div className="border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
              <div className="h-72 overflow-y-auto px-5 py-4 text-sm text-gray-700 leading-relaxed">
                {termsContent ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: mdToHtml(termsContent) }}
                  />
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 text-base">Camp Participation Agreement</h3>
                    <p className="text-gray-400 italic text-xs">
                      Terms & Conditions content will be provided by the organiser.
                      Please contact us if you have any questions before signing.
                    </p>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200 bg-white px-5 py-2 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 italic">↑ Scroll to read the full Terms & Conditions</span>
                {termsLang && (
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-mono">{termsLang.toUpperCase()}</span>
                )}
              </div>
            </div>

            {/* Single agreement checkbox */}
            <div id="field-terms">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-orange-500 shrink-0" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                  I have read, understood, and agree to the <strong>Terms & Conditions</strong> and <strong>Privacy Policy</strong> above, on behalf of myself and all participants listed in this application.<span className="text-red-500 ml-0.5">*</span>
                </span>
              </label>
              {errors.terms && <p className="text-xs text-red-600 mt-1 ml-7">{errors.terms}</p>}
            </div>

            {/* Signature Pad */}
            <div className="border border-gray-200 rounded-xl p-5 bg-white space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Signature</p>

              <div id="field-signatureName">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Draw Your Signature <span className="text-red-500">*</span>
                </label>
                <SignaturePad
                  value={signatureImage}
                  onChange={setSignatureImage}
                  height={160}
                  label=""
                />
                {errors.signatureName && <p className="text-xs text-red-600 mt-1">{errors.signatureName}</p>}
              </div>

              <div id="field-signatureDate">
                <Fld label="Date" required error={errors.signatureDate}>
                  <DatePickerInput
                    value={signatureDate}
                    onChange={setSignatureDate}
                    fromYear={new Date().getFullYear() - 1}
                    toYear={new Date().getFullYear() + 1}
                  />
                </Fld>
              </div>
            </div>

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errors.submit}</div>
            )}

            <Button type="submit" size="lg" disabled={submitting} className="w-full rounded-xl h-12 text-base font-semibold">
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" />{t("apply.submitting")}</>
              ) : t("apply.submitApplication")}
            </Button>
          </Section>

        </div>
      </form>
    </div>
  );
}
