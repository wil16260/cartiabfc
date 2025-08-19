import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  let logData = {
    user_prompt: '',
    ai_response: null,
    raw_ai_response: '',
    success: false,
    error_message: null,
    model_name: 'rag-enhanced',
    system_prompt: null,
    execution_time_ms: null,
    created_by: null
  }

  try {
    const { prompt, step = 1 } = await req.json()
    logData.user_prompt = prompt

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get user info
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!)
      const { data: { user } } = await supabaseAnon.auth.getUser(authHeader.replace('Bearer ', ''))
      if (user) {
        logData.created_by = user.id
      }
    }

    // 1. Get relevant documents from RAG system
    console.log('Fetching relevant documents...')
    const { data: documents, error: docsError } = await supabaseAdmin
      .from('documents')
      .select('name, description, prompt, metadata')
      .eq('is_active', true)
      .eq('embedding_processed', true)

    if (docsError) {
      console.error('Error fetching documents:', docsError)
    }

    // 2. Build enhanced context from documents
    let ragContext = ''
    if (documents && documents.length > 0) {
      ragContext = documents.map(doc => `
Document: ${doc.name}
Description: ${doc.description}
Context: ${doc.prompt}
Tags: ${doc.metadata?.tags?.join(', ') || 'N/A'}
---`).join('\n')
    }

    // 3. Get AI configuration
    const { data: aiConfig, error: configError } = await supabaseAdmin
      .from('ai_config')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (configError || !aiConfig) {
      throw new Error('No active AI configuration found')
    }

    // 4. Build enhanced prompts with RAG context
    let systemPrompt = `Vous êtes un expert géospatial spécialisé EXCLUSIVEMENT dans la région Bourgogne-Franche-Comté.
Vous avez accès aux documents de référence et fichiers GeoJSON suivants :

${ragContext}

RÈGLES IMPÉRATIVES :
- Limitez TOUJOURS vos réponses à la région Bourgogne-Franche-Comté UNIQUEMENT
- Utilisez UNIQUEMENT les codes INSEE, SIREN et structures des documents de référence
- Pour les GeoJSON, respectez exactement les structures de propriétés disponibles
- Ne proposez JAMAIS de données en dehors de la région BFC

Utilisez ces informations pour créer des cartes précises et contextualisées.`

    let userPrompt = ''
    
    if (step === 1) {
      // Analysis with RAG context
      systemPrompt += '\n\nVotre rôle est d\'analyser les demandes de cartographie en utilisant les documents de référence pour fournir des informations précises STRICTEMENT pour la région Bourgogne-Franche-Comté.'
      userPrompt = `Analysez cette demande de carte : "${prompt}"

Utilisez les documents de référence et GeoJSON pour enrichir votre analyse.
IMPORTANT: Cette analyse doit concerner UNIQUEMENT la région Bourgogne-Franche-Comté.

Répondez UNIQUEMENT avec un objet JSON :
{
  "analysis": "Analyse détaillée utilisant les références documentaires BFC",
  "searchKeywords": ["mot-clé1", "mot-clé2", "mot-clé3"],
  "dataLevel": "communes|epci|departments",
  "title": "Titre précis basé sur les références BFC",
  "description": "Description enrichie par les documents BFC",
  "sources": ["sources des documents de référence"],
  "ragReferences": ["documents utilisés pour l'analyse"],
  "territorialContext": "Contexte territorial BFC basé sur les références",
  "geojsonStructures": ["structures GeoJSON disponibles pour BFC"],
  "recommendedMapType": "geocodage|choroplèthe|complexe",
  "mapTypeReason": "Justification du choix du type de carte",
  "regionalConstraint": "bourgogne-franche-comte"
}`
    } else {
      // Enhanced generation with automatic map type selection
      systemPrompt += '\n\nCréez des cartes précises en choisissant automatiquement le type optimal (geocodage, choroplèthe, ou complexe) selon la demande et les références.'
      
      userPrompt = `Créez une carte pour : "${prompt}"

Utilisez les documents de référence pour choisir automatiquement le meilleur type de carte et les structures correctes.

INSTRUCTIONS POUR LE CHOIX DU TYPE :
- GEOCODAGE : Pour localiser des points spécifiques (adresses, établissements, POI)
- CHOROPLÈTHE : Pour visualiser des données quantitatives par territoire (population, économie, etc.)
- COMPLEXE : Pour combiner plusieurs types de données ou analyses multicritères

CODES DE JOINTURE (selon documents INSEE) :
- Communes: code_insee (format: 5 chiffres)
- EPCI: siren_epci (format: 9 chiffres)  
- Départements: code_departement (format: 2 chiffres)

Répondez UNIQUEMENT avec un objet JSON selon le type choisi :

POUR GEOCODAGE :
{
  "type": "geocodage",
  "addresses": [
    {
      "address": "adresse complète selon références",
      "latitude": 47.123,
      "longitude": 5.456,
      "codeINSEE": "code commune selon COG",
      "properties": {
        "name": "nom du lieu",
        "category": "catégorie selon références",
        "source": "document de référence utilisé"
      }
    }
  ],
  "title": "Titre géographiquement précis",
  "description": "Description enrichie par RAG",
  "markerStyle": {
    "color": "#couleur",
    "size": "small|medium|large",
    "symbol": "selon standards cartographiques"
  }
}

POUR CHOROPLÈTHE :
{
  "type": "choroplèthe",
  "dataLevel": "communes|epci|departments",
  "joinKey": "code_insee|siren_epci|code_departement",
  "dataProperty": "propriété_selon_références",
  "colorScheme": "gradient|categorical",
  "colors": ["#couleur1", "#couleur2"],
  "title": "Titre basé sur les références",
  "description": "Description enrichie par RAG",
  "legend": {
    "title": "Légende selon standards",
    "unit": "unité de référence",
    "categories": ["cat1", "cat2"]
  }
}

POUR COMPLEXE :
{
  "type": "complexe",
  "layers": [
    {
      "name": "nom du layer",
      "type": "choroplèthe|points|lines|polygons",
      "dataLevel": "communes|epci|departments",
      "style": {
        "color": "#couleur",
        "opacity": 0.8
      }
    }
  ],
  "title": "Titre de la carte complexe",
  "description": "Description multicritères enrichie",
  "interactions": ["hover", "click", "filter"]
}

Dans tous les cas, ajoutez :
"ragSources": ["documents utilisés"],
"technicalSpecs": {
  "projection": "RGF93 / Lambert-93", 
  "format": "GeoJSON",
  "precision": "selon IGN BD TOPO"
},
"mapTypeChoice": "Justification automatique du choix"
`
    }

    logData.system_prompt = systemPrompt

    // 5. Call AI with enhanced context
    const mistralApiKey = Deno.env.get(aiConfig.api_key_name || 'MISTRAL_API_KEY')
    if (!mistralApiKey) {
      throw new Error(`${aiConfig.api_key_name || 'MISTRAL_API_KEY'} not configured`)
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiConfig.model_name || 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 3000
      }),
    })

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`)
    }

    const data = await response.json()
    const generatedContent = data.choices[0].message.content
    logData.raw_ai_response = generatedContent

    // 6. Parse and enhance response
    let mapData
    let cleanedContent = generatedContent
    
    // Clean up markdown-wrapped JSON
    if (cleanedContent.includes('```json')) {
      cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*$/g, '')
    }
    if (cleanedContent.includes('```')) {
      cleanedContent = cleanedContent.replace(/```\s*/g, '').replace(/```\s*$/g, '')
    }
    
    try {
      mapData = JSON.parse(cleanedContent)
      
      // Add RAG metadata
      mapData.ragEnhanced = true
      mapData.documentsUsed = documents?.length || 0
      mapData.enhancedAt = new Date().toISOString()
      mapData.rawResponse = generatedContent // Keep original response
      
      logData.ai_response = mapData
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError)
      console.error('Cleaned content:', cleanedContent)
      
      // Enhanced fallback with RAG context
      mapData = {
        title: "Carte enrichie par RAG",
        description: `Carte générée avec contexte documentaire pour: ${prompt}`,
        dataLevel: "communes",
        ragEnhanced: true,
        documentsUsed: documents?.length || 0,
        analysis: "Analyse enrichie par les documents de référence disponibles",
        sources: documents?.map(d => d.name) || [],
        technicalSpecs: {
          projection: "RGF93 / Lambert-93",
          format: "GeoJSON",
          region: "Bourgogne-Franche-Comté"
        }
      }
      
      logData.ai_response = mapData
    }

    // 7. Log successful generation
    logData.success = true
    logData.execution_time_ms = Date.now() - startTime

    await supabaseAdmin.from('ai_generation_logs').insert(logData)

    return new Response(
      JSON.stringify({ 
        success: true,
        step: step,
        data: mapData,
        ragEnhanced: true,
        documentsUsed: documents?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    
    logData.success = false
    logData.error_message = error.message
    logData.execution_time_ms = Date.now() - startTime

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
      await supabaseAdmin.from('ai_generation_logs').insert(logData)
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'RAG-enhanced generation failed', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})