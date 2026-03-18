import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import "@/lib/i18n"; // initialize i18n

// Pages
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Users from "@/pages/users";
import Applications from "@/pages/applications";
import Packages from "@/pages/packages";
import NotFound from "@/pages/not-found";

// Layout
import { MainLayout } from "@/components/layout/main-layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      
      {/* Protected Routes wrapped in MainLayout */}
      <Route path="/dashboard">
        <MainLayout><Dashboard /></MainLayout>
      </Route>
      <Route path="/users">
        <MainLayout><Users /></MainLayout>
      </Route>
      <Route path="/applications">
        <MainLayout><Applications /></MainLayout>
      </Route>
      <Route path="/packages">
        <MainLayout><Packages /></MainLayout>
      </Route>
      
      {/* Catch-all for simple missing routes */}
      <Route path="/leads">
        <MainLayout>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <h2 className="text-2xl font-bold font-display mb-2">Leads CRM</h2>
            <p className="text-muted-foreground">Module under development.</p>
          </div>
        </MainLayout>
      </Route>
      <Route path="/contracts">
        <MainLayout>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <h2 className="text-2xl font-bold font-display mb-2">Contracts Management</h2>
            <p className="text-muted-foreground">Module under development.</p>
          </div>
        </MainLayout>
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
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
