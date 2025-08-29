import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Layers, Database, Map, MapPin, Palette, Plus, Trash2, Settings, Edit3, Check, X } from "lucide-react";

interface FilterPanelProps {
  layers: {
    id: string;
    name: string;
    enabled: boolean;
    description?: string;
    type?: 'base' | 'ai' | 'data';
    color?: string;
    opacity?: number;
  }[];
  onLayerToggle: (layerId: string, enabled: boolean) => void;
  onLayerDelete?: (layerId: string) => void;
  onLayerStyleChange?: (layerId: string, style: { color?: string; opacity?: number }) => void;
  onAddLayer?: () => void;
  mapConfig?: {
    dataLabel: string;
  };
  onDataLabelEdit?: () => void;
  isEditingDataLabel?: boolean;
}

const FilterPanel = ({ layers, onLayerToggle, onLayerDelete, onLayerStyleChange, onAddLayer, mapConfig, onDataLabelEdit, isEditingDataLabel }: FilterPanelProps) => {
  const baseLayers = layers.filter(layer => layer.type === 'base' && layer.id !== 'base_ign');
  const aiLayers = layers.filter(layer => layer.type === 'ai' || (!layer.type && !layer.id.startsWith('base_')));

  const LayerStyleControls = ({ layer }: { layer: any }) => (
    <div className="ml-6 mt-2 space-y-2 border-l-2 border-muted pl-3">
      <div className="flex items-center gap-2">
        <Label className="text-xs">Couleur:</Label>
        <Input
          type="color"
          value={layer.color || '#3b82f6'}
          onChange={(e) => onLayerStyleChange?.(layer.id, { color: e.target.value })}
          className="w-8 h-6 p-0 border-none"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Opacité: {Math.round((layer.opacity || 1) * 100)}%</Label>
        <Slider
          value={[(layer.opacity || 1) * 100]}
          onValueChange={([value]) => onLayerStyleChange?.(layer.id, { opacity: value / 100 })}
          max={100}
          min={0}
          step={5}
          className="w-full"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="h-fit">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {isEditingDataLabel ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={mapConfig?.dataLabel || "Données"}
                    className="bg-transparent border-b border-primary focus:outline-none font-semibold"
                    onKeyPress={(e) => e.key === 'Enter' && onDataLabelEdit?.()}
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" onClick={onDataLabelEdit} className="h-6 w-6 p-0">
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onDataLabelEdit} className="h-6 w-6 p-0">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <span className="cursor-pointer flex items-center gap-1" onClick={onDataLabelEdit}>
                  {mapConfig?.dataLabel || "Couches de données"}
                  <Edit3 className="h-3 w-3 text-muted-foreground hover:text-primary" />
                </span>
              )}
            </div>
            {onAddLayer && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAddLayer}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base Layers Control Section */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Map className="h-4 w-4" />
              Couches de base
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>OpenStreetMap</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span>Satellite</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span>Carto Light</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span>Plan IGN</span>
              </label>
            </div>
          </div>

          {/* Administrative boundaries */}
          {baseLayers.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                Limites administratives
              </h4>
              <div className="space-y-3">
                {baseLayers.map((layer) => (
                  <div key={layer.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start space-x-3">
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
                            className="text-sm font-medium leading-none"
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                    {layer.enabled && <LayerStyleControls layer={layer} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Generated layers */}
          {aiLayers.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Données générées par IA
                </h4>
                <div className="space-y-3">
                  {aiLayers.map((layer) => (
                    <div key={layer.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-3">
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
                              className="text-sm font-medium leading-none"
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
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                          {onLayerDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onLayerDelete(layer.id)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {layer.enabled && <LayerStyleControls layer={layer} />}
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