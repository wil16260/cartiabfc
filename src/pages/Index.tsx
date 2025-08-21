import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Brain, Sparkles } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import SmartFileProcessor from "@/components/SmartFileProcessor";
import UMapDisplay from "@/components/UMapDisplay";
import FilterPanel from "@/components/FilterPanel";
import SearchBar from "@/components/SearchBar";
import ProgressBar from "@/components/ProgressBar";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Index = () => {
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [generatedMapData, setGeneratedMapData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [mapLayers, setMapLayers] = useState<Array<{
    id: string;
    name: string;
    enabled: boolean;
    description?: string;
    type?: 'base' | 'ai' | 'data';
    color?: string;
    opacity?: number;
  }>>([
    { 
      id: 'base_departments', 
      name: 'Limites départementales', 
      enabled: true, 
      description: 'Contours des départements',
      type: 'base' as const,
      color: '#6366f1',
      opacity: 0.7
    },
    { 
      id: 'base_epci', 
      name: 'EPCI', 
      enabled: false, 
      description: 'Établissements publics de coopération intercommunale',
      type: 'base' as const,
      color: '#8b5cf6',
      opacity: 0.7
    },
    { 
      id: 'base_communes', 
      name: 'Communes', 
      enabled: false, 
      description: 'Contours des communes',
      type: 'base' as const,
      color: '#10b981',
      opacity: 0.7
    }
  ]);

  const handleFilesUploaded = (files: File[]) => {
    setUploadedFiles(files);
  };

  const handleMapLayerAdd = (layerData: any) => {
    if (layerData.type === 'file' && uploadedFiles.length > 0) {
      const file = uploadedFiles.find(f => f.name === layerData.fileName);
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            let parsedData;
            
            if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
              parsedData = JSON.parse(content);
            } else if (file.name.endsWith('.csv')) {
              console.log('CSV file detected, processing...');
              return;
            }

            const newLayer = {
              id: `file_${Date.now()}`,
              name: layerData.name || file.name,
              enabled: true,
              description: `Uploaded file: ${file.name}`,
              type: 'data' as const,
              color: layerData.color || '#f59e0b',
              opacity: layerData.opacity || 0.7,
              data: parsedData
            };

            setMapLayers(prev => [...prev, newLayer]);
            toast.success(`Couche "${newLayer.name}" ajoutée avec succès`);
          } catch (error) {
            console.error('Error parsing file:', error);
            toast.error(`Erreur lors du traitement du fichier ${file.name}`);
          }
        };
        reader.readAsText(file);
      }
    } else {
      const newLayer = {
        id: `layer_${Date.now()}`,
        name: layerData.name,
        enabled: true,
        description: layerData.description || '',
        type: layerData.type || 'data' as const,
        color: layerData.color || '#3b82f6',
        opacity: layerData.opacity || 0.7,
        data: layerData.data
      };

      setMapLayers(prev => [...prev, newLayer]);
      toast.success(`Couche "${newLayer.name}" ajoutée avec succès`);
    }
  };

  const handleLayerToggle = (layerId: string, enabled: boolean) => {
    setMapLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, enabled } : layer
    ));
  };

  const handleLayerStyleChange = (layerId: string, style: { color?: string; opacity?: number }) => {
    setMapLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, ...style } : layer
    ));
  };

  const handleLayerDelete = (layerId: string) => {
    setMapLayers(prev => prev.filter(layer => layer.id !== layerId));
    toast.success("Couche supprimée");
  };

  const handleAIGeneration = async (prompt: string) => {
    setIsGenerating(true);
    setShowProgress(true);
    setShowAIAnalysis(false);

    try {
      console.log('Generating map with AI...');
      const generateResponse = await supabase.functions.invoke('rag-enhanced-map-generation', {
        body: { 
          prompt,
          step: 1,
          dataLevel: 'communes',
          recommendedMapType: 'geocodage'
        }
      });

      if (generateResponse.error) {
        throw new Error(`Generation error: ${generateResponse.error.message}`);
      }

      console.log('Map generation response:', generateResponse.data);

      // Check if response contains GeoJSON data directly
      if (generateResponse.data && generateResponse.data.type === 'FeatureCollection') {
        const geojsonData = generateResponse.data;
        console.log('Generated GeoJSON with', geojsonData.features?.length || 0, 'features');
        
        setGeneratedMapData(geojsonData);
        
        // Add AI layer to map
        const aiLayer = {
          id: `ai_${Date.now()}`,
          name: `IA: ${prompt}`,
          enabled: true,
          description: `Carte générée par IA`,
          type: 'ai' as const,
          color: '#f59e0b',
          opacity: 0.8,
          data: geojsonData
        };
        
        setMapLayers(prev => [...prev, aiLayer]);
        toast.success(`Carte générée avec succès! ${geojsonData.features?.length || 0} éléments créés`);
      } else {
        toast.error("L'IA n'a pas généré de données géographiques valides");
      }

    } catch (error) {
      console.error('Error in handleAIGeneration:', error);
      toast.error(`Erreur lors de la génération: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsGenerating(false);
      setShowProgress(false);
    }
  };

  const visibleLayers = mapLayers.filter(layer => layer.enabled).map(layer => layer.id);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="container mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            Carte Interactive de Bourgogne-Franche-Comté
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Visualisez les données géographiques avec IA, limites départementales, EPCI et communes
          </p>
          
          <div className="bg-card/50 backdrop-blur-sm rounded-lg border p-6 mb-6">
            <SearchBar 
              onSearch={handleAIGeneration} 
              isLoading={isGenerating}
            />
          </div>
          
          <div className="flex justify-center gap-4">
            <Button 
              onClick={() => setShowFileUpload(!showFileUpload)}
              variant="outline"
              size="lg"
              className="group"
            >
              <Upload className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
              Importer des fichiers
            </Button>
            
            {generatedMapData && (
              <Button
                onClick={() => setShowAIAnalysis(!showAIAnalysis)}
                variant="outline"
                size="lg"
                className="group"
              >
                <Sparkles className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                Voir l'analyse IA
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="mb-6">
            <ProgressBar isActive={showProgress} />
          </div>
        )}

        {/* File Upload Section */}
        {showFileUpload && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import de fichiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload onFilesUploaded={handleFilesUploaded} />
              <SmartFileProcessor 
                uploadedFiles={uploadedFiles} 
                onMapLayerAdd={handleMapLayerAdd}
              />
            </CardContent>
          </Card>
        )}

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1">
            <FilterPanel 
              layers={mapLayers}
              onLayerToggle={handleLayerToggle}
              onLayerStyleChange={handleLayerStyleChange}
              onLayerDelete={handleLayerDelete}
            />
            
            {/* AI Analysis Panel */}
            {showAIAnalysis && generatedMapData && (
              <div className="mt-6">
                <AIAnalysisPanel 
                  generatedMap={generatedMapData} 
                  isVisible={showAIAnalysis}
                />
              </div>
            )}
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-2">
            <UMapDisplay 
              visibleLayers={visibleLayers}
              layers={mapLayers}
              generatedMap={generatedMapData}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;