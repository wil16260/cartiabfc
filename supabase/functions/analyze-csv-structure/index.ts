import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { prompt, uploadedFiles } = await req.json()
    
    console.log('Received prompt:', prompt)
    console.log('Uploaded files:', uploadedFiles?.length || 0)

    // Analyze prompt to determine data level and map type
    const promptLower = prompt.toLowerCase()
    
    let dataLevel = 'communes' // default
    let recommendedMapType = 'geocodage' // default
    
    // Determine data level based on keywords
    if (promptLower.includes('département') || promptLower.includes('departement')) {
      dataLevel = 'departements'
    } else if (promptLower.includes('epci') || promptLower.includes('intercommunal')) {
      dataLevel = 'epci'
    } else if (promptLower.includes('commune') || promptLower.includes('municipal')) {
      dataLevel = 'communes'
    }
    
    // Determine map type based on keywords
    if (promptLower.includes('densité') || promptLower.includes('densite') || 
        promptLower.includes('population') || promptLower.includes('habitant')) {
      recommendedMapType = 'choropleth'
    } else if (promptLower.includes('point') || promptLower.includes('marker') || 
               promptLower.includes('localisation')) {
      recommendedMapType = 'points'
    } else if (promptLower.includes('flux') || promptLower.includes('ligne') || 
               promptLower.includes('connection')) {
      recommendedMapType = 'lines'
    }

    return new Response(
      JSON.stringify({ 
        dataLevel,
        recommendedMapType,
        analysis: `Prompt analysé: niveau ${dataLevel}, type ${recommendedMapType}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error analyzing file:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to analyze file structure' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})