import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { LogIn, UserPlus, Mail, Lock, Phone, ArrowRight } from 'lucide-react'

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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a0f]" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Background blobs for aesthetics */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-pink-600/20 blur-[120px]" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-20 w-20 rounded-3xl flex items-center justify-center mb-4 shadow-2xl" style={{ background: 'var(--accent-gradient, linear-gradient(135deg, #8b5cf6, #ec4899))' }}>
            <span className="text-white text-4xl font-black">D</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Dance<span className="text-purple-500">Flow</span></h1>
          <p className="text-gray-400 mt-2 font-medium">Gestão Inteligente para sua Escola</p>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl p-8 backdrop-blur-xl border border-white/10 shadow-2xl" style={{ backgroundColor: 'rgba(26, 26, 46, 0.8)' }}>
          <div className="flex gap-4 mb-8 p-1 bg-black/20 rounded-2xl">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${isLogin ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${!isLogin ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Cadastro
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {message.text && (
              <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                {message.text}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors" size={20} />
                <input
                  type="email"
                  required
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
                />
              </div>

              {!isLogin && (
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors" size={20} />
                  <input
                    type="tel"
                    required
                    placeholder="Telefone / WhatsApp"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
                  />
                </div>
              )}

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors" size={20} />
                <input
                  type="password"
                  required
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-purple-900/20 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Entrar no Sistema' : 'Criar minha Conta'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-8">
            {isLogin ? 'Novo por aqui?' : 'Já tem uma conta?'}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-purple-400 font-bold hover:text-purple-300 transition-colors"
            >
              {isLogin ? 'Crie seu cadastro' : 'Faça seu login'}
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-gray-600 text-xs font-medium uppercase tracking-widest">
          DanceFlow Management v1.0
        </p>
      </div>
    </div>
  )
}
