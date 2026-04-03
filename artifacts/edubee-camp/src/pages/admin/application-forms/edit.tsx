import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Loader2, Copy, Check } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const APPLY_BASE = "https://edubee-crm-20260327.replit.app";

function toSlug(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export default function ApplicationFormEdit() {
  const params = useParams<{ id?: string }>();
  const isNew = !params.id || params.id === "new";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [name,        setName]        = useState("");
  const [slug,        setSlug]        = useState("");
  const [slugManual,  setSlugManual]  = useState(false);
  const [formType,    setFormType]    = useState<"camp_application" | "lead_inquiry">("camp_application");
  const [description, setDescription] = useState("");
  const [visibility,  setVisibility]  = useState<"public" | "private">("private");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [status,      setStatus]      = useState(true); // true = active
  const [copied,      setCopied]      = useState(false);

  const { isLoading } = useQuery({
    queryKey: ["application-form", params.id],
    queryFn: () => axios.get(`${BASE}/api/application-forms/${params.id}`).then(r => r.data),
    enabled: !isNew,
    onSuccess: undefined,
  });

  const { data: formData } = useQuery({
    queryKey: ["application-form", params.id],
    queryFn: () => axios.get(`${BASE}/api/application-forms/${params.id}`).then(r => r.data),
    enabled: !isNew,
  });

  useEffect(() => {
    if (formData && !isNew) {
      setName(formData.name ?? "");
      setSlug(formData.slug ?? "");
      setFormType(formData.formType ?? "camp_application");
      setDescription(formData.description ?? "");
      setVisibility(formData.visibility ?? "private");
      setRedirectUrl(formData.redirectUrl ?? "");
      setStatus(formData.status === "active");
      setSlugManual(true);
    }
  }, [formData, isNew]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugManual) setSlug(toSlug(v));
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = { name, slug, formType, description: description || null, visibility, redirectUrl: redirectUrl || null, status: status ? "active" : "inactive" };
      return isNew
        ? axios.post(`${BASE}/api/application-forms`, payload).then(r => r.data)
        : axios.put(`${BASE}/api/application-forms/${params.id}`, payload).then(r => r.data);
    },
    onSuccess: (data) => {
      toast({ title: isNew ? "Form Created" : "Form Saved", description: `"${data.name}" ${isNew ? "created" : "updated"} successfully.` });
      if (isNew) setLocation(`/admin/application-forms/${data.id}/partners`);
      else setLocation("/admin/application-forms");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.error ?? "Failed to save", variant: "destructive" });
    },
  });

  const publicUrl = `${APPLY_BASE}/${slug}`;

  const copySlug = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const inputCls = "h-9 text-sm border-[#E8E6E2] focus-visible:ring-(--e-orange)/40 focus-visible:border-(--e-orange) rounded-lg";

  if (!isNew && isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-(--e-orange)" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E6E2] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/admin/application-forms")}
            className="flex items-center gap-1.5 text-sm text-[#A8A29E] hover:text-[#1C1917] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Application Forms
          </button>
          <span className="text-[#E8E6E2]">|</span>
          <h1 className="text-sm font-semibold text-[#1C1917]">{isNew ? "New Form" : "Edit Form"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation("/admin/application-forms")}>Cancel</Button>
          <Button
            size="sm"
            className="bg-(--e-orange) hover:bg-(--e-orange-hover) text-white"
            disabled={!name || !slug || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Save Form
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-hidden">
          <div className="bg-(--e-orange) text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5">
            Form Details
          </div>
          <div className="p-5 space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">
                Form Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Study Abroad Application 2026"
                className={inputCls}
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">
                Slug <span className="text-red-500">*</span>
              </label>
              <Input
                value={slug}
                onChange={e => { setSlugManual(true); setSlug(toSlug(e.target.value)); }}
                placeholder="e.g. study-abroad-application-2026"
                className={inputCls}
              />
              {slug && (
                <div className="flex items-center gap-2 mt-1.5">
                  <p className="text-xs text-[#A8A29E] flex-1 font-mono bg-[#F4F3F1] px-3 py-1.5 rounded-lg overflow-hidden text-ellipsis whitespace-nowrap">
                    {publicUrl}
                  </p>
                  <button
                    type="button"
                    onClick={copySlug}
                    className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[#E8E6E2] hover:bg-(--e-orange-lt) hover:border-(--e-orange) hover:text-(--e-orange) transition-colors"
                  >
                    {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
              )}
            </div>

            {/* Form Type */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">
                Form Type <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {([
                  { value: "camp_application", label: "Camp Application", desc: "Collects student and camp program application details" },
                  { value: "lead_inquiry",     label: "Lead Inquiry",     desc: "Captures general interest and contact details — creates a lead in the CRM" },
                ] as const).map(opt => (
                  <label key={opt.value} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="formType"
                      value={opt.value}
                      checked={formType === opt.value}
                      onChange={() => setFormType(opt.value)}
                      className="mt-0.5 accent-(--e-orange)"
                    />
                    <div>
                      <p className="text-sm font-medium text-[#1C1917]">{opt.label}</p>
                      <p className="text-xs text-[#A8A29E]">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">
                Visibility <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {(["public", "private"] as const).map(v => (
                  <label key={v} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="visibility"
                      value={v}
                      checked={visibility === v}
                      onChange={() => setVisibility(v)}
                      className="mt-0.5 accent-(--e-orange)"
                    />
                    <div>
                      <p className="text-sm font-medium text-[#1C1917] capitalize">{v}</p>
                      <p className="text-xs text-[#A8A29E]">
                        {v === "public"
                          ? "Anyone with the URL can access this form"
                          : "Only accessible via links with a partner parameter"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">Description</label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description for this form..."
                rows={3}
                className="text-sm border-[#E8E6E2] focus-visible:ring-(--e-orange)/40 focus-visible:border-(--e-orange) resize-none rounded-lg"
              />
            </div>

            {/* Redirect URL */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">Redirect URL (After Submit)</label>
              <Input
                value={redirectUrl}
                onChange={e => setRedirectUrl(e.target.value)}
                placeholder="https://example.com/thank-you"
                className={inputCls}
              />
              <p className="text-[11px] text-[#A8A29E]">Applicants are redirected here after submitting. Leave blank for default confirmation page.</p>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-[#1C1917]">Status</p>
                <p className="text-xs text-[#A8A29E]">{status ? "Form is active and accessible" : "Form is inactive"}</p>
              </div>
              <button
                type="button"
                onClick={() => setStatus(s => !s)}
                className={`relative w-11 h-6 rounded-full transition-colors ${status ? "bg-(--e-orange)" : "bg-[#E8E6E2]"}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${status ? "left-6" : "left-1"}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setLocation("/admin/application-forms")}>Cancel</Button>
          <Button
            className="bg-(--e-orange) hover:bg-(--e-orange-hover) text-white"
            disabled={!name || !slug || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Save Form
          </Button>
        </div>
      </div>
    </div>
  );
}
