import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { differenceInDays, parseISO, isPast } from "date-fns";
import axios from "axios";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  FileText, Upload, Download, Eye, Trash2, ChevronDown, ChevronRight,
  AlertTriangle, File, FileImage, Loader2, X, GraduationCap, Briefcase, Clock,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type EntityType =
  | "application" | "contract" | "institute_mgt" | "hotel_mgt"
  | "pickup_mgt" | "tour_mgt" | "user" | "other_services_mgt";

// ─── Document category definitions ───────────────────────────────────────────
export const STUDENT_DOC_CATEGORIES = [
  { code: "PASSPORT",     label: "Passport",                        group: "student" },
  { code: "PHOTO_ID",     label: "Photo ID",                        group: "student" },
  { code: "ACADEMIC",     label: "Academic Certificate",            group: "student" },
  { code: "ENGLISH_TEST", label: "IELTS / TOEFL / PTE",            group: "student" },
  { code: "FINANCIAL",    label: "Financial Proof",                 group: "student" },
  { code: "VISA_DOC",     label: "Visa Documents",                  group: "student" },
  { code: "COE",          label: "Confirmation of Enrolment (COE)", group: "student" },
  { code: "OFFER_LETTER", label: "LOO / Offer Letter",             group: "student" },
  { code: "INSURANCE",    label: "Student Insurance",               group: "student" },
] as const;

export const CONSULTATION_DOC_CATEGORIES = [
  { code: "CONSULTATION",  label: "Consultation Form",            group: "consultation" },
  { code: "QUOTATION",     label: "Quotation",                    group: "consultation" },
  { code: "CONTRACT_DOC",  label: "Contract Document",            group: "consultation" },
  { code: "CORRESPONDENCE",label: "Email / Memo / Official Letter", group: "consultation" },
  { code: "SCHOOL_INFO",   label: "School Brochure / Info Material", group: "consultation" },
  { code: "OTHER",         label: "Other",                        group: "consultation" },
] as const;

const EXPIRY_CATS = ["PASSPORT", "FINANCIAL", "ENGLISH_TEST", "VISA_DOC"];
const SUBMITTED_CATS = ["VISA_DOC", "COE", "OFFER_LETTER"];

type TabType = "student" | "consultation";

interface Props {
  entityType: EntityType;
  entityId: string;
  mode?: "full" | "simple";
}

interface DocGroup { group: string; groupLabel: string; documents: DocRecord[]; }

interface DocRecord {
  id: string;
  documentName: string;
  originalFilename: string | null;
  fileType: string | null;
  fileExtension: string | null;
  status: string | null;
  expiryDate: string | null;
  createdAt: string;
  isExtraCategory: boolean;
  extraCategoryName: string | null;
  categoryGroup: string;
  categoryCode: string | null;
  categoryNameEn: string | null;
  serviceType: string | null;
  uploadedByName: string | null;
  fileSizeBytes: number | null;
  documentCategory: string | null;
  isSubmitted: boolean;
  submittedTo: string | null;
  permissions: { canView: boolean; canDownload: boolean; canDelete: boolean };
}

interface PermCheck {
  canUpload: boolean;
  canView: boolean;
  canUploadExtra: boolean;
  availableCategories: { id: string; categoryCode: string; categoryNameEn: string; categoryGroup: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-600",
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ ext }: { ext: string | null }) {
  if (!ext) return <File className="w-4 h-4 text-muted-foreground" />;
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return <FileImage className="w-4 h-4 text-blue-500" />;
  if (ext === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
}

// ─── D-day / expiry badge ─────────────────────────────────────────────────────
function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return null;
  let dt: Date;
  try { dt = parseISO(expiryDate); } catch { return null; }
  const days = differenceInDays(dt, new Date());

  if (isPast(dt) && days < 0) {
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-red-100 text-red-700">Expired</span>;
  }
  if (days <= 30) {
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-orange-100 text-orange-700">D-{days}</span>;
  }
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-green-50 text-green-700">{expiryDate}</span>;
}

// ─── Document row ─────────────────────────────────────────────────────────────
function DocRow({ doc, onDelete, showExpiry = false }: { doc: DocRecord; onDelete: (id: string) => void; showExpiry?: boolean }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = ["super_admin", "admin"].includes(user?.role ?? "");

  async function handleView() {
    try {
      const res = await axios.get(`${BASE}/api/documents/${doc.id}/view`, { responseType: "blob" });
      window.open(URL.createObjectURL(res.data), "_blank");
    } catch { toast({ variant: "destructive", title: "Failed to open document" }); }
  }

  async function handleDownload() {
    try {
      const res = await axios.get(`${BASE}/api/documents/${doc.id}/download`, { responseType: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(res.data);
      a.download = doc.originalFilename ?? doc.documentName;
      a.click();
    } catch { toast({ variant: "destructive", title: "Failed to download document" }); }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0 hover:bg-[#FEF0E3]/40 transition-colors group">
      <FileIcon ext={doc.fileExtension} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{doc.documentName}</span>
          {doc.isExtraCategory && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700 bg-amber-50">Other</Badge>
          )}
          {doc.status && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[doc.status] ?? "bg-gray-100 text-gray-600"}`}>
              {doc.status.replace(/_/g, " ")}
            </span>
          )}
          {showExpiry && <ExpiryBadge expiryDate={doc.expiryDate} />}
          {doc.isSubmitted && doc.submittedTo && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">
              Submitted to: {doc.submittedTo}
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
          {doc.documentCategory && (
            <span className="font-medium text-[#F5821F]">
              {[...STUDENT_DOC_CATEGORIES, ...CONSULTATION_DOC_CATEGORIES].find(c => c.code === doc.documentCategory)?.label ?? doc.documentCategory}
            </span>
          )}
          {doc.uploadedByName && <span>by {doc.uploadedByName}</span>}
          {doc.fileSizeBytes ? <span>· {formatBytes(doc.fileSizeBytes)}</span> : null}
          <span>· {new Date(doc.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {doc.permissions.canView && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleView} title="View">
            <Eye className="w-3.5 h-3.5" />
          </Button>
        )}
        {doc.permissions.canDownload && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDownload} title="Download">
            <Download className="w-3.5 h-3.5" />
          </Button>
        )}
        {(doc.permissions.canDelete || isAdmin) && (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(doc.id)} title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  entityType: EntityType;
  entityId: string;
  activeTab: TabType;
  availableCategories: { id: string; categoryNameEn: string; categoryGroup: string }[];
  canUploadExtra: boolean;
  onSuccess: () => void;
}

function UploadModal({ open, onClose, entityType, entityId, activeTab, availableCategories, canUploadExtra, onSuccess }: UploadModalProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [docCategory, setDocCategory] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedTo, setSubmittedTo] = useState("");
  const [isExtra, setIsExtra] = useState(false);
  const [extraName, setExtraName] = useState("");
  const [uploading, setUploading] = useState(false);

  const referenceType = ["application", "contract", "user", "other_services_mgt"].includes(entityType) ? entityType : "contract";
  const cats = activeTab === "student" ? STUDENT_DOC_CATEGORIES : CONSULTATION_DOC_CATEGORIES;
  const showExpiry = EXPIRY_CATS.includes(docCategory);
  const showSubmitted = SUBMITTED_CATS.includes(docCategory);

  function reset() {
    setFile(null); setDocName(""); setCategoryId(""); setDocCategory("");
    setExpiryDate(""); setIsSubmitted(false); setSubmittedTo("");
    setIsExtra(false); setExtraName("");
  }

  async function handleUpload() {
    if (!file) return toast({ variant: "destructive", title: "Please select a file" });
    if (!isExtra && !docCategory) return toast({ variant: "destructive", title: "Please select a category" });
    if (isExtra && !extraName.trim()) return toast({ variant: "destructive", title: "Please enter a document name" });

    const fd = new FormData();
    fd.append("file", file);
    fd.append("referenceType", referenceType);
    fd.append("referenceId", entityId);
    fd.append("documentName", docName || file.name);
    fd.append("isExtraCategory", String(isExtra));
    if (isExtra) {
      fd.append("extraCategoryName", extraName.trim());
    } else {
      if (categoryId) fd.append("categoryId", categoryId);
      fd.append("documentCategory", docCategory);
    }
    if (expiryDate) fd.append("expiryDate", expiryDate);
    if (isSubmitted) fd.append("isSubmitted", "true");
    if (submittedTo) fd.append("submittedTo", submittedTo);

    setUploading(true);
    try {
      await axios.post(`${BASE}/api/documents`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast({ title: "Document uploaded successfully" });
      onSuccess();
      onClose();
      reset();
    } catch {
      toast({ variant: "destructive", title: "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {activeTab === "student" ? <GraduationCap className="w-4 h-4 text-[#F5821F]" /> : <Briefcase className="w-4 h-4 text-[#F5821F]" />}
            {activeTab === "student" ? "Upload Student Document" : "Upload Consultation & Contract File"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File picker */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Select File *</Label>
            <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-[#F5821F] transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-[#F5821F]" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <button onClick={e => { e.stopPropagation(); setFile(null); }}>
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                  </button>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  <Upload className="w-5 h-5 mx-auto mb-1 opacity-50" />
                  Click to select a file
                </div>
              )}
            </div>
          </div>

          {/* Document name */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Document Name (optional)</Label>
            <Input value={docName} onChange={e => setDocName(e.target.value)} placeholder={file?.name ?? "Enter document name"} className="text-sm" />
          </div>

          {/* Extra category toggle */}
          {canUploadExtra && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExtra(false)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!isExtra ? "bg-[#F5821F] text-white" : "bg-muted text-muted-foreground"}`}
              >Standard Category</button>
              <button
                onClick={() => setIsExtra(true)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isExtra ? "bg-[#F5821F] text-white" : "bg-muted text-muted-foreground"}`}
              >Other (Custom)</button>
            </div>
          )}

          {/* Category selection */}
          {!isExtra ? (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Category *</Label>
              <Select value={docCategory} onValueChange={v => { setDocCategory(v); setExpiryDate(""); setIsSubmitted(false); setSubmittedTo(""); }}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {cats.map(c => (
                    <SelectItem key={c.code} value={c.code} className="text-sm">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Document Type Name</Label>
                <Input
                  value={extraName}
                  onChange={e => setExtraName(e.target.value)}
                  placeholder="e.g. Insurance Waiver, Medical Certificate"
                  maxLength={100}
                  className="text-sm"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700">Will be saved as a custom category.</p>
              </div>
            </div>
          )}

          {/* Expiry date — conditional */}
          {!isExtra && showExpiry && (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block flex items-center gap-1">
                <Clock className="w-3 h-3" /> Expiry Date
              </Label>
              <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="text-sm" />
            </div>
          )}

          {/* Submitted to — conditional */}
          {!isExtra && showSubmitted && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isSubmitted"
                  checked={isSubmitted}
                  onChange={e => setIsSubmitted(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="isSubmitted" className="text-xs font-semibold cursor-pointer">Submitted to school / institution</Label>
              </div>
              {isSubmitted && (
                <Input
                  value={submittedTo}
                  onChange={e => setSubmittedTo(e.target.value)}
                  placeholder="e.g. Home Affairs, University of Sydney"
                  className="text-sm"
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { onClose(); reset(); }} disabled={uploading}>Cancel</Button>
          <Button
            size="sm"
            className="bg-[#F5821F] hover:bg-[#d97706] text-white"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Uploading…</> : <><Upload className="w-3.5 h-3.5 mr-1.5" /> Upload</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, icon: Icon, label, count }: {
  active: boolean; onClick: () => void;
  icon: typeof GraduationCap; label: string; count: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
      style={{
        background: active ? "#fff" : "transparent",
        color: active ? "#F5821F" : "#57534E",
        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
        border: active ? "1px solid #E8E6E2" : "1px solid transparent",
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {count > 0 && (
        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
          style={{ background: active ? "#FEF0E3" : "#F4F3F1", color: active ? "#F5821F" : "#57534E" }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Grouped document list ────────────────────────────────────────────────────
function GroupedDocList({ groups, activeTab, onDelete, permCheck, isAdmin, onUpload }: {
  groups: DocGroup[];
  activeTab: TabType;
  onDelete: (id: string) => void;
  permCheck?: PermCheck;
  isAdmin: boolean;
  onUpload: (grp: string) => void;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  if (groups.every(g => g.documents.length === 0)) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No documents in this tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.filter(g => g.documents.length > 0).map(grp => {
        const isOpen = openGroups[grp.group] ?? true;
        return (
          <div key={grp.group} className="rounded-xl border bg-white overflow-hidden">
            <Collapsible open={isOpen} onOpenChange={() => setOpenGroups(p => ({ ...p, [grp.group]: !isOpen }))}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{grp.groupLabel}</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{grp.documents.length}</Badge>
                  </div>
                  {(permCheck?.canUpload || isAdmin) && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={e => { e.stopPropagation(); onUpload(grp.group); }}
                      onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); onUpload(grp.group); } }}
                      className="text-[10px] text-[#F5821F] hover:underline font-medium cursor-pointer"
                    >+ Add</span>
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {grp.documents.map(doc => (
                  <DocRow key={doc.id} doc={doc} onDelete={onDelete} showExpiry={activeTab === "student"} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EntityDocumentsTab({ entityType, entityId, mode = "full" }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("student");
  const [uploadOpen, setUploadOpen] = useState(false);

  const role = user?.role ?? "parent_client";
  const isAdmin = ["super_admin", "admin"].includes(role);

  const { data: studentGroups = [], isLoading: loadingStudent } = useQuery<DocGroup[]>({
    queryKey: ["entity-documents", entityType, entityId, "student"],
    queryFn: () =>
      axios.get(`${BASE}/api/documents/by-entity`, { params: { entityType, entityId, group: "student" } }).then(r => r.data),
    enabled: !!entityId,
  });

  const { data: consultGroups = [], isLoading: loadingConsult } = useQuery<DocGroup[]>({
    queryKey: ["entity-documents", entityType, entityId, "consultation"],
    queryFn: () =>
      axios.get(`${BASE}/api/documents/by-entity`, { params: { entityType, entityId, group: "consultation" } }).then(r => r.data),
    enabled: !!entityId,
  });

  const { data: permCheck } = useQuery<PermCheck>({
    queryKey: ["doc-permissions-check", entityType, entityId],
    queryFn: () =>
      axios.get(`${BASE}/api/documents/permissions-check`, { params: { entityType, entityId, categoryGroup: "personal" } }).then(r => r.data),
    enabled: !!entityId && mode === "full",
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/documents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity-documents", entityType, entityId] });
      toast({ title: "Document deleted" });
    },
    onError: () => toast({ variant: "destructive", title: "Delete failed" }),
  });

  const studentCount = studentGroups.reduce((s, g) => s + g.documents.length, 0);
  const consultCount = consultGroups.reduce((s, g) => s + g.documents.length, 0);
  const currentGroups = activeTab === "student" ? studentGroups : consultGroups;
  const isLoading = activeTab === "student" ? loadingStudent : loadingConsult;

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["entity-documents", entityType, entityId] });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading documents…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab bar + upload button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#F4F3F1", border: "1px solid #E8E6E2" }}>
          <TabBtn
            active={activeTab === "student"}
            onClick={() => setActiveTab("student")}
            icon={GraduationCap}
            label="Student Documents"
            count={studentCount}
          />
          <TabBtn
            active={activeTab === "consultation"}
            onClick={() => setActiveTab("consultation")}
            icon={Briefcase}
            label="Consultation & Contract Files"
            count={consultCount}
          />
        </div>
        {mode === "full" && (permCheck?.canUpload || isAdmin) && (
          <Button
            size="sm"
            className="bg-[#F5821F] hover:bg-[#d97706] text-white h-7 text-xs px-2.5 shrink-0"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="w-3 h-3 mr-1" /> Upload
          </Button>
        )}
      </div>

      {/* Tab content */}
      <GroupedDocList
        groups={currentGroups}
        activeTab={activeTab}
        onDelete={id => deleteMut.mutate(id)}
        permCheck={permCheck}
        isAdmin={isAdmin}
        onUpload={() => setUploadOpen(true)}
      />

      {/* Upload modal */}
      {uploadOpen && (
        <UploadModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          entityType={entityType}
          entityId={entityId}
          activeTab={activeTab}
          availableCategories={permCheck?.availableCategories ?? []}
          canUploadExtra={permCheck?.canUploadExtra ?? isAdmin}
          onSuccess={invalidate}
        />
      )}
    </div>
  );
}
