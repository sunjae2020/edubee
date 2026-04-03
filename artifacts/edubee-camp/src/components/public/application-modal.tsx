import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Plus, Trash2, CheckCircle2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type PublicProgram, type SpotGrade, getLocalizedName } from "@/lib/program-utils";
import axios from "axios";
import { DualPriceDisplay } from "@/components/public/dual-price-display";
import { useDisplayCurrency } from "@/context/DisplayCurrencyContext";

type Props = {
  open: boolean;
  onClose: () => void;
  programs: PublicProgram[];
  defaultProgramId?: string;
};

type Adult = {
  firstName: string;
  lastName: string;
  relationship: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  phone: string;
  email: string;
  whatsapp: string;
  lineId: string;
  isEmergencyContact: boolean;
};

type Child = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passportNumber: string;
  grade: string;
  enrollmentSpotId: string;
  medicalConditions: string;
  dietaryRequirements: string;
};

type PrimaryStudent = {
  firstName: string;
  lastName: string;
  fullNameNative: string;
  englishName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  grade: string;
  enrollmentSpotId: string;
  schoolName: string;
  englishLevel: string;
  medicalConditions: string;
  dietaryRequirements: string;
  specialNeeds: string;
  phone: string;
  whatsapp: string;
  lineId: string;
};

const defaultPrimary = (): PrimaryStudent => ({
  firstName: "", lastName: "", fullNameNative: "", englishName: "", dateOfBirth: "", gender: "",
  nationality: "", passportNumber: "", passportExpiry: "", grade: "",
  enrollmentSpotId: "", schoolName: "", englishLevel: "",
  medicalConditions: "", dietaryRequirements: "", specialNeeds: "",
  phone: "", whatsapp: "", lineId: "",
});

const defaultAdult = (): Adult => ({
  firstName: "", lastName: "", relationship: "", dateOfBirth: "", nationality: "",
  passportNumber: "", phone: "", email: "", whatsapp: "", lineId: "",
  isEmergencyContact: false,
});

const defaultChild = (): Child => ({
  firstName: "", lastName: "", dateOfBirth: "", gender: "", nationality: "",
  passportNumber: "", grade: "", enrollmentSpotId: "",
  medicalConditions: "", dietaryRequirements: "",
});

function calcAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  const { t } = useTranslation();
  const steps = [t("apply.step1"), t("apply.step2"), t("apply.step3"), t("apply.step4")];
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, idx) => {
        const step = idx + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={idx} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 ${active ? "text-primary" : done ? "text-[#16A34A]" : "text-muted-foreground"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                done ? "bg-[#16A34A] text-white" : active ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}>
                {done ? "✓" : step}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${active ? "text-primary" : done ? "text-[#16A34A]" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {idx < total - 1 && (
              <div className={`h-px w-6 ${done ? "bg-[#22C55E]" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-[#DC2626] ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-[#DC2626]">{error}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", className = "", disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-50 ${className}`}
    />
  );
}

function Select({ value, onChange, children, disabled }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-50"
    >
      {children}
    </select>
  );
}

function GradeSelect({ spotSummary, value, enrollmentSpotId, onGradeChange, onSpotChange, placeholder }: {
  spotSummary: PublicProgram["spotSummary"];
  value: string;
  enrollmentSpotId: string;
  onGradeChange: (g: string) => void;
  onSpotChange: (id: string) => void;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  if (!spotSummary) {
    return <Input value={value} onChange={onGradeChange} placeholder={placeholder || t("apply.grade")} />;
  }
  return (
    <Select value={enrollmentSpotId} onChange={(id) => {
      onSpotChange(id);
      const grade = spotSummary.grades.find((g) => g.id === id);
      if (grade) onGradeChange(grade.label);
    }}>
      <option value="">{placeholder || t("apply.grade")}</option>
      {spotSummary.grades.map((g) => (
        <option key={g.id} value={g.id} disabled={g.status === "full"}>
          {g.status === "full"
            ? t("apply.gradeFull", { grade: g.label })
            : t("apply.gradeSpots", { grade: g.label, available: g.available })}
        </option>
      ))}
    </Select>
  );
}

export function ApplicationModal({ open, onClose, programs, defaultProgramId }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1
  const [programId, setProgramId] = useState(defaultProgramId || "");
  const [packageId, setPackageId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [howHeard, setHowHeard] = useState("");
  const [refCode, setRefCode] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // Step 2
  const [primary, setPrimary] = useState<PrimaryStudent>(defaultPrimary());

  // Step 3
  const [adults, setAdults] = useState<Adult[]>([]);
  const [children, setChildren] = useState<Child[]>([]);

  // Step 4
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const selectedProgram = programs.find((p) => p.id === programId) || null;
  const selectedPackage = selectedProgram?.packages.find((p) => p.id === packageId) || null;
  const { displayCurrency } = useDisplayCurrency();

  useEffect(() => {
    if (defaultProgramId) setProgramId(defaultProgramId);
  }, [defaultProgramId]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSubmitted(null);
      setErrors({});
    }
  }, [open]);

  function updatePrimary<K extends keyof PrimaryStudent>(key: K, val: PrimaryStudent[K]) {
    setPrimary((p) => ({ ...p, [key]: val }));
  }

  function updateAdult<K extends keyof Adult>(idx: number, key: K, val: Adult[K]) {
    setAdults((a) => a.map((item, i) => (i === idx ? { ...item, [key]: val } : item)));
  }

  function updateChild<K extends keyof Child>(idx: number, key: K, val: Child[K]) {
    setChildren((c) => c.map((item, i) => (i === idx ? { ...item, [key]: val } : item)));
  }

  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!programId) e.programId = t("common.required");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: Record<string, string> = {};
    if (!primary.firstName) e.firstName = t("common.required");
    if (!primary.lastName)  e.lastName  = t("common.required");
    if (!primary.dateOfBirth) e.dateOfBirth = t("common.required");
    if (!primary.gender) e.gender = t("common.required");
    if (!primary.nationality) e.nationality = t("common.required");
    if (!primary.englishLevel) e.englishLevel = t("common.required");
    if (!primary.phone) e.phone = t("common.required");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    const e: Record<string, string> = {};
    if (!termsAccepted) e.terms = t("common.required");
    if (!privacyAccepted) e.privacy = t("common.required");
    if (Object.keys(e).length) { setErrors(e); return; }

    setSubmitting(true);
    try {
      const participants = [
        {
          participantType: "primary_student",
          firstName: primary.firstName,
          lastName: primary.lastName,
          fullName: `${primary.firstName} ${primary.lastName.toUpperCase()}`.trim(),
          fullNameNative: primary.fullNameNative || undefined,
          englishName: primary.englishName || undefined,
          dateOfBirth: primary.dateOfBirth || undefined,
          gender: primary.gender || undefined,
          nationality: primary.nationality || undefined,
          passportNumber: primary.passportNumber || undefined,
          passportExpiry: primary.passportExpiry || undefined,
          grade: primary.grade || undefined,
          enrollmentSpotId: primary.enrollmentSpotId || undefined,
          schoolName: primary.schoolName || undefined,
          englishLevel: primary.englishLevel || undefined,
          medicalConditions: primary.medicalConditions || undefined,
          dietaryRequirements: primary.dietaryRequirements || undefined,
          specialNeeds: primary.specialNeeds || undefined,
          phone: primary.phone || undefined,
          whatsapp: primary.whatsapp || undefined,
          lineId: primary.lineId || undefined,
        },
        ...adults.map((a) => ({
          participantType: "adult" as const,
          firstName: a.firstName,
          lastName: a.lastName,
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
        ...children.map((c) => ({
          participantType: "child" as const,
          firstName: c.firstName,
          lastName: c.lastName,
          fullName: `${c.firstName} ${c.lastName.toUpperCase()}`.trim(),
          dateOfBirth: c.dateOfBirth || undefined,
          gender: c.gender || undefined,
          nationality: c.nationality || undefined,
          passportNumber: c.passportNumber || undefined,
          grade: c.grade || undefined,
          enrollmentSpotId: c.enrollmentSpotId || undefined,
          medicalConditions: c.medicalConditions || undefined,
          dietaryRequirements: c.dietaryRequirements || undefined,
        })),
      ];

      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const { data } = await axios.post(`${BASE}/api/public/applications`, {
        packageGroupId: programId,
        packageId: packageId || undefined,
        preferredStartDate: startDate || undefined,
        referralSource: howHeard || undefined,
        referralAgentCode: refCode || undefined,
        primaryLanguage: lang,
        specialRequests: specialRequests || undefined,
        termsAccepted: true,
        participants,
      });

      setSubmitted(data.applicationNumber);
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string } } };
      setErrors({ submit: axErr.response?.data?.message || "Submission failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col"
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            {submitted ? (
              <span className="font-display font-bold text-lg text-foreground">{t("apply.successTitle")}</span>
            ) : (
              <div className="flex items-center gap-4">
                <span className="font-display font-bold text-base text-foreground hidden sm:block">{t("apply.title")}</span>
                <StepIndicator current={step} total={4} />
              </div>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Success */}
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                <div className="w-20 h-20 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-[#16A34A]" />
                </div>
                <h3 className="font-display font-bold text-2xl text-foreground">✅ {submitted}</h3>
                <p className="text-muted-foreground max-w-sm">
                  {t("apply.successMessage", { number: submitted })}
                </p>
                <Button onClick={onClose} className="rounded-full px-8 mt-2">{t("common.close")}</Button>
              </div>
            ) : (
              <>
                {/* STEP 1: Program */}
                {step === 1 && (
                  <div className="space-y-5">
                    <h3 className="font-semibold text-foreground text-lg">{t("apply.programSelection")}</h3>

                    <Field label={t("nav.programs")} required error={errors.programId}>
                      <Select value={programId} onChange={(v) => { setProgramId(v); setPackageId(""); }}>
                        <option value="">{t("apply.selectProgram")}</option>
                        {programs.map((p) => (
                          <option key={p.id} value={p.id}>{getLocalizedName(p, lang)} — {p.location}</option>
                        ))}
                      </Select>
                    </Field>

                    {selectedProgram && selectedProgram.packages.length > 0 && (
                      <Field label="Package">
                        <Select value={packageId} onChange={setPackageId}>
                          <option value="">{t("apply.selectPackage")}</option>
                          {selectedProgram.packages.map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.name} — {pkg.durationDays} {t("programs.days")}
                              {pkg.displayFormatted ? ` (${pkg.displayFormatted})` : ""}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    )}

                    {selectedPackage && selectedPackage.displayPrice != null && (
                      <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1">Selected Package</p>
                          <p className="text-sm font-semibold text-foreground mb-1.5">{selectedPackage.name} · {selectedPackage.durationDays} {t("programs.days")}</p>
                          <DualPriceDisplay
                            localAmount={selectedPackage.displayPrice}
                            localCurrency={selectedPackage.displayCurrency}
                            countryCode={selectedProgram?.countryCode}
                            size="detail"
                          />
                        </div>
                        {selectedProgram && displayCurrency !== selectedProgram.primaryCurrency && (
                          <p className="text-[10px] text-[#92400E] bg-[--e-orange-lt] border border-[--e-orange]/20 rounded-lg px-2 py-1.5 max-w-[140px] leading-relaxed">
                            💱 {t("currency.billing_warning", "Billing in {{currency}}", { currency: selectedProgram.primaryCurrency })}
                          </p>
                        )}
                      </div>
                    )}

                    <Field label={t("apply.preferredStartDate")}>
                      <Input type="date" value={startDate} onChange={setStartDate} />
                    </Field>

                    <Field label={t("apply.howHeard")}>
                      <Select value={howHeard} onChange={setHowHeard}>
                        <option value="">Select…</option>
                        {["Instagram", "Facebook", "Google", "YouTube", "Referral", "Education Fair", "School", "Other"].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                    </Field>

                    <Field label={t("apply.referralCode")}>
                      <Input value={refCode} onChange={setRefCode} placeholder="e.g. AGENT-KIM" />
                    </Field>

                    <Field label={t("apply.specialRequests")}>
                      <textarea
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                        placeholder="Any special requests or notes..."
                      />
                    </Field>
                  </div>
                )}

                {/* STEP 2: Primary Student */}
                {step === 2 && (
                  <div className="space-y-5">
                    <h3 className="font-semibold text-foreground text-lg">{t("apply.primaryStudent")}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label={t("apply.firstName")} required error={errors.firstName}>
                        <Input value={primary.firstName} onChange={(v) => updatePrimary("firstName", v)} placeholder="e.g. Ji-won" />
                      </Field>
                      <Field label={t("apply.lastName")} required error={errors.lastName}>
                        <Input value={primary.lastName} onChange={(v) => updatePrimary("lastName", v)} placeholder="e.g. Kim" />
                      </Field>
                      <Field label={t("apply.nativeName")}>
                        <Input value={primary.fullNameNative} onChange={(v) => updatePrimary("fullNameNative", v)} placeholder="김지원" />
                      </Field>
                      <Field label={t("apply.englishName")}>
                        <Input value={primary.englishName} onChange={(v) => updatePrimary("englishName", v)} placeholder="e.g. Kevin" />
                      </Field>
                      <Field label={t("apply.dateOfBirth")} required error={errors.dateOfBirth}>
                        <div className="flex items-center gap-2">
                          <Input type="date" value={primary.dateOfBirth} onChange={(v) => updatePrimary("dateOfBirth", v)} className="flex-1" />
                          {calcAge(primary.dateOfBirth) !== null && (
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {t("apply.age", { age: calcAge(primary.dateOfBirth) })}
                            </span>
                          )}
                        </div>
                      </Field>
                      <Field label={t("apply.gender")} required error={errors.gender}>
                        <Select value={primary.gender} onChange={(v) => updatePrimary("gender", v)}>
                          <option value="">Select…</option>
                          <option value="male">{t("apply.male")}</option>
                          <option value="female">{t("apply.female")}</option>
                          <option value="other">{t("apply.other")}</option>
                        </Select>
                      </Field>
                      <Field label={t("apply.nationality")} required error={errors.nationality}>
                        <Input value={primary.nationality} onChange={(v) => updatePrimary("nationality", v)} placeholder="Korean" />
                      </Field>
                      <Field label={t("apply.passportNumber")}>
                        <Input value={primary.passportNumber} onChange={(v) => updatePrimary("passportNumber", v)} placeholder="M12345678" />
                      </Field>
                      <Field label={t("apply.passportExpiry")}>
                        <Input type="date" value={primary.passportExpiry} onChange={(v) => updatePrimary("passportExpiry", v)} />
                      </Field>
                      <Field label={t("apply.grade")} required>
                        {selectedProgram ? (
                          <GradeSelect
                            spotSummary={selectedProgram.spotSummary}
                            value={primary.grade}
                            enrollmentSpotId={primary.enrollmentSpotId}
                            onGradeChange={(g) => updatePrimary("grade", g)}
                            onSpotChange={(id) => updatePrimary("enrollmentSpotId", id)}
                          />
                        ) : (
                          <Input value={primary.grade} onChange={(v) => updatePrimary("grade", v)} placeholder="e.g. Grade 7" />
                        )}
                      </Field>
                      <Field label={t("apply.schoolName")}>
                        <Input value={primary.schoolName} onChange={(v) => updatePrimary("schoolName", v)} />
                      </Field>
                      <Field label={t("apply.englishLevel")} required error={errors.englishLevel}>
                        <Select value={primary.englishLevel} onChange={(v) => updatePrimary("englishLevel", v)}>
                          <option value="">Select…</option>
                          {["beginner","elementary","intermediate","upperIntermediate","advanced"].map((lvl) => (
                            <option key={lvl} value={lvl}>{t(`apply.${lvl}`)}</option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Field label={t("apply.medicalConditions")}>
                        <Input value={primary.medicalConditions} onChange={(v) => updatePrimary("medicalConditions", v)} placeholder="e.g. Nut allergy" />
                      </Field>
                      <Field label={t("apply.dietaryRequirements")}>
                        <Input value={primary.dietaryRequirements} onChange={(v) => updatePrimary("dietaryRequirements", v)} placeholder="e.g. Vegetarian" />
                      </Field>
                      <Field label={t("apply.specialNeeds")}>
                        <Input value={primary.specialNeeds} onChange={(v) => updatePrimary("specialNeeds", v)} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Field label={t("apply.emergencyPhone")} required error={errors.phone}>
                        <Input value={primary.phone} onChange={(v) => updatePrimary("phone", v)} placeholder="+82-10-1234-5678" />
                      </Field>
                      <Field label={t("apply.whatsapp")}>
                        <Input value={primary.whatsapp} onChange={(v) => updatePrimary("whatsapp", v)} />
                      </Field>
                      <Field label={t("apply.lineId")}>
                        <Input value={primary.lineId} onChange={(v) => updatePrimary("lineId", v)} />
                      </Field>
                    </div>
                  </div>
                )}

                {/* STEP 3: Additional Participants */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground text-lg">{t("apply.additionalParticipants")}</h3>
                      <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        👦 {children.length + 1} &nbsp; 👨 {adults.length} &nbsp; Total: {children.length + adults.length + 1}
                      </span>
                    </div>

                    {/* Adults */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("apply.adultsLabel")}</h4>
                        {adults.length < 4 && (
                          <Button size="sm" variant="outline" className="gap-1 rounded-full text-xs" onClick={() => setAdults([...adults, defaultAdult()])}>
                            <Plus className="w-3 h-3" /> {t("apply.addAdult")}
                          </Button>
                        )}
                      </div>
                      {adults.map((adult, idx) => (
                        <div key={idx} className="border border-border rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">Adult {idx + 1}</span>
                            <button onClick={() => setAdults(adults.filter((_, i) => i !== idx))} className="text-[#F87171] hover:text-[#DC2626] transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label={t("apply.firstName")} required>
                              <Input value={adult.firstName} onChange={(v) => updateAdult(idx, "firstName", v)} />
                            </Field>
                            <Field label={t("apply.lastName")} required>
                              <Input value={adult.lastName} onChange={(v) => updateAdult(idx, "lastName", v)} />
                            </Field>
                            <Field label={t("apply.relationship")} required>
                              <Select value={adult.relationship} onChange={(v) => updateAdult(idx, "relationship", v)}>
                                <option value="">Select…</option>
                                {["Parent", "Guardian", "Sibling", "Grandparent", "Teacher", "Other"].map((r) => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </Select>
                            </Field>
                            <Field label={t("apply.nationality")}>
                              <Input value={adult.nationality} onChange={(v) => updateAdult(idx, "nationality", v)} />
                            </Field>
                            <Field label={t("apply.phone")} required>
                              <Input value={adult.phone} onChange={(v) => updateAdult(idx, "phone", v)} />
                            </Field>
                            <Field label={t("apply.email")}>
                              <Input type="email" value={adult.email} onChange={(v) => updateAdult(idx, "email", v)} />
                            </Field>
                            <Field label={t("apply.whatsapp")}>
                              <Input value={adult.whatsapp} onChange={(v) => updateAdult(idx, "whatsapp", v)} />
                            </Field>
                          </div>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={adult.isEmergencyContact} onChange={(e) => updateAdult(idx, "isEmergencyContact", e.target.checked)} className="rounded" />
                            {t("apply.isEmergencyContact")}
                          </label>
                        </div>
                      ))}
                    </div>

                    {/* Children */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("apply.childrenLabel")}</h4>
                        {children.length < 5 && (
                          <Button size="sm" variant="outline" className="gap-1 rounded-full text-xs" onClick={() => setChildren([...children, defaultChild()])}>
                            <Plus className="w-3 h-3" /> {t("apply.addChild")}
                          </Button>
                        )}
                      </div>
                      {children.map((child, idx) => (
                        <div key={idx} className="border border-border rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">Child {idx + 1}</span>
                            <button onClick={() => setChildren(children.filter((_, i) => i !== idx))} className="text-[#F87171] hover:text-[#DC2626] transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label={t("apply.firstName")} required>
                              <Input value={child.firstName} onChange={(v) => updateChild(idx, "firstName", v)} />
                            </Field>
                            <Field label={t("apply.lastName")} required>
                              <Input value={child.lastName} onChange={(v) => updateChild(idx, "lastName", v)} />
                            </Field>
                            <Field label={t("apply.dateOfBirth")} required>
                              <Input type="date" value={child.dateOfBirth} onChange={(v) => updateChild(idx, "dateOfBirth", v)} />
                            </Field>
                            <Field label={t("apply.gender")} required>
                              <Select value={child.gender} onChange={(v) => updateChild(idx, "gender", v)}>
                                <option value="">Select…</option>
                                <option value="male">{t("apply.male")}</option>
                                <option value="female">{t("apply.female")}</option>
                                <option value="other">{t("apply.other")}</option>
                              </Select>
                            </Field>
                            <Field label={t("apply.nationality")} required>
                              <Input value={child.nationality} onChange={(v) => updateChild(idx, "nationality", v)} />
                            </Field>
                            <Field label={t("apply.grade")} required>
                              {selectedProgram ? (
                                <GradeSelect
                                  spotSummary={selectedProgram.spotSummary}
                                  value={child.grade}
                                  enrollmentSpotId={child.enrollmentSpotId}
                                  onGradeChange={(g) => updateChild(idx, "grade", g)}
                                  onSpotChange={(id) => updateChild(idx, "enrollmentSpotId", id)}
                                />
                              ) : (
                                <Input value={child.grade} onChange={(v) => updateChild(idx, "grade", v)} />
                              )}
                            </Field>
                            <Field label={t("apply.medicalConditions")}>
                              <Input value={child.medicalConditions} onChange={(v) => updateChild(idx, "medicalConditions", v)} />
                            </Field>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 4: Review */}
                {step === 4 && (
                  <div className="space-y-6">
                    <h3 className="font-semibold text-foreground text-lg">{t("apply.review")}</h3>

                    {/* Program summary */}
                    {selectedProgram && (
                      <div className="bg-muted/40 rounded-xl p-4 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Program</div>
                          <div className="font-semibold text-foreground">{getLocalizedName(selectedProgram, lang)}</div>
                          <div className="text-sm text-muted-foreground">{selectedProgram.location} {selectedProgram.countryFlag}</div>
                          {startDate && <div className="text-sm text-muted-foreground mt-1">Starting: {startDate}</div>}
                          {selectedPackage && selectedPackage.displayPrice != null && (
                            <div className="mt-2 pt-2 border-t border-border/60">
                              <p className="text-xs text-muted-foreground mb-1">{selectedPackage.name} · {selectedPackage.durationDays} {t("programs.days")}</p>
                              <DualPriceDisplay
                                localAmount={selectedPackage.displayPrice}
                                localCurrency={selectedPackage.displayCurrency}
                                countryCode={selectedProgram.countryCode}
                                size="card"
                              />
                            </div>
                          )}
                        </div>
                        <button onClick={() => setStep(1)} className="text-primary hover:text-primary/80 shrink-0">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Primary student summary */}
                    <div className="bg-muted/40 rounded-xl p-4 flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Primary Student</div>
                        <div className="font-semibold text-foreground">{primary.firstName && primary.lastName ? `${primary.firstName} ${primary.lastName.toUpperCase()}` : primary.firstName || "—"}</div>
                        {primary.fullNameNative && <div className="text-sm text-muted-foreground">{primary.fullNameNative}</div>}
                        {primary.englishName && <div className="text-sm text-muted-foreground">{primary.englishName}</div>}
                        <div className="text-sm text-muted-foreground mt-1">
                          {[primary.nationality, primary.grade, primary.englishLevel].filter(Boolean).join(" · ")}
                        </div>
                        {primary.phone && <div className="text-sm text-muted-foreground">📞 {primary.phone}</div>}
                      </div>
                      <button onClick={() => setStep(2)} className="text-primary hover:text-primary/80 shrink-0">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Additional participants summary */}
                    {(adults.length > 0 || children.length > 0) && (
                      <div className="bg-muted/40 rounded-xl p-4 flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Additional Participants</div>
                          {adults.map((a, i) => (
                            <div key={i} className="text-sm text-foreground">{a.firstName && a.lastName ? `${a.firstName} ${a.lastName.toUpperCase()}` : a.firstName || "Adult"} ({a.relationship || "Adult"})</div>
                          ))}
                          {children.map((c, i) => (
                            <div key={i} className="text-sm text-foreground">{c.firstName && c.lastName ? `${c.firstName} ${c.lastName.toUpperCase()}` : c.firstName || "Child"} ({c.grade || "Child"})</div>
                          ))}
                        </div>
                        <button onClick={() => setStep(3)} className="text-primary hover:text-primary/80 shrink-0">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Terms */}
                    <div className="space-y-3 pt-2">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-0.5 rounded"
                        />
                        <span className="text-sm text-foreground">{t("apply.termsAccept")}</span>
                      </label>
                      {errors.terms && <p className="text-xs text-[#DC2626] ml-7">{errors.terms}</p>}

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={privacyAccepted}
                          onChange={(e) => setPrivacyAccepted(e.target.checked)}
                          className="mt-0.5 rounded"
                        />
                        <span className="text-sm text-foreground">{t("apply.privacyAccept")}</span>
                      </label>
                      {errors.privacy && <p className="text-xs text-[#DC2626] ml-7">{errors.privacy}</p>}
                    </div>

                    {errors.submit && (
                      <div className="p-3 bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg text-[#DC2626] text-sm">{errors.submit}</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer navigation */}
          {!submitted && (
            <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
              <Button
                variant="ghost"
                className="gap-1"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
              >
                <ChevronLeft className="w-4 h-4" /> {t("common.back")}
              </Button>

              {step < 4 ? (
                <Button
                  className="gap-1 rounded-full px-6"
                  onClick={() => {
                    if (step === 1 && !validateStep1()) return;
                    if (step === 2 && !validateStep2()) return;
                    setStep((s) => s + 1);
                  }}
                >
                  {t("common.next")} <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  className="rounded-full px-6 gap-2"
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? t("apply.submitting") : t("apply.submitApplication")}
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
