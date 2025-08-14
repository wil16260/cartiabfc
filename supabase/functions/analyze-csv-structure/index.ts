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
      const lines = text.split('\n')
      if (lines.length > 0) {
        columns = lines[0].split(',').map(col => col.trim().replace(/"/g, ''))
      }
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // For Excel files, we'll need a more sophisticated approach
      // For now, return a placeholder suggesting common column names
      columns = ['Colonne1', 'Colonne2', 'Code', 'Nom', 'Valeur']
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