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
      <Route path="/admin/leads">
        <AdminRoute title="Leads"><Leads /></AdminRoute>
      </Route>
      <Route path="/admin/applications">
        <AdminRoute title="Applications"><Applications /></AdminRoute>
      </Route>
      <Route path="/admin/contracts">
        <AdminRoute title="Contracts"><Contracts /></AdminRoute>
      </Route>

      <Route path="/admin/services/institute">
        <AdminRoute title="Institute Management"><AdminStub title="Institute Management" icon="🎓" /></AdminRoute>
      </Route>
      <Route path="/admin/services/hotel">
        <AdminRoute title="Hotel Management"><AdminStub title="Hotel Management" icon="🏨" /></AdminRoute>
      </Route>
      <Route path="/admin/services/pickup">
        <AdminRoute title="Pickup Management"><AdminStub title="Pickup Management" icon="🚗" /></AdminRoute>
      </Route>
      <Route path="/admin/services/tour">
        <AdminRoute title="Tour Management"><AdminStub title="Tour Management" icon="🗺️" /></AdminRoute>
      </Route>
      <Route path="/admin/services/interviews">
        <AdminRoute title="Interviews"><AdminStub title="Interviews" icon="🗓️" /></AdminRoute>
      </Route>
      <Route path="/admin/services/settlement">
        <AdminRoute title="Settlement"><AdminStub title="Settlement" icon="💵" /></AdminRoute>
      </Route>

      <Route path="/admin/accounting/client-invoices">
        <AdminRoute title="Client Invoices"><AdminStub title="Client Invoices" icon="💰" /></AdminRoute>
      </Route>
      <Route path="/admin/accounting/agent-invoices">
        <AdminRoute title="Agent Invoices"><AdminStub title="Agent Invoices" icon="🏢" /></AdminRoute>
      </Route>
      <Route path="/admin/accounting/partner-invoices">
        <AdminRoute title="Partner Invoices"><AdminStub title="Partner Invoices" icon="🤝" /></AdminRoute>
      </Route>
      <Route path="/admin/accounting/receipts">
        <AdminRoute title="Receipts"><AdminStub title="Receipts" icon="🧾" /></AdminRoute>
      </Route>
      <Route path="/admin/accounting/transactions">
        <AdminRoute title="Transactions"><AdminStub title="Transactions" icon="🏦" /></AdminRoute>
      </Route>
      <Route path="/admin/accounting/exchange-rates">
        <AdminRoute title="Exchange Rates"><AdminStub title="Exchange Rates" icon="💱" /></AdminRoute>
      </Route>

      <Route path="/admin/my-accounting/settlements">
        <AdminRoute title="My Settlements"><AdminStub title="My Settlements" icon="💵" /></AdminRoute>
      </Route>
      <Route path="/admin/my-accounting/invoices">
        <AdminRoute title="My Invoices"><AdminStub title="My Invoices" icon="🧾" /></AdminRoute>
      </Route>
      <Route path="/admin/my-accounting/revenue">
        <AdminRoute title="My Revenue"><AdminStub title="My Revenue" icon="💰" /></AdminRoute>
      </Route>

      <Route path="/admin/reports">
        <AdminRoute title="Program Reports"><AdminStub title="Program Reports" icon="📊" /></AdminRoute>
      </Route>

      <Route path="/admin/users">
        <AdminRoute title="Users"><Users /></AdminRoute>
      </Route>

      <Route path="/admin/settings/general">
        <AdminRoute title="General Settings"><AdminStub title="General Settings" icon="⚙️" /></AdminRoute>
      </Route>
      <Route path="/admin/settings/page-access">
        <AdminRoute title="Page Access"><AdminStub title="Page Access" icon="🔐" /></AdminRoute>
      </Route>
      <Route path="/admin/settings/field-permissions">
        <AdminRoute title="Field Permissions"><AdminStub title="Field Permissions" icon="🗂️" /></AdminRoute>
      </Route>
      <Route path="/admin/settings/doc-permissions">
        <AdminRoute title="Document Permissions"><AdminStub title="Document Permissions" icon="📄" /></AdminRoute>
      </Route>
      <Route path="/admin/settings/impersonation-logs">
        <AdminRoute title="Impersonation Logs"><AdminStub title="Impersonation Logs" icon="🕵️" /></AdminRoute>
      </Route>

      <Route path="/admin/my-programs">
        <AdminRoute title="My Programs"><AdminStub title="My Programs" icon="🎓" /></AdminRoute>
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
