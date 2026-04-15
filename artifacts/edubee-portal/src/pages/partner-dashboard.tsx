import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarRange, DollarSign, Clock, CheckCircle, TrendingUp, Building2, MessageCircle, Pin, Megaphone, Bell, HelpCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ORANGE = "#F5821F";

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function getRoleLabel(role: string | null | undefined) {
  const map: Record<string, string> = {
    hotel: "Hotel", pickup: "Pickup", institute: "Institute", tour: "Tour Operator",
  };
  return role ? (map[role] ?? role) : "Partner";
}

interface Summary {
  totalBookings: number;
  activeBookings: number;
  totalRevenue: number;
  pendingRevenue: number;
  paidRevenue: number;
}

interface Post {
  id: string;
  title: string;
  content: string;
  type: "notice" | "announcement" | "question";
  isPinned: boolean;
  authorName: string;
  commentCount: number;
  createdAt: string;
}

function StatCard({ label, value, sub, icon: Icon, iconBg }: { label: string; value: string | number; sub?: string; icon: React.ElementType; iconBg?: string }) {
  return (
    <div className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#A8A29E" }}>{label}</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "#1C1917" }}>{value}</p>
          {sub && <p className="mt-0.5 text-xs" style={{ color: "#A8A29E" }}>{sub}</p>}
        </div>
        <div className="p-2.5 rounded-lg" style={{ background: iconBg ?? "#FEF0E3" }}>
          <Icon className="h-5 w-5" style={{ color: ORANGE }} />
        </div>
      </div>
    </div>
  );
}

const TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  notice:       { icon: Bell,       color: "#2563EB", bg: "#EFF6FF" },
  announcement: { icon: Megaphone,  color: ORANGE,    bg: "#FEF0E3" },
  question:     { icon: HelpCircle, color: "#7C3AED", bg: "#F5F3FF" },
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

export default function PartnerDashboardPage() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-partner-summary"],
    queryFn: () => api.get<{ data: Summary }>("/portal/partner/summary").then(r => r.data),
  });

  const { data: communityData, isLoading: communityLoading } = useQuery({
    queryKey: ["portal-community-preview"],
    queryFn: () => api.get<{ data: Post[] }>("/portal/community").then(r => r.data),
  });

  const recentPosts = (communityData ?? []).slice(0, 4);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#1C1917" }}>
          Welcome back, {user?.accountName?.split(" ")[0] ?? "Partner"}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "#A8A29E" }}>
          {getRoleLabel(user?.portalRole)} portal — overview of your bookings and revenue.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">
          Failed to load dashboard. Please try again.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))
        ) : data ? (
          <>
            <StatCard label="Total Bookings"   value={data.totalBookings}           icon={CalendarRange} sub="all time" />
            <StatCard label="Active Bookings"  value={data.activeBookings}          icon={TrendingUp}    sub="in progress" />
            <StatCard label="Total Revenue"    value={fmt(data.totalRevenue)}       icon={DollarSign}    sub="payable to you" />
            <StatCard label="Pending Payment"  value={fmt(data.pendingRevenue)}     icon={Clock}         sub="awaiting transfer" />
            <StatCard label="Paid to Date"     value={fmt(data.paidRevenue)}        icon={CheckCircle}   sub="settled" />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
          <Link href="/partner/bookings">
            <a className="block rounded-xl p-5 border cursor-pointer transition-all hover:border-orange-300"
              style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center gap-2 mb-2">
                <CalendarRange className="h-4 w-4" style={{ color: ORANGE }} />
                <span className="text-sm font-semibold" style={{ color: "#1C1917" }}>My Bookings</span>
              </div>
              <p className="text-xs" style={{ color: "#A8A29E" }}>View all student bookings linked to your account with payment status and program dates.</p>
              <p className="mt-3 text-xs font-semibold" style={{ color: ORANGE }}>View all bookings →</p>
            </a>
          </Link>

          <Link href="/partner/profile">
            <a className="block rounded-xl p-5 border cursor-pointer transition-all hover:border-orange-300"
              style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4" style={{ color: ORANGE }} />
                <span className="text-sm font-semibold" style={{ color: "#1C1917" }}>Organisation Profile</span>
              </div>
              <p className="text-xs" style={{ color: "#A8A29E" }}>Update your contact details, address, and account information.</p>
              <p className="mt-3 text-xs font-semibold" style={{ color: ORANGE }}>Edit profile →</p>
            </a>
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
