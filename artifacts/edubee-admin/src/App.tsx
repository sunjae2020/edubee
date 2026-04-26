import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { lazy, Suspense, useEffect, Component, type ErrorInfo, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ViewAsProvider, useViewAs } from "@/hooks/use-view-as";
import { DisplayCurrencyProvider } from "@/context/DisplayCurrencyContext";
import "@/lib/i18n";
import axios from "axios";

// ── Static imports — always needed immediately ─────────────────────────────
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import { MainLayout } from "@/components/layout/main-layout";
import SuperAdminGuard from "@/components/guards/SuperAdminGuard";
import { useTenantTheme, TenantThemeContext, DEFAULT_THEME, applyThemeToDom } from "@/hooks/use-tenant-theme";

// ── Error Boundary — prevents white screen on render crash ────────────────
class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "Inter, sans-serif" }}>
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <p style={{ fontSize: 32, marginBottom: 16 }}>⚠️</p>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#1C1917" }}>Something went wrong</h2>
            <p style={{ fontSize: 13, color: "#78716C", marginBottom: 20 }}>{this.state.error.message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              style={{ padding: "8px 20px", background: "#F5821F", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Page loading spinner ───────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{
        width: 36, height: 36,
        border: "3px solid var(--e-orange-lt, #fef0e3)",
        borderTopColor: "var(--e-orange, #F5821F)",
        borderRadius: "50%",
        animation: "edubee-spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes edubee-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Lazy-loaded pages ──────────────────────────────────────────────────────
// Public / Auth
const Register            = lazy(() => import("@/pages/Register"));
const ForgotPassword      = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword       = lazy(() => import("@/pages/ResetPassword"));
const AcceptInvite        = lazy(() => import("@/pages/AcceptInvite"));
const ApplyPage           = lazy(() => import("@/pages/public/ApplyPage"));
const LeadInquiryPage     = lazy(() => import("@/pages/public/LeadInquiryPage"));
const PublicFormGateway   = lazy(() => import("@/pages/public/PublicFormGateway"));

// Dashboard
const DashboardCrmPage    = lazy(() => import("@/pages/admin/DashboardCrmPage"));

// Users / Teams / KPI
const Users               = lazy(() => import("@/pages/users"));
const UserDetail          = lazy(() => import("@/pages/admin/user-detail"));
const TeamsPage           = lazy(() => import("@/pages/admin/teams/TeamsPage"));
const TeamDetailPage      = lazy(() => import("@/pages/admin/teams/TeamDetailPage"));
const StaffKpiPage        = lazy(() => import("@/pages/kpi/StaffKpiPage"));
const TeamKpiPage         = lazy(() => import("@/pages/kpi/TeamKpiPage"));
const KpiTargetsPage      = lazy(() => import("@/pages/kpi/KpiTargetsPage"));

// Packages / Products / Promotions / Commissions
const PackageGroups       = lazy(() => import("@/pages/admin/package-groups"));
const PackageGroupDetail  = lazy(() => import("@/pages/admin/package-group-detail"));
const NewPackageGroup     = lazy(() => import("@/pages/admin/new-package-group"));
const Packages            = lazy(() => import("@/pages/packages"));
const PackageDetail       = lazy(() => import("@/pages/admin/package-detail"));
const DelegatedPackages   = lazy(() => import("@/pages/admin/delegated-packages"));
const Products            = lazy(() => import("@/pages/admin/products"));
const ProductDetail       = lazy(() => import("@/pages/admin/product-detail"));
const ProductGroups       = lazy(() => import("@/pages/admin/product-groups"));
const ProductGroupDetail  = lazy(() => import("@/pages/admin/product-group-detail"));
const ProductTypes        = lazy(() => import("@/pages/admin/product-types"));
const ProductTypeDetail   = lazy(() => import("@/pages/admin/product-type-detail"));
const PromotionsPage      = lazy(() => import("@/pages/admin/promotions"));
const PromotionDetail     = lazy(() => import("@/pages/admin/promotion-detail"));
const CommissionsPage     = lazy(() => import("@/pages/admin/commissions"));
const CommissionDetail    = lazy(() => import("@/pages/admin/commission-detail"));
const EnrollmentSpots     = lazy(() => import("@/pages/admin/enrollment-spots"));

// Leads / Leads
const Leads               = lazy(() => import("@/pages/admin/leads"));

// Applications
const Applications        = lazy(() => import("@/pages/admin/applications"));
const AllApplications     = lazy(() => import("@/pages/admin/all-applications"));
const ApplicationDetail   = lazy(() => import("@/pages/admin/application-detail"));
const ApplicationForm     = lazy(() => import("@/pages/admin/application-form"));

// Camp Applications
const CampApplications      = lazy(() => import("@/pages/admin/camp-applications"));
const CampApplicationDetail = lazy(() => import("@/pages/admin/camp-application-detail"));
const AdminCampApplicationForm = lazy(() => import("@/pages/admin/camp-application-form"));

// Sales
const SchoolingConsultationsPage    = lazy(() => import("@/pages/admin/sales/SchoolingConsultationsPage"));
const SchoolingConsultationFormPage = lazy(() => import("@/pages/admin/sales/SchoolingConsultationFormPage"));
const StudyAbroadConsultationsPage  = lazy(() => import("@/pages/admin/sales/StudyAbroadConsultationsPage"));
const StudyAbroadConsultationFormPage = lazy(() => import("@/pages/admin/sales/StudyAbroadConsultationFormPage"));
const GeneralConsultationsPage      = lazy(() => import("@/pages/admin/sales/GeneralConsultationsPage"));
const GeneralConsultationFormPage   = lazy(() => import("@/pages/admin/sales/GeneralConsultationFormPage"));

// CRM
const ContactsPage       = lazy(() => import("@/pages/admin/crm/ContactsPage"));
const ContactDetailPage  = lazy(() => import("@/pages/admin/crm/ContactDetailPage"));
const AccountsPage       = lazy(() => import("@/pages/admin/crm/AccountsPage"));
const AccountDetailPage  = lazy(() => import("@/pages/admin/crm/AccountDetailPage"));
const CrmLeadsPage       = lazy(() => import("@/pages/admin/crm/LeadsPage"));
const LeadDetailPage     = lazy(() => import("@/pages/admin/crm/LeadDetailPage"));
const QuotesPage         = lazy(() => import("@/pages/admin/crm/QuotesPage"));
const QuoteBuilderPage   = lazy(() => import("@/pages/admin/crm/QuoteBuilderPage"));
const ContractListPage   = lazy(() => import("@/pages/admin/crm/ContractListPage"));
const ContractDetailPage = lazy(() => import("@/pages/admin/crm/ContractDetailPage"));

// Services
const PickupManagement     = lazy(() => import("@/pages/admin/services/pickup"));
const PickupMgtDetail      = lazy(() => import("@/pages/admin/services/pickup-detail"));
const TourManagement       = lazy(() => import("@/pages/admin/services/tour"));
const TourMgtDetail        = lazy(() => import("@/pages/admin/services/tour-detail"));
const Settlement           = lazy(() => import("@/pages/admin/services/settlement"));
const SettlementMgtDetail  = lazy(() => import("@/pages/admin/services/settlement-detail"));
const TasksCS              = lazy(() => import("@/pages/admin/services/tasks"));
const StudyAbroadPage      = lazy(() => import("@/pages/admin/services/StudyAbroadPage"));
const StudyAbroadDetailPage = lazy(() => import("@/pages/admin/services/StudyAbroadDetailPage"));
const AccommodationPage    = lazy(() => import("@/pages/admin/services/AccommodationPage"));
const AccommodationDetailPage = lazy(() => import("@/pages/admin/services/AccommodationDetailPage"));
const InternshipPage       = lazy(() => import("@/pages/admin/services/InternshipPage"));
const InternshipDetailPage = lazy(() => import("@/pages/admin/services/InternshipDetailPage"));
const GuardianPage         = lazy(() => import("@/pages/admin/services/GuardianPage"));
const GuardianDetailPage   = lazy(() => import("@/pages/admin/services/GuardianDetailPage"));
const OtherServicePage     = lazy(() => import("@/pages/admin/services/OtherServicePage"));
const OtherServiceDetailPage = lazy(() => import("@/pages/admin/services/OtherServiceDetailPage"));
const VisaServicePage      = lazy(() => import("@/pages/admin/services/VisaServicePage"));
const VisaServiceDetailPage = lazy(() => import("@/pages/admin/services/VisaServiceDetailPage"));

// Accounting
const ExchangeRates        = lazy(() => import("@/pages/admin/accounting/exchange-rates"));
const Invoices             = lazy(() => import("@/pages/admin/accounting/invoices"));
const Receipts             = lazy(() => import("@/pages/admin/accounting/receipts"));
const ReceiptDetailPage    = lazy(() => import("@/pages/admin/accounting/ReceiptDetailPage"));
const Transactions         = lazy(() => import("@/pages/admin/accounting/transactions"));
const TransactionDetailPage = lazy(() => import("@/pages/admin/accounting/TransactionDetailPage"));
const ChartOfAccountsPage  = lazy(() => import("@/pages/admin/accounting/ChartOfAccountsPage"));
const CoaDetailPage        = lazy(() => import("@/pages/admin/accounting/CoaDetailPage"));
const ArApTrackerPage      = lazy(() => import("@/pages/admin/accounting/ArApTrackerPage"));
const PaymentsPage         = lazy(() => import("@/pages/admin/accounting/PaymentsPage"));
const PaymentDetailPage    = lazy(() => import("@/pages/admin/accounting/PaymentDetailPage"));
const JournalEntriesPage   = lazy(() => import("@/pages/admin/accounting/JournalEntriesPage"));
const JournalEntryDetailPage = lazy(() => import("@/pages/admin/accounting/JournalEntryDetailPage"));
const TaxInvoiceListPage   = lazy(() => import("@/pages/admin/accounting/TaxInvoiceListPage"));
const TaxInvoiceDetailPage = lazy(() => import("@/pages/admin/accounting/TaxInvoiceDetailPage"));
const BankAccountsPage     = lazy(() => import("@/pages/admin/accounting/BankAccountsPage"));
const InvoiceDetailPage    = lazy(() => import("@/pages/admin/accounting/InvoiceDetailPage"));

// My Accounting
const MySettlements  = lazy(() => import("@/pages/admin/my-accounting/settlements"));
const MyInvoices     = lazy(() => import("@/pages/admin/my-accounting/invoices"));
const MyRevenue      = lazy(() => import("@/pages/admin/my-accounting/revenue"));

// Reports
const Reports         = lazy(() => import("@/pages/admin/reports"));
const ReportsPage     = lazy(() => import("@/pages/admin/ReportsPage"));
const ReportEditorPage = lazy(() => import("@/pages/admin/ReportEditorPage"));
const ReportViewerPage = lazy(() => import("@/pages/admin/ReportViewerPage"));

// Documents / Chatbot
const DocumentsPage   = lazy(() => import("@/pages/admin/documents"));
const ChatbotAdminPage = lazy(() => import("@/pages/admin/ChatbotAdminPage"));

// Settings
const GeneralSettings    = lazy(() => import("@/pages/admin/settings/general"));
const PageAccess         = lazy(() => import("@/pages/admin/settings/page-access"));
const FieldPermissions   = lazy(() => import("@/pages/admin/settings/field-permissions"));
const DocPermissions     = lazy(() => import("@/pages/admin/settings/doc-permissions"));
const ImpersonationLogs  = lazy(() => import("@/pages/admin/settings/impersonation-logs"));
const DataManager        = lazy(() => import("@/pages/admin/settings/data-manager"));
const LookupValues       = lazy(() => import("@/pages/admin/settings/lookup-values"));
const DbSync             = lazy(() => import("@/pages/admin/settings/db-sync"));
const CompanyProfile     = lazy(() => import("@/pages/admin/settings/company-profile"));
const Branding           = lazy(() => import("@/pages/admin/settings/branding"));
const DomainAccess       = lazy(() => import("@/pages/admin/settings/domain-access"));
const UsersTeams         = lazy(() => import("@/pages/admin/settings/users-teams"));
const PlanBilling        = lazy(() => import("@/pages/admin/settings/plan-billing"));
const TenantIntegrations = lazy(() => import("@/pages/admin/settings/integrations"));

// Super Admin
const SuperAdminLayout    = lazy(() => import("@/pages/admin/superadmin/SuperAdminLayout"));
const SuperAdminDashboard = lazy(() => import("@/pages/admin/superadmin/SuperAdminDashboard"));
const TenantList          = lazy(() => import("@/pages/admin/superadmin/TenantList"));
const TenantDetail        = lazy(() => import("@/pages/admin/superadmin/TenantDetail"));
const PlatformPlans       = lazy(() => import("@/pages/admin/superadmin/PlatformPlans"));
const StripeSettings      = lazy(() => import("@/pages/admin/superadmin/StripeSettings"));
const PlatformCrm         = lazy(() => import("@/pages/admin/superadmin/PlatformCrm"));
const PlatformCrmDetail   = lazy(() => import("@/pages/admin/superadmin/PlatformCrmDetail"));
const SuperAdminIntegrations = lazy(() => import("@/pages/admin/superadmin/Integrations"));

// My Programs / Notifications / Community
const MyPrograms          = lazy(() => import("@/pages/admin/my-programs"));
const Notifications       = lazy(() => import("@/pages/admin/notifications"));
const AdminCommunityPage  = lazy(() => import("@/pages/admin/community"));
const AdminStub           = lazy(() => import("@/pages/admin/stub"));

// Application Form Management
const ApplicationFormList    = lazy(() => import("@/pages/admin/application-forms/list"));
const ApplicationFormEdit    = lazy(() => import("@/pages/admin/application-forms/edit"));
const ApplicationFormPartners = lazy(() => import("@/pages/admin/application-forms/partners"));
const ApplicationFormTerms   = lazy(() => import("@/pages/admin/application-forms/terms"));

// ─────────────────────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AdminRoute({ children, title }: { children: React.ReactNode; title?: string }) {
  return <MainLayout title={title}>{children}</MainLayout>;
}

function Router() {
  const { theme } = useTenantTheme();
  const [location] = useLocation();

  const isSuperAdmin = location.startsWith("/superadmin");
  const effectiveTheme = isSuperAdmin ? DEFAULT_THEME : theme;

  useEffect(() => {
    applyThemeToDom(isSuperAdmin ? DEFAULT_THEME : theme);
  }, [isSuperAdmin, theme]);

  return (
    <TenantThemeContext.Provider value={effectiveTheme}>
    <Suspense fallback={<PageLoader />}>
    <Switch>
      {/* Root → login */}
      <Route path="/"><Redirect to="/login" /></Route>

      <Route path="/apply" component={ApplyPage} />
      <Route path="/inquiry/:slug" component={LeadInquiryPage} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/accept-invite" component={AcceptInvite} />

      {/* /admin bare path → dashboard */}
      <Route path="/admin"><Redirect to="/admin/dashboard/crm" /></Route>

      {/* Legacy /admin/contracts → CRM contracts */}
      <Route path="/admin/contracts/:id">{(params) => <Redirect to={`/admin/crm/contracts/${params.id}`} />}</Route>
      <Route path="/admin/contracts"><Redirect to="/admin/crm/contracts" /></Route>

      <Route path="/admin/dashboard">
        <Redirect to="/admin/dashboard/crm" />
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
      <Route path="/admin/sales/schooling-consultations/new">
        <AdminRoute title="New Schooling Consultation"><SchoolingConsultationFormPage /></AdminRoute>
      </Route>
      <Route path="/admin/sales/schooling-consultations/:id">
        {() => <AdminRoute title="Schooling Consultation"><SchoolingConsultationFormPage /></AdminRoute>}
      </Route>
      <Route path="/admin/sales/schooling-consultations">
        <AdminRoute title="Schooling Consultation"><SchoolingConsultationsPage /></AdminRoute>
      </Route>
      <Route path="/admin/sales/study-abroad-consultations/new">
        <AdminRoute title="New Study Abroad Consultation"><StudyAbroadConsultationFormPage /></AdminRoute>
      </Route>
      <Route path="/admin/sales/study-abroad-consultations/:id">
        {() => <AdminRoute title="Study Abroad Consultation"><StudyAbroadConsultationFormPage /></AdminRoute>}
      </Route>
      <Route path="/admin/sales/study-abroad-consultations">
        <AdminRoute title="Study Abroad Consultation"><StudyAbroadConsultationsPage /></AdminRoute>
      </Route>
      <Route path="/admin/sales/general-consultations/new">
        <AdminRoute title="New General Consultation"><GeneralConsultationFormPage /></AdminRoute>
      </Route>
      <Route path="/admin/sales/general-consultations/:id">
        {() => <AdminRoute title="General Consultation"><GeneralConsultationFormPage /></AdminRoute>}
      </Route>
      <Route path="/admin/sales/general-consultations">
        <AdminRoute title="General Consultation"><GeneralConsultationsPage /></AdminRoute>
      </Route>
      <Route path="/admin/camp-applications-all">
        <AdminRoute title="Camp Applications"><AllApplications mode="camp" /></AdminRoute>
      </Route>
      <Route path="/admin/service-applications">
        <AdminRoute title="Service Applications"><AllApplications mode="service" /></AdminRoute>
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
      <Route path="/admin/delegated-packages">
        <AdminRoute title="Delegated Packages"><DelegatedPackages /></AdminRoute>
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

      <Route path="/admin/community">
        <AdminRoute title="Community"><AdminCommunityPage /></AdminRoute>
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
      <Route path="/admin/services/other">
        <AdminRoute title="Other Services"><OtherServicePage /></AdminRoute>
      </Route>
      <Route path="/admin/services/other/:id">
        <AdminRoute title="Other Service Detail"><OtherServiceDetailPage /></AdminRoute>
      </Route>
      <Route path="/admin/services/visa">
        <AdminRoute title="Visa Services"><VisaServicePage /></AdminRoute>
      </Route>
      <Route path="/admin/services/visa/:id">
        <AdminRoute title="Visa Service Detail"><VisaServiceDetailPage /></AdminRoute>
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
      <Route path="/admin/accounting/bank-accounts">
        <AdminRoute title="Bank Accounts"><BankAccountsPage /></AdminRoute>
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
      <Route path="/admin/settings/db-sync">
        <AdminRoute title="DB Sync"><DbSync /></AdminRoute>
      </Route>
      <Route path="/admin/settings/lookup-values">
        <AdminRoute title="Lookup Values"><LookupValues /></AdminRoute>
      </Route>
      {/* Multi-tenant Settings */}
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
      <Route path="/admin/settings/integrations">
        <AdminRoute title="Integrations"><TenantIntegrations /></AdminRoute>
      </Route>

      {/* ── Super Admin (role=super_admin only) ── */}
      <Route path="/superadmin/tenants/:id">
        <SuperAdminGuard>
          <SuperAdminLayout><TenantDetail /></SuperAdminLayout>
        </SuperAdminGuard>
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
      <Route path="/superadmin/integrations">
        <SuperAdminGuard>
          <SuperAdminLayout><SuperAdminIntegrations /></SuperAdminLayout>
        </SuperAdminGuard>
      </Route>
      <Route path="/superadmin/crm/:id">
        <SuperAdminGuard>
          <PlatformCrmDetail />
        </SuperAdminGuard>
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
      <Route path="/admin/application-forms/:id/terms">
        <AdminRoute title="Terms & Conditions"><ApplicationFormTerms /></AdminRoute>
      </Route>
      <Route path="/admin/application-forms">
        <AdminRoute title="Forms Management"><ApplicationFormList /></AdminRoute>
      </Route>

      {/* Legacy redirects */}
      <Route path="/dashboard">
        <Redirect to="/admin/dashboard/crm" />
      </Route>
      <Route path="/users">
        <AdminRoute title="Users"><Users /></AdminRoute>
      </Route>

      {/* Public form gateway — handles /{slug} for all form types */}
      <Route path="/:slug" component={PublicFormGateway} />

      <Route component={NotFound} />
    </Switch>
    </Suspense>
    </TenantThemeContext.Provider>
  );
}

// ── View-As axios header sync ─────────────────────────────────────────────
function AxiosViewAsSetup() {
  const { viewAsRole, viewAsUser } = useViewAs();
  useEffect(() => {
    if (viewAsRole) {
      axios.defaults.headers.common["x-view-as-role"] = viewAsRole;
      delete axios.defaults.headers.common["x-view-as-user-id"];
    } else if (viewAsUser?._sourceType === "account" && viewAsUser.id) {
      axios.defaults.headers.common["x-view-as-user-id"] = viewAsUser.id;
      delete axios.defaults.headers.common["x-view-as-role"];
    } else {
      delete axios.defaults.headers.common["x-view-as-role"];
      delete axios.defaults.headers.common["x-view-as-user-id"];
    }
  }, [viewAsRole, viewAsUser]);
  return null;
}

function ImpersonationInit() {
  useEffect(() => {
    sessionStorage.removeItem("edubee_impersonate_org_id");
    sessionStorage.removeItem("edubee_impersonate_org_name");
    const params = new URLSearchParams(window.location.search);
    const orgId = params.get("impersonateOrg");
    const orgName = params.get("impersonateOrgName");
    if (orgId) {
      sessionStorage.setItem("admin_impersonate_org_id", orgId);
      if (orgName) sessionStorage.setItem("admin_impersonate_org_name", decodeURIComponent(orgName));
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
    <AppErrorBoundary>
    <DisplayCurrencyProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <ImpersonationInit />
            <ViewAsProvider>
              <AxiosViewAsSetup />
              <AuthProvider>
                <Router />
                <Toaster />
              </AuthProvider>
            </ViewAsProvider>
          </WouterRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </DisplayCurrencyProvider>
    </AppErrorBoundary>
  );
}

export default App;
