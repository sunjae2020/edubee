import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, BookOpen, CheckCircle, DollarSign, Clock, TrendingUp } from "lucide-react";

const ORANGE = "#F5821F";

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

interface Summary {
  totalQuotes: number;
  activeQuotes: number;
  acceptedQuotes: number;
  totalPrograms: number;
  activePrograms: number;
  totalPaid: number;
  totalBalance: number;
}

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#A8A29E" }}>{label}</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "#1C1917" }}>{value}</p>
          {sub && <p className="mt-0.5 text-xs" style={{ color: "#A8A29E" }}>{sub}</p>}
        </div>
        <div className="p-2.5 rounded-lg" style={{ background: "#FEF0E3" }}>
          <Icon className="h-5 w-5" style={{ color: ORANGE }} />
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-student-summary"],
    queryFn: () => api.get<{ data: Summary }>("/portal/student/summary").then(r => r.data),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#1C1917" }}>
          Welcome, {user?.accountName?.split(" ")[0] ?? "Student"}!
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "#A8A29E" }}>
          Here is a summary of your quotes and enrolled programs.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">
          Failed to load dashboard. Please try again.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))
        ) : data ? (
          <>
            <StatCard label="Total Quotes" value={data.totalQuotes} icon={FileText} sub={`${data.activeQuotes} active`} />
            <StatCard label="Accepted Quotes" value={data.acceptedQuotes} icon={CheckCircle} sub="confirmed" />
            <StatCard label="My Programs" value={data.totalPrograms} icon={BookOpen} sub={`${data.activePrograms} active`} />
            <StatCard label="Total Paid" value={fmt(data.totalPaid)} icon={DollarSign} sub="settled" />
            <StatCard label="Balance Owing" value={fmt(data.totalBalance)} icon={Clock} sub="remaining" />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/student/quotes">
          <a className="block rounded-xl p-5 border cursor-pointer transition-all hover:border-orange-300"
            style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4" style={{ color: ORANGE }} />
              <span className="text-sm font-semibold" style={{ color: "#1C1917" }}>My Quotes</span>
            </div>
            <p className="text-xs" style={{ color: "#A8A29E" }}>View all quotes prepared by your agent — including status, program details, and pricing.</p>
            <p className="mt-3 text-xs font-semibold" style={{ color: ORANGE }}>View all quotes →</p>
          </a>
        </Link>

        <Link href="/student/programs">
          <a className="block rounded-xl p-5 border cursor-pointer transition-all hover:border-orange-300"
            style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4" style={{ color: ORANGE }} />
              <span className="text-sm font-semibold" style={{ color: "#1C1917" }}>My Programs</span>
            </div>
            <p className="text-xs" style={{ color: "#A8A29E" }}>Track your enrolled programs, course dates, payment schedule, and contract status.</p>
            <p className="mt-3 text-xs font-semibold" style={{ color: ORANGE }}>View programs →</p>
          </a>
        </Link>
      </div>
    </div>
  );
}
