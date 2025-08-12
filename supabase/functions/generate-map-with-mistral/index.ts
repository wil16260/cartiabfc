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
    const { prompt } = await req.json()
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

    console.log('AI Config query result:', { 
      configCount: aiConfig?.length, 
      configError: configError?.message,
      firstConfigId: aiConfig?.[0]?.id 
    })

    if (configError) {
      console.error('AI config database error:', configError)
      throw new Error(`Database error: ${configError.message}`)
    }

    if (!aiConfig || aiConfig.length === 0) {
      console.error('No active AI configuration found in database')
      throw new Error('No active AI configuration found')
    }

    const activeConfig = aiConfig[0]
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

    // Generate map description with Mistral
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
            content: activeConfig.system_prompt || 'Vous êtes un assistant IA géospatial expert qui aide les utilisateurs à créer de belles cartes précises de la région Bourgogne-Franche-Comté en utilisant les données communales disponibles.'
          },
          {
            role: 'user',
            content: `Créer une carte de la région Bourgogne-Franche-Comté basée sur cette description: ${prompt}. 
            
            Répondez avec un JSON contenant:
            - title: Un titre descriptif pour la carte
            - description: Une description détaillée de ce qui doit être affiché
            - dataLevel: Le niveau géographique à utiliser ("communes", "departments", "epci")
            - dataProperty: La propriété à utiliser pour colorer (ex: "population", "code_departement", "libel_epci")
            - colorScheme: Le schéma de couleur ("gradient", "categorical", "threshold")
            - colors: Un tableau de couleurs à utiliser (5 couleurs pour gradient, 3-8 pour categorical)
            - analysis: Une analyse géographique pertinente
            
            Niveaux disponibles:
            - "communes": Données communales avec nom, population, maire, EPCI, etc.
            - "departments": Données départementales (21, 25, 39, 58, 70, 71, 89, 90)
            - "epci": Groupements intercommunaux (CC, CA, CU, etc.)
            
            Exemple pour les communes par population:
            {
              "title": "Population par commune",
              "description": "Répartition démographique des communes",
              "dataLevel": "communes",
              "dataProperty": "population",
              "colorScheme": "gradient",
              "colors": ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
              "analysis": "Les communes les plus peuplées se concentrent autour des centres urbains."
            }
            
            Exemple pour les départements:
            {
              "title": "Départements de Bourgogne-Franche-Comté",
              "description": "Visualisation des 8 départements de la région",
              "dataLevel": "departments",
              "dataProperty": "code_departement",
              "colorScheme": "categorical",
              "colors": ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f"],
              "analysis": "Les 8 départements: Côte-d'Or (21), Doubs (25), Jura (39), Nièvre (58), Haute-Saône (70), Saône-et-Loire (71), Yonne (89), Territoire de Belfort (90)."
            }
            
            Exemple pour les EPCI:
            {
              "title": "Établissements Publics de Coopération Intercommunale",
              "description": "Visualisation des EPCI par type d'intercommunalité",
              "dataLevel": "epci",
              "dataProperty": "libel_epci",
              "colorScheme": "categorical",
              "colors": ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f"],
              "analysis": "Les EPCI regroupent les communes selon différents types: CC (Communautés de Communes), CA (Communautés d'Agglomération), CU (Communautés Urbaines)."
            }`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
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
          analysis: "Les 8 départements de la région BFC."
        }
      } else if (isEPCIRelated) {
        mapData = {
          title: "EPCI de Bourgogne-Franche-Comté", 
          description: "Visualisation par intercommunalité",
          dataLevel: "epci",
          dataProperty: "libel_epci",
          colorScheme: "categorical",
          colors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f"],
          analysis: "Groupements intercommunaux de la région."
        }
      } else if (isPopulationRelated) {
        mapData = {
          title: "Population par commune",
          description: "Visualisation de la répartition démographique",
          dataLevel: "communes",
          dataProperty: "population",
          colorScheme: "gradient",
          colors: ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
          analysis: "Carte basée sur les données de population des communes."
        }
      } else {
        mapData = {
          title: "Carte générée",
          description: generatedContent,
          dataLevel: "communes",
          dataProperty: "population", 
          colorScheme: "gradient",
          colors: ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"],
          analysis: "Analyse en cours..."
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
        mapData,
        rawResponse: generatedContent
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