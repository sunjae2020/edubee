import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen, FileText, Search, ExternalLink, Download,
  BookOpen, File, FileImage, FileSpreadsheet, Eye,
} from "lucide-react";
import { format } from "date-fns";

const ORANGE = "var(--e-orange)";

function getToken() {
  return localStorage.getItem("portal_token");
}

function docStatusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "approved" || v === "active" || v === "confirmed") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "rejected") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  if (v === "pending_review") return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (v === "draft") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "expired" || v === "cancelled") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "var(--e-bg-muted)", color: "var(--e-text-2)", border: "1px solid #E8E6E2" };
}

function contractStatusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "active" || v === "confirmed") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "cancelled") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  if (v === "completed") return { background: "var(--e-bg-muted)", color: "var(--e-text-2)", border: "1px solid #E8E6E2" };
  return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
}

function FileIcon({ ext, type }: { ext: string | null | undefined; type: string | null | undefined }) {
  const e = (ext ?? type ?? "").toLowerCase();
  const style = { color: ORANGE, flexShrink: 0 };
  if (e.includes("image") || ["jpg", "jpeg", "png", "gif", "webp"].includes(e)) return <FileImage size={18} style={style} />;
  if (e.includes("sheet") || ["xls", "xlsx", "csv"].includes(e)) return <FileSpreadsheet size={18} style={style} />;
  if (e.includes("pdf") || e === "pdf") return <File size={18} style={{ ...style, color: "#DC2626" }} />;
  return <FileText size={18} style={style} />;
}

function categoryLabel(cat: string | null | undefined) {
  const map: Record<string, string> = {
    CONTRACT_DOC: "Contract", PASSPORT: "Passport", PHOTO_ID: "Photo ID",
    ACADEMIC: "Academic", ENGLISH_TEST: "English Test", FINANCIAL: "Financial",
    VISA_DOC: "Visa", COE: "COE", OFFER_LETTER: "Offer Letter",
    INSURANCE: "Insurance", QUOTATION: "Quotation", CONSULTATION: "Consultation",
    CORRESPONDENCE: "Correspondence", SCHOOL_INFO: "School Info", OTHER: "Other",
  };
  return cat ? (map[cat] ?? cat) : null;
}

function fmt(v: string | null | undefined) {
  if (!v) return null;
  try { return format(new Date(v), "dd MMM yyyy"); } catch { return null; }
}

interface DocItem {
  id: string;
  type: "document" | "contract";
  name: string;
  originalFilename: string | null;
  fileType: string | null;
  fileExtension: string | null;
  documentCategory: string | null;
  status: string | null;
  expiryDate: string | null;
  createdAt: string | null;
  contractNumber: string | null;
  packageName: string | null;
  agentName: string | null;
  courseStartDate?: string | null;
  courseEndDate?: string | null;
  signedAt?: string | null;
  viewUrl: string | null;
  downloadUrl?: string | null;
  serviceId?: string;
}

export default function StudentDocumentsPage() {
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["portal-student-documents"],
    queryFn: () => api.get<{ data: DocItem[] }>("/portal/student/documents").then(r => r.data),
  });

  const filtered = items.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name?.toLowerCase().includes(q) ||
      d.contractNumber?.toLowerCase().includes(q) ||
      d.originalFilename?.toLowerCase().includes(q) ||
      categoryLabel(d.documentCategory)?.toLowerCase().includes(q)
    );
  });

  const uploadedCount  = items.filter(d => d.type === "document").length;
  const contractCount  = items.filter(d => d.type === "contract").length;

  function handleView(item: DocItem) {
    if (item.type === "contract") {
      navigate(`/student/services/${item.serviceId ?? item.id}`);
      return;
    }
    if (!item.viewUrl) return;
    const url = item.viewUrl.startsWith("http")
      ? item.viewUrl
      : `${item.viewUrl}?token=${encodeURIComponent(getToken() ?? "")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleDownload(item: DocItem) {
    if (!item.downloadUrl) return;
    const url = item.downloadUrl.startsWith("http")
      ? item.downloadUrl
      : `${item.downloadUrl}?token=${encodeURIComponent(getToken() ?? "")}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = item.originalFilename ?? item.name;
    a.target = "_blank";
    a.click();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* KPI + search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-4 text-sm" style={{ color: "var(--e-text-3)" }}>
          <span>{items.length} document{items.length !== 1 ? "s" : ""}</span>
          {uploadedCount > 0 && <span style={{ color: "#16A34A" }}>· {uploadedCount} file{uploadedCount !== 1 ? "s" : ""}</span>}
          {contractCount > 0 && <span style={{ color: ORANGE }}>· {contractCount} contract{contractCount !== 1 ? "s" : ""}</span>}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--e-text-3)" }} />
          <input
            className="h-9 pl-9 pr-3 rounded-lg border text-sm outline-none w-56"
            style={{ borderColor: "var(--e-border)", background: "var(--e-bg-surface)", color: "var(--e-text-1)" }}
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load documents. Please try again.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 border" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
              <Skeleton className="h-5 w-48 mb-3" /><Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
          <FolderOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
          <p className="text-sm font-medium" style={{ color: "var(--e-text-1)" }}>No documents yet</p>
          <p className="text-xs mt-1" style={{ color: "var(--e-text-3)" }}>Your enrolment contracts and uploaded files will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={`${item.type}-${item.id}`}
              className="rounded-xl border p-5 transition-all"
              style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-start gap-4 justify-between flex-wrap">

                {/* Icon + info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: item.type === "contract" ? "var(--e-orange-lt)" : "#F0F9FF" }}>
                    {item.type === "contract"
                      ? <BookOpen size={18} style={{ color: ORANGE }} />
                      : <FileIcon ext={item.fileExtension} type={item.fileType} />
                    }
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold truncate" style={{ color: "var(--e-text-1)" }}>
                        {item.originalFilename ?? item.name}
                      </p>
                      {item.type === "document" && item.documentCategory && (
                        <span className="text-xs px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: "var(--e-orange-lt)", color: ORANGE }}>
                          {categoryLabel(item.documentCategory)}
                        </span>
                      )}
                      {item.type === "contract" && (
                        <span className="text-xs px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: "var(--e-orange-lt)", color: ORANGE }}>
                          Contract
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0"
                        style={item.type === "contract" ? contractStatusStyle(item.status) : docStatusStyle(item.status)}>
                        {item.status ?? "pending"}
                      </span>
                    </div>

                    <div className="flex gap-2 text-xs flex-wrap" style={{ color: "var(--e-text-3)" }}>
                      {item.contractNumber && <span>{item.contractNumber}</span>}
                      {item.agentName && <span>· Agent: {item.agentName}</span>}
                      {item.type === "contract" && item.courseStartDate && (
                        <span>· {fmt(item.courseStartDate)}{item.courseEndDate ? ` – ${fmt(item.courseEndDate)}` : ""}</span>
                      )}
                      {item.type === "document" && item.createdAt && (
                        <span>· Uploaded {fmt(item.createdAt)}</span>
                      )}
                      {item.expiryDate && (
                        <span style={{ color: "#D97706" }}>· Expires {fmt(item.expiryDate)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {item.type === "contract" && item.signedAt ? (
                    <p className="text-xs font-medium" style={{ color: "#16A34A" }}>
                      ✓ Signed {fmt(item.signedAt)}
                    </p>
                  ) : item.type === "contract" ? (
                    <p className="text-xs" style={{ color: "var(--e-text-3)" }}>Awaiting signature</p>
                  ) : null}

                  <div className="flex items-center gap-2">
                    {/* Download button (only for actual uploaded files) */}
                    {item.type === "document" && item.downloadUrl && (
                      <button
                        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors"
                        style={{ borderColor: "var(--e-border)", color: "var(--e-text-2)", background: "var(--e-bg-surface)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--e-bg-page)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "var(--e-bg-surface)")}
                        onClick={() => handleDownload(item)}
                        title="Download file"
                      >
                        <Download size={12} />
                        Download
                      </button>
                    )}

                    {/* View button */}
                    <button
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: "var(--e-orange-lt)", color: ORANGE }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#FDE0C5")}
                      onMouseLeave={e => (e.currentTarget.style.background = "var(--e-orange-lt)")}
                      onClick={() => handleView(item)}
                      title={item.type === "contract" ? "View contract details" : "View file"}
                    >
                      {item.type === "contract"
                        ? <><Eye size={12} /> View</>
                        : <><ExternalLink size={12} /> View</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
