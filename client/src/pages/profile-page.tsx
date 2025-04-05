import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { User, Shield, Barcode } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    barcode: ""
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        role: user.role,
        barcode: user.barcode
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) throw new Error("Utilisateur non connecté");
      const res = await apiRequest("PATCH", `/api/users/${user.id}`, data);
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      setEditing(false);
      // Mettre à jour les données utilisateur dans le cache
      queryClient.setQueryData(["/api/user"], updatedUser);
      // Invalider le cache pour forcer un rafraîchissement
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la mise à jour du profil",
        variant: "destructive",
      });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  if (!user) {
    return <div className="p-8">Chargement du profil...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Mon Profil</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2" />
            Informations Personnelles
          </CardTitle>
          <CardDescription>
            Consultez et modifiez vos informations de profil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4 text-gray-500" />
                    <Label htmlFor="name">Nom complet</Label>
                  </div>
                  {editing ? (
                    <Input 
                      id="name" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleChange} 
                      className="w-full"
                    />
                  ) : (
                    <div className="text-lg font-medium">{user.name}</div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Shield className="mr-2 h-4 w-4 text-gray-500" />
                    <Label htmlFor="role">Rôle</Label>
                  </div>
                  {editing ? (
                    <Input 
                      id="role" 
                      name="role" 
                      value={formData.role} 
                      onChange={handleChange} 
                      className="w-full"
                    />
                  ) : (
                    <div className="text-lg font-medium">{user.role}</div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <Barcode className="mr-2 h-4 w-4 text-gray-500" />
                  <Label htmlFor="barcode">Code-barres d'identification</Label>
                </div>
                {editing ? (
                  <Input 
                    id="barcode" 
                    name="barcode" 
                    value={formData.barcode} 
                    onChange={handleChange} 
                    className="w-full"
                  />
                ) : (
                  <div className="flex space-x-2 items-center">
                    <code className="text-lg bg-gray-100 px-2 py-1 rounded">{user.barcode}</code>
                  </div>
                )}
              </div>
              
              <div className="pt-4">
                <div className="text-sm text-gray-500">
                  <span className="font-semibold">Identifiant: </span>{user.username}
                </div>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                onClick={handleSubmit}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              Modifier mon profil
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}