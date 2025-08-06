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
  const [mapboxToken, setMapboxToken] = useState("");

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map with a default token or ask user for token
    const token = "pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbHo4cjlna2YwaXluMmxtbnBnOXJsZnE3In0.RjGVN2vN6xyGbq7ZB3gqfw";
    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [2.3522, 48.8566], // Paris as default
      zoom: 6
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

    // Add a simple marker as demonstration
    new mapboxgl.Marker({ color: '#3b82f6' })
      .setLngLat([2.3522, 48.8566])
      .setPopup(new mapboxgl.Popup().setHTML(`
        <div class="p-2">
          <h3 class="font-bold">Generated from AI</h3>
          <p class="text-sm">Prompt: "${prompt}"</p>
        </div>
      `))
      .addTo(map.current);

    toast.success("Map generated successfully!");
  };

  const handleExportPDF = () => {
    toast.info("PDF export feature coming soon!");
  };

  const handleExportImage = () => {
    if (map.current) {
      const canvas = map.current.getCanvas();
      const link = document.createElement('a');
      link.download = 'map-export.png';
      link.href = canvas.toDataURL();
      link.click();
      toast.success("Map exported as image!");
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/map/shared-id`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard!");
  };

  const handleEdit = () => {
    toast.info("Edit mode feature coming soon!");
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
          <CardTitle className="text-lg">Generated Map</CardTitle>
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
                <p className="text-sm text-muted-foreground">Generating map with AI...</p>
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
              Share
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MapDisplay;