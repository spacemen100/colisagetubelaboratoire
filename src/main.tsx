import { createRoot } from "react-dom/client";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { LabContextProvider } from "@/hooks/use-lab-context";
import AppRouter from "@/components/app-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

console.log("🚀 main.tsx loaded");

// Create a client
const queryClient = new QueryClient();

function App() {
  console.log("⚛️ App component rendering");
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

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
console.log("🎯 Root element found:", rootElement);

createRoot(rootElement).render(<App />);