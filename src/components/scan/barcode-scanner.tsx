import { useState, useRef, useEffect } from "react";
import { ScanLine, Camera, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  scanning?: boolean;
  scanText?: string;
  buttonText?: string;
}

export function BarcodeScanner({
  onScan,
  scanning = false,
  scanText = "Positionnez le code-barres dans la zone de scan",
  buttonText = "Activer la caméra"
}: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(scanning);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Mock scan progress simulation
  useEffect(() => {
    if (!isScanning) return;
    
    let interval: NodeJS.Timeout;
    let mockBarcode = "TUBE-" + Math.floor(10000 + Math.random() * 90000);
    
    const simulateScan = () => {
      interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 100) {
            clearInterval(interval);
            // Simulate successful scan
            setTimeout(() => {
              onScan(mockBarcode);
              setIsScanning(false);
              setProgress(0);
            }, 500);
            return 100;
          }
          return newProgress;
        });
      }, 100);
    };
    
    simulateScan();
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScanning, onScan]);
  
  const handleActivateCamera = () => {
    // In a real implementation, this would request camera access
    setError(null);
    setIsScanning(true);
  };
  
  return (
    <div className="w-full">
      <Card className="border-2 border-dashed border-gray-300 bg-transparent">
        <CardContent className="p-6 text-center flex flex-col items-center">
          {error ? (
            <div className="text-center mb-4">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
              <p className="text-sm text-destructive mt-2">{error}</p>
            </div>
          ) : (
            <ScanLine className="h-12 w-12 text-gray-400 mb-2" />
          )}
          
          <p className="text-sm text-gray-500 mb-4">{scanText}</p>
          
          <Progress value={progress} className="w-full h-2 mb-6" />
          
          <Button 
            onClick={handleActivateCamera}
            disabled={isScanning}
            className="w-full"
          >
            <Camera className="mr-2 h-4 w-4" />
            {buttonText}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default BarcodeScanner;
