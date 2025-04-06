import { useState, createContext, ReactNode, useContext, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
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
  checkAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function useLoginMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const { data, error } = await supabase.rpc('authenticate_user', {
        p_username: credentials.username,
        p_password: credentials.password,
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
        description: error.message || "Identifiant ou mot de passe incorrect",
        variant: "destructive",
      });
    },
  });
}

function useLoginWithBarcodeMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ barcode }: { barcode: string }) => {
      const { data, error } = await supabase.rpc('authenticate_user', {
        p_username: barcode,
        p_password: barcode,
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
        p_barcode: userData.barcode,
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

function useLogoutMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(['user'], null);
      setLocation('/auth');
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
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const user = queryClient.getQueryData<User>(['user']);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (data) {
          queryClient.setQueryData(['user'], data);
        }
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await checkAuth();
      } else if (event === 'SIGNED_OUT') {
        queryClient.setQueryData(['user'], null);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAuth, queryClient]);

  const loginMutation = useLoginMutation();
  const loginWithBarcodeMutation = useLoginWithBarcodeMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();

  const value = {
    user,
    isLoading,
    error,
    loginMutation,
    loginWithBarcodeMutation,
    registerMutation,
    logoutMutation,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}