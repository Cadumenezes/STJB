import { useState } from 'react'
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

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
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

  return (
    <div className="min-h-screen w-full flex bg-[#06060c] text-white selection:bg-purple-500/30 font-sans overflow-hidden">
      
      {/* Left Column: Compact Login Form (35% on large screens, full screen on mobile) */}
      <div className="w-full md:w-[40%] lg:w-[35%] flex flex-col justify-between p-8 sm:p-10 lg:p-12 relative z-10 bg-[#0a0a0f] border-r border-white/5 shrink-0">
        {/* Subtle Background Accent */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/5 blur-[100px] pointer-events-none -z-10" />

        {/* Top Header Logo */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg shadow-purple-500/20">
            <span className="text-white text-xs font-black">D</span>
          </div>
          <span className="text-base font-black tracking-tight text-white">Dance<span className="text-purple-500">Flow</span></span>
        </div>

        {/* Form Container */}
        <div className="my-auto py-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight text-white">
              {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta comercial'}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {isLogin 
                ? 'Insira suas credenciais abaixo para gerenciar sua escola.' 
                : 'Preencha os campos para iniciar sua experiência no DanceFlow.'}
            </p>
          </div>

          {/* Login / Signup Tabs Toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-black/30 border border-white/5 rounded-xl">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${isLogin ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              Fazer Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
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
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors" size={15} />
                <input
                  type="email"
                  required
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                />
              </div>

              {!isLogin && (
                <div className="relative group">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors" size={15} />
                  <input
                    type="tel"
                    required
                    placeholder="Telefone / WhatsApp"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                  />
                </div>
              )}

              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors" size={15} />
                <input
                  type="password"
                  required
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
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

        {/* Footer info */}
        <p className="text-left text-gray-600 text-[9px] font-semibold tracking-wider uppercase">
          DanceFlow Management v1.1
        </p>
      </div>

      {/* Right Column: Visual Humanized Panel (SaaS Split-Screen Grid) */}
      <div className="hidden md:flex md:w-[60%] lg:w-[65%] flex-col justify-between p-8 lg:p-12 bg-[#06060c] overflow-y-auto relative border-l border-white/5 shrink-0">
        
        {/* Subtle Radial Glow */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none -z-10" />

        {/* Brand Quote (Completely separate, not overlaying any photo!) */}
        <div className="w-full p-6 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md shadow-2xl space-y-3.5 mb-8 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg flex items-center justify-center bg-purple-500/20 text-purple-400">
              <Sparkles size={14} />
            </div>
            <span className="text-[10px] text-purple-400 uppercase tracking-widest font-black">Tecnologia & Arte em Movimento</span>
          </div>
          <blockquote className="text-xs italic leading-relaxed text-gray-300">
            "A dança é a linguagem secreta da alma. Nosso propósito é fazer a gestão da sua escola fluir tão suavemente quanto cada passo de dança."
          </blockquote>
          <div>
            <h4 className="font-bold text-[11px] text-white">DanceFlow Management</h4>
          </div>
        </div>

        {/* Gallery of multiple images (Fully visible, completely uncovered!) */}
        <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[300px]">
          {/* Photo 1 (Spans 2 columns to give the couple ample horizontal space so both are fully visible!) */}
          <div className="lg:col-span-2 relative rounded-2xl overflow-hidden border border-white/5 shadow-xl group hover:border-purple-500/30 transition-all duration-300">
            <img 
              src={loginBgImage} 
              alt="Casal de adolescentes negros fazendo dança urbana" 
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 filter brightness-[0.8]"
            />
          </div>

          {/* Photo 2 */}
          <div className="lg:col-span-1 relative rounded-2xl overflow-hidden border border-white/5 shadow-xl group hover:border-purple-500/30 transition-all duration-300">
            <img 
              src={danceLoginJazz} 
              alt="Bailarina clássica contemporânea" 
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 filter brightness-[0.8]"
            />
          </div>

          {/* Photo 3 */}
          <div className="lg:col-span-1 relative rounded-2xl overflow-hidden border border-white/5 shadow-xl group hover:border-purple-500/30 transition-all duration-300">
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
