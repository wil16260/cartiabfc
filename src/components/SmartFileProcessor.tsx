import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, MapIcon, Database, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SmartFileProcessorProps {
  uploadedFiles: File[];
  onMapLayerAdd: (layerData: any) => void;
}

const SmartFileProcessor = ({ uploadedFiles, onMapLayerAdd }: SmartFileProcessorProps) => {
  const [processing, setProcessing] = useState<{ [key: string]: boolean }>({});
  const [processed, setProcessed] = useState<{ [key: string]: boolean }>({});
  const [joinConfig, setJoinConfig] = useState<{
    file: File | null;
    geoLevel: 'communes' | 'epci' | 'departements';
    joinColumn: string;
    columns: string[];
  }>({
    file: null,
    geoLevel: 'communes',
    joinColumn: '',
    columns: []
  });

  // Separate files by type
  const geodataFiles = uploadedFiles.filter(file => {
    const ext = file.name.toLowerCase();
    return ext.endsWith('.geojson') || ext.endsWith('.kml') || ext.endsWith('.gpkg');
  });

  const dataFiles = uploadedFiles.filter(file => {
    const ext = file.name.toLowerCase();
    return ext.endsWith('.csv') || ext.endsWith('.xlsx') || ext.endsWith('.xls');
  });

  const processGeodataFile = async (file: File) => {
    const fileKey = file.name;
    setProcessing(prev => ({ ...prev, [fileKey]: true }));

    try {
      let geojsonData: any = null;

      if (file.name.toLowerCase().endsWith('.geojson')) {
        const text = await file.text();
        geojsonData = JSON.parse(text);
      } else if (file.name.toLowerCase().endsWith('.kml')) {
        // For KML files, we'll need to convert to GeoJSON
        // This is a basic implementation - in production, you'd want a proper KML parser
        toast.info('KML files need conversion - using simplified processing');
        const text = await file.text();
        // Basic KML to GeoJSON conversion would go here
        // For now, we'll create a placeholder
        geojsonData = {
          type: 'FeatureCollection',
          features: []
        };
      } else if (file.name.toLowerCase().endsWith('.gpkg')) {
        // GPKG files would need special handling with a library like sql.js
        toast.info('GPKG files need special processing');
        return;
      }

      if (geojsonData) {
        const layerData = {
          id: `geodata-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'geodata',
          data: geojsonData,
          visible: true,
          style: {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.3,
            weight: 2
          }
        };

        onMapLayerAdd(layerData);
        setProcessed(prev => ({ ...prev, [fileKey]: true }));
        toast.success(`${file.name} ajouté à la carte`);
      }
    } catch (error) {
      console.error('Error processing geodata file:', error);
      toast.error(`Erreur lors du traitement de ${file.name}`);
    } finally {
      setProcessing(prev => ({ ...prev, [fileKey]: false }));
    }
  };

  const analyzeDataFile = async (file: File) => {
    try {
      setProcessing(prev => ({ ...prev, [file.name]: true }));
      
      const formData = new FormData();
      formData.append('file', file);
      
      const { data, error } = await supabase.functions.invoke('analyze-csv-structure', {
        body: formData
      });

      if (error) throw error;
      
      setJoinConfig(prev => ({
        ...prev,
        file,
        columns: data.columns || []
      }));
      
      toast.success(`Structure de ${file.name} analysée`);
    } catch (error) {
      console.error('Error analyzing file:', error);
      toast.error(`Erreur lors de l'analyse de ${file.name}`);
    } finally {
      setProcessing(prev => ({ ...prev, [file.name]: false }));
    }
  };

  const processDataFileJoin = async () => {
    if (!joinConfig.file || !joinConfig.joinColumn) {
      toast.error('Configuration de jointure incomplète');
      return;
    }

    const fileKey = joinConfig.file.name;
    setProcessing(prev => ({ ...prev, [fileKey]: true }));

    try {
      const formData = new FormData();
      formData.append('file', joinConfig.file);
      formData.append('geoLevel', joinConfig.geoLevel);
      formData.append('joinColumn', joinConfig.joinColumn);
      
      const { data, error } = await supabase.functions.invoke('join-data-with-geography', {
        body: formData
      });

      if (error) throw error;
      
      const layerData = {
        id: `joined-${Date.now()}`,
        name: `${joinConfig.file.name} (joint)`,
        type: 'joined-data',
        data: data.geojson,
        visible: true,
        style: {
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.4,
          weight: 2
        },
        stats: data.stats
      };

      onMapLayerAdd(layerData);
      setProcessed(prev => ({ ...prev, [fileKey]: true }));
      
      toast.success(`${joinConfig.file.name} joint avec succès (${data.stats?.joinedFeatures || 0} entités)`);
      
      // Reset join config
      setJoinConfig({
        file: null,
        geoLevel: 'communes',
        joinColumn: '',
        columns: []
      });
    } catch (error) {
      console.error('Error joining data:', error);
      toast.error('Erreur lors de la jointure');
    } finally {
      setProcessing(prev => ({ ...prev, [fileKey]: false }));
    }
  };

  const getJoinKeyHelp = () => {
    switch (joinConfig.geoLevel) {
      case 'communes':
        return 'Code INSEE (ex: 01001, 75001)';
      case 'epci':
        return 'Code SIREN EPCI (ex: 200000172)';
      case 'departements':
        return 'Code département (ex: 01, 75)';
      default:
        return '';
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase();
    if (ext.endsWith('.geojson') || ext.endsWith('.kml')) return MapIcon;
    if (ext.endsWith('.gpkg')) return Database;
    return FileSpreadsheet;
  };

  if (uploadedFiles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Geodata Files - Auto Process */}
      {geodataFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapIcon className="h-5 w-5" />
              Fichiers géographiques
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {geodataFiles.map((file, index) => {
              const IconComponent = getFileIcon(file.name);
              const isProcessing = processing[file.name];
              const isProcessed = processed[file.name];
              
              return (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{file.name}</span>
                    {isProcessed && <CheckCircle className="h-4 w-4 text-green-500" />}
                  </div>
                  <Button
                    onClick={() => processGeodataFile(file)}
                    disabled={isProcessing || isProcessed}
                    size="sm"
                  >
                    {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isProcessed ? 'Ajouté' : isProcessing ? 'Traitement...' : 'Ajouter à la carte'}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Data Files - Analyze and Join */}
      {dataFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Fichiers de données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Selection and Analysis */}
            <div className="space-y-2">
              <Label>Fichier à traiter</Label>
              <Select 
                value={joinConfig.file?.name || ''} 
                onValueChange={(fileName) => {
                  const file = dataFiles.find(f => f.name === fileName);
                  if (file) {
                    setJoinConfig(prev => ({ ...prev, file, columns: [] }));
                    analyzeDataFile(file);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fichier" />
                </SelectTrigger>
                <SelectContent>
                  {dataFiles.map((file, index) => (
                    <SelectItem key={index} value={file.name}>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        {file.name}
                        {processed[file.name] && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Configuration for joining */}
            {joinConfig.columns.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Niveau géographique</Label>
                    <Select 
                      value={joinConfig.geoLevel} 
                      onValueChange={(value: 'communes' | 'epci' | 'departements') => 
                        setJoinConfig(prev => ({ ...prev, geoLevel: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="communes">Communes</SelectItem>
                        <SelectItem value="epci">EPCI</SelectItem>
                        <SelectItem value="departements">Départements</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Colonne de jointure</Label>
                    <Select 
                      value={joinConfig.joinColumn} 
                      onValueChange={(value) => setJoinConfig(prev => ({ ...prev, joinColumn: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`${getJoinKeyHelp()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {joinConfig.columns.map((column, index) => (
                          <SelectItem key={index} value={column}>
                            {column}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Colonnes détectées</Label>
                  <div className="flex flex-wrap gap-1">
                    {joinConfig.columns.map((column, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {column}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={processDataFileJoin}
                  disabled={!joinConfig.joinColumn || processing[joinConfig.file?.name || '']}
                  className="w-full"
                >
                  {processing[joinConfig.file?.name || ''] && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Joindre avec géographie
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartFileProcessor;