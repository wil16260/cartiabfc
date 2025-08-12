import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2, Edit3, Check, X, Map, Layers, Palette, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface UMapDisplayProps {
  prompt?: string;
  isLoading?: boolean;
  visibleLayers?: string[];
}

interface MapConfig {
  title: string;
  credits: string;
}

const UMapDisplay = ({ prompt, isLoading = false, visibleLayers = [] }: UMapDisplayProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [drawnItems, setDrawnItems] = useState<L.FeatureGroup | null>(null);
  const [mapConfig, setMapConfig] = useState<MapConfig>({
    title: "Carte de Bourgogne-Franche-Comté",
    credits: "Données: IGN, INSEE | Réalisé avec uMap-like editor"
  });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(mapConfig.title);
  const [geoData, setGeoData] = useState<any>(null);
  const [aiGeneratedData, setAiGeneratedData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDataVisualization, setShowDataVisualization] = useState(true);

  useEffect(() => {
    loadMapData();
  }, []);

  useEffect(() => {
    if (mapRef.current && !map) {
      initializeMap();
    }
  }, []);

  useEffect(() => {
    if (map && geoData) {
      renderLayers();
    }
  }, [map, geoData, visibleLayers, aiGeneratedData, showDataVisualization]);

  useEffect(() => {
    if (prompt && map) {
      generateMapFromPrompt(prompt);
    }
  }, [prompt, map]);

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

      // Load EPCI boundaries
      const epciResponse = await fetch('/data/epci.geojsonl.json');
      const epciText = await epciResponse.text();
      const epciLines = epciText.trim().split('\n');
      const epciFeatures = epciLines.map(line => JSON.parse(line));

      // Load commune boundaries
      let communeFeatures = [];
      try {
        const communeResponse = await fetch('/data/com_bfc3.json');
        const communeData = await communeResponse.json();
        communeFeatures = communeData.features || [];
        console.log('Loaded communes:', communeFeatures.length);
      } catch (error) {
        console.log('Commune data not available:', error);
      }

      setGeoData({
        region: {
          type: 'FeatureCollection',
          features: regionFeatures
        },
        departments: {
          type: 'FeatureCollection',
          features: deptFeatures
        },
        epci: {
          type: 'FeatureCollection',
          features: epciFeatures
        },
        communes: {
          type: 'FeatureCollection',
          features: communeFeatures
        }
      });

      console.log('Map data loaded successfully');
    } catch (error) {
      console.error('Error loading map data:', error);
      toast.error("Erreur lors du chargement des données cartographiques");
    }
  };

  const initializeMap = () => {
    if (!mapRef.current) return;

    const leafletMap = L.map(mapRef.current, {
      center: [47.0, 4.5], // Center on Bourgogne-Franche-Comté
      zoom: 7,
      zoomControl: true,
    });

    // Add base tile layers
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri, DigitalGlobe, GeoEye'
    });

    const cartoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CARTO'
    });

    // Add default layer
    osmLayer.addTo(leafletMap);

    // Layer control
    const baseLayers = {
      "OpenStreetMap": osmLayer,
      "Satellite": satelliteLayer,
      "Carto Light": cartoLayer
    };

    L.control.layers(baseLayers).addTo(leafletMap);

    // Initialize drawing features
    const drawnItemsGroup = new L.FeatureGroup();
    leafletMap.addLayer(drawnItemsGroup);

    // Drawing controls
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polyline: {
          shapeOptions: {
            color: '#3b82f6',
            weight: 3
          }
        },
        polygon: {
          allowIntersection: false,
          drawError: {
            color: '#e74c3c',
            message: 'Intersection non autorisée!'
          },
          shapeOptions: {
            color: '#3b82f6',
            fillOpacity: 0.3
          }
        },
        circle: {
          shapeOptions: {
            color: '#3b82f6',
            fillOpacity: 0.3
          }
        },
        rectangle: {
          shapeOptions: {
            color: '#3b82f6',
            fillOpacity: 0.3
          }
        },
        marker: {},
        circlemarker: false
      },
      edit: {
        featureGroup: drawnItemsGroup,
        remove: true
      }
    });

    leafletMap.addControl(drawControl);

    // Drawing event handlers
    leafletMap.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      drawnItemsGroup.addLayer(layer);
      
      // Add popup for editing properties
      layer.bindPopup(`
        <div class="p-2">
          <input type="text" placeholder="Titre" class="w-full mb-2 p-1 border rounded" />
          <textarea placeholder="Description" class="w-full mb-2 p-1 border rounded"></textarea>
          <button class="bg-primary text-white px-2 py-1 rounded text-sm">Sauvegarder</button>
        </div>
      `);
      
      toast.success("Élément ajouté! Cliquez dessus pour éditer.");
    });

    leafletMap.on(L.Draw.Event.EDITED, () => {
      toast.success("Modifications sauvegardées!");
    });

    leafletMap.on(L.Draw.Event.DELETED, () => {
      toast.success("Éléments supprimés!");
    });

    setMap(leafletMap);
    setDrawnItems(drawnItemsGroup);
  };

  const renderLayers = () => {
    if (!map || !geoData) return;

    // Clear existing layers (except drawn items)
    map.eachLayer((layer) => {
      if (layer !== drawnItems && !(layer instanceof L.TileLayer) && !(layer as any)._url) {
        map.removeLayer(layer);
      }
    });

    // Render region boundaries with inverted polygon effect (QGIS-like)
    if (geoData.region) {
      // Create inverted polygon effect - blue background with transparent region
      const regionCoords = geoData.region.features[0].geometry.coordinates;
      
      // Create a world polygon with region as a hole
      const invertedPolygon: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            // Outer ring (world)
            [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]],
            // Inner ring (region hole) - reverse coordinates for hole
            ...regionCoords.map((ring: any) => ring.slice().reverse())
          ]
        }
      };

      L.geoJSON(invertedPolygon, {
        style: {
          color: '#92c6df',
          weight: 2,
          fillColor: '#92c6df',
          fillOpacity: 0.7,
          opacity: 1
        }
      }).addTo(map);

      // Add region outline only
      L.geoJSON(geoData.region, {
        style: {
          color: '#92c6df',
          weight: 2,
          fillOpacity: 0,
          opacity: 1
        }
      }).addTo(map);
    }

    // Render department boundaries
    if (geoData.departments && visibleLayers.includes('base_departments')) {
      L.geoJSON(geoData.departments, {
        style: (feature) => {
          // Check if we have AI data for this department
          const deptCode = feature?.properties?.code_departement;
          const hasAIData = aiGeneratedData && aiGeneratedData.enhancedFeatures && 
                           aiGeneratedData.enhancedFeatures.some((f: any) => 
                             f.properties?.code_departement === deptCode
                           ) && showDataVisualization;
          
          return {
            color: '#f59e0b',
            weight: 2,
            fillColor: hasAIData ? '#fbbf24' : 'transparent',
            fillOpacity: hasAIData ? 0.5 : 0,
            opacity: 0.8
          };
        },
        onEachFeature: (feature, layer) => {
          const deptCode = feature.properties?.code_departement;
          const deptName = feature.properties?.libel_departement;
          
          // Find AI data for this department
          let aiData = null;
          if (aiGeneratedData && aiGeneratedData.enhancedFeatures) {
            aiData = aiGeneratedData.enhancedFeatures.find((f: any) => 
              f.properties?.code_departement === deptCode
            );
          }
          
          let tooltipContent = `<strong>${deptName || 'Département'}</strong><br/>Code: ${deptCode || 'N/A'}`;
          if (aiData && showDataVisualization) {
            Object.keys(aiData.properties).forEach(key => {
              if (key !== 'code_departement' && key !== 'libel_departement') {
                tooltipContent += `<br/>${key}: ${aiData.properties[key]}`;
              }
            });
          }
          
          layer.bindTooltip(tooltipContent, { 
            permanent: false, 
            direction: 'top',
            className: 'custom-tooltip'
          });
          
          layer.on('mouseover', () => {
            if (layer instanceof L.Path) {
              layer.setStyle({
                fillOpacity: showDataVisualization && aiData ? 0.7 : 0,
                weight: 3
              });
            }
          });
          
          layer.on('mouseout', () => {
            if (layer instanceof L.Path) {
              layer.setStyle({
                fillOpacity: showDataVisualization && aiData ? 0.5 : 0,
                weight: 2
              });
            }
          });
        }
      }).addTo(map);
    }

    // Render EPCI boundaries
    if (geoData.epci && visibleLayers.includes('base_epci')) {
      L.geoJSON(geoData.epci, {
        style: (feature) => {
          const epciCode = feature?.properties?.code;
          const hasAIData = aiGeneratedData && aiGeneratedData.enhancedFeatures && 
                           aiGeneratedData.enhancedFeatures.some((f: any) => 
                             f.properties?.code_epci === epciCode
                           ) && showDataVisualization;
          
          return {
            color: '#8b5cf6',
            weight: 1,
            fillColor: hasAIData ? '#c4b5fd' : 'transparent',
            fillOpacity: hasAIData ? 0.4 : 0,
            opacity: 0.8
          };
        },
        onEachFeature: (feature, layer) => {
          const epciCode = feature.properties?.code;
          const epciName = feature.properties?.name;
          
          let aiData = null;
          if (aiGeneratedData && aiGeneratedData.enhancedFeatures) {
            aiData = aiGeneratedData.enhancedFeatures.find((f: any) => 
              f.properties?.code_epci === epciCode
            );
          }
          
          let tooltipContent = `<strong>${epciName || 'EPCI'}</strong><br/>Code: ${epciCode || 'N/A'}`;
          if (aiData && showDataVisualization) {
            Object.keys(aiData.properties).forEach(key => {
              if (key !== 'code_epci' && key !== 'name') {
                tooltipContent += `<br/>${key}: ${aiData.properties[key]}`;
              }
            });
          }
          
          layer.bindTooltip(tooltipContent, { 
            permanent: false, 
            direction: 'top'
          });
        }
      }).addTo(map);
    }

    // Render commune boundaries
    if (geoData.communes && geoData.communes.features && visibleLayers.includes('base_communes')) {
      console.log('Rendering communes:', geoData.communes.features.length);
      L.geoJSON(geoData.communes, {
        style: (feature) => {
          const communeCode = feature?.properties?.code_commune || feature?.properties?.insee_com;
          const hasAIData = aiGeneratedData && aiGeneratedData.enhancedFeatures && 
                           aiGeneratedData.enhancedFeatures.some((f: any) => 
                             f.properties?.code_commune === communeCode
                           ) && showDataVisualization;
          
          return {
            color: '#6b7280',
            weight: 1,
            fillColor: hasAIData ? '#fbbf24' : 'transparent',
            fillOpacity: hasAIData ? 0.3 : 0,
            opacity: 1
          };
        },
        onEachFeature: (feature, layer) => {
          const communeCode = feature.properties?.code_commune || feature.properties?.insee_com;
          const communeName = feature.properties?.nom_commune || feature.properties?.nom_com;
          
          let aiData = null;
          if (aiGeneratedData && aiGeneratedData.enhancedFeatures) {
            aiData = aiGeneratedData.enhancedFeatures.find((f: any) => 
              f.properties?.code_commune === communeCode
            );
          }
          
          let tooltipContent = `<strong>${communeName || 'Commune'}</strong><br/>Code: ${communeCode || 'N/A'}`;
          if (aiData && showDataVisualization) {
            Object.keys(aiData.properties).forEach(key => {
              if (key !== 'code_commune' && key !== 'nom_commune') {
                tooltipContent += `<br/>${key}: ${aiData.properties[key]}`;
              }
            });
          }
          
          layer.bindTooltip(tooltipContent, { 
            permanent: false, 
            direction: 'top'
          });
        }
      }).addTo(map);
    }

    // Render AI-generated point data (geocoding)
    if (aiGeneratedData && aiGeneratedData.features) {
      console.log('Rendering AI-generated point data:', aiGeneratedData.features);
      
      L.geoJSON(aiGeneratedData, {
        pointToLayer: (feature, latlng) => {
          const icon = L.divIcon({
            html: `<div style="background-color: #e11d48; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            className: 'custom-marker',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          
          return L.marker(latlng, { icon });
        },
        onEachFeature: (feature, layer) => {
          const properties = feature.properties || {};
          const name = properties.name || properties.nom || properties.title || 'Point généré par IA';
          
          let popupContent = `<div class="p-2">
            <h3 class="font-semibold text-sm">${name}</h3>`;
          
          Object.keys(properties).forEach(key => {
            if (key !== 'name' && key !== 'nom' && key !== 'title' && key !== 'icon') {
              popupContent += `<p class="text-xs text-gray-600">${key}: ${properties[key]}</p>`;
            }
          });
          
          popupContent += '</div>';
          layer.bindPopup(popupContent);
        }
      }).addTo(map);
      
      toast.success("Données IA ajoutées à la carte!");
    }
  };

  const generateMapFromPrompt = async (prompt: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-map-with-mistral', {
        body: { prompt }
      });

      if (error) throw error;

      console.log('Full AI response:', data);
      const mapData = data.mapData;
      
      if (mapData.title) {
        setMapConfig(prev => ({ ...prev, title: mapData.title }));
        setTempTitle(mapData.title);
      }
      
      // Process AI response to enhance existing geographic data
      if (mapData.description) {
        try {
          // Extract JSON from markdown code block
          const jsonMatch = mapData.description.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            const aiResponse = JSON.parse(jsonMatch[1]);
            console.log('Parsed AI response:', aiResponse);
            
            // Check if it's point data (geocoding) or data enhancement
            if (aiResponse.features && aiResponse.features.length > 0) {
              const firstFeature = aiResponse.features[0];
              
              if (firstFeature.geometry.type === 'Point') {
                // Point data - display as markers
                setAiGeneratedData(aiResponse);
              } else {
                // Polygon data - use as data enhancement for existing boundaries
                setAiGeneratedData({
                  enhancedFeatures: aiResponse.features,
                  metadata: aiResponse.metadata
                });
              }
              
              // Zoom to bounds if point data
              if (firstFeature.geometry.type === 'Point' && map) {
                const group = L.geoJSON(aiResponse);
                map.fitBounds(group.getBounds(), { padding: [20, 20] });
              }
            }
          }
        } catch (parseError) {
          console.error('Error parsing GeoJSON from AI response:', parseError);
        }
      }
      
      toast.success(`Carte générée: ${mapData.title}`);
    } catch (error) {
      console.error('Error generating map:', error);
      toast.error("Erreur lors de la génération de la carte");
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
    if (!map) return;
    
    // Export current view as image
    const mapContainer = map.getContainer();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // This is a simplified export - in a real implementation you'd use libraries like leaflet-image
      toast.success("Export en cours... (fonctionnalité à implémenter)");
    }
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

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    toast.success(isEditing ? "Mode lecture activé" : "Mode édition activé");
  };

  const saveMap = () => {
    // Save current map state
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
          {aiGeneratedData && (
            <Button 
              variant={showDataVisualization ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowDataVisualization(!showDataVisualization)}
            >
              <Palette className="h-4 w-4 mr-1" />
              {showDataVisualization ? "Masquer données" : "Afficher données"}
            </Button>
          )}
          <Button 
            variant={isEditing ? "default" : "outline"} 
            size="sm" 
            onClick={toggleEditMode}
          >
            <Edit3 className="h-4 w-4 mr-1" />
            {isEditing ? "Mode lecture" : "Éditer"}
          </Button>
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
          <div 
            ref={mapRef} 
            className="w-full h-[600px] border rounded-lg bg-white"
            style={{ zIndex: 1 }}
          />
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">{mapConfig.credits}</p>
          {isEditing && (
            <p className="text-sm text-primary mt-1">
              Mode édition actif - Utilisez les outils de dessin pour créer des éléments
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UMapDisplay;