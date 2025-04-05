import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Switch, Route, Router } from "wouter";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import { User } from "@shared/schema";
import Header from "@/components/layout/header";
import TabNavigation from "@/components/layout/tab-navigation";
import { LabContextProvider } from "@/hooks/use-lab-context";

// Super simplified version for debugging
function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Simple check to simulate auth loading
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  // Mock auth context values
  const authContextValue = {
    user,
    isLoading,
    error: null,
    loginMutation: {
      mutate: (credentials: any) => {
        console.log("Login:", credentials);
        setUser({ id: 1, username: credentials.username, name: "Test User", role: "Admin", barcode: "TEST-123", password: "", createdAt: new Date() });
      },
      isPending: false
    },
    loginWithBarcodeMutation: {
      mutate: ({ barcode }: any) => {
        console.log("Barcode login:", barcode);
        setUser({ id: 1, username: "barcode_user", name: "Barcode User", role: "Admin", barcode, password: "", createdAt: new Date() });
      },
      isPending: false
    },
    registerMutation: {
      mutate: (userData: any) => {
        console.log("Register:", userData);
        setUser({ ...userData, id: 1, createdAt: new Date() });
      },
      isPending: false
    },
    logoutMutation: {
      mutate: () => {
        setUser(null);
      },
      isPending: false
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen">
        {user ? (
          <LabContextProvider>
            <div className="min-h-screen flex flex-col">
              <Header />
              <TabNavigation />
              <DashboardPage />
            </div>
          </LabContextProvider>
        ) : (
          <AuthPage
            authContext={authContextValue}
          />
        )}
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
