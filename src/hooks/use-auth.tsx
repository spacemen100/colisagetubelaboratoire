import { useState, createContext, ReactNode, useContext, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { User } from "@shared/schema";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: ReturnType<typeof useLoginMutation>;
  loginWithBarcodeMutation: ReturnType<typeof useLoginWithBarcodeMutation>;
  registerMutation: ReturnType<typeof useRegisterMutation>;
  logoutMutation: ReturnType<typeof useLogoutMutation>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Login mutation hook
function useLoginMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.username,
        password: credentials.password,
      });
      
      if (error) throw error;
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', credentials.username)
        .single();
        
      if (userError) throw userError;
      return userData;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['user'], user);
      toast({
        title: "Connecté avec succès",
        description: `Bienvenue, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Échec de la connexion",
        description: error.message || "Identifiant ou mot de passe incorrect",
        variant: "destructive",
      });
    },
  });
}

// Login with barcode mutation hook
function useLoginWithBarcodeMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ barcode }: { barcode: string }) => {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('barcode', barcode)
        .single();
        
      if (error) throw error;
      return userData;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['user'], user);
      toast({
        title: "Connecté avec succès",
        description: `Bienvenue, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Échec de la connexion",
        description: "Code-barres invalide ou non reconnu",
        variant: "destructive",
      });
    },
  });
}

// Register mutation hook
function useRegisterMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: {
      username: string;
      password: string;
      name: string;
      role: string;
      barcode: string;
    }) => {
      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email: userData.username,
        password: userData.password,
      });
      
      if (error) throw error;
      
      // Create user profile
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([{
          username: userData.username,
          name: userData.name,
          role: userData.role,
          barcode: userData.barcode,
        }])
        .select()
        .single();
        
      if (userError) throw userError;
      return newUser;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['user'], user);
      toast({
        title: "Inscription réussie",
        description: `Bienvenue, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Échec de l'inscription",
        description: error.message || "Une erreur est survenue lors de l'inscription",
        variant: "destructive",
      });
    },
  });
}

// Logout mutation hook
function useLogoutMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(['user'], null);
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Échec de la déconnexion",
        description: error.message || "Une erreur est survenue lors de la déconnexion",
        variant: "destructive",
      });
    },
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const loginMutation = useLoginMutation();
  const loginWithBarcodeMutation = useLoginWithBarcodeMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session?.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('username', session.user.email)
          .single();
          
        if (!userError) {
          setUser(userData);
        }
      }
      setIsLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', session.user.email)
          .single();
          
        if (!error) {
          setUser(userData);
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        loginMutation,
        loginWithBarcodeMutation,
        registerMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}