import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, DollarSign, CheckCircle, Clock, TrendingUp, MessageCircle, Pin, Megaphone, Bell, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

const ORANGE = "#F5821F";

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

interface Post {
  id: string;
  title: string;
  content: string;
  type: "notice" | "announcement" | "question";
  visibility: string;
  audience: string;
  isPinned: boolean;
  isResolved: boolean;
  authorName: string;
  commentCount: number;
  createdAt: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function StatCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; accent?: string;
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

const TYPE_META: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  notice:       { icon: Bell,      label: "Notice",       color: "#2563EB", bg: "#EFF6FF" },
  announcement: { icon: Megaphone, label: "Announcement", color: ORANGE,    bg: "#FEF0E3" },
  question:     { icon: HelpCircle,label: "Question",     color: "#7C3AED", bg: "#F5F3FF" },
};

function PostRow({ post }: { post: Post }) {
  const meta = TYPE_META[post.type] ?? TYPE_META.notice;
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: "#E8E6E2" }}>
      <div className="p-1.5 rounded-md mt-0.5 flex-shrink-0" style={{ background: meta.bg }}>
        <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {post.isPinned && <Pin className="h-3 w-3 flex-shrink-0" style={{ color: ORANGE }} />}
          <p className="text-sm font-medium truncate" style={{ color: "#1C1917" }}>{post.title}</p>
        </div>
        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "#A8A29E" }}>{post.content}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs" style={{ color: "#A8A29E" }}>{post.authorName}</span>
          <span style={{ color: "#E8E6E2" }}>·</span>
          <span className="text-xs" style={{ color: "#A8A29E" }}>
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </span>
          {post.commentCount > 0 && (
            <>
              <span style={{ color: "#E8E6E2" }}>·</span>
              <span className="text-xs flex items-center gap-0.5" style={{ color: "#A8A29E" }}>
                <MessageCircle className="h-3 w-3" />{post.commentCount}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-summary"],
    queryFn: () => api.get<{ data: Summary }>("/portal/dashboard/summary").then((r) => r.data),
  });

  const { data: communityData, isLoading: communityLoading } = useQuery({
    queryKey: ["portal-community-preview"],
    queryFn: () => api.get<{ data: Post[] }>("/portal/community").then(r => r.data),
  });

  const recentPosts = (communityData ?? []).slice(0, 4);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
          <Link href="/students">
            <div className="block">
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
            </div>
          </Link>

          <Link href="/commissions">
            <div className="block">
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
            </div>
          </Link>
        </div>

        {/* Community highlights */}
        <div className="rounded-xl border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b" style={{ borderColor: "#E8E6E2" }}>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" style={{ color: ORANGE }} />
              <span className="text-sm font-semibold" style={{ color: "#1C1917" }}>Community</span>
            </div>
            <Link href="/community" className="text-xs font-medium hover:underline" style={{ color: ORANGE }}>View all →</Link>
          </div>
          <div className="px-4">
            {communityLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="py-3 border-b last:border-0" style={{ borderColor: "#E8E6E2" }}>
                  <Skeleton className="h-3.5 w-40 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))
            ) : recentPosts.length > 0 ? (
              recentPosts.map(p => <PostRow key={p.id} post={p} />)
            ) : (
              <div className="py-8 text-center">
                <MessageCircle className="h-6 w-6 mx-auto mb-2" style={{ color: "#E8E6E2" }} />
                <p className="text-xs" style={{ color: "#A8A29E" }}>No posts yet. Be the first!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
