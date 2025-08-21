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

const AIMap = () => {
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
      color: '#10b981',
      opacity: 0.7
    }
  ]);

  useEffect(() => {
    fetchGeneratedMaps();
  }, [user]);

  const fetchGeneratedMaps = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('generated_geojson')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching generated maps:', error);
        return;
      }

      if (data && data.length > 0) {
        setGeneratedMap(data[0]);
      }
    } catch (error) {
      console.error('Error in fetchGeneratedMaps:', error);
    }
  };

  const handleSearch = async (prompt: string) => {
    if (!user) {
      toast.error("Veuillez vous connecter pour générer des cartes");
      return;
    }

    setCurrentPrompt(prompt);
    setIsGenerating(true);
    setShowProgress(true);
    setShowAIAnalysis(false);

    try {
      console.log('Analyzing CSV structure...');
      const analyzeResponse = await supabase.functions.invoke('analyze-csv-structure', {
        body: { prompt, uploadedFiles: [] }
      });

      if (analyzeResponse.error) {
        throw new Error(`Analysis error: ${analyzeResponse.error.message}`);
      }

      const analysisData = analyzeResponse.data;
      console.log('Analysis result:', analysisData);

      console.log('Generating map...');
      const generateResponse = await supabase.functions.invoke('rag-enhanced-map-generation', {
        body: { 
          prompt,
          dataLevel: analysisData?.dataLevel || 'communes',
          recommendedMapType: analysisData?.recommendedMapType || 'geocodage'
        }
      });

      if (generateResponse.error) {
        throw new Error(`Generation error: ${generateResponse.error.message}`);
      }

      console.log('Map generation response:', generateResponse.data);

      // Fetch the latest AI generation logs to find one with valid geometry
      const { data: logs, error: logsError } = await supabase
        .from('ai_generation_logs')
        .select('*')
        .eq('created_by', user.id)
        .eq('user_prompt', prompt)
        .order('created_at', { ascending: false })
        .limit(5);

      if (logsError) {
        console.error('Error fetching logs:', logsError);
        throw new Error('Failed to fetch generation logs');
      }

      // Find the log with valid geometry or coordinates
      const logWithGeometry = logs?.find(log => {
        if (!log.ai_response) return false;
        
        const response = typeof log.ai_response === 'string' 
          ? JSON.parse(log.ai_response) 
          : log.ai_response;
        
        // Check if there are layers with valid coordinates
        if (response.layers && Array.isArray(response.layers)) {
          return response.layers.some((layer: any) => 
            layer.data && Array.isArray(layer.data) && 
            layer.data.some((item: any) => 
              item.coordinates && 
              Array.isArray(item.coordinates) && 
              item.coordinates.length >= 2 &&
              item.coordinates[0] !== 0 && 
              item.coordinates[1] !== 0
            )
          );
        }
        
        return false;
      });

      if (logWithGeometry) {
        const aiResponse = typeof logWithGeometry.ai_response === 'string' 
          ? JSON.parse(logWithGeometry.ai_response) 
          : logWithGeometry.ai_response;

        // Save the AI-generated data to the data folder
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `ai-generated-${timestamp}.json`;
        
        // Save to Supabase generated_geojson table
        const { data: savedData, error: saveError } = await supabase
          .from('generated_geojson')
          .insert({
            name: aiResponse.title || `AI Generated Map - ${timestamp}`,
            description: `Generated from prompt: "${prompt}"`,
            geojson_data: aiResponse,
            ai_prompt: prompt,
            created_by: user.id
          })
          .select()
          .single();

        if (saveError) {
          console.error('Error saving AI data:', saveError);
        } else {
          console.log('AI data saved successfully:', savedData);
          
          // Add the AI-generated layer to the map
          if (aiResponse.layers && Array.isArray(aiResponse.layers)) {
            const newLayers = aiResponse.layers.map((layer: any, index: number) => ({
              id: `ai_${Date.now()}_${index}`,
              name: layer.name || `AI Layer ${index + 1}`,
              enabled: true,
              description: `AI generated: ${layer.name}`,
              type: 'ai' as const,
              color: layer.color || '#ff6b6b',
              opacity: 0.8,
              data: layer.data
            }));

            setMapLayers(prev => [...prev, ...newLayers]);
          }

          setGeneratedMap(aiResponse);
          setShowAIAnalysis(true);
          
          toast.success("Carte générée avec succès !");
        }
      } else {
        toast.error("Aucune donnée géographique valide trouvée dans la réponse IA");
      }

    } catch (error) {
      console.error('Error in handleSearch:', error);
      toast.error(`Erreur lors de la génération: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsGenerating(false);
      setShowProgress(false);
    }
  };

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
              // For CSV files, we'll need to process them differently
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

  const shouldEnableLayer = (layerId: string, dataLevel: string): boolean => {
    const levelMap = {
      'departements': ['base_departments'],
      'epci': ['base_departments', 'base_epci'],
      'communes': ['base_departments', 'base_epci', 'base_communes']
    };
    
    return levelMap[dataLevel as keyof typeof levelMap]?.includes(layerId) || false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-6">
              Cartographie IA Interactive
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Transformez vos données en cartes interactives grâce à l'intelligence artificielle. 
              Analysez, visualisez et explorez vos données géographiques en quelques clics.
            </p>
            
            <div className="bg-card/50 backdrop-blur-sm rounded-lg border p-6 mb-8">
            <SearchBar 
              onSearch={handleSearch} 
              isLoading={isGenerating}
            />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={() => setShowFileUpload(!showFileUpload)}
                variant="outline"
                size="lg"
                className="group"
              >
                <Upload className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                Importer des fichiers
              </Button>
              
              {generatedMap && (
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
        </div>
      </section>

      {/* Progress Bar */}
      {showProgress && (
        <div className="container mx-auto px-4 py-4">
          <ProgressBar isActive={showProgress} />
        </div>
      )}

      {/* File Upload Section */}
      {showFileUpload && (
        <section className="container mx-auto px-4 py-8">
          <Card className="mb-8">
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
        </section>
      )}

      {/* Main Content */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filter Panel */}
          <div className="lg:col-span-1">
            <FilterPanel 
              layers={mapLayers}
              onLayerToggle={handleLayerToggle}
              onLayerStyleChange={handleLayerStyleChange}
              onLayerDelete={handleLayerDelete}
            />
            
            {/* AI Analysis Panel */}
            {showAIAnalysis && (
              <div className="mt-6">
                <AIAnalysisPanel 
                  generatedMap={generatedMap} 
                  isVisible={showAIAnalysis}
                />
              </div>
            )}
          </div>

          {/* Map Display */}
          <div className="lg:col-span-3">
            <Card className="h-[600px]">
              <CardContent className="p-0 h-full">
                <UMapDisplay 
                  layers={mapLayers}
                  generatedMap={generatedMap}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AIMap;