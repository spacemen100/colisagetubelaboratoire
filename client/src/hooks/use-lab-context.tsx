import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lab } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type LabContextType = {
  labs: Lab[];
  currentLab: Lab | null;
  isLoading: boolean;
  setCurrentLab: (lab: Lab) => void;
};

const LabContext = createContext<LabContextType | null>(null);

export function LabContextProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [currentLab, setCurrentLab] = useState<Lab | null>(null);

  // Fetch labs
  const {
    data: labs = [],
    isLoading,
    error,
  } = useQuery<Lab[], Error>({
    queryKey: ["/api/labs"],
    enabled: true,
  });

  // Set default lab when labs are loaded
  useEffect(() => {
    if (labs.length > 0 && !currentLab) {
      setCurrentLab(labs[0]);
    }
  }, [labs, currentLab]);

  // Show error toast if labs fetch fails
  useEffect(() => {
    if (error) {
      toast({
        title: "Erreur de chargement des laboratoires",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <LabContext.Provider
      value={{
        labs,
        currentLab,
        isLoading,
        setCurrentLab,
      }}
    >
      {children}
    </LabContext.Provider>
  );
}

export function useLabContext() {
  const context = useContext(LabContext);
  if (!context) {
    throw new Error("useLabContext must be used within a LabContextProvider");
  }
  return context;
}
