import { useState } from "react";
import { useLabContext } from "@/hooks/use-lab-context";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import PageContainer from "@/components/layout/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

type ImportStatus = "idle" | "uploading" | "success" | "error";

export default function ImportReaderPage() {
  const { currentLab } = useLabContext();
  const { toast } = useToast();
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [importStats, setImportStats] = useState({ total: 0, imported: 0 });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      toast({
        title: "Fichier sélectionné",
        description: `${files[0].name} (${(files[0].size / 1024).toFixed(2)} KB)`,
      });
    }
  };
  
  const handleImport = () => {
    if (!selectedFile) {
      toast({
        title: "Aucun fichier sélectionné",
        description: "Veuillez sélectionner un fichier d'export mémoire à importer.",
        variant: "destructive",
      });
      return;
    }
    
    setImportStatus("uploading");
    
    // Simulate import process with progress
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        setImportStatus("success");
        setImportStats({ total: Math.floor(20 + Math.random() * 30), imported: Math.floor(15 + Math.random() * 15) });
        
        toast({
          title: "Import réussi",
          description: "Les données du lecteur de mémoire ont été importées avec succès.",
        });
      }
    }, 200);
    
    // In a real implementation, we would use a FormData object to upload the file
    // and track the progress using XHR or fetch with a progress event listener
    
    return () => clearInterval(interval);
  };
  
  const reset = () => {
    setImportStatus("idle");
    setProgress(0);
    setSelectedFile(null);
  };
  
  return (
    <PageContainer title="Importer un lecteur de mémoire">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Import du lecteur de mémoire</CardTitle>
            <CardDescription>
              Importez les données du lecteur de mémoire pour enregistrer les tubes scannés en lot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {importStatus === "idle" && (
              <>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Déposez votre fichier d'export ici</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    ou cliquez pour parcourir votre ordinateur
                  </p>
                  <input
                    type="file"
                    id="file-upload"
                    accept=".csv,.txt,.xls,.xlsx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button asChild>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Parcourir
                    </label>
                  </Button>
                </div>
                
                {selectedFile && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-blue-500 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleImport}
                    disabled={!selectedFile}
                  >
                    Importer
                  </Button>
                </div>
              </>
            )}
            
            {importStatus === "uploading" && (
              <div className="text-center py-8">
                <Upload className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Import en cours...</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Veuillez patienter pendant que nous importons vos données
                </p>
                <Progress value={progress} className="w-full mb-4" />
                <p className="text-sm text-gray-500">{progress}% terminé</p>
              </div>
            )}
            
            {importStatus === "success" && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Import terminé avec succès</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Les données du lecteur de mémoire ont été importées
                </p>
                
                <div className="bg-gray-50 p-4 rounded-md max-w-xs mx-auto">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500">Total:</span>
                    <span className="font-medium">{importStats.total} tubes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Importés:</span>
                    <span className="font-medium">{importStats.imported} tubes</span>
                  </div>
                </div>
                
                <Button onClick={reset} className="mt-6">
                  Nouvel import
                </Button>
              </div>
            )}
            
            {importStatus === "error" && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Erreur d'import</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Un problème est survenu lors de l'import du fichier
                </p>
                <Button onClick={reset} variant="outline" className="mr-2">
                  Réessayer
                </Button>
                <Button onClick={reset}>
                  Nouvel import
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
