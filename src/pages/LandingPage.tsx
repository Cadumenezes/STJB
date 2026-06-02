import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Shield, Sparkles, Award } from 'lucide-react'
import heroImage from '../assets/dance_hero_trio.png'
import feature1Image from '../assets/dance_black_ballerina.png'
import feature2Image from '../assets/dance_esmeralda_ballerina.png'
import carolinaImg from '../assets/director_carolina.png'
import ricardoImg from '../assets/director_ricardo.png'

export default function LandingPage() {
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
          <span className="text-xl font-black tracking-tight">Dance<span className="text-purple-500">Flow</span></span>
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
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-xl">Foque no que você faz de melhor: ensinar a arte da dança. O DanceFlow cuida de todo o resto.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
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

      {/* Premium Spotlight Section 1: Financial */}
      <section className="relative z-10 py-36 border-t border-white/5 w-full flex justify-center">
        <div className="w-full max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-6 text-center md:text-left flex flex-col items-center md:items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold text-xs uppercase tracking-wider">
              ⚡ Controle Absoluto
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Faturamento Automatizado e Conciliação Universal
            </h2>
            <p className="text-gray-400 text-base leading-relaxed">
              Não mude de banco! O DanceFlow se conecta de forma segura e oficial à sua própria conta do <a href="https://www.cora.com.br" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline font-bold transition-all">Banco Cora</a> ou <a href="https://www.asaas.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline font-bold transition-all">Asaas</a> (permitindo receber em qualquer banco com repasses automáticos via Pix). E se você usa outro banco convencional (Itaú, Bradesco, Nubank, Inter, etc.), basta arrastar o extrato bancário (OFX ou CSV) na plataforma para o sistema fazer o cruzamento inteligente e dar baixa automática em lote nos alunos.
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
                src={feature1Image} 
                alt="Financeiro Avançado DanceFlow" 
                className="w-full h-auto rounded-2xl object-cover object-center shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Premium Spotlight Section 2: Class Management */}
      <section className="relative z-10 py-36 border-t border-white/5 bg-black/10 w-full flex justify-center">
        <div className="w-full max-w-6xl mx-auto px-6 flex flex-col md:flex-row-reverse items-center gap-16">
          <div className="flex-1 space-y-6 text-center md:text-left flex flex-col items-center md:items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 font-bold text-xs uppercase tracking-wider">
              🩰 Praticidade no Dia a Dia
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Liberdade e Produtividade para sua Equipe
            </h2>
            <p className="text-gray-400 text-base leading-relaxed">
              O DanceFlow foi projetado do zero para economizar tempo. Nossos professores acessam uma interface otimizada para dispositivos móveis onde conseguem realizar a chamada das turmas e gerenciar presença na sala de aula em poucos segundos, eliminando diários de papel.
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

      {/* Premium Spotlight Section 3: Student Profile & IR Declaration */}
      <section className="relative z-10 py-36 border-t border-white/5 w-full flex justify-center">
        <div className="w-full max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-6 text-center md:text-left flex flex-col items-center md:items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold text-xs uppercase tracking-wider">
              ⭐ Ficha Completa & Documentos
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

      {/* Modern spacious Testimonials */}
      <section className="relative z-10 py-28 w-full flex justify-center">
        <div className="w-full max-w-6xl mx-auto px-6 flex flex-col items-center gap-8 md:gap-12">
          <h2 className="text-2xl sm:text-3xl font-black text-center">Histórias de sucesso de quem usa</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
            {[
              { 
                name: 'Carolina Souza', 
                role: 'Diretora Artística', 
                image: carolinaImg,
                quote: 'A gestão do nosso espetáculo de fim de ano com roupas e convites era caótica. O DanceFlow organizou e automatizou tudo!' 
              },
              { 
                name: 'Ricardo Mendes', 
                role: 'Proprietário', 
                image: ricardoImg,
                quote: 'O design é simplesmente maravilhoso e a facilidade de ver quem pagou a mensalidade pelo gráfico me poupa horas de trabalho semanal.' 
              }
            ].map((t, i) => (
              <div key={i} className="p-8 sm:p-10 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center text-center justify-between">
                <p className="text-gray-300 text-sm italic leading-relaxed mb-8">"{t.quote}"</p>
                <div className="flex flex-col items-center gap-4">
                  <img 
                    src={t.image} 
                    alt={t.name} 
                    className="h-12 w-12 rounded-full object-cover object-center border-2 border-purple-500/20 shadow-md"
                  />
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-stretch">
            
            {/* Gratis Plan */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all hover:scale-[1.01]">
              <div>
                <h3 className="text-xl font-bold mb-1">Plano Grátis</h3>
                <p className="text-gray-400 text-xs mb-6 font-semibold">Período de teste para você conhecer.</p>
                <div className="mb-8">
                  <span className="text-4xl font-black">Grátis</span><span className="text-gray-400 text-xs"> /7 dias</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {['Teste de 7 Dias Totalmente Livre', 'Controle Financeiro Completo', 'Controle de Contas Fixas', 'Gestão de Chamadas & Turmas', 'Módulo Épico de Eventos', 'Controle de Estoque & Vendas', 'Suporte Prioritário VIP 24/7'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-300 text-[11px] leading-snug">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/auth" className="w-full py-3 rounded-xl border border-white/10 font-bold text-center text-xs hover:bg-white hover:text-black hover:border-white transition-all">
                Testar Grátis
              </Link>
            </div>

            {/* Prata Plan */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all hover:scale-[1.01]">
              <div>
                <h3 className="text-xl font-bold mb-1">Plano Prata</h3>
                <p className="text-gray-400 text-xs mb-6 font-semibold">Excelente para escolas em início de jornada.</p>
                <div className="mb-8">
                  <span className="text-4xl font-black">R$ 40</span><span className="text-gray-400 text-xs">/mês</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {['Limite de até 25 Alunos', 'Controle Financeiro Completo', 'Controle de Contas Fixas', 'Gestão de Chamadas & Turmas', 'Módulo Épico de Eventos', 'Controle de Estoque & Vendas', 'Suporte Prioritário VIP 24/7'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-300 text-[11px] leading-snug">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/auth" className="w-full py-3 rounded-xl border border-white/10 font-bold text-center text-xs hover:bg-white hover:text-black hover:border-white transition-all">
                Assinar Prata
              </Link>
            </div>

            {/* Ouro Plan */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-purple-600/10 to-pink-600/5 border border-purple-500/40 relative flex flex-col justify-between hover:border-purple-500 transition-all shadow-2xl hover:scale-[1.02]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-[9px] font-black uppercase tracking-widest">
                Mais Escolhido
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1 text-purple-400">Plano Ouro</h3>
                <p className="text-gray-400 text-xs mb-6 font-semibold font-medium">O melhor equilíbrio para crescer.</p>
                <div className="mb-8">
                  <span className="text-4xl font-black">R$ 70</span><span className="text-gray-400 text-xs">/mês</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {['Limite de até 50 Alunos', 'Controle Financeiro Completo', 'Controle de Contas Fixas', 'Gestão de Chamadas & Turmas', 'Módulo Épico de Eventos', 'Controle de Estoque & Vendas', 'Suporte Prioritário VIP 24/7'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-300 text-[11px] leading-snug">
                      <CheckCircle2 size={15} className="text-purple-400 shrink-0" />
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/auth" className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-center text-xs text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
                Quero ser Ouro
              </Link>
            </div>

            {/* Diamante Plan */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all hover:scale-[1.01]">
              <div>
                <h3 className="text-xl font-bold mb-1">Plano Diamante</h3>
                <p className="text-gray-400 text-xs mb-6 font-semibold">Liberdade total sem limite de alunos.</p>
                <div className="mb-8">
                  <span className="text-4xl font-black">R$ 110</span><span className="text-gray-400 text-xs">/mês</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {['Alunos Ilimitados (Sem Limites)', 'Controle Financeiro Completo', 'Controle de Contas Fixas', 'Gestão de Chamadas & Turmas', 'Módulo Épico de Eventos', 'Controle de Estoque & Vendas', 'Suporte Prioritário VIP 24/7'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-300 text-[11px] leading-snug">
                      <CheckCircle2 size={15} className="text-pink-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/auth" className="w-full py-3 rounded-xl border border-white/10 font-bold text-center text-xs hover:bg-white hover:text-black hover:border-white transition-all">
                Assinar Diamante
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-16 text-center border-t border-white/5 w-full">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-5 w-5 rounded-md flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
            <span className="text-white text-[10px] font-black">D</span>
          </div>
          <span className="font-black tracking-tight text-base">Dance<span className="text-purple-500">Flow</span></span>
        </div>
        <p className="text-gray-600 text-xs font-semibold">© 2026 DanceFlow Management. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
