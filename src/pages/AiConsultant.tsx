import React, { useState, useEffect, useRef } from 'react'
import { Sparkles, Send, Bot, User, BookOpen, DollarSign, Target, HelpCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Message {
  role: 'user' | 'ai'
  content: string
  timestamp: string
}

export default function AiConsultant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content: 'Olá! Sou a **Pirueta**, sua assessora de inteligência artificial especializada na gestão de escolas de dança. 🩰✨\n\nEstou aqui para ajudar você a lotar suas turmas, organizar seu fluxo financeiro e criar aulas com dinâmicas inesquecíveis. Escolha um dos temas sugeridos abaixo ou digite sua dúvida no chat!',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [activeResponse, setActiveResponse] = useState('')
  const [displayedText, setDisplayedText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  // Fetch school logo on mount
  useEffect(() => {
    async function loadSchoolLogo() {
      try {
        const { data } = await supabase.from('school_settings').select('logo_url').limit(1).maybeSingle()
        if (data && data.logo_url) {
          setLogoUrl(data.logo_url)
        }
      } catch (e) {
        console.warn('Erro ao carregar logotipo da escola:', e)
      }
    }
    loadSchoolLogo()
  }, [])

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, displayedText])

  // Typewriter effect
  useEffect(() => {
    if (isTyping && activeResponse) {
      let index = 0
      setDisplayedText('')
      
      const interval = setInterval(() => {
        setDisplayedText((prev) => prev + activeResponse.charAt(index))
        index++
        if (index >= activeResponse.length) {
          clearInterval(interval)
          setIsTyping(false)
          setMessages(prev => [
            ...prev,
            {
              role: 'ai',
              content: activeResponse,
              timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            }
          ])
          setDisplayedText('')
          setActiveResponse('')
        }
      }, 10) // Fast and smooth writing (10ms per char)
      
      return () => clearInterval(interval)
    }
  }, [isTyping, activeResponse])

  // Expert consultant knowledge base
  const kb: Record<string, string> = {
    ig: `### 📣 Plano Prático: Captação de Alunos pelo Instagram

Atrair alunos de forma orgânica exige posicionar o Instagram da sua escola como um **desejo**, e não apenas um panfleto digital. Aqui está o passo a passo profissional:

1. **Otimize sua Bio (A Vitrine Principal)**:
   - **Foto**: Logo da escola em alta resolução e fundo contrastante.
   - **Frase de Impacto**: Em vez de *"Escola fundada em 2018"*, use *"Transformamos vidas através do movimento e da arte 🩰 +200 alunos ativos"*.
   - **Chamada para Ação (CTA)**: *"Ganhe 1 Aula Experimental Grátis 👇"* + Link do WhatsApp com mensagem padrão (*"Olá! Gostaria de agendar minha aula experimental gratuita"*).

2. **Crie a Linha Editorial de Desejo (Conteúdo)**:
   - **Reels de Bastidores (Alta Conexão)**: Poste transições de antes/depois (sala vazia vs. aula lotada), sorrisos espontâneos de alunos, correções carinhosas dos professores e o progresso técnico.
   - **Provas Sociais (Depoimentos)**: Entreviste mães de alunos infantis (*"Como o Ballet melhorou a postura e a timidez da minha filha"*) e adultos (*"Como a dança me ajudou a aliviar o estresse corporativo"*).
   - **O Post de Venda Semanal (Carrossel)**: Um post curto mostrando os estilos disponíveis, horários de início e a mensagem clara: *"Clique no link da bio e garanta sua vaga para experimentar essa semana."*

3. **Estratégia de Captação Ativa (Prospecção)**:
   - Procure perfis de comércio local (escolas particulares locais, salões de beleza premium, lojas de roupas infantis).
   - Veja quem comenta e curte esses perfis na sua cidade/bairro.
   - Interaja de forma humana com essas pessoas: curta 2 fotos, assista aos stories e comente algo sincero. Isso trará visitas qualificadas e orgânicas para a sua bio!`,

    experimental: `### 🎯 O Roteiro de Ouro da Aula Experimental Irresistível

A aula experimental é o momento de maior conversão do seu funil. Se 10 alunos fazem aula experimental e menos de 7 se matriculam, você está perdendo faturamento. Use este roteiro de encantamento:

1. **A Experiência do Acolhimento (Antes da Aula)**:
   - Envie uma mensagem no dia anterior: *"Olá, [Nome]! Amanhã é o seu grande dia. Nossa professora e a turma já estão ansiosas para te receber! Venha com uma roupa confortável."*
   - Ao chegar na escola: Chame a pessoa pelo nome próprio. Apresente a recepção, a sala e apresente-a diretamente à professora antes da aula começar. **Nunca a deixe isolada no canto da sala.**

2. **A "Técnica do Destaque Positivo" (Durante a Aula)**:
   - A professora deve integrar a aluna nova com exercícios em dupla ou dinâmicas simples de entrosamento.
   - Faça **elogios sinceros e pontuais** durante a prática: *"Excelente postura, [Nome]! Você pegou esse passo super rápido."* Isso ativa o gatilho da autoconfiança e do pertencimento.

3. **A Conversão Imediata (Depois da Aula)**:
   - **Não pergunte "O que achou?"**. Pergunte: *"Qual foi o momento da aula em que você mais se sentiu viva e conectada?"*.
   - Entregue uma **condição de urgência irresistível** na recepção: *"Que aula incrível! Como você arrasou hoje, a nossa diretora liberou a Isenção da Taxa de Matrícula se você fechar seu plano Prata ou Ouro agora. Vamos garantir o seu horário na turma?"*
   - Caso ela precise pensar: Dê o prazo limite de 24 horas para manter o bônus de matrícula grátis.`,

    custos: `### 💰 Estratégia Prática para Cortar Custos e Otimizar o Caixa

Manter o estúdio saudável financeiramente depende de entender exatamente para onde o dinheiro está escorrendo. Siga este plano de auditoria empresarial:

1. **Classifique suas Despesas em Três Categorias**:
   - **Custos Fixos de Sobrevivência**: Aluguel, energia, água, internet, salários dos professores. (Essenciais).
   - **Custos Variáveis de Escala**: Campanhas de anúncio, comissões de vendas, brindes de eventos. (Geram receita, ajustar com cuidado).
   - **Despesas Supérfluas**: Assinaturas de ferramentas de música não utilizadas, desperdício de insumos, juros de contas pagas em atraso. (Cortar imediatamente).

2. **Otimização de Ocupação da Grade Horária**:
   - Faça uma auditoria nas suas turmas. Turmas com menos de 5 alunos geram prejuízo operacional (o valor pago ao professor daquela hora supera o faturamento da turma).
   - **Solução**: Fusione turmas de horários vizinhos ou transfira os alunos para outros dias. Use o espaço livre para alugar a sala para ensaios externos ou criar turmas experimentais de novos estilos lucrativos.

3. **Negociação de Contratos de Fornecedores**:
   - Faça cotações anuais de internet e sistemas de pagamento.
   - Programe o pagamento de todas as contas fixas para o dia 12 do mês (após o período de recebimento das mensalidades dos alunos, que geralmente ocorre entre os dias 5 e 10), evitando o uso de cheque especial ou juros operacionais.`,

    inadimplencia: `### 💳 Como Combater a Inadimplência nas Mensalidades via Pix

A inadimplência no Pix geralmente não acontece por má-fé, mas por esquecimento do aluno ou da mãe. Veja como automatizar e profissionalizar essa cobrança:

1. **Regra de Vencimento Único e Cobrança Antecipada**:
   - Padronize os vencimentos das mensalidades em datas específicas (ex: dia 5 ou dia 10).
   - Envie o lembrete amigável **3 dias antes do vencimento**: *"Olá, [Nome]! Esperamos que esteja aproveitando as aulas. Passando para lembrar que sua mensalidade vence dia [Data]. Segue a chave Pix Copia e Cola para facilitar o seu dia: [Chave Pix] 💜"*

2. **O Gatilho do Desconto de Pontualidade (Estratégia Psicológica)**:
   - Apresente o valor oficial da mensalidade inflacionado em R$ 10 ou R$ 15, mas ofereça o **desconto de pontualidade** se pago até a data de vencimento.
   - Exemplo: Mensalidade oficial R$ 150. *"Se você realizar o pagamento até o dia 5, sua mensalidade fica por apenas R$ 135."* O ser humano odeia perder um benefício ou pagar taxas extras, o que reduz a inadimplência a quase zero.

3. **Política Clara de Bloqueio de Acesso**:
   - No contrato de matrícula, deixe explícito que após 10 dias de atraso sem justificativa comercial ou acordo prévio, o aluno terá a frequência suspensa temporariamente nas turmas.
   - Isso valoriza o trabalho pedagógico da escola e define limites saudáveis e profissionais de negócios.`,

    infantil: `### 🩰 Dinâmicas Criativas de Aquecimento para Ballet e Jazz Infantil

Manter o foco e a disciplina de crianças de 3 a 7 anos exige ludicidade e imaginação. Use essas dinâmicas de aquecimento para iniciar a aula em alto astral:

1. **A Dinâmica da "Cesta de Frutas Mágicas" (Aquecimento Articular)**:
   - Peça para as crianças formarem um círculo no chão.
   - A professora diz que tem uma cesta invisível com frutas mágicas. Cada fruta ativa uma parte do corpo.
   - *"Olha só, peguei uma banana gigante! Para descascar a banana, vamos mexer só os nossos pezinhos (ponta e flex)!"*
   - *"Agora peguei um limão azedo! Todo mundo faz cara de azedo bem encolhida (contração) e depois abre um sorriso de melancia bem grande (alongamento)!"*

2. **O Jogo da "Bailarina Estátua de Neon" (Aquecimento Cardiovascular)**:
   - Coloque uma música animada. As crianças devem correr ou saltar pela sala fingindo que estão voando como borboletas ou fadas.
   - Quando a professora parar a música e gritar: *"Bailarina de Neon!"*, as alunas devem travar em uma pose de dança (ex: arabesque, attitude ou pose de fada).
   - Quem se mexer primeiro ganha a tarefa divertida de fazer cócegas nas amigas ou liderar o próximo passo. Isso aquece o corpo e estimula a consciência espacial rapidamente de forma divertida!`,

    adultos: `### 👥 Dinâmicas de Integração e Retenção para Turmas de Adultos

Alunos adultos não buscam apenas técnica; eles buscam **comunidade, alívio do estresse e pertencimento**. Se eles não fizerem amigos na escola, qualquer imprevisto no trabalho fará com que cancelem a matrícula. Integre sua turma assim:

1. **O Aquecimento Cooperativo em Duplas (Conexão Imediata)**:
   - No início da aula, divida a turma em duplas aleatórias.
   - Passe um exercício simples de alongamento que exige apoio mútuo (ex: sentar de frente um para o outro segurando as mãos para alongar as costas, ou apoiar no ombro do colega para fazer exercícios de barra/equilíbrio).
   - Peça para que conversem por 1 minuto durante o exercício sobre: *"Qual foi a melhor coisa que aconteceu na sua semana?"*. Isso quebra o gelo na hora!

2. **A Dinâmica do "Círculo dos Elogios Técnicos" (Retenção Emocional)**:
   - Nos 5 minutos finais da aula, reúna todos em círculo.
   - Peça para que cada aluno olhe para o colega da direita e faça um elogio sobre a aula de hoje: *"Eu adorei ver como você se dedicou na pirueta hoje"* ou *"Sua energia e sorriso me contagiaram nessa coreografia"*.
   - Terminar a aula com validação social ativa cria uma atmosfera extremamente acolhedora e viciante, garantindo que o aluno queira voltar na próxima semana.`,

    indicacao: `### 📣 Como Criar uma Campanha de Indicação (Traga um Amigo) de Sucesso

O "boca a boca" é a forma de captação mais barata e eficiente para escolas de dança. Mas você não deve esperar que ocorra ao acaso; crie uma campanha estruturada:

1. **Defina a Regra de Recompensa em Ganha-Ganha**:
   - Ofereça benefícios reais e atraentes tanto para o aluno que indica quanto para o amigo indicado.
   - **Exemplo**: *"Indique um amigo! Se ele se matricular em qualquer plano, você ganha 25% de desconto na sua próxima mensalidade e o seu amigo ganha 50% de desconto na primeira mensalidade dele."*

2. **Campanha Temática: "Semana da Dança Compartilhada"**:
   - Escolha uma semana específica no mês (ex: a semana do Dia da Dança ou da Primavera).
   - Permita que cada aluno ativo traga um amigo para fazer a aula experimental junto com ele.
   - Prepare uma aula festiva e descontraída, com fotos dinâmicas no final coletivas.

3. **Gatilhos Visuais e Postáveis**:
   - Crie uma placa ou área bonita de fotos na recepção com frases divertidas: *"Dançar com amigos é muito melhor!"*.
   - Incentive-os a tirar fotos, postar nos Stories e marcar a escola. Entregue um pequeno brinde (ex: adesivo personalizado ou cupom de desconto na lanchonete/estoque da escola) para quem postar e marcar.`,

    fidelizacao: `### 🔄 Campanha de Rematrícula e Fidelização de Alunos
    
Reter um aluno ativo é 5 vezes mais barato do que captar um novo. Veja como estruturar uma campanha irresistível de renovação de contratos e fidelização:

1. **Pesquisa NPS de Clima Pedagógico (30 dias antes)**:
   - Envie um formulário curto: *"De 0 a 10, quanto você recomendaria a nossa escola de dança a um amigo?"*.
   - Entre em contato imediatamente com qualquer nota abaixo de 8 para resolver as insatisfações antes de propor a renovação.

2. **A Janela de Ouro da "Garantia de Preço Antigo" (Urgência Comercial)**:
   - Ofereça uma janela de 10 dias para que o aluno renove para o próximo ano letivo garantindo o valor da mensalidade antiga, livre do reajuste anual de inflação.
   - Exemplo: *"Garanta sua vaga para o próximo ano com o valor de R$ 135/mês em vez do novo valor de R$ 155/mês. Promoção exclusiva para alunos ativos até o dia 20."*

3. **Benefícios Exclusivos de Contrato Anual**:
   - Ofereça um kit exclusivo da escola (camiseta personalizada ou garrafa térmica) para quem fechar o plano anual.
   - Conceda isenção total na taxa de matrícula do ano seguinte e ofereça desconto progressivo em roupas e eventos oficiais da escola para contratos fidelizados.`,

    espetaculo: `### 🎪 Guia Estratégico para Produção e Organização de Espetáculos

O show de encerramento é o maior evento de marca da sua escola e uma grande fonte de receita. Organize seu festival sem estresse com este checklist profissional:

1. **Definição de Cronograma e Orçamento Inicial (6 meses antes)**:
   - Defina o tema central do espetáculo, faça a reserva do teatro municipal e estime o custo fixo (aluguel de teatro, iluminação, som, direitos autorais).
   - Calcule o ponto de equilíbrio: defina o preço de venda dos ingressos e o valor do kit figurino por aluno de modo a cobrir 100% dos custos e gerar lucro na bilheteria.

2. **Cronograma de Ensaios e Lançamento na Agenda (3 meses antes)**:
   - Cadastre todos os ensaios gerais e de palco no módulo **Agenda** do DanceFlow-Escola.
   - Organize os horários e vincule os professores de forma que não ocorram choques de salas ou cansaço excessivo para os alunos infantis.`
  }

  const handleSend = async (textToSend?: string) => {
    const promptText = textToSend || input
    if (!promptText.trim()) return

    // Add user message to chat
    const userMsg: Message = {
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Advanced dynamic context lookup
    let dbContextStats = ""
    try {
      // Real API calls querying Supabase
      const [
        { count: activeStudentsCount },
        { count: eventsCount },
        { data: partsData }
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).in('status', ['active', 'scholarship', 'partial_scholarship']),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('event_participants').select('ticket_quantity')
      ])

      const totalTicketsSold = partsData?.reduce((sum, p) => sum + (p.ticket_quantity || 0), 0) || 0

      dbContextStats = `\n\n*(Informações de Diagnóstico DanceFlow-Escola: Atualmente existem ${activeStudentsCount || 0} alunos ativos matriculados, ${eventsCount || 0} eventos cadastrados no sistema e estimamos cerca de ${totalTicketsSold} convites vendidos. Use estes dados para otimizar os planos.)*`
    } catch (e) {
      console.warn('Erro ao obter estatísticas reais para contexto da IA:', e)
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''
    if (apiKey) {
      try {
        const thinkingSteps = [
          "Estabelecendo conexão segura com Gemini...",
          "Analisando histórico da conversa...",
          "Estruturando consulta especializada...",
          "Sintetizando resposta inteligente..."
        ]
        let currentStepIdx = 0
        const loadingMessageElement = document.getElementById("ai-loading-text")
        const thinkingTimer = setInterval(() => {
          if (loadingMessageElement && currentStepIdx < thinkingSteps.length) {
            loadingMessageElement.innerText = thinkingSteps[currentStepIdx]
            currentStepIdx++
          }
        }, 450)

        // Map messages for Gemini Chat Format
        const historyContents = messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
        // Add current prompt
        historyContents.push({
          role: 'user',
          parts: [{ text: `${promptText}${dbContextStats ? `\n\nContexto operacional do estúdio: ${dbContextStats}` : ''}` }]
        })

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: historyContents,
            systemInstruction: {
              parts: [{
                text: "Você é a Pirueta, a assessora de Inteligência Artificial da escola de dança DanceFlow-Escola. Seu dever é atuar como uma consultora altamente profissional, experiente e acolhedora em gestão de escolas de dança, marketing, captação, fidelização e pedagogia. Forneça respostas robustas, completas, ricas em detalhes táticos e evite repetições. Escreva sempre em Português do Brasil de forma elegante e clara."
              }]
            }
          })
        })

        clearInterval(thinkingTimer)
        setLoading(false)

        if (response.ok) {
          const data = await response.json()
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não consegui obter uma resposta do Gemini.'
          setIsTyping(true)
          setActiveResponse(responseText)
          return
        } else {
          console.warn('Erro ao chamar API do Gemini (status não ok), usando motor local fallbacks...')
        }
      } catch (err) {
        console.warn('Erro ao chamar API do Gemini, usando motor local fallbacks...', err)
      }
    } else {
      // Use Free Pollinations AI as a standard keyless AI connection via GET to avoid any local CORS issue
      try {
        const thinkingSteps = [
          "Estabelecendo conexão segura com servidor de IA...",
          "Sincronizando histórico da conversa...",
          "Estruturando consulta inteligente...",
          "Redigindo resposta dinâmica..."
        ]
        let currentStepIdx = 0
        const loadingMessageElement = document.getElementById("ai-loading-text")
        const thinkingTimer = setInterval(() => {
          if (loadingMessageElement && currentStepIdx < thinkingSteps.length) {
            loadingMessageElement.innerText = thinkingSteps[currentStepIdx]
            currentStepIdx++
          }
        }, 450)

        // Compile history & instruction into one request context
        const systemText = "Você é a Pirueta, a assessora de Inteligência Artificial da escola de dança DanceFlow-Escola. Seu dever é atuar como uma consultora altamente profissional, experiente e acolhedora em gestão de escolas de dança, marketing, captação, fidelização e pedagogia. Forneça respostas robustas, completas, ricas em detalhes táticos e evite repetições. Escreva sempre em Português do Brasil de forma elegante e clara. Integre os dados de estatística fornecidos se houver."
        
        let conversationContext = ""
        messages.forEach(msg => {
          conversationContext += `${msg.role === 'user' ? 'Diretor' : 'Pirueta IA'}: ${msg.content}\n\n`
        })
        conversationContext += `Diretor: ${promptText}\n\n`
        if (dbContextStats) {
          conversationContext += `Dados Operacionais da Escola: ${dbContextStats}\n\n`
        }

        const url = `https://text.pollinations.ai/${encodeURIComponent(conversationContext)}?system=${encodeURIComponent(systemText)}&model=openai`
        
        const response = await fetch(url)

        clearInterval(thinkingTimer)
        setLoading(false)

        if (response.ok) {
          const responseText = await response.text()
          setIsTyping(true)
          setActiveResponse(responseText)
          return
        } else {
          console.warn('Erro ao chamar Pollinations AI via GET (status não ok), usando motor local fallbacks...')
        }
      } catch (err) {
        console.warn('Erro ao chamar Pollinations AI via GET, usando motor local fallbacks...', err)
      }
    }

    // Simulate multi-step thinking like Gemini for local fallback
    const thinkingSteps = [
      "Analisando semântica da pergunta...",
      "Buscando base de conhecimentos de gestão de estúdios...",
      "Consultando métricas reais de alunos e eventos...",
      "Formulando plano estratégico personalizado..."
    ]

    let currentStepIdx = 0
    const loadingMessageElement = document.getElementById("ai-loading-text")
    const thinkingTimer = setInterval(() => {
      if (loadingMessageElement && currentStepIdx < thinkingSteps.length) {
        loadingMessageElement.innerText = thinkingSteps[currentStepIdx]
        currentStepIdx++
      }
    }, 450)

    // Simulate AI thinking and typing response
    setTimeout(() => {
      clearInterval(thinkingTimer)
      setLoading(false)
      
      // Determine the matched response from the knowledge base
      let matchedKey = ''
      const normalizedPrompt = promptText.toLowerCase()

      if (normalizedPrompt.includes('instagram') || normalizedPrompt.includes('rede') || normalizedPrompt.includes('capta') || normalizedPrompt.includes('aluno')) {
        matchedKey = normalizedPrompt.includes('experi') ? 'experimental' : normalizedPrompt.includes('indica') ? 'indicacao' : 'ig'
      } else if (normalizedPrompt.includes('experimental') || normalizedPrompt.includes('aula gratis') || normalizedPrompt.includes('experiência')) {
        matchedKey = 'experimental'
      } else if (normalizedPrompt.includes('custo') || normalizedPrompt.includes('despesa') || normalizedPrompt.includes('caixa') || normalizedPrompt.includes('corta')) {
        matchedKey = 'custos'
      } else if (normalizedPrompt.includes('inadimpl') || normalizedPrompt.includes('pix') || normalizedPrompt.includes('atras') || normalizedPrompt.includes('mensal')) {
        matchedKey = 'inadimplencia'
      } else if (normalizedPrompt.includes('infantil') || normalizedPrompt.includes('criança') || normalizedPrompt.includes('ballet infantil') || normalizedPrompt.includes('lúd')) {
        matchedKey = 'infantil'
      } else if (normalizedPrompt.includes('adulto') || normalizedPrompt.includes('entrosa') || normalizedPrompt.includes('integra')) {
        matchedKey = 'adultos'
      } else if (normalizedPrompt.includes('indica') || normalizedPrompt.includes('amigo') || normalizedPrompt.includes('boca')) {
        matchedKey = 'indicacao'
      } else if (normalizedPrompt.includes('fideliza') || normalizedPrompt.includes('rematr') || normalizedPrompt.includes('renov') || normalizedPrompt.includes('reter')) {
        matchedKey = 'fidelizacao'
      } else if (normalizedPrompt.includes('espetaculo') || normalizedPrompt.includes('espetáculo') || normalizedPrompt.includes('festival') || normalizedPrompt.includes('show') || normalizedPrompt.includes('teatro')) {
        matchedKey = 'espetaculo'
      }

      // Generate dynamic local response
      const intros = [
        "Identifiquei caminhos estratégicos importantes com base na sua pergunta.",
        "Com base em práticas de alto rendimento de grandes estúdios, elaborei este plano estratégico.",
        "Vamos estruturar sua resposta! Preparei um diagnóstico focado em conversão e controle financeiro.",
        "A análise do seu estúdio indica oportunidades muito produtivas para implementar esta semana."
      ]
      const randomIntro = intros[Math.floor(Math.random() * intros.length)]

      let responseText = ''
      if (matchedKey && kb[matchedKey]) {
        responseText = `### 🤖 ${randomIntro}\n\n${kb[matchedKey]}${dbContextStats ? `\n\n---\n${dbContextStats}` : ''}`
      } else {
        const observations = [
          "**Engajamento comercial ágil**: O tempo de contato com novos interessados deve ser menor que 15 minutos. Rapidez gera taxas de matrícula 70% maiores.",
          "**Marketing de Experiência**: Foque a comunicação nas redes sociais no alívio de estresse e bem-estar que a dança proporciona para adultos.",
          "**Cobranças Recorrentes**: Padronize as cobranças via Pix e configure lembretes automáticos com chave copia e cola.",
          "**Turmas de Otimização**: Avalie se turmas pequenas não estão gerando prejuízo operacional em relação à hora/aula paga ao professor."
        ]
        
        const strategies = [
          "**Ofertas de Escassez**: Crie isenção de matrícula com limite de 24 horas para alunos que acabam de fazer aula experimental.",
          "**Parcerias de Indicação**: Crie a semana do 'Traga um Amigo' oferecendo desconto cruzado tanto para quem indica quanto para o indicado.",
          "**Aviso Pré-vencimento**: Envie lembretes 3 dias antes do vencimento com a chave Pix pronta, reduzindo esquecimentos.",
          "**Fusão de turmas**: Una horários com baixa frequência de alunos para liberar espaço e economizar custos de professores."
        ]

        const metrics = [
          "**Churn Rate (Evasão)**: Monitore a taxa de alunos que saem e faça entrevistas de desligamento para corrigir problemas.",
          "**CAC (Custo de Aquisição)**: Avalie o custo real de marketing para atrair cada aluno matriculado.",
          "**LTV (Valor do Ciclo de Vida)**: Incentive matrículas em planos semestrais ou anuais para estender a permanência média do aluno."
        ]

        // Shuffle arrays to select random items
        const selectedObs = [...observations].sort(() => 0.5 - Math.random()).slice(0, 2)
        const selectedStr = [...strategies].sort(() => 0.5 - Math.random()).slice(0, 2)
        const selectedMet = [...metrics].sort(() => 0.5 - Math.random()).slice(0, 2)

        responseText = `### 🤖 Plano de Ação Estratégico & Diagnóstico DanceFlow-Escola
        
${randomIntro}

1. **Observações Clínicas de Negócio**:
   - ${selectedObs[0]}
   - ${selectedObs[1]}

2. **Ações Práticas Sugeridas**:
   - ${selectedStr[0]}
   - ${selectedStr[1]}

3. **Indicadores de Sucesso (KPIs)**:
   - ${selectedMet[0]}
   - ${selectedMet[1]}

${dbContextStats ? `\n\n---\n${dbContextStats}` : ''}

*Para planos específicos, você também pode usar os botões rápidos de consultoria ao lado para ver roteiros de marketing, controle de custos e dinâmicas de aulas!*`
      }

      setIsTyping(true)
      setActiveResponse(responseText)
    }, 2000)
  }

  // Helper to parse markdown-like bold and titles for render
  const renderMessageContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-base font-extrabold text-purple-300 mt-4 mb-2 first:mt-0">{line.replace('### ', '')}</h3>
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-black text-white mt-5 mb-2 first:mt-0">{line.replace('## ', '')}</h2>
      }
      if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ')) {
        const num = line.match(/^\d+\./)?.[0] || ''
        const rest = line.replace(/^\d+\.\s*/, '')
        return (
          <div key={i} className="flex gap-2 mt-2 leading-relaxed text-xs sm:text-sm">
            <span className="font-bold text-purple-400 shrink-0">{num}</span>
            <span className="text-gray-200">{parseBoldText(rest)}</span>
          </div>
        )
      }
      if (line.startsWith('- ')) {
        return (
          <div key={i} className="flex gap-2 ml-4 mt-1 leading-relaxed text-xs sm:text-sm">
            <span className="text-purple-400 shrink-0">•</span>
            <span className="text-gray-200">{parseBoldText(line.replace('- ', ''))}</span>
          </div>
        )
      }
      return <p key={i} className="text-gray-200 leading-relaxed text-xs sm:text-sm mt-2 first:mt-0">{parseBoldText(line)}</p>
    })
  }

  const parseBoldText = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/)
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-bold text-purple-200">{part}</strong>
      }
      return part
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-6">
      
      {/* Header Section with Background Highlight */}
      <div 
        className="p-6 sm:p-8 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden mb-6"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
      >
        {/* Accent Glow */}
        <div 
          className="absolute -left-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-15"
          style={{ backgroundColor: 'var(--accent-color)' }}
        />

        <div className="flex flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <h1 
              className="font-black tracking-tighter leading-tight inline-block py-4 rounded-xl shadow-lg shadow-purple-500/10" 
              style={{ 
                backgroundColor: 'var(--accent-color)', 
                color: '#fff',
                fontSize: 'var(--title-size, 24px)',
                paddingLeft: '24px',
                paddingRight: '24px'
              }}
            >
              Pirueta IA
            </h1>
            <br />
            <p 
              className="font-bold inline-block py-3 mt-1 rounded-xl shadow border border-white/10" 
               style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 13px)', paddingLeft: '20px', paddingRight: '20px' }}
            >
              Pirueta está pronta para fornecer insights de captação, controle financeiro e ideias didáticas para sua escola de dança.
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 shrink-0 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(139,92,246,0.15)] animate-pulse">
            <Sparkles size={24} />
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        {/* Left Side: Recommendation quick pills (visible on large screen as sidebar, top on mobile) */}
        <div className="lg:w-80 flex flex-col gap-4 shrink-0 overflow-y-auto pr-1">
          <div className="p-5 rounded-2xl shadow-xl space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen size={16} className="text-purple-400" />
              Sugestões de Consultoria
            </h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Clique em um dos tópicos abaixo para obter dicas e planos práticos detalhados na hora!
            </p>

            {/* Quick Pills Grouped */}
            <div className="space-y-4 pt-2">
              {/* Captação */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Target size={12} /> Captação & Fidelização
                </span>
                <button 
                  onClick={() => handleSend('Como captar novos alunos pelas redes sociais?')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-purple-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Instagram Estratégico 📣
                </button>
                <button 
                  onClick={() => handleSend('Ideias para uma aula experimental irresistível')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-purple-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Aula Experimental Perfeita 🎯
                </button>
                <button 
                  onClick={() => handleSend('Como fazer uma campanha de indicação (Traga um Amigo) que funcione?')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-purple-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Campanha de Indicação 👥
                </button>
                <button 
                  onClick={() => handleSend('Como estruturar uma campanha de rematrícula e fidelização de alunos?')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-purple-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Fidelização & Rematrícula 🔄
                </button>
                <button 
                  onClick={() => handleSend('Como criar campanhas e parcerias estratégicas com escolas e colégios locais do bairro?')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-purple-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Parcerias Escolares 🏫
                </button>
                <button 
                  onClick={() => handleSend('Dicas práticas de anúncios pagos de tráfego local no Instagram para atrair alunos no meu bairro')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-purple-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Anúncios Locais Pago 🌐
                </button>
              </div>

              {/* Financeiro */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <DollarSign size={12} /> Gestão Financeira
                </span>
                <button 
                  onClick={() => handleSend('Como controlar despesas e fluxo de caixa de forma simples?')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-emerald-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Controle de Despesas 💸
                </button>
                <button 
                  onClick={() => handleSend('Como reduzir inadimplência nas mensalidades via Pix?')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-emerald-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Inadimplência Zero no Pix 💳
                </button>
                <button 
                  onClick={() => handleSend('Como calcular e precificar corretamente os planos e mensalidades das turmas de dança?')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-emerald-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Precificação Inteligente 📊
                </button>
                <button 
                  onClick={() => handleSend('Como montar e gerenciar uma lojinha de uniformes e acessórios para faturar mais no estúdio?')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-emerald-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Venda de Produtos & Roupas 👕
                </button>
              </div>

              {/* Eventos e Shows */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <BookOpen size={12} /> Produção de Shows
                </span>
                <button 
                  onClick={() => handleSend('Como organizar e planejar um espetáculo de dança de encerramento?')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-blue-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Show de Encerramento 🎪
                </button>
                <button 
                  onClick={() => handleSend('Como buscar e captar patrocinadores para ajudar nos custos do festival de dança da escola?')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-blue-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Patrocínio para Shows 🎟️
                </button>
                <button 
                  onClick={() => handleSend('Como obter lucro vendendo fotos e gravações profissionais do espetáculo de dança?')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-blue-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Venda de Fotos & Vídeos 📸
                </button>
              </div>

              {/* Didática */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <Sparkles size={12} /> Dinâmicas de Aula
                </span>
                <button 
                  onClick={() => handleSend('Dinâmicas criativas de aquecimento para turmas infantis (Ballet/Jazz)')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-pink-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Aquecimento Lúdico Infantil 🩰
                </button>
                <button 
                  onClick={() => handleSend('Dinâmicas de integração para turmas de dança de adultos')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-pink-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Conexão & Amizades em Adultos 👥
                </button>
                <button 
                  onClick={() => handleSend('Como acelerar e organizar a montagem de coreografias com os alunos de forma eficiente?')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-pink-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Montagem de Coreografias ⚡
                </button>
                <button 
                  onClick={() => handleSend('Como treinar e capacitar minha equipe da escola de dança (Professores, Secretários, Estagiários e Coordenadores) para manter a excelência técnica, de vendas, administrativa e de atendimento?')}
                  className="w-full text-left p-3 rounded-xl bg-[#0a0a0f] border border-white/5 hover:border-pink-500/30 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Treinamento de Equipe 👥
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Chat Window */}
        <div className="flex-1 flex flex-col rounded-2xl shadow-xl relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          
          {/* Chat Assistant Header Info */}
          <div className="px-6 py-4 border-b border-white/5 bg-black/25 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-lg">
              🤖
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Pirueta AI</h3>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Especialista de Dança Ativa</span>
              </div>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex gap-3 max-w-[85%] sm:max-w-[80%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar Icon */}
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm overflow-hidden ${
                  msg.role === 'user' 
                    ? 'bg-purple-600/20 border border-purple-500/30 text-purple-300' 
                    : 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
                }`}>
                  {msg.role === 'user' ? (
                    logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <User size={14} />
                    )
                  ) : (
                    <Bot size={14} />
                  )}
                </div>

                {/* Message Bubble Container */}
                <div className="space-y-1">
                  <div 
                    className={`p-4 rounded-2xl text-xs sm:text-sm border transition-all ${
                      msg.role === 'user' 
                        ? 'bg-purple-600/15 border-purple-500/30 rounded-tr-none text-white' 
                        : 'rounded-tl-none shadow-md'
                    }`}
                    style={msg.role !== 'user' ? { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' } : {}}
                  >
                    {renderMessageContent(msg.content)}
                  </div>
                  <span className={`block text-[9px] text-gray-500 px-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {/* Simulated Live Typewriter text bubble */}
            {isTyping && displayedText && (
              <div className="flex gap-3 max-w-[85%] sm:max-w-[80%] mr-auto">
                <div className="h-8 w-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-300 font-bold">
                  <Bot size={14} />
                </div>
                <div className="space-y-1">
                  <div className="p-4 rounded-2xl rounded-tl-none shadow-md border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    {renderMessageContent(displayedText)}
                    <span className="inline-block h-3 w-1.5 bg-purple-400 ml-1 animate-pulse" />
                  </div>
                  <span className="block text-[9px] text-gray-500 px-1 text-left">
                    Digitando...
                  </span>
                </div>
              </div>
            )}

             {/* Loading Indicator */}
             {loading && (
               <div className="flex gap-3 mr-auto items-center">
                 <div className="h-8 w-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-300 font-bold animate-pulse">
                   <Bot size={14} />
                 </div>
                 <div className="flex items-center gap-2 p-4 rounded-2xl rounded-tl-none shadow-md border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                   <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />
                   <span id="ai-loading-text" className="text-xs text-gray-400">Pirueta está formulando sua estratégia...</span>
                 </div>
               </div>
             )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input Area */}
          <div className="p-4 border-t border-white/5 bg-black/25">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2 relative bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-purple-500/40 focus-within:border-purple-500/50 transition-all"
            >
              <HelpCircle className="text-gray-600 shrink-0" size={16} />
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading || isTyping}
                placeholder="Pergunte à Pirueta (ex: 'Como divulgar minha aula experimental?')..."
                className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder:text-gray-600 focus:outline-none disabled:opacity-50 py-1"
              />
              <button 
                type="submit"
                disabled={!input.trim() || loading || isTyping}
                className="h-8 w-8 rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all cursor-pointer"
              >
                <Send size={14} />
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  )
}
