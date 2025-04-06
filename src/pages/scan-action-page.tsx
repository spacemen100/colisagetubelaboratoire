import { useState } from "react";
import { useLabContext } from "@/hooks/use-lab-context";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { BadgeInfo, Thermometer, Scan } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Tube, temperatureTypes } from "@shared/schema";
import PageContainer from "@/components/layout/page-container";
import BarcodeScanner from "@/components/scan/barcode-scanner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ScanActionPage() {
  const { currentLab } = useLabContext();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isScanning, setIsScanning] = useState(false);
  const [scannedTube, setScannedTube] = useState<Tube | null>(null);
  const [selectedTemp, setSelectedTemp] = useState<string | null>(null);
  
  // Mutation for getting tube info by barcode
  const scanTubeMutation = useMutation({
    mutationFn: async (barcode: string) => {
      const res = await apiRequest("GET", `/api/tubes/${barcode}`);
      return await res.json() as Tube;
    },
    onSuccess: (data) => {
      setScannedTube(data);
      setIsScanning(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur de scan",
        description: error.message || "Tube non trouvé. Veuillez réessayer.",
        variant: "destructive",
      });
      setIsScanning(false);
    },
  });
  
  // Mutation for assigning an action (temperature) to the tube
  const assignActionMutation = useMutation({
    mutationFn: async (data: { barcode: string; temperatureRequirement: string }) => {
      const res = await apiRequest("POST", "/api/tubes/scan-action", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Action assignée",
        description: `Le tube a été assigné à la température ${getTemperatureDisplay(selectedTemp!)}.`,
      });
      // Reset the form
      setScannedTube(null);
      setSelectedTemp(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de l'assignation de l'action.",
        variant: "destructive",
      });
    },
  });
  
  const handleScan = (barcode: string) => {
    scanTubeMutation.mutate(barcode);
  };
  
  const handleSelectTemperature = (temp: string) => {
    setSelectedTemp(temp);
  };
  
  const handleConfirm = () => {
    if (!scannedTube || !selectedTemp) return;
    
    assignActionMutation.mutate({
      barcode: scannedTube.barcode,
      temperatureRequirement: selectedTemp
    });
  };
  
  const handleCancel = () => {
    setScannedTube(null);
    setSelectedTemp(null);
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
        return "text-green-600 bg-green-50 border-green-500";
      case "cold":
        return "text-blue-600 bg-blue-50 border-blue-500";
      case "frozen":
        return "text-purple-600 bg-purple-50 border-purple-500";
      default:
        return "text-gray-600 bg-gray-50 border-gray-500";
    }
  };
  
  return (
    <PageContainer title="Effectuer une action">
      <div className="max-w-2xl mx-auto">
        {!scannedTube ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scanner un tube</CardTitle>
            </CardHeader>
            <CardContent>
              {isScanning ? (
                <BarcodeScanner 
                  onScan={handleScan}
                  scanning={true} 
                  scanText="Positionnez le code-barres du tube dans la zone de scan"
                />
              ) : (
                <div className="text-center py-8">
                  <Scan className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Scanner un tube pour effectuer une action</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Scannez le code-barres d'un tube pour lui assigner une exigence de température
                  </p>
                  <Button onClick={startScanning}>
                    Commencer le scan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assigner une action au tube</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <h4 className="font-medium text-gray-800 mb-2">Tube {scannedTube.barcode}</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2 font-medium">{scannedTube.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Patient ID:</span>
                    <span className="ml-2 font-medium">{scannedTube.patientId}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Date de prélèvement:</span>
                    <span className="ml-2 font-medium">
                      {new Date(scannedTube.collectionDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="ml-2 font-medium">{scannedTube.status}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner le type de stockage
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {temperatureTypes.map((temp) => (
                    <button
                      key={temp}
                      onClick={() => handleSelectTemperature(temp)}
                      className={`border rounded-md py-2 px-3 flex flex-col items-center ${
                        selectedTemp === temp
                          ? getTemperatureColor(temp)
                          : "bg-white border-gray-300"
                      }`}
                    >
                      <Thermometer className={selectedTemp === temp ? "text-inherit" : "text-gray-400"} />
                      <span className="text-xs mt-1 font-medium">
                        {getTemperatureDisplay(temp)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="rounded-md bg-blue-50 p-4 mt-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <BadgeInfo className="h-5 w-5 text-blue-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3 flex-1 md:flex md:justify-between">
                    <p className="text-sm text-blue-700">
                      L'exigence de température détermine dans quel type de boîte ce tube sera placé pour le transport.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-4">
              <Button variant="outline" onClick={handleCancel}>
                Annuler
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={!selectedTemp || assignActionMutation.isPending}
              >
                {assignActionMutation.isPending ? "En cours..." : "Confirmer"}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
