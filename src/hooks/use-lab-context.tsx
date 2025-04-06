import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

type LabContextType = {
  labs: any[];
  currentLab: any | null;
  isLoading: boolean;
  setCurrentLab: (lab: any) => void;
};

const LabContext = createContext<LabContextType | null>(null);

export function LabContextProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [currentLab, setCurrentLab] = useState<any | null>(null);
  const [labs, setLabs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLabs = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('labs')
          .select('*')
          .order('name', { ascending: true });
        
        if (error) throw error;
        
        setLabs(data || []);
        if (data?.length > 0 && !currentLab) {
          setCurrentLab(data[0]);
        }
      } catch (error) {
        toast({
          title: "Erreur de chargement des laboratoires",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLabs();
  }, [currentLab, toast]);

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