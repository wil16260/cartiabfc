import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Share2, 
  Copy, 
  ExternalLink, 
  Check,
  Loader2 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface MapShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapData: any;
  layers: any[];
}

const MapShareDialog = ({ open, onOpenChange, mapData, layers }: MapShareDialogProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour partager une carte",
        variant: "destructive"
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre est obligatoire",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase
        .from('shared_maps')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          map_data: mapData,
          layers: layers,
          is_public: isPublic,
          created_by: user.id
        })
        .select('share_token')
        .single();

      if (error) throw error;

      const url = `${window.location.origin}/map/${data.share_token}`;
      setShareUrl(url);
      setIsShared(true);

      toast({
        title: "Succès",
        description: "Carte partagée avec succès !"
      });
    } catch (error) {
      console.error('Error sharing map:', error);
      toast({
        title: "Erreur",
        description: "Impossible de partager la carte",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
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

  const openMap = () => {
    window.open(shareUrl, '_blank');
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setIsPublic(true);
    setIsShared(false);
    setShareUrl("");
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Partager la carte
          </DialogTitle>
          <DialogDescription>
            {isShared 
              ? "Votre carte a été partagée avec succès"
              : "Créez un lien de partage permanent pour cette carte"
            }
          </DialogDescription>
        </DialogHeader>

        {!isShared ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de la carte *</Label>
              <Input
                id="title"
                placeholder="Donnez un titre à votre carte..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnelle)</Label>
              <Textarea
                id="description"
                placeholder="Décrivez votre carte..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="public">Carte publique</Label>
                <p className="text-sm text-muted-foreground">
                  Permet à tous de voir votre carte
                </p>
              </div>
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            <Button 
              onClick={handleShare}
              disabled={isCreating || !title.trim()}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Créer le lien de partage
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg">
              <Label className="text-sm font-medium">Lien de partage</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={shareUrl}
                  readOnly
                  className="bg-background text-sm"
                />
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                  disabled={copied}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={openMap}
                variant="outline"
                className="flex-1"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Ouvrir la carte
              </Button>
              <Button
                onClick={handleClose}
                className="flex-1"
              >
                Fermer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MapShareDialog;