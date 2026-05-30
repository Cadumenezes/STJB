import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceRole)

  try {
    const url = new URL(req.url)
    let paymentId = url.searchParams.get('id')
    let topic = url.searchParams.get('topic')

    console.log(`[Webhook Recibido] URL Query Params: topic=${topic}, id=${paymentId}`)

    // Read body if POST
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        console.log('[Webhook Body]', JSON.stringify(body))
        
        // MP sends notifications in different schemas
        if (body.type === 'payment' || body.topic === 'payment') {
          paymentId = body.data?.id || body.id || paymentId
          topic = 'payment'
        }
      } catch (e) {
        console.warn('Erro ao ler body JSON do webhook:', e.message)
      }
    }

    // If it's not a payment notification, we just acknowledge it with 200
    if (!paymentId || (topic && topic !== 'payment')) {
      console.log('Notificação ignorada (não é de pagamento).')
      return new Response(JSON.stringify({ status: 'ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!mpAccessToken) {
      console.error('Configuração MP_ACCESS_TOKEN ausente no servidor!')
      return new Response(JSON.stringify({ error: 'MP_ACCESS_TOKEN not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Consult payment details directly on MP to prevent spoofing
    console.log(`Consultando detalhes do pagamento ${paymentId} no Mercado Pago...`)
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`
      }
    })

    if (!mpResponse.ok) {
      const errText = await mpResponse.text()
      console.error(`Erro ao consultar pagamento ${paymentId}:`, errText)
      return new Response(JSON.stringify({ error: 'Failed to fetch payment details from MP' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const payment = await mpResponse.json()
    console.log(`[Status de Pagamento MP]: ${payment.status} | Ref: ${payment.external_reference}`)

    // We only process if payment status is 'approved'
    if (payment.status === 'approved') {
      const externalReference = payment.external_reference
      if (!externalReference) {
        console.warn('Pagamento aprovado mas sem external_reference.')
        return new Response(JSON.stringify({ error: 'No external_reference found' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const [userId, plan] = externalReference.split(':')
      if (!userId || !plan || !['prata', 'ouro', 'diamante'].includes(plan)) {
        console.error(`Referência externa inválida: ${externalReference}`)
        return new Response(JSON.stringify({ error: 'Invalid reference format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Check current profile to calculate correct expiration
      console.log(`Buscando perfil do usuário ${userId}...`)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, expires_at, email')
        .eq('id', userId)
        .single()

      if (profileError || !profile) {
        console.error(`Usuário não encontrado ou erro na busca:`, profileError)
        return new Response(JSON.stringify({ error: 'User profile not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Premium expiration calculation: add to remaining days if current plan is active and not expired
      let baseDate = new Date()
      if (profile.expires_at) {
        const currentExpires = new Date(profile.expires_at)
        if (currentExpires > baseDate) {
          baseDate = currentExpires // Add to the existing active period
        }
      }

      // Add 30 days
      const newExpiresAt = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      const formattedExpiresAt = newExpiresAt.toISOString().split('T')[0]

      console.log(`Atualizando usuário ${profile.email} (${userId}). Novo plano: ${plan}, Vence em: ${formattedExpiresAt}`)

      // Update in Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          status: 'active',
          plan: plan,
          expires_at: formattedExpiresAt
        })
        .eq('id', userId)

      if (updateError) {
        console.error(`Erro ao atualizar perfil do usuário:`, updateError)
        return new Response(JSON.stringify({ error: 'Database update failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`Perfil atualizado com sucesso!`)
      return new Response(JSON.stringify({ success: true, user: profile.email, newPlan: plan, expires: formattedExpiresAt }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      console.log(`Pagamento ${paymentId} não está 'approved' (Status atual: ${payment.status}). Ignorando ação.`)
    }

    return new Response(JSON.stringify({ status: 'processed' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
