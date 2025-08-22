import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, Minimize2 } from "lucide-react";
import UMapDisplay from "@/components/UMapDisplay";
import { supabase } from "@/lib/supabase";

const FullscreenMap = () => {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

      setMapData(data);
    } catch (err) {
      console.error('Error fetching shared map:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleExitFullscreen = () => {
    navigate(`/map/${shareToken}`);
  };

  const handleClose = () => {
    navigate('/');
  };

  if (loading || !mapData) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen">
      {/* Floating Controls */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <Button 
          onClick={handleExitFullscreen}
          variant="secondary"
          size="sm"
          className="bg-card/90 backdrop-blur-sm"
        >
          <Minimize2 className="mr-2 h-4 w-4" />
          Quitter plein écran
        </Button>
        <Button 
          onClick={handleClose}
          variant="outline"
          size="sm"
          className="bg-card/90 backdrop-blur-sm"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Map Title */}
      <div className="absolute top-4 left-4 z-50">
        <div className="bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2">
          <h1 className="font-semibold">{mapData.title}</h1>
          {mapData.description && (
            <p className="text-sm text-muted-foreground">{mapData.description}</p>
          )}
        </div>
      </div>

      {/* Fullscreen Map */}
      <div className="h-full w-full">
        <UMapDisplay 
          layers={mapData.layers || []}
          generatedMap={mapData.map_data}
          isSharedView={true}
          isFullscreen={true}
        />
      </div>
    </div>
  );
};

export default FullscreenMap;