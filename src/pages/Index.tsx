
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Upload } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import FileUpload from "@/components/FileUpload";
import LeafletMap from "@/components/LeafletMap";
import FilterPanel from "@/components/FilterPanel";

const Index = () => {
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [mapLayers, setMapLayers] = useState([
    { 
      id: 'base_departments', 
      name: 'Limites départementales', 
      enabled: true, 
      description: 'Contours des départements' 
    },
    { 
      id: 'base_ign', 
      name: 'Plan IGN', 
      enabled: false, 
      description: 'Carte topographique IGN' 
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

  const [mapTypes, setMapTypes] = useState([
    {
      id: 'geocodage',
      name: 'Géocodage',
      enabled: false,
      description: 'Ajouter des points sur la carte avec des éléments géolocalisés'
    },
    {
      id: 'chloroplethe',
      name: 'Choroplèthe',
      enabled: false,
      description: 'Joindre des données aux communes, EPCI ou départements'
    },
    {
      id: 'complexe',
      name: 'Carte complexe',
      enabled: false,
      description: 'Créer des cartes avancées avec plusieurs formes et couches'
    }
  ]);

  const handleSearch = async (prompt: string) => {
    setCurrentPrompt(prompt);
    setIsGenerating(true);
    
    // Get enabled map types to enhance the prompt
    const enabledMapTypes = mapTypes.filter(type => type.enabled).map(type => type.id);
    const enhancedPrompt = enabledMapTypes.length > 0 
      ? `${prompt} [Types de cartes souhaités: ${enabledMapTypes.join(', ')}]`
      : prompt;
    
    try {
      const response = await fetch('/api/generate-map-with-mistral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: enhancedPrompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate map');
      }

      const data = await response.json();
      
      if (data.success && data.mapData.layers) {
        // Activate suggested layers
        const suggestedLayers = data.mapData.layers;
        setMapLayers(prev => 
          prev.map(layer => ({
            ...layer,
            enabled: layer.id === 'base_departments' || suggestedLayers.includes(layer.id)
          }))
        );
      }
    } catch (error) {
      console.error('Error generating map:', error);
    } finally {
      setIsGenerating(false);
    }
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

  const handleMapTypeToggle = (mapTypeId: string, enabled: boolean) => {
    setMapTypes(prev => 
      prev.map(mapType => 
        mapType.id === mapTypeId 
          ? { ...mapType, enabled }
          : mapType
      )
    );
  };

  const visibleLayers = mapLayers.filter(layer => layer.enabled).map(layer => layer.id);

  // Debug logging
  console.log('MapTypes state:', mapTypes);
  console.log('MapLayers state:', mapLayers);


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
          <CardContent className="space-y-4">
            <SearchBar onSearch={handleSearch} isLoading={isGenerating} />
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFileUpload(!showFileUpload)}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Fichiers
              </Button>
              <span className="text-sm text-muted-foreground">
                Excel, CSV, GeoJSON, GPKG, KML acceptés
              </span>
            </div>
            {showFileUpload && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                <FileUpload onFilesUploaded={handleFilesUploaded} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Layers */}
          <div className="lg:col-span-1">
            <FilterPanel 
              layers={mapLayers}
              mapTypes={mapTypes}
              onLayerToggle={handleLayerToggle}
              onMapTypeToggle={handleMapTypeToggle}
            />
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-4">
            <LeafletMap 
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
