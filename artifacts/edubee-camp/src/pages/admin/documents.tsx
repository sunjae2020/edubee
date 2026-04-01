import { useState, useEffect } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ListPagination } from "@/components/ui/list-pagination";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import {
  FolderOpen, Search, Eye, Download, Trash2, FileText, FileImage,
  File, Loader2, ExternalLink, X, HistoryIcon,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ENTITY_TYPES = [
  { value: "application", label: "Application" },
  { value: "contract", label: "Contract" },
];

const CATEGORY_GROUPS = [
  { value: "personal", label: "Personal" },
  { value: "school", label: "School & Program" },
  { value: "financial", label: "Financial" },
  { value: "travel", label: "Travel" },
  { value: "contract", label: "Contract" },
  { value: "internal", label: "Internal" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

const STATUS_COLORS: Record<string, string> = {
  pending_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-600",
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocFileIcon({ ext }: { ext: string | null }) {
  if (!ext) return <File className="w-4 h-4 text-muted-foreground" />;
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return <FileImage className="w-4 h-4 text-blue-500" />;
  if (ext === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
}

export default function DocumentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { sortBy, sortDir, onSort } = useSortState("createdOn", "desc");
  const { user } = useAuth();

  const [entityType, setEntityType] = useState("");
  const [categoryGroup, setCategoryGroup] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [logDoc, setLogDoc] = useState<any>(null);

  useEffect(() => { setPage(1); }, [sortBy, sortDir]);

  const { data, isLoading } = useQuery({
    queryKey: ["all-documents", entityType, categoryGroup, status, search, page, sortBy, sortDir],
    queryFn: () =>
      axios.get(`${BASE}/api/documents/all`, {
        params: {
          entityType: entityType || undefined,
          categoryGroup: categoryGroup || undefined,
          status: status || undefined,
          search: search || undefined,
          page,
          limit: 50,
          sortBy,
          sortDir,
        },
      }).then(r => r.data),
  });

  const { data: accessLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["doc-access-log", logDoc?.id],
    queryFn: () => axios.get(`${BASE}/api/documents/${logDoc!.id}/access-log`).then(r => r.data),
    enabled: !!logDoc,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/documents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-documents"] });
      toast({ title: "Document deleted" });
    },
    onError: () => toast({ variant: "destructive", title: "Delete failed" }),
  });

  async function handleView(doc: any) {
    try {
      const res = await axios.get(`${BASE}/api/documents/${doc.id}/view`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      window.open(url, "_blank");
    } catch {
      toast({ variant: "destructive", title: "Cannot open document" });
    }
  }

  async function handleDownload(doc: any) {
    try {
      const res = await axios.get(`${BASE}/api/documents/${doc.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalFilename ?? doc.documentName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ variant: "destructive", title: "Download failed" });
    }
  }

  function resetFilters() {
    setEntityType(""); setCategoryGroup(""); setStatus(""); setSearch(""); setPage(1);
  }

  const docs = data?.data ?? [];
  const sorted = useSorted(docs, sortBy, sortDir);
  const total = data?.meta?.total ?? docs.length;

  const isAdmin = ["super_admin", "admin"].includes(user?.role ?? "");
  if (!isAdmin) {
    return (
      <div className="p-6 text-center py-20 text-muted-foreground">
        <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F5821F]/10 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-[#F5821F]" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Documents</h1>
            <p className="text-xs text-muted-foreground">Central document management across all contracts and applications</p>
          </div>
        </div>
        {docs.length > 0 && (
          <Badge variant="secondary" className="text-xs">{docs.length} records</Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={entityType} onValueChange={v => { setEntityType(v); setPage(1); }}>
          <SelectTrigger className="h-8 text-sm w-40">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={categoryGroup} onValueChange={v => { setCategoryGroup(v); setPage(1); }}>
          <SelectTrigger className="h-8 text-sm w-44">
            <SelectValue placeholder="Category Group" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_GROUPS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="h-8 text-sm w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search documents…"
            className="h-8 text-sm pl-8"
          />
        </div>

        {(entityType || categoryGroup || status || search) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={resetFilters}>
            <X className="w-3 h-3" /> Reset
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading documents…
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderOpen className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">No documents found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b bg-muted/30">
                  <SortableTh col="filename" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[220px]">Document</SortableTh>
                  <SortableTh col="entityType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[120px]">Entity</SortableTh>
                  <SortableTh col="category" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[100px]">Category</SortableTh>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[100px]">Uploaded by</th>
                  <SortableTh col="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[90px]">Created</SortableTh>
                  <SortableTh col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[90px]">Status</SortableTh>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[80px]">Size</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((doc: any) => (
                  <tr key={doc.id} className="border-t hover:bg-[#FEF0E3] transition-colors cursor-pointer">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <DocFileIcon ext={doc.fileExtension} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate max-w-[180px]">{doc.documentName}</div>
                          {doc.isExtraCategory && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-300 text-amber-700 bg-amber-50 mt-0.5">Custom</Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-xs font-medium capitalize">{doc.referenceType}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{doc.referenceId?.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-xs">{doc.categoryNameEn ?? doc.extraCategoryName ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{doc.categoryGroup}</div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{doc.uploadedByName ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {doc.createdAt ? formatDate(doc.createdAt) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {doc.status && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[doc.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {doc.status.replace(/_/g, " ")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatBytes(doc.fileSizeBytes)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" title="View" onClick={() => handleView(doc)}>
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" title="Download" onClick={() => handleDownload(doc)}>
                          <Download className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" title="Access log" onClick={() => setLogDoc(doc)}>
                          <HistoryIcon className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Delete"
                          onClick={() => {
                            if (confirm("Delete this document?")) deleteMut.mutate(doc.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <ListPagination page={page} pageSize={50} total={total} onChange={setPage} />

      {/* Access Log Dialog */}
      <Dialog open={!!logDoc} onOpenChange={v => !v && setLogDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HistoryIcon className="w-4 h-4" />
              Access Log — {logDoc?.documentName}
            </DialogTitle>
          </DialogHeader>
          {logsLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : (accessLogs?.data ?? []).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No access logs yet.</p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {(accessLogs?.data ?? []).map((log: any) => (
                <div key={log.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/20 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${log.action === "download" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-muted-foreground">{log.userId?.slice(0, 8)}…</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(log.accessedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
