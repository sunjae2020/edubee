import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ViewAsProvider } from "@/hooks/use-view-as";
import "@/lib/i18n";

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Users from "@/pages/users";
import Applications from "@/pages/admin/applications";
import PackageGroups from "@/pages/admin/package-groups";
import Leads from "@/pages/admin/leads";
import Contracts from "@/pages/admin/contracts";
import AdminStub from "@/pages/admin/stub";
import NotFound from "@/pages/not-found";

// Services
import InstituteManagement from "@/pages/admin/services/institute";
import HotelManagement from "@/pages/admin/services/hotel";
import PickupManagement from "@/pages/admin/services/pickup";
import TourManagement from "@/pages/admin/services/tour";
import Interviews from "@/pages/admin/services/interviews";
import Settlement from "@/pages/admin/services/settlement";
import TasksCS from "@/pages/admin/services/tasks";

// Accounting
import ExchangeRates from "@/pages/admin/accounting/exchange-rates";
import ClientInvoices from "@/pages/admin/accounting/client-invoices";
import AgentInvoices from "@/pages/admin/accounting/agent-invoices";
import PartnerInvoices from "@/pages/admin/accounting/partner-invoices";
import Receipts from "@/pages/admin/accounting/receipts";
import Transactions from "@/pages/admin/accounting/transactions";

// My Accounting
import MySettlements from "@/pages/admin/my-accounting/settlements";
import MyInvoices from "@/pages/admin/my-accounting/invoices";
import MyRevenue from "@/pages/admin/my-accounting/revenue";

// Reports
import Reports from "@/pages/admin/reports";

// Settings
import GeneralSettings from "@/pages/admin/settings/general";
import PageAccess from "@/pages/admin/settings/page-access";
import FieldPermissions from "@/pages/admin/settings/field-permissions";
import DocPermissions from "@/pages/admin/settings/doc-permissions";
import ImpersonationLogs from "@/pages/admin/settings/impersonation-logs";

// My Programs
import MyPrograms from "@/pages/admin/my-programs";

// Enrollment Spots
import EnrollmentSpots from "@/pages/admin/enrollment-spots";

// Notifications
import Notifications from "@/pages/admin/notifications";

import { MainLayout } from "@/components/layout/main-layout";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AdminRoute({ children, title }: { children: React.ReactNode; title?: string }) {
  return <MainLayout title={title}>{children}</MainLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />

      <Route path="/admin/dashboard">
        <AdminRoute title="Dashboard"><Dashboard /></AdminRoute>
      </Route>
      <Route path="/admin/package-groups">
        <AdminRoute title="Package Groups"><PackageGroups /></AdminRoute>
      </Route>
      <Route path="/admin/packages">
        <AdminRoute title="Packages"><AdminStub title="Packages" icon="🗂️" /></AdminRoute>
      </Route>
      <Route path="/admin/products">
        <AdminRoute title="Products"><AdminStub title="Products" icon="📦" /></AdminRoute>
      </Route>
      <Route path="/admin/enrollment-spots">
        <AdminRoute title="Enrollment Spots"><EnrollmentSpots /></AdminRoute>
      </Route>
      <Route path="/admin/leads">
        <AdminRoute title="Leads"><Leads /></AdminRoute>
      </Route>
      <Route path="/admin/applications">
        <AdminRoute title="Applications"><Applications /></AdminRoute>
      </Route>
      <Route path="/admin/contracts">
        <AdminRoute title="Contracts"><Contracts /></AdminRoute>
      </Route>

      {/* Service Pages */}
      <Route path="/admin/services/institute">
        <AdminRoute title="Institute Management"><InstituteManagement /></AdminRoute>
      </Route>
      <Route path="/admin/services/hotel">
        <AdminRoute title="Hotel Management"><HotelManagement /></AdminRoute>
      </Route>
      <Route path="/admin/services/pickup">
        <AdminRoute title="Pickup Management"><PickupManagement /></AdminRoute>
      </Route>
      <Route path="/admin/services/tour">
        <AdminRoute title="Tour Management"><TourManagement /></AdminRoute>
      </Route>
      <Route path="/admin/services/interviews">
        <AdminRoute title="Interviews"><Interviews /></AdminRoute>
      </Route>
      <Route path="/admin/services/settlement">
        <AdminRoute title="Settlement"><Settlement /></AdminRoute>
      </Route>
      <Route path="/admin/services/tasks">
        <AdminRoute title="Tasks / CS"><TasksCS /></AdminRoute>
      </Route>

      {/* Accounting Pages */}
      <Route path="/admin/accounting/client-invoices">
        <AdminRoute title="Client Invoices"><ClientInvoices /></AdminRoute>
      </Route>
      <Route path="/admin/accounting/agent-invoices">
        <AdminRoute title="Agent Invoices"><AgentInvoices /></AdminRoute>
      </Route>
      <Route path="/admin/accounting/partner-invoices">
        <AdminRoute title="Partner Invoices"><PartnerInvoices /></AdminRoute>
      </Route>
      <Route path="/admin/accounting/receipts">
        <AdminRoute title="Receipts"><Receipts /></AdminRoute>
      </Route>
      <Route path="/admin/accounting/transactions">
        <AdminRoute title="Transactions"><Transactions /></AdminRoute>
      </Route>
      <Route path="/admin/accounting/exchange-rates">
        <AdminRoute title="Exchange Rates"><ExchangeRates /></AdminRoute>
      </Route>

      {/* My Accounting */}
      <Route path="/admin/my-accounting/settlements">
        <AdminRoute title="My Settlements"><MySettlements /></AdminRoute>
      </Route>
      <Route path="/admin/my-accounting/invoices">
        <AdminRoute title="My Invoices"><MyInvoices /></AdminRoute>
      </Route>
      <Route path="/admin/my-accounting/revenue">
        <AdminRoute title="My Revenue"><MyRevenue /></AdminRoute>
      </Route>

      {/* Reports */}
      <Route path="/admin/reports">
        <AdminRoute title="Program Reports"><Reports /></AdminRoute>
      </Route>

      {/* Users */}
      <Route path="/admin/users">
        <AdminRoute title="Users"><Users /></AdminRoute>
      </Route>

      {/* Settings */}
      <Route path="/admin/settings/general">
        <AdminRoute title="General Settings"><GeneralSettings /></AdminRoute>
      </Route>
      <Route path="/admin/settings/page-access">
        <AdminRoute title="Page Access"><PageAccess /></AdminRoute>
      </Route>
      <Route path="/admin/settings/field-permissions">
        <AdminRoute title="Field Permissions"><FieldPermissions /></AdminRoute>
      </Route>
      <Route path="/admin/settings/doc-permissions">
        <AdminRoute title="Document Permissions"><DocPermissions /></AdminRoute>
      </Route>
      <Route path="/admin/settings/impersonation-logs">
        <AdminRoute title="Impersonation Logs"><ImpersonationLogs /></AdminRoute>
      </Route>

      {/* My Programs */}
      <Route path="/admin/my-programs">
        <AdminRoute title="My Programs"><MyPrograms /></AdminRoute>
      </Route>

      {/* Notifications */}
      <Route path="/admin/notifications">
        <AdminRoute title="Notifications"><Notifications /></AdminRoute>
      </Route>

      {/* Legacy redirects */}
      <Route path="/dashboard">
        <AdminRoute title="Dashboard"><Dashboard /></AdminRoute>
      </Route>
      <Route path="/users">
        <AdminRoute title="Users"><Users /></AdminRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ViewAsProvider>
            <AuthProvider>
              <Router />
              <Toaster />
            </AuthProvider>
          </ViewAsProvider>
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
