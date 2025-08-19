import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sparkles, FileText, Clock, Database } from "lucide-react";

interface AIAnalysisPanelProps {
  generatedMap?: any;
  isVisible: boolean;
}

const AIAnalysisPanel = ({ generatedMap, isVisible }: AIAnalysisPanelProps) => {
  if (!isVisible || !generatedMap) {
    return null;
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Analyse Géographique IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {/* Title and Description */}
            {generatedMap.title && (
              <div>
                <h3 className="font-semibold text-lg">{generatedMap.title}</h3>
                {generatedMap.description && (
                  <p className="text-muted-foreground mt-1">{generatedMap.description}</p>
                )}
              </div>
            )}

            <Separator />

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              {generatedMap.dataLevel && (
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Niveau: <Badge variant="secondary">{generatedMap.dataLevel}</Badge>
                  </span>
                </div>
              )}
              
              {generatedMap.enhancedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Généré: {new Date(generatedMap.enhancedAt).toLocaleString('fr-FR')}
                  </span>
                </div>
              )}
              
              {generatedMap.documentsUsed !== undefined && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Documents: <Badge variant="outline">{generatedMap.documentsUsed}</Badge>
                  </span>
                </div>
              )}
              
              {generatedMap.ragEnhanced && (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    Enhanced by RAG
                  </Badge>
                </div>
              )}
            </div>

            <Separator />

            {/* Analysis */}
            {generatedMap.analysis && (
              <div>
                <h4 className="font-medium mb-2">Analyse</h4>
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  {generatedMap.analysis}
                </div>
              </div>
            )}

            {/* Sources */}
            {generatedMap.sources && generatedMap.sources.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Sources utilisées</h4>
                <div className="flex flex-wrap gap-1">
                  {generatedMap.sources.map((source: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Specs */}
            {generatedMap.technicalSpecs && (
              <div>
                <h4 className="font-medium mb-2">Spécifications techniques</h4>
                <div className="space-y-1 text-sm">
                  {Object.entries(generatedMap.technicalSpecs).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">{key}:</span>
                      <span>{value as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Raw Response */}
            {generatedMap.rawResponse && (
              <div>
                <h4 className="font-medium mb-2">Réponse IA brute</h4>
                <ScrollArea className="h-32">
                  <pre className="text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap">
                    {generatedMap.rawResponse}
                  </pre>
                </ScrollArea>
              </div>
            )}

            {/* GeoJSON Data Preview */}
            {generatedMap.features && (
              <div>
                <h4 className="font-medium mb-2">Données GeoJSON</h4>
                <div className="text-sm">
                  <Badge variant="secondary">
                    {generatedMap.features.length} feature(s)
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AIAnalysisPanel;