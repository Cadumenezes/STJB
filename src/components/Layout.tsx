import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Music,
  ClipboardCheck,
  Package,
  UserCog,
  Settings,
  Menu,
  X,
  LogOut,
  HelpCircle,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/students', label: 'Alunos', icon: Users },
  { path: '/financial', label: 'Financeiro', icon: DollarSign },
  { path: '/classes', label: 'Turmas', icon: Music },
  { path: '/attendance', label: 'Chamada', icon: ClipboardCheck },
  { path: '/inventory', label: 'Estoque', icon: Package },
  { path: '/team', label: 'Equipe', icon: UserCog },
  { path: '/settings', label: 'Configurações', icon: Settings },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [schoolName, setSchoolName] = useState('DanceFlow')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const location = useLocation()

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const { data } = await supabase.from('school_settings').select('*').limit(1).single()
    if (data) {
      setSchoolName(data.school_name || 'DanceFlow')
      setLogoUrl(data.logo_url)
      if (data.bg_color) document.documentElement.style.setProperty('--bg-primary', data.bg_color)
      if (data.bg_card) document.documentElement.style.setProperty('--bg-card', data.bg_card)
      if (data.text_color) document.documentElement.style.setProperty('--text-primary', data.text_color)
      if (data.accent_color) document.documentElement.style.setProperty('--accent-color', data.accent_color)
      
      const titleSize = data.title_font_size || 32
      const subtitleSize = data.subtitle_font_size || 16
      document.documentElement.style.setProperty('--title-size', `${titleSize}px`)
      document.documentElement.style.setProperty('--subtitle-size', `${subtitleSize}px`)
    }
  }

  const getHelpContent = () => {
    switch (location.pathname) {
      case '/':
        return {
          title: 'Guia do Dashboard',
          content: 'Aqui você tem uma visão geral da sua escola. Veja o total de alunos ativos, mensalidades atrasadas, fluxo de caixa do dia e os aniversariantes da semana para não esquecer de dar os parabéns!'
        }
      case '/students':
        return {
          title: 'Guia de Alunos',
          content: 'Gerencie todos os seus alunos. Você pode cadastrar novos alunos, editar informações, ver o status de pagamento e filtrar por turma. Use o botão "Novo Aluno" para começar.'
        }
      case '/financial':
        return {
          title: 'Guia Financeiro',
          content: 'Controle o dinheiro da sua escola. Registre entradas (mensalidades, vendas) e saídas (aluguel, salários). O sistema calcula automaticamente o saldo do mês para você.'
        }
      case '/classes':
        return {
          title: 'Guia de Turmas',
          content: 'Organize suas aulas. Crie turmas, defina os horários, estilos de dança e limite de alunos. Você pode vincular cada turma a um professor específico.'
        }
      case '/attendance':
        return {
          title: 'Guia de Chamada',
          content: 'Marque a presença do dia. Selecione a turma e a data, e marque quem veio (P), quem faltou (F) ou quem se atrasou (A). Não esqueça de salvar ao finalizar!'
        }
      case '/inventory':
        return {
          title: 'Guia de Estoque',
          content: 'Controle seus produtos (sapatilhas, uniformes, garrafas). Monitore a quantidade em estoque e o valor de venda. O sistema avisa quando os itens estiverem acabando.'
        }
      case '/team':
        return {
          title: 'Guia de Equipe',
          content: 'Gerencie seus professores e funcionários. Cadastre especialidades, salários e informações de contato. Mantenha os dados da sua equipe sempre atualizados.'
        }
      case '/settings':
        return {
          title: 'Guia de Configurações',
          content: 'Personalize o DanceFlow com a cara da sua escola. Mude o nome, suba seu logo e altere as cores de fundo, cards e texto. Tudo muda em tempo real!'
        }
      default:
        return {
          title: 'Dicas DanceFlow',
          content: 'Navegue pelo menu lateral para acessar os diferentes módulos da sua escola. Cada página possui ferramentas específicas para facilitar seu dia a dia.'
        }
    }
  }

  const help = getHelpContent()

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex flex-col items-center justify-center py-4 px-4 relative" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <button
              className="absolute top-4 right-4 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} style={{ color: 'var(--text-secondary)' }} />
            </button>

            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-20 w-auto max-w-[200px] object-contain" />
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-none text-white font-bold text-2xl shadow-lg"
                style={{ background: 'var(--accent-gradient, linear-gradient(135deg, #8b5cf6, #ec4899))' }}
              >
                {schoolName.charAt(0)}
              </div>
            )}
            <span className="mt-3 text-lg font-bold text-center leading-tight" style={{ color: 'var(--text-primary)' }}>
              {schoolName}
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-none px-3 py-2 text-lg font-semibold transition-all duration-200 ${
                    isActive ? 'shadow-lg' : 'hover:opacity-80'
                  }`
                }
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'var(--accent-color)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                })}
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}

            <button
              onClick={() => { setHelpOpen(true); setSidebarOpen(false); }}
              className="flex w-full items-center gap-3 rounded-none px-3 py-2 text-lg font-semibold text-[var(--text-secondary)] hover:opacity-80 transition-all duration-200"
            >
              <HelpCircle size={20} />
              Dicas
            </button>
          </nav>

          {/* Footer */}
          <div className="p-3 space-y-2" style={{ borderTop: '1px solid var(--border-color)' }}>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex w-full items-center gap-3 rounded-none px-3 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
            >
              <LogOut size={20} />
              Sair do Sistema
            </button>

            <div className="rounded-none p-4" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                DanceFlow v1.0
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Sistema de Gestão
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="flex h-16 items-center gap-4 px-6 lg:px-8"
          style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}
        >
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} style={{ color: 'var(--text-primary)' }} />
          </button>
          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <Outlet />
        </main>
      </div>

      {/* Help Modal */}
      <Modal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title={help.title}>
        <div className="space-y-4">
          <div className="rounded-2xl p-6 bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg p-2 bg-purple-500/20">
                <HelpCircle size={24} className="text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Como funciona esta página?</h3>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {help.content}
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 rounded-xl bg-black/20 border border-white/5">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Dica Rápida</p>
              <p className="text-sm text-[var(--text-muted)]">Você pode mudar as cores e o logo da escola no menu de Configurações para deixar o sistema com a sua cara!</p>
            </div>
          </div>

          <button
            onClick={() => setHelpOpen(false)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all"
          >
            Entendi, obrigado!
          </button>
        </div>
      </Modal>
    </div>
  )
}
