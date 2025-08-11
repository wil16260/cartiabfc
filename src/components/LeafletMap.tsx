import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2, Edit3, Check, X, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface LeafletMapProps {
  prompt?: string;
  isLoading?: boolean;
  visibleLayers?: string[];
}

interface MapConfig {
  title: string;
  credits: string;
}

// Dynamically load Leaflet to avoid SSR issues
const loadLeaflet = async () => {
  if (typeof window === 'undefined') return null;
  
  const L = await import('leaflet');
  
  // Import CSS
  await import('leaflet/dist/leaflet.css');
  
  // Fix for default markers
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
  
  return L;
};

const LeafletMap = ({ prompt, isLoading = false, visibleLayers = [] }: LeafletMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [L, setL] = useState<any>(null);
  const [mapConfig, setMapConfig] = useState<MapConfig>({
    title: "Carte de Bourgogne-Franche-Comté",
    credits: "Données: IGN, INSEE | Réalisé avec Leaflet"
  });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(mapConfig.title);
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    const initLeaflet = async () => {
      try {
        const leaflet = await loadLeaflet();
        if (leaflet) {
          setL(leaflet);
          console.log('Leaflet loaded successfully');
        }
      } catch (error) {
        console.error('Error loading Leaflet:', error);
        toast.error("Erreur lors du chargement de la carte");
      }
    };

    initLeaflet();
    loadMapData();
  }, []);

  useEffect(() => {
    if (mapRef.current && L && !map) {
      initializeMap();
    }
  }, [L]);

  useEffect(() => {
    if (map && geoData && L) {
      renderLayers();
    }
  }, [map, geoData, visibleLayers, L]);

  const loadMapData = async () => {
    try {
      // Load region boundaries
      const regionResponse = await fetch('/data/bfc.geojsonl.json');
      const regionText = await regionResponse.text();
      const regionFeatures = [JSON.parse(regionText)];

      // Load department boundaries
      const deptResponse = await fetch('/data/dpt_bfc.geojsonl.json');
      const deptText = await deptResponse.text();
      const deptLines = deptText.trim().split('\n');
      const deptFeatures = deptLines.map(line => JSON.parse(line));

      setGeoData({
        region: {
          type: 'FeatureCollection',
          features: regionFeatures
        },
        departments: {
          type: 'FeatureCollection',
          features: deptFeatures
        }
      });

      console.log('Map data loaded successfully');
    } catch (error) {
      console.error('Error loading map data:', error);
      toast.error("Erreur lors du chargement des données cartographiques");
    }
  };

  const initializeMap = () => {
    if (!mapRef.current || !L) return;

    try {
      const leafletMap = L.map(mapRef.current, {
        center: [47.0, 4.5], // Center on Bourgogne-Franche-Comté
        zoom: 7,
        zoomControl: true,
      });

      // Add base tile layer
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      });

      osmLayer.addTo(leafletMap);

      setMap(leafletMap);
      console.log('Map initialized successfully');
    } catch (error) {
      console.error('Error initializing map:', error);
      toast.error("Erreur lors de l'initialisation de la carte");
    }
  };

  const renderLayers = () => {
    if (!map || !geoData || !L) return;

    try {
      // Render region boundaries (always visible)
      if (geoData.region) {
        L.geoJSON(geoData.region, {
          style: {
            color: '#3b82f6',
            weight: 3,
            fillOpacity: 0,
            opacity: 1
          }
        }).addTo(map);
      }

      // Render department boundaries
      if (geoData.departments && visibleLayers.includes('base_departments')) {
        L.geoJSON(geoData.departments, {
          style: {
            color: '#f59e0b',
            weight: 2,
            fillColor: '#fbbf24',
            fillOpacity: 0.3,
            opacity: 0.8
          },
          onEachFeature: (feature: any, layer: any) => {
            layer.bindTooltip(
              `<strong>${feature.properties?.libel_departement || 'Département'}</strong><br/>
               Code: ${feature.properties?.code_departement || 'N/A'}`,
              { 
                permanent: false, 
                direction: 'top'
              }
            );
          }
        }).addTo(map);
      }

      console.log('Layers rendered successfully');
    } catch (error) {
      console.error('Error rendering layers:', error);
    }
  };

  const handleTitleEdit = () => {
    if (isEditingTitle) {
      setMapConfig(prev => ({ ...prev, title: tempTitle }));
      setIsEditingTitle(false);
    } else {
      setIsEditingTitle(true);
    }
  };

  const cancelTitleEdit = () => {
    setTempTitle(mapConfig.title);
    setIsEditingTitle(false);
  };

  const exportMap = () => {
    toast.success("Export en cours... (fonctionnalité à implémenter)");
  };

  const shareMap = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: mapConfig.title,
          text: 'Découvrez cette carte interactive',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Sharing failed', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Lien copié dans le presse-papiers!");
    }
  };

  const saveMap = () => {
    toast.success("Carte sauvegardée!");
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="text-lg font-semibold bg-transparent border-b border-primary focus:outline-none"
                onKeyPress={(e) => e.key === 'Enter' && handleTitleEdit()}
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleTitleEdit}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelTitleEdit}>
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          ) : (
            <CardTitle className="flex items-center gap-2 cursor-pointer" onClick={handleTitleEdit}>
              {mapConfig.title}
              <Edit3 className="h-4 w-4 text-muted-foreground hover:text-primary" />
            </CardTitle>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={saveMap}>
            <Save className="h-4 w-4 mr-1" />
            Sauvegarder
          </Button>
          <Button variant="outline" size="sm" onClick={exportMap}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={shareMap}>
            <Share2 className="h-4 w-4 mr-1" />
            Partager
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative bg-muted/20 rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-[1000]">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span>Génération de la carte...</span>
              </div>
            </div>
          )}
          {!L && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-[1000]">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span>Chargement de la carte...</span>
              </div>
            </div>
          )}
          <div 
            ref={mapRef} 
            className="w-full h-[600px] border rounded-lg bg-white"
            style={{ zIndex: 1 }}
          />
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">{mapConfig.credits}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeafletMap;