import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// AI-enhanced address generation
async function generateAddressesWithAI(prompt: string): Promise<Array<{name: string, address: string, description: string, category: string}>> {
  const systemPrompt = `Tu es un expert en géographie de la région Bourgogne-Franche-Comté. 
Ta tâche est de générer une liste EXHAUSTIVE d'adresses précises pour la demande de l'utilisateur.

Règles STRICTES:
1. Génère AU MINIMUM 15-20 adresses différentes
2. Couvre TOUTES les villes principales de BFC: Dijon, Besançon, Belfort, Chalon-sur-Saône, Nevers, Mâcon, Auxerre, Montbéliard, Sens, Le Creusot, Dole, Vesoul, Lons-le-Saunier, Autun, Beaune, Pontarlier, etc.
3. Utilise des adresses RÉELLES et PRÉCISES (nom de rue + numéro + ville)
4. Pour chaque type d'établissement, trouve les vraies adresses des établissements existants
5. Varie les types d'établissements selon la demande

Format JSON OBLIGATOIRE:
[
  {
    "name": "Nom précis de l'établissement",
    "address": "Numéro rue précise, Code postal Ville",
    "description": "Description détaillée",
    "category": "Catégorie"
  }
]

Exemple pour gendarmeries:
[
  {
    "name": "Gendarmerie de Dijon",
    "address": "2 Place Suquet, 21000 Dijon",
    "description": "Brigade territoriale de gendarmerie de Dijon",
    "category": "Forces de l'ordre"
  }
]

IMPORTANT: Réponds UNIQUEMENT avec le JSON, aucun autre texte.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('AI Generated content:', content);
    
    try {
      const locations = JSON.parse(content);
      console.log(`AI generated ${locations.length} locations`);
      return Array.isArray(locations) ? locations : [];
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return [];
    }
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return [];
  }
}

// French Government Address API geocoding
async function geocodeAddress(address: string): Promise<{latitude: number, longitude: number, formatted_address: string} | null> {
  try {
    console.log(`Geocoding address: ${address}`);
    
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Geocoding API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [longitude, latitude] = feature.geometry.coordinates;
      
      console.log(`Successfully geocoded: ${address} -> ${latitude}, ${longitude}`);
      
      return {
        latitude,
        longitude,
        formatted_address: feature.properties.label || address
      };
    }
    
    console.log(`No results found for address: ${address}`);
    return null;
  } catch (error) {
    console.error(`Error geocoding address ${address}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    
    console.log('Starting AI-enhanced direct geocoding...');
    console.log('User prompt:', prompt);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Step 1: Use AI to generate comprehensive addresses
    console.log('Generating addresses with AI...');
    const aiGeneratedLocations = await generateAddressesWithAI(prompt);
    
    if (aiGeneratedLocations.length === 0) {
      throw new Error('AI failed to generate addresses');
    }
    
    console.log(`AI generated ${aiGeneratedLocations.length} locations`);

    // Step 2: Geocode each AI-generated address using French government API
    const geocodedFeatures = [];
    const failedGeocoding = [];

    for (const location of aiGeneratedLocations) {
      console.log(`Processing location: ${location.name}`);
      
      const geocoded = await geocodeAddress(location.address);

      if (geocoded) {
        // Verify coordinates are in France (approximate bounds)
        if (geocoded.latitude >= 41.0 && geocoded.latitude <= 51.0 && 
            geocoded.longitude >= -5.0 && geocoded.longitude <= 10.0) {
          
          const feature = {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [geocoded.longitude, geocoded.latitude]
            },
            properties: {
              name: location.name,
              description: location.description,
              category: location.category,
              address: geocoded.formatted_address,
              originalAddress: location.address,
              geocoded: true,
              source: "api-adresse.data.gouv.fr",
              aiGenerated: true
            }
          };

          geocodedFeatures.push(feature);
          console.log(`Successfully geocoded: ${location.name} at [${geocoded.longitude}, ${geocoded.latitude}]`);
        } else {
          console.log(`Location outside France bounds: ${location.name}`);
          failedGeocoding.push(location.name);
        }
      } else {
        console.log(`Failed to geocode: ${location.name}`);
        failedGeocoding.push(location.name);
      }
    }

    console.log(`Successfully geocoded ${geocodedFeatures.length} out of ${aiGeneratedLocations.length} locations`);
    if (failedGeocoding.length > 0) {
      console.log(`Failed geocoding for: ${failedGeocoding.join(', ')}`);
    }

    // Create final GeoJSON
    const finalGeoJSON = {
      type: "FeatureCollection",
      title: `Carte: ${prompt}`,
      description: `Carte générée avec IA et géocodage français: "${prompt}"`,
      metadata: {
        generatedAt: new Date().toISOString(),
        geocodingSource: "api-adresse.data.gouv.fr",
        aiModel: "gpt-5-2025-08-07",
        totalFeatures: geocodedFeatures.length,
        totalGenerated: aiGeneratedLocations.length,
        successRate: `${Math.round((geocodedFeatures.length / aiGeneratedLocations.length) * 100)}%`,
        region: "France",
        prompt: prompt,
        failedGeocoding: failedGeocoding
      },
      features: geocodedFeatures
    };

    console.log(`Generated GeoJSON with ${geocodedFeatures.length} geocoded features`);

    // Save to database
    try {
      await supabaseAdmin.from('generated_geojson').insert({
        name: finalGeoJSON.title,
        description: finalGeoJSON.description,
        geojson_data: finalGeoJSON,
        ai_prompt: prompt,
        is_public: false
      });
      console.log('GeoJSON saved to database');
    } catch (saveError) {
      console.error('Failed to save GeoJSON:', saveError);
    }

    // Log the generation
    try {
      await supabaseAdmin.from('ai_generation_logs').insert({
        user_prompt: prompt,
        ai_response: finalGeoJSON,
        success: true,
        created_at: new Date().toISOString(),
        system_prompt: 'AI-enhanced geocoding with OpenAI + French API',
        model_name: 'gpt-5-2025-08-07',
        raw_ai_response: JSON.stringify({
          aiGenerated: aiGeneratedLocations.length,
          geocoded: geocodedFeatures.length,
          failed: failedGeocoding
        })
      });
    } catch (logError) {
      console.error('Failed to save generation log:', logError);
    }

    return new Response(
      JSON.stringify(finalGeoJSON),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in AI-enhanced geocoding:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: 'ai_enhanced_geocoding_error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});