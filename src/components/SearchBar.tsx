
import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const examplePrompts = [
    "Montrer toutes les communes de Côte-d'Or avec données démographiques",
    "Créer une carte choroplèthe des départements de Bourgogne-Franche-Comté par PIB",
    "Cartographier les offices de tourisme dans le Jura avec évaluations",
    "Afficher les zones viticoles en Bourgogne avec appellations"
  ];

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

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground font-medium">Essayez ces exemples :</p>
        <div className="flex flex-wrap gap-2">
          {examplePrompts.map((example, index) => (
            <button
              key={index}
              onClick={() => setPrompt(example)}
              className="text-xs bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary px-3 py-2 rounded-full transition-colors border border-border hover:border-primary/30"
              disabled={isLoading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
