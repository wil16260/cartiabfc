
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Map, FileText, Share2 } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import FileUpload from "@/components/FileUpload";
import MapDisplay from "@/components/MapDisplay";

const Index = () => {
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSearch = async (prompt: string) => {
    setCurrentPrompt(prompt);
    setIsGenerating(true);
    
    // Simulate AI processing time
    setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
  };

  const handleFilesUploaded = (files: File[]) => {
    setUploadedFiles(files);
  };

  const features = [
    {
      icon: Sparkles,
      title: "Génération IA",
      description: "Transformez le langage naturel en magnifiques visualisations géographiques"
    },
    {
      icon: Map,
      title: "Types de cartes multiples",
      description: "Cartes de points, choroplèthes, lignes et polygones avec style automatisé"
    },
    {
      icon: FileText,
      title: "Import de données",
      description: "Support pour Excel, CSV, GeoJSON, GPKG et formats KML"
    },
    {
      icon: Share2,
      title: "Export facile",
      description: "Exportez en PDF, image ou liens web interactifs partageables"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent">
            Générateur de Cartes IA pour Bourgogne-Franche-Comté
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Créez de magnifiques cartes interactives de la région Bourgogne-Franche-Comté à partir de prompts en langage naturel. 
            Parfait pour les journalistes de données, urbanistes, chercheurs et administrations publiques.
          </p>
        </div>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Left Column - Input */}
          <div className="space-y-8">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Décrivez votre carte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SearchBar onSearch={handleSearch} isLoading={isGenerating} />
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Télécharger des géodonnées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload onFilesUploaded={handleFilesUploaded} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Map */}
          <div>
            <MapDisplay prompt={currentPrompt} isLoading={isGenerating} />
          </div>
        </div>

        <Separator className="my-12" />

        {/* Features Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Fonctionnalités puissantes</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tout ce dont vous avez besoin pour créer des visualisations géographiques professionnelles avec l'IA
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="text-center p-6 shadow-card hover:shadow-ocean transition-all duration-300">
                <div className="inline-flex p-3 bg-gradient-hero rounded-full mb-4">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Index;
