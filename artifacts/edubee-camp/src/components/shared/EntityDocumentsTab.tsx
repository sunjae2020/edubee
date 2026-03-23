import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  AlertTriangle, File, FileImage, Loader2, X,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type EntityType =
  | "application"
  | "contract"
  | "institute_mgt"
  | "hotel_mgt"
  | "pickup_mgt"
  | "tour_mgt"
  | "user"
  | "other_services_mgt";

interface Props {
  entityType: EntityType;
  entityId: string;
  mode?: "full" | "simple";
}

interface DocGroup {
  group: string;
  groupLabel: string;
  documents: DocRecord[];
}

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

function DocRow({ doc, onDelete }: { doc: DocRecord; onDelete: (id: string) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = ["super_admin", "admin"].includes(user?.role ?? "");

  async function handleView() {
    try {
      const res = await axios.get(`${BASE}/api/documents/${doc.id}/view`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      window.open(url, "_blank");
    } catch {
      toast({ variant: "destructive", title: "Failed to open document" });
    }
  }

  async function handleDownload() {
    try {
      const res = await axios.get(`${BASE}/api/documents/${doc.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalFilename ?? doc.documentName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ variant: "destructive", title: "Failed to download document" });
    }
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
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
          {doc.uploadedByName && <span>by {doc.uploadedByName}</span>}
          {doc.fileSizeBytes && <span>· {formatBytes(doc.fileSizeBytes)}</span>}
          {doc.expiryDate && <span>· expires {doc.expiryDate}</span>}
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

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  entityType: EntityType;
  entityId: string;
  availableCategories: { id: string; categoryNameEn: string; categoryGroup: string }[];
  canUploadExtra: boolean;
  onSuccess: () => void;
}

function UploadModal({ open, onClose, entityType, entityId, availableCategories, canUploadExtra, onSuccess }: UploadModalProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isExtra, setIsExtra] = useState(false);
  const [extraName, setExtraName] = useState("");
  const [uploading, setUploading] = useState(false);

  const referenceType = ["application", "contract", "user", "other_services_mgt"].includes(entityType) ? entityType : "contract";
  const referenceId = entityId;

  async function handleUpload() {
    if (!file) return toast({ variant: "destructive", title: "Select a file" });
    if (!isExtra && !categoryId) return toast({ variant: "destructive", title: "Select a category" });
    if (isExtra && !extraName.trim()) return toast({ variant: "destructive", title: "Enter a document name" });

    const fd = new FormData();
    fd.append("file", file);
    fd.append("referenceType", referenceType);
    fd.append("referenceId", referenceId);
    fd.append("documentName", docName || file.name);
    fd.append("isExtraCategory", String(isExtra));
    if (isExtra) {
      fd.append("extraCategoryName", extraName.trim());
    } else {
      fd.append("categoryId", categoryId);
    }

    setUploading(true);
    try {
      await axios.post(`${BASE}/api/documents`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast({ title: "Document uploaded successfully" });
      onSuccess();
      onClose();
      setFile(null);
      setDocName("");
      setCategoryId("");
      setIsExtra(false);
      setExtraName("");
    } catch {
      toast({ variant: "destructive", title: "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  const uniqueGroups = [...new Set(availableCategories.map(c => c.categoryGroup))];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File picker */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">File</Label>
            <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-[#F5821F] transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-[#F5821F]" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <button onClick={e => { e.stopPropagation(); setFile(null); }} className="text-muted-foreground hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
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

          {/* Category type toggle */}
          {canUploadExtra && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExtra(false)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!isExtra ? "bg-[#F5821F] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                Standard Category
              </button>
              <button
                onClick={() => setIsExtra(true)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isExtra ? "bg-[#F5821F] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                Other (Custom)
              </button>
            </div>
          )}

          {/* Category selection */}
          {!isExtra ? (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {uniqueGroups.map(grp => (
                    <div key={grp}>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{grp}</div>
                      {availableCategories.filter(c => c.categoryGroup === grp).map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-sm">{c.categoryNameEn}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Document name / type</Label>
                <Input
                  value={extraName}
                  onChange={e => setExtraName(e.target.value)}
                  placeholder="e.g. Insurance waiver, Medical certificate"
                  maxLength={100}
                  className="text-sm"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700">This document will be stored under 'Other' category. Visibility follows 'Other' document permissions.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={uploading}>Cancel</Button>
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

export default function EntityDocumentsTab({ entityType, entityId, mode = "full" }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadGroup, setUploadGroup] = useState("personal");

  const role = user?.role ?? "parent_client";
  const isAdmin = ["super_admin", "admin"].includes(role);

  const { data: groups = [], isLoading } = useQuery<DocGroup[]>({
    queryKey: ["entity-documents", entityType, entityId],
    queryFn: () =>
      axios.get(`${BASE}/api/documents/by-entity`, { params: { entityType, entityId } }).then(r => r.data),
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
    onError: () => toast({ variant: "destructive", title: "Failed to delete document" }),
  });

  function toggleGroup(grp: string) {
    setOpenGroups(prev => ({ ...prev, [grp]: !(prev[grp] ?? true) }));
  }

  const totalDocs = groups.reduce((sum, g) => sum + g.documents.length, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading documents…</span>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No documents available for this record.</p>
        {mode === "full" && (permCheck?.canUpload || isAdmin) && (
          <Button
            size="sm"
            className="mt-4 bg-[#F5821F] hover:bg-[#d97706] text-white"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload First Document
          </Button>
        )}
        {uploadOpen && (
          <UploadModal
            open={uploadOpen}
            onClose={() => setUploadOpen(false)}
            entityType={entityType}
            entityId={entityId}
            availableCategories={permCheck?.availableCategories ?? []}
            canUploadExtra={permCheck?.canUploadExtra ?? false}
            onSuccess={() => qc.invalidateQueries({ queryKey: ["entity-documents", entityType, entityId] })}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Documents</span>
          <Badge variant="secondary" className="text-xs">{totalDocs}</Badge>
        </div>
        {mode === "full" && (permCheck?.canUpload || isAdmin) && (
          <Button
            size="sm"
            className="bg-[#F5821F] hover:bg-[#d97706] text-white h-7 text-xs px-2.5"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="w-3 h-3 mr-1" /> Upload
          </Button>
        )}
      </div>

      {/* Groups */}
      {groups.map(group => {
        const isOpen = openGroups[group.group] ?? true;
        const docCount = group.documents.length;

        return (
          <div key={group.group} className="rounded-xl border bg-white overflow-hidden">
            <Collapsible open={isOpen} onOpenChange={() => toggleGroup(group.group)}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{group.groupLabel}</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{docCount}</Badge>
                  </div>
                  {mode === "full" && (permCheck?.canUpload || isAdmin) && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={e => { e.stopPropagation(); setUploadGroup(group.group); setUploadOpen(true); }}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setUploadGroup(group.group); setUploadOpen(true); } }}
                      className="text-[10px] text-[#F5821F] hover:underline font-medium cursor-pointer"
                    >
                      + Add
                    </span>
                  )}
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                {docCount === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground italic">No documents in this category.</div>
                ) : (
                  <div>
                    {group.documents.map(doc => (
                      <DocRow
                        key={doc.id}
                        doc={doc}
                        onDelete={id => deleteMut.mutate(id)}
                      />
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })}

      {/* Upload Modal */}
      {uploadOpen && (
        <UploadModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          entityType={entityType}
          entityId={entityId}
          availableCategories={permCheck?.availableCategories ?? []}
          canUploadExtra={permCheck?.canUploadExtra ?? false}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["entity-documents", entityType, entityId] })}
        />
      )}
    </div>
  );
}
