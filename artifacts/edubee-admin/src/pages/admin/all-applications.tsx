import { useState, useCallback, useRef, useEffect } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import {
  Search, Plus, Download, ChevronDown,
  Tent, GraduationCap, Plane, Building2, Briefcase,
  Shield, Stamp, Car, Globe, Bus, FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Source / service type config ───────────────────────────────────────────

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  camp:          { label: "Camp",          icon: Tent,          color: "bg-[#FFF0E0] text-[#C2410C]" },
  study_abroad:  { label: "Study Abroad",  icon: GraduationCap, color: "bg-[#EDE9FE] text-[#6D28D9]" },
  pickup:        { label: "Pickup",        icon: Plane,         color: "bg-[#DBEAFE] text-[#1D4ED8]" },
  accommodation: { label: "Accomm.",       icon: Building2,     color: "bg-[#F0FDF4] text-[#15803D]" },
  internship:    { label: "Internship",    icon: Briefcase,     color: "bg-[#FEF9C3] text-[#A16207]" },
  guardian:      { label: "Guardian",      icon: Shield,        color: "bg-[#FCE7F3] text-[#BE185D]" },
  visa:          { label: "Visa",          icon: Stamp,         color: "bg-[#F1F5F9] text-[#475569]" },
  tour:          { label: "Tour",          icon: Car,           color: "bg-[#ECFDF5] text-[#065F46]" },
  transfer:      { label: "Transfer",      icon: Bus,           color: "bg-[#DBEAFE] text-[#1D4ED8]" },
  service:       { label: "Service",       icon: Globe,         color: "bg-[#F8FAFC] text-[#64748B]" },
};

function SourceBadge({ sourceType }: { sourceType?: string | null }) {
  const cfg = SOURCE_CONFIG[sourceType ?? ""] ?? SOURCE_CONFIG.service;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.color}`}>
      <Icon className="w-3 h-3 shrink-0" />
      {cfg.label}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  submitted:  "bg-[#EFF6FF] text-[#1D4ED8]",
  reviewing:  "bg-[#FEF9C3] text-[#A16207]",
  quoted:     "bg-[#FFF7ED] text-[#C2410C]",
  confirmed:  "bg-[#DCFCE7] text-[#15803D]",
  converted:  "bg-[#DCFCE7] text-[#15803D]",
  cancelled:  "bg-[#FEF2F2] text-[#DC2626]",
};

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const cls = STATUS_COLORS[status] ?? "bg-[#F4F3F1] text-[#57534E]";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// Compact applicant cell — mirrors Lead list "Client" style
function ApplicantCell({ row }: { row: AppRow }) {
  const firstName = row.firstName?.trim() ?? "";
  const lastName  = (row.lastName?.trim() ?? "").toUpperCase();
  const displayName = (firstName || lastName)
    ? [firstName, lastName].filter(Boolean).join(" ")
    : (row.fullName ?? "—");

  const sub1 = row.originalName?.trim() || row.englishName?.trim() || null;
  const sub2 = row.email?.trim() || null;

  return (
    <div className="min-w-0">
      <div className="font-semibold text-foreground text-sm leading-tight truncate">
        {displayName}
        {row.englishName && row.originalName && (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            {row.englishName}
          </span>
        )}
      </div>
      {sub1 && (
        <div className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">{sub1}</div>
      )}
      {sub2 && (
        <div className="text-xs text-muted-foreground leading-tight truncate">{sub2}</div>
      )}
    </div>
  );
}

// Programme cell (camp) or Service cell (service)
function ProgrammeCell({ row }: { row: AppRow }) {
  const src = row.sourceType ?? "";

  if (src === "camp") {
    return (
      <div className="min-w-0">
        {row.packageGroupName ? (
          <>
            <div className="text-sm font-medium text-foreground truncate">{row.packageGroupName}</div>
            {row.packageName && (
              <div className="text-xs text-muted-foreground truncate mt-0.5">{row.packageName}</div>
            )}
          </>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </div>
    );
  }

  // Service: parse serviceTypes (jsonb array or string)
  let types: string[] = [];
  if (row.serviceTypes) {
    try {
      const parsed = typeof row.serviceTypes === "string"
        ? JSON.parse(row.serviceTypes)
        : row.serviceTypes;
      types = Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
      types = [String(row.serviceTypes)];
    }
  }
  if (types.length === 0 && src && src !== "camp" && src !== "service") {
    types = [src];
  }

  return (
    <div className="flex flex-wrap gap-1">
      {types.length > 0
        ? types.map(t => <SourceBadge key={t} sourceType={t} />)
        : <span className="text-muted-foreground text-xs">—</span>}
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────

interface AppRow {
  id: string;
  ref: string | null;
  sourceType: string | null;
  firstName: string | null;
  lastName: string | null;
  originalName: string | null;
  englishName: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  status: string | null;
  quoteId: string | null;
  quoteRef: string | null;
  quoteStatus: string | null;
  contractId: string | null;
  contractRef: string | null;
  contractStatus: string | null;
  packageGroupName: string | null;
  packageName: string | null;
  serviceTypes: unknown;
  createdAt: string;
  assignedStaffName: string | null;
}

// ── Tabs / statuses ────────────────────────────────────────────────────────

const TABS = [
  { key: "all",     label: "All" },
  { key: "camp",    label: "Camp" },
  { key: "service", label: "Service" },
];

const STATUSES = ["all", "submitted", "reviewing", "quoted", "confirmed", "converted", "cancelled"];

// ── New Application Dropdown ────────────────────────────────────────────────

function NewApplicationDropdown({ navigate }: { navigate: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        size="sm"
        className="gap-1.5 border border-(--e-orange) bg-(--e-orange) text-white hover:bg-white hover:text-(--e-orange) pr-2"
        onClick={() => setOpen(o => !o)}
      >
        <Plus className="w-4 h-4" />
        New Application
        <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-lg shadow-lg z-50 py-1 overflow-hidden">
          <button
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-[#FFF0E0] hover:text-[#C2410C] transition-colors text-left"
            onClick={() => { setOpen(false); navigate("/admin/camp-applications/new"); }}
          >
            <Tent className="w-4 h-4 shrink-0 text-(--e-orange)" />
            <div>
              <div className="font-medium">Camp Application</div>
              <div className="text-xs text-muted-foreground">For camp programs</div>
            </div>
          </button>
          <div className="border-t border-border mx-2" />
          <button
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-[#EDE9FE] hover:text-[#6D28D9] transition-colors text-left"
            onClick={() => { setOpen(false); navigate("/admin/applications/new"); }}
          >
            <Globe className="w-4 h-4 shrink-0 text-[#7C3AED]" />
            <div>
              <div className="font-medium">Service Application</div>
              <div className="text-xs text-muted-foreground">For non-camp services</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AllApplicationsPage() {
  const [, navigate] = useLocation();
  const [tab,        setTab]        = useState("all");
  const [status,     setStatus]     = useState("all");
  const [search,     setSearch]     = useState("");
  const [searchInput,setSearchInput]= useState("");
  const [page,       setPage]       = useState(1);
  const pageSize = 20;

  const queryKey = ["all-applications", { tab, status, search, page, pageSize }];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page",     String(page));
      params.set("pageSize", String(pageSize));
      if (tab    !== "all") params.set("type",   tab);
      if (status !== "all") params.set("status", status);
      if (search) params.set("search", search);
      return axios
        .get(`${BASE}/api/admin/all-applications?${params}`)
        .then(r => r.data as { data: AppRow[]; total: number; page: number; pageSize: number });
    },
    placeholderData: prev => prev,
  });

  const rows       = data?.data  ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSearch = useCallback(() => { setSearch(searchInput); setPage(1); }, [searchInput]);

  function handleRowClick(row: AppRow) {
    if ((row.sourceType ?? "") === "camp") {
      navigate(`/admin/camp-applications/${row.id}`);
    } else {
      navigate(`/admin/applications/${row.id}`);
    }
  }

  function handleTabChange(k: string) { setTab(k); setPage(1); }
  function handleStatusChange(s: string) { setStatus(s); setPage(1); }

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 border-b border-[var(--e-border)] bg-[var(--e-bg-page)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">All Applications</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage all camp and service applications</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="w-4 h-4" /> Export
            </Button>
            <NewApplicationDropdown navigate={navigate} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-[var(--e-orange)] text-white"
                  : "text-muted-foreground hover:bg-[#FFF0E0] hover:text-[#C2410C]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search + status filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Name · Email · Ref No..."
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSearch}>Search</Button>
          <div className="flex gap-1 flex-wrap">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  status === s
                    ? "bg-foreground text-background"
                    : "bg-[#F4F3F1] text-[#57534E] hover:bg-[#E8E6E1]"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--e-bg-sidebar)] z-10">
            <tr className="border-b border-[var(--e-border)]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Ref No.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Applicant</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Programme / Service</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Assigned Staff</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Date</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">Loading...</td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No applications found</td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr
                key={row.id}
                onClick={() => handleRowClick(row)}
                className={`border-b border-[var(--e-border)] cursor-pointer transition-colors hover:bg-[#FFF8F5] ${
                  i % 2 === 0 ? "bg-white" : "bg-[#FAFAF9]"
                }`}
              >
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {row.ref ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <SourceBadge sourceType={row.sourceType} />
                </td>
                <td className="px-4 py-3 max-w-[220px]">
                  <ApplicantCell row={row} />
                </td>
                <td className="px-4 py-3 max-w-[240px]">
                  <ProgrammeCell row={row} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                  {row.assignedStaffName ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                  {row.createdAt ? formatDate(row.createdAt) : "—"}
                </td>
                <td className="px-4 py-3">
                  {row.sourceType === "camp" && (
                    <button
                      title="Download PDF"
                      onClick={e => {
                        e.stopPropagation();
                        window.open(`${BASE}/api/camp-applications/${row.id}/pdf`, "_blank");
                      }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      <div className="px-6 py-3 border-t border-[var(--e-border)] flex items-center justify-between text-sm text-muted-foreground bg-[var(--e-bg-page)]">
        <span>{total.toLocaleString()} total</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <span className="px-2">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
