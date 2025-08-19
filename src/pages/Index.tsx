
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Upload } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import FileUpload from "@/components/FileUpload";
import SmartFileProcessor from "@/components/SmartFileProcessor";
import UMapDisplay from "@/components/UMapDisplay";
import FilterPanel from "@/components/FilterPanel";
import ProgressBar from "@/components/ProgressBar";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Index = () => {
  const { user } = useAuth();
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [generatedMap, setGeneratedMap] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
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
      color: '#06b6d4',
      opacity: 0.7
    }
  ]);

  // Load generated GeoJSON data from database
  useEffect(() => {
    const loadGeneratedGeoJSON = async () => {
      if (!user) return;

      try {
        // Load user's generated GeoJSON data
        const { data: generatedData, error } = await supabase
          .from('generated_geojson')
          .select('*')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading generated GeoJSON:', error);
          return;
        }

        // Add generated layers to map
        if (generatedData && generatedData.length > 0) {
          const generatedLayers = generatedData.map((item, index) => ({
            id: `generated_${item.id}`,
            name: item.name,
            enabled: false,
            description: item.description || 'Couche générée par IA',
            type: 'ai' as const,
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`, // Random color
            opacity: 0.8,
            geojsonData: item.geojson_data
          }));

          setMapLayers(prev => [
            ...prev.filter(layer => !layer.id.startsWith('generated_')), // Remove old generated layers
            ...generatedLayers
          ]);
        }
      } catch (error) {
        console.error('Error loading generated GeoJSON:', error);
      }
    };

    loadGeneratedGeoJSON();
  }, [user]);

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

      // Step 3: Get the last log with GeoJSON geometry for map generation
      console.log('Step 3: Fetching last GeoJSON log...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: logs, error: logsError } = await supabase
          .from('ai_generation_logs')
          .select('*')
          .eq('created_by', user.id)
          .not('ai_response', 'is', null)
          .order('created_at', { ascending: false })
          .limit(3);

        if (!logsError && logs && logs.length > 0) {
          // Find the log that contains actual geometry data with valid coordinates
          const lastLogWithGeometry = logs.find(log => {
            const response = log.ai_response as any;
            if (!response || typeof response !== 'object') return false;
            
            // Check for geocoding with valid coordinates
            if (response.type === 'geocodage' && Array.isArray(response.addresses)) {
              return response.addresses.some((addr: any) => 
                addr.latitude && addr.longitude && 
                addr.latitude !== 0 && addr.longitude !== 0
              );
            }
            
            // Check for other geometry types
            if (response.type === 'choroplèthe' && response.dataLevel) return true;
            if (response.type === 'complexe' && response.layers) return true;
            if (response.geojson) return true;
            
            // Check for any addresses array with valid coordinates
            if (response.addresses && Array.isArray(response.addresses)) {
              return response.addresses.some((addr: any) => 
                addr.latitude && addr.longitude && 
                addr.latitude !== 0 && addr.longitude !== 0
              );
            }
            
            return false;
          });

          if (lastLogWithGeometry) {
            console.log('Found log with geometry:', lastLogWithGeometry);
            const geometryData = lastLogWithGeometry.ai_response as any;
            
            // Convert AI response to map layer if it contains geometric data
            if (geometryData && typeof geometryData === 'object' && 
                geometryData.type === 'geocodage' && 
                Array.isArray(geometryData.addresses)) {
              
              const geojsonFeatures = geometryData.addresses.map((addr: any) => ({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [addr.longitude, addr.latitude]
                },
                properties: {
                  ...(addr.properties || {}),
                  address: addr.address,
                  codeINSEE: addr.codeINSEE
                }
              }));
              
              const geojsonData = {
                type: 'FeatureCollection',
                features: geojsonFeatures
              };

              const aiLayerId = `ai_${Date.now()}`;
              const aiLayer = {
                id: aiLayerId,
                name: geometryData.title || 'Données géolocalisées',
                enabled: true,
                data: geojsonData,
                visible: true,
                type: 'ai' as const,
                style: {
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.6,
                  weight: 2
                }
              };
              
              setMapLayers(prev => [...prev, aiLayer]);
              setGeneratedMap({ ...geometryData, geojson: geojsonData });
              
              console.log('Added geocoded points to map:', geojsonFeatures.length, 'features');
            }
          }
        }
      }
      
      // Update base map layers based on AI response
      if (step1Data.dataLevel || step2Data.dataLevel) {
        const dataLevel = step1Data.dataLevel || step2Data.dataLevel;
        const newLayers = mapLayers.map(layer => ({
          ...layer,
          enabled: shouldEnableLayer(layer.id, dataLevel)
        }));
        
        setMapLayers(prev => [
          ...newLayers.filter(l => l.type !== 'ai'),
          ...prev.filter(l => l.type === 'ai')
        ]);
      }
      
      setShowAIAnalysis(true);
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

  const handleMapLayerAdd = (layerData: any) => {
    // Add new layer to map layers
    setMapLayers(prev => [...prev, layerData]);
    
    // If it's joined data, also set as generated map
    if (layerData.type === 'joined-data') {
      setGeneratedMap(layerData.data);
    }
    
    toast.success(`Couche "${layerData.name}" ajoutée à la carte`);
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

  const handleLayerStyleChange = (layerId: string, style: { color?: string; opacity?: number }) => {
    setMapLayers(prev => 
      prev.map(layer => 
        layer.id === layerId 
          ? { ...layer, ...style }
          : layer
      )
    );
  };

  const handleLayerDelete = (layerId: string) => {
    setMapLayers(prev => prev.filter(layer => layer.id !== layerId));
    toast.success("Couche supprimée");
  };

  const handleAddLayer = () => {
    toast.info("Fonctionnalité d'ajout de couche à venir");
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
            <SmartFileProcessor 
              uploadedFiles={uploadedFiles} 
              onMapLayerAdd={handleMapLayerAdd}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1 space-y-6">
            <FilterPanel 
              layers={mapLayers}
              onLayerToggle={handleLayerToggle}
              onLayerStyleChange={handleLayerStyleChange}
              onLayerDelete={handleLayerDelete}
              onAddLayer={handleAddLayer}
            />
            <AIAnalysisPanel 
              generatedMap={generatedMap}
              isVisible={showAIAnalysis}
            />
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-2">
            <UMapDisplay 
              prompt={currentPrompt} 
              isLoading={isGenerating}
              visibleLayers={visibleLayers}
              generatedMap={generatedMap}
              layers={mapLayers}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
