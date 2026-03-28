import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Design helpers ──────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="bg-[#F5821F] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-t-xl">
      {title}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <SectionHeader title={title} />
      <div className="bg-card p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#57534E] uppercase tracking-wide mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "h-9 text-sm border-border focus-visible:ring-[#F5821F]/40 focus-visible:border-[#F5821F]";
const selectCls = "h-9 w-full rounded-md border border-border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-[#F5821F]/40 focus:border-[#F5821F]";

// ── Main component ──────────────────────────────────────────────────────────
export default function AdminCampApplicationForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // ── 신청인 정보
  const [firstName,       setFirstName]       = useState("");
  const [lastName,        setLastName]        = useState("");
  const [originalName,    setOriginalName]    = useState("");
  const [englishName,     setEnglishName]     = useState("");
  const [email,           setEmail]           = useState("");
  const [phone,           setPhone]           = useState("");
  const [nationality,     setNationality]     = useState("");
  const [dob,             setDob]             = useState("");

  // ── 프로그램
  const [packageGroupId,  setPackageGroupId]  = useState("");
  const [packageId,       setPackageId]       = useState("");
  const [preferredStart,  setPreferredStart]  = useState("");
  const [adultCount,      setAdultCount]      = useState("1");
  const [studentCount,    setStudentCount]    = useState("0");

  // ── 추가 요구사항
  const [specialReqs,     setSpecialReqs]     = useState("");
  const [dietaryReqs,     setDietaryReqs]     = useState("");
  const [medicalCond,     setMedicalCond]     = useState("");

  // ── 비상 연락처
  const [ecName,          setEcName]          = useState("");
  const [ecPhone,         setEcPhone]         = useState("");

  // ── 기타
  const [notes,           setNotes]           = useState("");

  // ── Package Groups
  const { data: pgResp } = useQuery({
    queryKey: ["admin-package-groups"],
    queryFn: () =>
      axios.get(`${BASE}/api/package-groups?limit=100&status=active`).then(r => r.data),
  });
  const packageGroups: Array<{ id: string; nameEn: string; nameKo: string }> =
    pgResp?.data ?? [];

  // ── Packages (filtered by group)
  const { data: pkgResp } = useQuery({
    queryKey: ["admin-packages", packageGroupId],
    queryFn: () =>
      axios.get(`${BASE}/api/packages?limit=100&packageGroupId=${packageGroupId}`).then(r => r.data),
    enabled: !!packageGroupId,
  });
  const packageOptions: Array<{ id: string; name: string }> = pkgResp?.data ?? [];

  // Reset package when group changes
  const onGroupChange = (id: string) => {
    setPackageGroupId(id);
    setPackageId("");
  };

  const submit = useMutation({
    mutationFn: () =>
      axios.post(`${BASE}/api/camp-applications`, {
        applicantFirstName:    firstName,
        applicantLastName:     lastName,
        applicantOriginalName: originalName || undefined,
        applicantEnglishName:  englishName  || undefined,
        applicantEmail:        email,
        applicantPhone:        phone        || undefined,
        applicantNationality:  nationality  || undefined,
        applicantDob:          dob          || undefined,
        packageGroupId,
        packageId,
        preferredStartDate:    preferredStart   || undefined,
        adultCount:            Number(adultCount),
        studentCount:          Number(studentCount),
        specialRequirements:   specialReqs  || undefined,
        dietaryRequirements:   dietaryReqs  || undefined,
        medicalConditions:     medicalCond  || undefined,
        emergencyContactName:  ecName       || undefined,
        emergencyContactPhone: ecPhone      || undefined,
        notes:                 notes        || undefined,
      }).then(r => r.data),

    onSuccess: (data) => {
      toast({ title: "Application Created", description: `${data.applicationRef} has been created.` });
      setLocation(`/admin/camp-applications/${data.id}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? "Failed to save. Please try again.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !packageGroupId || !packageId) {
      toast({
        title: "Required fields missing",
        description: "Please fill in First Name, Last Name, Email, Package Group and Package.",
        variant: "destructive",
      });
      return;
    }
    submit.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLocation("/admin/all-applications")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            All Applications
          </button>
          <span className="text-muted-foreground/40">|</span>
          <h1 className="text-sm font-semibold text-foreground">New Camp Application</h1>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLocation("/admin/all-applications")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="camp-app-form"
            size="sm"
            className="bg-[#F5821F] hover:bg-[#e06f0e] text-white"
            disabled={submit.isPending}
          >
            {submit.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Application
          </Button>
        </div>
      </div>

      {/* ── Form ── */}
      <form id="camp-app-form" onSubmit={onSubmit} className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* 신청인 정보 */}
        <Section title="Applicant Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" required>
              <Input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="e.g. John"
                className={inputCls}
              />
            </Field>
            <Field label="Last Name" required>
              <Input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="e.g. KIM"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Korean Name">
              <Input
                value={originalName}
                onChange={e => setOriginalName(e.target.value)}
                placeholder="e.g. Kim Jisoo"
                className={inputCls}
              />
            </Field>
            <Field label="English Name / Nick">
              <Input
                value={englishName}
                onChange={e => setEnglishName(e.target.value)}
                placeholder="e.g. Jisu"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" required>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="applicant@example.com"
                className={inputCls}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+82 10-0000-0000"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nationality">
              <Input
                value={nationality}
                onChange={e => setNationality(e.target.value)}
                placeholder="e.g. Korean"
                className={inputCls}
              />
            </Field>
            <Field label="Date of Birth">
              <Input
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* 프로그램 선택 */}
        <Section title="Programme">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Package Group" required>
              <select
                value={packageGroupId}
                onChange={e => onGroupChange(e.target.value)}
                className={selectCls}
              >
                <option value="">-- Select Group --</option>
                {packageGroups.map(pg => (
                  <option key={pg.id} value={pg.id}>
                    {pg.nameEn || pg.nameKo}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Package" required>
              <select
                value={packageId}
                onChange={e => setPackageId(e.target.value)}
                disabled={!packageGroupId}
                className={selectCls}
              >
                <option value="">-- Select Package --</option>
                {packageOptions.map(pk => (
                  <option key={pk.id} value={pk.id}>{pk.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Preferred Start Date">
              <Input
                type="date"
                value={preferredStart}
                onChange={e => setPreferredStart(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Adults">
              <Input
                type="number"
                min="0"
                value={adultCount}
                onChange={e => setAdultCount(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Students">
              <Input
                type="number"
                min="0"
                value={studentCount}
                onChange={e => setStudentCount(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* 추가 요구사항 */}
        <Section title="Special Requirements">
          <Field label="Special Requirements">
            <Textarea
              value={specialReqs}
              onChange={e => setSpecialReqs(e.target.value)}
              placeholder="Enter any special requirements"
              rows={3}
              className="text-sm border-border focus-visible:ring-[#F5821F]/40 focus-visible:border-[#F5821F] resize-none"
            />
          </Field>
          <Field label="Dietary Requirements">
            <Textarea
              value={dietaryReqs}
              onChange={e => setDietaryReqs(e.target.value)}
              placeholder="e.g. Vegetarian, Halal, nut allergy..."
              rows={3}
              className="text-sm border-border focus-visible:ring-[#F5821F]/40 focus-visible:border-[#F5821F] resize-none"
            />
          </Field>
          <Field label="Medical Conditions">
            <Textarea
              value={medicalCond}
              onChange={e => setMedicalCond(e.target.value)}
              placeholder="e.g. Asthma, diabetes, medication..."
              rows={3}
              className="text-sm border-border focus-visible:ring-[#F5821F]/40 focus-visible:border-[#F5821F] resize-none"
            />
          </Field>
        </Section>

        {/* 비상 연락처 */}
        <Section title="Emergency Contact">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Name">
              <Input
                value={ecName}
                onChange={e => setEcName(e.target.value)}
                placeholder="Full name"
                className={inputCls}
              />
            </Field>
            <Field label="Contact Phone">
              <Input
                value={ecPhone}
                onChange={e => setEcPhone(e.target.value)}
                placeholder="+82 10-0000-0000"
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* 메모 */}
        <Section title="Notes">
          <Field label="Internal Notes">
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Internal notes (not visible to applicant)"
              rows={4}
              className="text-sm border-border focus-visible:ring-[#F5821F]/40 focus-visible:border-[#F5821F] resize-none"
            />
          </Field>
        </Section>

        {/* Bottom action */}
        <div className="flex justify-end gap-2 pt-2 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/admin/all-applications")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-[#F5821F] hover:bg-[#e06f0e] text-white"
            disabled={submit.isPending}
          >
            {submit.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Application
          </Button>
        </div>
      </form>
    </div>
  );
}
