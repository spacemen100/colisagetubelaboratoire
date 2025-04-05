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

export default function DeliveryPage() {
  const { currentLab } = useLabContext();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBoxes, setScannedBoxes] = useState<Box[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Query for getting in_transit boxes
  const { data: inTransitBoxes = [], isLoading } = useQuery<Box[]>({
    queryKey: [currentLab ? `/api/labs/${currentLab.id}/boxes` : null, "in_transit"],
    enabled: !!currentLab,
  });
  
  // Mutation for confirming delivery
  const deliveryBoxMutation = useMutation({
    mutationFn: async (boxId: number) => {
      const res = await apiRequest("POST", `/api/boxes/${boxId}/delivery`);
      return await res.json() as Box;
    },
    onSuccess: (box) => {
      toast({
        title: "Livraison confirmée",
        description: `La boîte ${box.barcode} a été livrée avec succès.`,
      });
      // Update the scanned boxes list
      setScannedBoxes(prev => prev.filter(b => b.id !== box.id));
      // Invalidate queries to update dashboard and boxes list
      if (currentLab) {
        queryClient.invalidateQueries({ queryKey: [`/api/labs/${currentLab.id}/dashboard`] });
        queryClient.invalidateQueries({ queryKey: [`/api/labs/${currentLab.id}/boxes`] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la confirmation de livraison.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for scanning a box
  const scanBoxMutation = useMutation({
    mutationFn: async (barcode: string) => {
      const res = await apiRequest("GET", `/api/boxes/${barcode}`);
      return await res.json() as { box: Box };
    },
    onSuccess: (data) => {
      const box = data.box;
      
      // Check if box is in transit
      if (box.status !== "in_transit") {
        toast({
          title: "Statut incorrect",
          description: `La boîte ${box.barcode} n'est pas en transit.`,
          variant: "destructive",
        });
        setIsScanning(false);
        return;
      }
      
      // Check if box is already scanned
      if (scannedBoxes.some(b => b.id === box.id)) {
        toast({
          title: "Boîte déjà scannée",
          description: `La boîte ${box.barcode} a déjà été scannée.`,
          variant: "destructive",
        });
        setIsScanning(false);
        return;
      }
      
      // Add to scanned boxes
      setScannedBoxes(prev => [...prev, box]);
      setIsScanning(false);
      
      toast({
        title: "Boîte scannée",
        description: `La boîte ${box.barcode} a été scannée avec succès.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur de scan",
        description: error.message || "Boîte non trouvée. Veuillez réessayer.",
        variant: "destructive",
      });
      setIsScanning(false);
    },
  });
  
  const handleScanBox = (barcode: string) => {
    scanBoxMutation.mutate(barcode);
  };
  
  const handleConfirmDelivery = (boxId: number) => {
    deliveryBoxMutation.mutate(boxId);
  };
  
  const handleConfirmAllDeliveries = () => {
    if (scannedBoxes.length === 0) {
      toast({
        title: "Aucune boîte",
        description: "Aucune boîte scannée à livrer.",
        variant: "destructive",
      });
      return;
    }
    
    scannedBoxes.forEach(box => {
      deliveryBoxMutation.mutate(box.id);
    });
  };
  
  const startScanning = () => {
    setIsScanning(true);
  };
  
  const filteredInTransitBoxes = inTransitBoxes.filter(box => 
    box.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
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
    <PageContainer title="Livraison par le transporteur">
      {isScanning ? (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scanner une boîte</CardTitle>
            </CardHeader>
            <CardContent>
              <BarcodeScanner 
                onScan={handleScanBox}
                scanning={true} 
                scanText="Positionnez le code-barres de la boîte dans la zone de scan"
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
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Boîtes scannées pour livraison</CardTitle>
                <Button 
                  onClick={startScanning}
                  className="ml-auto mr-2"
                >
                  <Scan className="mr-2 h-4 w-4" />
                  Scanner une boîte
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {scannedBoxes.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune boîte scannée pour livraison</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Scannez les boîtes livrées par le transporteur pour les enregistrer
                  </p>
                  <Button onClick={startScanning} className="mt-4">
                    Commencer à scanner
                  </Button>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Tubes</TableHead>
                        <TableHead>Date de retrait</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scannedBoxes.map((box) => (
                        <TableRow key={box.id}>
                          <TableCell className="font-medium">{box.barcode}</TableCell>
                          <TableCell>
                            <Badge variant={getTemperatureColor(box.temperatureType)}>
                              {getTemperatureDisplay(box.temperatureType)}
                            </Badge>
                          </TableCell>
                          <TableCell>{box.tubeCount}</TableCell>
                          <TableCell>
                            {box.pickupDate 
                              ? new Date(box.pickupDate).toLocaleDateString() 
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleConfirmDelivery(box.id)}
                              disabled={deliveryBoxMutation.isPending}
                            >
                              Confirmer livraison
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  <div className="mt-6 flex justify-end">
                    <Button 
                      onClick={handleConfirmAllDeliveries}
                      disabled={deliveryBoxMutation.isPending || scannedBoxes.length === 0}
                    >
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      Confirmer toutes les livraisons
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Boîtes en transit</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    placeholder="Rechercher des boîtes..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : filteredInTransitBoxes.length === 0 ? (
                <div className="text-center py-8">
                  <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune boîte en transit</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Tubes</TableHead>
                      <TableHead>Transporteur</TableHead>
                      <TableHead>Date de retrait</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInTransitBoxes.map((box) => (
                      <TableRow key={box.id}>
                        <TableCell className="font-medium">{box.barcode}</TableCell>
                        <TableCell>
                          <Badge variant={getTemperatureColor(box.temperatureType)}>
                            {getTemperatureDisplay(box.temperatureType)}
                          </Badge>
                        </TableCell>
                        <TableCell>{box.tubeCount}</TableCell>
                        <TableCell>{box.transporterId || "N/A"}</TableCell>
                        <TableCell>
                          {box.pickupDate 
                            ? new Date(box.pickupDate).toLocaleDateString() 
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
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
