import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ViewAsProvider } from "@/hooks/use-view-as";
import { DisplayCurrencyProvider } from "@/context/DisplayCurrencyContext";
import "@/lib/i18n";

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import DashboardCrmPage from "@/pages/admin/DashboardCrmPage";
import Users from "@/pages/users";
import Applications from "@/pages/admin/applications";
import CampApplications from "@/pages/admin/camp-applications";
import CampApplicationDetail from "@/pages/admin/camp-application-detail";
import PackageGroups from "@/pages/admin/package-groups";
import Packages from "@/pages/packages";
import PackageDetail from "@/pages/admin/package-detail";
import Leads from "@/pages/admin/leads";
import Contracts from "@/pages/admin/contracts";
import CampContracts from "@/pages/admin/camp-contracts";
import CampContractDetail from "@/pages/admin/camp-contract-detail";
import AdminStub from "@/pages/admin/stub";
import NotFound from "@/pages/not-found";

// Detail Pages
import PackageGroupDetail from "@/pages/admin/package-group-detail";
import NewPackageGroup from "@/pages/admin/new-package-group";
import ApplicationDetail from "@/pages/admin/application-detail";
import ApplicationForm from "@/pages/admin/application-form";
import ContractDetail from "@/pages/admin/contract-detail";
import InstituteMgtDetail from "@/pages/admin/services/institute-detail";
import HotelMgtDetail from "@/pages/admin/services/hotel-detail";
import PickupMgtDetail from "@/pages/admin/services/pickup-detail";
import TourMgtDetail from "@/pages/admin/services/tour-detail";
import SettlementMgtDetail from "@/pages/admin/services/settlement-detail";
import UserDetail from "@/pages/admin/user-detail";

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
import Invoices from "@/pages/admin/accounting/invoices";
import Receipts from "@/pages/admin/accounting/receipts";
import Transactions from "@/pages/admin/accounting/transactions";

// My Accounting
import MySettlements from "@/pages/admin/my-accounting/settlements";
import MyInvoices from "@/pages/admin/my-accounting/invoices";
import MyRevenue from "@/pages/admin/my-accounting/revenue";

// Reports
import Reports from "@/pages/admin/reports";
import ReportsPage from "@/pages/admin/ReportsPage";
import ReportEditorPage from "@/pages/admin/ReportEditorPage";
import ReportViewerPage from "@/pages/admin/ReportViewerPage";

// Documents
import DocumentsPage from "@/pages/admin/documents";
import ChatbotAdminPage from "@/pages/admin/ChatbotAdminPage";

// Settings
import GeneralSettings from "@/pages/admin/settings/general";
import PageAccess from "@/pages/admin/settings/page-access";
import FieldPermissions from "@/pages/admin/settings/field-permissions";
import DocPermissions from "@/pages/admin/settings/doc-permissions";
import ImpersonationLogs from "@/pages/admin/settings/impersonation-logs";
import DataManager from "@/pages/admin/settings/data-manager";
import Products from "@/pages/admin/products";
import ProductDetail from "@/pages/admin/product-detail";
import ProductGroups from "@/pages/admin/product-groups";
import ProductGroupDetail from "@/pages/admin/product-group-detail";
import ProductTypes from "@/pages/admin/product-types";
import ProductTypeDetail from "@/pages/admin/product-type-detail";
import PromotionsPage from "@/pages/admin/promotions";
import CommissionsPage from "@/pages/admin/commissions";

// CRM
import ContactsPage from "@/pages/admin/crm/ContactsPage";
import ContactDetailPage from "@/pages/admin/crm/ContactDetailPage";
import AccountsPage from "@/pages/admin/crm/AccountsPage";
import AccountDetailPage from "@/pages/admin/crm/AccountDetailPage";
import CrmLeadsPage from "@/pages/admin/crm/LeadsPage";
import LeadDetailPage from "@/pages/admin/crm/LeadDetailPage";
import QuotesPage from "@/pages/admin/crm/QuotesPage";
import QuoteBuilderPage from "@/pages/admin/crm/QuoteBuilderPage";
import ContractListPage from "@/pages/admin/crm/ContractListPage";
import ContractDetailPage from "@/pages/admin/crm/ContractDetailPage";

// Accounting (new)
import ChartOfAccountsPage from "@/pages/admin/accounting/ChartOfAccountsPage";
import ArApTrackerPage from "@/pages/admin/accounting/ArApTrackerPage";
import PaymentsPage from "@/pages/admin/accounting/PaymentsPage";
import JournalEntriesPage from "@/pages/admin/accounting/JournalEntriesPage";

// Services (new)
import StudyAbroadPage from "@/pages/admin/services/StudyAbroadPage";
import StudyAbroadDetailPage from "@/pages/admin/services/StudyAbroadDetailPage";
import AccommodationPage from "@/pages/admin/services/AccommodationPage";
import AccommodationDetailPage from "@/pages/admin/services/AccommodationDetailPage";
import InternshipPage from "@/pages/admin/services/InternshipPage";
import InternshipDetailPage from "@/pages/admin/services/InternshipDetailPage";
import GuardianPage from "@/pages/admin/services/GuardianPage";
import GuardianDetailPage from "@/pages/admin/services/GuardianDetailPage";

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
      <Route path="/admin/dashboard/crm">
        <AdminRoute title="CRM Dashboard"><DashboardCrmPage /></AdminRoute>
      </Route>
      <Route path="/admin/package-groups/new">
        <AdminRoute title="New Package Group"><NewPackageGroup /></AdminRoute>
      </Route>
      <Route path="/admin/package-groups/:id">
        <AdminRoute title="Package Group Detail"><PackageGroupDetail /></AdminRoute>
      </Route>
      <Route path="/admin/package-groups">
        <AdminRoute title="Package Groups"><PackageGroups /></AdminRoute>
      </Route>
      <Route path="/admin/packages/:id">
        <AdminRoute title="Package Detail"><PackageDetail /></AdminRoute>
      </Route>
      <Route path="/admin/packages">
        <AdminRoute title="Packages"><Packages /></AdminRoute>
      </Route>
      <Route path="/admin/products/:id">
        <AdminRoute title="Product Detail"><ProductDetail /></AdminRoute>
      </Route>
      <Route path="/admin/products">
        <AdminRoute title="Products"><Products /></AdminRoute>
      </Route>
      <Route path="/admin/enrollment-spots">
        <AdminRoute title="Enrollment Spots"><EnrollmentSpots /></AdminRoute>
      </Route>
      <Route path="/admin/leads">
        <AdminRoute title="Leads"><Leads /></AdminRoute>
      </Route>
      <Route path="/admin/applications/new">
        <AdminRoute title="New Application"><ApplicationForm /></AdminRoute>
      </Route>
      <Route path="/admin/applications/:id">
        <AdminRoute title="Application Detail"><ApplicationDetail /></AdminRoute>
      </Route>
      <Route path="/admin/applications">
        <AdminRoute title="Applications"><Applications /></AdminRoute>
      </Route>
      <Route path="/admin/camp-applications/:id">
        <AdminRoute title="Camp Application Detail"><CampApplicationDetail /></AdminRoute>
      </Route>
      <Route path="/admin/camp-applications">
        <AdminRoute title="Camp Applications"><CampApplications /></AdminRoute>
      </Route>
      <Route path="/admin/contracts/:id">
        <AdminRoute title="Contract Detail"><ContractDetail /></AdminRoute>
      </Route>
      <Route path="/admin/contracts">
        <AdminRoute title="Contracts"><Contracts /></AdminRoute>
      </Route>
      <Route path="/admin/camp-contracts/:id">
        <AdminRoute title="Camp Contract Detail"><CampContractDetail /></AdminRoute>
      </Route>
      <Route path="/admin/camp-contracts">
        <AdminRoute title="Camp Contract"><CampContracts /></AdminRoute>
      </Route>
      <Route path="/admin/product-groups/:id">
        <AdminRoute title="Product Group Detail"><ProductGroupDetail /></AdminRoute>
      </Route>
      <Route path="/admin/product-groups">
        <AdminRoute title="Products Group"><ProductGroups /></AdminRoute>
      </Route>
      <Route path="/admin/product-types/:id">
        <AdminRoute title="Product Type Detail"><ProductTypeDetail /></AdminRoute>
      </Route>
      <Route path="/admin/product-types">
        <AdminRoute title="Products Type"><ProductTypes /></AdminRoute>
      </Route>
      <Route path="/admin/promotions">
        <AdminRoute title="Promotions"><PromotionsPage /></AdminRoute>
      </Route>
      <Route path="/admin/commissions">
        <AdminRoute title="Commissions"><CommissionsPage /></AdminRoute>
      </Route>

      {/* Service Pages */}
      <Route path="/admin/services/institute/:id">
        <AdminRoute title="Institute Detail"><InstituteMgtDetail /></AdminRoute>
      </Route>
      <Route path="/admin/services/institute">
        <AdminRoute title="Institute Management"><InstituteManagement /></AdminRoute>
      </Route>
      <Route path="/admin/services/hotel/:id">
        <AdminRoute title="Hotel Detail"><HotelMgtDetail /></AdminRoute>
      </Route>
      <Route path="/admin/services/hotel">
        <AdminRoute title="Hotel Management"><HotelManagement /></AdminRoute>
      </Route>
      <Route path="/admin/services/pickup/:id">
        <AdminRoute title="Pickup Detail"><PickupMgtDetail /></AdminRoute>
      </Route>
      <Route path="/admin/services/pickup">
        <AdminRoute title="Pickup Management"><PickupManagement /></AdminRoute>
      </Route>
      <Route path="/admin/services/tour/:id">
        <AdminRoute title="Tour Detail"><TourMgtDetail /></AdminRoute>
      </Route>
      <Route path="/admin/services/tour">
        <AdminRoute title="Tour Management"><TourManagement /></AdminRoute>
      </Route>
      <Route path="/admin/services/interviews">
        <AdminRoute title="Interviews"><Interviews /></AdminRoute>
      </Route>
      <Route path="/admin/services/settlement/:id">
        <AdminRoute title="Settlement Detail"><SettlementMgtDetail /></AdminRoute>
      </Route>
      <Route path="/admin/services/settlement">
        <AdminRoute title="Settlement"><Settlement /></AdminRoute>
      </Route>
      <Route path="/admin/services/tasks">
        <AdminRoute title="Tasks / CS"><TasksCS /></AdminRoute>
      </Route>
      <Route path="/admin/services/study-abroad">
        <AdminRoute title="Study Abroad"><StudyAbroadPage /></AdminRoute>
      </Route>
      <Route path="/admin/services/study-abroad/:id">
        <AdminRoute title="Study Abroad Detail"><StudyAbroadDetailPage /></AdminRoute>
      </Route>
      <Route path="/admin/services/accommodation">
        <AdminRoute title="Accommodation"><AccommodationPage /></AdminRoute>
      </Route>
      <Route path="/admin/services/accommodation/:id">
        <AdminRoute title="Accommodation Detail"><AccommodationDetailPage /></AdminRoute>
      </Route>
      <Route path="/admin/services/internship">
        <AdminRoute title="Internship"><InternshipPage /></AdminRoute>
      </Route>
      <Route path="/admin/services/internship/:id">
        <AdminRoute title="Internship Detail"><InternshipDetailPage /></AdminRoute>
      </Route>
      <Route path="/admin/services/guardian">
        <AdminRoute title="Guardian"><GuardianPage /></AdminRoute>
      </Route>
      <Route path="/admin/services/guardian/:id">
        <AdminRoute title="Guardian Detail"><GuardianDetailPage /></AdminRoute>
      </Route>

      {/* CRM Pages */}
      <Route path="/admin/crm/contacts">
        <AdminRoute title="Contacts"><ContactsPage /></AdminRoute>
      </Route>
      <Route path="/admin/crm/contacts/:id">
        <AdminRoute title="Contact Detail"><ContactDetailPage /></AdminRoute>
      </Route>
      <Route path="/admin/crm/accounts/new">
        <AdminRoute title="New Account"><AccountDetailPage /></AdminRoute>
      </Route>
      <Route path="/admin/crm/accounts/:id">
        <AdminRoute title="Account Detail"><AccountDetailPage /></AdminRoute>
      </Route>
      <Route path="/admin/crm/accounts">
        <AdminRoute title="Accounts"><AccountsPage /></AdminRoute>
      </Route>
      <Route path="/admin/crm/leads">
        <AdminRoute title="CRM Leads"><CrmLeadsPage /></AdminRoute>
      </Route>
      <Route path="/admin/crm/leads/:id">
        <AdminRoute title="Lead Detail"><LeadDetailPage /></AdminRoute>
      </Route>
      <Route path="/admin/crm/quotes">
        <AdminRoute title="Quotes"><QuotesPage /></AdminRoute>
      </Route>
      <Route path="/admin/crm/quotes/new">
        <AdminRoute title="New Quote"><QuoteBuilderPage /></AdminRoute>
      </Route>
      <Route path="/admin/crm/quotes/:id">
        <AdminRoute title="Quote Builder"><QuoteBuilderPage /></AdminRoute>
      </Route>
      <Route path="/admin/crm/contracts/:id">
        <AdminRoute title="Contract Detail"><ContractDetailPage /></AdminRoute>
      </Route>
      <Route path="/admin/crm/contracts">
        <AdminRoute title="Contracts"><ContractListPage /></AdminRoute>
      </Route>

      {/* Accounting Pages */}
      <Route path="/admin/accounting/invoices">
        <AdminRoute title="Invoices"><Invoices /></AdminRoute>
      </Route>
      <Route path="/admin/accounting/client-invoices">
        <AdminRoute title="Invoices"><Invoices /></AdminRoute>
      </Route>
      <Route path="/admin/accounting/agent-invoices">
        <AdminRoute title="Invoices"><Invoices /></AdminRoute>
      </Route>
      <Route path="/admin/accounting/partner-invoices">
        <AdminRoute title="Invoices"><Invoices /></AdminRoute>
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
      <Route path="/admin/accounting/coa">
        <AdminRoute title="Chart of Accounts"><ChartOfAccountsPage /></AdminRoute>
      </Route>
      <Route path="/admin/accounting/ar-ap">
        <AdminRoute title="AR / AP Tracker"><ArApTrackerPage /></AdminRoute>
      </Route>
      <Route path="/admin/accounting/payments">
        <AdminRoute title="Payments"><PaymentsPage /></AdminRoute>
      </Route>
      <Route path="/admin/accounting/journal">
        <AdminRoute title="Journal Entries"><JournalEntriesPage /></AdminRoute>
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
      <Route path="/admin/reports/:id/edit">
        <AdminRoute title="Edit Report"><ReportEditorPage /></AdminRoute>
      </Route>
      <Route path="/admin/reports/:id">
        <AdminRoute title="View Report"><ReportViewerPage /></AdminRoute>
      </Route>
      <Route path="/admin/reports">
        <AdminRoute title="Program Reports"><ReportsPage /></AdminRoute>
      </Route>

      {/* Documents */}
      <Route path="/admin/documents">
        <AdminRoute title="Documents"><DocumentsPage /></AdminRoute>
      </Route>

      {/* AI Chatbot */}
      <Route path="/admin/chatbot">
        <AdminRoute title="AI 챗봇"><ChatbotAdminPage /></AdminRoute>
      </Route>

      {/* Users */}
      <Route path="/admin/users/:id">
        <AdminRoute title="User Detail"><UserDetail /></AdminRoute>
      </Route>
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
      <Route path="/admin/settings/data-manager">
        <AdminRoute title="Data Manager"><DataManager /></AdminRoute>
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
    <DisplayCurrencyProvider>
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
    </DisplayCurrencyProvider>
  );
}

export default App;
