// /client/src/pages/admin/camp-services/camp-institutes.tsx
// Camp Institute 목록 페이지
// 백엔드: study_abroad_mgt WHERE program_context = 'camp'
// API:    GET /api/camp-services/institutes

import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Plus,
  BookOpen,
  ChevronRight,
  Calendar,
  Users,
} from "lucide-react";

// ── 타입 ──────────────────────────────────────────────────────
interface CampInstitute {
  id: string;
  contractId: string;
  contractNumber?: string;
  studentName?: string;
  instituteAccountId?: string;
  instituteName?: string;
  programName?: string;
  programType?: string;
  programStartDate?: string;
  programEndDate?: string;
  weeklyHours?: number;
  ageGroup?: string;
  levelAssessmentRequired?: boolean;
  assignedClass?: string;
  status: string;
  notes?: string;
  createdAt: string;
}

// ── 상태 뱃지 ─────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:     { bg: "#FEF9C3", text: "#CA8A04", label: "Pending" },
  confirmed:   { bg: "#DCFCE7", text: "#16A34A", label: "Confirmed" },
  in_progress: { bg: "#FEF0E3", text: "#F5821F", label: "In Progress" },
  completed:   { bg: "#DCFCE7", text: "#16A34A", label: "Completed" },
  cancelled:   { bg: "#FEF2F2", text: "#DC2626", label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: "#F4F3F1", text: "#57534E", label: status };
  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 999,
        padding: "3px 10px",
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function CampInstitutes() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // ── 데이터 페치 ─────────────────────────────────────────────
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search && { search }),
    ...(statusFilter && { status: statusFilter }),
  });

  const { data, isLoading } = useQuery<{
    institutes: CampInstitute[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ["/api/camp-services/institutes", search, statusFilter, page],
    queryFn: async () => {
      const res = await fetch(`/api/camp-services/institutes?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch institutes");
      return res.json();
    },
  });

  const institutes = data?.institutes ?? [];
  const totalPages = data?.totalPages ?? 1;

  // ── 헬퍼 ────────────────────────────────────────────────────
  function formatDate(d?: string) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-AU", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }

  function programTypeLabel(t?: string) {
    if (!t) return "—";
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  // ── 렌더 ────────────────────────────────────────────────────
  return (
    <div style={{ padding: 32, background: "#FAFAF9", minHeight: "100vh" }}>

      {/* ── 페이지 헤더 ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 32,
          paddingBottom: 24,
          borderBottom: "1px solid #E8E6E2",
        }}
      >
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1C1917", margin: 0 }}>
            Camp Institute
          </h1>
          <p style={{ fontSize: 14, color: "#57534E", marginTop: 4 }}>
            Manage camp academic programme placements
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/camp-services/institutes/new")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#F5821F",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={16} />
          New Institute
        </button>
      </div>

      {/* ── 필터 바 ── */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        {/* 검색 */}
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <Search
            size={16}
            style={{
              position: "absolute", left: 12, top: "50%",
              transform: "translateY(-50%)", color: "#A8A29E",
            }}
          />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search student, program, school..."
            style={{
              width: "100%", height: 40,
              border: "1.5px solid #E8E6E2", borderRadius: 8,
              padding: "0 12px 0 36px", fontSize: 14,
              color: "#1C1917", background: "#fff", boxSizing: "border-box",
            }}
          />
        </div>

        {/* 상태 필터 */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{
            height: 40, border: "1.5px solid #E8E6E2", borderRadius: 8,
            padding: "0 12px", fontSize: 14, color: "#1C1917",
            background: "#fff", cursor: "pointer", minWidth: 150,
          }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* ── 테이블 ── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #E8E6E2",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {/* 테이블 헤더 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 2fr 1.5fr 1fr 1fr 1fr 40px",
            padding: "12px 20px",
            background: "#FAFAF9",
            borderBottom: "1px solid #E8E6E2",
            fontSize: 12, fontWeight: 500,
            color: "#57534E", textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>Student / Contract</span>
          <span>Program</span>
          <span>Period</span>
          <span>Age Group</span>
          <span>Hours/wk</span>
          <span>Status</span>
          <span />
        </div>

        {/* 로딩 */}
        {isLoading && (
          <div style={{ padding: 48, textAlign: "center", color: "#A8A29E" }}>
            Loading...
          </div>
        )}

        {/* 빈 상태 */}
        {!isLoading && institutes.length === 0 && (
          <div style={{ padding: 64, textAlign: "center" }}>
            <div
              style={{
                width: 48, height: 48, borderRadius: 10,
                background: "#FEF0E3", display: "flex",
                alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <BookOpen size={24} color="#F5821F" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1C1917", margin: "0 0 8px" }}>
              No institutes found
            </p>
            <p style={{ fontSize: 14, color: "#57534E", margin: 0 }}>
              Create a new camp institute placement to get started.
            </p>
          </div>
        )}

        {/* 데이터 행 */}
        {institutes.map((inst) => (
          <div
            key={inst.id}
            onClick={() => navigate(`/admin/camp-services/institutes/${inst.id}`)}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 2fr 1.5fr 1fr 1fr 1fr 40px",
              padding: "14px 20px",
              borderBottom: "1px solid #F4F3F1",
              alignItems: "center",
              cursor: "pointer",
              transition: "background 200ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAF9")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {/* Student / Contract */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1C1917" }}>
                {inst.studentName ?? "—"}
              </div>
              <div style={{ fontSize: 12, color: "#A8A29E", marginTop: 2 }}>
                {inst.contractNumber ?? inst.contractId.slice(0, 8)}
              </div>
            </div>

            {/* Program */}
            <div>
              <div style={{ fontSize: 14, color: "#1C1917" }}>
                {inst.programName ?? "—"}
              </div>
              <div style={{ fontSize: 12, color: "#A8A29E", marginTop: 2 }}>
                {programTypeLabel(inst.programType)}
              </div>
            </div>

            {/* Period */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Calendar size={14} color="#A8A29E" />
              <div>
                <div style={{ fontSize: 12, color: "#57534E" }}>
                  {formatDate(inst.programStartDate)}
                </div>
                <div style={{ fontSize: 12, color: "#A8A29E" }}>
                  → {formatDate(inst.programEndDate)}
                </div>
              </div>
            </div>

            {/* Age Group */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={14} color="#A8A29E" />
              <span style={{ fontSize: 14, color: "#57534E", textTransform: "capitalize" }}>
                {inst.ageGroup ?? "—"}
              </span>
            </div>

            {/* Weekly Hours */}
            <div style={{ fontSize: 14, color: "#57534E" }}>
              {inst.weeklyHours ? `${inst.weeklyHours}h` : "—"}
            </div>

            {/* Status */}
            <StatusBadge status={inst.status} />

            {/* Arrow */}
            <ChevronRight size={16} color="#A8A29E" />
          </div>
        ))}
      </div>

      {/* ── 페이지네이션 ── */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            marginTop: 24,
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 14,
              border: "1.5px solid #E8E6E2", background: "#fff",
              cursor: page === 1 ? "not-allowed" : "pointer",
              color: page === 1 ? "#A8A29E" : "#1C1917",
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: 14, color: "#57534E" }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 14,
              border: "1.5px solid #E8E6E2", background: "#fff",
              cursor: page === totalPages ? "not-allowed" : "pointer",
              color: page === totalPages ? "#A8A29E" : "#1C1917",
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
