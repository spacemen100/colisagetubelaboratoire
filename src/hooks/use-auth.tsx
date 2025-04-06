import { useState, createContext, ReactNode, useContext, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { User } from "@shared/schema";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  loginWithBarcode: (barcode: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: { email: string; password: string; name: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Vérifier la session au chargement
    const checkSession = async () => {
      setIsLoading(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
          // Récupérer les infos supplémentaires de l'utilisateur
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (userError) throw userError;
          setUser(userData);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (error) {
          console.error('Error fetching user data:', error);
          return;
        }
        setUser(userData);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      
      if (error) throw error;
      
      if (data?.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        if (userError) throw userError;
        
        setUser(userData);
        toast({
          title: "Connecté avec succès",
          description: `Bienvenue, ${userData.name}!`,
        });
      }
    } catch (err) {
      setError(err as Error);
      toast({
        title: "Échec de la connexion",
        description: (err as Error).message || "Identifiant ou mot de passe incorrect",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithBarcode = async (barcode: string) => {
    setIsLoading(true);
    try {
      // Supposons que le code-barres est stocké dans la table user_profiles
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('barcode', barcode)
        .single();
      
      if (profileError || !profile) throw new Error("Code-barres non reconnu");
      
      // Récupérer l'utilisateur
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', profile.user_id)
        .single();
        
      if (userError) throw userError;
      
      // Connecter l'utilisateur (cette partie dépend de votre stratégie d'authentification)
      // Si vous utilisez magic link ou autre:
      // await supabase.auth.signInWithOtp({ email: userData.email });
      
      setUser(userData);
      toast({
        title: "Connecté avec succès",
        description: `Bienvenue, ${userData.name}!`,
      });
    } catch (err) {
      setError(err as Error);
      toast({
        title: "Échec de la connexion",
        description: (err as Error).message || "Code-barres non reconnu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: { email: string; password: string; name: string }) => {
    setIsLoading(true);
    try {
      // Créer l'utilisateur dans Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });
      
      if (authError) throw authError;
      
      if (authData.user) {
        // Créer l'utilisateur dans la table users
        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: userData.email,
            name: userData.name,
            role: 'user' // ou autre rôle par défaut
          })
          .select()
          .single();
          
        if (dbError) throw dbError;
        
        setUser(dbUser);
        toast({
          title: "Compte créé avec succès",
          description: `Bienvenue, ${dbUser.name}!`,
        });
      }
    } catch (err) {
      setError(err as Error);
      toast({
        title: "Échec de l'inscription",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      toast({
        title: "Déconnecté avec succès",
      });
    } catch (err) {
      setError(err as Error);
      toast({
        title: "Échec de la déconnexion",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        loginWithBarcode,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}