import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Cabeçalho de autorização ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceRole)

    // Verify user token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado ou token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Read payload
    const { plan, redirectOrigin } = await req.json()
    if (!plan || !['bronze', 'prata', 'ouro', 'diamante'].includes(plan)) {
      return new Response(
        JSON.stringify({ error: 'Plano inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!mpAccessToken) {
      return new Response(
        JSON.stringify({ error: 'Configuração do Mercado Pago ausente no servidor (MP_ACCESS_TOKEN)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Configure details based on plan
    let price = 29.99
    let title = "DanceFlow - Plano Bronze"
    if (plan === 'prata') {
      price = 49.99
      title = "DanceFlow - Plano Prata"
    } else if (plan === 'ouro') {
      price = 99.99
      title = "DanceFlow - Plano Ouro"
    } else if (plan === 'diamante') {
      price = 199.99
      title = "DanceFlow - Plano Diamante"
    }

    const origin = redirectOrigin || "http://localhost:5173"

    // Construct preference payload
    const preferencePayload = {
      items: [
        {
          title: title,
          quantity: 1,
          unit_price: price,
          currency_id: "BRL"
        }
      ],
      payer: {
        email: user.email
      },
      back_urls: {
        success: `${origin}/`,
        failure: `${origin}/checkout`,
        pending: `${origin}/checkout`
      },
      external_reference: `${user.id}:${plan}`,
      // Standard MP webhook notifications
      notification_url: `${supabaseUrl}/functions/v1/mp-webhook`
    }

    // Create Preference in Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferencePayload)
    })

    if (!mpResponse.ok) {
      const errorData = await mpResponse.text()
      console.error('Mercado Pago Error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Falha ao criar preferência de pagamento no Mercado Pago' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const mpData = await mpResponse.json()

    return new Response(
      JSON.stringify({ checkoutUrl: mpData.init_point }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Preference endpoint error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
