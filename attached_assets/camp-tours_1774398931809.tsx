// /client/src/pages/admin/camp-services/camp-tours.tsx
// Camp Tour 목록 페이지
// 백엔드: camp_tour_mgt 테이블
// API:    GET /api/camp-services/tours

import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Plus,
  MapPin,
  ChevronRight,
  Calendar,
  Clock,
} from "lucide-react";

// ── 타입 ──────────────────────────────────────────────────────
interface CampTour {
  id: string;
  contractId: string;
  contractNumber?: string;
  studentName?: string;
  tourProviderAccountId?: string;
  providerName?: string;
  tourName?: string;
  tourType?: string;
  tourDate?: string;
  tourDurationHours?: number;
  pickupLocation?: string;
  maxParticipants?: number;
  bookingReference?: string;
  partnerCost?: number;
  retailPrice?: number;
  status: string;
  notes?: string;
  createdAt: string;
}

// ── 투어 타입 라벨 ────────────────────────────────────────────
const TOUR_TYPE_LABELS: Record<string, string> = {
  day_tour:   "Day Tour",
  overnight:  "Overnight",
  cultural:   "Cultural",
  adventure:  "Adventure",
  city:       "City",
  nature:     "Nature",
};

// ── 상태 뱃지 ─────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: "#FEF9C3", text: "#CA8A04", label: "Pending" },
  booked:    { bg: "#FEF0E3", text: "#F5821F", label: "Booked" },
  confirmed: { bg: "#DCFCE7", text: "#16A34A", label: "Confirmed" },
  completed: { bg: "#DCFCE7", text: "#16A34A", label: "Completed" },
  cancelled: { bg: "#FEF2F2", text: "#DC2626", label: "Cancelled" },
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
export default function CampTours() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tourTypeFilter, setTourTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // ── 데이터 페치 ─────────────────────────────────────────────
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search && { search }),
    ...(statusFilter && { status: statusFilter }),
    ...(tourTypeFilter && { tourType: tourTypeFilter }),
  });

  const { data, isLoading } = useQuery<{
    tours: CampTour[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ["/api/camp-services/tours", search, statusFilter, tourTypeFilter, page],
    queryFn: async () => {
      const res = await fetch(`/api/camp-services/tours?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch tours");
      return res.json();
    },
  });

  const tours = data?.tours ?? [];
  const totalPages = data?.totalPages ?? 1;

  // ── 헬퍼 ────────────────────────────────────────────────────
  function formatDate(d?: string) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-AU", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }

  function formatCurrency(amount?: number) {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-AU", {
      style: "currency", currency: "AUD", minimumFractionDigits: 0,
    }).format(amount);
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
            Camp Tours
          </h1>
          <p style={{ fontSize: 14, color: "#57534E", marginTop: 4 }}>
            Manage camp tour bookings and activities
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/camp-services/tours/new")}
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
          New Tour
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
            placeholder="Search student, tour name, provider..."
            style={{
              width: "100%", height: 40,
              border: "1.5px solid #E8E6E2", borderRadius: 8,
              padding: "0 12px 0 36px", fontSize: 14,
              color: "#1C1917", background: "#fff", boxSizing: "border-box",
            }}
          />
        </div>

        {/* 투어 타입 필터 */}
        <select
          value={tourTypeFilter}
          onChange={(e) => { setTourTypeFilter(e.target.value); setPage(1); }}
          style={{
            height: 40, border: "1.5px solid #E8E6E2", borderRadius: 8,
            padding: "0 12px", fontSize: 14, color: "#1C1917",
            background: "#fff", cursor: "pointer", minWidth: 140,
          }}
        >
          <option value="">All Types</option>
          {Object.entries(TOUR_TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        {/* 상태 필터 */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{
            height: 40, border: "1.5px solid #E8E6E2", borderRadius: 8,
            padding: "0 12px", fontSize: 14, color: "#1C1917",
            background: "#fff", cursor: "pointer", minWidth: 140,
          }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="booked">Booked</option>
          <option value="confirmed">Confirmed</option>
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
            gridTemplateColumns: "2fr 2fr 1.2fr 1fr 1fr 1fr 40px",
            padding: "12px 20px",
            background: "#FAFAF9",
            borderBottom: "1px solid #E8E6E2",
            fontSize: 12, fontWeight: 500,
            color: "#57534E", textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>Student / Contract</span>
          <span>Tour</span>
          <span>Date</span>
          <span>Duration</span>
          <span>Retail Price</span>
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
        {!isLoading && tours.length === 0 && (
          <div style={{ padding: 64, textAlign: "center" }}>
            <div
              style={{
                width: 48, height: 48, borderRadius: 10,
                background: "#FEF0E3", display: "flex",
                alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <MapPin size={24} color="#F5821F" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1C1917", margin: "0 0 8px" }}>
              No tours found
            </p>
            <p style={{ fontSize: 14, color: "#57534E", margin: 0 }}>
              Create a new camp tour booking to get started.
            </p>
          </div>
        )}

        {/* 데이터 행 */}
        {tours.map((tour) => (
          <div
            key={tour.id}
            onClick={() => navigate(`/admin/camp-services/tours/${tour.id}`)}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 2fr 1.2fr 1fr 1fr 1fr 40px",
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
                {tour.studentName ?? "—"}
              </div>
              <div style={{ fontSize: 12, color: "#A8A29E", marginTop: 2 }}>
                {tour.contractNumber ?? tour.contractId.slice(0, 8)}
              </div>
            </div>

            {/* Tour */}
            <div>
              <div style={{ fontSize: 14, color: "#1C1917" }}>
                {tour.tourName ?? "—"}
              </div>
              <div style={{ fontSize: 12, color: "#A8A29E", marginTop: 2 }}>
                {tour.tourType ? (TOUR_TYPE_LABELS[tour.tourType] ?? tour.tourType) : "—"}
                {tour.providerName ? ` · ${tour.providerName}` : ""}
              </div>
            </div>

            {/* Date */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Calendar size={14} color="#A8A29E" />
              <span style={{ fontSize: 14, color: "#57534E" }}>
                {formatDate(tour.tourDate)}
              </span>
            </div>

            {/* Duration */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={14} color="#A8A29E" />
              <span style={{ fontSize: 14, color: "#57534E" }}>
                {tour.tourDurationHours ? `${tour.tourDurationHours}h` : "—"}
              </span>
            </div>

            {/* Retail Price */}
            <div style={{ fontSize: 14, color: "#1C1917", fontWeight: 500 }}>
              {formatCurrency(tour.retailPrice)}
            </div>

            {/* Status */}
            <StatusBadge status={tour.status} />

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
