import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PortalLayout } from "@/components/portal-layout";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import StudentsPage from "@/pages/students";
import StudentDetailPage from "@/pages/student-detail";
import CommissionsPage from "@/pages/commissions";
import ProfilePage from "@/pages/profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!isAuthenticated) return <Redirect to="/login" />;
  return (
    <PortalLayout>
      <Component />
    </PortalLayout>
  );
}

function Router() {
  const { isAuthenticated } = useAuth();
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
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
      <Route path="/">
        {() =>
          isAuthenticated ? <Redirect to="/dashboard" /> : <Redirect to="/login" />
        }
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
