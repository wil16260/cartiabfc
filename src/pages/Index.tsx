
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, FileText } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import FileUpload from "@/components/FileUpload";
import MapDisplay from "@/components/MapDisplay";
import FilterPanel from "@/components/FilterPanel";

const Index = () => {
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mapLayers, setMapLayers] = useState([
    { 
      id: 'base_departments', 
      name: 'Départements français', 
      enabled: true, 
      description: 'Couche de base obligatoire avec les limites départementales' 
    },
    { 
      id: 'data_population', 
      name: 'Population', 
      enabled: false, 
      description: 'Données de population par département' 
    },
    { 
      id: 'data_unemployment', 
      name: 'Taux de chômage', 
      enabled: false, 
      description: 'Statistiques du chômage' 
    },
    { 
      id: 'data_density', 
      name: 'Densité', 
      enabled: false, 
      description: 'Densité de population' 
    }
  ]);

  const handleSearch = async (prompt: string) => {
    setCurrentPrompt(prompt);
    setIsGenerating(true);
    
    // Simulate AI processing time
    setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
  };

  const handleFilesUploaded = (files: File[]) => {
    setUploadedFiles(files);
  };

  const handleLayerToggle = (layerId: string, enabled: boolean) => {
    setMapLayers(prev => 
      prev.map(layer => 
        layer.id === layerId 
          ? { ...layer, enabled }
          : layer
      )
    );
  };

  const visibleLayers = mapLayers.filter(layer => layer.enabled).map(layer => layer.id);


  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="container mx-auto px-4 py-6">
        {/* Search Section */}
        <Card className="shadow-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Décrivez votre carte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SearchBar onSearch={handleSearch} isLoading={isGenerating} />
          </CardContent>
        </Card>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Télécharger des géodonnées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload onFilesUploaded={handleFilesUploaded} />
              </CardContent>
            </Card>

            <FilterPanel 
              layers={mapLayers} 
              onLayerToggle={handleLayerToggle} 
            />
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-3">
            <MapDisplay 
              prompt={currentPrompt} 
              isLoading={isGenerating}
              visibleLayers={visibleLayers}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
