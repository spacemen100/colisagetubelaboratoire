import { useState, createContext, ReactNode, useContext, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
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
  registerUser: (userData: {
    username: string;
    password: string;
    name: string;
    displayName: string;
    role: string;
    barcode: string;
  }) => Promise<User>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Login mutation hook
function useLoginMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      console.log('🔑 Login attempt:', credentials.username);
      const { data, error } = await supabase.rpc('authenticate_user', {
        p_username: credentials.username,
        p_password: credentials.password
      });
      
      console.log('🔐 Auth response:', { data, error });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.message);
      return data.user_data;
    },
    onSuccess: (user) => {
      console.log('👤 Setting user data:', user);
      queryClient.setQueryData(['user'], user);
      // Update AuthProvider state
      const event = new CustomEvent('userLogin', { detail: user });
      window.dispatchEvent(event);
      toast({
        title: "Connecté avec succès",
        description: `Bienvenue, ${user.name}!`,
      });
      // Navigate to dashboard
      setLocation('/');
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
      const { data, error } = await supabase.rpc('authenticate_user', {
        p_username: barcode,
        p_password: barcode
      });
        
      if (error) throw error;
      if (!data.success) throw new Error(data.message);
      return data.user_data;
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
      displayName: string;
      role: string;
      barcode: string;
    }) => {
      const { data, error } = await supabase.rpc('register_user', {
        p_username: userData.username,
        p_password: userData.password,
        p_name: userData.name,
        p_display_name: userData.displayName,
        p_role: userData.role,
        p_barcode: userData.barcode
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.message);
      return data.user_data;
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
      // Supprimer le token JWT
      localStorage.removeItem('auth_token');
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

  console.log('🔄 AuthProvider rendering, current user:', user);
  
  const loginMutation = useLoginMutation();
  const loginWithBarcodeMutation = useLoginWithBarcodeMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();

  useEffect(() => {
    const queryClient = new QueryClient();
    const cachedUser = queryClient.getQueryData<User>(['user']);
    if (cachedUser) {
      console.log('🔑 Found cached user:', cachedUser);
      setUser(cachedUser);
    }
    setIsLoading(false);

    // Listen for login events
    const handleLogin = (event: CustomEvent<User>) => {
      console.log('🔓 Login event received:', event.detail);
      setUser(event.detail);
    };

    window.addEventListener('userLogin', handleLogin as EventListener);

    return () => {
      queryClient.clear();
      window.removeEventListener('userLogin', handleLogin as EventListener);
    };
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
        registerUser: registerMutation.mutateAsync,
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