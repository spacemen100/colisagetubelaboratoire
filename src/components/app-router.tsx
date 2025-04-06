import { Switch, Route, Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import AlertsPage from "@/pages/alerts-page";
import ImportReaderPage from "@/pages/import-reader-page";
import ScanActionPage from "@/pages/scan-action-page";
import LoadBoxPage from "@/pages/load-box-page";
import MergeBoxesPage from "@/pages/merge-boxes-page";
import PickupPage from "@/pages/pickup-page";
import DeliveryPage from "@/pages/delivery-page";
import UnloadBoxPage from "@/pages/unload-box-page";
import ProfilePage from "@/pages/profile-page";
import { useAuth } from "@/hooks/use-auth";

// Custom ProtectedRoutes component that uses the AuthContext
function ProtectedRoutes() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/import-reader" component={ImportReaderPage} />
      <Route path="/scan-action" component={ScanActionPage} />
      <Route path="/load-box" component={LoadBoxPage} />
      <Route path="/merge-boxes" component={MergeBoxesPage} />
      <Route path="/pickup" component={PickupPage} />
      <Route path="/delivery" component={DeliveryPage} />
      <Route path="/unload-box" component={UnloadBoxPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function AppRouter() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route>
        <ProtectedRoutes />
      </Route>
    </Switch>
  );
}