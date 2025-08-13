
import { useState } from "react";
import { Search, Sparkles, Map, MapPin, Palette, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SearchBarProps {
  onSearch: (prompt: string) => void;
  isLoading?: boolean;
  mapTypes?: {
    id: string;
    name: string;
    enabled: boolean;
    description?: string;
  }[];
  onMapTypeToggle?: (mapTypeId: string, enabled: boolean) => void;
}

const SearchBar = ({ onSearch, isLoading = false, mapTypes = [], onMapTypeToggle }: SearchBarProps) => {
  const [prompt, setPrompt] = useState("");
  const [selectedMapType, setSelectedMapType] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast.error("Veuillez entrer un prompt pour générer votre carte");
      return;
    }
    onSearch(prompt.trim());
  };

  const handleMapTypeChange = (value: string) => {
    if (!onMapTypeToggle) return;
    
    // First disable all map types
    mapTypes.forEach(mapType => {
      onMapTypeToggle(mapType.id, false);
    });
    // Then enable the selected one
    onMapTypeToggle(value, true);
    setSelectedMapType(value);
  };

  // Early return if mapTypes is not available yet
  if (!mapTypes || mapTypes.length === 0) {
    return (
      <div className="w-full">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Décrivez la carte que vous souhaitez créer... (ex: 'Montrer toutes les communes du Doubs avec population et code couleur par densité')"
              className="pl-12 pr-32 h-14 text-base border-2 border-primary/20 focus:border-primary transition-colors"
              disabled={isLoading}
            />
            <Button
              type="submit"
              variant="hero"
              size="lg"
              disabled={isLoading || !prompt.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 gap-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Générer la carte
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Décrivez la carte que vous souhaitez créer... (ex: 'Montrer toutes les communes du Doubs avec population et code couleur par densité')"
            className="pl-12 pr-32 h-14 text-base border-2 border-primary/20 focus:border-primary transition-colors"
            disabled={isLoading}
          />
          <Button
            type="submit"
            variant="hero"
            size="lg"
            disabled={isLoading || !prompt.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 gap-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Générer la carte
          </Button>
        </div>
      </form>

      {/* Map Types Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-primary" />
          <h4 className="font-medium text-sm">Types de cartes</h4>
        </div>
        <RadioGroup value={selectedMapType} onValueChange={handleMapTypeChange}>
          <div className="flex flex-wrap gap-4">
            {mapTypes.map((mapType) => (
              <div key={mapType.id} className="flex items-center space-x-2">
                <RadioGroupItem value={mapType.id} id={mapType.id} />
                <Label 
                  htmlFor={mapType.id}
                  className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                >
                  {mapType.id === 'geocodage' && <MapPin className="h-3 w-3" />}
                  {mapType.id === 'chloroplethe' && <Palette className="h-3 w-3" />}
                  {mapType.id === 'complexe' && <Layers className="h-3 w-3" />}
                  {mapType.name}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

export default SearchBar;
