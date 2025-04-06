import { Switch, Route, Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

function ProtectedRoutes() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/auth');
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // La redirection est gérée par l'effet
  }

  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      {/* Ajoutez vos autres routes protégées ici */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function AppRouter() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation('/');
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route>
        <ProtectedRoutes />
      </Route>
    </Switch>
  );
}