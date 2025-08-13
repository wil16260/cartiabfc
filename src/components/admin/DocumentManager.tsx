import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Upload, Trash2, Edit2, Download, Plus, X, CheckCircle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface Document {
  id: string;
  name: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  prompt?: string;
  metadata: any;
  embedding_processed: boolean;
  is_active: boolean;
  created_at: string;
}

export default function DocumentManager() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: '',
    tags: ''
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des documents:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', prompt: '', tags: '' });
    setSelectedFile(null);
    setEditingDoc(null);
    setShowUploadForm(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.name) {
        setFormData(prev => ({ ...prev, name: file.name }));
      }
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `documents/${fileName}`;

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (error) throw error;
    return filePath;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !editingDoc) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      let fileUrl = editingDoc?.file_url || '';
      let fileType = editingDoc?.file_type || '';
      let fileSize = editingDoc?.file_size || 0;

      if (selectedFile) {
        fileUrl = await uploadFile(selectedFile);
        fileType = selectedFile.type;
        fileSize = selectedFile.size;
      }

      const metadata = {
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        uploadedAt: new Date().toISOString()
      };

      // Get current user ID first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Utilisateur non authentifié')
      }

      const documentData = {
        name: formData.name,
        description: formData.description || null,
        file_url: fileUrl,
        file_type: fileType,
        file_size: fileSize,
        prompt: formData.prompt || null,
        metadata: metadata,
        created_by: user.id
      };

      if (editingDoc) {
        const { error } = await supabase
          .from('documents')
          .update(documentData)
          .eq('id', editingDoc.id);

        if (error) throw error;
        toast({
          title: "Succès",
          description: "Document mis à jour avec succès"
        });
      } else {
        const { error } = await supabase
          .from('documents')
          .insert([documentData]);

        if (error) throw error;
        toast({
          title: "Succès",
          description: "Document ajouté avec succès"
        });
      }

      resetForm();
      fetchDocuments();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le document",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (doc: Document) => {
    setEditingDoc(doc);
    setFormData({
      name: doc.name,
      description: doc.description || '',
      prompt: doc.prompt || '',
      tags: doc.metadata?.tags?.join(', ') || ''
    });
    setShowUploadForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Document supprimé avec succès"
      });
      fetchDocuments();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      fetchDocuments();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSupportedFileTypes = () => {
    return '.pdf,.doc,.docx,.txt,.md,.json,.csv,.xlsx,.xls';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Gestion des Documents RAG
            </CardTitle>
            <Button onClick={() => setShowUploadForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showUploadForm && (
            <Card className="mb-6 border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {editingDoc ? 'Modifier le document' : 'Nouveau document'}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom du document *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nom du document"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                      <Input
                        id="tags"
                        value={formData.tags}
                        onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="cartographie, géographie, analyse"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description du document et de son contenu"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prompt">Prompt d'utilisation</Label>
                    <Textarea
                      id="prompt"
                      value={formData.prompt}
                      onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                      placeholder="Contexte et instructions pour l'utilisation de ce document par l'IA..."
                      rows={4}
                      className="resize-none"
                    />
                    <p className="text-sm text-muted-foreground">
                      Ce prompt sera utilisé pour contextualiser l'utilisation de ce document lors de la génération de cartes.
                    </p>
                  </div>

                  {!editingDoc && (
                    <div className="space-y-2">
                      <Label htmlFor="file">Fichier *</Label>
                      <Input
                        id="file"
                        type="file"
                        onChange={handleFileSelect}
                        accept={getSupportedFileTypes()}
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        Formats supportés: PDF, DOC, DOCX, TXT, MD, JSON, CSV, XLSX, XLS
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit" disabled={uploading} className="gap-2">
                      <Upload className="h-4 w-4" />
                      {uploading ? 'Sauvegarde...' : editingDoc ? 'Mettre à jour' : 'Ajouter'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Annuler
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun document trouvé</p>
              <p className="text-sm text-muted-foreground">
                Ajoutez votre premier document pour commencer
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{doc.name}</div>
                          {doc.description && (
                            <div className="text-sm text-muted-foreground">
                              {doc.description}
                            </div>
                          )}
                          {doc.prompt && (
                            <div className="text-xs text-muted-foreground mt-1 italic">
                              Prompt: {doc.prompt.length > 50 ? `${doc.prompt.substring(0, 50)}...` : doc.prompt}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {doc.file_type || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell>
                        {doc.metadata?.tags?.map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs mr-1">
                            {tag}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={doc.is_active ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {doc.is_active ? "Actif" : "Inactif"}
                          </Badge>
                          <div title={doc.embedding_processed ? "Traité pour RAG" : "En attente de traitement"}>
                            {doc.embedding_processed ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(doc)}
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(doc.id, doc.is_active)}
                            title={doc.is_active ? "Désactiver" : "Activer"}
                          >
                            {doc.is_active ? "🔴" : "🟢"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                            title="Supprimer"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}