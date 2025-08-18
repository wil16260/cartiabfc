
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Upload } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import FileUpload from "@/components/FileUpload";
import DirectDataJoin from "@/components/DirectDataJoin";
import UMapDisplay from "@/components/UMapDisplay";
import FilterPanel from "@/components/FilterPanel";
import ProgressBar from "@/components/ProgressBar";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const Index = () => {
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [generatedMap, setGeneratedMap] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [mapLayers, setMapLayers] = useState([
    { 
      id: 'base_departments', 
      name: 'Limites départementales', 
      enabled: true, 
      description: 'Contours des départements' 
    },
    { 
      id: 'base_epci', 
      name: 'EPCI', 
      enabled: false, 
      description: 'Établissements publics de coopération intercommunale' 
    },
    { 
      id: 'base_communes', 
      name: 'Communes', 
      enabled: false, 
      description: 'Contours des communes' 
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
      description: 'Données de population par territoire' 
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
    setShowProgress(true);
    
    try {
      
      // Step 1: Analysis - AI will automatically choose the best map type
      console.log('Step 1: Analyzing request...');
      const { data: step1Data, error: step1Error } = await supabase.functions.invoke('rag-enhanced-map-generation', {
        body: { 
          prompt: prompt,
          step: 1
        }
      });

      if (step1Error) {
        console.error('Step 1 error:', step1Error);
        throw new Error('Failed to analyze request');
      }

      if (!step1Data?.success) {
        console.error('Step 1 failed:', step1Data);
        throw new Error(step1Data?.error || 'Failed to analyze request');
      }

      console.log('Step 1 response:', step1Data);
      
      // Step 2: Generate based on analysis - AI chooses optimal map type
      console.log('Step 2: Generating map...');
      const { data: step2Data, error: step2Error } = await supabase.functions.invoke('rag-enhanced-map-generation', {
        body: { 
          prompt: prompt,
          step: 2
        }
      });

      if (step2Error) {
        console.error('Step 2 error:', step2Error);
        throw new Error('Failed to generate map data');
      }

      if (!step2Data?.success) {
        console.error('Step 2 failed:', step2Data);
        throw new Error(step2Data?.error || 'Failed to generate map data');
      }

      console.log('Step 2 response:', step2Data);
      
      // Update map layers based on AI response
      if (step1Data.dataLevel || step2Data.dataLevel) {
        const dataLevel = step1Data.dataLevel || step2Data.dataLevel;
        const newLayers = mapLayers.map(layer => ({
          ...layer,
          enabled: shouldEnableLayer(layer.id, dataLevel)
        }));
        setMapLayers(newLayers);
      }
      
      toast.success("Carte générée avec succès!");
      
    } catch (error) {
      console.error('Error generating map:', error);
      toast.error(`Erreur lors de la génération de la carte: ${error.message}`);
      setShowProgress(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProgressComplete = () => {
    setShowProgress(false);
  };

  const shouldEnableLayer = (layerId: string, dataLevel: string) => {
    // Always show department boundaries as reference
    if (layerId === 'base_departments') return true;
    
    // Enable appropriate geographic layers based on data level
    if (layerId === 'base_communes' && dataLevel === 'communes') return true;
    if (layerId === 'base_epci' && dataLevel === 'epci') return true;
    if (layerId === 'base_departments' && dataLevel === 'departments') return true;
    
    // Enable population layer for data visualization
    if (layerId === 'data_population' && ['communes', 'epci', 'departments'].includes(dataLevel)) {
      return true;
    }
    
    return false;
  };

  const handleFilesUploaded = (files: File[]) => {
    setUploadedFiles(files);
  };

  const handleDirectJoinComplete = (geojsonData: any) => {
    // Process the joined data similar to AI response
    const updatedLayers = mapLayers.map(layer => ({
      ...layer,
      enabled: layer.id === 'base_departments' || layer.id === 'data_population'
    }));
    setMapLayers(updatedLayers);
    setGeneratedMap(geojsonData);
    setShowProgress(false);
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
              Décrivez votre carte interactive
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
        <SearchBar 
          onSearch={handleSearch} 
          isLoading={isGenerating}
        />
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
            <DirectDataJoin 
              uploadedFiles={uploadedFiles} 
              onJoinComplete={handleDirectJoinComplete}
            />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Bar */}
        {showProgress && (
          <div className="mb-6">
            <ProgressBar 
              isActive={showProgress} 
              onComplete={handleProgressComplete}
              duration={6000}
            />
          </div>
        )}

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Layers */}
          <div className="lg:col-span-1">
            <FilterPanel 
              layers={mapLayers}
              onLayerToggle={handleLayerToggle}
            />
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-4">
            <UMapDisplay 
              prompt={currentPrompt} 
              isLoading={isGenerating}
              visibleLayers={visibleLayers}
              generatedMap={generatedMap}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
