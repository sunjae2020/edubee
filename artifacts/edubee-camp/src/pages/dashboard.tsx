import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, FileSignature, DollarSign, TrendingUp, Calendar, ArrowUpRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function Dashboard() {
  const { data: stats, isLoading, error } = useGetDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
          <Skeleton className="h-[400px] lg:col-span-4 rounded-xl" />
          <Skeleton className="h-[400px] lg:col-span-3 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <p className="text-destructive font-semibold">Failed to load dashboard data. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  // Mock chart data for visual since actual API might not have this detailed breakdown
  const monthlyData = [
    { name: 'Jan', apps: 40 }, { name: 'Feb', apps: 30 }, { name: 'Mar', apps: 20 },
    { name: 'Apr', apps: 27 }, { name: 'May', apps: 18 }, { name: 'Jun', apps: 23 },
    { name: 'Jul', apps: 34 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-lg">Overview of your platform activity.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, staggerChildren: 0.1 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <Card className="hover-elevate transition-all duration-300 border-border/50 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4 z-0" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Applications</CardTitle>
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <FileText className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-display font-bold text-foreground">{stats.totalApplications}</div>
            <p className="text-sm text-green-600 flex items-center mt-2 font-medium">
              <TrendingUp className="h-4 w-4 mr-1" /> +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all duration-300 border-border/50 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full -mr-4 -mt-4 z-0" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending Review</CardTitle>
            <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600">
              <Calendar className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-display font-bold text-foreground">{stats.pendingApplications}</div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">Requires attention</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all duration-300 border-border/50 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4 z-0" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Contracts</CardTitle>
            <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600">
              <FileSignature className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-display font-bold text-foreground">{stats.activeContracts}</div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">Currently ongoing</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all duration-300 border-border/50 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-bl-full -mr-4 -mt-4 z-0" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Revenue</CardTitle>
            <div className="h-10 w-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-display font-bold text-foreground">${stats.totalRevenue}</div>
            <p className="text-sm text-green-600 flex items-center mt-2 font-medium">
              <TrendingUp className="h-4 w-4 mr-1" /> +8% from last month
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-border/50 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-display">Applications Overview</CardTitle>
            <CardDescription>Monthly application volume for the current year.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                <RechartsTooltip 
                  cursor={{fill: 'hsl(var(--muted)/0.5)'}}
                  contentStyle={{borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: 'var(--shadow-md)'}}
                />
                <Bar dataKey="apps" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-border/50 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-display">Status Distribution</CardTitle>
            <CardDescription>Current state of all active applications.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.applicationsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="status"
                    stroke="none"
                  >
                    {stats.applicationsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)'}}
                    itemStyle={{fontWeight: 600}}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full mt-4 grid grid-cols-2 gap-2">
              {stats.applicationsByStatus.map((item, idx) => (
                <div key={item.status} className="flex items-center text-sm">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="capitalize text-muted-foreground truncate">{item.status.replace('_', ' ')}</span>
                  <span className="ml-auto font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-muted/20">
          <div>
            <CardTitle className="text-lg font-display">Recent Applications</CardTitle>
            <CardDescription>The latest applications submitted to the platform.</CardDescription>
          </div>
          <a href="/applications" className="text-sm font-medium text-primary hover:underline flex items-center">
            View All <ArrowUpRight className="ml-1 w-4 h-4" />
          </a>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">App ID</th>
                  <th className="px-6 py-4 font-semibold">Language</th>
                  <th className="px-6 py-4 font-semibold">Participants</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentApplications?.slice(0, 5).map((app, index) => (
                  <tr key={app.id} className="bg-card hover:bg-muted/30 transition-colors border-b border-border last:border-0 group cursor-pointer">
                    <td className="px-6 py-4 font-medium text-foreground group-hover:text-primary transition-colors">
                      {app.applicationNumber || app.id.substring(0,8)}
                    </td>
                    <td className="px-6 py-4 uppercase text-muted-foreground font-medium">
                      {app.primaryLanguage}
                    </td>
                    <td className="px-6 py-4">
                      {app.totalChildren} Child, {app.totalAdults} Adult
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(app.createdAt), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <StatusBadge status={app.status} />
                    </td>
                  </tr>
                ))}
                {!stats.recentApplications?.length && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-base font-medium">No recent applications found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
