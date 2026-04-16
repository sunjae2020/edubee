import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PortalLayout } from "@/components/portal-layout";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";

// ── Agent ──────────────────────────────────────────────────────────────────
import DashboardPage              from "@/pages/dashboard";
import AgentConsultationsPage     from "@/pages/agent-consultations";
import AgentLeadDetailPage        from "@/pages/agent-lead-detail";
import StudentsPage               from "@/pages/students";
import StudentDetailPage          from "@/pages/student-detail";
import CommissionsPage         from "@/pages/commissions";
import ProfilePage             from "@/pages/profile";
import AgentQuotesPage         from "@/pages/agent-quotes";
import AgentQuoteDetailPage    from "@/pages/agent-quote-detail";
import AgentServicesPage       from "@/pages/agent-services";
import AgentDocumentsPage      from "@/pages/agent-documents";

// ── Partner ────────────────────────────────────────────────────────────────
import PartnerDashboardPage      from "@/pages/partner-dashboard";
import PartnerBookingsPage       from "@/pages/partner-bookings";
import PartnerBookingDetailPage  from "@/pages/partner-booking-detail";
import PartnerConsultationsPage  from "@/pages/partner-consultations";
import PartnerServicesPage       from "@/pages/partner-services";
import PartnerFinancePage        from "@/pages/partner-finance";
import PartnerDocumentsPage      from "@/pages/partner-documents";

// ── Community (shared across all roles) ────────────────────────────────────
import CommunityPage             from "@/pages/community";

// ── Student ────────────────────────────────────────────────────────────────
import StudentDashboardPage      from "@/pages/student-dashboard";
import StudentQuotesPage         from "@/pages/student-quotes";
import StudentQuoteDetailPage    from "@/pages/student-quote-detail";
import StudentProgramsPage       from "@/pages/student-programs";
import StudentConsultationsPage  from "@/pages/student-consultations";
import StudentFinancePage        from "@/pages/student-finance";
import StudentDocumentsPage      from "@/pages/student-documents";

const PARTNER_ROLES = ["hotel", "pickup", "institute", "tour"];

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#FAFAF9" }}>
      <div
        className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
        style={{ borderColor: "#F5821F", borderTopColor: "transparent" }}
      />
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

      {/* ── Agent ── */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route path="/consultations">
        {() => <ProtectedRoute component={AgentConsultationsPage} />}
      </Route>
      <Route path="/leads/:id">
        {() => <ProtectedRoute component={AgentLeadDetailPage} />}
      </Route>
      <Route path="/quotes/:id">
        {() => <ProtectedRoute component={AgentQuoteDetailPage} />}
      </Route>
      <Route path="/quotes">
        {() => <ProtectedRoute component={AgentQuotesPage} />}
      </Route>
      <Route path="/services">
        {() => <ProtectedRoute component={AgentServicesPage} />}
      </Route>
      <Route path="/finance">
        {() => <ProtectedRoute component={CommissionsPage} />}
      </Route>
      <Route path="/documents">
        {() => <ProtectedRoute component={AgentDocumentsPage} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>
      {/* legacy paths */}
      <Route path="/students/:id">
        {() => <ProtectedRoute component={StudentDetailPage} />}
      </Route>
      <Route path="/students">
        {() => <Redirect to="/consultations" />}
      </Route>
      <Route path="/commissions">
        {() => <Redirect to="/finance" />}
      </Route>

      {/* ── Partner ── */}
      <Route path="/partner/dashboard">
        {() => <ProtectedRoute component={PartnerDashboardPage} />}
      </Route>
      <Route path="/partner/consultations">
        {() => <ProtectedRoute component={PartnerConsultationsPage} />}
      </Route>
      <Route path="/partner/quotes/:id">
        {() => <ProtectedRoute component={PartnerBookingDetailPage} />}
      </Route>
      <Route path="/partner/quotes">
        {() => <ProtectedRoute component={PartnerBookingsPage} />}
      </Route>
      <Route path="/partner/services">
        {() => <ProtectedRoute component={PartnerServicesPage} />}
      </Route>
      <Route path="/partner/finance">
        {() => <ProtectedRoute component={PartnerFinancePage} />}
      </Route>
      <Route path="/partner/documents">
        {() => <ProtectedRoute component={PartnerDocumentsPage} />}
      </Route>
      <Route path="/partner/profile">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>
      {/* legacy */}
      <Route path="/partner/bookings">
        {() => <Redirect to="/partner/quotes" />}
      </Route>

      {/* ── Student ── */}
      <Route path="/student/dashboard">
        {() => <ProtectedRoute component={StudentDashboardPage} />}
      </Route>
      <Route path="/student/consultations">
        {() => <ProtectedRoute component={StudentConsultationsPage} />}
      </Route>
      <Route path="/student/quotes/:id">
        {() => <ProtectedRoute component={StudentQuoteDetailPage} />}
      </Route>
      <Route path="/student/quotes">
        {() => <ProtectedRoute component={StudentQuotesPage} />}
      </Route>
      <Route path="/student/services">
        {() => <ProtectedRoute component={StudentProgramsPage} />}
      </Route>
      <Route path="/student/finance">
        {() => <ProtectedRoute component={StudentFinancePage} />}
      </Route>
      <Route path="/student/documents">
        {() => <ProtectedRoute component={StudentDocumentsPage} />}
      </Route>
      <Route path="/student/profile">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>
      {/* legacy */}
      <Route path="/student/programs">
        {() => <Redirect to="/student/services" />}
      </Route>

      {/* ── Community (all roles share this route) ── */}
      <Route path="/community">
        {() => <ProtectedRoute component={CommunityPage} />}
      </Route>

      {/* Root */}
      <Route path="/">{() => <RootRedirect />}</Route>

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
