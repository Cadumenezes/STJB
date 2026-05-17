import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Financial from './pages/Financial'
import Classes from './pages/Classes'
import AttendancePage from './pages/Attendance'
import Inventory from './pages/Inventory'
import Team from './pages/Team'
import SettingsPage from './pages/Settings'
import Auth from './pages/Auth'

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
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

  return (
    <Routes>
      <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/" />} />
      
      <Route path="/" element={session ? <Layout /> : <Navigate to="/auth" />}>
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="financial" element={<Financial />} />
        <Route path="classes" element={<Classes />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="team" element={<Team />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
