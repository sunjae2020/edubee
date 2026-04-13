import { Switch, Route, Router as WouterRouter } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/Button";
import HomePage from "@/pages/HomePage";
import PricingPage from "@/pages/PricingPage";
import ServicesPage from "@/pages/ServicesPage";
import FaqPage from "@/pages/FaqPage";
import ContactPage from "@/pages/ContactPage";
import ConsultingPage from "@/pages/ConsultingPage";
import SupportPage from "@/pages/SupportPage";
import StudentPage from "@/pages/services/StudentPage";
import SchoolPage from "@/pages/services/SchoolPage";
import PartnerPage from "@/pages/services/PartnerPage";
import AgencyPage from "@/pages/services/AgencyPage";
import TuitionPage from "@/pages/services/TuitionPage";
import BranchPage from "@/pages/services/BranchPage";
import AiChatbotPage from "@/pages/services/AiChatbotPage";
import AiFormPage from "@/pages/services/AiFormPage";
import AiStudyPage from "@/pages/services/AiStudyPage";
import BlogPage from "@/pages/BlogPage";
import BlogPostPage from "@/pages/BlogPostPage";
import NoticesPage from "@/pages/NoticesPage";
import NoticePage from "@/pages/NoticePage";
import AboutPage from "@/pages/about/AboutPage";
import CompanyPage from "@/pages/about/CompanyPage";
import WhyPage from "@/pages/about/WhyPage";
import AboutSecurityPage from "@/pages/about/SecurityPage";
import PlatformPage from "@/pages/platform/PlatformPage";
import OverviewPage from "@/pages/platform/OverviewPage";
import OperationsPage from "@/pages/platform/OperationsPage";
import MarketingPage from "@/pages/platform/MarketingPage";
import AccessPage from "@/pages/platform/AccessPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import "@/i18n/config";

const queryClient = new QueryClient();

const StudioPage = lazy(() => import("@/pages/StudioPage"));

function WebsiteRedirect() {
  useEffect(() => {
    const path = window.location.pathname.replace(/^\/website/, "") || "/";
    window.location.replace(path + window.location.search + window.location.hash);
  }, []);
  return null;
}

function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-neutral-50 px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-[#FEF0E3] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-[#F5821F] font-bold text-2xl">?</span>
        </div>
        <h1 className="text-[32px] font-bold text-neutral-900 mb-3">Page Not Found</h1>
        <p className="text-sm text-neutral-600 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button variant="primary" href="/">Back to Home</Button>
          <Button variant="secondary" href="/support/contact">Contact Us</Button>
        </div>
      </div>
    </div>
  );
}

function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd type="Organization" />
      <JsonLd type="WebSite" />
      <AnnouncementBanner />
      <Header />
      <main className="pt-14">{children}</main>
      <Footer />
    </>
  );
}

function Router() {
  return (
    <Switch>
      {/* /website/* → / redirect (www.edubee.co custom domain routing workaround) */}
      <Route path="/website" component={WebsiteRedirect} />
      <Route path="/website/:rest*" component={WebsiteRedirect} />

      {/* Sanity Studio — full screen, no site layout */}
      <Route path="/studio/:rest*">
        <Suspense fallback={
          <div className="flex items-center justify-center h-screen">
            <p className="text-sm text-neutral-500">Loading Studio…</p>
          </div>
        }>
          <StudioPage />
        </Suspense>
      </Route>

      {/* Home */}
      <Route path="/">
        <SiteLayout><HomePage /></SiteLayout>
      </Route>

      {/* Pricing */}
      <Route path="/pricing">
        <SiteLayout><PricingPage /></SiteLayout>
      </Route>

      {/* Services */}
      <Route path="/services">
        <SiteLayout><ServicesPage /></SiteLayout>
      </Route>
      <Route path="/services/student">
        <SiteLayout><StudentPage /></SiteLayout>
      </Route>
      <Route path="/services/school">
        <SiteLayout><SchoolPage /></SiteLayout>
      </Route>
      <Route path="/services/partner">
        <SiteLayout><PartnerPage /></SiteLayout>
      </Route>
      <Route path="/services/agency">
        <SiteLayout><AgencyPage /></SiteLayout>
      </Route>
      <Route path="/services/tuition">
        <SiteLayout><TuitionPage /></SiteLayout>
      </Route>
      <Route path="/services/branch">
        <SiteLayout><BranchPage /></SiteLayout>
      </Route>
      <Route path="/services/ai-chatbot">
        <SiteLayout><AiChatbotPage /></SiteLayout>
      </Route>
      <Route path="/services/ai-form">
        <SiteLayout><AiFormPage /></SiteLayout>
      </Route>
      <Route path="/services/ai-study">
        <SiteLayout><AiStudyPage /></SiteLayout>
      </Route>

      {/* Blog */}
      <Route path="/blog">
        <SiteLayout><BlogPage /></SiteLayout>
      </Route>
      <Route path="/blog/:slug">
        <SiteLayout><BlogPostPage /></SiteLayout>
      </Route>

      {/* Support */}
      <Route path="/support">
        <SiteLayout><SupportPage /></SiteLayout>
      </Route>
      <Route path="/support/faq">
        <SiteLayout><FaqPage /></SiteLayout>
      </Route>
      <Route path="/support/contact">
        <SiteLayout><ContactPage /></SiteLayout>
      </Route>
      <Route path="/support/consulting">
        <SiteLayout><ConsultingPage /></SiteLayout>
      </Route>
      <Route path="/support/notices">
        <SiteLayout><NoticesPage /></SiteLayout>
      </Route>
      <Route path="/support/notices/:id">
        <SiteLayout><NoticePage /></SiteLayout>
      </Route>

      {/* About */}
      <Route path="/about">
        <SiteLayout><AboutPage /></SiteLayout>
      </Route>
      <Route path="/about/company">
        <SiteLayout><CompanyPage /></SiteLayout>
      </Route>
      <Route path="/about/why">
        <SiteLayout><WhyPage /></SiteLayout>
      </Route>
      <Route path="/about/security">
        <SiteLayout><AboutSecurityPage /></SiteLayout>
      </Route>

      {/* Platform */}
      <Route path="/program">
        <SiteLayout><PlatformPage /></SiteLayout>
      </Route>
      <Route path="/program/overview">
        <SiteLayout><OverviewPage /></SiteLayout>
      </Route>
      <Route path="/program/operations">
        <SiteLayout><OperationsPage /></SiteLayout>
      </Route>
      <Route path="/program/marketing">
        <SiteLayout><MarketingPage /></SiteLayout>
      </Route>
      <Route path="/program/access">
        <SiteLayout><AccessPage /></SiteLayout>
      </Route>

      {/* Auth */}
      <Route path="/login">
        <SiteLayout><LoginPage /></SiteLayout>
      </Route>
      <Route path="/register">
        <SiteLayout><RegisterPage /></SiteLayout>
      </Route>

      {/* Public form / camp application slugs → redirect to CAMP app */}
      <Route path="/:slug">
        {(params) => {
          useEffect(() => {
            const qs = window.location.search;
            window.location.replace(`/camp/${params.slug}${qs}`);
          }, [params.slug]);
          return null;
        }}
      </Route>

      {/* 404 */}
      <Route>
        <SiteLayout><NotFound /></SiteLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
