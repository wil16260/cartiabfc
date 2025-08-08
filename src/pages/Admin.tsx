
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings, Cpu, Palette, Activity, Save, LogOut, BarChart3, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import GeoJSONTemplateManager from "@/components/admin/GeoJSONTemplateManager";

const Admin = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const [aiModel, setAiModel] = useState("gpt-4");
  const [apiKey, setApiKey] = useState("");
  const [templates, setTemplates] = useState([
    { id: 1, name: "Bleu par défaut", active: true },
    { id: 2, name: "Thème océan", active: false },
    { id: 3, name: "Style terrain", active: false }
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-destructive">Accès restreint</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Cette page est réservée aux administrateurs. 
              {!user && " Vous devez vous connecter avec un compte administrateur."}
              {user && !isAdmin && " Votre compte n'a pas les privilèges administrateur."}
            </p>
            <div className="flex gap-2 justify-center">
              <Link to="/auth">
                <Button>Se connecter</Button>
              </Link>
              <Link to="/">
                <Button variant="outline">Retour à l'accueil</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSaveSettings = () => {
    toast({
      title: "Succès",
      description: "Paramètres sauvegardés avec succès !"
    });
  };

  const handleAddTemplate = () => {
    const newTemplate = {
      id: templates.length + 1,
      name: `Modèle ${templates.length + 1}`,
      active: false
    };
    setTemplates([...templates, newTemplate]);
    toast({
      title: "Succès",
      description: "Nouveau modèle ajouté !"
    });
  };

  const toggleTemplate = (id: number) => {
    setTemplates(templates.map(template => 
      template.id === id 
        ? { ...template, active: !template.active }
        : template
    ));
  };

  const mockStats = {
    totalMaps: 1247,
    thisMonth: 156,
    activeUsers: 89,
    avgResponseTime: "2.3s"
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
              Tableau de bord administrateur
            </h1>
            <p className="text-muted-foreground">
              Gérez les modèles IA, les modèles de cartes et surveillez l'utilisation du système
            </p>
          </div>
          <Button onClick={signOut} variant="outline" className="gap-2">
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </Button>
        </div>

        <Tabs defaultValue="ai-config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="ai-config" className="gap-2">
              <Cpu className="h-4 w-4" />
              Configuration IA
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Palette className="h-4 w-4" />
              Modèles
            </TabsTrigger>
            <TabsTrigger value="geojson" className="gap-2">
              <MapPin className="h-4 w-4" />
              GeoJSON
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <Activity className="h-4 w-4" />
              Analytiques
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-config">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Configuration du modèle IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="ai-model">Modèle IA</Label>
                    <Select value={aiModel} onValueChange={setAiModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le modèle IA" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        <SelectItem value="claude-3">Claude 3</SelectItem>
                        <SelectItem value="mistral-large">Mistral Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="api-key">Clé API</Label>
                    <Input
                      id="api-key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Entrez votre clé API"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="system-prompt">Prompt système</Label>
                  <Textarea
                    id="system-prompt"
                    placeholder="Entrez le prompt système pour le modèle IA..."
                    className="min-h-32"
                    defaultValue="Vous êtes un assistant IA géospatial expert qui aide les utilisateurs à créer de belles cartes précises de la région Bourgogne-Franche-Comté à partir de descriptions en langage naturel. Concentrez-vous sur l'interprétation des exigences géographiques, l'analyse de données et les préférences de style visuel pour cette région spécifique."
                  />
                </div>

                <Button onClick={handleSaveSettings} variant="hero" className="gap-2">
                  <Save className="h-4 w-4" />
                  Sauvegarder la configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Modèles de cartes
                  </CardTitle>
                  <Button onClick={handleAddTemplate} variant="outline">
                    Ajouter un modèle
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="relative">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium">{template.name}</h3>
                          <Badge variant={template.active ? "default" : "secondary"}>
                            {template.active ? "Actif" : "Inactif"}
                          </Badge>
                        </div>
                        <div className="h-24 bg-gradient-ocean rounded-md mb-3"></div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => toggleTemplate(template.id)}
                          className="w-full"
                        >
                          {template.active ? "Désactiver" : "Activer"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="geojson" className="space-y-6">
            <GeoJSONTemplateManager />
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Statistiques d'utilisation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">1,234</div>
                    <div className="text-sm text-muted-foreground">Cartes générées</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">567</div>
                    <div className="text-sm text-muted-foreground">Utilisateurs actifs</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">89%</div>
                    <div className="text-sm text-muted-foreground">Taux de satisfaction</div>
                  </div>
                </div>
                <div className="mt-6 h-64 bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Graphiques d'analytiques à implémenter</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Paramètres système
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="max-file-size">Taille max des fichiers (MB)</Label>
                    <Input
                      id="max-file-size"
                      type="number"
                      defaultValue="50"
                      min="1"
                      max="100"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="timeout">Timeout des requêtes (secondes)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      defaultValue="30"
                      min="10"
                      max="120"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveSettings} variant="hero" className="gap-2">
                  <Save className="h-4 w-4" />
                  Sauvegarder les paramètres
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
