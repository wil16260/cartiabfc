
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2, Edit3, Maximize2 } from "lucide-react";
import { toast } from "sonner";

interface MapDisplayProps {
  prompt?: string;
  isLoading?: boolean;
}

const MapDisplay = ({ prompt, isLoading = false }: MapDisplayProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map with focus on Burgundy-Franche-Comté region
    const token = "pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbHo4cjlna2YwaXluMmxtbnBnOXJsZnE3In0.RjGVN2vN6xyGbq7ZB3gqfw";
    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [5.5, 47.0], // Centered on Burgundy-Franche-Comté
      zoom: 7,
      minZoom: 6, // Prevent zooming out too far from the region
      maxBounds: [
        [3.0, 45.5], // Southwest coordinates
        [7.5, 48.5]  // Northeast coordinates
      ]
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add scale control
    map.current.addControl(new mapboxgl.ScaleControl({
      maxWidth: 80,
      unit: 'metric'
    }), 'bottom-left');

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (prompt && map.current) {
      // Simulate AI processing by adding some mock data based on prompt
      simulateMapGeneration(prompt);
    }
  }, [prompt]);

  const simulateMapGeneration = (prompt: string) => {
    if (!map.current) return;

    // Add example markers for Burgundy-Franche-Comté region
    const locations = [
      { name: "Dijon", coords: [5.0415, 47.3220] },
      { name: "Besançon", coords: [6.0240, 47.2378] },
      { name: "Chalon-sur-Saône", coords: [4.8565, 46.7811] },
      { name: "Belfort", coords: [6.8628, 47.6380] }
    ];

    locations.forEach(location => {
      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat(location.coords as [number, number])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <h3 class="font-bold">${location.name}</h3>
            <p class="text-sm">Généré par IA</p>
            <p class="text-xs">Prompt: "${prompt}"</p>
          </div>
        `))
        .addTo(map.current!);
    });

    toast.success("Carte générée avec succès !");
  };

  const handleExportPDF = () => {
    toast.info("Fonctionnalité d'export PDF bientôt disponible !");
  };

  const handleExportImage = () => {
    if (map.current) {
      const canvas = map.current.getCanvas();
      const link = document.createElement('a');
      link.download = 'carte-bourgogne-franche-comte.png';
      link.href = canvas.toDataURL();
      link.click();
      toast.success("Carte exportée en image !");
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/carte/partage-id`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Lien de partage copié dans le presse-papiers !");
  };

  const handleEdit = () => {
    toast.info("Mode édition bientôt disponible !");
  };

  const handleFullscreen = () => {
    if (mapContainer.current) {
      mapContainer.current.requestFullscreen();
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Carte générée</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {prompt && (
          <p className="text-sm text-muted-foreground">
            Prompt: "{prompt}"
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          <div 
            ref={mapContainer} 
            className="h-96 w-full rounded-lg overflow-hidden"
            style={{ minHeight: '400px' }}
          />
          
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Génération de la carte avec l'IA...</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t bg-muted/50">
          <div className="flex flex-wrap gap-2">
            <Button variant="ocean" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="terrain" size="sm" onClick={handleExportImage}>
              <Download className="h-4 w-4" />
              Image
            </Button>
            <Button variant="sunset" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
              Partager
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MapDisplay;
