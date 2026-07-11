import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { supabase } from './lib/supabase'
import { Profile } from './types'
import Layout from './components/Layout'
import QuantumLoader from './components/QuantumLoader'
import CookieBanner from './components/CookieBanner'
import PrivacyPolicyModal from './components/PrivacyPolicyModal'
import MfaChallenge from './components/MfaChallenge'

// Lazy-load de todas as páginas: carregadas só quando o usuário navegar até elas
const Dashboard     = lazy(() => import('./pages/Dashboard'))
const Students      = lazy(() => import('./pages/Students'))
const TrialClasses  = lazy(() => import('./pages/TrialClasses'))
const Financial     = lazy(() => import('./pages/Financial'))
const Classes       = lazy(() => import('./pages/Classes'))
const AttendancePage= lazy(() => import('./pages/Attendance'))
const Inventory     = lazy(() => import('./pages/Inventory'))
const Team          = lazy(() => import('./pages/Team'))
const Events        = lazy(() => import('./pages/Events'))
const Theaters      = lazy(() => import('./pages/Theaters'))
const SettingsPage  = lazy(() => import('./pages/Settings'))
const AiConsultant  = lazy(() => import('./pages/AiConsultant'))
const Auth          = lazy(() => import('./pages/Auth'))
const Admin         = lazy(() => import('./pages/Admin'))
const LandingPage   = lazy(() => import('./pages/LandingPage'))
const Checkout      = lazy(() => import('./pages/Checkout'))
const Schedule      = lazy(() => import('./pages/Schedule'))
const Shop          = lazy(() => import('./pages/Shop'))
const Evaluations   = lazy(() => import('./pages/Evaluations'))

function PendingApproval({ status, onSignOut }: { status: string, onSignOut: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a0f]">
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
      <div className="w-full max-w-md relative z-10 text-center">
        <div className="h-20 w-20 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl bg-black/40 border border-white/10">
          <span className="text-4xl">{status === 'expired' ? '💳' : '⏳'}</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-4">
          {status === 'pending' ? 'Conta em Análise' : status === 'expired' ? 'Assinatura Expirada' : 'Conta Suspensa'}
        </h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          {status === 'pending' 
            ? 'Seu cadastro foi recebido com sucesso! Estamos aguardando a confirmação do pagamento para liberar o seu acesso ao sistema.'
            : status === 'expired'
            ? 'Sua assinatura chegou ao fim! Escolha um plano para renovar seu acesso e continuar usando o sistema instantaneamente.'
            : 'Sua conta encontra-se suspensa no momento. Por favor, entre em contato com o suporte.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          {status !== 'suspended' && (
            <Link
              to="/checkout"
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] text-white rounded-xl font-bold transition-all text-center"
            >
              {status === 'expired' ? 'Renovar Assinatura' : 'Assinar Agora'}
            </Link>
          )}
          <button 
            onClick={onSignOut}
            className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/10"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mfaRequired, setMfaRequired] = useState(false)
  
  // Estados para conformidade LGPD / Políticas
  const [policyModalOpen, setPolicyModalOpen] = useState(false)
  const [policyInitialTab, setPolicyInitialTab] = useState<'terms' | 'privacy'>('terms')

  const openTerms = () => {
    setPolicyInitialTab('terms')
    setPolicyModalOpen(true)
  }

  const openPrivacy = () => {
    setPolicyInitialTab('privacy')
    setPolicyModalOpen(true)
  }

  // ── Logout ao fechar o navegador/aba ──────────────────────────────────────
  // sessionStorage é apagado quando a aba fecha, mas persiste em reloads (F5).
  // Se não há a flag "tab_active", significa que é uma abertura nova → faz logout.
  useEffect(() => {
    const tabActive = sessionStorage.getItem('tab_active')
    if (!tabActive) {
      // Nova abertura do navegador: encerra sessão persistida no localStorage
      supabase.auth.signOut().then(() => {
        sessionStorage.setItem('tab_active', '1')
      })
    } else {
      sessionStorage.setItem('tab_active', '1')
    }
  }, [])
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Fetch profile function
    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
        if (error) {
          console.error('Error fetching profile:', error)
        }
        setProfile(data || null)
      } catch (err) {
        console.error('Exception during fetchProfile:', err)
      } finally {
        setLoading(false)
      }
    }

    const checkMfa = async () => {
      try {
        if (!supabase.auth || !supabase.auth.mfa) {
          console.warn('Supabase MFA API is not available on this client.')
          return
        }
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (!error && data) {
          if (data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
            setMfaRequired(true)
          } else {
            setMfaRequired(false)
          }
        }
      } catch (e) {
        console.error('MFA check error:', e)
      }
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        checkMfa()
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        localStorage.setItem('resetting_password', 'true')
        navigate('/auth')
      }
      setSession(session)
      if (session?.user) {
        setLoading(true)
        checkMfa()
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setMfaRequired(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <QuantumLoader size={45} speed={1.75} color="#8b5cf6" />
      </div>
    )
  }

  if (session && mfaRequired) {
    return <MfaChallenge onVerified={() => setMfaRequired(false)} />
  }

  const isExpired = profile?.email === 'teste@flow.com.br' ? false : (profile?.expires_at ? new Date(profile.expires_at) < new Date() : false);
  const isBlocked = profile && (profile.status === 'pending' || profile.status === 'suspended' || isExpired)
  const isCheckoutRoute = location.pathname === '/checkout';
  const isResettingPassword = localStorage.getItem('resetting_password') === 'true';

  if (session && isBlocked && !isCheckoutRoute) {
    const blockReason = isExpired && profile.status === 'active' ? 'expired' : profile.status;
    return <PendingApproval status={blockReason} onSignOut={() => supabase.auth.signOut()} />
  }

  return (
    <>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
          <QuantumLoader size={40} speed={1.75} color="#8b5cf6" />
        </div>
      }>
        <Routes>
          <Route path="/auth" element={(!session || isResettingPassword) ? <Auth /> : <Navigate to="/" />} />
          <Route path="/checkout" element={session ? <Checkout /> : <Navigate to="/auth" />} />
          
          <Route path="/" element={!session ? <LandingPage /> : (profile?.status === 'active' && !isExpired ? <Layout /> : <Navigate to="/auth" />)}>
            <Route index element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : <Dashboard />} />
            <Route path="students" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : <Students />} />
            <Route path="trials" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : <TrialClasses />} />
            <Route path="financial" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : (profile?.role === 'coordinator' ? <Navigate to="/" /> : <Financial />)} />
            <Route path="classes" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : <Classes />} />
            <Route path="events" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : <Events />} />
            <Route path="theaters" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : <Theaters />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="evaluations" element={<Evaluations />} />
            <Route path="inventory" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : (['secretary', 'coordinator'].includes(profile?.role || '') ? <Navigate to="/" /> : <Inventory />)} />
            <Route path="team" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : (['secretary', 'coordinator'].includes(profile?.role || '') ? <Navigate to="/" /> : <Team />)} />
            <Route path="ai-consultant" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : <AiConsultant />} />
            <Route path="settings" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : (['secretary', 'coordinator', 'financial_director'].includes(profile?.role || '') ? <Navigate to="/" /> : <SettingsPage />)} />
            <Route path="shop" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : <Shop />} />
            <Route path="admin" element={(profile?.role === 'admin' || profile?.email === 'teste@flow.com.br') ? <Admin /> : <Navigate to="/" />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
      <CookieBanner onOpenTerms={openTerms} onOpenPrivacy={openPrivacy} />
      <PrivacyPolicyModal isOpen={policyModalOpen} onClose={() => setPolicyModalOpen(false)} initialTab={policyInitialTab} />
    </>
  )
}
