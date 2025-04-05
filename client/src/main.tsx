import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Switch, Route } from "wouter";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "@/pages/auth-page";
import { User } from "@shared/schema";

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
          <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
            <h1 className="text-2xl font-bold mb-4">Successfully Logged In!</h1>
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Role:</strong> {user.role}</p>
            <button 
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              onClick={() => authContextValue.logoutMutation.mutate()}
            >
              Logout
            </button>
          </div>
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
