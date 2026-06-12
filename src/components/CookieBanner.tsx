import { useState, useEffect } from 'react'
import { ShieldAlert, Cookie } from 'lucide-react'

interface CookieBannerProps {
  onOpenTerms: () => void
  onOpenPrivacy: () => void
}

export default function CookieBanner({ onOpenTerms, onOpenPrivacy }: CookieBannerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('danceflow_cookie_consent')
    if (consent !== 'true') {
      // Pequeno atraso para dar uma sensação suave de animação de entrada
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('danceflow_cookie_consent', 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9990] p-4 sm:p-6 bg-[#0a0a0f]/90 backdrop-blur-md border-t border-purple-500/20 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] animate-slide-up">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left Side: Info */}
        <div className="flex items-start gap-3 flex-1">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
            <Cookie size={20} className="animate-pulse" />
          </div>
          <div>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Nós utilizamos cookies e armazenamento local essenciais para garantir que sua sessão permaneça ativa de forma segura e suas preferências de navegação sejam salvas. Ao continuar navegando, você concorda com nossos{' '}
              <button 
                onClick={onOpenTerms}
                className="text-purple-400 hover:text-purple-300 underline font-bold cursor-pointer transition-colors"
              >
                Termos de Uso
              </button>{' '}
              e{' '}
              <button 
                onClick={onOpenPrivacy}
                className="text-purple-400 hover:text-purple-300 underline font-bold cursor-pointer transition-colors"
              >
                Política de Privacidade
              </button>{' '}
              em conformidade com a LGPD.
            </p>
          </div>
        </div>

        {/* Right Side: Action Button */}
        <div className="shrink-0 w-full md:w-auto">
          <button
            onClick={handleAccept}
            className="w-full md:w-auto rounded-xl px-6 py-3 text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all cursor-pointer text-center"
          >
            Aceitar e Continuar
          </button>
        </div>

      </div>
    </div>
  )
}
