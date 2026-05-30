import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'
import { CheckCircle2, ArrowLeft, LogOut, Loader2, Sparkles, CreditCard, RefreshCw } from 'lucide-react'

export default function Checkout() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/auth')
        return
      }

      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (error) throw error
      setProfile(data)
    } catch (err: any) {
      console.error('Erro ao carregar perfil:', err.message)
      setErrorMsg('Não foi possível carregar as informações do seu perfil.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubscribe(plan: 'prata' | 'ouro' | 'diamante') {
    setProcessingPlan(plan)
    setErrorMsg(null)
    try {
      // Invoke Supabase Edge Function to create Mercado Pago checkout url
      const { data, error } = await supabase.functions.invoke('create-preference', {
        body: { plan, redirectOrigin: window.location.origin }
      })

      if (error) {
        console.error('Function error:', error)
        throw new Error(error.message || 'Falha ao gerar link de pagamento')
      }

      if (data?.checkoutUrl) {
        // Redirect user to Mercado Pago checkout
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('Link de pagamento não retornado pelo servidor.')
      }
    } catch (err: any) {
      console.error('Subscription error:', err)
      setErrorMsg(err.message || 'Ocorreu um erro ao conectar com o Mercado Pago. Tente novamente.')
      setProcessingPlan(null)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0f] text-white">
        <Loader2 className="h-12 w-12 text-purple-500 animate-spin mb-4" />
        <p className="text-gray-400 font-medium">Carregando seus dados...</p>
      </div>
    )
  }

  const isExpired = profile?.expires_at ? new Date(profile.expires_at) < new Date() : false
  const isBlocked = profile && (profile.status === 'pending' || profile.status === 'suspended' || isExpired)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative selection:bg-purple-500/30 overflow-x-hidden p-6 sm:p-12 flex flex-col justify-between">
      {/* Background Gradients */}
      <div className="fixed top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-purple-600/15 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-pink-600/15 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-5xl w-full mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg shadow-purple-500/30">
            <span className="text-white text-xl font-black">D</span>
          </div>
          <span className="text-2xl font-black tracking-tight">Dance<span className="text-purple-500">Flow</span></span>
        </div>
        
        <div className="flex items-center gap-3">
          {!isBlocked && (
            <button 
              onClick={() => navigate('/')} 
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all border border-white/5"
            >
              <ArrowLeft size={16} />
              Voltar ao Sistema
            </button>
          )}
          <button 
            onClick={handleSignOut} 
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-bold transition-all border border-rose-500/10"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl w-full mx-auto flex-1 flex flex-col justify-center items-center">
        
        {/* Info Banner */}
        <div className="text-center max-w-2xl mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold text-xs uppercase tracking-widest">
            <Sparkles size={14} className="animate-pulse" />
            Escolha seu Plano
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none">
            {isBlocked ? 'Ative sua Assinatura 🚀' : 'Gerencie seu Plano 💎'}
          </h1>
          
          <p className="text-gray-400 text-base sm:text-lg leading-relaxed">
            {isBlocked 
              ? 'Seu período de teste terminou ou sua conta está pendente. Escolha um plano abaixo para liberar acesso total instantaneamente via Mercado Pago (PIX ou Cartão).'
              : 'Veja as opções abaixo se deseja renovar ou fazer upgrade da sua assinatura atual. Seu acesso será estendido por 30 dias.'}
          </p>

          {profile?.expires_at && (
            <p className="text-sm font-bold text-gray-500">
              Sua assinatura atual expira em:{' '}
              <span className="text-purple-400">
                {new Date(profile.expires_at).toLocaleDateString('pt-BR')}
              </span>
            </p>
          )}
        </div>

        {errorMsg && (
          <div className="w-full max-w-3xl mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold text-center">
            {errorMsg}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl items-stretch">
          
          {/* Prata Plan */}
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all hover:scale-[1.01]">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-2xl font-black">Plano Prata</h3>
              </div>
              <p className="text-gray-400 text-xs mb-6 font-semibold">Excelente para escolas em início de jornada.</p>
              
              <div className="mb-8">
                <span className="text-5xl font-black">R$ 40</span>
                <span className="text-gray-400 text-sm"> /mês</span>
              </div>

              <ul className="space-y-4 mb-8">
                {['Limite de até 25 Alunos', 'Controle Financeiro Completo', 'Controle de Contas Fixas', 'Gestão de Chamadas & Turmas', 'Módulo Épico de Eventos', 'Controle de Estoque & Vendas', 'Suporte Prioritário VIP 24/7'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300 text-xs">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleSubscribe('prata')}
              disabled={processingPlan !== null}
              className="w-full py-4 rounded-xl border-2 border-white/10 font-black text-xs flex items-center justify-center gap-2 hover:bg-white hover:text-black hover:border-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {processingPlan === 'prata' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecionando...
                </>
              ) : (
                <>
                  <CreditCard size={16} />
                  Assinar Prata
                </>
              )}
            </button>
          </div>

          {/* Ouro Plan */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-purple-600/20 to-pink-600/10 border-2 border-purple-500 relative flex flex-col justify-between hover:shadow-[0_0_50px_rgba(168,85,247,0.15)] transition-all hover:scale-[1.02]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
              Mais Escolhido
            </div>

            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Plano Ouro</h3>
              </div>
              <p className="text-gray-400 text-xs mb-6 font-semibold font-medium">O melhor equilíbrio para crescer sem barreiras.</p>
              
              <div className="mb-8">
                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-100 to-pink-100">R$ 70</span>
                <span className="text-gray-400 text-sm"> /mês</span>
              </div>

              <ul className="space-y-4 mb-8">
                {['Limite de até 50 Alunos', 'Controle Financeiro Completo', 'Controle de Contas Fixas', 'Gestão de Chamadas & Turmas', 'Módulo Épico de Eventos', 'Controle de Estoque & Vendas', 'Suporte Prioritário VIP 24/7'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300 text-xs">
                    <CheckCircle2 size={16} className="text-purple-400 shrink-0" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleSubscribe('ouro')}
              disabled={processingPlan !== null}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-black text-xs text-white flex items-center justify-center gap-2 hover:shadow-[0_0_35px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {processingPlan === 'ouro' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecionando...
                </>
              ) : (
                <>
                  <CreditCard size={16} />
                  Quero ser Ouro
                </>
              )}
            </button>
          </div>

          {/* Diamante Plan */}
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all hover:scale-[1.01]">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-2xl font-black">Plano Diamante</h3>
              </div>
              <p className="text-gray-400 text-xs mb-6 font-semibold">Liberdade total sem qualquer limite de alunos.</p>
              
              <div className="mb-8">
                <span className="text-5xl font-black">R$ 110</span>
                <span className="text-gray-400 text-sm"> /mês</span>
              </div>

              <ul className="space-y-4 mb-8">
                {['Alunos Ilimitados (Sem Limites)', 'Controle Financeiro Completo', 'Controle de Contas Fixas', 'Gestão de Chamadas & Turmas', 'Módulo Épico de Eventos', 'Controle de Estoque & Vendas', 'Suporte Prioritário VIP 24/7'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300 text-xs">
                    <CheckCircle2 size={16} className="text-pink-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleSubscribe('diamante')}
              disabled={processingPlan !== null}
              className="w-full py-4 rounded-xl border-2 border-white/10 font-black text-xs flex items-center justify-center gap-2 hover:bg-white hover:text-black hover:border-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {processingPlan === 'diamante' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecionando...
                </>
              ) : (
                <>
                  <CreditCard size={16} />
                  Assinar Diamante
                </>
              )}
            </button>
          </div>

        </div>

        {/* Security / Info footer */}
        <div className="mt-12 text-center text-xs text-gray-500 flex flex-col sm:flex-row items-center gap-2 justify-center">
          <span className="flex items-center gap-1 font-bold text-gray-400">
            🔒 Pagamento 100% Seguro
          </span>
          <span className="hidden sm:inline">•</span>
          <span>Processado de forma transparente via Mercado Pago</span>
          <span className="hidden sm:inline">•</span>
          <span className="flex items-center gap-1">
            <RefreshCw size={12} className="animate-spin" style={{ animationDuration: '6s' }} />
            Ativação automática instantânea
          </span>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center border-t border-white/5 mt-12">
        <p className="text-gray-600 text-[10px] font-bold">© 2026 DanceFlow Management. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
