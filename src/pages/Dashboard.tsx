import { useEffect, useState } from 'react'
import { Users, AlertTriangle, DollarSign, Cake, TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts'
import { supabase } from '../lib/supabase'

interface DashboardData {
  totalStudents: number
  overduePayments: number
  cashFlowToday: number
  todayIncome: number
  todayExpense: number
  birthdaysThisWeek: { name: string; birth_date: string }[]
  monthlyChartData: any[]
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    totalStudents: 0,
    overduePayments: 0,
    cashFlowToday: 0,
    todayIncome: 0,
    todayExpense: 0,
    birthdaysThisWeek: [],
    monthlyChartData: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    try {
      // Total students
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Overdue payments
      const today = new Date().toISOString().split('T')[0]
      const { count: overdueCount } = await supabase
        .from('monthly_payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'overdue')

      // Today's income
      const { data: incomeData } = await supabase
        .from('financial_entries')
        .select('amount')
        .eq('type', 'income')
        .eq('date', today)

      const todayIncome = incomeData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0

      // Today's expenses
      const { data: expenseData } = await supabase
        .from('financial_entries')
        .select('amount')
        .eq('type', 'expense')
        .eq('date', today)

      const todayExpense = expenseData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0

      // Birthdays this week
      const now = new Date()
      const dayOfWeek = now.getDay()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - dayOfWeek)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)

      const { data: students } = await supabase
        .from('students')
        .select('name, birth_date')
        .eq('status', 'active')

      const birthdaysThisWeek = (students || []).filter((s) => {
        if (!s.birth_date) return false
        const birth = new Date(s.birth_date + 'T12:00:00')
        const thisYearBday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate())
        return thisYearBday >= startOfWeek && thisYearBday <= endOfWeek
      })

      // Fetch last 6 months for chart
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      const { data: allFinances } = await supabase
        .from('financial_entries')
        .select('*')
        .gte('date', sixMonthsAgo.toISOString().split('T')[0]);

      const monthlyDataMap: Record<string, any> = {};
      
      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStr = d.toISOString().slice(0, 7);
        const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
        monthlyDataMap[monthStr] = { name: monthLabel, Entradas: 0, Saídas: 0, fullMonth: monthStr };
      }

      if (allFinances) {
        allFinances.forEach(entry => {
          const monthStr = entry.date.slice(0, 7);
          if (monthlyDataMap[monthStr]) {
            if (entry.type === 'income') monthlyDataMap[monthStr].Entradas += Number(entry.amount);
            else if (entry.type === 'expense') monthlyDataMap[monthStr].Saídas += Number(entry.amount);
          }
        });
      }

      const monthlyChartData = Object.values(monthlyDataMap).sort((a, b) => a.fullMonth.localeCompare(b.fullMonth));

      setData({
        totalStudents: studentCount || 0,
        overduePayments: overdueCount || 0,
        cashFlowToday: todayIncome - todayExpense,
        todayIncome,
        todayExpense,
        birthdaysThisWeek,
        monthlyChartData,
      })
    } catch (err) {
      console.error('Error loading dashboard:', err)
    }
    setLoading(false)
  }

  const cards = [
    {
      title: 'Total de Alunos',
      value: data.totalStudents,
      icon: Users,
      gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      iconBg: 'rgba(139, 92, 246, 0.2)',
    },
    {
      title: 'Mensalidades Atrasadas',
      value: data.overduePayments,
      icon: AlertTriangle,
      gradient: 'linear-gradient(135deg, #f43f5e, #be123c)',
      iconBg: 'rgba(244, 63, 94, 0.2)',
    },
    {
      title: 'Fluxo de Caixa Hoje',
      value: `R$ ${data.cashFlowToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      iconBg: 'rgba(16, 185, 129, 0.2)',
    },
    {
      title: 'Aniversariantes da Semana',
      value: data.birthdaysThisWeek.length,
      icon: Cake,
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
      iconBg: 'rgba(245, 158, 11, 0.2)',
    },
  ]

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--accent-color)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-10">
      {/* Header Section with Background Highlight */}
      <div 
        className="p-8 sm:p-10 pb-16 rounded-3xl border border-white/5 shadow-2xl mb-52 relative overflow-hidden"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
      >
        {/* Accent Glow */}
        <div 
          className="absolute -left-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-20"
          style={{ backgroundColor: 'var(--accent-color)' }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8 relative z-10">
          <div className="space-y-4">
            <h1 
              className="font-black tracking-tighter leading-tight inline-block px-16 py-8 rounded-2xl shadow-2xl shadow-purple-500/30" 
              style={{ 
                backgroundColor: 'var(--accent-color)', 
                color: '#fff',
                fontSize: 'var(--title-size, 32px)' 
              }}
            >
              Dashboard
            </h1>
            <br />
            <p 
              className="font-bold inline-block px-12 py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
               style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)' }}
            >
              Bem-vindo de volta! Aqui está o resumo da sua escola hoje.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-4 mb-12">
        {cards.map((card) => (
          <div
            key={card.title}
            className="group relative overflow-hidden rounded-3xl p-4 transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-10" style={{ background: card.gradient }} />
            <div className="relative flex flex-col items-center justify-center h-28 text-center gap-2">
              <div className="rounded-xl p-2" style={{ background: card.iconBg }}>
                <card.icon size={26} style={{ color: card.gradient.includes('#8b5cf6') ? '#8b5cf6' : card.gradient.includes('#f43f5e') ? '#f43f5e' : card.gradient.includes('#10b981') ? '#10b981' : '#f59e0b' }} />
              </div>
              <div className="w-full">
                <p className="text-2xl sm:text-3xl font-black leading-none" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-wrap" style={{ color: 'var(--text-secondary)' }}>{card.title}</p>
              </div>
            </div>
            <div className="absolute left-0 top-0 h-full w-1" style={{ background: card.gradient }} />
          </div>
        ))}
      </div>

      
      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 mb-12">
        <div className="rounded-3xl p-8 sm:p-10" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h2 className="text-lg font-bold mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="p-2 rounded-xl bg-purple-500/20">
              <TrendingUp size={20} className="text-purple-400" />
            </div>
            Faturamento Mensal (Últimos 6 meses)
          </h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v}`} />
                <RechartsTooltip 
                  cursor={{ fill: 'var(--border-color)', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                  itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                />
                <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]}>
                  {data.monthlyChartData.map((entry: any, index: number) => (
                    <Cell key={`cell-in-${index}`} fill="url(#colorEntradas)" />
                  ))}
                </Bar>
                <Bar dataKey="Saídas" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                  {data.monthlyChartData.map((entry: any, index: number) => (
                    <Cell key={`cell-out-${index}`} fill="url(#colorSaidas)" />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb7185" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Today's Flow Detail + Birthdays */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cash Flow Detail */}
        <div
          className="rounded-2xl p-8 sm:p-10"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Fluxo de Caixa - Hoje
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
                  <TrendingUp size={20} className="text-emerald-400" />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Entradas</span>
              </div>
              <span className="text-lg font-bold text-emerald-400">
                R$ {data.todayIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)' }}>
                  <TrendingDown size={20} className="text-rose-400" />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Saídas</span>
              </div>
              <span className="text-lg font-bold text-rose-400">
                R$ {data.todayExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))', border: '1px solid var(--border-color)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Saldo do Dia</span>
              <span className={`text-lg font-bold ${data.cashFlowToday >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                R$ {data.cashFlowToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Birthdays */}
        <div
          className="rounded-2xl p-8 sm:p-10"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            🎂 Aniversariantes da Semana
          </h2>
          {data.birthdaysThisWeek.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Cake size={48} style={{ color: 'var(--text-muted)' }} className="mb-3" />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Nenhum aniversariante esta semana
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.birthdaysThisWeek.map((student, i) => {
                const birth = new Date(student.birth_date + 'T12:00:00')
                const day = birth.getDate().toString().padStart(2, '0')
                const month = (birth.getMonth() + 1).toString().padStart(2, '0')
                return (
                  <div
                    key={i}
                    className="flex items-center gap-4 rounded-xl p-4 transition-colors"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
                    >
                      🎉
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{student.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{day}/{month}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
