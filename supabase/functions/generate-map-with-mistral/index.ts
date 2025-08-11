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
      .single()

    if (configError) {
      throw new Error('No active AI configuration found')
    }

    // Generate map description with Mistral
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiConfig.model_name || 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: aiConfig.system_prompt || 'Vous êtes un assistant IA géospatial expert qui aide les utilisateurs à créer de belles cartes précises de la région Bourgogne-Franche-Comté en utilisant les données communales disponibles.'
          },
          {
            role: 'user',
            content: `Créer une carte de la région Bourgogne-Franche-Comté basée sur cette description: ${prompt}. 
            
            Répondez avec un JSON contenant:
            - title: Un titre descriptif pour la carte
            - description: Une description détaillée de ce qui doit être affiché
            - dataProperty: La propriété à utiliser pour colorer les communes (ex: "population", "code_departement", "code_postal")
            - colorScheme: Le schéma de couleur ("gradient", "categorical", "threshold")
            - colors: Un tableau de couleurs à utiliser (5 couleurs pour gradient, 3-8 pour categorical)
            - analysis: Une analyse géographique pertinente
            
            Données disponibles par commune: nom, code_insee, statut, code_postal, code_departement, nom_maire, prenom_maire, libel_epci, siren_epci, population
            
            Exemple de format de réponse pour une demande sur la population:
            {
              "title": "Population par commune en Bourgogne-Franche-Comté",
              "description": "Visualisation des données démographiques par commune",
              "dataProperty": "population",
              "colorScheme": "gradient",
              "colors": ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
              "analysis": "Les communes les plus peuplées se concentrent autour des centres urbains principaux comme Dijon, Besançon et Chalon-sur-Saône."
            }
            
            Exemple pour les départements:
            {
              "title": "Départements de Bourgogne-Franche-Comté",
              "description": "Visualisation par département",
              "dataProperty": "code_departement",
              "colorScheme": "categorical",
              "colors": ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f"],
              "analysis": "La région comprend 8 départements: Côte-d'Or (21), Doubs (25), Jura (39), Nièvre (58), Haute-Saône (70), Savoie (71), Territoire de Belfort (90), Yonne (89)."
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
      
      if (isPopulationRelated) {
        mapData = {
          title: "Population par commune",
          description: "Visualisation de la répartition démographique",
          dataProperty: "population",
          colorScheme: "gradient",
          colors: ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
          analysis: "Carte basée sur les données de population des communes."
        }
      } else if (isDepartmentRelated) {
        mapData = {
          title: "Départements de la région",
          description: "Visualisation par département",
          dataProperty: "code_departement",
          colorScheme: "categorical",
          colors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f"],
          analysis: "Carte des 8 départements de Bourgogne-Franche-Comté."
        }
      } else {
        mapData = {
          title: "Carte générée",
          description: generatedContent,
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