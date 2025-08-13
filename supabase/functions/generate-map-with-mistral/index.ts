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
    model_name: null,
    system_prompt: null,
    execution_time_ms: null,
    created_by: null
  }

  try {
    const { prompt, mapType, step = 1 } = await req.json()
    logData.user_prompt = prompt

    // Get Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    console.log('Environment check:', { 
      hasUrl: !!supabaseUrl, 
      hasServiceKey: !!supabaseServiceKey,
      urlPrefix: supabaseUrl?.substring(0, 20) 
    })
    
    // Use service role client for accessing admin-only ai_config table
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get user info from authorization header if available (for logging)
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      // Use anon key client for user operations
      const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!)
      const { data: { user } } = await supabaseAnon.auth.getUser(authHeader.replace('Bearer ', ''))
      if (user) {
        logData.created_by = user.id
      }
    }

    // Get active AI configuration using admin client
    console.log('Fetching active AI configuration...')
    const { data: aiConfig, error: configError } = await supabaseAdmin
      .from('ai_config')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (configError) {
      console.error('AI config database error:', configError)
      throw new Error(`Database error: ${configError.message}`)
    }

    if (!aiConfig) {
      console.error('No active AI configuration found in database')
      throw new Error('No active AI configuration found')
    }

    const activeConfig = aiConfig
    logData.model_name = activeConfig.model_name
    logData.system_prompt = activeConfig.system_prompt
    
    console.log('Using config:', { 
      id: activeConfig.id, 
      modelName: activeConfig.model_name,
      hasSystemPrompt: !!activeConfig.system_prompt 
    })

    // Get Mistral API key from secrets using the config
    const mistralApiKey = Deno.env.get(activeConfig.api_key_name || 'MISTRAL_API_KEY')
    if (!mistralApiKey) {
      throw new Error(`${activeConfig.api_key_name || 'MISTRAL_API_KEY'} not configured`)
    }

    // Two-step process based on step parameter
    let systemPrompt = activeConfig.system_prompt || 'Vous êtes un assistant IA géospatial expert qui aide les utilisateurs à créer de belles cartes précises de la région Bourgogne-Franche-Comté.'
    let userPrompt = ''
    
    if (step === 1) {
      // Step 1: Analysis and search information
      systemPrompt = 'Vous êtes un expert géospatial qui analyse les demandes de cartographie pour la région Bourgogne-Franche-Comté. Votre rôle est de comprendre la demande et de fournir une analyse détaillée.'
      userPrompt = `Analysez cette demande de carte pour la région Bourgogne-Franche-Comté: "${prompt}"

Répondez UNIQUEMENT avec un objet JSON contenant:
{
  "analysis": "Analyse détaillée de la demande en français",
  "searchKeywords": ["mot-clé1", "mot-clé2", "mot-clé3"],
  "dataLevel": "communes|epci|departments",
  "title": "Titre de la carte",
  "description": "Description de ce qui sera cartographié",
  "sources": ["source1", "source2"]
}`
    } else {
      // Step 2: Generate geojson based on map type
      if (mapType === 'choroplèthe') {
        systemPrompt = 'Vous créez des cartes choroplèthes pour la région Bourgogne-Franche-Comté en joignant des données avec les géométries appropriées.'
        userPrompt = `Créez une carte choroplèthe basée sur: "${prompt}"

IMPORTANT - Clés de jointure:
- Pour les communes: utilisez "code_insee" 
- Pour les EPCI: utilisez "siren_epci"
- Pour les départements: utilisez "code_departement"

Répondez UNIQUEMENT avec un objet JSON:
{
  "type": "choroplèthe",
  "dataLevel": "communes|epci|departments",
  "joinKey": "code_insee|siren_epci|code_departement",
  "dataProperty": "nom_de_la_propriété_à_visualiser",
  "colorScheme": "gradient|categorical",
  "colors": ["#couleur1", "#couleur2", ...],
  "title": "Titre de la carte",
  "analysis": "Analyse des données à visualiser",
  "legend": {
    "title": "Titre de la légende",
    "unit": "unité de mesure"
  }
}`
      } else if (mapType === 'geocodage') {
        systemPrompt = 'Vous géocodez des adresses pour créer des cartes de points pour la région Bourgogne-Franche-Comté.'
        userPrompt = `Géocodez les adresses basées sur: "${prompt}"

Répondez UNIQUEMENT avec un objet JSON:
{
  "type": "geocodage",
  "addresses": [
    {
      "address": "adresse complète",
      "latitude": 47.123,
      "longitude": 5.456,
      "properties": {
        "name": "nom du lieu",
        "category": "catégorie"
      }
    }
  ],
  "title": "Titre de la carte",
  "analysis": "Analyse des lieux géocodés",
  "markerStyle": {
    "color": "#couleur",
    "size": "small|medium|large"
  }
}`
      } else if (mapType === 'complexe') {
        systemPrompt = 'Vous créez des cartes complexes combinant plusieurs types de données géospatiales pour la région Bourgogne-Franche-Comté.'
        userPrompt = `Créez une carte complexe basée sur: "${prompt}"

Répondez UNIQUEMENT avec un objet JSON:
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
  "title": "Titre de la carte",
  "analysis": "Analyse des couches de données",
  "interactions": ["hover", "click", "filter"]
}`
      }
    }

    // Generate response with Mistral
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: activeConfig.model_name || 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    })

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`)
    }

    const data = await response.json()
    const generatedContent = data.choices[0].message.content
    logData.raw_ai_response = generatedContent

    // Try to parse JSON response, fallback to default
    let mapData
    try {
      mapData = JSON.parse(generatedContent)
      logData.ai_response = mapData
    } catch {
      // Default fallback based on prompt analysis
      const isPopulationRelated = prompt.toLowerCase().includes('population') || prompt.toLowerCase().includes('démographie') || prompt.toLowerCase().includes('habitant')
      const isDepartmentRelated = prompt.toLowerCase().includes('département') || prompt.toLowerCase().includes('departement')
      const isEPCIRelated = prompt.toLowerCase().includes('epci') || prompt.toLowerCase().includes('intercommunal') || prompt.toLowerCase().includes('communauté')
      
      if (isDepartmentRelated) {
        mapData = {
          title: "Départements de Bourgogne-Franche-Comté",
          description: "Visualisation des 8 départements de la région",
          dataLevel: "departments",
          dataProperty: "code_departement",
          colorScheme: "categorical",
          colors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f"],
          analysis: "Les 8 départements de la région BFC.",
          dataSources: ["ideo.ternum-bfc.fr - Limites administratives", "data.gouv.fr - Données géographiques IGN"]
        }
      } else if (isEPCIRelated) {
        mapData = {
          title: "EPCI de Bourgogne-Franche-Comté", 
          description: "Visualisation par intercommunalité",
          dataLevel: "epci",
          dataProperty: "libel_epci",
          colorScheme: "categorical",
          colors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f"],
          analysis: "Groupements intercommunaux de la région.",
          dataSources: ["ideo.ternum-bfc.fr - Base EPCI", "data.gouv.fr - Référentiel géographique des intercommunalités"]
        }
      } else if (isPopulationRelated) {
        mapData = {
          title: "Population par commune",
          description: "Visualisation de la répartition démographique",
          dataLevel: "communes",
          dataProperty: "population",
          colorScheme: "gradient",
          colors: ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
          analysis: "Carte basée sur les données de population des communes.",
          dataSources: ["ideo.ternum-bfc.fr - Données démographiques BFC", "data.gouv.fr - INSEE population légale"]
        }
      } else {
        mapData = {
          title: "Carte générée",
          description: generatedContent,
          dataLevel: "communes",
          dataProperty: "population", 
          colorScheme: "gradient",
          colors: ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"],
          analysis: "Analyse en cours...",
          dataSources: ["ideo.ternum-bfc.fr - Données territoriales", "data.gouv.fr - Données publiques françaises"]
        }
      }
      logData.ai_response = mapData
    }

    // Mark as successful
    logData.success = true
    logData.execution_time_ms = Date.now() - startTime

    // Log the generation to database using admin client
    await supabaseAdmin.from('ai_generation_logs').insert(logData)

    return new Response(
      JSON.stringify({ 
        success: true,
        step: step,
        data: mapData,
        // Legacy fields for compatibility
        coordinates: mapData.coordinates || null,
        analysis: mapData.analysis || generatedContent,
        title: mapData.title || "Carte générée",
        dataLevel: mapData.dataLevel || "communes",
        dataSources: mapData.dataSources || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    
    // Log the error
    logData.success = false
    logData.error_message = error.message
    logData.execution_time_ms = Date.now() - startTime

    // Attempt to log the error to database using admin client
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
      await supabaseAdmin.from('ai_generation_logs').insert(logData)
    } catch (logError) {
      console.error('Failed to log error to database:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'An unexpected error occurred', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})