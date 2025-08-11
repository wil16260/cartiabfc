
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2, Edit3, Maximize2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface MapDisplayProps {
  prompt?: string;
  isLoading?: boolean;
  visibleLayers?: string[];
}

interface MapConfig {
  title: string;
  credits: string;
}

const MapDisplay = ({ prompt, isLoading = false, visibleLayers = [] }: MapDisplayProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapConfig, setMapConfig] = useState<MapConfig>({
    title: "Carte de Bourgogne-Franche-Comté",
    credits: "Données: IGN, INSEE | Réalisé avec Lovable"
  });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(mapConfig.title);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map with focus on France - using public Mapbox token
    // For production, add your own token to Supabase Edge Function Secrets
    const token = "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw"; // Mapbox demo token
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

    // Load GeoJSON templates from Supabase and department boundaries
    map.current.on('load', () => {
      loadGeoJSONTemplates();
      loadDepartmentBoundaries();
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

  const loadDepartmentBoundaries = async () => {
    if (!map.current) return;

    try {
      // Load department boundaries 
      const response = await fetch('/data/dpt_bfc.geojsonl.json');
      const text = await response.text();
      const lines = text.trim().split('\n');
      const features = lines.map(line => JSON.parse(line));
      
      const deptSourceId = 'department-boundaries';
      const deptLayerId = 'department-boundaries-outline';

      // Remove existing if present
      if (map.current.getLayer(deptLayerId)) {
        map.current.removeLayer(deptLayerId);
      }
      if (map.current.getSource(deptSourceId)) {
        map.current.removeSource(deptSourceId);
      }

      // Add department boundaries source
      map.current.addSource(deptSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: features
        }
      });

      // Add outline for departments - visible based on layer toggle
      map.current.addLayer({
        id: deptLayerId,
        type: 'line',
        source: deptSourceId,
        paint: {
          'line-color': '#64748b', // Gray color for borders
          'line-width': 1.5,
          'line-opacity': 0.8
        },
        layout: {
          visibility: visibleLayers.includes('base_departments') ? 'visible' : 'none'
        }
      });

      console.log('Department boundaries loaded with yellow outline');
      
    } catch (error) {
      console.error('Error loading department boundaries:', error);
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
      'base_departments': ['department-boundaries-outline'],
      'base_ign': ['ign-layer'],
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

    // Handle IGN layer separately - add if needed
    if (visibleLayers.includes('base_ign') && !map.current.getSource('ign')) {
      addIgnLayer();
    }
  };

  const addIgnLayer = () => {
    if (!map.current) return;

    try {
      // Add IGN raster source
      map.current.addSource('ign', {
        type: 'raster',
        tiles: [
          'https://wxs.ign.fr/cartes/geoportail/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'
        ],
        tileSize: 256
      });

      // Add IGN layer below departments
      map.current.addLayer({
        id: 'ign-layer',
        type: 'raster',
        source: 'ign',
        layout: {
          visibility: 'visible'
        }
      }, 'department-boundaries-outline');

      console.log('IGN layer added');
    } catch (error) {
      console.error('Error adding IGN layer:', error);
    }
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
      
      // Update map title if AI provided one
      if (mapData.title) {
        setMapConfig(prev => ({ ...prev, title: mapData.title }));
        setTempTitle(mapData.title);
      }
      
      // Load and style data based on AI response
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
      const { dataLevel = 'communes' } = mapData;
      let geoJsonUrl = '/data/com_bfc3.json';
      let sourceId = 'styled-data';
      let layerId = 'styled-layer';

      // Choose appropriate data source based on level
      switch (dataLevel) {
        case 'departments':
          geoJsonUrl = '/data/dpt_bfc.geojsonl.json';
          sourceId = 'departments-data';
          layerId = 'departments-styled';
          break;
        case 'epci':
          // For EPCI, we'll aggregate commune data
          await loadEPCIData(mapData);
          return;
        case 'communes':
        default:
          geoJsonUrl = '/data/com_bfc3.json';
          sourceId = 'communes-data';
          layerId = 'communes-styled';
          break;
      }

      // Load appropriate GeoJSON data
      const response = await fetch(geoJsonUrl);
      let geoData;
      
      if (dataLevel === 'departments') {
        // Handle JSONL format for departments
        const text = await response.text();
        const lines = text.trim().split('\n');
        const features = lines.map(line => JSON.parse(line));
        geoData = {
          type: 'FeatureCollection',
          features: features
        };
      } else {
        geoData = await response.json();
      }

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
        data: dataLevel === 'communes' ? {
          type: 'FeatureCollection',
          features: geoData
        } : geoData
      });

      // Generate color expression based on AI response
      const colorExpression = generateColorExpression(mapData, geoData.features || geoData);

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
      addHoverEffects(layerId, mapData, dataLevel === 'departments' ? 'department' : 'commune');

      console.log(`Styled ${dataLevel} based on: ${mapData.dataProperty}`);
      
    } catch (error) {
      console.error('Error loading geospatial data:', error);
      toast.error("Erreur lors du chargement des données géographiques");
    }
  };

  const loadEPCIData = async (mapData: any) => {
    if (!map.current) return;

    try {
      // Load commune data and aggregate by EPCI
      const response = await fetch('/data/com_bfc3.json');
      const communeData = await response.json();
      
      // Group communes by EPCI
      const epciGroups: { [key: string]: any[] } = {};
      communeData.forEach((commune: any) => {
        const epciKey = commune.properties?.libel_epci || 'Inconnu';
        if (!epciGroups[epciKey]) {
          epciGroups[epciKey] = [];
        }
        epciGroups[epciKey].push(commune);
      });

      // Create aggregated EPCI features (simplified - using first commune's geometry)
      // In a real implementation, you'd want proper EPCI boundary data
      const epciFeatures = Object.entries(epciGroups).map(([epciName, communes]) => {
        const totalPopulation = communes.reduce((sum, commune) => {
          return sum + (parseInt(commune.properties?.population || '0') || 0);
        }, 0);

        // Use the first commune's geometry as placeholder
        // (ideally you'd have proper EPCI boundaries)
        return {
          type: 'Feature' as const,
          properties: {
            libel_epci: epciName,
            population_totale: totalPopulation,
            nb_communes: communes.length,
            siren_epci: communes[0]?.properties?.siren_epci || ''
          },
          geometry: communes[0]?.geometry
        };
      });

      const sourceId = 'epci-data';
      const layerId = 'epci-styled';

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
          features: epciFeatures
        }
      });

      // Generate color expression
      const colorExpression = generateColorExpression(mapData, epciFeatures);

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
      addHoverEffects(layerId, mapData, 'epci');

      console.log(`Styled ${epciFeatures.length} EPCI based on: ${mapData.dataProperty}`);
      
    } catch (error) {
      console.error('Error loading EPCI data:', error);
      toast.error("Erreur lors du chargement des données EPCI");
    }
  };

  const addHoverEffects = (layerId: string, mapData: any, dataType = 'commune') => {
    if (!map.current) return;

    map.current.on('mouseenter', layerId, (e) => {
      if (e.features && e.features[0]) {
        map.current!.getCanvas().style.cursor = 'pointer';
        
        const feature = e.features[0];
        const props = feature.properties;
        
        let popupContent = '';
        
        if (dataType === 'epci') {
          popupContent = `
            <div class="p-3">
              <h3 class="font-bold mb-2">${props?.libel_epci || 'EPCI'}</h3>
              <div class="space-y-1 text-sm">
                <p>Population totale: ${props?.population_totale?.toLocaleString('fr-FR') || 'N/A'}</p>
                <p>Nombre de communes: ${props?.nb_communes || 'N/A'}</p>
                ${props?.siren_epci ? `<p>SIREN: ${props.siren_epci}</p>` : ''}
              </div>
              <p class="text-xs text-muted-foreground mt-2">${mapData.description}</p>
            </div>
          `;
        } else if (dataType === 'department') {
          popupContent = `
            <div class="p-3">
              <h3 class="font-bold mb-2">${props?.libel_departement || 'Département'}</h3>
              <div class="space-y-1 text-sm">
                <p>Code: ${props?.code_departement || 'N/A'}</p>
              </div>
              <p class="text-xs text-muted-foreground mt-2">${mapData.description}</p>
            </div>
          `;
        } else {
          // Default commune popup
          popupContent = `
            <div class="p-3">
              <h3 class="font-bold mb-2">${props?.nom || 'Commune'}</h3>
              <div class="space-y-1 text-sm">
                ${props?.population ? `<p>Population: ${parseInt(props.population).toLocaleString('fr-FR')}</p>` : ''}
                ${props?.nom_maire ? `<p>Maire: ${props.prenom_maire} ${props.nom_maire}</p>` : ''}
                ${props?.code_postal ? `<p>Code postal: ${props.code_postal}</p>` : ''}
                ${props?.libel_epci ? `<p>EPCI: ${props.libel_epci}</p>` : ''}
              </div>
              <p class="text-xs text-muted-foreground mt-2">${mapData.description}</p>
            </div>
          `;
        }
        
        const popup = new mapboxgl.Popup({ offset: [0, -15] })
          .setLngLat(e.lngLat)
          .setHTML(popupContent)
          .addTo(map.current!);
      }
    });

    map.current.on('mouseleave', layerId, () => {
      map.current!.getCanvas().style.cursor = '';
    });
  };

  const generateColorExpression = (mapData: any, featureData: any[]) => {
    const { dataProperty, colorScheme, colors, dataLevel } = mapData;
    
    if (colorScheme === 'gradient' && dataProperty === 'population') {
      // Calculate population ranges from the actual data
      const populations = featureData.map(f => {
        const pop = dataLevel === 'epci' 
          ? f.properties?.population_totale 
          : parseInt(f.properties?.population || 0);
        return pop || 0;
      }).filter(p => p > 0);
      
      if (populations.length === 0) return colors[0] || '#cccccc';
      
      const min = Math.min(...populations);
      const max = Math.max(...populations);
      const ranges = [];
      
      for (let i = 0; i < colors.length; i++) {
        ranges.push(min + (max - min) * (i / (colors.length - 1)));
      }
      
      const populationField = dataLevel === 'epci' ? 'population_totale' : 'population';
      
      return [
        'case',
        ['==', ['get', populationField], null], '#cccccc',
        ['<=', ['to-number', ['get', populationField]], ranges[1]], colors[0],
        ['<=', ['to-number', ['get', populationField]], ranges[2]], colors[1],
        ['<=', ['to-number', ['get', populationField]], ranges[3]], colors[2],
        ['<=', ['to-number', ['get', populationField]], ranges[4]], colors[3],
        colors[4]
      ];
    }
    
    if (colorScheme === 'categorical') {
      // For categorical data like departments or EPCI names
      const uniqueValues = [...new Set(featureData.map(f => f.properties?.[dataProperty]))].filter(Boolean);
      const colorMap: any = ['case'];
      
      uniqueValues.forEach((value, index) => {
        colorMap.push(['==', ['get', dataProperty], value]);
        colorMap.push(colors[index % colors.length]);
      });
      
      colorMap.push('#cccccc'); // default color
      return colorMap;
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

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
    setTempTitle(mapConfig.title);
  };

  const handleTitleSave = () => {
    setMapConfig(prev => ({ ...prev, title: tempTitle }));
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setTempTitle(mapConfig.title);
    setIsEditingTitle(false);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  className="text-lg font-semibold bg-transparent border-b border-gray-300 focus:border-primary outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleSave();
                    if (e.key === 'Escape') handleTitleCancel();
                  }}
                  autoFocus
                />
                <Button variant="outline" size="sm" onClick={handleTitleSave}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleTitleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{mapConfig.title}</CardTitle>
                <Button variant="ghost" size="sm" onClick={handleTitleEdit}>
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
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
          
          {/* Credits overlay */}
          <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-gray-600 shadow-sm">
            {mapConfig.credits}
          </div>
          
          {/* Legend for department boundaries */}
          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded px-3 py-2 text-sm shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-yellow-400"></div>
              <span>Limites départementales</span>
            </div>
          </div>
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
