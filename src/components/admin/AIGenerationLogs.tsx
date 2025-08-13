import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Activity, CheckCircle, XCircle, Clock, User, Trash2, RefreshCw, FileUp, Edit, Save } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface AIGenerationLog {
  id: string
  user_prompt: string
  ai_response: any
  raw_ai_response: string
  success: boolean
  error_message: string | null
  model_name: string | null
  system_prompt: string | null
  execution_time_ms: number | null
  created_at: string
  created_by: string | null
  validated: boolean | null
  validation_notes: string | null
  corrected_geodata_url: string | null
  corrected_geodata: any
  validated_by: string | null
  validated_at: string | null
}

const AIGenerationLogs = () => {
  const [logs, setLogs] = useState<AIGenerationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AIGenerationLog | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationForm, setValidationForm] = useState({
    validated: null as boolean | null,
    validation_notes: '',
    corrected_geodata_url: '',
    corrected_geodata: null as any
  })

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ai_generation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des logs:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les logs de génération IA",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteLog = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_generation_logs')
        .delete()
        .eq('id', id)

      if (error) throw error

      setLogs(logs.filter(log => log.id !== id))
      if (selectedLog?.id === id) {
        setSelectedLog(null)
      }

      toast({
        title: "Succès",
        description: "Log supprimé avec succès"
      })
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le log",
        variant: "destructive"
      })
    }
  }

  const clearAllLogs = async () => {
    try {
      const { error } = await supabase
        .from('ai_generation_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      if (error) throw error

      setLogs([])
      setSelectedLog(null)

      toast({
        title: "Succès",
        description: "Tous les logs ont été supprimés"
      })
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les logs",
        variant: "destructive"
      })
    }
  }

  const validateLog = async (logId: string, validationData: any) => {
    try {
      setIsValidating(true)
      const { error } = await supabase
        .from('ai_generation_logs')
        .update({
          validated: validationData.validated,
          validation_notes: validationData.validation_notes,
          corrected_geodata_url: validationData.corrected_geodata_url,
          corrected_geodata: validationData.corrected_geodata,
          validated_by: (await supabase.auth.getUser()).data.user?.id,
          validated_at: new Date().toISOString()
        })
        .eq('id', logId)

      if (error) throw error

      // Update local state
      setLogs(logs.map(log => 
        log.id === logId 
          ? { ...log, ...validationData, validated_at: new Date().toISOString() }
          : log
      ))

      if (selectedLog?.id === logId) {
        setSelectedLog({ ...selectedLog, ...validationData, validated_at: new Date().toISOString() })
      }

      setIsValidating(false)
      toast({
        title: "Validation enregistrée",
        description: validationData.validated ? "Log validé avec succès" : "Log marqué comme invalide"
      })
    } catch (error) {
      console.error('Erreur lors de la validation:', error)
      setIsValidating(false)
      toast({
        title: "Erreur",
        description: "Impossible de valider le log",
        variant: "destructive"
      })
    }
  }

  const handleGeodataFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const geojson = JSON.parse(text)
      setValidationForm(prev => ({ ...prev, corrected_geodata: geojson }))
      toast({
        title: "Fichier chargé",
        description: "GeoJSON importé avec succès"
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Fichier GeoJSON invalide",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR')
  }

  const getStatusBadge = (success: boolean, errorMessage: string | null) => {
    if (success) {
      return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Succès</Badge>
    } else {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Échec</Badge>
    }
  }

  const getValidationBadge = (validated: boolean | null) => {
    if (validated === true) {
      return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Validé</Badge>
    } else if (validated === false) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Invalide</Badge>
    } else {
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />En attente</Badge>
    }
  }

  useEffect(() => {
    if (selectedLog) {
      setValidationForm({
        validated: selectedLog.validated,
        validation_notes: selectedLog.validation_notes || '',
        corrected_geodata_url: selectedLog.corrected_geodata_url || '',
        corrected_geodata: selectedLog.corrected_geodata
      })
    }
  }, [selectedLog])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Logs de génération IA
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={fetchLogs} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Actualiser
              </Button>
              <Button onClick={clearAllLogs} variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Tout supprimer
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Liste des logs */}
            <div className="space-y-4">
              <h3 className="font-medium">Historique des générations ({logs.length})</h3>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {logs.map((log) => (
                    <Card 
                      key={log.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedLog?.id === log.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                              {getStatusBadge(log.success, log.error_message)}
                              {getValidationBadge(log.validated)}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm font-medium line-clamp-2">
                            {log.user_prompt}
                          </p>
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.created_by ? 'Utilisateur connecté' : 'Anonyme'}
                            </span>
                            {log.execution_time_ms && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {log.execution_time_ms}ms
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {logs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucun log de génération trouvé
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Détails du log sélectionné */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Détails du log</h3>
                {selectedLog && (
                  <Button 
                    onClick={() => deleteLog(selectedLog.id)} 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </Button>
                )}
              </div>
              
              {selectedLog ? (
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Prompt utilisateur</h4>
                      <p className="text-sm bg-muted p-3 rounded-md">
                        {selectedLog.user_prompt}
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Statut</h4>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(selectedLog.success, selectedLog.error_message)}
                        {selectedLog.model_name && (
                          <Badge variant="outline">{selectedLog.model_name}</Badge>
                        )}
                      </div>
                    </div>

                    {selectedLog.error_message && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium mb-2 text-destructive">Message d'erreur</h4>
                          <p className="text-sm bg-destructive/10 text-destructive p-3 rounded-md">
                            {selectedLog.error_message}
                          </p>
                        </div>
                      </>
                    )}

                    {selectedLog.ai_response && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium mb-2">Réponse IA (parsée)</h4>
                          <ScrollArea className="h-[200px]">
                            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                              {JSON.stringify(selectedLog.ai_response, null, 2)}
                            </pre>
                          </ScrollArea>
                        </div>
                      </>
                    )}

                    {selectedLog.raw_ai_response && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium mb-2">Réponse IA (brute)</h4>
                          <ScrollArea className="h-[200px]">
                            <p className="text-xs bg-muted p-3 rounded-md whitespace-pre-wrap">
                              {selectedLog.raw_ai_response}
                            </p>
                          </ScrollArea>
                        </div>
                      </>
                    )}

                    <Separator />

                    <Separator />

                    {/* Validation Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Validation</h4>
                        {getValidationBadge(selectedLog.validated)}
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={validationForm.validated === true ? "default" : "outline"}
                            onClick={() => setValidationForm(prev => ({ ...prev, validated: true }))}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Valider
                          </Button>
                          <Button
                            size="sm"
                            variant={validationForm.validated === false ? "destructive" : "outline"}
                            onClick={() => setValidationForm(prev => ({ ...prev, validated: false }))}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Invalider
                          </Button>
                        </div>

                        <div>
                          <Label htmlFor="validation_notes" className="text-sm">Notes de validation</Label>
                          <Textarea
                            id="validation_notes"
                            placeholder="Commentaires sur la validation..."
                            value={validationForm.validation_notes}
                            onChange={(e) => setValidationForm(prev => ({ ...prev, validation_notes: e.target.value }))}
                            className="mt-1"
                          />
                        </div>

                        {validationForm.validated === false && (
                          <div className="space-y-3 border-l-4 border-destructive pl-4">
                            <div>
                              <Label htmlFor="corrected_url" className="text-sm">URL des données corrigées</Label>
                              <Input
                                id="corrected_url"
                                placeholder="https://ideo.ternum-bfc.fr/data/..."
                                value={validationForm.corrected_geodata_url}
                                onChange={(e) => setValidationForm(prev => ({ ...prev, corrected_geodata_url: e.target.value }))}
                                className="mt-1"
                              />
                            </div>
                            
                            <div>
                              <Label className="text-sm">Ou importer un fichier GeoJSON</Label>
                              <div className="mt-1 flex items-center gap-2">
                                <input
                                  type="file"
                                  accept=".json,.geojson"
                                  onChange={handleGeodataFileUpload}
                                  className="hidden"
                                  id="geodata-upload"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => document.getElementById('geodata-upload')?.click()}
                                >
                                  <FileUp className="h-4 w-4 mr-1" />
                                  Importer GeoJSON
                                </Button>
                                {validationForm.corrected_geodata && (
                                  <span className="text-xs text-green-600">Fichier chargé</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={() => validateLog(selectedLog.id, validationForm)}
                          disabled={isValidating || validationForm.validated === null}
                          className="w-full"
                        >
                          {isValidating ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Enregistrer la validation
                        </Button>
                      </div>

                      {selectedLog.validated_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Validé le: {formatDate(selectedLog.validated_at)}
                        </p>
                      )}
                    </div>

                    <Separator />

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Créé le: {formatDate(selectedLog.created_at)}</p>
                      {selectedLog.execution_time_ms && (
                        <p>Temps d'exécution: {selectedLog.execution_time_ms}ms</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                    Sélectionnez un log pour voir les détails
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AIGenerationLogs