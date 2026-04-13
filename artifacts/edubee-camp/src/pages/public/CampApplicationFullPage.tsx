import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Plus, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DualPriceDisplay } from "@/components/public/dual-price-display";
import { useDisplayCurrency } from "@/context/DisplayCurrencyContext";
import DatePickerInput from "@/components/shared/DatePickerInput";
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
type Child = {
  firstName: string; lastName: string; dateOfBirth: string; gender: string;
  nationality: string; passportNumber: string; grade: string;
  enrollmentSpotId: string; medicalConditions: string;
};
type PrimaryStudent = {
  firstName: string; lastName: string; fullNameNative: string; englishName: string;
  dateOfBirth: string; gender: string; nationality: string; passportNumber: string;
  passportExpiry: string; grade: string; enrollmentSpotId: string; schoolName: string;
  englishLevel: string; medicalConditions: string; dietaryRequirements: string;
  specialNeeds: string; phone: string; whatsapp: string; lineId: string;
};

const mkStudent = (): PrimaryStudent => ({
  firstName:"",lastName:"",fullNameNative:"",englishName:"",dateOfBirth:"",gender:"",
  nationality:"",passportNumber:"",passportExpiry:"",grade:"",enrollmentSpotId:"",
  schoolName:"",englishLevel:"",medicalConditions:"",dietaryRequirements:"",
  specialNeeds:"",phone:"",whatsapp:"",lineId:"",
});
const mkAdult = (): Adult => ({
  firstName:"",lastName:"",relationship:"",dateOfBirth:"",nationality:"",
  passportNumber:"",phone:"",email:"",whatsapp:"",lineId:"",isEmergencyContact:false,
});
const mkChild = (): Child => ({
  firstName:"",lastName:"",dateOfBirth:"",gender:"",nationality:"",
  passportNumber:"",grade:"",enrollmentSpotId:"",medicalConditions:"",
});

function calcAge(dob: string): number | null {
  if (!dob) return null;
  const b = new Date(dob), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() - b.getMonth() < 0 || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a >= 0 ? a : null;
}

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
function Inp({ value, onChange, placeholder, type="text", disabled }: {
  value:string; onChange:(v:string)=>void; placeholder?:string; type?:string; disabled?:boolean;
}) {
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition disabled:opacity-50" />
  );
}
function Sel({ value, onChange, children, disabled }: {
  value:string; onChange:(v:string)=>void; children:React.ReactNode; disabled?:boolean;
}) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}
      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition disabled:opacity-50">
      {children}
    </select>
  );
}
function Fld({ label, required, error, children, span2 }: {
  label:string; required?:boolean; error?:string; children:React.ReactNode; span2?:boolean;
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
function Section({ id, icon, title, children, collapsible=false }: {
  id:string; icon:string; title:string; children:React.ReactNode; collapsible?:boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div id={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen(o=>!o)}
        className={`w-full flex items-center gap-3 px-6 py-4 text-left ${collapsible ? "cursor-pointer hover:bg-gray-50" : "cursor-default"}`}
      >
        <span className="text-2xl leading-none">{icon}</span>
        <span className="font-semibold text-gray-900 text-base flex-1">{title}</span>
        {collapsible && (open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />)}
      </button>
      {open && <div className="px-6 pb-6 space-y-4">{children}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
  formInfo: { id: string; name: string; description: string | null };
  programs: PublicProgram[];
  defaultProgramId?: string;
  partnerCode?: string;
}

export default function CampApplicationFullPage({ formInfo, programs, defaultProgramId, partnerCode }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { displayCurrency } = useDisplayCurrency();
  const topRef = useRef<HTMLDivElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string|null>(null);
  const [errors, setErrors] = useState<Record<string,string>>({});

  // ── Form state ──
  const [programId, setProgramId] = useState(defaultProgramId || "");
  const [packageId, setPackageId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [howHeard, setHowHeard] = useState("");
  const [refCode, setRefCode] = useState(partnerCode || "");
  const [specialRequests, setSpecialRequests] = useState("");
  const [primary, setPrimary] = useState<PrimaryStudent>(mkStudent());
  const [adults, setAdults] = useState<Adult[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const selectedProgram = programs.find(p => p.id === programId) || null;
  const selectedPackage = selectedProgram?.packages.find(p => p.id === packageId) || null;

  useEffect(() => { if (defaultProgramId) setProgramId(defaultProgramId); }, [defaultProgramId]);
  useEffect(() => {
    if (selectedProgram?.startDate) setStartDate(selectedProgram.startDate);
    else if (programId) setStartDate("");
  }, [programId, selectedProgram?.startDate]);

  function upPrimary<K extends keyof PrimaryStudent>(k:K, v:PrimaryStudent[K]) {
    setPrimary(p => ({...p, [k]:v}));
  }
  function upAdult<K extends keyof Adult>(i:number, k:K, v:Adult[K]) {
    setAdults(a => a.map((x,j) => j===i ? {...x,[k]:v} : x));
  }
  function upChild<K extends keyof Child>(i:number, k:K, v:Child[K]) {
    setChildren(c => c.map((x,j) => j===i ? {...x,[k]:v} : x));
  }

  function validate(): boolean {
    const e: Record<string,string> = {};
    if (!programId) e.programId = t("common.required");
    if (!primary.firstName) e.firstName = t("common.required");
    if (!primary.lastName) e.lastName = t("common.required");
    if (!primary.dateOfBirth) e.dateOfBirth = t("common.required");
    if (!primary.gender) e.gender = t("common.required");
    if (!primary.nationality) e.nationality = t("common.required");
    if (!primary.englishLevel) e.englishLevel = t("common.required");
    if (!primary.phone) e.phone = t("common.required");
    if (!termsAccepted) e.terms = t("common.required");
    if (!privacyAccepted) e.privacy = t("common.required");
    setErrors(e);
    if (Object.keys(e).length > 0) {
      // scroll to first error
      const firstKey = Object.keys(e)[0];
      document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior:"smooth", block:"center" });
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
          participantType:"primary_student",
          firstName:primary.firstName, lastName:primary.lastName,
          fullName:`${primary.firstName} ${primary.lastName.toUpperCase()}`.trim(),
          fullNameNative:primary.fullNameNative||undefined,
          englishName:primary.englishName||undefined,
          dateOfBirth:primary.dateOfBirth||undefined,
          gender:primary.gender||undefined,
          nationality:primary.nationality||undefined,
          passportNumber:primary.passportNumber||undefined,
          passportExpiry:primary.passportExpiry||undefined,
          grade:primary.grade||undefined,
          enrollmentSpotId:primary.enrollmentSpotId||undefined,
          schoolName:primary.schoolName||undefined,
          englishLevel:primary.englishLevel||undefined,
          medicalConditions:primary.medicalConditions||undefined,
          dietaryRequirements:primary.dietaryRequirements||undefined,
          specialNeeds:primary.specialNeeds||undefined,
          phone:primary.phone||undefined,
          whatsapp:primary.whatsapp||undefined,
          lineId:primary.lineId||undefined,
        },
        ...adults.map(a => ({
          participantType:"adult" as const,
          firstName:a.firstName, lastName:a.lastName,
          fullName:`${a.firstName} ${a.lastName.toUpperCase()}`.trim(),
          dateOfBirth:a.dateOfBirth||undefined,
          nationality:a.nationality||undefined,
          passportNumber:a.passportNumber||undefined,
          relationshipToStudent:a.relationship||undefined,
          isEmergencyContact:a.isEmergencyContact,
          email:a.email||undefined,
          phone:a.phone||undefined,
          whatsapp:a.whatsapp||undefined,
          lineId:a.lineId||undefined,
        })),
        ...children.map(c => ({
          participantType:"child" as const,
          firstName:c.firstName, lastName:c.lastName,
          fullName:`${c.firstName} ${c.lastName.toUpperCase()}`.trim(),
          dateOfBirth:c.dateOfBirth||undefined,
          gender:c.gender||undefined,
          nationality:c.nationality||undefined,
          passportNumber:c.passportNumber||undefined,
          grade:c.grade||undefined,
          enrollmentSpotId:c.enrollmentSpotId||undefined,
          medicalConditions:c.medicalConditions||undefined,
        })),
      ];
      const { data } = await axios.post(`${BASE}/api/public/applications`, {
        packageGroupId:programId,
        packageId:packageId||undefined,
        preferredStartDate:startDate||undefined,
        referralSource:howHeard||undefined,
        referralAgentCode:refCode||undefined,
        primaryLanguage:lang,
        specialRequests:specialRequests||undefined,
        termsAccepted:true,
        participants,
      });
      setSubmitted(data.applicationNumber);
      topRef.current?.scrollIntoView({ behavior:"smooth" });
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
      {/* Header */}
      <div ref={topRef} className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">{formInfo.name}</h1>
            {formInfo.description && <p className="text-xs text-gray-500 mt-0.5">{formInfo.description}</p>}
          </div>
          <img src={`${BASE}/edubee-logo.svg`} alt="Edubee" className="h-8 opacity-80" onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
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
                <DatePickerInput value={startDate} onChange={setStartDate} fromYear={new Date().getFullYear()} toYear={new Date().getFullYear()+5} />
              </Fld>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Fld label={t("apply.howHeard")}>
                <Sel value={howHeard} onChange={setHowHeard}>
                  <option value="">Select…</option>
                  {["Instagram","Facebook","Google","YouTube","Referral","Education Fair","School","Other"].map(s=>(
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Sel>
              </Fld>
              <Fld label={t("apply.referralCode")}>
                <Inp value={refCode} onChange={setRefCode} placeholder="e.g. AGENT-KIM" />
              </Fld>
            </div>

            <Fld label={t("apply.specialRequests")}>
              <textarea value={specialRequests} onChange={e=>setSpecialRequests(e.target.value)} rows={2}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 resize-none"
                placeholder="Any special requests or notes…" />
            </Fld>
          </Section>

          {/* ── Section 2: Primary Student ── */}
          <Section id="sec-student" icon="🎓" title={t("apply.primaryStudent")}>
            <div className="grid grid-cols-2 gap-4">
              <div id="field-firstName">
                <Fld label={t("apply.firstName")} required error={errors.firstName}>
                  <Inp value={primary.firstName} onChange={v=>upPrimary("firstName",v)} placeholder="e.g. Ji-won" />
                </Fld>
              </div>
              <div id="field-lastName">
                <Fld label={t("apply.lastName")} required error={errors.lastName}>
                  <Inp value={primary.lastName} onChange={v=>upPrimary("lastName",v)} placeholder="e.g. Kim" />
                </Fld>
              </div>
              <Fld label={t("apply.nativeName")}>
                <Inp value={primary.fullNameNative} onChange={v=>upPrimary("fullNameNative",v)} placeholder="김지원" />
              </Fld>
              <Fld label={t("apply.englishName")}>
                <Inp value={primary.englishName} onChange={v=>upPrimary("englishName",v)} placeholder="e.g. Kevin" />
              </Fld>
              <div id="field-dateOfBirth">
                <Fld label={t("apply.dateOfBirth")} required error={errors.dateOfBirth}>
                  <div className="flex items-center gap-2">
                    <DatePickerInput value={primary.dateOfBirth} onChange={v=>upPrimary("dateOfBirth",v)} className="flex-1" fromYear={1960} toYear={new Date().getFullYear()} />
                    {calcAge(primary.dateOfBirth) !== null && (
                      <span className="text-sm text-gray-500 whitespace-nowrap">{t("apply.age",{age:calcAge(primary.dateOfBirth)})}</span>
                    )}
                  </div>
                </Fld>
              </div>
              <div id="field-gender">
                <Fld label={t("apply.gender")} required error={errors.gender}>
                  <Sel value={primary.gender} onChange={v=>upPrimary("gender",v)}>
                    <option value="">Select…</option>
                    <option value="male">{t("apply.male")}</option>
                    <option value="female">{t("apply.female")}</option>
                    <option value="other">{t("apply.other")}</option>
                  </Sel>
                </Fld>
              </div>
              <div id="field-nationality">
                <Fld label={t("apply.nationality")} required error={errors.nationality}>
                  <Inp value={primary.nationality} onChange={v=>upPrimary("nationality",v)} placeholder="e.g. Korean" />
                </Fld>
              </div>
              <div id="field-englishLevel">
                <Fld label={t("apply.englishLevel")} required error={errors.englishLevel}>
                  <Sel value={primary.englishLevel} onChange={v=>upPrimary("englishLevel",v)}>
                    <option value="">Select…</option>
                    {["Beginner","Elementary","Pre-Intermediate","Intermediate","Upper-Intermediate","Advanced","Native"].map(l=>(
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </Sel>
                </Fld>
              </div>
              <Fld label={t("apply.passportNumber")}>
                <Inp value={primary.passportNumber} onChange={v=>upPrimary("passportNumber",v)} placeholder="e.g. M12345678" />
              </Fld>
              <Fld label={t("apply.passportExpiry")}>
                <DatePickerInput value={primary.passportExpiry} onChange={v=>upPrimary("passportExpiry",v)} fromYear={new Date().getFullYear()} toYear={new Date().getFullYear()+20} />
              </Fld>
              <Fld label={t("apply.grade")}>
                {selectedProgram?.spotSummary ? (
                  <Sel value={primary.enrollmentSpotId} onChange={id=>{
                    upPrimary("enrollmentSpotId",id);
                    const g = selectedProgram.spotSummary!.grades.find(x=>x.id===id);
                    if(g) upPrimary("grade",g.label);
                  }}>
                    <option value="">Select grade…</option>
                    {selectedProgram.spotSummary.grades.map(g=>(
                      <option key={g.id} value={g.id} disabled={g.status==="full"}>
                        {g.status==="full" ? `${g.label} (Full)` : `${g.label} (${g.available} spots)`}
                      </option>
                    ))}
                  </Sel>
                ) : (
                  <Inp value={primary.grade} onChange={v=>upPrimary("grade",v)} placeholder="e.g. Grade 8" />
                )}
              </Fld>
              <Fld label={t("apply.schoolName")}>
                <Inp value={primary.schoolName} onChange={v=>upPrimary("schoolName",v)} placeholder="e.g. Seoul Middle School" />
              </Fld>
              <div id="field-phone">
                <Fld label={t("apply.phone")} required error={errors.phone}>
                  <Inp value={primary.phone} onChange={v=>upPrimary("phone",v)} placeholder="+82 10-0000-0000" />
                </Fld>
              </div>
              <Fld label={t("apply.whatsapp")}>
                <Inp value={primary.whatsapp} onChange={v=>upPrimary("whatsapp",v)} placeholder="+82 10-0000-0000" />
              </Fld>
              <Fld label="LINE ID">
                <Inp value={primary.lineId} onChange={v=>upPrimary("lineId",v)} placeholder="@lineid" />
              </Fld>
              <Fld label={t("apply.medicalConditions")} span2>
                <Inp value={primary.medicalConditions} onChange={v=>upPrimary("medicalConditions",v)} placeholder="Any allergies, medications, or conditions…" />
              </Fld>
              <Fld label={t("apply.dietaryRequirements")} span2>
                <Inp value={primary.dietaryRequirements} onChange={v=>upPrimary("dietaryRequirements",v)} placeholder="Vegetarian, halal, etc." />
              </Fld>
              <Fld label={t("apply.specialNeeds")} span2>
                <Inp value={primary.specialNeeds} onChange={v=>upPrimary("specialNeeds",v)} placeholder="Any additional support needed…" />
              </Fld>
            </div>
          </Section>

          {/* ── Section 3: Additional Participants ── */}
          <Section id="sec-participants" icon="👨‍👩‍👧" title={t("apply.additionalParticipants")} collapsible>
            {/* Adults */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("apply.adultsLabel")}</h4>
                {adults.length < 4 && (
                  <Button type="button" size="sm" variant="outline" className="gap-1 rounded-full text-xs h-7 px-3"
                    onClick={()=>setAdults([...adults,mkAdult()])}>
                    <Plus className="w-3 h-3" /> {t("apply.addAdult")}
                  </Button>
                )}
              </div>
              {adults.map((adult,idx)=>(
                <div key={idx} className="border border-gray-200 rounded-xl p-4 mb-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Adult {idx+1}</span>
                    <button type="button" onClick={()=>setAdults(adults.filter((_,i)=>i!==idx))} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Fld label={t("apply.firstName")} required><Inp value={adult.firstName} onChange={v=>upAdult(idx,"firstName",v)} /></Fld>
                    <Fld label={t("apply.lastName")} required><Inp value={adult.lastName} onChange={v=>upAdult(idx,"lastName",v)} /></Fld>
                    <Fld label={t("apply.relationship")} required>
                      <Sel value={adult.relationship} onChange={v=>upAdult(idx,"relationship",v)}>
                        <option value="">Select…</option>
                        {["Parent","Guardian","Sibling","Grandparent","Teacher","Other"].map(r=><option key={r} value={r}>{r}</option>)}
                      </Sel>
                    </Fld>
                    <Fld label={t("apply.nationality")}><Inp value={adult.nationality} onChange={v=>upAdult(idx,"nationality",v)} /></Fld>
                    <Fld label={t("apply.phone")} required><Inp value={adult.phone} onChange={v=>upAdult(idx,"phone",v)} /></Fld>
                    <Fld label={t("apply.email")}><Inp type="email" value={adult.email} onChange={v=>upAdult(idx,"email",v)} /></Fld>
                    <Fld label={t("apply.whatsapp")}><Inp value={adult.whatsapp} onChange={v=>upAdult(idx,"whatsapp",v)} /></Fld>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={adult.isEmergencyContact} onChange={e=>upAdult(idx,"isEmergencyContact",e.target.checked)} className="rounded" />
                    {t("apply.isEmergencyContact")}
                  </label>
                </div>
              ))}
            </div>

            {/* Children */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("apply.childrenLabel")}</h4>
                {children.length < 5 && (
                  <Button type="button" size="sm" variant="outline" className="gap-1 rounded-full text-xs h-7 px-3"
                    onClick={()=>setChildren([...children,mkChild()])}>
                    <Plus className="w-3 h-3" /> {t("apply.addChild")}
                  </Button>
                )}
              </div>
              {children.map((child,idx)=>(
                <div key={idx} className="border border-gray-200 rounded-xl p-4 mb-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Child {idx+1}</span>
                    <button type="button" onClick={()=>setChildren(children.filter((_,i)=>i!==idx))} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Fld label={t("apply.firstName")} required><Inp value={child.firstName} onChange={v=>upChild(idx,"firstName",v)} /></Fld>
                    <Fld label={t("apply.lastName")} required><Inp value={child.lastName} onChange={v=>upChild(idx,"lastName",v)} /></Fld>
                    <Fld label={t("apply.dateOfBirth")} required>
                      <DatePickerInput value={child.dateOfBirth} onChange={v=>upChild(idx,"dateOfBirth",v)} fromYear={1990} toYear={new Date().getFullYear()} />
                    </Fld>
                    <Fld label={t("apply.gender")} required>
                      <Sel value={child.gender} onChange={v=>upChild(idx,"gender",v)}>
                        <option value="">Select…</option>
                        <option value="male">{t("apply.male")}</option>
                        <option value="female">{t("apply.female")}</option>
                        <option value="other">{t("apply.other")}</option>
                      </Sel>
                    </Fld>
                    <Fld label={t("apply.nationality")} required><Inp value={child.nationality} onChange={v=>upChild(idx,"nationality",v)} /></Fld>
                    <Fld label={t("apply.grade")} required>
                      {selectedProgram?.spotSummary ? (
                        <Sel value={child.enrollmentSpotId} onChange={id=>{
                          upChild(idx,"enrollmentSpotId",id);
                          const g=selectedProgram.spotSummary!.grades.find(x=>x.id===id);
                          if(g) upChild(idx,"grade",g.label);
                        }}>
                          <option value="">Select grade…</option>
                          {selectedProgram.spotSummary.grades.map(g=>(
                            <option key={g.id} value={g.id} disabled={g.status==="full"}>
                              {g.status==="full" ? `${g.label} (Full)` : `${g.label} (${g.available} spots)`}
                            </option>
                          ))}
                        </Sel>
                      ) : (
                        <Inp value={child.grade} onChange={v=>upChild(idx,"grade",v)} />
                      )}
                    </Fld>
                    <Fld label={t("apply.medicalConditions")} span2>
                      <Inp value={child.medicalConditions} onChange={v=>upChild(idx,"medicalConditions",v)} />
                    </Fld>
                  </div>
                </div>
              ))}
              {adults.length===0 && children.length===0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  Optional — click the buttons above to add accompanying family members.
                </p>
              )}
            </div>
          </Section>

          {/* ── Section 4: Terms & Submit ── */}
          <Section id="sec-terms" icon="✅" title={t("apply.review")}>
            <div className="space-y-3">
              <label id="field-terms" className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} className="mt-0.5 rounded" />
                <span className="text-sm text-gray-700">{t("apply.termsAccept")}</span>
              </label>
              {errors.terms && <p className="text-xs text-red-600 ml-7">{errors.terms}</p>}

              <label id="field-privacy" className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={privacyAccepted} onChange={e=>setPrivacyAccepted(e.target.checked)} className="mt-0.5 rounded" />
                <span className="text-sm text-gray-700">{t("apply.privacyAccept")}</span>
              </label>
              {errors.privacy && <p className="text-xs text-red-600 ml-7">{errors.privacy}</p>}
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
