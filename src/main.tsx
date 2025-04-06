import { createRoot } from "react-dom/client";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { LabContextProvider } from "@/hooks/use-lab-context";
import AppRouter from "@/components/app-router";

console.log("🚀 main.tsx loaded"); // <-- Ajoutez ceci

function App() {
  console.log("⚛️ App component rendering"); // <-- Ajoutez ceci
  return (
    <AuthProvider>
      <LabContextProvider>
        <div className="min-h-screen">
          <AppRouter />
          <Toaster />
        </div>
      </LabContextProvider>
    </AuthProvider>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
console.log("🎯 Root element found:", rootElement); // <-- Ajoutez ceci

createRoot(rootElement).render(<App />);