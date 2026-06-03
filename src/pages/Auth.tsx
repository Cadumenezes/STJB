import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, Lock, Phone, ArrowRight, Sparkles } from 'lucide-react'
import loginBgImage from '../assets/dance_auth_login.png'
import danceLoginJazz from '../assets/dance_login_jazz.png'
import danceLoginKids from '../assets/dance_login_kids.png'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Estados para o fluxo de redefinição de senha
  const [forgotMode, setForgotMode] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    // Detecta se o usuário veio a partir de um link de recuperação de senha do Supabase
    if (
      window.location.hash.includes('type=recovery') || 
      window.location.hash.includes('access_token=') ||
      localStorage.getItem('resetting_password') === 'true'
    ) {
      setIsResetting(true)
    }
  }, [])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const cleanPhone = phone.replace(/\D/g, '')
        if (cleanPhone.length < 10 || cleanPhone.length > 11) {
          throw new Error('Por favor, insira um número de telefone com DDD válido (10 ou 11 dígitos).')
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              phone: phone,
            },
          },
        })
        if (error) throw error
        setMessage({ type: 'success', text: 'Cadastro realizado! Verifique seu e-mail para confirmar.' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Ocorreu um erro.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth',
      })
      if (error) throw error
      setMessage({ type: 'success', text: 'E-mail de recuperação enviado! Verifique sua caixa de entrada.' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao enviar e-mail de recuperação.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      
      // Limpa a hash da URL de forma segura
      window.history.replaceState(null, '', window.location.pathname)
      localStorage.removeItem('resetting_password')
      
      setMessage({ type: 'success', text: 'Sua senha foi redefinida com sucesso! Faça login com a nova senha.' })
      setIsResetting(false)
      setIsLogin(true)
      setConfirmPassword('')
      setPassword('')
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar a senha.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#06060c] text-white selection:bg-purple-500/30 font-sans overflow-y-auto md:overflow-hidden">
      
      {/* Left Column: Compact Login Form (30% on large screens, full screen on mobile) */}
      <div className="w-full md:w-[35%] lg:w-[30%] xl:w-[26%] flex flex-col justify-between p-6 sm:p-8 relative z-10 bg-[#0a0a0f] border-b md:border-b-0 md:border-r border-white/5 shrink-0 md:overflow-y-auto">
        {/* Subtle Background Accent */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/5 blur-[100px] pointer-events-none -z-10" />

        {/* Top Header Logo */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg shadow-purple-500/20">
            <span className="text-white text-xs font-black">D</span>
          </div>
          <span className="text-base font-black tracking-tight text-white">Dance<span className="text-purple-500">Flow</span></span>
        </div>

        {/* Brand Quote (Completely separate, on top of where login is made!) */}
        <div className="w-full p-6 rounded-2xl bg-black/45 border border-white/5 backdrop-blur-md shadow-2xl space-y-3 mt-6">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-lg flex items-center justify-center bg-purple-500/20 text-purple-400">
              <Sparkles size={13} />
            </div>
            <span className="text-xs text-purple-400 uppercase tracking-widest font-black">Tecnologia & Arte em Movimento</span>
          </div>
          <blockquote className="text-sm italic leading-relaxed text-gray-300">
            "A dança é a linguagem secreta da alma. Nosso propósito é fazer a gestão da sua escola fluir tão suavemente quanto cada passo de dança."
          </blockquote>
          <div>
            <h4 className="font-bold text-xs text-white">DanceFlow Management</h4>
          </div>
        </div>

        {/* Form Container */}
        <div className="my-auto py-6">
          {isResetting ? (
            /* VISÃO DE REDEFINIÇÃO DE SENHA (RESET PASSWORD) */
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Definir Nova Senha
                </h2>
                <p className="text-[11px] text-gray-400 mt-1">
                  Digite sua nova senha de acesso abaixo.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {message.text && (
                  <div className={`p-3 rounded-xl text-xs font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                    {message.text}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors z-10" size={15} />
                    <input
                      type="password"
                      required
                      placeholder="Nova senha (mín. 6 caracteres)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl pr-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      style={{ paddingLeft: '44px' }}
                    />
                  </div>

                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors z-10" size={15} />
                    <input
                      type="password"
                      required
                      placeholder="Confirme a nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl pr-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      style={{ paddingLeft: '44px' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-purple-900/15 flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Salvar Nova Senha
                      <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-gray-500 text-xs mt-6">
                <button
                  onClick={() => {
                    setIsResetting(false);
                    window.history.replaceState(null, '', window.location.pathname);
                    localStorage.removeItem('resetting_password');
                    setMessage({ type: '', text: '' });
                  }}
                  className="text-purple-400 font-bold hover:text-purple-300 transition-colors cursor-pointer"
                >
                  Voltar para o Login
                </button>
              </p>
            </div>
          ) : forgotMode ? (
            /* VISÃO DE ESQUECI MINHA SENHA (FORGOT PASSWORD) */
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Recuperar Senha
                </h2>
                <p className="text-[11px] text-gray-400 mt-1">
                  Digite seu e-mail cadastrado para receber as instruções de recuperação.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                {message.text && (
                  <div className={`p-3 rounded-xl text-xs font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                    {message.text}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors z-10" size={15} />
                    <input
                      type="email"
                      required
                      placeholder="Seu e-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl pr-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      style={{ paddingLeft: '44px' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-purple-900/15 flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Enviar Link de Recuperação
                      <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-gray-500 text-xs mt-6">
                <button
                  onClick={() => {
                    setForgotMode(false);
                    setMessage({ type: '', text: '' });
                  }}
                  className="text-purple-400 font-bold hover:text-purple-300 transition-colors cursor-pointer"
                >
                  Voltar para o Login
                </button>
              </p>
            </div>
          ) : (
            /* VISÃO PADRÃO (LOGIN / CADASTRO) */
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta comercial'}
                </h2>
                <p className="text-[11px] text-gray-400 mt-1">
                  {isLogin 
                    ? 'Insira suas credenciais abaixo para gerenciar sua escola.' 
                    : 'Preencha os campos para iniciar sua experiência no DanceFlow.'}
                </p>
              </div>

              {/* Toggle de Abas Login / Cadastro */}
              <div className="flex gap-2 mb-6 p-1 bg-black/30 border border-white/5 rounded-xl">
                <button
                  onClick={() => { setIsLogin(true); setMessage({ type: '', text: '' }); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${isLogin ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                >
                  Fazer Login
                </button>
                <button
                  onClick={() => { setIsLogin(false); setMessage({ type: '', text: '' }); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${!isLogin ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                >
                  Criar Cadastro
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {message.text && (
                  <div className={`p-3 rounded-xl text-xs font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                    {message.text}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors z-10" size={15} />
                    <input
                      type="email"
                      required
                      placeholder="Seu e-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl pr-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      style={{ paddingLeft: '44px' }}
                    />
                  </div>

                  {!isLogin && (
                    <div className="relative group">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors z-10" size={15} />
                      <input
                        type="tel"
                        required
                        placeholder="Telefone / WhatsApp"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl pr-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                        style={{ paddingLeft: '44px' }}
                      />
                    </div>
                  )}

                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors z-10" size={15} />
                    <input
                      type="password"
                      required
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl pr-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      style={{ paddingLeft: '44px' }}
                    />
                  </div>

                  {isLogin && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotMode(true);
                          setMessage({ type: '', text: '' });
                        }}
                        className="text-[11px] text-purple-400 font-medium hover:text-purple-300 transition-colors cursor-pointer"
                      >
                        Esqueceu sua senha?
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-purple-900/15 flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {isLogin ? 'Acessar Conta' : 'Iniciar Avaliação Gratuita'}
                      <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-gray-500 text-xs mt-6">
                {isLogin ? 'Novo por aqui?' : 'Já possui uma conta?'}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-1 text-purple-400 font-bold hover:text-purple-300 transition-colors cursor-pointer"
                >
                  {isLogin ? 'Cadastre sua escola' : 'Faça seu login'}
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-left text-gray-600 text-[9px] font-semibold tracking-wider uppercase">
          DanceFlow Management v1.1
        </p>
      </div>

      {/* Right Column: Visual Humanized Panel (SaaS Split-Screen Grid) */}
      <div className="flex w-full md:w-[65%] lg:w-[70%] xl:w-[74%] flex-col justify-between p-6 sm:p-8 bg-[#06060c] relative md:border-l border-white/5 shrink-0">
        
        {/* Subtle Radial Glow */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none -z-10" />

        {/* Gallery of multiple images (Fully visible, completely uncovered!) */}
        <div className="flex-1 w-full grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 min-h-[250px] md:min-h-[300px]">
          {/* Photo 1 (Spans 2 columns to give the couple ample horizontal space so both are fully visible!) */}
          <div className="col-span-2 lg:col-span-2 aspect-[16/10] md:aspect-auto md:h-full relative rounded-2xl overflow-hidden border border-white/5 shadow-xl group hover:border-purple-500/30 transition-all duration-300">
            <img 
              src={loginBgImage} 
              alt="Casal de adolescentes negros fazendo dança urbana" 
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 filter brightness-[0.8]"
            />
          </div>

          {/* Photo 2 */}
          <div className="col-span-1 lg:col-span-1 aspect-square md:aspect-auto md:h-full relative rounded-2xl overflow-hidden border border-white/5 shadow-xl group hover:border-purple-500/30 transition-all duration-300">
            <img 
              src={danceLoginJazz} 
              alt="Bailarina clássica contemporânea" 
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 filter brightness-[0.8]"
            />
          </div>

          {/* Photo 3 */}
          <div className="col-span-1 lg:col-span-1 aspect-square md:aspect-auto md:h-full relative rounded-2xl overflow-hidden border border-white/5 shadow-xl group hover:border-purple-500/30 transition-all duration-300">
            <img 
              src={danceLoginKids} 
              alt="Dança urbana e coreografia moderna" 
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 filter brightness-[0.8]"
            />
          </div>
        </div>

        {/* Subtle Bottom Glow */}
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-pink-600/5 blur-[120px] pointer-events-none -z-10" />
      </div>
      
    </div>
  )
}
