import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const geoLevel = formData.get('geoLevel') as string
    const joinColumn = formData.get('joinColumn') as string
    
    if (!file || !geoLevel || !joinColumn) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse CSV data
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    const joinColumnIndex = headers.indexOf(joinColumn)
    if (joinColumnIndex === -1) {
      return new Response(
        JSON.stringify({ error: 'Join column not found in file' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse data rows
    const dataRows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      return row
    })

    // Get geographical data based on level
    let geoData: any[] = []
    let joinKey = ''
    
    if (geoLevel === 'communes') {
      // Load communes from public data files
      const communesResponse = await fetch('https://flqexbwervowvqltuyrc.supabase.co/storage/v1/object/public/documents/departements-france.geojson')
      if (communesResponse.ok) {
        const communesGeoJson = await communesResponse.json()
        geoData = communesGeoJson.features || []
        joinKey = 'code'
      }
    } else if (geoLevel === 'epci') {
      const { data, error } = await supabase
        .from('epci')
        .select('*')
        .eq('is_active', true)
      
      if (error) throw error
      geoData = data || []
      joinKey = 'code'
    } else if (geoLevel === 'departements') {
      // Load departments from public data
      const deptsResponse = await fetch('https://flqexbwervowvqltuyrc.supabase.co/storage/v1/object/public/documents/departements-france.geojson')
      if (deptsResponse.ok) {
        const deptsGeoJson = await deptsResponse.json()
        geoData = deptsGeoJson.features || []
        joinKey = 'code'
      }
    }

    // Create joined GeoJSON
    const features = []
    
    for (const geoFeature of geoData) {
      const geoCode = geoFeature.properties?.[joinKey] || geoFeature.properties?.code_insee
      const matchingData = dataRows.find(row => {
        const dataCode = row[joinColumn]?.toString().trim()
        return dataCode === geoCode?.toString().trim()
      })
      
      if (matchingData) {
        features.push({
          type: 'Feature',
          geometry: geoFeature.geometry || geoFeature.geojson_data?.geometry,
          properties: {
            ...geoFeature.properties,
            ...matchingData
          }
        })
      }
    }

    const geojson = {
      type: 'FeatureCollection',
      features
    }

    console.log(`Joined ${features.length} features from ${dataRows.length} data rows and ${geoData.length} geographic features`)

    return new Response(
      JSON.stringify({ 
        geojson,
        stats: {
          totalDataRows: dataRows.length,
          totalGeoFeatures: geoData.length,
          joinedFeatures: features.length,
          joinedPercentage: Math.round((features.length / dataRows.length) * 100)
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error joining data:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to join data with geography' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})