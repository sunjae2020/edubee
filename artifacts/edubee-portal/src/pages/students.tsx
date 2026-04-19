import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Search, ChevronRight, Globe, Mail, Phone } from "lucide-react";
import { format } from "date-fns";

interface StudentAccount {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  country: string | null;
  status: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  quoteCount: number;
  latestQuoteStatus: string | null;
  latestQuoteRef: string | null;
  createdOn: string;
}

function statusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "active")    return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "accepted")  return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "draft")     return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "pending" || v === "sent") return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (v === "cancelled" || v === "rejected") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "var(--e-bg-muted)", color: "var(--e-text-2)", border: "1px solid var(--e-border)" };
}

function initials(name: string) {
  return name.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();

  const { data: students = [], isLoading, error } = useQuery({
    queryKey: ["portal-students"],
    queryFn: () => api.get<{ data: StudentAccount[] }>("/portal/students").then(r => r.data),
  });

  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      (s.country ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--e-text-3)" }}>
          <GraduationCap size={14} />
          <span>{students.length} student{students.length !== 1 ? "s" : ""} linked to your account</span>
        </div>
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--e-text-3)" }} />
          <input
            type="text"
            placeholder="Search name, email, country…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg pl-8 pr-3 py-2 text-sm outline-none"
            style={{
              background: "var(--e-bg-surface)",
              border: "1px solid var(--e-border)",
              color: "var(--e-text-1)",
            }}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load students. Please try again.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 border flex items-center gap-4"
              style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border"
          style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
          <GraduationCap className="w-10 h-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
          <p className="text-sm font-medium" style={{ color: "var(--e-text-1)" }}>
            {search ? "No students match your search" : "No students yet"}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--e-text-3)" }}>
            {search ? "Try a different search term." : "Students will appear here once quotes are linked to your account."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(student => {
            const ss = statusStyle(student.status);
            const qs = student.latestQuoteStatus ? statusStyle(student.latestQuoteStatus) : null;
            return (
              <div
                key={student.id}
                className="rounded-xl border p-4 flex items-center gap-4 transition-all"
                style={{
                  background: "var(--e-bg-surface)",
                  borderColor: "var(--e-border)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/students/${student.id}`)}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--e-orange) 30%, transparent)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px color-mix(in srgb, var(--e-orange) 8%, transparent)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--e-border)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                }}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}
                >
                  {initials(student.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-semibold text-sm truncate" style={{ color: "var(--e-text-1)" }}>
                      {student.name}
                    </p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={ss}>
                      {student.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: "var(--e-text-3)" }}>
                    {student.email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail size={11} />{student.email}
                      </span>
                    )}
                    {student.phoneNumber && (
                      <span className="flex items-center gap-1">
                        <Phone size={11} />{student.phoneNumber}
                      </span>
                    )}
                    {student.country && (
                      <span className="flex items-center gap-1">
                        <Globe size={11} />{student.country}
                      </span>
                    )}
                    <span>Added {format(new Date(student.createdOn), "d MMM yyyy")}</span>
                  </div>
                </div>

                {/* Right: quote count + status */}
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <p className="text-xs" style={{ color: "var(--e-text-3)" }}>
                    {student.quoteCount} quote{student.quoteCount !== 1 ? "s" : ""}
                  </p>
                  {qs && student.latestQuoteStatus && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium" style={qs}>
                      {student.latestQuoteStatus}
                    </span>
                  )}
                </div>

                <ChevronRight size={16} style={{ color: "var(--e-text-3)" }} className="shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
