import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Search, Plus, Download, Tent, GraduationCap, Plane, Building2, Briefcase, Shield, Stamp, Car, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Source type config ─────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  camp:            { label: "Camp",          icon: Tent,         color: "bg-[#FFF0E0] text-[#C2410C]"   },
  study_abroad:    { label: "Study Abroad",  icon: GraduationCap,color: "bg-[#EDE9FE] text-[#6D28D9]"   },
  pickup:          { label: "Pickup",        icon: Plane,        color: "bg-[#DBEAFE] text-[#1D4ED8]"   },
  accommodation:   { label: "Accommodation", icon: Building2,    color: "bg-[#F0FDF4] text-[#15803D]"   },
  internship:      { label: "Internship",    icon: Briefcase,    color: "bg-[#FEF9C3] text-[#A16207]"   },
  guardian:        { label: "Guardian",      icon: Shield,       color: "bg-[#FCE7F3] text-[#BE185D]"   },
  visa:            { label: "Visa",          icon: Stamp,        color: "bg-[#F1F5F9] text-[#475569]"   },
  tour:            { label: "Tour",          icon: Car,          color: "bg-[#ECFDF5] text-[#065F46]"   },
  service:         { label: "Service",       icon: Globe,        color: "bg-[#F8FAFC] text-[#64748B]"   },
};

function SourceBadge({ sourceType }: { sourceType: string | null }) {
  const cfg = SOURCE_CONFIG[sourceType ?? ""] ?? SOURCE_CONFIG.service;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
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

const TABS = [
  { key: "all",     label: "전체" },
  { key: "camp",    label: "캠프" },
  { key: "service", label: "서비스" },
];

const STATUSES = ["all", "submitted", "reviewing", "quoted", "confirmed", "converted", "cancelled"];

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
  contractId: string | null;
  createdAt: string;
}

export default function AllApplicationsPage() {
  const [, navigate] = useLocation();
  const [tab,    setTab]    = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page,   setPage]   = useState(1);
  const pageSize = 20;

  const queryKey = ["all-applications", { tab, status, search, page, pageSize }];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (tab    !== "all") params.set("type",   tab);
      if (status !== "all") params.set("status", status);
      if (search) params.set("search", search);
      return axios.get(`${BASE}/api/admin/all-applications?${params}`).then(r => r.data as { data: AppRow[]; total: number; page: number; pageSize: number });
    },
    placeholderData: (prev) => prev,
  });

  const rows  = data?.data  ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  function handleRowClick(row: AppRow) {
    const src = row.sourceType ?? "";
    if (src === "camp") {
      navigate(`/admin/camp-applications/${row.id}`);
    } else {
      navigate(`/admin/applications/${row.id}`);
    }
  }

  function handleTabChange(key: string) {
    setTab(key);
    setPage(1);
  }

  function handleStatusChange(s: string) {
    setStatus(s);
    setPage(1);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[var(--e-border)] bg-[var(--e-bg-page)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">All Applications</h1>
            <p className="text-sm text-muted-foreground mt-0.5">캠프 및 서비스 신청서 통합 관리</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-[var(--e-orange)] hover:bg-[var(--e-orange-dark)] text-white"
              onClick={() => navigate("/admin/camp-applications")}
            >
              <Plus className="w-4 h-4" /> New Application
            </Button>
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

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="이름, 이메일, 신청번호 검색..."
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSearch}>검색</Button>
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
                {s === "all" ? "전체" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--e-bg-sidebar)] z-10">
            <tr className="border-b border-[var(--e-border)]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">신청번호</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">유형</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">First Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Original Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">English Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">이메일</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">상태</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">신청일</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">불러오는 중...</td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">신청서가 없습니다</td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr
                key={row.id}
                onClick={() => handleRowClick(row)}
                className={`border-b border-[var(--e-border)] cursor-pointer transition-colors hover:bg-[#FFF8F5] ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAF9]"}`}
              >
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {row.ref ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <SourceBadge sourceType={row.sourceType} />
                </td>
                <td className="px-4 py-3 font-medium">{row.firstName ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="px-4 py-3 font-medium uppercase">{row.lastName ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.originalName ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.englishName ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{row.email ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                  {row.createdAt ? new Date(row.createdAt).toLocaleDateString("ko-KR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-3 border-t border-[var(--e-border)] flex items-center justify-between text-sm text-muted-foreground bg-[var(--e-bg-page)]">
        <span>총 {total.toLocaleString()}건</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</Button>
          <span className="px-2">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>다음</Button>
        </div>
      </div>
    </div>
  );
}
