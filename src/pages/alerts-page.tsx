import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLabContext } from "@/hooks/use-lab-context";
import { useAuth } from "@/hooks/use-auth";
import { AlertTriangle, CheckCircle, Search } from "lucide-react";
import { Alert } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import PageContainer from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function AlertsPage() {
  const { currentLab } = useLabContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterResolved, setFilterResolved] = useState<"all" | "active" | "resolved">("active");
  
  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: [currentLab ? `/api/laboratories/${currentLab.id}/alerts` : null, filterResolved !== "all" ? (filterResolved === "active" ? false : true) : undefined],
    enabled: !!currentLab,
  });
  
  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      await apiRequest("POST", `/api/alerts/${alertId}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/laboratories/${currentLab?.id}/alerts`] });
      toast({
        title: "Alerte résolue",
        description: "L'alerte a été marquée comme résolue avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: `Échec de la résolution de l'alerte: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const filteredAlerts = alerts.filter(alert => 
    alert.message.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return "default";
    }
  };
  
  const handleResolveAlert = (alertId: number) => {
    resolveAlertMutation.mutate(alertId);
  };
  
  return (
    <PageContainer title="Alertes">
      <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Rechercher des alertes..."
            className="pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select
          value={filterResolved}
          onValueChange={(value) => setFilterResolved(value as "all" | "active" | "resolved")}
        >
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les alertes</SelectItem>
            <SelectItem value="active">Alertes actives</SelectItem>
            <SelectItem value="resolved">Alertes résolues</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Aucune alerte trouvée</p>
            <p className="text-gray-500 mt-1">
              {filterResolved === "active" 
                ? "Il n'y a actuellement aucune alerte active dans ce laboratoire."
                : "Aucune alerte correspondant à votre recherche."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAlerts.map((alert) => (
            <Card key={alert.id} className={alert.resolved ? "opacity-70" : ""}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <AlertTriangle className={`h-5 w-5 ${alert.severity === 'critical' ? 'text-red-500' : 'text-amber-500'} mr-2`} />
                    <CardTitle className="text-base font-medium">{alert.type}</CardTitle>
                  </div>
                  <Badge variant={getSeverityColor(alert.severity)}>
                    {alert.severity === 'critical' ? 'Critique' : 'Avertissement'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{alert.message}</p>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span>Créée le {new Date(alert.createdAt).toLocaleDateString()} à {new Date(alert.createdAt).toLocaleTimeString()}</span>
                    {alert.resolved && <Badge variant="outline" className="ml-2">Résolue</Badge>}
                  </div>
                  
                  {!alert.resolved && (
                    <Button 
                      size="sm" 
                      onClick={() => handleResolveAlert(alert.id)}
                      disabled={resolveAlertMutation.isPending}
                    >
                      {resolveAlertMutation.isPending ? "En cours..." : "Marquer comme résolue"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
