import { useState, useEffect } from "react";
import { useLabContext } from "@/hooks/use-lab-context";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Boxes, Scan, Check, X, FilePlus, Thermometer } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Box, Tube, temperatureTypes } from "@shared/schema";
import PageContainer from "@/components/layout/page-container";
import BarcodeScanner from "@/components/scan/barcode-scanner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

type ScanningState = "idle" | "scanning_box" | "scanning_tube";

interface BoxWithTubes {
  box: Box;
  tubes: Tube[];
}

export default function LoadBoxPage() {
  const { currentLab } = useLabContext();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [scanningState, setScanningState] = useState<ScanningState>("idle");
  const [currentBox, setCurrentBox] = useState<Box | null>(null);
  const [scannedTubes, setScannedTubes] = useState<Tube[]>([]);
  
  // Mutation for scanning a box
  const scanBoxMutation = useMutation({
    mutationFn: async (barcode: string) => {
      const res = await apiRequest("GET", `/api/boxes/${barcode}`);
      return await res.json() as BoxWithTubes;
    },
    onSuccess: (data) => {
      setCurrentBox(data.box);
      setScannedTubes(data.tubes || []);
      setScanningState("idle");
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur de scan",
        description: error.message || "Boîte non trouvée. Veuillez réessayer.",
        variant: "destructive",
      });
      setScanningState("idle");
    },
  });
  
  // Mutation for creating a new box
  const createBoxMutation = useMutation({
    mutationFn: async (data: { barcode: string; temperatureType: string; sourceLabId: number; destinationLabId?: number; }) => {
      const res = await apiRequest("POST", "/api/boxes", data);
      return await res.json() as Box;
    },
    onSuccess: (box) => {
      setCurrentBox(box);
      setScannedTubes([]);
      toast({
        title: "Boîte créée",
        description: `La boîte ${box.barcode} a été créée avec succès.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la création de la boîte.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for adding a tube to the box
  const addTubeToBoxMutation = useMutation({
    mutationFn: async (data: { boxId: number; tubeBarcode: string; }) => {
      const res = await apiRequest("POST", `/api/boxes/${data.boxId}/add-tube`, { tubeBarcode: data.tubeBarcode });
      return await res.json() as { tube: Tube; box: Box; };
    },
    onSuccess: (data) => {
      setCurrentBox(data.box);
      setScannedTubes(prevTubes => [...prevTubes, data.tube]);
      setScanningState("idle");
      toast({
        title: "Tube ajouté",
        description: `Le tube ${data.tube.barcode} a été ajouté à la boîte.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de l'ajout du tube à la boîte.",
        variant: "destructive",
      });
      setScanningState("idle");
    },
  });
  
  // Mutation for marking a box as ready
  const markBoxReadyMutation = useMutation({
    mutationFn: async (boxId: number) => {
      const res = await apiRequest("POST", `/api/boxes/${boxId}/ready`);
      return await res.json() as Box;
    },
    onSuccess: (box) => {
      toast({
        title: "Boîte prête",
        description: `La boîte ${box.barcode} est maintenant prête pour le transport.`,
      });
      // Reset the form
      setCurrentBox(null);
      setScannedTubes([]);
      // Invalidate queries to update dashboard
      if (currentLab) {
        queryClient.invalidateQueries({ queryKey: [`/api/labs/${currentLab.id}/dashboard`] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec du marquage de la boîte comme prête.",
        variant: "destructive",
      });
    },
  });
  
  // Query for getting labs (for destination lab selection)
  const { data: labs = [] } = useQuery({
    queryKey: ["/api/labs"],
    enabled: !!currentLab,
  });
  
  const handleScanBox = (barcode: string) => {
    scanBoxMutation.mutate(barcode);
  };
  
  const handleScanTube = (barcode: string) => {
    if (!currentBox) return;
    
    addTubeToBoxMutation.mutate({
      boxId: currentBox.id,
      tubeBarcode: barcode
    });
  };
  
  const handleCreateBox = (temperatureType: string) => {
    if (!currentLab) return;
    
    // Generate a random box barcode for demo purposes
    // In a real app, we would scan this or let the user input it
    const boxBarcode = `BOX-${Math.floor(1000 + Math.random() * 9000)}`;
    
    createBoxMutation.mutate({
      barcode: boxBarcode,
      temperatureType,
      sourceLabId: currentLab.id,
      // You could add destinationLabId here if needed
    });
  };
  
  const handleMarkBoxReady = () => {
    if (!currentBox) return;
    
    markBoxReadyMutation.mutate(currentBox.id);
  };
  
  const startBoxScan = () => {
    setScanningState("scanning_box");
  };
  
  const startTubeScan = () => {
    setScanningState("scanning_tube");
  };
  
  const cancelScan = () => {
    setScanningState("idle");
  };
  
  const resetBox = () => {
    setCurrentBox(null);
    setScannedTubes([]);
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
  
  const renderBoxCreation = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Créer une nouvelle boîte</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6">
          <Boxes className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Sélectionnez un type de boîte</h3>
          <p className="text-sm text-gray-500 mb-6">
            Choisissez le type de température pour la nouvelle boîte
          </p>
          
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            {temperatureTypes.map((temp) => (
              <Button
                key={temp}
                variant="outline"
                className={`flex flex-col items-center py-4 h-auto ${
                  temp === "ambient" 
                    ? "border-green-500 hover:bg-green-50" 
                    : temp === "cold"
                      ? "border-blue-500 hover:bg-blue-50"
                      : "border-purple-500 hover:bg-purple-50"
                }`}
                onClick={() => handleCreateBox(temp)}
              >
                <Thermometer className={
                  temp === "ambient" 
                    ? "text-green-500 mb-2" 
                    : temp === "cold"
                      ? "text-blue-500 mb-2"
                      : "text-purple-500 mb-2"
                } />
                <span>{getTemperatureDisplay(temp)}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <Button variant="outline" onClick={startBoxScan} className="mr-2">
          Scanner une boîte existante
        </Button>
      </CardFooter>
    </Card>
  );
  
  const renderBoxScanner = () => (
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
      <CardFooter className="justify-end">
        <Button variant="outline" onClick={cancelScan}>
          Annuler
        </Button>
      </CardFooter>
    </Card>
  );
  
  const renderTubeScanner = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ajouter un tube à la boîte</CardTitle>
      </CardHeader>
      <CardContent>
        <BarcodeScanner 
          onScan={handleScanTube}
          scanning={true} 
          scanText="Positionnez le code-barres du tube dans la zone de scan"
        />
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="outline" onClick={cancelScan}>
          Annuler
        </Button>
      </CardFooter>
    </Card>
  );
  
  const renderBoxManager = () => (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Gestion de la boîte {currentBox?.barcode}</CardTitle>
          <Badge variant={getTemperatureColor(currentBox?.temperatureType || "")}>
            {getTemperatureDisplay(currentBox?.temperatureType || "")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-gray-500">Status: <span className="font-medium">{currentBox?.status}</span></p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Tubes: <span className="font-medium">{currentBox?.tubeCount || 0}</span></p>
          </div>
        </div>
        
        <Button onClick={startTubeScan} className="w-full mb-4">
          <FilePlus className="mr-2 h-4 w-4" />
          Ajouter un tube
        </Button>
        
        <div className="bg-gray-50 rounded-md p-3 mb-4">
          <h4 className="font-medium text-gray-700 mb-2">Tubes dans la boîte</h4>
          {scannedTubes.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucun tube dans cette boîte
            </p>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {scannedTubes.map((tube) => (
                  <div key={tube.id} className="bg-white p-2 rounded border border-gray-200 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{tube.barcode}</span>
                      <Badge variant="outline" className="text-xs">
                        {tube.type}
                      </Badge>
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      Patient: {tube.patientId} | Prélevé le: {new Date(tube.collectionDate).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
      <CardFooter className="justify-between space-x-4">
        <Button variant="outline" onClick={resetBox}>
          <X className="mr-2 h-4 w-4" />
          Fermer
        </Button>
        <Button 
          onClick={handleMarkBoxReady} 
          disabled={scannedTubes.length === 0 || currentBox?.status === "ready" || markBoxReadyMutation.isPending}
        >
          <Check className="mr-2 h-4 w-4" />
          {markBoxReadyMutation.isPending ? "En cours..." : "Marquer comme prête"}
        </Button>
      </CardFooter>
    </Card>
  );
  
  return (
    <PageContainer title="Charger une boîte">
      <div className="max-w-2xl mx-auto">
        {scanningState === "scanning_box" ? (
          renderBoxScanner()
        ) : scanningState === "scanning_tube" ? (
          renderTubeScanner()
        ) : currentBox ? (
          renderBoxManager()
        ) : (
          renderBoxCreation()
        )}
      </div>
    </PageContainer>
  );
}
