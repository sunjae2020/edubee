import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Search, Edit2, Users, Copy, Trash2, ExternalLink,
  FileText, ChevronRight, X, Loader2,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ApplicationForm {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  formType: string;
  visibility: string;
  status: string;
  sourceFormId: string | null;
  sourceName: string | null;
  partnerCount: number;
  createdOn: string;
}

// ── Clone Modal ─────────────────────────────────────────────────────────────
function CloneModal({ form, onClose }: { form: ApplicationForm; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const [newName, setNewName] = useState(`${form.name} - Copy`);
  const [newSlug, setNewSlug] = useState(`${form.slug}-copy`);
  const [includePartners, setIncludePartners] = useState(false);

  const toSlug = (v: string) =>
    v.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

  const clone = useMutation({
    mutationFn: () =>
      axios.post(`${BASE}/api/application-forms/${form.id}/clone`, { newName, newSlug, includePartners })
        .then(r => r.data),
    onSuccess: (data) => {
      toast({ title: "Form Cloned", description: `"${data.name}" created successfully.` });
      qc.invalidateQueries({ queryKey: ["application-forms"] });
      onClose();
      setLocation(`/admin/application-forms/${data.id}/edit`);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.error ?? "Clone failed", variant: "destructive" });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1C1917]">Clone Form</h2>
          <button onClick={onClose} className="text-[#A8A29E] hover:text-[#1C1917]"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">Source Form</p>
          <p className="text-sm text-[#1C1917] bg-[#F4F3F1] px-3 py-2 rounded-lg">{form.name}</p>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">New Form Name *</label>
          <Input
            value={newName}
            onChange={e => { setNewName(e.target.value); setNewSlug(toSlug(e.target.value)); }}
            className="h-9 text-sm border-[#E8E6E2] focus-visible:ring-[--e-orange]/40 focus-visible:border-[--e-orange]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">New Slug *</label>
          <Input
            value={newSlug}
            onChange={e => setNewSlug(toSlug(e.target.value))}
            className="h-9 text-sm border-[#E8E6E2] focus-visible:ring-[--e-orange]/40 focus-visible:border-[--e-orange]"
          />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={includePartners} onChange={e => setIncludePartners(e.target.checked)}
            className="w-4 h-4 accent-[--e-orange]" />
          <span className="text-sm text-[#57534E]">Include partner links</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="bg-[--e-orange] hover:bg-[--e-orange-hover] text-white"
            disabled={!newName || !newSlug || clone.isPending}
            onClick={() => clone.mutate()}
          >
            {clone.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Clone Form
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function ApplicationFormList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [formTypeFilter, setFormTypeFilter] = useState("");
  const [visibility, setVisibility] = useState("");
  const [status, setStatus] = useState("active");
  const [cloneTarget, setCloneTarget] = useState<ApplicationForm | null>(null);

  const { data: forms = [], isLoading } = useQuery<ApplicationForm[]>({
    queryKey: ["application-forms", search, formTypeFilter, visibility, status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search)         params.set("search", search);
      if (formTypeFilter) params.set("formType", formTypeFilter);
      if (visibility)     params.set("visibility", visibility);
      if (status)         params.set("status", status);
      return axios.get(`${BASE}/api/application-forms?${params}`).then(r => r.data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/application-forms/${id}`).then(r => r.data),
    onSuccess: (data) => {
      toast({ title: "Form Deleted", description: `Form and ${data.partnerCount} partner link(s) deactivated.` });
      qc.invalidateQueries({ queryKey: ["application-forms"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.error ?? "Delete failed", variant: "destructive" });
    },
  });

  const confirmDelete = (form: ApplicationForm) => {
    if (!window.confirm(`Delete "${form.name}"?\n\nThis will also deactivate ${form.partnerCount} partner link(s).`)) return;
    deleteMutation.mutate(form.id);
  };

  const selCls = "h-8 rounded-lg border border-[#E8E6E2] px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[--e-orange]/40 focus:border-[--e-orange]";

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E6E2] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#1C1917]">Application Forms</h1>
          <p className="text-xs text-[#A8A29E] mt-0.5">Manage custom application form links for partners</p>
        </div>
        <Button
          className="bg-[--e-orange] hover:bg-[--e-orange-hover] text-white h-9 px-4 text-sm font-medium"
          onClick={() => setLocation("/admin/application-forms/new")}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Form
        </Button>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
          <Input
            placeholder="Search forms..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm border-[#E8E6E2] focus-visible:ring-[--e-orange]/40 focus-visible:border-[--e-orange]"
          />
        </div>
        <select value={formTypeFilter} onChange={e => setFormTypeFilter(e.target.value)} className={selCls}>
          <option value="">All Types</option>
          <option value="camp_application">Camp Application</option>
          <option value="lead_inquiry">Lead Inquiry</option>
        </select>
        <select value={visibility} onChange={e => setVisibility(e.target.value)} className={selCls}>
          <option value="">All Visibility</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className={selCls}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="px-6 pb-10">
        <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-[--e-orange]" />
            </div>
          ) : forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-[#A8A29E]">
              <FileText className="w-8 h-8" />
              <p className="text-sm">No forms found. Create your first form.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E6E2] bg-[#F4F3F1]">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">Form Name</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">Visibility</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">Partners</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">Source</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((form, i) => (
                  <tr key={form.id} className={`border-b border-[#E8E6E2] hover:bg-[#FAFAF9] transition-colors ${i === forms.length - 1 ? "border-b-0" : ""}`}>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setLocation(`/admin/application-forms/${form.id}/partners`)}
                        className="font-medium text-[#1C1917] hover:text-[--e-orange] transition-colors flex items-center gap-1"
                      >
                        {form.name}
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
                      </button>
                      {form.slug && (
                        <p className="text-[11px] text-[#A8A29E] mt-0.5">/{form.slug}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {form.formType === "lead_inquiry" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">Lead Inquiry</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[--e-orange-lt] text-[--e-orange]">Camp App</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {form.visibility === "public" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700">Public</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F4F3F1] text-[#57534E]">Private</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[--e-orange-lt] text-[--e-orange]">
                        <Users className="w-3 h-3" />
                        {form.partnerCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#57534E] text-xs">
                      {form.sourceName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {form.status === "active" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-600">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setLocation(`/admin/application-forms/${form.id}/edit`)}
                          className="p-1.5 rounded-lg hover:bg-[--e-orange-lt] text-[#57534E] hover:text-[--e-orange] transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setLocation(`/admin/application-forms/${form.id}/partners`)}
                          className="p-1.5 rounded-lg hover:bg-[--e-orange-lt] text-[#57534E] hover:text-[--e-orange] transition-colors"
                          title="Partner Links"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setCloneTarget(form)}
                          className="p-1.5 rounded-lg hover:bg-[--e-orange-lt] text-[#57534E] hover:text-[--e-orange] transition-colors"
                          title="Clone"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => confirmDelete(form)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-[#57534E] hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {cloneTarget && <CloneModal form={cloneTarget} onClose={() => setCloneTarget(null)} />}
    </div>
  );
}
