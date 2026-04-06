import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
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
import NotFound from "@/pages/not-found";

import { useTenantTheme, TenantThemeContext } from "@/hooks/use-tenant-theme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function Router() {
  const { theme } = useTenantTheme();

  return (
    <TenantThemeContext.Provider value={theme}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/apply" component={ApplyPage} />
        <Route path="/inquiry/:slug" component={LeadInquiryPage} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />

        {/* Public form gateway — handles /{slug} for all form types */}
        <Route path="/:slug" component={PublicFormGateway} />

        <Route component={NotFound} />
      </Switch>
    </TenantThemeContext.Provider>
  );
}

function App() {
  return (
    <DisplayCurrencyProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
              <Toaster />
            </AuthProvider>
          </WouterRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </DisplayCurrencyProvider>
  );
}

export default App;
