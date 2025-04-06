import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { FlaskConical, User, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarcodeScanner } from "@/components/scan/barcode-scanner";
import { User as UserType } from "@shared/schema";

const loginSchema = z.object({
  username: z.string().min(1, "L'identifiant est requis"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  username: z.string()
    .min(3, "L'identifiant doit contenir au moins 3 caractères")
    .regex(/^[a-zA-Z0-9_-]+$/, "L'identifiant ne peut contenir que des lettres, chiffres, tirets et underscores")
    .transform(val => val.toLowerCase()),
  email: z.union([
    z.string().email("Format d'email invalide"),
    z.string().max(0)
  ]).optional(),
  password: z.string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères")
    .regex(/.*[A-Z].*/, "Le mot de passe doit contenir au moins une majuscule")
    .regex(/.*[a-z].*/, "Le mot de passe doit contenir au moins une minuscule")
    .regex(/.*\d.*/, "Le mot de passe doit contenir au moins un chiffre"),
  name: z.string().min(1, "Le nom est requis"),
  displayName: z.string().min(2, "Le nom d'affichage doit contenir au moins 2 caractères"),
  role: z.string().min(1, "Le rôle est requis"),
  barcode: z.string().min(1, "Le code-barres employé est requis"),
});

export default function AuthPage() {
  const {
    user,
    isLoading,
    loginMutation,
    loginWithBarcodeMutation,
    registerMutation
  } = useAuth();

  const [, setLocation] = useLocation();
  const [authTab, setAuthTab] = useState<"barcode" | "password">("barcode");

  useEffect(() => {
    if (user && !isLoading) {
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    console.log('📝 Login form submitted with values:', values);
    loginMutation.mutate(values, {
      onSuccess: () => {
        setLocation('/');
      }
    });
  };

  const onBarcodeSubmit = async (values: { barcode: string }) => {
    console.log('📝 Barcode login submitted with value:', values.barcode);
    loginWithBarcodeMutation.mutate({ barcode: values.barcode }, {
      onSuccess: () => {
        setLocation('/');
      }
    });
  };

  // Register form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      name: "",
      displayName: "",
      role: "Technicien",
      barcode: "",
    },
  });

  const onRegisterSubmit = registerForm.handleSubmit((data) => {
    console.log('📝 Register form submitted with values:', data);
    registerMutation.mutate(data);
  });

  // Barcode login
  const handleBarcodeScanned = (barcode: string) => {
    console.log('📊 Barcode scanned:', barcode);
    loginWithBarcodeMutation.mutate({ barcode });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="flex flex-col justify-center w-full max-w-md p-8 md:p-12">
        <div className="flex items-center justify-center mb-8">
          <FlaskConical className="text-primary text-3xl mr-2" />
          <h1 className="text-2xl font-bold">LabTrack</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Se connecter</CardTitle>
            <CardDescription className="text-center">
              Accédez au système de suivi d'échantillons médicaux
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="barcode"
              value={authTab}
              onValueChange={(value) => setAuthTab(value as "barcode" | "password")}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="barcode">Scan code-barres</TabsTrigger>
                <TabsTrigger value="password">Identifiant / Mot de passe</TabsTrigger>
              </TabsList>

              <TabsContent value="barcode" className="space-y-4">
                <BarcodeScanner
                  onScan={handleBarcodeScanned}
                  scanning={loginWithBarcodeMutation.isPending}
                  scanText="Veuillez scanner votre badge employé"
                />

                {loginWithBarcodeMutation.isPending && (
                  <div className="text-center text-sm text-muted-foreground mt-4">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Authentification en cours...
                  </div>
                )}
              </TabsContent>

              <TabsContent value="password">
                <Tabs defaultValue="login" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Connexion</TabsTrigger>
                    <TabsTrigger value="register">Inscription</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-4">
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Identifiant</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute top-2.5 left-3 h-5 w-5 text-muted-foreground" />
                                  <Input className="pl-10" placeholder="Entrez votre identifiant" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mot de passe</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute top-2.5 left-3 h-5 w-5 text-muted-foreground" />
                                  <Input
                                    className="pl-10"
                                    type="password"
                                    placeholder="Entrez votre mot de passe"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Connexion en cours...
                            </>
                          ) : (
                            "Se connecter"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>

                  <TabsContent value="register" className="space-y-4">
                    <Form {...registerForm}>
                      <form onSubmit={onRegisterSubmit} className="space-y-4">
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Identifiant</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute top-2.5 left-3 h-5 w-5 text-muted-foreground" />
                                  <Input className="pl-10" placeholder="Choisissez un identifiant unique" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email (optionnel)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute top-2.5 left-3 h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="20" height="16" x="2" y="4" rx="2"/>
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                                  </svg>
                                  <Input className="pl-10" type="email" placeholder="Entrez votre email (optionnel)" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mot de passe</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Créez un mot de passe"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom complet</FormLabel>
                              <FormControl>
                                <Input placeholder="Entrez votre nom complet" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="displayName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom d'affichage</FormLabel>
                              <FormControl>
                                <Input placeholder="Entrez votre nom d'affichage" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rôle</FormLabel>
                              <FormControl>
                                <Input placeholder="Entrez votre rôle" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="barcode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Code-barres employé</FormLabel>
                              <FormControl>
                                <Input placeholder="Entrez le code-barres" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Inscription en cours...
                            </>
                          ) : (
                            "S'inscrire"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Hero section */}
      <div className="hidden md:flex flex-1 bg-primary text-white p-8 items-center justify-center">
        <div className="max-w-md">
          <FlaskConical className="h-16 w-16 mb-6" />
          <h1 className="text-4xl font-bold mb-4">Système de Suivi d'Échantillons Médicaux</h1>
          <p className="text-lg opacity-90 mb-6">
            Suivez les échantillons médicaux avec précision grâce à la lecture de codes-barres,
            gérez les boîtes de transport et surveillez le transport en temps réel.
          </p>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="bg-white/20 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                </svg>
              </div>
              <span>Suivi et traçabilité complète des échantillons</span>
            </div>
            <div className="flex items-center">
              <div className="bg-white/20 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                  <path d="M16 8h.01M8 16h.01M16 16h.01M8 8h.01M12 12h.01"></path>
                </svg>
              </div>
              <span>Lecture de codes-barres rapide et précise</span>
            </div>
            <div className="flex items-center">
              <div className="bg-white/20 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 8v4l2 2"></path>
                </svg>
              </div>
              <span>Suivi des exigences de température en temps réel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
