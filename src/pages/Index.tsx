import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Brain } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import SmartFileProcessor from "@/components/SmartFileProcessor";
import UMapDisplay from "@/components/UMapDisplay";
import FilterPanel from "@/components/FilterPanel";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const Index = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
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
            Visualisez les données géographiques avec des limites départementales, EPCI et communes
          </p>
          
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
            
            <Button 
              asChild
              variant="default"
              size="lg"
              className="group"
            >
              <Link to="/ai-map">
                <Brain className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                Génération IA
              </Link>
            </Button>
          </div>
        </div>

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
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-2">
            <UMapDisplay 
              visibleLayers={visibleLayers}
              layers={mapLayers}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;