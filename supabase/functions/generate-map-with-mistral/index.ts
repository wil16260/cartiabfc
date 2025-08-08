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
            content: aiConfig.system_prompt || 'Vous êtes un assistant IA géospatial expert qui aide les utilisateurs à créer de belles cartes précises de la région Bourgogne-Franche-Comté.'
          },
          {
            role: 'user',
            content: `Créer une carte de la région Bourgogne-Franche-Comté basée sur cette description: ${prompt}. 
            
            Répondez avec un JSON contenant:
            - title: Un titre descriptif pour la carte
            - description: Une description détaillée de ce qui doit être affiché
            - layers: Un tableau des couches à activer/désactiver
            - style: Des suggestions de style pour la carte
            - analysis: Une analyse géographique pertinente
            
            Exemple de format de réponse:
            {
              "title": "Titre de la carte",
              "description": "Description détaillée",
              "layers": ["data_population", "data_unemployment"],
              "style": "Style suggéré",
              "analysis": "Analyse géographique"
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

    // Try to parse JSON response, fallback to text
    let mapData
    try {
      mapData = JSON.parse(generatedContent)
    } catch {
      mapData = {
        title: "Carte générée",
        description: generatedContent,
        layers: [],
        style: "default",
        analysis: "Analyse en cours..."
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