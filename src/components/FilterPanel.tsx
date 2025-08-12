import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Layers, Database, Map, MapPin, Palette } from "lucide-react";

interface FilterPanelProps {
  layers: {
    id: string;
    name: string;
    enabled: boolean;
    description?: string;
  }[];
  mapTypes: {
    id: string;
    name: string;
    enabled: boolean;
    description?: string;
  }[];
  onLayerToggle: (layerId: string, enabled: boolean) => void;
  onMapTypeToggle: (mapTypeId: string, enabled: boolean) => void;
}

const FilterPanel = ({ layers, mapTypes, onLayerToggle, onMapTypeToggle }: FilterPanelProps) => {
  const baseLayers = layers.filter(layer => layer.id.startsWith('base_'));
  const dataLayers = layers.filter(layer => !layer.id.startsWith('base_'));

  return (
    <div className="space-y-4">
      {/* Map Types Section */}
      <Card className="h-fit">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Map className="h-5 w-5 text-primary" />
            Types de cartes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">
              Assistance IA
            </h4>
            <div className="space-y-3">
              {mapTypes.map((mapType) => (
                <div key={mapType.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={mapType.id}
                    checked={mapType.enabled}
                    onCheckedChange={(checked) => 
                      onMapTypeToggle(mapType.id, checked as boolean)
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label 
                      htmlFor={mapType.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      {mapType.id === 'geocodage' && <MapPin className="h-3 w-3" />}
                      {mapType.id === 'chloroplethe' && <Palette className="h-3 w-3" />}
                      {mapType.id === 'complexe' && <Layers className="h-3 w-3" />}
                      {mapType.name}
                    </Label>
                    {mapType.description && (
                      <p className="text-xs text-muted-foreground">
                        {mapType.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Layers Section */}
      <Card className="h-fit">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5 text-primary" />
            Couches de données
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
        {baseLayers.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">
              Couche de base
            </h4>
            <div className="space-y-3">
              {baseLayers.map((layer) => (
                <div key={layer.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={layer.id}
                    checked={layer.enabled}
                    onCheckedChange={(checked) => 
                      onLayerToggle(layer.id, checked as boolean)
                    }
                    disabled={layer.id === 'base_departments'} // Base layer always enabled
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label 
                      htmlFor={layer.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {layer.name}
                    </Label>
                    {layer.description && (
                      <p className="text-xs text-muted-foreground">
                        {layer.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {dataLayers.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Database className="h-4 w-4" />
                Données thématiques
              </h4>
              <div className="space-y-3">
                {dataLayers.map((layer) => (
                  <div key={layer.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={layer.id}
                      checked={layer.enabled}
                      onCheckedChange={(checked) => 
                        onLayerToggle(layer.id, checked as boolean)
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label 
                        htmlFor={layer.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {layer.name}
                      </Label>
                      {layer.description && (
                        <p className="text-xs text-muted-foreground">
                          {layer.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FilterPanel;