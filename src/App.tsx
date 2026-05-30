import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Profile } from './types'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import TrialClasses from './pages/TrialClasses'
import Financial from './pages/Financial'
import Classes from './pages/Classes'
import AttendancePage from './pages/Attendance'
import Inventory from './pages/Inventory'
import Team from './pages/Team'
import Events from './pages/Events'
import SettingsPage from './pages/Settings'
import AiConsultant from './pages/AiConsultant'
import Auth from './pages/Auth'
import Admin from './pages/Admin'
import LandingPage from './pages/LandingPage'
import Checkout from './pages/Checkout'
import Schedule from './pages/Schedule'
import Shop from './pages/Shop'

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
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch profile function
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(data)
      setLoading(false)
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        setLoading(true)
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="h-12 w-12 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
      </div>
    )
  }

  const isExpired = profile?.expires_at ? new Date(profile.expires_at) < new Date() : false;
  const isBlocked = profile && (profile.status === 'pending' || profile.status === 'suspended' || isExpired)
  const isCheckoutRoute = location.pathname === '/checkout';

  if (session && isBlocked && !isCheckoutRoute) {
    const blockReason = isExpired && profile.status === 'active' ? 'expired' : profile.status;
    return <PendingApproval status={blockReason} onSignOut={() => supabase.auth.signOut()} />
  }

  return (
    <Routes>
      <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/" />} />
      <Route path="/checkout" element={session ? <Checkout /> : <Navigate to="/auth" />} />
      
      <Route path="/" element={!session ? <LandingPage /> : (profile?.status === 'active' && !isExpired ? <Layout /> : <Navigate to="/auth" />)}>
        <Route index element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : <Dashboard />} />
        <Route path="students" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : <Students />} />
        <Route path="trials" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : <TrialClasses />} />
        <Route path="financial" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : <Financial />} />
        <Route path="classes" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : <Classes />} />
        <Route path="events" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : <Events />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="inventory" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : (profile?.role === 'secretary' ? <Navigate to="/" /> : <Inventory />)} />
        <Route path="team" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : (profile?.role === 'secretary' ? <Navigate to="/" /> : <Team />)} />
        <Route path="ai-consultant" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : <AiConsultant />} />
        <Route path="settings" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : (profile?.role === 'secretary' ? <Navigate to="/" /> : <SettingsPage />)} />
        <Route path="shop" element={profile?.role === 'teacher' ? <Navigate to="/attendance" /> : <Shop />} />
        <Route path="admin" element={profile?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
