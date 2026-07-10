import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Shield, Sparkles, Award, User, X, Zap, Star, Calendar, LayoutDashboard, Music } from 'lucide-react'
import { supabase } from '../lib/supabase'
import heroImage from '../assets/dance_hero_trio.png'
import feature1Image from '../assets/dance_black_ballerina.png'
import feature2Image from '../assets/dance_esmeralda_ballerina.png'
import carolinaImg from '../assets/director_carolina.png'
import ricardoImg from '../assets/director_ricardo.png'
import julianaImg from '../assets/director_juliana.png'
import alziroImg from '../assets/manager_alziro.png'
import marianaImg from '../assets/secretary_mariana.png'
import gustavoImg from '../assets/teacher_gustavo.png'
import hybridForecastImg from '../assets/hybrid_forecast_mockup.png'
import theaterMapImg from '../assets/theater_map_mockup.png'
import financialMockupImg from '../assets/financial_dashboard_mockup.png'
import { FluidCursor } from '../components/FluidCursor'

export default function LandingPage() {
  const [showContactModal, setShowContactModal] = useState(false)
  const [contactType, setContactType] = useState<'support' | 'career'>('support')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sanitizeInput = (val: string) => {
    return val
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const emailTrim = contactEmail.trim()
    const messageTrim = contactMessage.trim()

    if (!emailTrim || !messageTrim) {
      alert('Por favor, preencha todos os campos.')
      return
    }

    // Validação rígida de e-mail por regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailTrim)) {
      alert('Por favor, insira um e-mail válido.')
      return
    }

    if (emailTrim.length > 100) {
      alert('O e-mail é muito longo. O limite é de 100 caracteres.')
      return
    }

    if (messageTrim.length > 2000) {
      alert('A mensagem é muito longa. O limite é de 2000 caracteres.')
      return
    }

    // Escanear contra injeção de script (XSS)
    const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|javascript:/gi
    if (scriptPattern.test(emailTrim) || scriptPattern.test(messageTrim)) {
      alert('Envio bloqueado por motivos de segurança. Não é permitido o uso de códigos ou scripts.')
      return
    }

    setIsSubmitting(true)

    try {
      const sanitizedEmail = sanitizeInput(emailTrim)
      const sanitizedMessage = sanitizeInput(messageTrim)

      const subject = contactType === 'support' 
        ? 'Suporte - Contato Landing Page' 
        : 'Trabalhe Conosco - Vaga / Interesse'
        
      const senderName = contactType === 'support'
        ? 'Visitante (Landing Page)'
        : 'Candidato (Landing Page)'

      const { error } = await supabase.from('support_tickets').insert([{
        sender_email: sanitizedEmail,
        message: sanitizedMessage,
        subject: subject,
        sender_name: senderName,
        sender_role: contactType === 'support' ? 'user' : 'guest',
        status: 'open'
      }])

      if (error) throw error

      alert('Sua mensagem foi enviada com sucesso! Agradecemos o contato.')
      setShowContactModal(false)
      setContactEmail('')
      setContactMessage('')
    } catch (err: any) {
      console.error('Contact submit error:', err)
      alert('Ocorreu um erro ao enviar sua mensagem: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#06060c] text-white selection:bg-purple-500/30 overflow-x-hidden font-sans flex flex-col items-center gap-y-8 md:gap-y-14">
      {/* Dynamic Background Accents */}
      <div className="fixed top-[-15%] left-[-15%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[-15%] w-[50%] h-[50%] rounded-full bg-pink-900/10 blur-[140px] pointer-events-none" />

      {/* Clean Navigation */}
      <nav className="relative z-20 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg shadow-purple-500/20">
            <span className="text-white text-base font-black">D</span>
          </div>
          <span className="text-xl font-black tracking-tight">Dance<span className="text-purple-500">Flow-Escola</span></span>
        </div>
        
        <div className="flex items-center gap-5">
          <Link to="/auth" className="text-sm font-bold text-gray-400 hover:text-white transition-colors">
            Fazer Login
          </Link>
          <Link to="/auth" className="px-5 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-500 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            Começar Grátis
          </Link>
        </div>
      </nav>

      {/* Premium Hero Section */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-24 pb-36 md:pt-32 md:pb-48 flex flex-col md:flex-row items-center justify-between gap-12 md:gap-16">
        
        {/* Text and CTA */}
        <div className="flex-1 space-y-8 flex flex-col items-center md:items-start text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-semibold text-xs tracking-wider uppercase">
            <Sparkles size={12} className="animate-pulse" />
            O Futuro da Gestão de Dança
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white max-w-3xl">
            Sua escola de dança, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-pink-500">100% sob controle.</span>
          </h1>
          
          <p className="text-gray-400 text-base sm:text-lg leading-relaxed max-w-xl mx-auto md:mx-0">
            Abandone as planilhas complexas. Automatize mensalidades, controle de turmas, eventos épicos e estoque em uma única plataforma minimalista e ultra-veloz.
          </p>
          
          <div className="pt-2">
            <Link to="/auth" className="inline-flex items-center gap-3 px-8 py-4.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-2xl hover:shadow-[0_0_40px_rgba(168,85,247,0.35)] transition-all hover:-translate-y-0.5 group">
              Começar Agora
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Centered Image */}
        <div className="flex-1 w-full max-w-xl relative flex justify-center items-center">
          {/* Subtle Background Glow behind image */}
          <div className="absolute w-[80%] h-[80%] rounded-full bg-purple-500/10 blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
          
          <div className="relative z-10 w-full overflow-hidden rounded-3xl border border-white/5 bg-white/5 backdrop-blur-3xl p-4 shadow-2xl hover:border-white/10 transition-all hover:scale-[1.01] group">
            <img 
              src={heroImage} 
              alt="Bailarina DanceFlow" 
              className="w-full h-auto rounded-2xl object-cover object-center shadow-lg"
            />
            {/* Elegant Neon overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#06060c]/40 via-transparent to-transparent pointer-events-none rounded-3xl" />
          </div>
        </div>

      </section>

      {/* Spacious 3-Column Features Section */}
      <section className="relative z-10 py-28 border-t border-white/5 bg-black/10 w-full flex justify-center">
        <div className="w-full max-w-6xl mx-auto px-6 flex flex-col items-center gap-8 md:gap-12">
          <div className="w-full max-w-4xl mx-auto text-center space-y-4 flex flex-col items-center">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Gestão simplificada. Resultados reais.</h2>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-xl">Foque no que você faz de melhor: ensinar a arte da dança. O DanceFlow-Escola cuida de todo o resto.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {[
              { 
                icon: Sparkles, 
                title: 'Financeiro Inteligente', 
                desc: (
                  <>
                    Automação via <a href="https://www.asaas.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline font-bold transition-all">Asaas</a> (qualquer banco), conexão direta com <a href="https://www.cora.com.br" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline font-bold transition-all">Banco Cora</a> PJ ou conciliação rápida por extrato OFX/CSV.
                  </>
                ),
                color: 'text-purple-400',
                bg: 'bg-purple-500/10'
              },
              { 
                icon: Award, 
                title: 'Área do Professor', 
                desc: <>Acesso 100% restrito e seguro para professores realizarem a chamada das turmas direto pelo celular na sala de aula.</>,
                color: 'text-pink-400',
                bg: 'bg-pink-500/10'
              },
              { 
                icon: User, 
                title: 'Área do Secretário', 
                desc: <>Painel seguro com acesso delegado para secretários gerenciarem alunos, chamadas, turmas e fluxo financeiro diário.</>,
                color: 'text-yellow-400',
                bg: 'bg-yellow-500/10'
              },
              { 
                icon: Shield, 
                title: 'Eventos & Espetáculos', 
                desc: <>Módulo completo para gerenciar ingressos, kits, figurinos e parcelas dos festivals de dança da sua escola.</>,
                color: 'text-blue-400',
                bg: 'bg-blue-500/10'
              }
            ].map((feat, i) => (
              <div key={i} className="space-y-5 p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all hover:bg-white/[0.04]">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${feat.bg} ${feat.color}`}>
                  <feat.icon size={22} />
                </div>
                <h3 className="text-lg font-bold">{feat.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Spotlight Section 1: Class Management */}
      <section className="relative z-10 py-36 border-t border-white/5 w-full flex justify-center">
        <div className="w-full max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-6 text-center md:text-left flex flex-col items-center md:items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 font-bold text-xs uppercase tracking-wider">
              <Music size={12} className="shrink-0" />
              Praticidade no Dia a Dia
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Liberdade e Produtividade para sua Equipe
            </h2>
            <p className="text-gray-400 text-base leading-relaxed">
              O DanceFlow-Escola foi projetado do zero para economizar tempo. Nossos professores acessam uma interface otimizada para dispositivos móveis onde conseguem realizar a chamada das turmas e gerenciar presença na sala de aula em poucos segundos, eliminando diários de papel.
            </p>
            <div className="pt-2">
              <Link to="/auth" className="inline-flex items-center gap-3 px-6 py-3.5 bg-white/5 border border-white/10 hover:border-white/20 text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 group text-sm">
                Ver Como Funciona a Chamada
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full max-w-md md:max-w-none relative flex justify-center items-center">
            <div className="absolute w-[80%] h-[80%] rounded-full bg-pink-500/5 blur-[100px]" />
            <div className="relative z-10 w-full overflow-hidden rounded-3xl border border-white/5 bg-white/5 backdrop-blur-3xl p-4 shadow-2xl hover:border-white/10 transition-all hover:scale-[1.01] group">
              <img 
                src={feature2Image} 
                alt="Gestão de Turmas DanceFlow" 
                className="w-full h-auto rounded-2xl object-cover object-center shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Premium Spotlight Section 2: Student Profile & IR Declaration */}
      <section className="relative z-10 py-36 border-t border-white/5 bg-black/10 w-full flex justify-center">
        <div className="w-full max-w-6xl mx-auto px-6 flex flex-col md:flex-row-reverse items-center gap-16">
          <div className="flex-1 space-y-6 text-center md:text-left flex flex-col items-center md:items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold text-xs uppercase tracking-wider">
              <Star size={12} className="shrink-0" />
              Ficha Completa &amp; Documentos
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Perfil Completo do Aluno e Declaração de IR Automatizada
            </h2>
            <p className="text-gray-400 text-base leading-relaxed">
              Tenha o raio-x completo de cada bailarino. Em uma única tela, acesse o histórico completo de pagamentos quitados, turmas vinculadas e um sumário de frequência detalhado com percentual de aproveitamento. Além disso, emita a declaração de rendimentos para dedução de instrução no Imposto de Renda (IRPF) do responsável financeiro com apenas um clique.
            </p>
            <div className="pt-2">
              <Link to="/auth" className="inline-flex items-center gap-3 px-6 py-3.5 bg-white/5 border border-white/10 hover:border-white/20 text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 group text-sm">
                Experimentar Ficha de Alunos
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full max-w-md md:max-w-none relative flex justify-center items-center">
            <div className="absolute w-[80%] h-[80%] rounded-full bg-purple-500/5 blur-[100px]" />
            <div className="relative z-10 w-full overflow-hidden rounded-3xl border border-white/5 bg-white/5 backdrop-blur-3xl p-4 shadow-2xl hover:border-white/10 transition-all hover:scale-[1.01] group">
              <img 
                src={feature1Image} 
                alt="Perfil Completo do Aluno DanceFlow" 
                className="w-full h-auto rounded-2xl object-cover object-center shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Premium Spotlight Section 3: Holidays & Hybrid Payroll Forecast */}
      <section className="relative z-10 py-36 border-t border-white/5 w-full flex justify-center">
        <div className="w-full max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-6 text-center md:text-left flex flex-col items-center md:items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-bold text-xs uppercase tracking-wider">
              <Calendar size={12} className="shrink-0" />
              Feriados &amp; Previsão Inteligente
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Previsão Híbrida de Gastos com Feriados Integrados
            </h2>
            <p className="text-gray-400 text-base leading-relaxed">
              Saiba exatamente quanto vai pagar à sua equipe com antecedência! O DanceFlow-Escola calcula de forma automática os feriados nacionais e permite cadastrar feriados municipais diretamente na agenda escolar. O nosso inovador motor de <strong>Previsão Híbrida</strong> projeta os gastos de aulas futuras enquanto se autoajusta instantaneamente baseando-se nas faltas reais e chamadas já registradas dos professores no mês, prevenindo qualquer tipo de marcação indevida e mantendo o fluxo de caixa sempre preciso.
            </p>
            <div className="pt-2">
              <Link to="/auth" className="inline-flex items-center gap-3 px-6 py-3.5 bg-white/5 border border-white/10 hover:border-white/20 text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 group text-sm">
                Conhecer Previsão de Gastos
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full max-w-md md:max-w-none relative flex justify-center items-center">
            <div className="absolute w-[80%] h-[80%] rounded-full bg-yellow-500/5 blur-[100px]" />
            <div className="relative z-10 w-full overflow-hidden rounded-3xl border border-white/5 bg-white/5 backdrop-blur-3xl p-4 shadow-2xl hover:border-white/10 transition-all hover:scale-[1.01] group">
              <img 
                src={hybridForecastImg} 
                alt="Previsão de Gastos Inteligente DanceFlow" 
                className="w-full h-auto rounded-2xl object-cover object-center shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Premium Spotlight Section 4: Financial */}
      <section className="relative z-10 py-36 border-t border-white/5 bg-black/10 w-full flex justify-center">
        <div className="w-full max-w-6xl mx-auto px-6 flex flex-col md:flex-row-reverse items-center gap-16">
          <div className="flex-1 space-y-6 text-center md:text-left flex flex-col items-center md:items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold text-xs uppercase tracking-wider">
              <Zap size={12} className="shrink-0" />
              Controle Absoluto
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Faturamento Automatizado e Conciliação Universal
            </h2>
            <p className="text-gray-400 text-base leading-relaxed">
              Não mude de banco! O DanceFlow-Escola se conecta de forma segura e oficial à sua própria conta do <a href="https://www.cora.com.br" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline font-bold transition-all">Banco Cora</a> ou <a href="https://www.asaas.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline font-bold transition-all">Asaas</a> (permitindo receber em qualquer banco com repasses automáticos via Pix). E se você usa outro banco convencional (Itaú, Bradesco, Nubank, Inter, etc.), basta arrastar o extrato bancário (OFX ou CSV) na plataforma para o sistema fazer o cruzamento inteligente e dar baixa automática em lote nos alunos.
            </p>
            <div className="pt-2">
              <Link to="/auth" className="inline-flex items-center gap-3 px-6 py-3.5 bg-white/5 border border-white/10 hover:border-white/20 text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 group text-sm">
                Conhecer Recursos Financeiros
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full max-w-md md:max-w-none relative flex justify-center items-center">
            <div className="absolute w-[80%] h-[80%] rounded-full bg-purple-500/5 blur-[100px]" />
            <div className="relative z-10 w-full overflow-hidden rounded-3xl border border-white/5 bg-white/5 backdrop-blur-3xl p-4 shadow-2xl hover:border-white/10 transition-all hover:scale-[1.01] group">
              <img 
                src={financialMockupImg} 
                alt="Financeiro Avançado DanceFlow" 
                className="w-full h-auto rounded-2xl object-cover object-center shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Premium Spotlight Section 5: Events & Theater Map */}
      <section className="relative z-10 py-36 border-t border-white/5 w-full flex justify-center">
        <div className="w-full max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-6 text-center md:text-left flex flex-col items-center md:items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 font-bold text-xs uppercase tracking-wider">
              <LayoutDashboard size={12} className="shrink-0" />
              Eventos &amp; Bilheteria
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Gestão de Espetáculos e Mapas de Assento Personalizados
            </h2>
            <p className="text-gray-400 text-base leading-relaxed">
              Planejar um grande festival ou apresentação anual nunca foi tão simples! Com o DanceFlow-Escola, você pode cadastrar e mapear o teatro de forma visual, definindo fileiras de assentos customizadas e exceções de poltronas para refletir fielmente qualquer casa de espetáculos. Controle a ocupação em tempo real, venda ingressos numerados e integre a arrecadação de taxas de apresentação, kits e figurinos diretamente ao cadastro financeiro do aluno em lote.
            </p>
            <div className="pt-2">
              <Link to="/auth" className="inline-flex items-center gap-3 px-6 py-3.5 bg-white/5 border border-white/10 hover:border-white/20 text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 group text-sm">
                Explorar Gestão de Eventos
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full max-w-md md:max-w-none relative flex justify-center items-center">
            <div className="absolute w-[80%] h-[80%] rounded-full bg-pink-500/5 blur-[100px]" />
            <div className="relative z-10 w-full overflow-hidden rounded-3xl border border-white/5 bg-white/5 backdrop-blur-3xl p-4 shadow-2xl hover:border-white/10 transition-all hover:scale-[1.01] group">
              <img 
                src={theaterMapImg} 
                alt="Mapa de Assentos de Teatros DanceFlow" 
                className="w-full h-auto rounded-2xl object-cover object-center shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Modern spacious Testimonials */}
      <section className="relative z-10 py-28 w-full flex justify-center">
        <div className="w-full max-w-6xl mx-auto px-6 flex flex-col items-center gap-8 md:gap-12">
          <h2 className="text-2xl sm:text-3xl font-black text-center">Histórias de sucesso de quem usa</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto w-full">
            {[
              { 
                name: 'Carolina Souza', 
                role: 'Diretora Artística', 
                image: carolinaImg,
                initials: 'CS',
                quote: 'A gestão do nosso espetáculo de fim de ano com roupas e convites era caótica. O DanceFlow-Escola organizou e automatizou tudo!' 
              },
              { 
                name: 'Ricardo Mendes', 
                role: 'Proprietário de Escola', 
                image: ricardoImg,
                initials: 'RM',
                quote: 'O design é simplesmente maravilhoso e a facilidade de ver quem pagou a mensalidade pelo gráfico me poupa horas de trabalho semanal.' 
              },
              { 
                name: 'Juliana Kapor', 
                role: 'Diretora de Ballet', 
                image: julianaImg,
                initials: 'JK',
                quote: 'O mapa de assentos para os nossos espetáculos no teatro municipal mudou a nossa história. Vendemos tudo numerado em poucas horas e sem filas.' 
              },
              { 
                name: 'Alziro Menezes', 
                role: 'Gestor Financeiro', 
                image: alziroImg,
                initials: 'AM',
                quote: 'A conciliação bancária por extrato OFX facilitou muito o nosso controle. O que antes levava um dia inteiro para conferir agora é feito em minutos.' 
              },
              { 
                name: 'Mariana Dias', 
                role: 'Secretária Geral', 
                image: marianaImg,
                initials: 'MD',
                quote: 'O controle de frequência dos alunos e a ficha médica integrada ajudaram a secretaria a ter tudo organizado em um só lugar. Indispensável!' 
              },
              { 
                name: 'Gustavo Lins', 
                role: 'Professor de Dança', 
                image: gustavoImg,
                initials: 'GL',
                quote: 'Com o controle de estoque integrado, ficou muito mais simples gerenciar a venda de sapatilhas e uniformes direto na recepção.' 
              }
            ].map((t, i) => (
              <div key={i} className="p-8 sm:p-10 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center text-center justify-between hover:border-white/10 transition-all hover:scale-[1.02] duration-300">
                <p className="text-gray-300 text-sm italic leading-relaxed mb-8">"{t.quote}"</p>
                <div className="flex flex-col items-center gap-4">
                  {t.image ? (
                    <img 
                      src={t.image} 
                      alt={t.name} 
                      className="h-12 w-12 rounded-full object-cover object-center border-2 border-purple-500/20 shadow-md"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-600/30 to-pink-500/30 border-2 border-purple-500/20 shadow-md flex items-center justify-center font-bold text-sm text-purple-200">
                      {t.initials}
                    </div>
                  )}
                  <div className="flex flex-col items-center">
                    <h4 className="font-bold text-sm text-white">{t.name}</h4>
                    <span className="text-xs text-purple-400 font-bold uppercase tracking-wider mt-0.5">{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Spacious Pricing */}
      <section className="relative z-10 py-28 border-t border-white/5 bg-black/10 w-full flex justify-center">
        <div className="w-full max-w-6xl mx-auto px-6 flex flex-col items-center gap-8 md:gap-12">
          <div className="w-full text-center max-w-4xl mx-auto space-y-4 flex flex-col items-center">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Planos transparentes. Liberação imediata.</h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-xl">Escolha o plano ideal para a sua escola e comece a escalar hoje mesmo.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-7xl mx-auto items-stretch">
            
            {/* Gratis Plan */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all hover:scale-[1.01]">
              <div>
                <h3 className="text-lg font-bold mb-1">Plano Grátis</h3>
                <p className="text-gray-400 text-xs mb-6 font-semibold">Período de teste para você conhecer.</p>
                <div className="mb-8">
                  <span className="text-3xl font-black">Grátis</span><span className="text-gray-400 text-xs"> /7 dias</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {['Teste de 7 Dias Totalmente Livre', 'Controle Financeiro Completo', 'Controle de Contas Fixas', 'Gestão de Chamadas & Turmas', 'Módulo Épico de Eventos', 'Controle de Estoque & Vendas', 'Suporte Prioritário VIP 24/7'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300 text-[10px] leading-snug">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/auth" className="w-full py-2.5 rounded-xl border border-white/10 font-bold text-center text-xs hover:bg-white hover:text-black hover:border-white transition-all">
                Testar Grátis
              </Link>
            </div>

            {/* Bronze Plan */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all hover:scale-[1.01]">
              <div>
                <h3 className="text-lg font-bold mb-1">Plano Bronze</h3>
                <p className="text-gray-400 text-xs mb-6 font-semibold">Perfeito para iniciar a organização.</p>
                <div className="mb-8">
                  <span className="text-3xl font-black">R$ 39,99</span><span className="text-gray-400 text-xs">/mês</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {['Limite de até 25 Alunos', 'Controle Financeiro Completo', 'Controle de Contas Fixas', 'Gestão de Chamadas & Turmas', 'Módulo Épico de Eventos', 'Controle de Estoque & Vendas', 'Suporte Prioritário VIP 24/7'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300 text-[10px] leading-snug">
                      <CheckCircle2 size={14} className="text-amber-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/auth" className="w-full py-2.5 rounded-xl border border-white/10 font-bold text-center text-xs hover:bg-white hover:text-black hover:border-white transition-all">
                Assinar Bronze
              </Link>
            </div>

            {/* Prata Plan */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all hover:scale-[1.01]">
              <div>
                <h3 className="text-lg font-bold mb-1">Plano Prata</h3>
                <p className="text-gray-400 text-xs mb-6 font-semibold">Excelente para escolas em início.</p>
                <div className="mb-8">
                  <span className="text-3xl font-black">R$ 69,99</span><span className="text-gray-400 text-xs">/mês</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {['Limite de até 50 Alunos', 'Controle Financeiro Completo', 'Controle de Contas Fixas', 'Gestão de Chamadas & Turmas', 'Módulo Épico de Eventos', 'Controle de Estoque & Vendas', 'Suporte Prioritário VIP 24/7'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300 text-[10px] leading-snug">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/auth" className="w-full py-2.5 rounded-xl border border-white/10 font-bold text-center text-xs hover:bg-white hover:text-black hover:border-white transition-all">
                Assinar Prata
              </Link>
            </div>

            {/* Ouro Plan */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-purple-600/10 to-pink-600/5 border border-purple-500/40 relative flex flex-col justify-between hover:border-purple-500 transition-all shadow-2xl hover:scale-[1.02]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-[8px] font-black uppercase tracking-widest">
                Mais Escolhido
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1 text-purple-400">Plano Ouro</h3>
                <p className="text-gray-400 text-xs mb-6 font-semibold font-medium">O melhor equilíbrio para crescer.</p>
                <div className="mb-8">
                  <span className="text-3xl font-black">R$ 109,99</span><span className="text-gray-400 text-xs">/mês</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {['Limite de até 100 Alunos', 'Controle Financeiro Completo', 'Controle de Contas Fixas', 'Gestão de Chamadas & Turmas', 'Módulo Épico de Eventos', 'Controle de Estoque & Vendas', 'Suporte Prioritário VIP 24/7'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300 text-[10px] leading-snug">
                      <CheckCircle2 size={14} className="text-purple-400 shrink-0" />
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/auth" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-center text-xs text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
                Quero ser Ouro
              </Link>
            </div>

            {/* Diamante Plan */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all hover:scale-[1.01]">
              <div>
                <h3 className="text-lg font-bold mb-1">Plano Diamante</h3>
                <p className="text-gray-400 text-xs mb-6 font-semibold">Liberdade total sem limite de alunos.</p>
                <div className="mb-8">
                  <span className="text-3xl font-black">R$ 209,99</span><span className="text-gray-400 text-xs">/mês</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {['Alunos Ilimitados (Sem Limites)', 'Controle Financeiro Completo', 'Controle de Contas Fixas', 'Gestão de Chamadas & Turmas', 'Módulo Épico de Eventos', 'Controle de Estoque & Vendas', 'Suporte Prioritário VIP 24/7'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300 text-[10px] leading-snug">
                      <CheckCircle2 size={14} className="text-pink-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/auth" className="w-full py-2.5 rounded-xl border border-white/10 font-bold text-center text-xs hover:bg-white hover:text-black hover:border-white transition-all">
                Assinar Diamante
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-16 text-center border-t border-white/5 w-full flex flex-col items-center justify-center gap-4">
        <div className="flex items-center justify-center gap-2">
          <div className="h-5 w-5 rounded-md flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
            <span className="text-white text-[10px] font-black">D</span>
          </div>
          <span className="font-black tracking-tight text-base">Dance<span className="text-purple-500">Flow-Escola</span></span>
        </div>
        
        {/* Footer Navigation Links */}
        <div className="flex gap-6 text-xs font-semibold text-gray-500 my-2">
          <button 
            onClick={() => { setContactType('career'); setShowContactModal(true); }}
            className="hover:text-purple-400 transition-colors cursor-pointer"
          >
            Trabalhe Conosco
          </button>
          <span className="text-gray-700">|</span>
          <button 
            onClick={() => { setContactType('support'); setShowContactModal(true); }}
            className="hover:text-purple-400 transition-colors cursor-pointer"
          >
            Suporte
          </button>
        </div>
        
        <p className="text-gray-600 text-xs font-semibold">© 2026 DanceFlow-Escola Management. Todos os direitos reservados.</p>
      </footer>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div 
            className="relative w-full max-w-md rounded-3xl border border-white/10 p-6 md:p-8 overflow-hidden shadow-2xl"
            style={{ backgroundColor: '#0c0c14' }}
          >
            {/* Background Glow */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-purple-600/10 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-pink-600/10 blur-[80px] pointer-events-none" />

            {/* Close Button */}
            <button 
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="mb-6 relative z-10">
              <h3 className="text-lg font-black tracking-tight text-white">
                {contactType === 'support' ? 'Suporte Técnico' : 'Trabalhe Conosco'}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {contactType === 'support' 
                  ? 'Fale com nosso time técnico sobre dúvidas ou problemas no sistema.'
                  : 'Quer fazer parte da equipe do DanceFlow-Escola? Envie sua vaga de interesse.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleContactSubmit} className="space-y-4 relative z-10">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-300 block">Seu E-mail</label>
                <input 
                  type="email"
                  required
                  disabled={isSubmitting}
                  placeholder="exemplo@email.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-300 block">
                  {contactType === 'support' ? 'Como podemos ajudar?' : 'Vaga de interesse / Apresentação'}
                </label>
                <textarea 
                  required
                  rows={4}
                  disabled={isSubmitting}
                  placeholder={contactType === 'support' 
                    ? 'Descreva em detalhes o seu problema ou sugestão de suporte...'
                    : 'Fale sobre a área/vaga que procura (ex: Professor de Balé, Recepcionista, Dev) e sua experiência...'}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all resize-none disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Enviar Solicitação'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
      <FluidCursor enabled={true} />
    </div>
  )
}
