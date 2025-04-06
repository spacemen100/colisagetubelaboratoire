import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Badge } from "@/components/ui/badge";

type Tab = {
  id: string;
  name: string;
  path: string;
  alertCount?: number;
};

export default function TabNavigation() {
  const [location] = useLocation();
  
  const tabs: Tab[] = [
    { id: "dashboard", name: "Tableau de bord", path: "/" },
    { id: "alerts", name: "Alertes", path: "/alerts", alertCount: 3 },
    { id: "import-reader", name: "Importer un lecteur", path: "/import-reader" },
    { id: "scan-action", name: "Effectuer une action", path: "/scan-action" },
    { id: "load-box", name: "Charger une boîte", path: "/load-box" },
    { id: "merge-boxes", name: "Fusionner les boîtes", path: "/merge-boxes" },
    { id: "pickup", name: "Retrait des boîtes", path: "/pickup" },
    { id: "delivery", name: "Livraison", path: "/delivery" },
    { id: "unload-box", name: "Décharger une boîte", path: "/unload-box" },
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="relative overflow-x-auto">
          <nav className="flex space-x-1 md:space-x-4 py-2 whitespace-nowrap">
            {tabs.map((tab) => (
              <Link key={tab.id} href={tab.path}>
                <button
                  className={`px-3 py-2 text-sm font-medium relative ${
                    location === tab.path
                      ? "text-primary border-b-2 border-primary"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.name}
                  {tab.alertCount && (
                    <Badge 
                      className="absolute -top-1 -right-1 bg-red-500 text-white"
                      variant="destructive"
                    >
                      {tab.alertCount}
                    </Badge>
                  )}
                </button>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
