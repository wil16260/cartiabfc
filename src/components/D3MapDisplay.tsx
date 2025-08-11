import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2, Edit3, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface D3MapDisplayProps {
  prompt?: string;
  isLoading?: boolean;
  visibleLayers?: string[];
}

interface MapConfig {
  title: string;
  credits: string;
}

const D3MapDisplay = ({ prompt, isLoading = false, visibleLayers = [] }: D3MapDisplayProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mapConfig, setMapConfig] = useState<MapConfig>({
    title: "Carte de Bourgogne-Franche-Comté",
    credits: "Données: IGN, INSEE | Réalisé avec Lovable"
  });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(mapConfig.title);
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    loadMapData();
  }, []);

  useEffect(() => {
    if (geoData) {
      renderMap();
    }
  }, [geoData, visibleLayers]);

  useEffect(() => {
    if (prompt) {
      generateMapFromPrompt(prompt);
    }
  }, [prompt]);

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

  const renderMap = () => {
    if (!svgRef.current || !geoData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;
    
    svg.attr("width", width).attr("height", height);

    // Set up projection centered on Bourgogne-Franche-Comté
    const projection = d3.geoAlbers()
      .rotate([-3, 0])
      .center([2, 47])
      .scale(6000)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Create main group
    const g = svg.append("g");

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    // Render region boundaries (always visible)
    if (geoData.region) {
      g.selectAll(".region")
        .data(geoData.region.features)
        .enter()
        .append("path")
        .attr("class", "region")
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", "#3b82f6")
        .style("stroke-width", "3px")
        .style("opacity", 1);
    }

    // Render department boundaries
    if (geoData.departments && visibleLayers.includes('base_departments')) {
      g.selectAll(".department")
        .data(geoData.departments.features)
        .enter()
        .append("path")
        .attr("class", "department")
        .attr("d", path)
        .style("fill", "rgba(251, 191, 36, 0.3)")
        .style("stroke", "#f59e0b")
        .style("stroke-width", "2px")
        .style("opacity", 0.8)
        .on("mouseover", function(event, d: any) {
          d3.select(this).style("fill", "rgba(251, 191, 36, 0.6)");
          
          // Show tooltip
          const tooltip = d3.select("body")
            .append("div")
            .attr("class", "d3-tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none");

          tooltip.transition().duration(200).style("opacity", 1);
          tooltip.html(`
            <strong>${d.properties?.libel_departement || 'Département'}</strong><br/>
            Code: ${d.properties?.code_departement || 'N/A'}
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function(event, d: any) {
          d3.select(this).style("fill", "rgba(251, 191, 36, 0.3)");
          d3.selectAll(".d3-tooltip").remove();
        });
    }

    console.log('Map rendered with D3.js');
  };

  const generateMapFromPrompt = async (prompt: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-map-with-mistral', {
        body: { prompt }
      });

      if (error) throw error;

      const mapData = data.mapData;
      
      if (mapData.title) {
        setMapConfig(prev => ({ ...prev, title: mapData.title }));
        setTempTitle(mapData.title);
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
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = document.createElement("img");
    
    canvas.width = 800;
    canvas.height = 600;
    
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        const link = document.createElement("a");
        link.download = `${mapConfig.title.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        toast.success("Carte exportée avec succès!");
      }
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
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
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span>Génération de la carte...</span>
              </div>
            </div>
          )}
          <svg ref={svgRef} className="w-full h-auto border rounded-lg bg-white" />
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">{mapConfig.credits}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default D3MapDisplay;