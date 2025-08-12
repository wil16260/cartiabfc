
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Upload, Map } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import FileUpload from "@/components/FileUpload";
import MapDisplay from "@/components/MapDisplay";
import LeafletMap from "@/components/LeafletMap";
import D3MapDisplay from "@/components/D3MapDisplay";
import UMapDisplay from "@/components/UMapDisplay";
import FilterPanel from "@/components/FilterPanel";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const Index = () => {
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedMapEngine, setSelectedMapEngine] = useState<'mapbox' | 'leaflet' | 'd3' | 'umap'>('leaflet');
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
    
    try {
      // Enhanced prompt with selected map types
      const mapTypesText = mapTypes
        .filter(type => type.enabled)
        .map(type => type.name)
        .join(', ');
      
      const enhancedPrompt = mapTypesText 
        ? `${prompt}. Types de cartes à considérer: ${mapTypesText}`
        : prompt;

      console.log('Sending enhanced prompt:', enhancedPrompt);
      
      const { data, error } = await supabase.functions.invoke('generate-map-with-mistral', {
        body: { prompt: enhancedPrompt }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error('Failed to generate map');
      }

      if (!data?.success) {
        console.error('Map generation failed:', data);
        throw new Error(data?.error || 'Failed to generate map');
      }

      console.log('AI response:', data);
      
      // Update map layers based on AI response
      if (data.mapData?.dataLevel) {
        const newLayers = mapLayers.map(layer => ({
          ...layer,
          enabled: shouldEnableLayer(layer.id, data.mapData.dataLevel)
        }));
        setMapLayers(newLayers);
      }
      
      toast.success("Carte générée avec succès!");
      
    } catch (error) {
      console.error('Error generating map:', error);
      toast.error(`Erreur lors de la génération de la carte: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const shouldEnableLayer = (layerId: string, dataLevel: string) => {
    // Always show department boundaries as reference
    if (layerId === 'base_departments') return true;
    
    // Enable population layer for data visualization
    if (layerId === 'data_population' && ['communes', 'epci', 'departments'].includes(dataLevel)) {
      return true;
    }
    
    return false;
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Moteur cartographique:</span>
              </div>
              <Select value={selectedMapEngine} onValueChange={(value: any) => setSelectedMapEngine(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leaflet">Leaflet (Gratuit)</SelectItem>
                  <SelectItem value="d3">D3.js (Gratuit)</SelectItem>
                  <SelectItem value="umap">uMap Style (Gratuit)</SelectItem>
                  <SelectItem value="mapbox">Mapbox (Token requis)</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            {selectedMapEngine === 'mapbox' && (
              <MapDisplay 
                prompt={currentPrompt} 
                isLoading={isGenerating}
                visibleLayers={visibleLayers}
              />
            )}
            {selectedMapEngine === 'leaflet' && (
              <LeafletMap 
                prompt={currentPrompt} 
                isLoading={isGenerating}
                visibleLayers={visibleLayers}
              />
            )}
            {selectedMapEngine === 'd3' && (
              <D3MapDisplay 
                prompt={currentPrompt} 
                isLoading={isGenerating}
                visibleLayers={visibleLayers}
              />
            )}
            {selectedMapEngine === 'umap' && (
              <UMapDisplay 
                prompt={currentPrompt} 
                isLoading={isGenerating}
                visibleLayers={visibleLayers}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
