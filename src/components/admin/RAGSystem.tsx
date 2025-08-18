import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Brain, Download, Search, FileText, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface RAGDocument {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  relevanceScore?: number;
  downloadStatus: 'pending' | 'downloading' | 'ready' | 'error';
}

const RECOMMENDED_DOCUMENTS: RAGDocument[] = [
  {
    id: 'insee-geo-admin',
    name: 'INSEE - Géographie Administrative',
    description: 'Code officiel géographique, communes, EPCI, départements',
    url: 'https://www.insee.fr/fr/information/8064273',
    category: 'administrative',
    downloadStatus: 'pending'
  },
  {
    id: 'insee-donnees-locales',
    name: 'INSEE - Données Locales',
    description: 'Données démographiques et économiques par territoire',
    url: 'https://www.insee.fr/fr/information/3544265',
    category: 'demographic',
    downloadStatus: 'pending'
  },
  {
    id: 'ign-bdtopo',
    name: 'IGN - BD TOPO Guide',
    description: 'Documentation technique base de données topographiques',
    url: 'https://geoservices.ign.fr/sites/default/files/2021-07/DC_BDTOPO_3-0.pdf',
    category: 'geographic',
    downloadStatus: 'pending'
  },
  {
    id: 'anct-bfc-fiche',
    name: 'ANCT - Fiche Territoriale BFC',
    description: 'Contexte territorial et données clés Bourgogne-Franche-Comté',
    url: 'https://fiches.incubateur.anct.gouv.fr/fiches/globale/r%C3%A9gion/27',
    category: 'territorial',
    downloadStatus: 'pending'
  }
];

export default function RAGSystem() {
  const [documents, setDocuments] = useState<RAGDocument[]>(RECOMMENDED_DOCUMENTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);

  const downloadAndProcessDocument = async (doc: RAGDocument) => {
    setDocuments(prev => prev.map(d => 
      d.id === doc.id ? { ...d, downloadStatus: 'downloading' } : d
    ));

    try {
      // Download the document content
      const response = await fetch(doc.url);
      if (!response.ok) throw new Error('Failed to fetch document');
      
      const content = await response.text();
      
      // Create a processed document for RAG
      const processedDoc = {
        name: doc.name,
        description: doc.description,
        file_url: doc.url,
        file_type: 'text/html',
        file_size: content.length,
        metadata: {
          category: doc.category,
          source_url: doc.url,
          processed_at: new Date().toISOString(),
          tags: [doc.category, 'bourgogne-franche-comte', 'geographic', 'reference']
        },
        prompt: `Ce document contient des informations essentielles sur ${doc.description.toLowerCase()}. Utilisez ces informations pour améliorer la précision des descriptions géographiques et la génération de cartes pour la région Bourgogne-Franche-Comté.`,
        is_active: true,
        embedding_processed: false
      };

      // Save to documents table
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('documents')
        .insert([{
          ...processedDoc,
          created_by: user.id
        }]);

      if (error) throw error;

      setDocuments(prev => prev.map(d => 
        d.id === doc.id ? { ...d, downloadStatus: 'ready' } : d
      ));

      toast({
        title: "Document ajouté",
        description: `${doc.name} a été ajouté au système RAG`
      });

    } catch (error) {
      console.error('Error processing document:', error);
      setDocuments(prev => prev.map(d => 
        d.id === doc.id ? { ...d, downloadStatus: 'error' } : d
      ));
      
      toast({
        title: "Erreur",
        description: `Impossible de traiter ${doc.name}`,
        variant: "destructive"
      });
    }
  };

  const indexAllDocuments = async () => {
    setIsIndexing(true);
    setIndexProgress(0);
    
    const pendingDocs = documents.filter(doc => doc.downloadStatus === 'pending');
    
    for (let i = 0; i < pendingDocs.length; i++) {
      await downloadAndProcessDocument(pendingDocs[i]);
      setIndexProgress(((i + 1) / pendingDocs.length) * 100);
    }
    
    setIsIndexing(false);
    toast({
      title: "Indexation terminée",
      description: "Tous les documents ont été traités pour le système RAG"
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'administrative': 'bg-blue-100 text-blue-800',
      'demographic': 'bg-green-100 text-green-800',
      'geographic': 'bg-purple-100 text-purple-800',
      'territorial': 'bg-orange-100 text-orange-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return '✅';
      case 'downloading': return '⏳';
      case 'error': return '❌';
      default: return '📄';
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Système RAG - Documents de Référence
            </CardTitle>
            <Button 
              onClick={indexAllDocuments} 
              disabled={isIndexing}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isIndexing ? 'Indexation...' : 'Indexer tout'}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Documents essentiels pour améliorer la génération de cartes IA
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isIndexing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">Indexation en cours...</span>
                <span className="text-sm text-muted-foreground">{Math.round(indexProgress)}%</span>
              </div>
              <Progress value={indexProgress} className="h-2" />
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans les documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="border-2 border-muted">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-2xl">{getStatusIcon(doc.downloadStatus)}</span>
                    </div>
                    <Badge className={getCategoryColor(doc.category)}>
                      {doc.category}
                    </Badge>
                  </div>
                  
                  <h3 className="font-medium mb-2">{doc.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{doc.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">BFC</span>
                    </div>
                    
                    {doc.downloadStatus === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadAndProcessDocument(doc)}
                        className="gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Ajouter
                      </Button>
                    )}
                    
                    {doc.downloadStatus === 'ready' && (
                      <Badge variant="default" className="text-xs">
                        Prêt
                      </Badge>
                    )}
                    
                    {doc.downloadStatus === 'error' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => downloadAndProcessDocument(doc)}
                        className="gap-1"
                      >
                        Réessayer
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Comment le RAG améliore vos cartes :</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Descriptions précises</strong> : Terminologie géographique exacte</li>
              <li>• <strong>Données contextuelles</strong> : Informations démographiques et administratives</li>
              <li>• <strong>Références territoriales</strong> : Codes INSEE, EPCI, limites administratives</li>
              <li>• <strong>Génération GeoJSON</strong> : Structures de données géographiques optimisées</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}