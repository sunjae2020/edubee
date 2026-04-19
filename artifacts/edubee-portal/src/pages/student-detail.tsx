import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Mail, Phone, Globe, MapPin, FileText, Calendar,
  GraduationCap, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

interface StudentDetail {
  account: {
    id: string;
    name: string;
    email: string | null;
    phoneNumber: string | null;
    country: string | null;
    status: string;
    firstName: string | null;
    lastName: string | null;
    address: string | null;
    createdOn: string;
    profileImageUrl: string | null;
  };
  quotes: Array<{
    id: string;
    quoteRefNumber: string | null;
    quoteStatus: string;
    expiryDate: string | null;
    notes: string | null;
    createdOn: string;
  }>;
}

function statusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "active" || v === "accepted") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "draft")   return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "pending" || v === "sent") return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (v === "cancelled" || v === "rejected") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "var(--e-bg-muted)", color: "var(--e-text-2)", border: "1px solid var(--e-border)" };
}

function initials(name: string) {
  return name.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "var(--e-orange-lt)" }}>
        <Icon className="w-3.5 h-3.5" style={{ color: "var(--e-orange)" }} />
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>{label}</p>
        <p className="text-sm font-medium mt-0.5" style={{ color: "var(--e-text-1)" }}>{value}</p>
      </div>
    </div>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-student", id],
    queryFn: () => api.get<{ data: StudentDetail }>(`/portal/students/${id}`).then(r => r.data),
    enabled: !!id,
  });

  if (isLoading) return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Skeleton className="h-8 w-32 rounded-lg" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  );

  if (error || !data) return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button
        onClick={() => navigate("/students")}
        className="flex items-center gap-1.5 text-sm font-medium transition-colors"
        style={{ color: "var(--e-text-2)" }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--e-orange)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--e-text-2)")}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to My Students
      </button>
      <div className="rounded-xl p-6 text-center" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
        <p className="text-sm font-medium" style={{ color: "#DC2626" }}>
          Student not found or access denied.
        </p>
      </div>
    </div>
  );

  const { account, quotes } = data;
  const ss = statusStyle(account.status);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate("/students")}
        className="flex items-center gap-1.5 text-sm font-medium transition-colors"
        style={{ color: "var(--e-text-2)" }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--e-orange)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--e-text-2)")}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to My Students
      </button>

      {/* Profile card */}
      <div className="rounded-xl p-5" style={{ background: "var(--e-bg-surface)", border: "1px solid var(--e-border)" }}>
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
            style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}
          >
            {initials(account.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold" style={{ color: "var(--e-text-1)" }}>{account.name}</h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={ss}>
                {account.status}
              </span>
            </div>
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--e-text-3)" }}>
              <GraduationCap size={12} />
              Student Account · Added {format(new Date(account.createdOn), "d MMM yyyy")}
            </p>
          </div>
        </div>
      </div>

      {/* Contact & address */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--e-bg-surface)", border: "1px solid var(--e-border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--e-text-1)" }}>Contact Details</h2>
          <InfoRow icon={Mail}    label="Email"        value={account.email} />
          <InfoRow icon={Phone}   label="Phone"        value={account.phoneNumber} />
          <InfoRow icon={Globe}   label="Country"      value={account.country} />
          <InfoRow icon={MapPin}  label="Address"      value={account.address} />
          <InfoRow icon={Calendar} label="Added"       value={format(new Date(account.createdOn), "d MMM yyyy")} />
        </div>

        {/* Quotes summary */}
        <div className="rounded-xl p-5" style={{ background: "var(--e-bg-surface)", border: "1px solid var(--e-border)" }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--e-text-1)" }}>
            <span className="flex items-center gap-2">
              <FileText size={14} style={{ color: "var(--e-orange)" }} />
              Quotes ({quotes.length})
            </span>
          </h2>
          {quotes.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: "#D1CFC8" }} />
              <p className="text-xs" style={{ color: "var(--e-text-3)" }}>No quotes yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {quotes.slice(0, 5).map(q => {
                const qs = statusStyle(q.quoteStatus);
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-3 rounded-lg transition-colors"
                    style={{ background: "var(--e-bg-page)", border: "1px solid var(--e-border)", cursor: "pointer" }}
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "color-mix(in srgb, var(--e-orange) 30%, transparent)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--e-border)")}
                  >
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--e-text-1)" }}>
                        {q.quoteRefNumber ?? q.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--e-text-3)" }}>
                        {format(new Date(q.createdOn), "d MMM yyyy")}
                        {q.expiryDate && ` · exp ${format(new Date(q.expiryDate), "d MMM yy")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={qs}>
                        {q.quoteStatus}
                      </span>
                      <ChevronRight size={12} style={{ color: "var(--e-text-3)" }} />
                    </div>
                  </div>
                );
              })}
              {quotes.length > 5 && (
                <p className="text-xs text-center pt-1" style={{ color: "var(--e-text-3)" }}>
                  +{quotes.length - 5} more quotes
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
