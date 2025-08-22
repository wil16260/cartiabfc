import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize2, Eye } from "lucide-react";
import UMapDisplay from "@/components/UMapDisplay";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const SharedMap = () => {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shareToken) {
      fetchSharedMap(shareToken);
    }
  }, [shareToken]);

  const fetchSharedMap = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('shared_maps')
        .select('*')
        .eq('share_token', token)
        .eq('is_public', true)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        setError("Carte partagée non trouvée ou non publique");
        return;
      }

      // Increment view count
      await supabase
        .from('shared_maps')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id);

      setMapData(data);
    } catch (err) {
      console.error('Error fetching shared map:', err);
      setError("Erreur lors du chargement de la carte partagée");
    } finally {
      setLoading(false);
    }
  };

  const handleFullscreen = () => {
    navigate(`/map/fullscreen/${shareToken}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  if (error || !mapData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2 text-destructive">Erreur</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => navigate('/')} 
                variant="ghost" 
                size="sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{mapData.title}</h1>
                {mapData.description && (
                  <p className="text-sm text-muted-foreground">{mapData.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                {mapData.view_count || 0} vues
              </div>
              <Button 
                onClick={handleFullscreen} 
                variant="outline" 
                size="sm"
              >
                <Maximize2 className="mr-2 h-4 w-4" />
                Plein écran
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Map Display */}
      <div className="container mx-auto px-4 py-6">
        <Card className="h-[calc(100vh-180px)]">
          <CardContent className="p-0 h-full">
            <UMapDisplay 
              layers={mapData.layers || []}
              generatedMap={mapData.map_data}
              isSharedView={true}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SharedMap;