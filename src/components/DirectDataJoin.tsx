import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Link, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DirectDataJoinProps {
  uploadedFiles: File[];
  onJoinComplete: (geojsonData: any) => void;
}

const DirectDataJoin = ({ uploadedFiles, onJoinComplete }: DirectDataJoinProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [geoLevel, setGeoLevel] = useState<'communes' | 'epci' | 'departements'>('communes');
  const [joinColumn, setJoinColumn] = useState<string>('');
  const [dataColumns, setDataColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const csvFiles = uploadedFiles.filter(file => 
    file.name.toLowerCase().endsWith('.csv') || 
    file.name.toLowerCase().endsWith('.xlsx') || 
    file.name.toLowerCase().endsWith('.xls')
  );

  const analyzeFile = async (file: File) => {
    if (!file) return;
    
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const { data, error } = await supabase.functions.invoke('analyze-csv-structure', {
        body: formData
      });

      if (error) throw error;
      
      setDataColumns(data.columns || []);
      toast.success('Fichier analysé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
      toast.error('Erreur lors de l\'analyse du fichier');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileSelect = (fileName: string) => {
    const file = csvFiles.find(f => f.name === fileName);
    if (file) {
      setSelectedFile(file);
      analyzeFile(file);
    }
  };

  const handleJoin = async () => {
    if (!selectedFile || !joinColumn) {
      toast.error('Veuillez sélectionner un fichier et une colonne de jointure');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('geoLevel', geoLevel);
      formData.append('joinColumn', joinColumn);
      
      const { data, error } = await supabase.functions.invoke('join-data-with-geography', {
        body: formData
      });

      if (error) throw error;
      
      onJoinComplete(data.geojson);
      toast.success('Données jointes avec succès');
    } catch (error) {
      console.error('Erreur lors de la jointure:', error);
      toast.error('Erreur lors de la jointure des données');
    } finally {
      setLoading(false);
    }
  };

  const getJoinKeyHelp = () => {
    switch (geoLevel) {
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

  if (csvFiles.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Jointure directe avec données géographiques
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fichier de données</Label>
            <Select onValueChange={handleFileSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un fichier CSV/Excel" />
              </SelectTrigger>
              <SelectContent>
                {csvFiles.map((file, index) => (
                  <SelectItem key={index} value={file.name}>
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      {file.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Niveau géographique</Label>
            <Select value={geoLevel} onValueChange={(value: 'communes' | 'epci' | 'departements') => setGeoLevel(value)}>
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
        </div>

        {dataColumns.length > 0 && (
          <div className="space-y-2">
            <Label>Colonne de jointure</Label>
            <Select value={joinColumn} onValueChange={setJoinColumn}>
              <SelectTrigger>
                <SelectValue placeholder={`Sélectionner la colonne contenant ${getJoinKeyHelp()}`} />
              </SelectTrigger>
              <SelectContent>
                {dataColumns.map((column, index) => (
                  <SelectItem key={index} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 inline mr-1" />
              Attendu: {getJoinKeyHelp()}
            </div>
          </div>
        )}

        {dataColumns.length > 0 && (
          <div className="space-y-2">
            <Label>Colonnes détectées</Label>
            <div className="flex flex-wrap gap-1">
              {dataColumns.map((column, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {column}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button 
          onClick={handleJoin}
          disabled={!selectedFile || !joinColumn || loading || analyzing}
          className="w-full"
        >
          {loading ? 'Jointure en cours...' : analyzing ? 'Analyse...' : 'Joindre les données'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DirectDataJoin;