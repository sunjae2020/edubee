import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, DollarSign, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Link } from "wouter";

interface Summary {
  totalStudents: number;
  totalQuotes: number;
  activeQuotes: number;
  acceptedQuotes: number;
  totalQuoteValue: number;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <Card className="border-card-border shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-lg ${accent ?? "bg-primary/10"}`}>
            <Icon className={`h-5 w-5 ${accent ? "text-white" : "text-primary"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-summary"],
    queryFn: () => api.get<{ data: Summary }>("/portal/dashboard/summary").then((r) => r.data),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.accountName?.split(" ")[0] ?? "Agent"}
        </h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Here is an overview of your portal activity.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive mb-6">
          Failed to load dashboard data. Please try again.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-card-border shadow-sm">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-28 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : data ? (
          <>
            <StatCard label="Total Students" value={data.totalStudents} icon={Users} sub="linked to your account" />
            <StatCard label="Total Quotes" value={data.totalQuotes} icon={FileText} sub={`${data.activeQuotes} active`} />
            <StatCard label="Accepted Quotes" value={data.acceptedQuotes} icon={CheckCircle} sub="confirmed enrolments" />
            <StatCard label="Total Quote Value" value={fmt(data.totalQuoteValue)} icon={TrendingUp} sub="across all quotes" />
            <StatCard label="Pending Commission" value={fmt(data.pendingCommission)} icon={Clock} sub="awaiting payment" />
            <StatCard label="Paid Commission" value={fmt(data.paidCommission)} icon={DollarSign} sub="settled to date" />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/students">
          <a className="block">
            <Card className="border-card-border shadow-sm hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  My Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View all students linked to your agency account, their quotes, and enrolment status.
                </p>
                <p className="mt-3 text-xs font-medium text-primary group-hover:underline">
                  View all students &rarr;
                </p>
              </CardContent>
            </Card>
          </a>
        </Link>

        <Link href="/commissions">
          <a className="block">
            <Card className="border-card-border shadow-sm hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Commission History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track your commission invoices, payment status, and earning history.
                </p>
                <p className="mt-3 text-xs font-medium text-primary group-hover:underline">
                  View commissions &rarr;
                </p>
              </CardContent>
            </Card>
          </a>
        </Link>
      </div>
    </div>
  );
}
