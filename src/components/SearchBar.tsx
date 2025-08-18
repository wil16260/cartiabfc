
import { useState, useEffect } from "react";
import { Search, Sparkles, Map, MapPin, Palette, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SearchBarProps {
  onSearch: (prompt: string) => void;
  isLoading?: boolean;
}

const SearchBar = ({ onSearch, isLoading = false }: SearchBarProps) => {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast.error("Veuillez entrer un prompt pour générer votre carte");
      return;
    }
    onSearch(prompt.trim());
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Décrivez la carte que vous souhaitez créer... L'IA choisira automatiquement le meilleur type de carte"
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
};

export default SearchBar;
