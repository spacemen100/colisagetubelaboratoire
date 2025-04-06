import { useState } from "react";
import { useLabContext } from "@/hooks/use-lab-context";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Truck, Package, Scan, ClipboardCheck, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Box } from "@shared/schema";
import PageContainer from "@/components/layout/page-container";
import BarcodeScanner from "@/components/scan/barcode-scanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const pickupFormSchema = z.object({
  transporterId: z.string().min(3, "L'identifiant du transporteur est requis (min. 3 caractères)"),
});

type PickupFormValues = z.infer<typeof pickupFormSchema>;

export default function PickupPage() {
  const { currentLab } = useLabContext();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isScanning, setIsScanning] = useState(false);
  const [scannedTransporterId, setScannedTransporterId] = useState<string | null>(null);
  const [selectedBoxes, setSelectedBoxes] = useState<Box[]>([]);
  
  // Form for transporter ID
  const form = useForm<PickupFormValues>({
    resolver: zodResolver(pickupFormSchema),
    defaultValues: {
      transporterId: scannedTransporterId || "",
    }
  });
  
  // Update form when scannedTransporterId changes
  useState(() => {
    if (scannedTransporterId) {
      form.setValue("transporterId", scannedTransporterId);
    }
  });
  
  // Query for getting ready boxes
  const { data: readyBoxes = [], isLoading } = useQuery<Box[]>({
    queryKey: [currentLab ? `/api/labs/${currentLab.id}/boxes` : null, "ready"],
    enabled: !!currentLab,
  });
  
  // Mutation for pickup boxes
  const pickupBoxesMutation = useMutation({
    mutationFn: async (data: { boxId: number; transporterId: string }) => {
      const res = await apiRequest("POST", `/api/boxes/${data.boxId}/pickup`, { transporterId: data.transporterId });
      return await res.json() as Box;
    },
    onSuccess: () => {
      toast({
        title: "Retrait effectué",
        description: `Les boîtes ont été retirées par le transporteur.`,
      });
      // Reset the form
      form.reset();
      setSelectedBoxes([]);
      setScannedTransporterId(null);
      // Invalidate queries to update dashboard and boxes list
      if (currentLab) {
        queryClient.invalidateQueries({ queryKey: [`/api/labs/${currentLab.id}/dashboard`] });
        queryClient.invalidateQueries({ queryKey: [`/api/labs/${currentLab.id}/boxes`] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec du retrait des boîtes.",
        variant: "destructive",
      });
    },
  });
  
  const handleScanTransporterId = (barcode: string) => {
    setScannedTransporterId(barcode);
    form.setValue("transporterId", barcode);
    setIsScanning(false);
  };
  
  const toggleBoxSelection = (box: Box) => {
    const isSelected = selectedBoxes.some(b => b.id === box.id);
    
    if (isSelected) {
      setSelectedBoxes(selectedBoxes.filter(b => b.id !== box.id));
    } else {
      setSelectedBoxes([...selectedBoxes, box]);
    }
  };
  
  const handlePickupSubmit = (values: PickupFormValues) => {
    if (selectedBoxes.length === 0) {
      toast({
        title: "Sélection requise",
        description: "Veuillez sélectionner au moins une boîte à retirer.",
        variant: "destructive",
      });
      return;
    }
    
    // Process each selected box
    selectedBoxes.forEach(box => {
      pickupBoxesMutation.mutate({
        boxId: box.id,
        transporterId: values.transporterId
      });
    });
  };
  
  const startScanning = () => {
    setIsScanning(true);
  };
  
  const getTemperatureDisplay = (temp: string) => {
    switch (temp) {
      case "ambient":
        return "Ambiante";
      case "cold":
        return "+4°C";
      case "frozen":
        return "-20°C";
      default:
        return temp;
    }
  };
  
  const getTemperatureColor = (temp: string) => {
    switch (temp) {
      case "ambient":
        return "ambient";
      case "cold":
        return "cold";
      case "frozen":
        return "frozen";
      default:
        return "default";
    }
  };
  
  return (
    <PageContainer title="Retrait des boîtes par le transporteur">
      {isScanning ? (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scanner l'identifiant du transporteur</CardTitle>
            </CardHeader>
            <CardContent>
              <BarcodeScanner 
                onScan={handleScanTransporterId}
                scanning={true} 
                scanText="Positionnez le code-barres du transporteur dans la zone de scan"
              />
            </CardContent>
            <div className="px-6 pb-6">
              <Button variant="outline" onClick={() => setIsScanning(false)} className="w-full">
                Annuler
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handlePickupSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name="transporterId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Identifiant du transporteur</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="Identifiant du transporteur" {...field} />
                              </FormControl>
                              <Button type="button" variant="outline" onClick={startScanning}>
                                <Scan className="h-4 w-4 mr-2" />
                                Scanner
                              </Button>
                            </div>
                            <FormDescription>
                              Scanner ou saisir l'identifiant du transporteur qui récupérera les boîtes
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:self-end">
                      <Button 
                        type="submit"
                        disabled={selectedBoxes.length === 0 || pickupBoxesMutation.isPending}
                        className="w-full"
                      >
                        {pickupBoxesMutation.isPending ? (
                          "Traitement en cours..."
                        ) : (
                          <>
                            <ClipboardCheck className="mr-2 h-4 w-4" />
                            Valider le retrait
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Boîtes prêtes pour le retrait</CardTitle>
                <Badge variant="outline">
                  {selectedBoxes.length} boîte(s) sélectionnée(s)
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : readyBoxes.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune boîte prête pour le retrait</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <span className="sr-only">Sélection</span>
                      </TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Tubes</TableHead>
                      <TableHead>Date de création</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readyBoxes.map((box) => {
                      const isSelected = selectedBoxes.some(b => b.id === box.id);
                      
                      return (
                        <TableRow 
                          key={box.id} 
                          className={isSelected ? "bg-primary/5" : ""}
                          onClick={() => toggleBoxSelection(box)}
                        >
                          <TableCell>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => toggleBoxSelection(box)}
                              className="rounded border-gray-300"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{box.barcode}</TableCell>
                          <TableCell>
                            <Badge variant={getTemperatureColor(box.temperatureType)}>
                              {getTemperatureDisplay(box.temperatureType)}
                            </Badge>
                          </TableCell>
                          <TableCell>{box.tubeCount}</TableCell>
                          <TableCell>{new Date(box.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
