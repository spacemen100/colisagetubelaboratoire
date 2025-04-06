import { useState } from "react";
import { useLabContext } from "@/hooks/use-lab-context";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Boxes, ArrowRight, Scan, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Box, Tube } from "@shared/schema";
import PageContainer from "@/components/layout/page-container";
import BarcodeScanner from "@/components/scan/barcode-scanner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

type ScanningState = "idle" | "scanning_source" | "scanning_target";

interface BoxWithTubes {
  box: Box;
  tubes: Tube[];
}

export default function MergeBoxesPage() {
  const { currentLab } = useLabContext();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [scanningState, setScanningState] = useState<ScanningState>("idle");
  const [sourceBox, setSourceBox] = useState<Box | null>(null);
  const [sourceTubes, setSourceTubes] = useState<Tube[]>([]);
  const [targetBox, setTargetBox] = useState<Box | null>(null);
  const [targetTubes, setTargetTubes] = useState<Tube[]>([]);
  
  // Query for getting available boxes
  const { data: availableBoxes = [], refetch: refetchBoxes } = useQuery<Box[]>({
    queryKey: [currentLab ? `/api/labs/${currentLab.id}/boxes` : null, "open"],
    enabled: !!currentLab,
  });
  
  // Mutation for scanning a box
  const scanBoxMutation = useMutation({
    mutationFn: async (barcode: string) => {
      const res = await apiRequest("GET", `/api/boxes/${barcode}`);
      return await res.json() as BoxWithTubes;
    },
    onSuccess: (data) => {
      if (scanningState === "scanning_source") {
        setSourceBox(data.box);
        setSourceTubes(data.tubes || []);
      } else if (scanningState === "scanning_target") {
        setTargetBox(data.box);
        setTargetTubes(data.tubes || []);
      }
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
  
  // Mutation for merging boxes
  const mergeBoxesMutation = useMutation({
    mutationFn: async (data: { sourceBoxId: number; targetBoxId: number; }) => {
      const res = await apiRequest("POST", "/api/boxes/merge", data);
      return await res.json() as Box;
    },
    onSuccess: (box) => {
      toast({
        title: "Boîtes fusionnées",
        description: `Les boîtes ont été fusionnées avec succès.`,
      });
      // Reset the form
      setSourceBox(null);
      setSourceTubes([]);
      setTargetBox(null);
      setTargetTubes([]);
      // Invalidate queries to update dashboard
      if (currentLab) {
        queryClient.invalidateQueries({ queryKey: [`/api/labs/${currentLab.id}/dashboard`] });
        refetchBoxes();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la fusion des boîtes.",
        variant: "destructive",
      });
    },
  });
  
  const handleScanBox = (barcode: string) => {
    scanBoxMutation.mutate(barcode);
  };
  
  const handleMergeBoxes = () => {
    if (!sourceBox || !targetBox) return;
    
    mergeBoxesMutation.mutate({
      sourceBoxId: sourceBox.id,
      targetBoxId: targetBox.id
    });
  };
  
  const startSourceBoxScan = () => {
    setScanningState("scanning_source");
  };
  
  const startTargetBoxScan = () => {
    setScanningState("scanning_target");
  };
  
  const cancelScan = () => {
    setScanningState("idle");
  };
  
  const resetBoxes = () => {
    setSourceBox(null);
    setSourceTubes([]);
    setTargetBox(null);
    setTargetTubes([]);
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
        <CardTitle className="text-lg">
          Scanner une boîte {scanningState === "scanning_source" ? "source" : "cible"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BarcodeScanner 
          onScan={handleScanBox}
          scanning={true} 
          scanText={`Positionnez le code-barres de la boîte ${scanningState === "scanning_source" ? "source" : "cible"} dans la zone de scan`}
        />
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="outline" onClick={cancelScan}>
          Annuler
        </Button>
      </CardFooter>
    </Card>
  );
  
  const renderBoxCard = (box: Box | null, tubes: Tube[], isSource: boolean) => (
    <Card className={box ? "" : "border-dashed"}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">
            {isSource ? "Boîte source" : "Boîte cible"}
          </CardTitle>
          {box && (
            <Badge variant={getTemperatureColor(box.temperatureType)}>
              {getTemperatureDisplay(box.temperatureType)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="min-h-[200px] flex flex-col justify-center">
        {box ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="font-medium">{box.barcode}</p>
              <p className="text-sm">
                <span className="text-gray-500">Tubes:</span> {box.tubeCount}
              </p>
            </div>
            
            <ScrollArea className="h-32 border rounded-md p-2">
              {tubes.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Aucun tube dans cette boîte
                </p>
              ) : (
                <div className="space-y-2">
                  {tubes.map((tube) => (
                    <div key={tube.id} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                      <span className="font-medium">{tube.barcode}</span>
                      <span className="text-gray-500 text-xs ml-2">({tube.type})</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="text-center">
            <Scan className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {isSource ? "Scanner la boîte source" : "Scanner la boîte cible"}
            </p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={isSource ? startSourceBoxScan : startTargetBoxScan}
            >
              Scanner
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  const renderMergeInstructions = () => {
    // Check if boxes have compatible temperature types
    const isCompatible = sourceBox && targetBox && sourceBox.temperatureType === targetBox.temperatureType;
    
    return (
      <Card className="mt-6">
        <CardContent className="pt-6">
          {!sourceBox || !targetBox ? (
            <div className="text-center py-4">
              <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="font-medium">Veuillez sélectionner deux boîtes pour les fusionner</p>
            </div>
          ) : !isCompatible ? (
            <div className="text-center py-4">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="font-medium text-red-500">Types de température incompatibles</p>
              <p className="text-sm text-gray-500 mt-1">
                Les boîtes doivent avoir le même type de température pour être fusionnées
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-green-500">Boîtes compatibles</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Tous les tubes de la boîte source seront déplacés vers la boîte cible
              </p>
              <Button 
                onClick={handleMergeBoxes} 
                disabled={mergeBoxesMutation.isPending}
                className="mx-auto"
              >
                {mergeBoxesMutation.isPending ? "Fusion en cours..." : "Fusionner les boîtes"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };
  
  return (
    <PageContainer title="Fusionner les boîtes">
      {scanningState !== "idle" ? (
        <div className="max-w-2xl mx-auto">
          {renderBoxScanner()}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch max-w-4xl mx-auto">
            {renderBoxCard(sourceBox, sourceTubes, true)}
            
            <div className="flex items-center justify-center">
              <div className="hidden md:block">
                <ArrowRight className="h-10 w-10 text-gray-400" />
              </div>
              <div className="block md:hidden">
                <ArrowRight className="h-10 w-10 text-gray-400 rotate-90" />
              </div>
            </div>
            
            {renderBoxCard(targetBox, targetTubes, false)}
          </div>
          
          {renderMergeInstructions()}
          
          <div className="flex justify-center mt-6">
            <Button variant="outline" onClick={resetBoxes}>
              Réinitialiser
            </Button>
          </div>
        </>
      )}
    </PageContainer>
  );
}
