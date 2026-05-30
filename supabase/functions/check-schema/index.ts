import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceRole)

  try {
    // Let's query information_schema to see all tables and columns in public schema
    const { data, error } = await supabase
      .from('school_settings') // we use this to query, but wait!
      // PostgREST doesn't let us query information_schema directly unless we use raw sql!
      // But we can execute raw sql via rpc! Let's see if we can execute a procedure, 
      // or we can just fetch OpenAPI schema! Since Edge Function runs on service role, 
      // it can fetch the PostgREST root "/" with the service_role key to get the full OpenAPI spec!
      
    // Let's fetch OpenAPI spec!
    const openApiUrl = `${supabaseUrl}/rest/v1/`
    const openApiResponse = await fetch(openApiUrl, {
      headers: {
        'apikey': supabaseServiceRole,
        'Authorization': `Bearer ${supabaseServiceRole}`,
        'Accept': 'application/openapi+json'
      }
    })

    const openApiData = await openApiResponse.json()
    
    // Extract properties of our key tables
    const tablesToCheck = ['students', 'dance_classes', 'attendance', 'team_members', 'school_settings', 'profiles']
    const schemaDetails: Record<string, string[]> = {}
    
    tablesToCheck.forEach(table => {
      const props = openApiData.definitions?.[table]?.properties
      schemaDetails[table] = props ? Object.keys(props) : []
    })

    return new Response(JSON.stringify(schemaDetails), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
