import { ReactNode } from "react";
import Header from "./header";
import TabNavigation from "./tab-navigation";
import { useLabContext } from "@/hooks/use-lab-context";

interface PageContainerProps {
  children: ReactNode;
  title: string;
}

export default function PageContainer({ children, title }: PageContainerProps) {
  const { currentLab } = useLabContext();

  if (!currentLab) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <TabNavigation />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Veuillez sélectionner un laboratoire</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <TabNavigation />
      
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{title}</h2>
          {children}
        </div>
      </main>
    </div>
  );
}
