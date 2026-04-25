import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, Plus, Trash2, Loader2, Save, Globe, Check,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ApplicationForm { id: string; name: string; slug: string; visibility: string; status: string; }
interface TermsContent { id: string; formId: string; language: string; content: string; isDefault: boolean; updatedAt: string; }

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  ko: "한국어 (Korean)",
  ja: "日本語 (Japanese)",
  zh: "中文 (Chinese)",
  th: "ภาษาไทย (Thai)",
  vi: "Tiếng Việt (Vietnamese)",
  id: "Bahasa Indonesia",
  ar: "العربية (Arabic)",
  fr: "Français (French)",
  de: "Deutsch (German)",
};

const ALL_LANGUAGES = Object.keys(LANGUAGE_LABELS);

const inputCls = "w-full rounded-lg border border-[#E8E6E2] px-3 py-2 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-(--e-orange)/40 focus:border-(--e-orange) transition";

// ── Tab Nav ─────────────────────────────────────────────────────────────────
function TabNav({ formId, active }: { formId: string; active: "edit" | "partners" | "terms" }) {
  const [, setLocation] = useLocation();
  const tabs = [
    { id: "edit",     label: "Settings",       path: `/admin/application-forms/${formId}/edit` },
    { id: "partners", label: "Partner Links",   path: `/admin/application-forms/${formId}/partners` },
    { id: "terms",    label: "Terms & Conditions", path: `/admin/application-forms/${formId}/terms` },
  ];
  return (
    <div className="flex gap-1 border-b border-[#E8E6E2] px-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setLocation(tab.path)}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px ${
            active === tab.id
              ? "border-(--e-orange) text-(--e-orange)"
              : "border-transparent text-[#A8A29E] hover:text-[#57534E]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── Terms Editor ─────────────────────────────────────────────────────────────
function TermsEditor({
  formId, existing, onClose,
}: {
  formId: string;
  existing?: TermsContent;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [lang, setLang] = useState(existing?.language ?? "en");
  const [content, setContent] = useState(existing?.content ?? "");
  const [isDefault, setIsDefault] = useState(existing?.isDefault ?? false);

  const save = useMutation({
    mutationFn: () =>
      axios.put(`${BASE}/api/application-forms/${formId}/terms/${lang}`, { content, isDefault }).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Saved", description: `Terms for ${LANGUAGE_LABELS[lang] ?? lang} saved.` });
      qc.invalidateQueries({ queryKey: ["form-terms", formId] });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.error ?? "Save failed", variant: "destructive" });
    },
  });

  const insertText = (before: string, after = "") => {
    const ta = document.getElementById("terms-textarea") as HTMLTextAreaElement | null;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = ta.value.substring(start, end);
    const newVal = ta.value.substring(0, start) + before + sel + after + ta.value.substring(end);
    setContent(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + sel.length);
    }, 0);
  };

  return (
    <div className="space-y-4">
      {/* Language selector */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-semibold text-[#57534E] uppercase tracking-wide mb-1">
            Language <span className="text-red-500">*</span>
          </label>
          {existing ? (
            <div className="flex items-center gap-2 h-9 px-3 bg-[#F4F3F1] rounded-lg border border-[#E8E6E2]">
              <Globe className="w-4 h-4 text-[#A8A29E]" />
              <span className="text-sm text-[#1C1917]">{LANGUAGE_LABELS[lang] ?? lang}</span>
            </div>
          ) : (
            <select
              value={lang}
              onChange={e => setLang(e.target.value)}
              className={inputCls + " h-9"}
            >
              {ALL_LANGUAGES.map(l => (
                <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--e-orange)]"
            />
            <span className="text-sm text-[#1C1917]">Set as default language</span>
          </label>
        </div>
      </div>

      {/* Formatting toolbar */}
      <div>
        <div className="flex items-center gap-1 px-2 py-1.5 bg-[#F4F3F1] border border-[#E8E6E2] border-b-0 rounded-t-lg">
          {[
            { label: "H1", action: () => insertText("# ") },
            { label: "H2", action: () => insertText("## ") },
            { label: "H3", action: () => insertText("### ") },
            { label: "B", action: () => insertText("**", "**"), cls: "font-bold" },
            { label: "I", action: () => insertText("_", "_"), cls: "italic" },
            { label: "•", action: () => insertText("- ") },
            { label: "1.", action: () => insertText("1. ") },
            { label: "—", action: () => insertText("\n---\n") },
          ].map(btn => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.action}
              className={`px-2.5 py-1 text-xs rounded hover:bg-white hover:text-(--e-orange) text-[#57534E] transition-colors font-mono ${btn.cls ?? ""}`}
            >
              {btn.label}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-[#A8A29E]">Markdown supported</span>
        </div>

        <textarea
          id="terms-textarea"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={20}
          placeholder="Enter the Terms & Conditions content here.&#10;&#10;Supports Markdown formatting:&#10;# Heading 1&#10;## Heading 2&#10;**bold**, _italic_&#10;- bullet list&#10;1. numbered list"
          className="w-full border border-[#E8E6E2] rounded-b-lg px-4 py-3 text-sm text-[#1C1917] font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-(--e-orange)/40 focus:border-(--e-orange) placeholder:text-[#C4C0BB]"
        />
      </div>

      {/* Preview */}
      {content && (
        <div>
          <p className="text-[11px] font-semibold text-[#57534E] uppercase tracking-wide mb-2">Preview</p>
          <div
            className="border border-[#E8E6E2] rounded-lg p-4 text-sm text-[#1C1917] leading-relaxed max-h-64 overflow-y-auto prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="text-sm">Cancel</Button>
        <Button
          onClick={() => save.mutate()}
          disabled={!content.trim() || save.isPending}
          className="bg-(--e-orange) hover:bg-(--e-orange-hover) text-white text-sm"
        >
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
          Save
        </Button>
      </div>
    </div>
  );
}

// ── Minimal Markdown → HTML ──────────────────────────────────────────────────
function markdownToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3 class='font-semibold text-base mt-3 mb-1'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class='font-bold text-lg mt-4 mb-1'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class='font-bold text-xl mt-5 mb-2'>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/^---$/gm, "<hr class='border-gray-200 my-3'>")
    .replace(/^- (.+)$/gm, "<li class='ml-4 list-disc'>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li class='ml-4 list-decimal'>$2</li>")
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ApplicationFormTerms() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showEditor, setShowEditor] = useState(false);
  const [editTarget, setEditTarget] = useState<TermsContent | undefined>(undefined);

  const { data: form, isLoading: formLoading } = useQuery<ApplicationForm>({
    queryKey: ["application-form", params.id],
    queryFn: () => axios.get(`${BASE}/api/application-forms/${params.id}`).then(r => r.data),
  });

  const { data: terms = [], isLoading: termsLoading } = useQuery<TermsContent[]>({
    queryKey: ["form-terms", params.id],
    queryFn: () => axios.get(`${BASE}/api/application-forms/${params.id}/terms`).then(r => r.data),
    enabled: !!params.id,
  });

  const deleteTerm = useMutation({
    mutationFn: (lang: string) =>
      axios.delete(`${BASE}/api/application-forms/${params.id}/terms/${lang}`).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Deleted" });
      qc.invalidateQueries({ queryKey: ["form-terms", params.id] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.error ?? "Delete failed", variant: "destructive" });
    },
  });

  const existingLangs = terms.map(t => t.language);
  const availableLangs = ALL_LANGUAGES.filter(l => !existingLangs.includes(l));

  if (formLoading) return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-(--e-orange)" />
    </div>
  );

  if (!form) return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
      <p className="text-[#A8A29E]">Form not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E6E2]">
        <div className="px-6 py-4">
          <div className="flex items-center gap-2 text-sm mb-3">
            <button
              onClick={() => setLocation("/admin/application-forms")}
              className="text-[#A8A29E] hover:text-(--e-orange) transition-colors"
            >
              Forms Management
            </button>
            <ChevronLeft className="w-3.5 h-3.5 text-[#A8A29E] rotate-180" />
            <button
              onClick={() => setLocation(`/admin/application-forms/${form.id}/edit`)}
              className="text-[#A8A29E] hover:text-(--e-orange) transition-colors"
            >
              {form.name}
            </button>
            <ChevronLeft className="w-3.5 h-3.5 text-[#A8A29E] rotate-180" />
            <span className="font-semibold text-[#1C1917]">Terms &amp; Conditions</span>
          </div>
        </div>
        <TabNav formId={form.id} active="terms" />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

        {/* Header Card */}
        <div className="bg-white rounded-xl border border-[#E8E6E2] p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#1C1917] mb-1">{form.name}</h2>
            <p className="text-xs text-[#A8A29E]">
              Manage multi-language Terms &amp; Conditions for this form.
              The public form will automatically display terms in the visitor's language.
            </p>
          </div>
          <Button
            onClick={() => { setEditTarget(undefined); setShowEditor(true); }}
            disabled={availableLangs.length === 0}
            className="bg-(--e-orange) hover:bg-(--e-orange-hover) text-white text-sm shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Language
          </Button>
        </div>

        {/* Editor (inline) */}
        {showEditor && (
          <div className="bg-white rounded-xl border border-[#E8E6E2] p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-[#1C1917]">
                {editTarget ? `Edit — ${LANGUAGE_LABELS[editTarget.language] ?? editTarget.language}` : "Add New Language"}
              </h3>
            </div>
            <TermsEditor
              formId={form.id}
              existing={editTarget}
              onClose={() => { setShowEditor(false); setEditTarget(undefined); }}
            />
          </div>
        )}

        {/* Language List */}
        <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-hidden">
          {termsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-(--e-orange)" />
            </div>
          ) : terms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-[#A8A29E]">
              <Globe className="w-10 h-10 text-[#D1CECA]" />
              <div className="text-center">
                <p className="text-sm font-medium">No terms content yet</p>
                <p className="text-xs mt-0.5">Click "Add Language" to create the first version</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E6E2] bg-[#F4F3F1]">
                  {["Language", "Default", "Last Updated", "Preview", "Actions"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {terms.map((term, i) => (
                  <tr key={term.language} className={`border-b border-[#E8E6E2] hover:bg-[#FAFAF9] transition-colors ${i === terms.length - 1 ? "border-b-0" : ""}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[#A8A29E] shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-[#1C1917]">{LANGUAGE_LABELS[term.language] ?? term.language}</p>
                          <p className="text-[10px] text-[#A8A29E] font-mono">{term.language}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {term.isDefault ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-(--e-orange-lt) text-(--e-orange)">
                          <Check className="w-3 h-3" /> Default
                        </span>
                      ) : (
                        <span className="text-[#D1CECA] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#A8A29E] whitespace-nowrap">
                      {new Date(term.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 max-w-[280px]">
                      <p className="text-xs text-[#57534E] line-clamp-2 leading-relaxed">
                        {term.content.slice(0, 120).replace(/[#*_-]/g, "").trim()}…
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditTarget(term); setShowEditor(true); }}
                          className="p-1.5 rounded-lg hover:bg-(--e-orange-lt) text-[#A8A29E] hover:text-(--e-orange) transition-colors text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${LANGUAGE_LABELS[term.language] ?? term.language} terms?`)) {
                              deleteTerm.mutate(term.language);
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-[#A8A29E] hover:text-red-600 transition-colors"
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

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 leading-relaxed space-y-1.5">
          <p className="font-semibold">How language selection works on the public form:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Matches the visitor's browser language exactly (e.g., <code className="font-mono bg-blue-100 px-1 rounded">ko</code>)</li>
            <li>Falls back to the language marked as <strong>Default</strong></li>
            <li>Falls back to English (<code className="font-mono bg-blue-100 px-1 rounded">en</code>)</li>
            <li>Falls back to the first available language</li>
          </ol>
          <p className="mt-2">Use Markdown for formatting: <code className="font-mono bg-blue-100 px-1 rounded"># Heading</code>, <code className="font-mono bg-blue-100 px-1 rounded">**bold**</code>, <code className="font-mono bg-blue-100 px-1 rounded">- bullet</code></p>
        </div>

      </div>
    </div>
  );
}
