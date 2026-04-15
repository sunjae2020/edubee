import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PortalLayout } from "@/components/portal-layout";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";

// Agent (Phase 1)
import DashboardPage from "@/pages/dashboard";
import StudentsPage from "@/pages/students";
import StudentDetailPage from "@/pages/student-detail";
import CommissionsPage from "@/pages/commissions";
import ProfilePage from "@/pages/profile";

// Partner (Phase 2)
import PartnerDashboardPage from "@/pages/partner-dashboard";
import PartnerBookingsPage from "@/pages/partner-bookings";

// Student (Phase 3)
import StudentDashboardPage from "@/pages/student-dashboard";
import StudentQuotesPage from "@/pages/student-quotes";
import StudentProgramsPage from "@/pages/student-programs";

const PARTNER_ROLES = ["hotel", "pickup", "institute", "tour"];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#FAFAF9" }}>
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: "#F5821F", borderTopColor: "transparent" }} />
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  return (
    <PortalLayout>
      <Component />
    </PortalLayout>
  );
}

function RootRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  const role = user?.portalRole;
  if (role === "student") return <Redirect to="/student/dashboard" />;
  if (PARTNER_ROLES.includes(role ?? "")) return <Redirect to="/partner/dashboard" />;
  return <Redirect to="/dashboard" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />

      {/* ── Agent Routes ── */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route path="/students/:id">
        {() => <ProtectedRoute component={StudentDetailPage} />}
      </Route>
      <Route path="/students">
        {() => <ProtectedRoute component={StudentsPage} />}
      </Route>
      <Route path="/commissions">
        {() => <ProtectedRoute component={CommissionsPage} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>

      {/* ── Partner Routes ── */}
      <Route path="/partner/dashboard">
        {() => <ProtectedRoute component={PartnerDashboardPage} />}
      </Route>
      <Route path="/partner/bookings">
        {() => <ProtectedRoute component={PartnerBookingsPage} />}
      </Route>
      <Route path="/partner/profile">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>

      {/* ── Student Routes ── */}
      <Route path="/student/dashboard">
        {() => <ProtectedRoute component={StudentDashboardPage} />}
      </Route>
      <Route path="/student/quotes">
        {() => <ProtectedRoute component={StudentQuotesPage} />}
      </Route>
      <Route path="/student/programs">
        {() => <ProtectedRoute component={StudentProgramsPage} />}
      </Route>
      <Route path="/student/profile">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>

      {/* ── Root redirect ── */}
      <Route path="/">
        {() => <RootRedirect />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
