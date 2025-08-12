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

  try {
    const { prompt } = await req.json()

    // Get Mistral API key from secrets
    const mistralApiKey = Deno.env.get('MISTRAL_API_KEY')
    if (!mistralApiKey) {
      throw new Error('MISTRAL_API_KEY not configured')
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get active AI configuration
    const { data: aiConfig, error: configError } = await supabase
      .from('ai_config')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (configError || !aiConfig || aiConfig.length === 0) {
      throw new Error('No active AI configuration found')
    }

    const activeConfig = aiConfig[0]

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

    // Try to parse JSON response, fallback to default
    let mapData
    try {
      mapData = JSON.parse(generatedContent)
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
    }

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