import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ViewAsProvider } from "@/hooks/use-view-as";
import { DisplayCurrencyProvider } from "@/context/DisplayCurrencyContext";
import "@/lib/i18n";

import Landing from "@/pages/landing";
import ApplyPage from "@/pages/public/ApplyPage";
import LeadInquiryPage from "@/pages/public/LeadInquiryPage";
import PublicFormGateway from "@/pages/public/PublicFormGateway";
import Login from "@/pages/login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/dashboard";
import DashboardCrmPage from "@/pages/admin/DashboardCrmPage";
import Users from "@/pages/users";
import Applications from "@/pages/admin/applications";
import AllApplications from "@/pages/admin/all-applications";
import CampApplications from "@/pages/admin/camp-applications";
import CampApplicationDetail from "@/pages/admin/camp-application-detail";
import PackageGroups from "@/pages/admin/package-groups";
import Packages from "@/pages/packages";
import PackageDetail from "@/pages/admin/package-detail";
import Leads from "@/pages/admin/leads";
import NotFound from "@/pages/not-found";

import PackageGroupDetail from "@/pages/admin/package-group-detail";
import NewPackageGroup from "@/pages/admin/new-package-group";
import ApplicationDetail from "@/pages/admin/application-detail";
import ApplicationForm from "@/pages/admin/application-form";
import AdminCampApplicationForm from "@/pages/admin/camp-application-form";
import PickupMgtDetail from "@/pages/admin/services/pickup-detail";
import TourMgtDetail from "@/pages/admin/services/tour-detail";
import SettlementMgtDetail from "@/pages/admin/services/settlement-detail";
import UserDetail from "@/pages/admin/user-detail";
import TeamsPage from "@/pages/admin/teams/TeamsPage";
import TeamDetailPage from "@/pages/admin/teams/TeamDetailPage";
import StaffKpiPage from "@/pages/kpi/StaffKpiPage";
import TeamKpiPage from "@/pages/kpi/TeamKpiPage";
import KpiTargetsPage from "@/pages/kpi/KpiTargetsPage";

import PickupManagement from "@/pages/admin/services/pickup";
import TourManagement from "@/pages/admin/services/tour";
import Settlement from "@/pages/admin/services/settlement";
import TasksCS from "@/pages/admin/services/tasks";

import ExchangeRates from "@/pages/admin/accounting/exchange-rates";
import Invoices from "@/pages/admin/accounting/invoices";
import Receipts from "@/pages/admin/accounting/receipts";
import ReceiptDetailPage from "@/pages/admin/accounting/ReceiptDetailPage";
import Transactions from "@/pages/admin/accounting/transactions";
import TransactionDetailPage from "@/pages/admin/accounting/TransactionDetailPage";

import MySettlements from "@/pages/admin/my-accounting/settlements";
import MyInvoices from "@/pages/admin/my-accounting/invoices";
import MyRevenue from "@/pages/admin/my-accounting/revenue";

import ReportsPage from "@/pages/admin/ReportsPage";
import ReportEditorPage from "@/pages/admin/ReportEditorPage";
import ReportViewerPage from "@/pages/admin/ReportViewerPage";

import DocumentsPage from "@/pages/admin/documents";
import ChatbotAdminPage from "@/pages/admin/ChatbotAdminPage";

import GeneralSettings from "@/pages/admin/settings/general";
import PageAccess from "@/pages/admin/settings/page-access";
import FieldPermissions from "@/pages/admin/settings/field-permissions";
import DocPermissions from "@/pages/admin/settings/doc-permissions";
import ImpersonationLogs from "@/pages/admin/settings/impersonation-logs";
import DataManager from "@/pages/admin/settings/data-manager";
import LookupValues from "@/pages/admin/settings/lookup-values";
import CompanyProfile from "@/pages/admin/settings/company-profile";
import Branding from "@/pages/admin/settings/branding";
import DomainAccess from "@/pages/admin/settings/domain-access";
import UsersTeams from "@/pages/admin/settings/users-teams";
import PlanBilling from "@/pages/admin/settings/plan-billing";

import SuperAdminLayout from "@/pages/admin/superadmin/SuperAdminLayout";
import SuperAdminDashboard from "@/pages/admin/superadmin/SuperAdminDashboard";
import TenantList from "@/pages/admin/superadmin/TenantList";
import TenantDetail from "@/pages/admin/superadmin/TenantDetail";
import PlatformPlans from "@/pages/admin/superadmin/PlatformPlans";
import StripeSettings from "@/pages/admin/superadmin/StripeSettings";
import PlatformCrm from "@/pages/admin/superadmin/PlatformCrm";
import PlatformCrmDetail from "@/pages/admin/superadmin/PlatformCrmDetail";
import SuperAdminGuard from "@/components/guards/SuperAdminGuard";

import Products from "@/pages/admin/products";
import ProductDetail from "@/pages/admin/product-detail";
import ProductGroups from "@/pages/admin/product-groups";
import ProductGroupDetail from "@/pages/admin/product-group-detail";
import ProductTypes from "@/pages/admin/product-types";
import ProductTypeDetail from "@/pages/admin/product-type-detail";
import PromotionsPage from "@/pages/admin/promotions";
import PromotionDetail from "@/pages/admin/promotion-detail";
import CommissionsPage from "@/pages/admin/commissions";
import CommissionDetail from "@/pages/admin/commission-detail";

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

import ChartOfAccountsPage from "@/pages/admin/accounting/ChartOfAccountsPage";
import CoaDetailPage from "@/pages/admin/accounting/CoaDetailPage";
import ArApTrackerPage from "@/pages/admin/accounting/ArApTrackerPage";
import PaymentsPage from "@/pages/admin/accounting/PaymentsPage";
import PaymentDetailPage from "@/pages/admin/accounting/PaymentDetailPage";
import JournalEntriesPage from "@/pages/admin/accounting/JournalEntriesPage";
import JournalEntryDetailPage from "@/pages/admin/accounting/JournalEntryDetailPage";
import TaxInvoiceListPage from "@/pages/admin/accounting/TaxInvoiceListPage";
import TaxInvoiceDetailPage from "@/pages/admin/accounting/TaxInvoiceDetailPage";
import InvoiceDetailPage from "@/pages/admin/accounting/InvoiceDetailPage";

import StudyAbroadPage from "@/pages/admin/services/StudyAbroadPage";
import StudyAbroadDetailPage from "@/pages/admin/services/StudyAbroadDetailPage";
import AccommodationPage from "@/pages/admin/services/AccommodationPage";
import AccommodationDetailPage from "@/pages/admin/services/AccommodationDetailPage";
import InternshipPage from "@/pages/admin/services/InternshipPage";
import InternshipDetailPage from "@/pages/admin/services/InternshipDetailPage";
import GuardianPage from "@/pages/admin/services/GuardianPage";
import GuardianDetailPage from "@/pages/admin/services/GuardianDetailPage";
import OtherServicePage from "@/pages/admin/services/OtherServicePage";
import OtherServiceDetailPage from "@/pages/admin/services/OtherServiceDetailPage";
import VisaServicePage from "@/pages/admin/services/VisaServicePage";
import VisaServiceDetailPage from "@/pages/admin/services/VisaServiceDetailPage";

import MyPrograms from "@/pages/admin/my-programs";
import EnrollmentSpots from "@/pages/admin/enrollment-spots";
import Notifications from "@/pages/admin/notifications";

import ApplicationFormList from "@/pages/admin/application-forms/list";
import ApplicationFormEdit from "@/pages/admin/application-forms/edit";
import ApplicationFormPartners from "@/pages/admin/application-forms/partners";

import { MainLayout } from "@/components/layout/main-layout";
import { useTenantTheme, TenantThemeContext } from "@/hooks/use-tenant-theme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AdminRoute({ children, title }: { children: React.ReactNode; title?: string }) {
  return <MainLayout title={title}>{children}</MainLayout>;
}

function Router() {
  const { theme } = useTenantTheme();

  return (
    <TenantThemeContext.Provider value={theme}>
      <Switch>
        {/* Public landing page */}
        <Route path="/" component={Landing} />

        {/* Auth routes — must be before /:slug catch-all */}
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />

        {/* Public form routes */}
        <Route path="/apply" component={ApplyPage} />
        <Route path="/inquiry/:slug" component={LeadInquiryPage} />

        {/* Admin redirect */}
        <Route path="/admin"><Redirect to="/admin/dashboard" /></Route>

        {/* Legacy redirects */}
        <Route path="/admin/contracts/:id">{(params) => <Redirect to={`/admin/crm/contracts/${params.id}`} />}</Route>
        <Route path="/admin/contracts"><Redirect to="/admin/crm/contracts" /></Route>

        {/* Dashboard */}
        <Route path="/admin/dashboard">
          <AdminRoute title="Dashboard"><Dashboard /></AdminRoute>
        </Route>
        <Route path="/admin/dashboard/crm">
          <AdminRoute title="CRM Dashboard"><DashboardCrmPage /></AdminRoute>
        </Route>

        {/* Package Groups */}
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

        {/* Products */}
        <Route path="/admin/products/:id">
          <AdminRoute title="Product Detail"><ProductDetail /></AdminRoute>
        </Route>
        <Route path="/admin/products">
          <AdminRoute title="Products"><Products /></AdminRoute>
        </Route>
        <Route path="/admin/enrollment-spots">
          <AdminRoute title="Enrollment Spots"><EnrollmentSpots /></AdminRoute>
        </Route>
        <Route path="/admin/product-groups/:id">
          <AdminRoute title="Product Group Detail"><ProductGroupDetail /></AdminRoute>
        </Route>
        <Route path="/admin/product-groups">
          <AdminRoute title="Product Groups"><ProductGroups /></AdminRoute>
        </Route>
        <Route path="/admin/product-types/:id">
          <AdminRoute title="Product Type Detail"><ProductTypeDetail /></AdminRoute>
        </Route>
        <Route path="/admin/product-types">
          <AdminRoute title="Product Types"><ProductTypes /></AdminRoute>
        </Route>
        <Route path="/admin/promotions/:id">
          <AdminRoute title="Promotion Detail"><PromotionDetail /></AdminRoute>
        </Route>
        <Route path="/admin/promotions">
          <AdminRoute title="Promotions"><PromotionsPage /></AdminRoute>
        </Route>
        <Route path="/admin/commissions/:id">
          <AdminRoute title="Commission Detail"><CommissionDetail /></AdminRoute>
        </Route>
        <Route path="/admin/commissions">
          <AdminRoute title="Commissions"><CommissionsPage /></AdminRoute>
        </Route>

        {/* Leads & Applications */}
        <Route path="/admin/leads">
          <AdminRoute title="Leads"><Leads /></AdminRoute>
        </Route>
        <Route path="/admin/all-applications">
          <AdminRoute title="All Applications"><AllApplications /></AdminRoute>
        </Route>
        <Route path="/admin/applications/new">
          <AdminRoute title="New Application"><ApplicationForm /></AdminRoute>
        </Route>
        <Route path="/admin/camp-applications/new">
          <AdminRoute title="New Camp Application"><AdminCampApplicationForm /></AdminRoute>
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

        {/* Service Pages */}
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
        <Route path="/admin/services/settlement/:id">
          <AdminRoute title="Settlement Detail"><SettlementMgtDetail /></AdminRoute>
        </Route>
        <Route path="/admin/services/settlement">
          <AdminRoute title="Settlement"><Settlement /></AdminRoute>
        </Route>
        <Route path="/admin/services/tasks">
          <AdminRoute title="Tasks / CS"><TasksCS /></AdminRoute>
        </Route>
        <Route path="/admin/services/study-abroad/:id">
          <AdminRoute title="Study Abroad Detail"><StudyAbroadDetailPage /></AdminRoute>
        </Route>
        <Route path="/admin/services/study-abroad">
          <AdminRoute title="Study Abroad"><StudyAbroadPage /></AdminRoute>
        </Route>
        <Route path="/admin/services/accommodation/:id">
          <AdminRoute title="Accommodation Detail"><AccommodationDetailPage /></AdminRoute>
        </Route>
        <Route path="/admin/services/accommodation">
          <AdminRoute title="Accommodation"><AccommodationPage /></AdminRoute>
        </Route>
        <Route path="/admin/services/internship/:id">
          <AdminRoute title="Internship Detail"><InternshipDetailPage /></AdminRoute>
        </Route>
        <Route path="/admin/services/internship">
          <AdminRoute title="Internship"><InternshipPage /></AdminRoute>
        </Route>
        <Route path="/admin/services/guardian/:id">
          <AdminRoute title="Guardian Detail"><GuardianDetailPage /></AdminRoute>
        </Route>
        <Route path="/admin/services/guardian">
          <AdminRoute title="Guardian"><GuardianPage /></AdminRoute>
        </Route>
        <Route path="/admin/services/other/:id">
          <AdminRoute title="Other Service Detail"><OtherServiceDetailPage /></AdminRoute>
        </Route>
        <Route path="/admin/services/other">
          <AdminRoute title="Other Services"><OtherServicePage /></AdminRoute>
        </Route>
        <Route path="/admin/services/visa/:id">
          <AdminRoute title="Visa Service Detail"><VisaServiceDetailPage /></AdminRoute>
        </Route>
        <Route path="/admin/services/visa">
          <AdminRoute title="Visa Services"><VisaServicePage /></AdminRoute>
        </Route>

        {/* CRM Pages */}
        <Route path="/admin/crm/contacts/:id">
          <AdminRoute title="Contact Detail"><ContactDetailPage /></AdminRoute>
        </Route>
        <Route path="/admin/crm/contacts">
          <AdminRoute title="Contacts"><ContactsPage /></AdminRoute>
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
        <Route path="/admin/crm/leads/:id">
          <AdminRoute title="Lead Detail"><LeadDetailPage /></AdminRoute>
        </Route>
        <Route path="/admin/crm/leads">
          <AdminRoute title="CRM Leads"><CrmLeadsPage /></AdminRoute>
        </Route>
        <Route path="/admin/crm/quotes/new">
          <AdminRoute title="New Quote"><QuoteBuilderPage /></AdminRoute>
        </Route>
        <Route path="/admin/crm/quotes/:id">
          <AdminRoute title="Quote Builder"><QuoteBuilderPage /></AdminRoute>
        </Route>
        <Route path="/admin/crm/quotes">
          <AdminRoute title="Quotes"><QuotesPage /></AdminRoute>
        </Route>
        <Route path="/admin/crm/contracts/:id">
          <AdminRoute title="Contract Detail"><ContractDetailPage /></AdminRoute>
        </Route>
        <Route path="/admin/crm/contracts">
          <AdminRoute title="Contracts"><ContractListPage /></AdminRoute>
        </Route>

        {/* Accounting Pages */}
        <Route path="/admin/accounting/invoices/:id">
          <AdminRoute title="Invoice Detail"><InvoiceDetailPage /></AdminRoute>
        </Route>
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
        <Route path="/admin/accounting/receipts/:id">
          <AdminRoute title="Receipt Detail"><ReceiptDetailPage /></AdminRoute>
        </Route>
        <Route path="/admin/accounting/receipts">
          <AdminRoute title="Receipts"><Receipts /></AdminRoute>
        </Route>
        <Route path="/admin/accounting/transactions/:id">
          <AdminRoute title="Transaction Detail"><TransactionDetailPage /></AdminRoute>
        </Route>
        <Route path="/admin/accounting/transactions">
          <AdminRoute title="Transactions"><Transactions /></AdminRoute>
        </Route>
        <Route path="/admin/accounting/exchange-rates">
          <AdminRoute title="Exchange Rates"><ExchangeRates /></AdminRoute>
        </Route>
        <Route path="/admin/accounting/coa/:code">
          <AdminRoute title="Account Detail"><CoaDetailPage /></AdminRoute>
        </Route>
        <Route path="/admin/accounting/coa">
          <AdminRoute title="Chart of Accounts"><ChartOfAccountsPage /></AdminRoute>
        </Route>
        <Route path="/admin/accounting/ar-ap">
          <AdminRoute title="AR / AP Tracker"><ArApTrackerPage /></AdminRoute>
        </Route>
        <Route path="/admin/accounting/payments/:id">
          <AdminRoute title="Payment Detail"><PaymentDetailPage /></AdminRoute>
        </Route>
        <Route path="/admin/accounting/payments">
          <AdminRoute title="Payments"><PaymentsPage /></AdminRoute>
        </Route>
        <Route path="/admin/accounting/journal/:id">
          <AdminRoute title="Journal Entry"><JournalEntryDetailPage /></AdminRoute>
        </Route>
        <Route path="/admin/accounting/journal">
          <AdminRoute title="Journal Entries"><JournalEntriesPage /></AdminRoute>
        </Route>
        <Route path="/admin/accounting/tax-invoices/:id">
          <AdminRoute title="Tax Invoice Detail"><TaxInvoiceDetailPage /></AdminRoute>
        </Route>
        <Route path="/admin/accounting/tax-invoices">
          <AdminRoute title="Tax Invoices"><TaxInvoiceListPage /></AdminRoute>
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
          <AdminRoute title="AI Chatbot"><ChatbotAdminPage /></AdminRoute>
        </Route>

        {/* Users */}
        <Route path="/admin/users/:id">
          <AdminRoute title="User Detail"><UserDetail /></AdminRoute>
        </Route>
        <Route path="/admin/users">
          <AdminRoute title="Users"><Users /></AdminRoute>
        </Route>

        {/* Teams */}
        <Route path="/admin/teams/:id">
          <AdminRoute title="Team Detail"><TeamDetailPage /></AdminRoute>
        </Route>
        <Route path="/admin/teams">
          <AdminRoute title="Teams"><TeamsPage /></AdminRoute>
        </Route>

        {/* KPI */}
        <Route path="/admin/kpi/staff">
          <AdminRoute title="Staff KPI"><StaffKpiPage /></AdminRoute>
        </Route>
        <Route path="/admin/kpi/team">
          <AdminRoute title="Team KPI"><TeamKpiPage /></AdminRoute>
        </Route>
        <Route path="/admin/kpi/targets">
          <AdminRoute title="KPI Targets"><KpiTargetsPage /></AdminRoute>
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
        <Route path="/admin/settings/lookup-values">
          <AdminRoute title="Lookup Values"><LookupValues /></AdminRoute>
        </Route>
        <Route path="/admin/settings/company">
          <AdminRoute title="Company Profile"><CompanyProfile /></AdminRoute>
        </Route>
        <Route path="/admin/settings/branding">
          <AdminRoute title="Branding"><Branding /></AdminRoute>
        </Route>
        <Route path="/admin/settings/domain">
          <AdminRoute title="Domain & Access"><DomainAccess /></AdminRoute>
        </Route>
        <Route path="/admin/settings/users-teams">
          <AdminRoute title="Users & Teams"><UsersTeams /></AdminRoute>
        </Route>
        <Route path="/admin/settings/plan">
          <AdminRoute title="Plan & Billing"><PlanBilling /></AdminRoute>
        </Route>

        {/* Super Admin */}
        <Route path="/superadmin/tenants/:id">
          {() => (
            <SuperAdminGuard>
              <SuperAdminLayout><TenantDetail /></SuperAdminLayout>
            </SuperAdminGuard>
          )}
        </Route>
        <Route path="/superadmin/tenants">
          <SuperAdminGuard>
            <SuperAdminLayout><TenantList /></SuperAdminLayout>
          </SuperAdminGuard>
        </Route>
        <Route path="/superadmin/plans">
          <SuperAdminGuard>
            <SuperAdminLayout><PlatformPlans /></SuperAdminLayout>
          </SuperAdminGuard>
        </Route>
        <Route path="/superadmin/stripe-settings">
          <SuperAdminGuard>
            <SuperAdminLayout><StripeSettings /></SuperAdminLayout>
          </SuperAdminGuard>
        </Route>
        <Route path="/superadmin/crm/:id">
          {() => (
            <SuperAdminGuard>
              <PlatformCrmDetail />
            </SuperAdminGuard>
          )}
        </Route>
        <Route path="/superadmin/crm">
          <SuperAdminGuard>
            <PlatformCrm />
          </SuperAdminGuard>
        </Route>
        <Route path="/superadmin">
          <SuperAdminGuard>
            <SuperAdminLayout><SuperAdminDashboard /></SuperAdminLayout>
          </SuperAdminGuard>
        </Route>

        {/* My Programs */}
        <Route path="/admin/my-programs">
          <AdminRoute title="My Programs"><MyPrograms /></AdminRoute>
        </Route>

        {/* Notifications */}
        <Route path="/admin/notifications">
          <AdminRoute title="Notifications"><Notifications /></AdminRoute>
        </Route>

        {/* Application Form Management */}
        <Route path="/admin/application-forms/new">
          <AdminRoute title="New Application Form"><ApplicationFormEdit /></AdminRoute>
        </Route>
        <Route path="/admin/application-forms/:id/edit">
          <AdminRoute title="Edit Application Form"><ApplicationFormEdit /></AdminRoute>
        </Route>
        <Route path="/admin/application-forms/:id/partners">
          <AdminRoute title="Partner Links"><ApplicationFormPartners /></AdminRoute>
        </Route>
        <Route path="/admin/application-forms">
          <AdminRoute title="Application Forms"><ApplicationFormList /></AdminRoute>
        </Route>

        {/* Legacy routes */}
        <Route path="/dashboard">
          <AdminRoute title="Dashboard"><Dashboard /></AdminRoute>
        </Route>
        <Route path="/users">
          <AdminRoute title="Users"><Users /></AdminRoute>
        </Route>

        {/* Public form gateway — /:slug must be last before NotFound */}
        <Route path="/:slug" component={PublicFormGateway} />

        <Route component={NotFound} />
      </Switch>
    </TenantThemeContext.Provider>
  );
}

function ImpersonationInit() {
  useEffect(() => {
    // 구형 공유 키 정리 (앱별 전용 키로 마이그레이션)
    sessionStorage.removeItem("edubee_impersonate_org_id");
    sessionStorage.removeItem("edubee_impersonate_org_name");
    const params = new URLSearchParams(window.location.search);
    const orgId = params.get("impersonateOrg");
    const orgName = params.get("impersonateOrgName");
    if (orgId) {
      sessionStorage.setItem("camp_impersonate_org_id", orgId);
      if (orgName) sessionStorage.setItem("camp_impersonate_org_name", decodeURIComponent(orgName));
      params.delete("impersonateOrg");
      params.delete("impersonateOrgName");
      const clean = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (clean ? `?${clean}` : ""));
    }
  }, []);
  return null;
}

function App() {
  return (
    <DisplayCurrencyProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <ImpersonationInit />
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
