import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, step, dataLevel, recommendedMapType } = await req.json()
    
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    // Initialize log data
    const logData: any = {
      user_prompt: prompt,
      step: step || 1,
      status: 'processing',
      created_at: new Date().toISOString()
    }

    console.log('Fetching relevant documents...')
    
    // 1. Fetch relevant documents from RAG system
    const { data: documents, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('status', 'active')
      .eq('is_processed', true)
      .limit(5)

    if (docError) {
      console.error('Error fetching documents:', docError)
    }

    // 2. Build RAG context
    let ragContext = ''
    if (documents && documents.length > 0) {
      ragContext = `DOCUMENTS DISPONIBLES:\n${documents.map(doc => 
        `- ${doc.name}: ${doc.description || 'Document géographique'}\n  Contenu: ${(doc.content || '').substring(0, 500)}...`
      ).join('\n')}\n\n`
    }

    // 3. Get AI configuration
    const { data: aiConfig, error: configError } = await supabaseAdmin
      .from('ai_config')
      .select('*')
      .eq('is_active', true)
      .single()

    if (configError || !aiConfig) {
      throw new Error('No active AI configuration found')
    }

    // 4. Build enhanced prompt with RAG context
    const systemPrompt = `Tu es un expert en cartographie et données géographiques de la région Bourgogne-Franche-Comté.
Tu utilises les documents fournis pour créer des cartes GeoJSON précises.

${ragContext ? `CONTEXTE DISPONIBLE: ${ragContext}` : ''}

Instructions:
- Utilise uniquement les données factuelles des documents fournis
- Génère des coordonnées GPS réelles pour la région BFC (latitude 46-48°N, longitude 3-7°E)
- Format de réponse: GeoJSON FeatureCollection valide uniquement
- Sois précis et concis

Format de réponse GeoJSON strict:
{
  "type": "FeatureCollection",
  "title": "Titre de la carte",
  "description": "Description courte",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [longitude, latitude]
      },
      "properties": {
        "name": "Nom du lieu",
        "description": "Description",
        "category": "Type"
      }
    }
  ]
}

IMPORTANT: Génère des coordonnées GPS réelles pour la région Bourgogne-Franche-Comté !`

    const userPrompt = `${ragContext}

Créer une carte de: ${prompt}
${step ? `Étape: ${step}` : ''}
${dataLevel ? `Niveau géographique: ${dataLevel}` : ''}
${recommendedMapType ? `Type de carte recommandé: ${recommendedMapType}` : ''}

Format de réponse GeoJSON strict avec coordonnées réelles de Bourgogne-Franche-Comté.`

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
    
    cleanedContent = cleanedContent.trim()
    
    console.log('Raw AI response length:', generatedContent.length)
    console.log('Cleaned content preview:', cleanedContent.substring(0, 200))
    
    try {
      mapData = JSON.parse(cleanedContent)
      
      // Add RAG metadata
      mapData.ragEnhanced = true
      mapData.documentsUsed = documents?.length || 0
      mapData.enhancedAt = new Date().toISOString()
      mapData.rawResponse = generatedContent // Keep original response
      
      logData.ai_response = mapData
      
      // Save valid GeoJSON to database if it contains geographic data
      if (mapData.type === 'FeatureCollection' && mapData.features && Array.isArray(mapData.features)) {
        try {
          // Save to generated_geojson table
          await supabaseAdmin.from('generated_geojson').insert({
            name: mapData.title || 'Carte générée par IA',
            description: mapData.description,
            geojson_data: mapData,
            ai_prompt: prompt,
            is_public: false
          })
          
          console.log('GeoJSON saved to database with', mapData.features.length, 'features')
        } catch (saveError) {
          console.error('Failed to save GeoJSON:', saveError)
        }
      }
      
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError)
      console.error('Raw content:', generatedContent)
      console.error('Cleaned content:', cleanedContent)
      
      // Try to extract and fix JSON from malformed content
      const jsonMatch = cleanedContent.match(/\{[\s\S]*/)
      if (jsonMatch) {
        let jsonStr = jsonMatch[0]
        
        // Try to fix incomplete JSON by completing missing brackets and quotes
        const openBraces = (jsonStr.match(/\{/g) || []).length
        const closeBraces = (jsonStr.match(/\}/g) || []).length
        const openBrackets = (jsonStr.match(/\[/g) || []).length
        const closeBrackets = (jsonStr.match(/\]/g) || []).length
        
        // Add missing closing brackets and braces
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          jsonStr += ']'
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          jsonStr += '}'
        }
        
        try {
          mapData = JSON.parse(jsonStr)
          console.log('Successfully parsed and fixed extracted JSON')
          
          // Add RAG metadata
          mapData.ragEnhanced = true
          mapData.documentsUsed = documents?.length || 0
          mapData.enhancedAt = new Date().toISOString()
          mapData.rawResponse = generatedContent
          
          logData.ai_response = mapData
          
          // Save to database if valid
          if (mapData.type === 'FeatureCollection' && mapData.features && Array.isArray(mapData.features)) {
            try {
              await supabaseAdmin.from('generated_geojson').insert({
                name: mapData.title || 'Carte générée par IA',
                description: mapData.description,
                geojson_data: mapData,
                ai_prompt: prompt,
                is_public: false
              })
              console.log('Fixed GeoJSON saved to database with', mapData.features.length, 'features')
            } catch (saveError) {
              console.error('Failed to save fixed GeoJSON:', saveError)
            }
          }
          
        } catch (secondParseError) {
          console.error('Second JSON parsing also failed:', secondParseError)
          logData.error_message = `JSON parsing failed: ${parseError.message}. Content: ${cleanedContent.substring(0, 200)}...`
          logData.status = 'error'
          
          mapData = {
            error: 'Failed to parse AI response',
            rawContent: cleanedContent,
            ragEnhanced: false
          }
        }
      } else {
        logData.error_message = `No JSON found in response. Content: ${cleanedContent.substring(0, 200)}...`
        logData.status = 'error'
        
        mapData = {
          error: 'No valid JSON found in AI response',
          rawContent: cleanedContent,
          ragEnhanced: false
        }
      }
    }

    // 7. Log the generation
    logData.status = mapData.error ? 'error' : 'success'
    
    try {
      await supabaseAdmin.from('ai_generation_logs').insert(logData)
    } catch (logError) {
      console.error('Failed to save generation log:', logError)
    }

    return new Response(
      JSON.stringify(mapData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error:', error)
    
    // Log the error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
      })
      
      await supabaseAdmin.from('ai_generation_logs').insert({
        user_prompt: 'Error in generation',
        status: 'error',
        error_message: error.message,
        created_at: new Date().toISOString()
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        ragEnhanced: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})