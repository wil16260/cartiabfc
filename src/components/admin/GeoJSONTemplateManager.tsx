import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Plus, MapPin, Settings, Trash2, Loader2 } from 'lucide-react'

interface GeoJSONTemplate {
  id: string
  name: string
  description: string | null
  geojson_url: string
  properties: any
  style_config: any
  is_active: boolean
  created_at: string
}

const GeoJSONTemplateManager = () => {
  const [templates, setTemplates] = useState<GeoJSONTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<GeoJSONTemplate | null>(null)
  
  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [geojsonUrl, setGeojsonUrl] = useState('')
  const [properties, setProperties] = useState('')
  const [styleConfig, setStyleConfig] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('geojson_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les modèles GeoJSON',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setGeojsonUrl('')
    setProperties('')
    setStyleConfig('')
    setIsActive(true)
    setEditingTemplate(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Parse JSON fields
      let parsedProperties = null
      let parsedStyleConfig = null
      
      if (properties.trim()) {
        try {
          parsedProperties = JSON.parse(properties)
        } catch {
          throw new Error('Format JSON invalide pour les propriétés')
        }
      }
      
      if (styleConfig.trim()) {
        try {
          parsedStyleConfig = JSON.parse(styleConfig)
        } catch {
          throw new Error('Format JSON invalide pour la configuration de style')
        }
      }

      const templateData = {
        name,
        description: description || null,
        geojson_url: geojsonUrl,
        properties: parsedProperties,
        style_config: parsedStyleConfig,
        is_active: isActive
      }

      let error
      if (editingTemplate) {
        const { error: updateError } = await supabase
          .from('geojson_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from('geojson_templates')
          .insert(templateData)
        error = insertError
      }

      if (error) throw error

      toast({
        title: 'Succès',
        description: editingTemplate 
          ? 'Modèle GeoJSON mis à jour avec succès'
          : 'Modèle GeoJSON créé avec succès'
      })

      resetForm()
      fetchTemplates()
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (template: GeoJSONTemplate) => {
    setEditingTemplate(template)
    setName(template.name)
    setDescription(template.description || '')
    setGeojsonUrl(template.geojson_url)
    setProperties(template.properties ? JSON.stringify(template.properties, null, 2) : '')
    setStyleConfig(template.style_config ? JSON.stringify(template.style_config, null, 2) : '')
    setIsActive(template.is_active)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) return

    try {
      const { error } = await supabase
        .from('geojson_templates')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Succès',
        description: 'Modèle GeoJSON supprimé avec succès'
      })

      fetchTemplates()
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le modèle',
        variant: 'destructive'
      })
    }
  }

  const toggleActive = async (template: GeoJSONTemplate) => {
    try {
      const { error } = await supabase
        .from('geojson_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id)

      if (error) throw error

      toast({
        title: 'Succès',
        description: `Modèle ${!template.is_active ? 'activé' : 'désactivé'}`
      })

      fetchTemplates()
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le modèle',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Modèles GeoJSON</h3>
          <p className="text-sm text-muted-foreground">
            Gérez les modèles de données géographiques pour la carte
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouveau modèle
        </Button>
      </div>

      {showForm && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {editingTemplate ? 'Modifier le modèle' : 'Nouveau modèle GeoJSON'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du modèle</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Départements BFC"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="geojson-url">URL GeoJSON</Label>
                  <Input
                    id="geojson-url"
                    value={geojsonUrl}
                    onChange={(e) => setGeojsonUrl(e.target.value)}
                    placeholder="Ex: /data/departements-france.geojson"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description du modèle..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="properties">Propriétés (JSON)</Label>
                <Textarea
                  id="properties"
                  value={properties}
                  onChange={(e) => setProperties(e.target.value)}
                  placeholder='{"fieldName": "value", "type": "choropleth"}'
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="style-config">Configuration de style (JSON)</Label>
                <Textarea
                  id="style-config"
                  value={styleConfig}
                  onChange={(e) => setStyleConfig(e.target.value)}
                  placeholder='{"fillColor": "#3388ff", "weight": 2, "opacity": 1}'
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="is-active">Modèle actif</Label>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      editingTemplate ? 'Mettre à jour' : 'Créer'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card className="text-center p-8">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun modèle GeoJSON</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre premier modèle pour commencer à configurer la carte
            </p>
            <Button onClick={() => setShowForm(true)}>Créer un modèle</Button>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id} className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{template.name}</h4>
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                    
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {template.description}
                      </p>
                    )}
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>URL: {template.geojson_url}</div>
                      <div>Créé le: {new Date(template.created_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(template)}
                    >
                      {template.is_active ? 'Désactiver' : 'Activer'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default GeoJSONTemplateManager