import { useState } from "react";
import { useLabContext } from "@/hooks/use-lab-context";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { Package, Boxes, Scan, CircleCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Box, Tube } from "@shared/schema";
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

export default function UnloadBoxPage() {
  const { currentLab } = useLabContext();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [scanningState, setScanningState] = useState<ScanningState>("idle");
  const [currentBox, setCurrentBox] = useState<Box | null>(null);
  const [boxTubes, setBoxTubes] = useState<Tube[]>([]);
  const [removedTubes, setRemovedTubes] = useState<Tube[]>([]);
  
  // Mutation for scanning a box
  const scanBoxMutation = useMutation({
    mutationFn: async (barcode: string) => {
      const res = await apiRequest("GET", `/api/boxes/${barcode}`);
      return await res.json() as BoxWithTubes;
    },
    onSuccess: (data) => {
      setCurrentBox(data.box);
      setBoxTubes(data.tubes || []);
      setRemovedTubes([]);
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
  
  // Mutation for scanning a tube to remove from box
  const scanTubeMutation = useMutation({
    mutationFn: async (barcode: string) => {
      // First, check if the tube exists in the box
      const tube = boxTubes.find(t => t.barcode === barcode);
      if (!tube) {
        throw new Error("Ce tube ne fait pas partie de cette boîte.");
      }
      
      // Then remove it
      const res = await apiRequest("POST", `/api/boxes/${currentBox?.id}/remove-tube`, { tubeBarcode: barcode });
      return await res.json() as { tube: Tube; box: Box };
    },
    onSuccess: (data) => {
      // Update removed tubes
      setRemovedTubes(prev => [...prev, data.tube]);
      // Update box tubes
      setBoxTubes(prev => prev.filter(t => t.id !== data.tube.id));
      // Update box
      setCurrentBox(data.box);
      
      setScanningState("idle");
      
      toast({
        title: "Tube retiré",
        description: `Le tube ${data.tube.barcode} a été retiré de la boîte.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec du retrait du tube de la boîte.",
        variant: "destructive",
      });
      setScanningState("idle");
    },
  });
  
  const handleScanBox = (barcode: string) => {
    scanBoxMutation.mutate(barcode);
  };
  
  const handleScanTube = (barcode: string) => {
    if (!currentBox) return;
    
    scanTubeMutation.mutate(barcode);
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
    setBoxTubes([]);
    setRemovedTubes([]);
  };
  
  const handleFinishUnloading = () => {
    resetBox();
    toast({
      title: "Déchargement terminé",
      description: "Le déchargement de la boîte est terminé.",
    });
    
    // Invalidate queries to update dashboard
    if (currentLab) {
      queryClient.invalidateQueries({ queryKey: [`/api/labs/${currentLab.id}/dashboard`] });
    }
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
        <CardTitle className="text-lg">Scanner un tube à retirer</CardTitle>
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
  
  const renderStartPage = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Décharger une boîte</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Boxes className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Commencer par scanner une boîte</h3>
          <p className="text-sm text-gray-500 mb-6">
            Scannez une boîte pour commencer le processus de déchargement
          </p>
          <Button onClick={startBoxScan}>
            Scanner une boîte
          </Button>
        </div>
      </CardContent>
    </Card>
  );
  
  const renderUnloadingBox = () => (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Déchargement de la boîte {currentBox?.barcode}</CardTitle>
          <Badge variant={getTemperatureColor(currentBox?.temperatureType || "")}>
            {getTemperatureDisplay(currentBox?.temperatureType || "")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Tubes restants dans la boîte ({boxTubes.length})</h3>
            {boxTubes.length === 0 ? (
              <div className="bg-gray-50 rounded-md p-4 text-center">
                <CircleCheck className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-gray-500">Tous les tubes ont été déchargés</p>
              </div>
            ) : (
              <ScrollArea className="h-48 border rounded-md p-2">
                <div className="space-y-2">
                  {boxTubes.map((tube) => (
                    <div key={tube.id} className="bg-white p-2 rounded border border-gray-200 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{tube.barcode}</span>
                        <Badge variant="outline" className="text-xs">
                          {tube.type}
                        </Badge>
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        Patient: {tube.patientId}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            <Button 
              onClick={startTubeScan} 
              className="w-full mt-4"
              disabled={boxTubes.length === 0}
            >
              <Scan className="mr-2 h-4 w-4" />
              Scanner un tube à retirer
            </Button>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Tubes déchargés ({removedTubes.length})</h3>
            {removedTubes.length === 0 ? (
              <div className="bg-gray-50 rounded-md p-4 text-center h-48 flex items-center justify-center">
                <p className="text-gray-500">Aucun tube déchargé pour le moment</p>
              </div>
            ) : (
              <ScrollArea className="h-48 border rounded-md p-2">
                <div className="space-y-2">
                  {removedTubes.map((tube) => (
                    <div key={tube.id} className="bg-green-50 p-2 rounded border border-green-200 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{tube.barcode}</span>
                        <Badge variant="outline" className="text-xs">
                          {tube.type}
                        </Badge>
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        Patient: {tube.patientId}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between space-x-4 mt-4">
        <Button variant="outline" onClick={resetBox}>
          Annuler
        </Button>
        <Button 
          onClick={handleFinishUnloading} 
          disabled={boxTubes.length > 0}
        >
          Terminer le déchargement
        </Button>
      </CardFooter>
    </Card>
  );
  
  return (
    <PageContainer title="Décharger une boîte">
      <div className="max-w-4xl mx-auto">
        {scanningState === "scanning_box" ? (
          renderBoxScanner()
        ) : scanningState === "scanning_tube" ? (
          renderTubeScanner()
        ) : currentBox ? (
          renderUnloadingBox()
        ) : (
          renderStartPage()
        )}
      </div>
    </PageContainer>
  );
}
