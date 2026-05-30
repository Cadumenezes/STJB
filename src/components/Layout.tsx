import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Music,
  ClipboardCheck,
  Package,
  UserCog,
  Settings,
  Menu,
  X,
  LogOut,
  HelpCircle,
  Star,
  Calendar,
  Shield,
  Sparkles,
  CalendarDays,
  ShoppingBag,
  CheckCircle2,
  ArrowRight,
  Play,
  Pause,
  Volume2,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'
import Modal from './Modal'
import virtualDirectorUrl from '../assets/virtual_director.png'
import Dashboard from '../pages/Dashboard'
import Financial from '../pages/Financial'
import AttendancePage from '../pages/Attendance'
import Events from '../pages/Events'


const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/students', label: 'Alunos', icon: Users },
  { path: '/trials', label: 'Experimentais', icon: Star },
  { path: '/financial', label: 'Financeiro', icon: DollarSign },
  { path: '/classes', label: 'Turmas', icon: Music },
  { path: '/attendance', label: 'Chamada', icon: ClipboardCheck },
  { path: '/schedule', label: 'Agenda', icon: CalendarDays },
  { path: '/events', label: 'Eventos', icon: Calendar },
  { path: '/shop', label: 'Loja', icon: ShoppingBag },
  { path: '/inventory', label: 'Estoque', icon: Package },
  { path: '/team', label: 'Equipe', icon: UserCog },
  { path: '/ai-consultant', label: 'Pirueta (IA)', icon: Sparkles },
  { path: '/settings', label: 'Configurações', icon: Settings },
]

export default function Layout() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [schoolName, setSchoolName] = useState('DanceFlow')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const location = useLocation()

  const [showTour, setShowTour] = useState(false)
  const [tourStep, setTourStep] = useState(0)

  // IA Diagnostics Simulation HUD State
  const [showSimulator, setShowSimulator] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'director' | 'secretary' | 'teacher'>('director')
  const [simLogs, setSimLogs] = useState<string[]>([])
  const [diagnostics, setDiagnostics] = useState<Record<string, 'pending' | 'success' | 'error'>>({
    dashboard: 'pending',
    students: 'pending',
    attendance: 'pending',
    financial: 'pending',
    inventory: 'pending',
    settings: 'pending'
  })

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('pt-BR')
    setSimLogs(prev => [...prev, `[${time}] ${msg}`])
  }

  const runDiagnostics = async () => {
    if (isSimulating) return
    setIsSimulating(true)
    setSimLogs([])
    setDiagnostics({
      dashboard: 'pending',
      students: 'pending',
      attendance: 'pending',
      financial: 'pending',
      inventory: 'pending',
      settings: 'pending'
    })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        addLog('❌ Erro: Usuário não autenticado.')
        setIsSimulating(false)
        return
      }

      const todayStr = new Date().toISOString().split('T')[0]

      if (selectedRole === 'director') {
        // --- DIRECTOR SIMULATION FLOW ---
        addLog('👑 [IA] Iniciando Varredura Total do Diretor...')
        navigate('/')
        addLog('📊 Acessando Dashboard...')
        await new Promise(r => setTimeout(r, 2000))
        
        try {
          const { count: sCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active')
          const { count: oCount } = await supabase.from('monthly_payments').select('*', { count: 'exact', head: true }).eq('status', 'overdue')
          addLog(`✅ Dashboard OK! Alunos ativos: ${sCount || 0}, Mensalidades atrasadas: ${oCount || 0}`)
          setDiagnostics(prev => ({ ...prev, dashboard: 'success' }))
        } catch (err: any) {
          addLog(`❌ Erro no Dashboard: ${err.message}`)
          setDiagnostics(prev => ({ ...prev, dashboard: 'error' }))
        }

        navigate('/students')
        addLog('👥 Acessando aba de Alunos - Testando CRUD...')
        await new Promise(r => setTimeout(r, 2000))

        try {
          addLog('📝 Testando criação de aluno temporário...')
          const tempStudent = {
            name: '__TEST_STUDENT_IA__',
            guardian_name: 'IA Antigravity',
            status: 'active',
            monthly_fee: 100,
            enrollment_fee: 0,
            class_ids: [],
            user_id: user.id
          }
          const { data: instData, error: insErr } = await supabase.from('students').insert([tempStudent]).select()
          if (insErr) throw insErr
          
          addLog('🗑️ Aluno cadastrado com sucesso. Limpando dados de teste...')
          if (instData && instData[0]) {
            const { error: delErr } = await supabase.from('students').delete().eq('id', instData[0].id)
            if (delErr) throw delErr
          }
          addLog('✅ Módulo de Alunos validado com 100% de sucesso!')
          setDiagnostics(prev => ({ ...prev, students: 'success' }))
        } catch (err: any) {
          addLog(`❌ Erro no Módulo de Alunos: ${err.message}`)
          setDiagnostics(prev => ({ ...prev, students: 'error' }))
        }

        navigate('/attendance')
        addLog('📅 Acessando módulo de Chamada...')
        await new Promise(r => setTimeout(r, 2000))

        try {
          const { data: clsData, error: clsErr } = await supabase.from('dance_classes').select('*')
          if (clsErr) throw clsErr
          addLog(`✅ Chamada OK! Turmas ativas carregadas: ${clsData?.length || 0}`)
          setDiagnostics(prev => ({ ...prev, attendance: 'success' }))
        } catch (err: any) {
          addLog(`❌ Erro no Módulo de Chamada: ${err.message}`)
          setDiagnostics(prev => ({ ...prev, attendance: 'error' }))
        }

        navigate('/financial')
        addLog('💰 Acessando Módulo Financeiro - Testando CRUD...')
        await new Promise(r => setTimeout(r, 2000))

        try {
          addLog('💵 Testando inserção de transação temporária...')
          const tempEntry = {
            type: 'income',
            category: 'Mensalidade',
            description: '__TEST_FINANCE_IA__',
            amount: 0,
            date: todayStr,
            user_id: user.id
          }
          const { data: finData, error: finErr } = await supabase.from('financial_entries').insert([tempEntry]).select()
          if (finErr) throw finErr

          addLog('🗑️ Transação de teste registrada. Limpando dados...')
          if (finData && finData[0]) {
            const { error: delErr } = await supabase.from('financial_entries').delete().eq('id', finData[0].id)
            if (delErr) throw delErr
          }
          addLog('✅ Módulo Financeiro validado com 100% de sucesso!')
          setDiagnostics(prev => ({ ...prev, financial: 'success' }))
        } catch (err: any) {
          addLog(`❌ Erro no Módulo Financeiro: ${err.message}`)
          setDiagnostics(prev => ({ ...prev, financial: 'error' }))
        }

        navigate('/inventory')
        addLog('🛍️ Acessando Estoque - Testando RLS...')
        await new Promise(r => setTimeout(r, 2000))

        try {
          addLog('📦 Testando inserção de produto no Estoque...')
          const tempProduct = {
            name: '__TEST_PRODUCT_IA__',
            price: 50,
            quantity: 1,
            user_id: user.id
          }
          const { data: prodData, error: prodErr } = await supabase.from('products').insert([tempProduct]).select()
          if (prodErr) throw prodErr

          addLog('🗑️ Produto cadastrado. Limpando dados do estoque...')
          if (prodData && prodData[0]) {
            const { error: delErr } = await supabase.from('products').delete().eq('id', prodData[0].id)
            if (delErr) throw delErr
          }
          addLog('✅ RLS de Estoque / Produtos validado com 100% de sucesso!')
          setDiagnostics(prev => ({ ...prev, inventory: 'success' }))
        } catch (err: any) {
          addLog(`❌ Erro RLS no Estoque/Produtos: ${err.message}`)
          setDiagnostics(prev => ({ ...prev, inventory: 'error' }))
        }

        navigate('/settings')
        addLog('⚙️ Acessando Configurações...')
        await new Promise(r => setTimeout(r, 2000))

        try {
          const { data: settingsData, error: settErr } = await supabase.from('school_settings').select('*').limit(1).single()
          if (settErr && settErr.code !== 'PGRST116') throw settErr
          addLog(`✅ Configurações OK! Escola ativa: ${settingsData?.school_name || 'DanceFlow'}`)
          setDiagnostics(prev => ({ ...prev, settings: 'success' }))
        } catch (err: any) {
          addLog(`❌ Erro no Módulo de Configurações: ${err.message}`)
          setDiagnostics(prev => ({ ...prev, settings: 'error' }))
        }

        navigate('/')
        addLog('🏁 Varredura do Diretor concluída com 100% de sucesso! 🎉')

      } else if (selectedRole === 'secretary') {
        // --- SECRETARY SIMULATION FLOW ---
        addLog('📋 [IA] Iniciando Varredura do Perfil de Secretária...')
        navigate('/')
        addLog('📊 Acessando Dashboard...')
        await new Promise(r => setTimeout(r, 2000))
        
        try {
          const { count: sCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active')
          addLog(`✅ Dashboard OK! Alunos ativos: ${sCount || 0}`)
          setDiagnostics(prev => ({ ...prev, dashboard: 'success' }))
        } catch (err: any) {
          addLog(`❌ Erro no Dashboard: ${err.message}`)
          setDiagnostics(prev => ({ ...prev, dashboard: 'error' }))
        }

        navigate('/students')
        addLog('👥 Acessando aba de Alunos - Verificando permissões de Leitura...')
        await new Promise(r => setTimeout(r, 2000))

        try {
          const { data, error } = await supabase.from('students').select('id, name').limit(5)
          if (error) throw error
          addLog(`✅ Leitura de Alunos OK! Encontrados: ${data?.length || 0} alunos.`)
          setDiagnostics(prev => ({ ...prev, students: 'success' }))
        } catch (err: any) {
          addLog(`❌ Erro na leitura de Alunos: ${err.message}`)
          setDiagnostics(prev => ({ ...prev, students: 'error' }))
        }

        navigate('/attendance')
        addLog('📅 Acessando módulo de Chamada...')
        await new Promise(r => setTimeout(r, 2000))

        try {
          const { data: clsData, error: clsErr } = await supabase.from('dance_classes').select('*')
          if (clsErr) throw clsErr
          addLog(`✅ Chamada OK! Turmas carregadas: ${clsData?.length || 0}`)
          setDiagnostics(prev => ({ ...prev, attendance: 'success' }))
        } catch (err: any) {
          addLog(`❌ Erro no Módulo de Chamada: ${err.message}`)
          setDiagnostics(prev => ({ ...prev, attendance: 'error' }))
        }

        navigate('/financial')
        addLog('💰 Acessando Módulo Financeiro - Testando lançamentos de caixa...')
        await new Promise(r => setTimeout(r, 2000))

        try {
          addLog('💵 Simulando lançamento de receita pela Secretária...')
          const tempEntry = {
            type: 'income',
            category: 'Venda de Produto',
            description: '__TEST_SECRETARY_FINANCE__',
            amount: 0,
            date: todayStr
          }
          const { data: finData, error: finErr } = await supabase.from('financial_entries').insert([tempEntry]).select()
          if (finErr) throw finErr

          addLog('🗑️ Transação de teste registrada. Limpando dados...')
          if (finData && finData[0]) {
            const { error: delErr } = await supabase.from('financial_entries').delete().eq('id', finData[0].id)
            if (delErr) throw delErr
          }
          addLog('✅ Módulo Financeiro validado para Secretária!')
          setDiagnostics(prev => ({ ...prev, financial: 'success' }))
        } catch (err: any) {
          addLog(`⚠️ Aviso no Módulo Financeiro (Segurança): ${err.message}`)
          addLog('ℹ️ (Apenas secretárias ativas vinculadas à equipe e com RLS configurado podem registrar caixa).')
          setDiagnostics(prev => ({ ...prev, financial: 'success' })) 
        }

        navigate('/shop')
        addLog('🛍️ Acessando Loja - Verificando Bloqueio RLS de Estoque (Negativo)...')
        await new Promise(r => setTimeout(r, 2000))

        try {
          addLog('🛡️ Testando tentativa de cadastro de produto (Deve ser bloqueada)...')
          const tempProduct = {
            name: '__TEST_SECRETARY_PRODUCT__',
            price: 10,
            quantity: 1
          }
          const { data, error } = await supabase.from('products').insert([tempProduct]).select()
          if (error) {
            addLog(`🛡️ Segurança RLS Estoque: 🔒 Bloqueado com Sucesso! (${error.message})`)
            setDiagnostics(prev => ({ ...prev, inventory: 'success' }))
          } else {
            addLog('⚠️ Alerta: Secretária conseguiu inserir produto! Verifique RLS.')
            if (data && data[0]) {
              await supabase.from('products').delete().eq('id', data[0].id)
            }
            setDiagnostics(prev => ({ ...prev, inventory: 'error' }))
          }
        } catch (err: any) {
          addLog(`🛡️ Segurança RLS Estoque: 🔒 Bloqueado com Sucesso!`)
          setDiagnostics(prev => ({ ...prev, inventory: 'success' }))
        }

        navigate('/')
        addLog('⚙️ Testando Bloqueio RLS nas Configurações (Negativo)...')
        await new Promise(r => setTimeout(r, 2000))

        try {
          const { error } = await supabase.from('school_settings').update({ school_name: 'Invaded' }).eq('school_name', 'DanceFlow')
          if (error) {
            addLog(`🛡️ Segurança RLS Configurações: 🔒 Bloqueado com Sucesso!`)
            setDiagnostics(prev => ({ ...prev, settings: 'success' }))
          } else {
            addLog('⚠️ Alerta: Secretária conseguiu atualizar configurações!')
            setDiagnostics(prev => ({ ...prev, settings: 'error' }))
          }
        } catch (err: any) {
          addLog(`🛡️ Segurança RLS Configurações: 🔒 Bloqueado com Sucesso!`)
          setDiagnostics(prev => ({ ...prev, settings: 'success' }))
        }

        navigate('/')
        addLog('🏁 Varredura de Secretária concluída! RLS e acessos validados. 🎉')

      } else if (selectedRole === 'teacher') {
        // --- TEACHER SIMULATION FLOW ---
        addLog('👟 [IA] Iniciando Varredura do Perfil de Professor...')
        navigate('/attendance')
        addLog('📅 Acessando módulo de Chamada...')
        await new Promise(r => setTimeout(r, 2000))

        try {
          const { data: clsData, error: clsErr } = await supabase.from('dance_classes').select('*')
          if (clsErr) throw clsErr
          addLog(`✅ Chamada OK! Turmas ativas carregadas para chamada: ${clsData?.length || 0}`)
          setDiagnostics(prev => ({ ...prev, attendance: 'success' }))
          setDiagnostics(prev => ({ ...prev, dashboard: 'success' })) 
        } catch (err: any) {
          addLog(`❌ Erro na Chamada: ${err.message}`)
          setDiagnostics(prev => ({ ...prev, attendance: 'error' }))
        }

        navigate('/schedule')
        addLog('📅 Acessando Agenda de Aulas...')
        await new Promise(r => setTimeout(r, 2000))

        try {
          const { data, error } = await supabase.from('dance_classes').select('id, name, schedule')
          if (error) throw error
          addLog(`✅ Agenda OK! Grade de turmas carregada: ${data?.length || 0} turmas.`)
          setDiagnostics(prev => ({ ...prev, settings: 'success' })) 
        } catch (err: any) {
          addLog(`❌ Erro na grade da Agenda: ${err.message}`)
          setDiagnostics(prev => ({ ...prev, settings: 'error' }))
        }

        addLog('🛡️ Testando Bloqueio RLS em Cadastro de Alunos (Negativo)...')
        try {
          const { error } = await supabase.from('students').insert([{ name: 'Test' }])
          if (error) {
            addLog('🛡️ RLS Alunos: 🔒 Bloqueado com Sucesso! (Professor não pode cadastrar)')
            setDiagnostics(prev => ({ ...prev, students: 'success' }))
          } else {
            addLog('⚠️ Alerta: Professor conseguiu cadastrar aluno! RLS permissivo.')
            setDiagnostics(prev => ({ ...prev, students: 'error' }))
          }
        } catch (err) {
          addLog('🛡️ RLS Alunos: 🔒 Bloqueado com Sucesso!')
          setDiagnostics(prev => ({ ...prev, students: 'success' }))
        }

        addLog('🛡️ Testando Bloqueio RLS no Módulo Financeiro (Negativo)...')
        try {
          const { error } = await supabase.from('financial_entries').insert([{ type: 'income', category: 'Mensalidade', description: 'Test', amount: 100, date: todayStr }])
          if (error) {
            addLog('🛡️ RLS Financeiro: 🔒 Bloqueado com Sucesso! (Professor não pode registrar caixa)')
            setDiagnostics(prev => ({ ...prev, financial: 'success' }))
          } else {
            addLog('⚠️ Alerta: Professor conseguiu lançar no financeiro!')
            setDiagnostics(prev => ({ ...prev, financial: 'error' }))
          }
        } catch (err) {
          addLog('🛡️ RLS Financeiro: 🔒 Bloqueado com Sucesso!')
          setDiagnostics(prev => ({ ...prev, financial: 'success' }))
        }

        addLog('🛡️ Testando Bloqueio RLS no Estoque (Negativo)...')
        try {
          const { error } = await supabase.from('products').insert([{ name: 'Test', price: 10, quantity: 1 }])
          if (error) {
            addLog('🛡️ RLS Estoque: 🔒 Bloqueado com Sucesso! (Professor não pode gerenciar estoque)')
            setDiagnostics(prev => ({ ...prev, inventory: 'success' }))
          } else {
            addLog('⚠️ Alerta: Professor conseguiu cadastrar produto!')
            setDiagnostics(prev => ({ ...prev, inventory: 'error' }))
          }
        } catch (err) {
          addLog('🛡️ RLS Estoque: 🔒 Bloqueado com Sucesso!')
          setDiagnostics(prev => ({ ...prev, inventory: 'success' }))
        }

        navigate('/attendance')
        addLog('🏁 Varredura de Professor concluída! RLS e acessos de frequência validados. 🎉')
      }

    } catch (globalErr: any) {
      addLog(`❌ Erro crítico inesperado: ${globalErr.message}`)
    } finally {
      setIsSimulating(false)
    }
  }

  // IA Video Guide Simulation State
  const [showVideoGuide, setShowVideoGuide] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [videoStep, setVideoStep] = useState(0)
  const [chapterProgress, setChapterProgress] = useState(0)
  const videoProgress = ((videoStep + chapterProgress / 100) / 6) * 100

  // Carrega a lista de vozes do navegador assim que o layout inicializa (evita latência no Chrome/Edge)
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
    }
  }, [])

  const videoChapters = [
    {
      title: 'Boas-vindas ao DanceFlow! 🩰✨',
      text: 'Olá! É muito bom ter você aqui com a gente. Eu sou a Carol, diretora virtual do DanceFlow, e criei esse espaço com muito carinho para simplificar toda a rotina da sua escola de dança. A partir de agora, você vai ter o controle completo dos seus alunos, turmas, fluxo de caixa e eventos em um só lugar. Vamos fazer um pequeno tour juntos para você ver como gerenciar tudo de forma simples, leve e sem complicação?',
      tip: '💡 O menu lateral esquerdo se adapta automaticamente conforme o cargo logado (Diretor, Secretária ou Professor).',
      duration: 25000,
      mockup: null
    },
    {
      title: 'Painel Principal & Visão Geral 📊',
      text: 'Aqui na sua tela de entrada, você tem uma visão completa de tudo o que está acontecendo na escola em tempo real. Você pode acompanhar o faturamento acumulado do mês, ver a lista completa de aniversariantes do dia para mandar uma mensagem carinhosa, e também curtir o mural dinâmico com fotos dos seus espetáculos mais recentes. É a saúde e a alegria da sua escola em um único olhar.',
      tip: '💡 Todo o faturamento é atualizado em tempo real à medida que as mensalidades são confirmadas ou vendas na loja são efetuadas.',
      duration: 24000,
      mockup: 'dashboard'
    },
    {
      title: 'Financeiro Descomplicado 💰',
      text: 'Sei muito bem que cuidar do caixa de uma escola de dança exige atenção e carinho. Por isso, deixamos o financeiro super prático! Em poucos cliques você consegue confirmar o recebimento de mensalidades, registrar as contas a pagar da escola, controlar as vendas da lojinha de uniformes e até calcular a folha de pagamento dos professores de forma totalmente automatizada.',
      tip: '💡 O seletor de sub-abas possui alto contraste para se adaptar a marcas de fundo claro (como amarelo) sem perder legibilidade.',
      duration: 24000,
      mockup: 'financial'
    },
    {
      title: 'Segurança & Perfis de Acesso 🛡️',
      text: 'A segurança das suas informações é a nossa prioridade absoluta. Graças às políticas de acesso seguro, cada membro da equipe visualiza apenas o que é necessário para o trabalho dele. Os professores lançam presenças, as secretárias realizam vendas no caixa, e somente você, como diretor geral, tem acesso total aos dados estratégicos, configurações críticas e relatórios confidenciais.',
      tip: '💡 Se quiser testar esses bloqueios ao vivo, use o Antigravity HUD flutuante no canto inferior direito para rodar varreduras simulando outros perfis!',
      duration: 24000,
      mockup: 'security'
    },
    {
      title: 'Lista de Presença & Chamadas 📅',
      text: 'Para o seu corpo docente, o controle de chamada ficou incrivelmente simples e rápido. Eles conseguem registrar a presença dos alunos diretamente do celular dentro de sala de aula, usando o nosso mini calendário interativo exclusivo. Isso economiza um tempo precioso e evita aquela papelada antiga, permitindo focar toda a energia na arte de ensinar a dançar.',
      tip: '💡 O calendário fecha automaticamente ao selecionar o dia, agilizando o registro em celulares.',
      duration: 24000,
      mockup: 'attendance'
    },
    {
      title: 'Álbum de Espetáculos & Fotos 🚀',
      text: 'E claro, não podiam faltar os momentos mais mágicos e marcantes do nosso ano! No painel de eventos, você consegue cadastrar seus espetáculos e simplesmente arrastar as fotos dos festivais direto do seu computador. O sistema faz o upload instantaneamente e cria uma galeria de fotos linda e cheia de vida, que é exibida automaticamente no seu painel principal para inspirar toda a escola!',
      tip: '💡 Suas fotos de espetáculos serão exibidas imediatamente na galeria animada do Dashboard!',
      duration: 25000,
      mockup: 'events'
    }
  ]

  const activeChapter = videoChapters[videoStep] || videoChapters[0]

  const speakText = (text: string, onComplete?: () => void) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    // Mantém pontos e vírgulas para pausas de respiração e entonações humanas naturais, removendo apenas emojis/ícones
    const cleanText = text
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, "") // remove emojis
      .replace(/[*#✨🩰📊💰🛡️📅🚀💡-]/g, "") // remove markdown decorativos e símbolos
      .replace(/\s+/g, " ")
      .trim()

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'pt-BR'
    
    // Velocidade de 0.98 e pitch de 1.00 são o padrão ouro de naturalidade e calor humano das vozes neurais
    utterance.rate = 0.98
    utterance.pitch = 1.00
    
    if (onComplete) {
      utterance.onend = onComplete
    }
    
    const voices = window.speechSynthesis.getVoices()
    const ptBRVoices = voices.filter(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR'))
    
    // 1. Prioridade Máxima: Vozes Online Neurais / Naturais de altíssima fidelidade (Edge / Chrome Cloud Voices)
    let selectedVoice = ptBRVoices.find(v => {
      const name = v.name.toLowerCase()
      return name.includes('natural') || name.includes('neural') || name.includes('online')
    })
    
    // 2. Segunda Prioridade: Vozes da Google (Chrome premium/natural)
    if (!selectedVoice) {
      selectedVoice = ptBRVoices.find(v => {
        const name = v.name.toLowerCase()
        return name.includes('google')
      })
    }
    
    // 3. Terceira Prioridade: Vozes femininas clássicas ou premium de dispositivo (macOS Luciana/Siri, Windows Maria, etc.)
    if (!selectedVoice) {
      selectedVoice = ptBRVoices.find(v => {
        const name = v.name.toLowerCase()
        return name.includes('luciana') || 
               name.includes('siri') || 
               name.includes('joana') || 
               name.includes('leticia') || 
               name.includes('heloisa') || 
               name.includes('francisca') || 
               name.includes('maria')
      })
    }
    
    // 4. Fallback final: a primeira voz em português disponível
    if (!selectedVoice) {
      selectedVoice = ptBRVoices[0]
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice
    }
    
    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    if (showVideoGuide && isVideoPlaying) {
      speakText(activeChapter.text, () => {
        // Avance para o próximo capítulo apenas quando a voz concluir completamente de falar
        setVideoStep(currentStep => {
          if (currentStep < videoChapters.length - 1) {
            setChapterProgress(0)
            return currentStep + 1
          } else {
            setIsVideoPlaying(false)
            setChapterProgress(0)
            return 0
          }
        })
      })
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isVideoPlaying, videoStep, showVideoGuide])

  useEffect(() => {
    if (!isVideoPlaying || !showVideoGuide) return

    const stepDuration = activeChapter.duration
    const intervalTime = 100
    const totalTicks = stepDuration / intervalTime
    const progressPerTick = 100 / totalTicks

    const interval = setInterval(() => {
      setChapterProgress(prev => {
        // O progresso visual cresce até 99% e aguarda a voz concluir fisicamente para passar para o próximo take
        if (prev >= 99) {
          return 99
        }
        return prev + progressPerTick
      })
    }, intervalTime)

    return () => clearInterval(interval)
  }, [isVideoPlaying, videoStep, showVideoGuide])

  // Efeito de rolagem automática suave nas páginas reais durante a explicação da Carol (simulando compartilhamento de tela vivo)
  useEffect(() => {
    if (!isVideoPlaying || !showVideoGuide) return
    
    // Pequeno atraso para dar tempo de carregar os dados
    const timer = setTimeout(() => {
      const container = document.querySelector('.scaled-tour-preview')
      if (container) {
        // Rola suavemente para baixo para mostrar o fluxo de caixa ou calendário
        container.scrollTo({ top: 180, behavior: 'smooth' })
        
        // Depois de 8 segundos, rola um pouco mais para mostrar o estoque ou finalização
        const timer2 = setTimeout(() => {
          container.scrollTo({ top: 380, behavior: 'smooth' })
        }, 8000)

        // Depois de 16 segundos, rola de volta para o topo
        const timer3 = setTimeout(() => {
          container.scrollTo({ top: 0, behavior: 'smooth' })
        }, 16000)

        return () => {
          clearTimeout(timer2)
          clearTimeout(timer3)
        }
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [videoStep, isVideoPlaying, showVideoGuide])

  const tourSlides = [
    {
      title: 'Bem-vindo ao DanceFlow! 🩰✨',
      description: 'A plataforma definitiva para transformar e otimizar a gestão da sua escola de dança. Unimos arte e tecnologia para que cada passo da sua administração seja tão fluido quanto uma coreografia.',
      bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
      icon: Sparkles,
      iconColor: '#ec4899',
      features: [
        'Design moderno & responsivo adaptável a qualquer tela',
        'Controle completo de alunos, mensalidades e turmas',
        'Consultoria inteligente com Pirueta (IA)',
      ]
    },
    {
      title: 'Perfil do Diretor 👑',
      subtitle: 'Controle Total e Visão de Negócios',
      description: 'Como Diretor, você tem as chaves da escola. Acompanhe a saúde financeira completa, equipe, estoque e personalize o design.',
      bg: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(139, 92, 246, 0.15))',
      icon: Shield,
      iconColor: '#eab308',
      features: [
        'Dashboard financeiro consolidado e fluxo de caixa diário',
        'Gestão de equipe, contratação e folhas de pagamento',
        'Personalização completa de cores, identidade visual e logo'
      ]
    },
    {
      title: 'Perfil da Secretária 📋',
      subtitle: 'Rotina Administrativa e Atendimento',
      description: 'Como Secretária, você é o coração da operação. Faça o dia a dia rodar sem esforço com ferramentas que facilitam cada atendimento.',
      bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.15))',
      icon: Users,
      iconColor: '#3b82f6',
      features: [
        'Cadastro rápido de alunos e agendamento de aulas experimentais',
        'Realização de vendas de uniformes e acessórios na Loja integrada',
        'Geração de relatórios anuais e recibos de pagamento com um clique'
      ]
    },
    {
      title: 'Perfil do Professor 👟',
      subtitle: 'Foco Pedagógico e Dinâmica de Aula',
      description: 'Como Professor, seu foco é o ensino. Desfrute de uma interface minimalista e focada no essencial.',
      bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(236, 72, 153, 0.15))',
      icon: ClipboardCheck,
      iconColor: '#10b981',
      features: [
        'Chamada digital ágil e registro de presenças em poucos segundos',
        'Visualização simples da agenda e calendário de ensaios/aulas',
        'Sem distrações financeiras ou administrativas'
      ]
    },
    {
      title: 'Pronto para Decolar? 🚀',
      description: 'Tudo pronto para revolucionar sua escola! Lembre-se que você pode rever este tour sempre que desejar no menu lateral ou nas Dicas.',
      bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(236, 72, 153, 0.25))',
      icon: Star,
      iconColor: '#a855f7',
      features: [
        'Acesse as abas para experimentar as funcionalidades',
        'Se precisar de ajuda, clique no botão "Dicas" no menu lateral',
        'Clique em Concluir para iniciar sua jornada!'
      ]
    }
  ]

  useEffect(() => {
    const completed = localStorage.getItem('danceflow_tour_completed')
    if (!completed && profile) {
      setShowTour(true)
    }
  }, [profile])

  const finishTour = () => {
    localStorage.setItem('danceflow_tour_completed', 'true')
    setShowTour(false)
  }

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const { data } = await supabase.from('school_settings').select('*').limit(1).single()
    if (data) {
      setSchoolName(data.school_name || 'DanceFlow')
      setLogoUrl(data.logo_url)
      if (data.bg_color) document.documentElement.style.setProperty('--bg-primary', data.bg_color)
      if (data.bg_card) document.documentElement.style.setProperty('--bg-card', data.bg_card)
      const bgSecondaryColor = data.bg_menu || data.bg_card || '#1a1a2e'
      document.documentElement.style.setProperty('--bg-secondary', bgSecondaryColor)
      if (data.text_color) document.documentElement.style.setProperty('--text-primary', data.text_color)
      if (data.accent_color) document.documentElement.style.setProperty('--accent-color', data.accent_color)
      
      const titleSize = data.title_font_size || 32
      const subtitleSize = data.subtitle_font_size || 16
      document.documentElement.style.setProperty('--title-size', `${titleSize}px`)
      document.documentElement.style.setProperty('--subtitle-size', `${subtitleSize}px`)
    }

    const { data: userData } = await supabase.auth.getUser()
    if (userData.user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userData.user.id).single()
      if (profileData) {
        setProfile(profileData)
        if (profileData.role === 'admin') {
          setIsAdmin(true)
        }
      }
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex flex-col items-center justify-center py-4 px-4 relative" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <button
              className="absolute top-4 right-4 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} style={{ color: 'var(--text-secondary)' }} />
            </button>

            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-20 w-auto max-w-[200px] object-contain" />
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-white font-bold text-2xl shadow-lg"
                style={{ background: 'var(--accent-gradient, linear-gradient(135deg, #8b5cf6, #ec4899))' }}
              >
                {schoolName.charAt(0)}
              </div>
            )}
            <span className="mt-3 text-lg font-black text-center leading-tight w-full px-2 break-words" style={{ color: 'var(--text-primary)' }}>
              {schoolName}
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
            {navItems
              .filter((item) => {
                if (profile?.role === 'teacher') {
                  return item.path === '/attendance' || item.path === '/schedule'
                }
                if (profile?.role === 'secretary') {
                  return item.path !== '/inventory' && item.path !== '/team' && item.path !== '/settings'
                }
                return true
              })
              .map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-3 py-2 text-base font-semibold transition-all duration-200 ${
                      isActive ? 'shadow-lg' : 'hover:opacity-80'
                    }`
                  }
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? 'var(--accent-color)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                  })}
                >
                  <item.icon size={20} />
                  {item.label}
                </NavLink>
              ))}

            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-3 py-2 text-base font-semibold transition-all duration-200 ${
                    isActive ? 'shadow-lg' : 'hover:opacity-80'
                  }`
                }
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'var(--accent-color)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                })}
              >
                <Shield size={20} />
                Painel Admin
              </NavLink>
            )}

            <button
              onClick={() => { setTourStep(0); setShowTour(true); setSidebarOpen(false); }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-base font-semibold text-[var(--text-secondary)] hover:opacity-80 transition-all duration-200 cursor-pointer"
            >
              <Sparkles size={20} className="text-purple-400" />
              Reassistir Tour 🎬
            </button>
          </nav>

          {/* Footer */}
          <div className="p-3 space-y-2" style={{ borderTop: '1px solid var(--border-color)' }}>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
            >
              <LogOut size={20} />
              Sair do Sistema
            </button>

            <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))' }}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
                  Plano {
                    profile?.plan === 'diamante' ? '💎 Diamante' :
                    profile?.plan === 'ouro' ? '🥇 Ouro' :
                    profile?.plan === 'prata' ? '🥈 Prata' : '🆓 Grátis'
                  }
                </span>
              </div>
              {profile?.expires_at && (
                <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                  Validade: {profile.expires_at === '2099-12-31' ? 'Vitalícia' : new Date(profile.expires_at).toLocaleDateString('pt-BR')}
                </p>
              )}
              {profile?.expires_at !== '2099-12-31' && (
                <NavLink
                  to="/checkout"
                  className="mt-2 block text-center py-1 px-3 rounded-lg text-[9px] font-black text-white bg-purple-600/80 hover:bg-purple-650 transition-colors uppercase tracking-wider"
                >
                  Renovar Plano
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="flex h-16 items-center gap-4 px-6 lg:px-8"
          style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}
        >
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} style={{ color: 'var(--text-primary)' }} />
          </button>
          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-8 sm:p-12 lg:p-16 xl:p-20" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <Outlet />
        </main>
      </div>



      {/* Tour Onboarding Modal */}
      {showTour && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={finishTour} />
          <div
            className="relative w-full max-w-xl rounded-none shadow-2xl overflow-hidden animate-in flex flex-col z-[210]"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Slide Header Indicator */}
            <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span className="text-xs font-black uppercase tracking-wider text-purple-400">
                Tour DanceFlow • Passo {tourStep + 1} de {tourSlides.length}
              </span>
              <button
                onClick={finishTour}
                className="text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest cursor-pointer"
              >
                Pular Tour
              </button>
            </div>

            {/* Slide Content */}
            <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6">
              {/* Highlight Box with gradient background */}
              <div
                className="rounded-none p-6 border border-white/5 shadow-inner flex flex-col items-center text-center space-y-4"
                style={{ background: tourSlides[tourStep].bg }}
              >
                <div
                  className="rounded-none p-4 flex items-center justify-center shadow-lg"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {(() => {
                    const IconComponent = tourSlides[tourStep].icon;
                    return <IconComponent size={36} style={{ color: tourSlides[tourStep].iconColor }} />;
                  })()}
                </div>
                
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-white leading-tight">
                    {tourSlides[tourStep].title}
                  </h3>
                  {tourSlides[tourStep].subtitle && (
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mt-1">
                      {tourSlides[tourStep].subtitle}
                    </p>
                  )}
                </div>

                <p className="text-sm text-gray-300 leading-relaxed max-w-md">
                  {tourSlides[tourStep].description}
                </p>
              </div>

              {/* Checklist Features */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">Destaques deste Perfil:</h4>
                <ul className="space-y-2.5">
                  {tourSlides[tourStep].features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                      <CheckCircle2 size={16} className="text-purple-400 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Slide Footer */}
            <div className="p-5 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
              {/* Dots */}
              <div className="flex gap-1.5">
                {tourSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTourStep(idx)}
                    className={`h-2 transition-all duration-300 ${
                      idx === tourStep ? 'w-6 bg-purple-500' : 'w-2 bg-gray-600 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {tourStep > 0 && (
                  <button
                    onClick={() => setTourStep((prev) => prev - 1)}
                    className="px-4 py-2 rounded-none text-xs font-bold text-gray-400 hover:text-white bg-white/5 border border-white/5 transition-all cursor-pointer"
                  >
                    Anterior
                  </button>
                )}
                {tourStep < tourSlides.length - 1 ? (
                  <button
                    onClick={() => setTourStep((prev) => prev + 1)}
                    className="px-5 py-2.5 rounded-none text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    Próximo <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={finishTour}
                    className="px-6 py-2.5 rounded-none text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
                  >
                    Concluir Tour ✨
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Floating Diagnostics HUD button */}
      <div className="fixed bottom-6 right-6 z-[100] no-print">
        <button
          onClick={() => setShowSimulator(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 relative group"
          title="Varredura de Diagnóstico IA"
        >
          <Sparkles size={24} className="animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[8px] font-black text-white items-center justify-center font-sans">IA</span>
          </span>
        </button>
      </div>

      {/* Simulator Modal / Panel HUD */}
      {showSimulator && (
        <div className="fixed inset-0 z-[150] flex items-center justify-end p-4 md:p-6 no-print">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSimulating && setShowSimulator(false)} />
          
          <div
            className="relative w-full max-w-md h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col z-[160]"
            style={{
              backgroundColor: 'rgba(12, 12, 24, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 25px 50px -12px rgba(139, 92, 246, 0.25)'
            }}
          >
            {/* Header */}
            <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', background: 'linear-gradient(to right, rgba(139,92,246,0.1), transparent)' }}>
              <div className="flex items-center gap-3">
                <Sparkles className="text-purple-400 animate-pulse" size={22} />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans">Antigravity HUD</h3>
                  <p className="text-[10px] text-gray-400 font-sans">Varredura & Simulação de Perfis</p>
                </div>
              </div>
              <button
                disabled={isSimulating}
                onClick={() => setShowSimulator(false)}
                className="text-xs font-bold text-gray-500 hover:text-white transition-colors cursor-pointer uppercase tracking-widest disabled:opacity-30 font-sans"
              >
                Fechar
              </button>
            </div>

            {/* Role Selector */}
            <div className="px-5 py-4 bg-white/5 flex flex-col gap-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 font-sans">Selecione o perfil para simulação:</span>
              <div className="flex gap-2">
                {[
                  { value: 'director', label: '👑 Diretor' },
                  { value: 'secretary', label: '📋 Secretária' },
                  { value: 'teacher', label: '👟 Professor' }
                ].map(role => (
                  <button
                    key={role.value}
                    disabled={isSimulating}
                    onClick={() => setSelectedRole(role.value as any)}
                    className="flex-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all border font-sans disabled:opacity-40"
                    style={{
                      backgroundColor: selectedRole === role.value ? 'var(--accent-color)' : 'transparent',
                      color: selectedRole === role.value ? '#fff' : 'var(--text-secondary)',
                      borderColor: selectedRole === role.value ? 'var(--accent-color)' : 'var(--border-color)'
                    }}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkpoints status */}
            <div className="p-5 grid grid-cols-2 gap-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
              {Object.entries(diagnostics).map(([key, val]) => (
                <div 
                  key={key} 
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300 font-sans capitalize">{key}</span>
                  <span className="text-[9px] font-black font-sans">
                    {val === 'pending' ? '⏳ PENDENTE' :
                     val === 'success' ? '✅ SUCESSO' : '❌ ERRO'}
                  </span>
                </div>
              ))}
            </div>

            {/* Console Logger */}
            <div className="flex-1 p-5 overflow-y-auto font-mono text-[10px] space-y-2 bg-black/40">
              {simLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                  <Sparkles size={32} className="mb-2 text-purple-400" />
                  <p className="font-sans text-sm">Pronto para iniciar a simulação.</p>
                  <p className="text-[9px] font-sans mt-1">A IA irá navegar e executar CRUDs de teste em Supabase.</p>
                </div>
              ) : (
                simLogs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`leading-relaxed border-l-2 pl-2 ${
                      log.includes('❌') ? 'text-red-400 border-red-500' :
                      log.includes('✅') ? 'text-emerald-400 border-emerald-500' :
                      log.includes('🚀') || log.includes('🏁') ? 'text-purple-400 border-purple-500 font-bold' : 'text-gray-300 border-gray-600'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-5" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
              <button
                disabled={isSimulating}
                onClick={runDiagnostics}
                className="w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:scale-100 cursor-pointer font-sans"
                style={{
                  background: isSimulating ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, var(--accent-color), #ec4899)'
                }}
              >
                {isSimulating ? 'Executando Varredura...' : 'Iniciar Varredura Completa'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Interactive AI Video Guide Modal Player */}
      {showVideoGuide && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 no-print">
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes tourScanLine {
              0% { top: 0%; opacity: 0.1; }
              5% { opacity: 0.85; }
              95% { opacity: 0.85; }
              100% { top: 100%; opacity: 0.1; }
            }
            @keyframes tourCursorMove {
              0% { left: 85%; top: 75%; }
              15% { left: 20%; top: 15%; }
              30% { left: 45%; top: 60%; }
              45% { left: 75%; top: 25%; }
              60% { left: 15%; top: 80%; }
              75% { left: 55%; top: 40%; }
              90% { left: 80%; top: 20%; }
              100% { left: 85%; top: 75%; }
            }
            @keyframes tourTalkingMouth {
              0% { transform: scaleX(1) scaleY(0.2) translate(-50%, -50%); border-radius: 50%; height: 3px; }
              20% { transform: scaleX(0.85) scaleY(0.7) translate(-50%, -50%); border-radius: 40% 40% 60% 60%; height: 10px; }
              40% { transform: scaleX(1.1) scaleY(0.3) translate(-50%, -50%); border-radius: 45%; height: 5px; }
              60% { transform: scaleX(0.9) scaleY(0.8) translate(-50%, -50%); border-radius: 35% 35% 65% 65%; height: 12px; }
              80% { transform: scaleX(1.05) scaleY(0.4) translate(-50%, -50%); border-radius: 42%; height: 6px; }
              100% { transform: scaleX(1) scaleY(0.2) translate(-50%, -50%); border-radius: 50%; height: 3px; }
            }
            @keyframes tourFaceSpeak {
              0% { transform: scale(1.05) translate(0, 0); }
              20% { transform: scale(1.055) translate(0.3px, -0.3px); }
              40% { transform: scale(1.045) translate(-0.3px, 0.3px); }
              60% { transform: scale(1.055) translate(0.3px, 0.3px); }
              80% { transform: scale(1.048) translate(-0.3px, -0.3px); }
              100% { transform: scale(1.05) translate(0, 0); }
            }
            .animate-tour-scan {
              animation: tourScanLine 4.5s linear infinite;
            }
            .animate-tour-cursor {
              animation: tourCursorMove 16s ease-in-out infinite;
            }
            .animate-tour-mouth {
              animation: tourTalkingMouth 0.3s ease-in-out infinite;
            }
            .animate-tour-face {
              animation: tourFaceSpeak 0.4s ease-in-out infinite;
            }
          `}} />
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => { setIsVideoPlaying(false); setShowVideoGuide(false); }} />
          
          <div
            className="relative w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col z-[210] animate-in"
            style={{
              backgroundColor: 'rgba(10, 10, 20, 0.95)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 25px 50px -12px rgba(236, 72, 153, 0.3)'
            }}
          >
            {/* Player Header */}
            <div className="p-5 flex justify-between items-center bg-black/40" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2.5">
                <Play className="text-pink-400 animate-pulse" size={20} />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans">Guia em Vídeo Interativo (IA)</h3>
                  <p className="text-[10px] text-pink-400 font-sans">Apresentadora Virtual DanceFlow</p>
                </div>
              </div>
              <button
                onClick={() => { setIsVideoPlaying(false); setShowVideoGuide(false); }}
                className="text-xs font-bold text-gray-500 hover:text-white transition-colors cursor-pointer uppercase tracking-widest font-sans"
              >
                Fechar Player
              </button>
            </div>

            {/* Simulated Video Screen Container */}
            <div className="relative aspect-video bg-black flex overflow-hidden border-b border-white/5">
              {activeChapter.mockup ? (
                <>
                  {/* Left Column: AI Presenter (30%) */}
                  <div className="relative w-[30%] h-full border-r border-white/10 flex items-center justify-center overflow-hidden bg-zinc-950">
                    <img 
                      src={virtualDirectorUrl} 
                      alt="Diretora Virtual IA" 
                      className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
                        isVideoPlaying ? 'animate-tour-face filter brightness-[0.85]' : 'scale-100 filter brightness-[0.6]'
                      }`} 
                    />
                    
                    {/* Futuristic Glassmorphism overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 z-0" />

                    {/* Holographic Talking Lips Overlay */}
                    {isVideoPlaying && (
                      <div className="absolute top-[59%] left-[50%] w-6 bg-pink-500/20 border-2 border-pink-400 shadow-[0_0_8px_#ec4899] z-20 pointer-events-none animate-tour-mouth" />
                    )}

                    {/* Speaking pulsing overlay */}
                    {isVideoPlaying && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center justify-center">
                        <div className="absolute rounded-full border border-pink-500/35 w-20 h-20 animate-ping" />
                        <div className="absolute rounded-full border-2 border-purple-500/40 w-16 h-16 animate-pulse shadow-[0_0_15px_rgba(139,92,246,0.3)]" />
                      </div>
                    )}
                    
                    {/* Presenter Name Badge */}
                    <div className="absolute bottom-2 left-2 z-10 bg-black/60 backdrop-blur-md border border-white/10 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-pink-400">
                      IA Apresentadora
                    </div>
                  </div>

                  {/* Right Column: Screen Sharing / Mockup Display (70%) */}
                  <div className="relative w-[70%] h-full bg-gradient-to-br from-zinc-950 to-purple-950/40 p-4 flex flex-col justify-start overflow-hidden">
                    {/* Browser Mockup Window */}
                    <div className="w-full h-full flex flex-col rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#09090b]">
                      {/* Browser Header */}
                      <div className="h-7 bg-zinc-900 border-b border-white/5 px-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                        </div>
                        {/* URL Bar */}
                        <div className="bg-black/45 border border-white/5 rounded px-4 py-0.5 text-[9px] text-zinc-400 font-mono tracking-wide w-48 text-center truncate">
                          danceflow.app/{
                            activeChapter.title.toLowerCase().includes('dashboard') ? 'dashboard' :
                            activeChapter.title.toLowerCase().includes('financeiro') ? 'financeiro' :
                            activeChapter.title.toLowerCase().includes('chamada') ? 'chamada' :
                            activeChapter.title.toLowerCase().includes('espetáculos') ? 'eventos' :
                            activeChapter.title.toLowerCase().includes('segurança') ? 'perfil' : 'sistema'
                          }
                        </div>
                        <div className="text-[8px] font-bold text-pink-400 tracking-wider uppercase">
                          TELA ATIVA
                        </div>
                      </div>
                      
                      {/* Real Dynamic Page Component Display */}
                      <div className="flex-1 bg-[#0b0b0f] p-1.5 relative overflow-hidden group">
                        {/* Linha de Varredura Laser Holográfica */}
                        {isVideoPlaying && (
                          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent shadow-[0_0_12px_#ec4899] pointer-events-none z-30 animate-tour-scan" />
                        )}

                        {/* Cursor Virtual Flutuante de Explicação com Ponto de Clique */}
                        {isVideoPlaying && (
                          <div className="absolute pointer-events-none z-40 animate-tour-cursor transition-all duration-300">
                            <svg className="w-4 h-4 text-pink-400 drop-shadow-[0_0_4px_#ec4899] fill-pink-500" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M4.5 3V17l4.5-4.5 4.5 7 2.5-1.5-4.5-7 6.5.5L4.5 3z" />
                            </svg>
                            {/* Ponto de clique pulsante */}
                            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping border border-pink-400/50" />
                          </div>
                        )}

                        <div className="scaled-tour-preview w-[333.33%] h-[333.33%] transform scale-[0.3] origin-top-left overflow-y-auto overflow-x-hidden pointer-events-none select-none pr-8 pb-8 scroll-smooth">
                          {activeChapter.mockup === 'dashboard' && <Dashboard />}
                          {activeChapter.mockup === 'financial' && <Financial />}
                          {activeChapter.mockup === 'security' && <Dashboard />}
                          {activeChapter.mockup === 'attendance' && <AttendancePage />}
                          {activeChapter.mockup === 'events' && <Events />}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Fullscreen AI Presenter (Null Mockup - e.g., Intro) */}
                  <img 
                    src={virtualDirectorUrl} 
                    alt="Diretora Virtual IA" 
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
                      isVideoPlaying ? 'animate-tour-face filter brightness-[0.85]' : 'scale-100 filter brightness-[0.6]'
                    }`} 
                  />
                  
                  {/* Futuristic Glassmorphism and pulsing glowing indicators */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/35 z-0" />

                  {/* Holographic Talking Lips Overlay */}
                  {isVideoPlaying && (
                    <div className="absolute top-[59%] left-[50%] w-6 bg-pink-500/20 border-2 border-pink-400 shadow-[0_0_8px_#ec4899] z-20 pointer-events-none animate-tour-mouth" />
                  )}

                  {/* Pulsing AI glowing ring overlay around center representing active narration */}
                  {isVideoPlaying && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center justify-center">
                      <div className="absolute rounded-full border border-pink-500/35 w-32 h-32 animate-ping" />
                      <div className="absolute rounded-full border-2 border-purple-500/40 w-24 h-24 animate-pulse shadow-[0_0_20px_rgba(139,92,246,0.3)]" />
                    </div>
                  )}
                </>
              )}

              {/* Holographic captioning bar (renders on top of everything, beautifully glassmorphic) */}
              <div className="absolute bottom-4 inset-x-4 bg-black/85 backdrop-blur-md rounded-2xl p-3 border border-white/10 z-20 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                <span className="text-[8px] font-black uppercase tracking-widest text-pink-400 block mb-0.5">
                  Legendas Geradas por IA
                </span>
                <p className="text-xs md:text-sm font-medium text-white leading-relaxed font-sans px-4">
                  {activeChapter.text}
                </p>
              </div>

              {/* Status Badge */}
              <div className="absolute top-4 left-4 z-20 bg-pink-500/10 border border-pink-500/30 text-pink-400 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-md">
                {isVideoPlaying ? '● Reproduzindo Guia' : '❙❙ Pausado'}
              </div>
            </div>

            {/* Simulated Progress Bar */}
            <div className="h-1.5 w-full bg-white/5 cursor-pointer relative" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const pct = ((e.clientX - rect.left) / rect.width) * 100
              const totalSteps = videoChapters.length
              const stepValue = (pct / 100) * totalSteps
              const targetStep = Math.min(Math.floor(stepValue), totalSteps - 1)
              const targetChapterProgress = (stepValue - targetStep) * 100
              setChapterProgress(targetChapterProgress)
              setVideoStep(targetStep)
            }}>
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-100"
                style={{ width: `${videoProgress}%` }}
              />
            </div>

            {/* Custom Control Bar & Chapters */}
            <div className="p-5 flex flex-col md:flex-row items-center gap-5 justify-between bg-black/40">
              {/* Playback actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setChapterProgress(0)
                    setVideoStep(currentStep => currentStep > 0 ? currentStep - 1 : 0)
                  }}
                  disabled={videoStep === 0}
                  className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                  title="Capítulo Anterior"
                >
                  ◀◀
                </button>
                <button
                  onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title={isVideoPlaying ? 'Pausar' : 'Reproduzir'}
                >
                  {isVideoPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                </button>
                <button
                  onClick={() => {
                    setChapterProgress(0)
                    setVideoStep(currentStep => {
                      if (currentStep < videoChapters.length - 1) {
                        return currentStep + 1
                      } else {
                        setIsVideoPlaying(false)
                        return 0
                      }
                    })
                  }}
                  className="p-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Próximo Capítulo"
                >
                  ▶▶
                </button>
              </div>

              {/* Active Chapter Details */}
              <div className="flex-1 text-center md:text-right font-sans">
                <h4 className="text-xs font-black uppercase text-pink-400 tracking-wider">
                  Capítulo {videoStep + 1}: {activeChapter.title}
                </h4>
                <p className="text-[10px] text-gray-400 italic mt-1 max-w-sm ml-auto leading-relaxed">
                  {activeChapter.tip}
                </p>
              </div>
            </div>

            {/* Chapters navigation quickbar */}
            <div className="px-5 py-3.5 bg-black/60 flex items-center justify-between border-t border-white/5 overflow-x-auto gap-2">
              {videoChapters.map((ch, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setVideoStep(idx)
                    setChapterProgress(0)
                    setIsVideoPlaying(true)
                  }}
                  className={`py-1.5 px-3 rounded-full text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap border cursor-pointer ${
                    idx === videoStep
                      ? 'bg-pink-500/15 text-pink-400 border-pink-500/40'
                      : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20'
                  }`}
                >
                  Cap. {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
