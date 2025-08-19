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
      // Analysis with RAG context - CONCISE
      systemPrompt += '\n\nAnalysez rapidement la demande et retournez seulement les informations essentielles.'
      userPrompt = `Analysez cette demande : "${prompt}"

Répondez UNIQUEMENT avec un objet JSON CONCIS :
{
  "dataLevel": "communes|epci|departments",
  "title": "Titre court",
  "recommendedMapType": "geocodage|choroplèthe|complexe"
}`
    } else {
      // Generate CONCISE mapping data only
      systemPrompt += '\n\nCréez UNIQUEMENT les données géographiques essentielles pour la carte.'
      
      userPrompt = `Créez une carte pour : "${prompt}"

Répondez UNIQUEMENT avec un objet JSON CONCIS selon le type :

POUR GEOCODAGE :
{
  "type": "geocodage",
  "addresses": [
    {
      "address": "adresse complète",
      "latitude": 47.123,
      "longitude": 5.456,
      "codeINSEE": "code commune",
      "properties": {
        "name": "nom du lieu",
        "code": "code identifiant",
        "color": "#ef4444"
      }
    }
  ],
  "title": "Titre court",
  "dataLevel": "communes"
}

POUR CHOROPLÈTHE :
{
  "type": "choroplèthe", 
  "dataLevel": "communes|epci|departments",
  "title": "Titre court",
  "colors": ["#ef4444", "#22c55e"],
  "joinKey": "code_insee"
}

POUR COMPLEXE :
{
  "type": "complexe",
  "title": "Titre court", 
  "dataLevel": "communes",
  "layers": [
    {
      "name": "nom court",
      "type": "points",
      "color": "#ef4444"
    }
  ]
}

IMPORTANT: Réponse TRÈS COURTE, données géographiques ESSENTIELLES seulement !`
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
        temperature: 0.1,
        max_tokens: 800
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
    
    // Clean up markdown-wrapped JSON and control characters
    if (cleanedContent.includes('```json')) {
      cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*$/g, '')
    }
    if (cleanedContent.includes('```')) {
      cleanedContent = cleanedContent.replace(/```\s*/g, '').replace(/```\s*$/g, '')
    }
    
    // Remove control characters that break JSON parsing
    cleanedContent = cleanedContent
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\n/g, '\\n') // Escape newlines in strings
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t') // Escape tabs
      .trim()
    
    console.log('Cleaned content:', cleanedContent)
    
    try {
      mapData = JSON.parse(cleanedContent)
      
      // Add RAG metadata
      mapData.ragEnhanced = true
      mapData.documentsUsed = documents?.length || 0
      mapData.enhancedAt = new Date().toISOString()
      mapData.rawResponse = generatedContent // Keep original response
      
      logData.ai_response = mapData
      
      // Save valid GeoJSON to database if it contains geographic data
      if (mapData.type === 'geocodage' && mapData.addresses && logData.created_by) {
        try {
          const geojsonFeatures = mapData.addresses.map(addr => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [addr.longitude, addr.latitude]
            },
            properties: {
              ...addr.properties,
              address: addr.address,
              codeINSEE: addr.codeINSEE
            }
          }))
          
          const geojsonData = {
            type: 'FeatureCollection',
            features: geojsonFeatures
          }
          
          // Save to generated_geojson table
          await supabaseAdmin.from('generated_geojson').insert({
            name: mapData.title || 'Carte générée par IA',
            description: mapData.description,
            geojson_data: geojsonData,
            ai_prompt: prompt,
            created_by: logData.created_by,
            is_public: false
          })
          
          console.log('GeoJSON saved to database')
        } catch (saveError) {
          console.error('Failed to save GeoJSON:', saveError)
        }
      }
      
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError)
      console.error('Raw content:', generatedContent)
      console.error('Cleaned content:', cleanedContent)
      
      // Try to extract JSON from malformed content
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          mapData = JSON.parse(jsonMatch[0])
          console.log('Successfully parsed extracted JSON')
          
          // Add RAG metadata
          mapData.ragEnhanced = true
          mapData.documentsUsed = documents?.length || 0
          mapData.enhancedAt = new Date().toISOString()
          
          logData.ai_response = mapData
        } catch (secondError) {
          console.error('Second parsing attempt failed:', secondError)
          mapData = null
        }
      }
      
      // Enhanced fallback with RAG context
      if (!mapData) {
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
          },
          parseError: true,
          rawContent: generatedContent
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