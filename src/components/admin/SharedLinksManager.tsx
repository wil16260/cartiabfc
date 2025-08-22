import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Link, 
  Eye, 
  Copy, 
  ExternalLink, 
  Trash2, 
  Edit, 
  Search,
  Calendar,
  Users
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface SharedMap {
  id: string;
  title: string;
  description: string | null;
  share_token: string;
  view_count: number;
  is_public: boolean;
  created_at: string;
  created_by: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

const SharedLinksManager = () => {
  const [sharedMaps, setSharedMaps] = useState<SharedMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSharedMaps();
  }, []);

  const fetchSharedMaps = async () => {
    try {
      const { data, error } = await supabase
        .from('shared_maps')
        .select(`
          *,
          profiles!shared_maps_created_by_fkey (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSharedMaps((data as any) || []);
    } catch (error) {
      console.error('Error fetching shared maps:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les liens partagés",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (shareToken: string) => {
    const url = `${window.location.origin}/map/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Succès",
        description: "Lien copié dans le presse-papiers"
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive"
      });
    }
  };

  const openMap = (shareToken: string) => {
    window.open(`/map/${shareToken}`, '_blank');
  };

  const togglePublicStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('shared_maps')
        .update({ is_public: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setSharedMaps(prev => prev.map(map => 
        map.id === id ? { ...map, is_public: !currentStatus } : map
      ));

      toast({
        title: "Succès",
        description: `Carte ${!currentStatus ? 'publiée' : 'dépubliée'} avec succès`
      });
    } catch (error) {
      console.error('Error updating map status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut de la carte",
        variant: "destructive"
      });
    }
  };

  const deleteMap = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette carte partagée ?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('shared_maps')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSharedMaps(prev => prev.filter(map => map.id !== id));
      
      toast({
        title: "Succès",
        description: "Carte supprimée avec succès"
      });
    } catch (error) {
      console.error('Error deleting map:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la carte",
        variant: "destructive"
      });
    }
  };

  const filteredMaps = sharedMaps.filter(map => 
    map.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    map.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    map.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalViews = sharedMaps.reduce((sum, map) => sum + (map.view_count || 0), 0);
  const publicMaps = sharedMaps.filter(map => map.is_public).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Link className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{sharedMaps.length}</p>
                <p className="text-sm text-muted-foreground">Cartes partagées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalViews}</p>
                <p className="text-sm text-muted-foreground">Vues totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{publicMaps}</p>
                <p className="text-sm text-muted-foreground">Cartes publiques</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Gestion des liens partagés
            </CardTitle>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre, description ou créateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredMaps.length === 0 ? (
            <div className="text-center py-8">
              <Link className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "Aucun résultat trouvé" : "Aucune carte partagée"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMaps.map((map) => (
                <div key={map.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium truncate">{map.title}</h3>
                        <Badge variant={map.is_public ? "default" : "secondary"}>
                          {map.is_public ? "Public" : "Privé"}
                        </Badge>
                      </div>
                      
                      {map.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {map.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {map.view_count || 0} vues
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(map.created_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </div>
                        {map.profiles?.full_name && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {map.profiles.full_name}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        onClick={() => copyToClipboard(map.share_token)}
                        variant="ghost"
                        size="sm"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        onClick={() => openMap(map.share_token)}
                        variant="ghost"
                        size="sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        onClick={() => togglePublicStatus(map.id, map.is_public)}
                        variant="ghost"
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        onClick={() => deleteMap(map.id)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SharedLinksManager;