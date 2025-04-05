import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { LabContextProvider } from "@/hooks/use-lab-context";
import AppRouter from "@/components/app-router";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LabContextProvider>
          <div className="min-h-screen">
            <AppRouter />
            <Toaster />
          </div>
        </LabContextProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
