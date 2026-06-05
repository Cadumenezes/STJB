import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Lock, LogOut, ShieldAlert } from 'lucide-react'

export default function MfaChallenge({ onVerified }: { onVerified: () => void }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [factorId, setFactorId] = useState('')

  useEffect(() => {
    async function init() {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors()
        if (error) throw error
        // Find the first active verified totp factor
        const totp = data.totp?.find(f => f.status === 'verified')
        if (totp) {
          setFactorId(totp.id)
        } else {
          const firstFactor = data.all?.find(f => f.status === 'verified')
          if (firstFactor) {
            setFactorId(firstFactor.id)
          }
        }
      } catch (err: any) {
        console.error('Error listing MFA factors:', err)
        setError('Erro ao carregar fatores de autenticação.')
      }
    }
    init()
  }, [])

  async function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (code.length !== 6 || !factorId) return

    setLoading(true)
    setError('')

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      })
      if (verifyError) throw verifyError

      onVerified()
    } catch (err: any) {
      console.error('MFA Verification failed:', err)
      setError(err.message || 'Código incorreto ou expirado. Tente novamente.')
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (code.length === 6 && factorId) {
      handleVerify()
    }
  }, [code, factorId])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0f] p-6">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-[#12121a] border border-white/5 p-8 rounded-3xl shadow-2xl relative z-10 text-center space-y-6">
        <div className="h-16 w-16 rounded-2xl mx-auto flex items-center justify-center bg-purple-500/10 border border-purple-500/20 text-purple-400">
          <Lock size={28} />
        </div>

        <div>
          <h2 className="text-xl font-black text-white">Verificação de Duas Etapas</h2>
          <p className="text-xs text-gray-400 mt-2">
            Insira o código de 6 dígitos gerado no seu aplicativo de autenticação.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-semibold text-red-400 flex items-center gap-2 justify-center">
              <ShieldAlert size={14} />
              {error}
            </div>
          )}

          <input
            type="text"
            maxLength={6}
            pattern="\d*"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            disabled={loading || !factorId}
            placeholder="000000"
            className="w-full tracking-[1.5em] text-center text-xl font-black bg-black/40 border border-white/10 rounded-2xl py-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 placeholder:tracking-normal placeholder:text-gray-700 text-white"
          />

          <button
            type="submit"
            disabled={loading || code.length !== 6 || !factorId}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-900/15"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Confirmar Código'
            )}
          </button>
        </form>

        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/10 flex items-center justify-center gap-2 text-xs cursor-pointer"
        >
          <LogOut size={14} />
          Sair da Conta
        </button>
      </div>
    </div>
  )
}
