import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2, Plus, Trash2, Users, GraduationCap, Calendar, FileText } from "lucide-react";
import SignaturePad from "@/components/shared/SignaturePad";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ───────────────────────────────────────────────────────────────────
interface Package {
  id: string;
  name: string;
  durationDays: number | null;
  displayFormatted: string | null;
  displayCurrency: string;
}

interface PackageGroup {
  id: string;
  nameEn: string | null;
  nameKo: string | null;
  descriptionEn: string | null;
  location: string | null;
  countryCode: string | null;
  countryFlag: string;
  interviewRequired: boolean;
  packages: Package[];
  spotSummary: { grades: { id: string; label: string; available: number; total: number; status: string }[] } | null;
}

interface Student {
  firstName: string;
  lastName: string;
  fullNameNative: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  grade: string;
  schoolName: string;
  englishLevel: string;
  medicalConditions: string;
  dietaryRequirements: string;
  enrollmentSpotId: string;
}

function emptyStudent(): Student {
  return {
    firstName: "", lastName: "", fullNameNative: "",
    dateOfBirth: "", gender: "", nationality: "",
    passportNumber: "", passportExpiry: "",
    grade: "", schoolName: "", englishLevel: "",
    medicalConditions: "", dietaryRequirements: "",
    enrollmentSpotId: "",
  };
}

// ─── UI Helpers ──────────────────────────────────────────────────────────────
const inp = "w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white transition";
const sel = "w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white transition";
const area = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white transition resize-none";

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Field({ label, required, children, half }: { label: string; required?: boolean; children: React.ReactNode; half?: boolean }) {
  return (
    <div className={half ? "" : "col-span-2"}>
      <Label required={required}>{label}</Label>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-orange-600" />
      </div>
      <h3 className="font-semibold text-gray-800">{title}</h3>
    </div>
  );
}

// ─── Steps ───────────────────────────────────────────────────────────────────
const STEPS = ["Program", "Students", "Contact", "Submit"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                done ? "bg-orange-500 text-white" : active ? "bg-orange-500 text-white ring-4 ring-orange-100" : "bg-gray-100 text-gray-400"
              }`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium ${active ? "text-orange-600" : done ? "text-gray-500" : "text-gray-400"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-10 mb-4 transition-colors ${done ? "bg-orange-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Program Selection ───────────────────────────────────────────────
function ProgramStep({
  groups, selectedGroup, selectedPackage, preferredStart, referralCode,
  onGroup, onPackage, onStart, onCode, onNext,
}: {
  groups: PackageGroup[];
  selectedGroup: string; selectedPackage: string;
  preferredStart: string; referralCode: string;
  onGroup: (id: string) => void; onPackage: (id: string) => void;
  onStart: (d: string) => void; onCode: (c: string) => void;
  onNext: () => void;
}) {
  const group = groups.find(g => g.id === selectedGroup);
  const canNext = !!selectedGroup;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Select a Program</h2>
        <p className="text-sm text-gray-500">Choose the camp program you'd like to apply for.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {groups.map(g => (
          <button
            key={g.id}
            type="button"
            onClick={() => { onGroup(g.id); onPackage(""); }}
            className={`text-left rounded-xl border-2 p-4 transition-all ${
              selectedGroup === g.id
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 bg-white hover:border-orange-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{g.countryFlag}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 text-sm leading-snug">{g.nameEn ?? "Program"}</div>
                {g.location && <div className="text-xs text-gray-400 mt-0.5">{g.location}</div>}
                {g.packages.length > 0 && (
                  <div className="text-xs text-orange-600 font-medium mt-1">
                    From {g.packages[0].displayFormatted ?? "—"}
                  </div>
                )}
                {g.spotSummary && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {g.spotSummary.grades.map(sp => (
                      <span key={sp.id} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        sp.status === "full" ? "bg-red-100 text-red-600"
                          : sp.status === "limited" ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {sp.label}: {sp.status === "full" ? "Full" : `${sp.available} left`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {selectedGroup === g.id && (
                <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              )}
            </div>
          </button>
        ))}
      </div>

      {group && group.packages.length > 0 && (
        <div>
          <Label>Package / Duration</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            {group.packages.map(pkg => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => onPackage(pkg.id)}
                className={`text-left rounded-lg border-2 px-4 py-3 transition-all ${
                  selectedPackage === pkg.id
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 bg-white hover:border-orange-300"
                }`}
              >
                <div className="font-medium text-sm text-gray-800">{pkg.name}</div>
                {pkg.durationDays && <div className="text-xs text-gray-400">{pkg.durationDays} days</div>}
                {pkg.displayFormatted && <div className="text-sm font-semibold text-orange-600 mt-1">{pkg.displayFormatted}</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Preferred Start Date</Label>
          <input type="date" className={inp} value={preferredStart} onChange={e => onStart(e.target.value)} />
        </div>
        <div>
          <Label>Referral / Agent Code</Label>
          <input type="text" className={inp} value={referralCode} placeholder="Optional" onChange={e => onCode(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Students ─────────────────────────────────────────────────────────
function StudentCard({ index, student, spots, onChange, onRemove, canRemove }: {
  index: number;
  student: Student;
  spots: { id: string; label: string; available: number; status: string }[];
  onChange: (s: Student) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const set = (k: keyof Student) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    onChange({ ...student, [k]: e.target.value });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-700 text-sm">Student {index + 1}</h4>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label required>First Name (English)</Label>
          <input className={inp} value={student.firstName} onChange={set("firstName")} placeholder="Given name" />
        </div>
        <div>
          <Label required>Last Name (English)</Label>
          <input className={inp} value={student.lastName} onChange={set("lastName")} placeholder="Family name" />
        </div>
        <Field label="Full Name (Native Language)" half>
          <input className={inp} value={student.fullNameNative} onChange={set("fullNameNative")} placeholder="e.g. Hong Gildong" />
        </Field>
        <div>
          <Label required>Date of Birth</Label>
          <input type="date" className={inp} value={student.dateOfBirth} onChange={set("dateOfBirth")} />
        </div>
        <div>
          <Label>Gender</Label>
          <select className={sel} value={student.gender} onChange={set("gender")}>
            <option value="">Select…</option>
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
        </div>
        <div>
          <Label required>Nationality</Label>
          <input className={inp} value={student.nationality} onChange={set("nationality")} placeholder="e.g. Korean" />
        </div>
        <div>
          <Label>Passport Number</Label>
          <input className={inp} value={student.passportNumber} onChange={set("passportNumber")} placeholder="M12345678" />
        </div>
        <div>
          <Label>Passport Expiry</Label>
          <input type="date" className={inp} value={student.passportExpiry} onChange={set("passportExpiry")} />
        </div>
        <div>
          <Label>School Name</Label>
          <input className={inp} value={student.schoolName} onChange={set("schoolName")} placeholder="Current school" />
        </div>
        <div>
          <Label>Grade / Year</Label>
          <input className={inp} value={student.grade} onChange={set("grade")} placeholder="e.g. Year 5" />
        </div>
        <div>
          <Label>English Level</Label>
          <select className={sel} value={student.englishLevel} onChange={set("englishLevel")}>
            <option value="">Select…</option>
            <option>Beginner</option><option>Elementary</option><option>Intermediate</option>
            <option>Upper Intermediate</option><option>Advanced</option><option>Native</option>
          </select>
        </div>
        {spots.length > 0 && (
          <div>
            <Label>Grade Group / Spot</Label>
            <select className={sel} value={student.enrollmentSpotId} onChange={set("enrollmentSpotId")}>
              <option value="">Select grade group…</option>
              {spots.map(sp => (
                <option key={sp.id} value={sp.id} disabled={sp.status === "full"}>
                  {sp.label}{sp.status === "full" ? " (Full)" : sp.status === "limited" ? ` (${sp.available} left)` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
        <Field label="Medical Conditions / Allergies">
          <input className={inp} value={student.medicalConditions} onChange={set("medicalConditions")} placeholder="None / describe…" />
        </Field>
        <Field label="Dietary Requirements">
          <input className={inp} value={student.dietaryRequirements} onChange={set("dietaryRequirements")} placeholder="None / Vegetarian / Halal…" />
        </Field>
      </div>
    </div>
  );
}

function StudentsStep({
  students, spots, onChange, onAdd, onRemove, onNext, onBack,
}: {
  students: Student[];
  spots: { id: string; label: string; available: number; status: string }[];
  onChange: (i: number, s: Student) => void;
  onAdd: () => void; onRemove: (i: number) => void;
  onNext: () => void; onBack: () => void;
}) {
  const canNext = students.every(s => s.firstName && s.lastName && s.dateOfBirth && s.nationality);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Student Information</h2>
        <p className="text-sm text-gray-500">Please provide details for each student attending the camp.</p>
      </div>

      {students.map((s, i) => (
        <StudentCard
          key={i} index={i} student={s} spots={spots}
          onChange={st => onChange(i, st)}
          onRemove={() => onRemove(i)}
          canRemove={students.length > 1}
        />
      ))}

      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-orange-300 text-orange-600 text-sm font-medium hover:bg-orange-50 transition w-full justify-center"
      >
        <Plus className="w-4 h-4" /> Add Another Student
      </button>

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button type="button" onClick={onNext} disabled={!canNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition">
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Contact / Parent ─────────────────────────────────────────────────
interface Contact {
  fullName: string; firstName: string; lastName: string;
  email: string; phone: string; whatsapp: string; lineId: string;
  relationship: string;
}

function ContactStep({
  contact, specialRequests, referralSource,
  onChange, onReq, onRef, onNext, onBack,
}: {
  contact: Contact; specialRequests: string; referralSource: string;
  onChange: (c: Contact) => void;
  onReq: (v: string) => void; onRef: (v: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  const set = (k: keyof Contact) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...contact, [k]: e.target.value });

  const canNext = contact.fullName.trim() && contact.email.trim() && contact.phone.trim();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Parent / Guardian Contact</h2>
        <p className="text-sm text-gray-500">We'll use this contact to reach you about the application.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <SectionTitle icon={Users} title="Contact Person" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>First Name</Label>
            <input className={inp} value={contact.firstName} onChange={set("firstName")}
              onBlur={() => {
                if (!contact.fullName || contact.fullName === `${contact.firstName} ${contact.lastName}`.trim()) {
                  onChange({ ...contact, fullName: `${contact.firstName} ${contact.lastName}`.trim() });
                }
              }}
              placeholder="First name" />
          </div>
          <div>
            <Label required>Last Name</Label>
            <input className={inp} value={contact.lastName} onChange={set("lastName")}
              onBlur={() => {
                if (!contact.fullName || contact.fullName === `${contact.firstName} ${contact.lastName}`.trim()) {
                  onChange({ ...contact, fullName: `${contact.firstName} ${contact.lastName}`.trim() });
                }
              }}
              placeholder="Last name" />
          </div>
          <Field label="Full Name" required>
            <input className={inp} value={contact.fullName} onChange={set("fullName")} placeholder="Full name" />
          </Field>
          <div>
            <Label>Relationship to Student</Label>
            <select className={sel} value={contact.relationship} onChange={set("relationship")}>
              <option value="">Select…</option>
              <option>Mother</option><option>Father</option><option>Guardian</option>
              <option>Grandparent</option><option>Other</option>
            </select>
          </div>
          <Field label="Email Address" required>
            <input type="email" className={inp} value={contact.email} onChange={set("email")} placeholder="parent@example.com" />
          </Field>
          <div>
            <Label required>Phone / Mobile</Label>
            <input type="tel" className={inp} value={contact.phone} onChange={set("phone")} placeholder="+82 10-0000-0000" />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <input type="tel" className={inp} value={contact.whatsapp} onChange={set("whatsapp")} placeholder="+82 10-0000-0000" />
          </div>
          <div>
            <Label>LINE ID</Label>
            <input className={inp} value={contact.lineId} onChange={set("lineId")} placeholder="LINE ID" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <SectionTitle icon={FileText} title="Additional Information" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>How did you hear about us?</Label>
            <select className={sel} value={referralSource} onChange={e => onRef(e.target.value)}>
              <option value="">Select…</option>
              <option value="website">Website</option>
              <option value="social_media">Social Media</option>
              <option value="friend">Friend / Family Referral</option>
              <option value="agent">Education Agent</option>
              <option value="event">Event / Expo</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-span-2">
            <Label>Special Requests or Questions</Label>
            <textarea className={area} rows={3} value={specialRequests}
              onChange={e => onReq(e.target.value)}
              placeholder="Any dietary requirements, medical needs, or questions…" />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button type="button" onClick={onNext} disabled={!canNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition">
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Review & Submit ──────────────────────────────────────────────────
function SubmitStep({
  group, pkg, students, contact, preferredStart, specialRequests, referralSource, referralCode,
  onBack, onSubmit, isLoading, primaryLanguage, onLanguage, signatureImage, onSignatureChange,
}: {
  group: PackageGroup | undefined; pkg: Package | undefined;
  students: Student[]; contact: Contact;
  preferredStart: string; specialRequests: string;
  referralSource: string; referralCode: string;
  onBack: () => void; onSubmit: () => void; isLoading: boolean;
  primaryLanguage: string; onLanguage: (v: string) => void;
  signatureImage: string | null; onSignatureChange: (v: string | null) => void;
}) {
  const [terms, setTerms] = useState(false);

  function Row({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
      <div className="flex gap-2 text-sm">
        <span className="text-gray-500 w-36 shrink-0">{label}</span>
        <span className="text-gray-800 font-medium">{value}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Review & Submit</h2>
        <p className="text-sm text-gray-500">Please review your application before submitting.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <h4 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-orange-500" /> Program
        </h4>
        <Row label="Program" value={group?.nameEn} />
        <Row label="Package" value={pkg?.name} />
        <Row label="Location" value={group?.location} />
        <Row label="Preferred Start" value={preferredStart} />
        <Row label="Referral Code" value={referralCode} />
        <Row label="Referral Source" value={referralSource} />
      </div>

      {students.map((s, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
          <h4 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-500" /> Student {i + 1}
          </h4>
          <Row label="Name" value={`${s.firstName} ${s.lastName}`.trim()} />
          <Row label="Native Name" value={s.fullNameNative} />
          <Row label="Date of Birth" value={s.dateOfBirth} />
          <Row label="Gender" value={s.gender} />
          <Row label="Nationality" value={s.nationality} />
          <Row label="School" value={s.schoolName} />
          <Row label="Grade" value={s.grade} />
          <Row label="English Level" value={s.englishLevel} />
          <Row label="Medical" value={s.medicalConditions} />
          <Row label="Dietary" value={s.dietaryRequirements} />
        </div>
      ))}

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <h4 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-orange-500" /> Contact
        </h4>
        <Row label="Name" value={contact.fullName} />
        <Row label="Relationship" value={contact.relationship} />
        <Row label="Email" value={contact.email} />
        <Row label="Phone" value={contact.phone} />
        <Row label="WhatsApp" value={contact.whatsapp} />
        <Row label="LINE ID" value={contact.lineId} />
        <Row label="Special Requests" value={specialRequests} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <Label>Preferred Language for Communication</Label>
        <select className={sel + " mt-1"} value={primaryLanguage} onChange={e => onLanguage(e.target.value)}>
          <option value="en">English</option>
          <option value="ko">Korean (한국어)</option>
          <option value="ja">Japanese (日本語)</option>
          <option value="th">Thai (ภาษาไทย)</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <SignaturePad
          label="Signature (Draw to sign)"
          value={signatureImage}
          onChange={onSignatureChange}
          height={180}
        />
        <p className="text-xs text-gray-400 mt-2">Draw your signature using mouse or touch. Tap Clear to redo.</p>
      </div>

      <div className="bg-orange-50 rounded-xl border border-orange-200 p-5 space-y-3">
        <h4 className="font-semibold text-orange-800 text-sm">Terms & Conditions</h4>
        <p className="text-xs text-orange-700 leading-relaxed">
          By submitting this application, I confirm that all information provided is accurate and complete.
          I understand that submitting an application does not guarantee enrolment. Edubee Camp will review
          the application and contact me within 2 business days. I agree to the terms and conditions of
          enrolment, including applicable fees and cancellation policies.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 accent-orange-500"
            checked={terms}
            onChange={e => setTerms(e.target.checked)}
          />
          <span className="text-sm text-orange-800 font-medium">
            I agree to the terms and conditions above.
          </span>
        </label>
      </div>

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!terms || !signatureImage || isLoading}
          className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {isLoading ? "Submitting…" : "Submit Application"}
        </button>
      </div>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ appNumber }: { appNumber: string }) {
  return (
    <div className="text-center py-12 space-y-5">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Application Submitted!</h2>
        <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
          Thank you for applying. Our team will review your application and contact you within
          <strong> 2 business days</strong>.
        </p>
      </div>
      <div className="bg-orange-50 rounded-xl border border-orange-200 px-6 py-4 inline-block">
        <div className="text-xs text-orange-600 font-semibold uppercase tracking-wide mb-1">Application Reference</div>
        <div className="text-2xl font-bold text-orange-700 font-mono">{appNumber}</div>
      </div>
      <p className="text-xs text-gray-400">Please save your reference number for future enquiries.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
      >
        Submit Another Application
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ApplyPage() {
  const [step, setStep] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [preferredStart, setPreferredStart] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState("en");
  const [students, setStudents] = useState<Student[]>([emptyStudent()]);
  const [contact, setContact] = useState<Contact>({
    fullName: "", firstName: "", lastName: "",
    email: "", phone: "", whatsapp: "", lineId: "", relationship: "",
  });
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [successRef, setSuccessRef] = useState<string | null>(null);

  const { data: groups = [], isLoading: loadingGroups } = useQuery<PackageGroup[]>({
    queryKey: ["public-packages"],
    queryFn: () => axios.get(`${BASE}/api/public/packages`).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const group = groups.find(g => g.id === selectedGroup);
  const pkg = group?.packages.find(p => p.id === selectedPackage);
  const spots = group?.spotSummary?.grades ?? [];

  const submitMutation = useMutation({
    mutationFn: () => {
      const participants = [
        // Contact person as adult
        {
          participantType: "adult" as const,
          fullName: contact.fullName,
          firstName: contact.firstName || undefined,
          lastName: contact.lastName || undefined,
          email: contact.email || undefined,
          phone: contact.phone || undefined,
          whatsapp: contact.whatsapp || undefined,
          lineId: contact.lineId || undefined,
          relationshipToStudent: contact.relationship || undefined,
          isEmergencyContact: true,
        },
        // Students
        ...students.map(s => ({
          participantType: "child" as const,
          fullName: `${s.firstName} ${s.lastName}`.trim(),
          firstName: s.firstName || undefined,
          lastName: s.lastName || undefined,
          fullNameNative: s.fullNameNative || undefined,
          dateOfBirth: s.dateOfBirth || undefined,
          gender: s.gender || undefined,
          nationality: s.nationality || undefined,
          passportNumber: s.passportNumber || undefined,
          passportExpiry: s.passportExpiry || undefined,
          grade: s.grade || undefined,
          schoolName: s.schoolName || undefined,
          englishLevel: s.englishLevel || undefined,
          medicalConditions: s.medicalConditions || undefined,
          dietaryRequirements: s.dietaryRequirements || undefined,
          enrollmentSpotId: s.enrollmentSpotId || undefined,
        })),
      ];

      return axios.post(`${BASE}/api/public/applications`, {
        packageGroupId: selectedGroup,
        packageId: selectedPackage || undefined,
        preferredStartDate: preferredStart || undefined,
        referralSource: referralSource || undefined,
        referralAgentCode: referralCode || undefined,
        primaryLanguage,
        specialRequests: specialRequests || undefined,
        termsAccepted: true,
        signatureImage: signatureImage || undefined,
        participants,
      }).then(r => r.data);
    },
    onSuccess: (data) => setSuccessRef(data.applicationNumber),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Submission failed. Please try again.";
      alert(msg);
    },
  });

  if (successRef) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-xl"><SuccessScreen appNumber={successRef} /></div>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <StepIndicator current={step} />

          {loadingGroups && step === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
            </div>
          ) : step === 0 ? (
            <ProgramStep
              groups={groups}
              selectedGroup={selectedGroup}
              selectedPackage={selectedPackage}
              preferredStart={preferredStart}
              referralCode={referralCode}
              onGroup={setSelectedGroup}
              onPackage={setSelectedPackage}
              onStart={setPreferredStart}
              onCode={setReferralCode}
              onNext={() => setStep(1)}
            />
          ) : step === 1 ? (
            <StudentsStep
              students={students}
              spots={spots}
              onChange={(i, s) => setStudents(prev => prev.map((x, j) => j === i ? s : x))}
              onAdd={() => setStudents(prev => [...prev, emptyStudent()])}
              onRemove={(i) => setStudents(prev => prev.filter((_, j) => j !== i))}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          ) : step === 2 ? (
            <ContactStep
              contact={contact}
              specialRequests={specialRequests}
              referralSource={referralSource}
              onChange={setContact}
              onReq={setSpecialRequests}
              onRef={setReferralSource}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          ) : (
            <SubmitStep
              group={group}
              pkg={pkg}
              students={students}
              contact={contact}
              preferredStart={preferredStart}
              specialRequests={specialRequests}
              referralSource={referralSource}
              referralCode={referralCode}
              primaryLanguage={primaryLanguage}
              onLanguage={setPrimaryLanguage}
              onBack={() => setStep(2)}
              onSubmit={() => submitMutation.mutate()}
              isLoading={submitMutation.isPending}
              signatureImage={signatureImage}
              onSignatureChange={setSignatureImage}
            />
          )}
        </div>
      </main>
      <footer className="text-center py-6 text-xs text-gray-400">
        © {new Date().getFullYear()} Edubee Camp. All rights reserved.
      </footer>
    </div>
  );
}

function Header() {
  return (
    <header className="bg-white border-b border-gray-100 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <div>
            <div className="font-bold text-gray-800 text-sm leading-none">Edubee Camp</div>
            <div className="text-[10px] text-gray-400">Application Form</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Camp Applications {new Date().getFullYear()}</span>
        </div>
      </div>
    </header>
  );
}
