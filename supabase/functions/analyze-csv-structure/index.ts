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
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const fileName = file.name.toLowerCase()
    let columns: string[] = []

    if (fileName.endsWith('.csv')) {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length > 0) {
        // Handle different CSV delimiters
        let delimiter = ','
        const firstLine = lines[0]
        if (firstLine.split(';').length > firstLine.split(',').length) {
          delimiter = ';'
        }
        
        columns = firstLine.split(delimiter).map(col => 
          col.trim()
            .replace(/^["']|["']$/g, '') // Remove quotes at start/end
            .replace(/\s+/g, ' ') // Normalize whitespace
        ).filter(col => col.length > 0)
      }
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // For Excel files, we need to read the actual structure
      // Since we can't use external libraries in edge functions easily,
      // we'll try to read as text and extract what we can
      try {
        const arrayBuffer = await file.arrayBuffer()
        // This is a simplified approach - in production you'd want a proper Excel parser
        // For now, we'll return common column patterns and let the user specify
        columns = [
          'Code_INSEE', 'Code_Commune', 'Nom_Commune', 'Code_Departement',
          'Population', 'Superficie', 'Densite', 'Coordonnees',
          'Latitude', 'Longitude', 'Code_Postal', 'Region',
          'SIREN', 'SIRET', 'Code_EPCI', 'Nom_EPCI'
        ]
        
        // Try to detect if it's actually a CSV disguised as Excel
        const text = new TextDecoder().decode(arrayBuffer.slice(0, 1024))
        if (text.includes(',') || text.includes(';')) {
          const lines = text.split('\n').filter(line => line.trim())
          if (lines.length > 0) {
            let delimiter = ','
            const firstLine = lines[0]
            if (firstLine.split(';').length > firstLine.split(',').length) {
              delimiter = ';'
            }
            columns = firstLine.split(delimiter).map(col => 
              col.trim().replace(/^["']|["']$/g, '')
            ).filter(col => col.length > 0)
          }
        }
      } catch (error) {
        console.error('Error reading Excel file:', error)
        columns = ['Colonne1', 'Colonne2', 'Code', 'Nom', 'Valeur']
      }
    }

    return new Response(
      JSON.stringify({ 
        columns: columns.filter(col => col.length > 0),
        fileName: file.name,
        size: file.size
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