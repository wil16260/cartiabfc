
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2, Edit3, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface MapDisplayProps {
  prompt?: string;
  isLoading?: boolean;
  visibleLayers?: string[];
}

const MapDisplay = ({ prompt, isLoading = false, visibleLayers = [] }: MapDisplayProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map with focus on France
    const token = "pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbHo4cjlna2YwaXluMmxtbnBnOXJsZnE3In0.RjGVN2vN6xyGbq7ZB3gqfw";
    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [2.5, 46.5], // Centered on France
      zoom: 5.5,
      minZoom: 4,
      maxBounds: [
        [-5.0, 41.0], // Southwest coordinates (includes overseas territories)
        [10.0, 52.0]  // Northeast coordinates
      ]
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add scale control
    map.current.addControl(new mapboxgl.ScaleControl({
      maxWidth: 80,
      unit: 'metric'
    }), 'bottom-left');

    // Load GeoJSON templates from Supabase
    map.current.on('load', () => {
      loadGeoJSONTemplates();
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  const loadGeoJSONTemplates = async () => {
    if (!map.current) return;

    try {
      // Fetch active GeoJSON templates from Supabase
      const { data: templates, error } = await supabase
        .from('geojson_templates')
        .select('*')
        .eq('is_active', true)
        .order('properties->level', { ascending: true });

      if (error) {
        console.error('Error loading templates:', error);
        return;
      }

      if (!templates || templates.length === 0) {
        console.log('No active GeoJSON templates found');
        return;
      }

      // Load each template
      for (const template of templates) {
        await loadTemplateLayer(template);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des modèles GeoJSON:', error);
      toast.error("Erreur lors du chargement des couches de la carte");
    }
  };

  const loadTemplateLayer = async (template: any) => {
    if (!map.current) return;

    try {
      // Check conditional visibility for communes
      if (template.properties?.conditional_visibility && template.properties?.requires_data === 'commune') {
        // For now, skip commune layer - could be enabled based on data availability
        console.log(`Skipping ${template.name} - conditional visibility not met`);
        return;
      }

      // Fetch GeoJSON data
      const response = await fetch(template.geojson_url);
      if (!response.ok) {
        throw new Error(`Failed to load ${template.geojson_url}`);
      }

      const geoData = await response.json();
      const sourceId = `template-${template.id}`;
      const fillLayerId = `${sourceId}-fill`;
      const lineLayerId = `${sourceId}-line`;

      // Add source
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: geoData
      });

      // Parse style configuration
      const style = template.style_config || {};
      
      // Add fill layer if fillColor is defined and not transparent
      if (style.fillColor && style.fillColor !== 'transparent') {
        map.current.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': style.fillColor,
            'fill-opacity': style.fillOpacity || 0.3
          }
        });

        // Add hover effects for fill layer
        map.current.on('mouseenter', fillLayerId, (e) => {
          if (e.features && e.features[0]) {
            map.current!.getCanvas().style.cursor = 'pointer';
            
            const feature = e.features[0];
            const popup = new mapboxgl.Popup({ offset: [0, -15] })
              .setLngLat(e.lngLat)
              .setHTML(`
                <div class="p-2">
                  <h3 class="font-bold">${template.name}</h3>
                  <p class="text-sm text-muted-foreground">
                    ${feature.properties?.nom || feature.properties?.name || 'Zone géographique'}
                  </p>
                </div>
              `)
              .addTo(map.current!);
          }
        });

        map.current.on('mouseleave', fillLayerId, () => {
          map.current!.getCanvas().style.cursor = '';
        });
      }

      // Add line layer
      map.current.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': style.color || style.fillColor || '#000000',
          'line-width': style.weight || 1,
          'line-opacity': style.opacity || 1
        }
      });

      console.log(`Loaded template: ${template.name}`);

    } catch (error) {
      console.error(`Error loading template ${template.name}:`, error);
    }
  };

  useEffect(() => {
    if (prompt && map.current) {
      // Simulate AI processing by adding some mock data based on prompt
      simulateMapGeneration(prompt);
    }
  }, [prompt]);

  useEffect(() => {
    if (map.current && visibleLayers) {
      updateLayerVisibility();
    }
  }, [visibleLayers]);

  const updateLayerVisibility = () => {
    if (!map.current) return;

    // Update layer visibility based on visibleLayers prop
    const layerMappings = {
      'base_departments': ['departments-fill', 'departments-stroke'],
      'data_population': ['population-layer'],
      'data_unemployment': ['unemployment-layer'],
      'data_density': ['density-layer']
    };

    Object.entries(layerMappings).forEach(([layerId, mapboxLayers]) => {
      const isVisible = visibleLayers.includes(layerId);
      mapboxLayers.forEach(mapboxLayerId => {
        if (map.current!.getLayer(mapboxLayerId)) {
          map.current!.setLayoutProperty(
            mapboxLayerId,
            'visibility',
            isVisible ? 'visible' : 'none'
          );
        }
      });
    });
  };

  const simulateMapGeneration = async (prompt: string) => {
    if (!map.current) return;

    try {
      // Call the edge function to get AI-generated map configuration
      const { data, error } = await supabase.functions.invoke('generate-map-with-mistral', {
        body: { prompt }
      });

      if (error) throw error;

      const mapData = data.mapData;
      
      // Load and style commune data based on AI response
      await loadCommuneDataWithStyling(mapData);
      
      toast.success(`Carte générée: ${mapData.title}`);
    } catch (error) {
      console.error('Error generating map:', error);
      toast.error("Erreur lors de la génération de la carte");
    }
  };

  const loadCommuneDataWithStyling = async (mapData: any) => {
    if (!map.current) return;

    try {
      // Load commune GeoJSON data
      const response = await fetch('/data/com_bfc3.json');
      const communeData = await response.json();
      
      const sourceId = 'communes-data';
      const layerId = 'communes-styled';

      // Remove existing layer and source if they exist
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }

      // Add source
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: communeData
        }
      });

      // Generate color expression based on AI response
      const colorExpression = generateColorExpression(mapData, communeData);

      // Add styled layer
      map.current.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': colorExpression,
          'fill-opacity': 0.7,
          'fill-outline-color': '#ffffff'
        }
      });

      // Add hover effects
      map.current.on('mouseenter', layerId, (e) => {
        if (e.features && e.features[0]) {
          map.current!.getCanvas().style.cursor = 'pointer';
          
          const feature = e.features[0];
          const props = feature.properties;
          
          const popup = new mapboxgl.Popup({ offset: [0, -15] })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="p-3">
                <h3 class="font-bold mb-2">${props?.nom || 'Commune'}</h3>
                <div class="space-y-1 text-sm">
                  ${props?.population ? `<p>Population: ${parseInt(props.population).toLocaleString('fr-FR')}</p>` : ''}
                  ${props?.nom_maire ? `<p>Maire: ${props.prenom_maire} ${props.nom_maire}</p>` : ''}
                  ${props?.code_postal ? `<p>Code postal: ${props.code_postal}</p>` : ''}
                </div>
                <p class="text-xs text-muted-foreground mt-2">${mapData.description}</p>
              </div>
            `)
            .addTo(map.current!);
        }
      });

      map.current.on('mouseleave', layerId, () => {
        map.current!.getCanvas().style.cursor = '';
      });

      console.log(`Styled ${communeData.length} communes based on: ${mapData.dataProperty}`);
      
    } catch (error) {
      console.error('Error loading commune data:', error);
      toast.error("Erreur lors du chargement des données communales");
    }
  };

  const generateColorExpression = (mapData: any, communeData: any[]) => {
    const { dataProperty, colorScheme, colors } = mapData;
    
    if (colorScheme === 'gradient' && dataProperty === 'population') {
      // Calculate population ranges
      const populations = communeData.map(f => parseInt(f.properties?.population || 0)).filter(p => p > 0);
      const min = Math.min(...populations);
      const max = Math.max(...populations);
      const ranges = [];
      
      for (let i = 0; i < colors.length; i++) {
        ranges.push(min + (max - min) * (i / (colors.length - 1)));
      }
      
      return [
        'case',
        ['==', ['get', 'population'], null], '#cccccc',
        ['<=', ['to-number', ['get', 'population']], ranges[1]], colors[0],
        ['<=', ['to-number', ['get', 'population']], ranges[2]], colors[1],
        ['<=', ['to-number', ['get', 'population']], ranges[3]], colors[2],
        ['<=', ['to-number', ['get', 'population']], ranges[4]], colors[3],
        colors[4]
      ];
    }
    
    if (colorScheme === 'categorical') {
      // For categorical data like department codes
      return [
        'case',
        ['==', ['get', dataProperty], null], '#cccccc',
        colors[0] // Default color for now
      ];
    }
    
    // Default color
    return colors[0] || '#3b82f6';
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
