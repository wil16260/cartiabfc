import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Extract locations from user prompt using keyword patterns
function extractLocationsFromPrompt(prompt: string): Array<{name: string, address: string, description: string, category: string}> {
  const locations = [];
  const promptLower = prompt.toLowerCase();
  
  // Common location keywords and their associated search terms
  const locationPatterns = [
    {
      keywords: ['gendarmerie', 'gendarmeries', 'brigade'],
      category: 'Service public',
      searchTerms: ['gendarmerie', 'brigade de gendarmerie'],
      description: 'Brigade de gendarmerie'
    },
    {
      keywords: ['police', 'commissariat'],
      category: 'Service public',
      searchTerms: ['commissariat de police', 'police'],
      description: 'Commissariat de police'
    },
    {
      keywords: ['mairie', 'mairies', 'hôtel de ville'],
      category: 'Administration',
      searchTerms: ['mairie', 'hôtel de ville'],
      description: 'Mairie'
    },
    {
      keywords: ['hopital', 'hôpital', 'clinique', 'urgences'],
      category: 'Santé',
      searchTerms: ['hôpital', 'centre hospitalier'],
      description: 'Établissement de santé'
    },
    {
      keywords: ['école', 'écoles', 'collège', 'lycée', 'université'],
      category: 'Éducation',
      searchTerms: ['école', 'collège', 'lycée'],
      description: 'Établissement scolaire'
    },
    {
      keywords: ['pharmacie', 'pharmacies'],
      category: 'Santé',
      searchTerms: ['pharmacie'],
      description: 'Pharmacie'
    },
    {
      keywords: ['restaurant', 'restaurants', 'café', 'boulangerie'],
      category: 'Commerce',
      searchTerms: ['restaurant', 'café', 'boulangerie'],
      description: 'Commerce de proximité'
    }
  ];

  // Major cities in BFC as fallback/examples
  const bfcCities = [
    'Dijon', 'Besançon', 'Belfort', 'Chalon-sur-Saône', 'Nevers', 'Mâcon', 
    'Auxerre', 'Montbéliard', 'Sens', 'Le Creusot', 'Moulins', 'Beaune',
    'Dole', 'Vesoul', 'Lons-le-Saunier', 'Autun', 'Châlon-sur-Saône',
    'Pontarlier', 'Louhans', 'Charolles', 'Cosne-Cours-sur-Loire'
  ];

  // Find matching patterns
  for (const pattern of locationPatterns) {
    if (pattern.keywords.some(keyword => promptLower.includes(keyword))) {
      // Add locations for each search term in major BFC cities
      const citiesToSearch = bfcCities.slice(0, 8); // Limit to avoid too many requests
      
      for (const city of citiesToSearch) {
        for (const searchTerm of pattern.searchTerms) {
          locations.push({
            name: `${pattern.description} - ${city}`,
            address: `${searchTerm} ${city}, Bourgogne-Franche-Comté`,
            description: `${pattern.description} située à ${city}`,
            category: pattern.category
          });
        }
      }
      break; // Only process the first matching pattern
    }
  }

  // If no specific pattern found, create general points of interest
  if (locations.length === 0) {
    const generalLocations = [
      {
        name: 'Dijon - Centre historique',
        address: 'Dijon, Côte-d\'Or',
        description: 'Centre historique de Dijon, capitale de la région',
        category: 'Point d\'intérêt'
      },
      {
        name: 'Besançon - Citadelle',
        address: 'Citadelle de Besançon, Doubs',
        description: 'Citadelle de Besançon, patrimoine UNESCO',
        category: 'Patrimoine'
      },
      {
        name: 'Belfort - Territoire',
        address: 'Belfort, Territoire de Belfort',
        description: 'Ville de Belfort et son célèbre lion',
        category: 'Point d\'intérêt'
      }
    ];
    
    locations.push(...generalLocations);
  }

  return locations;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    
    console.log('Starting direct geocoding map generation...');
    console.log('User prompt:', prompt);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Extract locations directly from prompt
    const extractedLocations = extractLocationsFromPrompt(prompt);
    console.log(`Extracted ${extractedLocations.length} locations from prompt`);

    // Geocode each location using French government API
    const geocodedFeatures = [];

    for (const location of extractedLocations) {
      console.log(`Processing location: ${location.name}`);
      
      const geocoded = await geocodeAddress(location.address);

      if (geocoded) {
        // Verify coordinates are in BFC region (approximate bounds)
        if (geocoded.latitude >= 46.0 && geocoded.latitude <= 48.5 && 
            geocoded.longitude >= 2.5 && geocoded.longitude <= 7.5) {
          
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
              source: "api-adresse.data.gouv.fr"
            }
          };

          geocodedFeatures.push(feature);
          console.log(`Successfully geocoded: ${location.name} at [${geocoded.longitude}, ${geocoded.latitude}]`);
        } else {
          console.log(`Location outside BFC region: ${location.name}`);
        }
      } else {
        console.log(`Failed to geocode: ${location.name}`);
      }
    }

    // Create final GeoJSON
    const finalGeoJSON = {
      type: "FeatureCollection",
      title: `Carte: ${prompt}`,
      description: `Carte générée à partir de la demande: "${prompt}"`,
      metadata: {
        generatedAt: new Date().toISOString(),
        geocodingSource: "api-adresse.data.gouv.fr",
        totalFeatures: geocodedFeatures.length,
        region: "Bourgogne-Franche-Comté",
        prompt: prompt
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
        system_prompt: 'Direct geocoding without AI',
        model_name: 'direct-geocoding',
        raw_ai_response: 'Pattern-based location extraction'
      });
    } catch (logError) {
      console.error('Failed to save generation log:', logError);
    }

    return new Response(
      JSON.stringify(finalGeoJSON),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in direct geocoding:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: 'direct_geocoding_error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});