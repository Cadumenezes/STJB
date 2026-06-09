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
    const { paymentId } = await req.json()
    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'ID da mensalidade (paymentId) ausente' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the monthly payment and student details
    const { data: payment, error: payError } = await supabase
      .from('monthly_payments')
      .select('*, students(*)')
      .eq('id', paymentId)
      .single()

    if (payError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Mensalidade não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const student = payment.students
    if (!student) {
      return new Response(
        JSON.stringify({ error: 'Aluno associado não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch school settings for the school admin/owner (student.user_id)
    const { data: settings, error: settingsError } = await supabase
      .from('school_settings')
      .select('*')
      .eq('id', student.user_id)
      .single()

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: 'Configurações da escola não encontradas' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const gatewayType = settings.gateway_type || 'none'
    
    if (gatewayType === 'none') {
      return new Response(
        JSON.stringify({ status: 'ignored', message: 'Nenhum gateway configurado para esta escola.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean CPF/CNPJ helper
    const cleanDoc = (doc: string) => (doc || '').replace(/\D/g, '')

    // Validate mandatory data
    const studentName = student.name
    const studentCpf = cleanDoc(student.cpf)
    const studentEmail = student.email || 'financeiro@flow.com.br'
    const studentPhone = (student.phone || '').replace(/\D/g, '')

    if (!studentName || !studentCpf) {
      return new Response(
        JSON.stringify({ error: 'O CPF e o Nome Completo do aluno/responsável são obrigatórios para emissão de boleto.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ----------------------------------------------------
    // INTEGRATION: ASAAS
    // ----------------------------------------------------
    if (gatewayType === 'asaas') {
      const apiKey = settings.gateway_api_key
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'Chave de API do Asaas não configurada' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Self-healing fetch helper to check production or sandbox
      const callAsaas = async (endpoint: string, options: any) => {
        const prodUrl = `https://api.asaas.com/v3${endpoint}`
        const sandboxUrl = `https://sandbox.asaas.com/api/v3${endpoint}`
        
        let res = await fetch(prodUrl, options)
        if (res.status === 401) {
          // If unauthorized, retry on sandbox url
          const sandboxRes = await fetch(sandboxUrl, options)
          if (sandboxRes.status !== 401) {
            return { response: sandboxRes, isSandbox: true }
          }
        }
        return { response: res, isSandbox: false }
      }

      // 1. Search or Create Customer in Asaas
      console.log(`[Asaas] Buscando cliente por CPF/CNPJ: ${studentCpf}...`)
      const customerSearchOpt = {
        method: 'GET',
        headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
      }
      const { response: searchRes, isSandbox } = await callAsaas(`/customers?cpfCnpj=${studentCpf}`, customerSearchOpt)
      let customerId = ''

      if (searchRes.ok) {
        const searchData = await searchRes.json()
        if (searchData.data && searchData.data.length > 0) {
          customerId = searchData.data[0].id
          console.log(`[Asaas] Cliente encontrado: ${customerId}`)
        }
      }

      if (!customerId) {
        console.log(`[Asaas] Cliente não encontrado. Criando novo cliente...`)
        const customerCreateOpt = {
          method: 'POST',
          headers: { 'access_token': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: studentName,
            cpfCnpj: studentCpf,
            email: studentEmail,
            mobilePhone: studentPhone || undefined
          })
        }
        const { response: createCustomerRes } = await callAsaas('/customers', customerCreateOpt)
        if (!createCustomerRes.ok) {
          const errData = await createCustomerRes.text()
          throw new Error(`Erro ao criar cliente no Asaas: ${errData}`)
        }
        const newCustomer = await createCustomerRes.json()
        customerId = newCustomer.id
        console.log(`[Asaas] Cliente criado com sucesso: ${customerId}`)
      }

      // 2. Create Payment in Asaas (hybrid Boleto + Pix by default)
      console.log(`[Asaas] Criando cobrança de R$ ${payment.amount} para vencimento em ${payment.due_date}...`)
      const paymentCreateOpt = {
        method: 'POST',
        headers: { 'access_token': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'UNDEFINED', // UNDEFINED supports both Boleto and Pix
          value: payment.amount,
          dueDate: payment.due_date,
          description: `Mensalidade DanceFlow - Ref: ${payment.reference_month}`,
          postalService: false
        })
      }
      const { response: createPaymentRes } = await callAsaas('/payments', paymentCreateOpt)
      if (!createPaymentRes.ok) {
        const errData = await createPaymentRes.text()
        throw new Error(`Erro ao criar cobrança no Asaas: ${errData}`)
      }
      const paymentData = await createPaymentRes.json()
      console.log(`[Asaas] Cobrança criada com ID: ${paymentData.id}`)

      // 3. Fetch Pix QR Code / Copy-Paste key from Asaas
      console.log(`[Asaas] Buscando Pix Copia e Cola da cobrança...`)
      const pixOpt = {
        method: 'GET',
        headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
      }
      const { response: pixRes } = await callAsaas(`/payments/${paymentData.id}/pixQrCode`, pixOpt)
      let pixCode = ''
      if (pixRes.ok) {
        const pixData = await pixRes.json()
        pixCode = pixData.payload
      }

      // Update Supabase Monthly Payment details
      const updatePayload = {
        gateway_id: paymentData.id,
        payment_url: paymentData.bankSlipUrl || paymentData.invoiceUrl,
        pix_code: pixCode || null,
        barcode: paymentData.identificationField || null
      }

      const { error: updateError } = await supabase
        .from('monthly_payments')
        .update(updatePayload)
        .eq('id', paymentId)

      if (updateError) {
        throw new Error(`Erro ao salvar dados de cobrança no banco: ${updateError.message}`)
      }

      return new Response(
        JSON.stringify({ success: true, ...updatePayload }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ----------------------------------------------------
    // INTEGRATION: CORA
    // ----------------------------------------------------
    if (gatewayType === 'cora') {
      const clientId = settings.cora_client_id
      const clientSecret = settings.cora_client_secret
      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: 'Credenciais do Banco Cora não configuradas (Client ID/Secret)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // OAuth token request
      const getToken = async (prod: boolean) => {
        const url = prod 
          ? 'https://api.cora.com.br/token' 
          : 'https://matryoshka-api.sandbox.cora.com.br/token'
        
        const credentials = btoa(`${clientId}:${clientSecret}`)
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'grant_type=client_credentials'
        })
        return res
      }

      let tokenRes = await getToken(true)
      let isSandbox = false
      if (!tokenRes.ok) {
        // Retry on sandbox
        tokenRes = await getToken(false)
        if (tokenRes.ok) {
          isSandbox = true
        } else {
          const errText = await tokenRes.text()
          throw new Error(`Falha na autenticação com Banco Cora: ${errText}`)
        }
      }

      const { access_token } = await tokenRes.json()
      const baseUrl = isSandbox 
        ? 'https://matryoshka-api.sandbox.cora.com.br' 
        : 'https://api.cora.com.br'

      // Create hybrid Bank Slip in Cora
      console.log(`[Cora] Criando boleto para vencimento em ${payment.due_date}...`)
      const invoicePayload = {
        code: paymentId,
        customer: {
          name: studentName,
          email: studentEmail,
          document: {
            identity: studentCpf,
            type: studentCpf.length > 11 ? 'CNPJ' : 'CPF'
          }
        },
        payment_method: 'BANK_SLIP',
        amount: Math.round(payment.amount * 100), // Cora expects amount in cents
        due_date: payment.due_date,
        services: [
          {
            name: `Mensalidade DanceFlow - Ref: ${payment.reference_month}`,
            amount: Math.round(payment.amount * 100)
          }
        ]
      }

      const createInvoiceRes = await fetch(`${baseUrl}/v2/invoices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoicePayload)
      })

      if (!createInvoiceRes.ok) {
        const errText = await createInvoiceRes.text()
        throw new Error(`Erro ao gerar fatura no Banco Cora: ${errText}`)
      }

      const invoiceData = await createInvoiceRes.json()
      console.log(`[Cora] Cobrança criada com ID: ${invoiceData.id}`)

      // Retrieve PDF URL and barcode/pix
      const paymentUrl = invoiceData.payment_url || null
      const barcode = invoiceData.payment_options?.bank_slip?.bar_code || null
      const pixCode = invoiceData.payment_options?.pix?.emv || null

      const updatePayload = {
        gateway_id: invoiceData.id,
        payment_url: paymentUrl,
        pix_code: pixCode,
        barcode: barcode
      }

      const { error: updateError } = await supabase
        .from('monthly_payments')
        .update(updatePayload)
        .eq('id', paymentId)

      if (updateError) {
        throw new Error(`Erro ao salvar dados de cobrança Cora no banco: ${updateError.message}`)
      }

      return new Response(
        JSON.stringify({ success: true, ...updatePayload }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Tipo de gateway inválido')

  } catch (error: any) {
    console.error('Create billing error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
