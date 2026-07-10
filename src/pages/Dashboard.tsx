import { useEffect, useState } from 'react'
import { Users, AlertTriangle, DollarSign, Cake, TrendingUp, TrendingDown, Calendar, Image as ImageIcon, BookOpen } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import QuantumLoader from '../components/QuantumLoader'

interface DashboardData {
  totalStudents: number
  overduePayments: number
  cashFlowToday: number
  todayIncome: number
  todayExpense: number
  birthdaysThisWeek: { name: string; birth_date: string }[]
  monthlyChartData: any[]
  totalClasses?: number
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
    totalClasses: 0,
  })
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [eventsWithPhotos, setEventsWithPhotos] = useState<any[]>([])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  useEffect(() => {
    loadDashboard()
  }, [])

  // Auto-play slideshow for events photos
  useEffect(() => {
    if (eventsWithPhotos.length === 0) return
    const allPhotos = eventsWithPhotos.flatMap(e => 
      (e.photo_urls || []).map((url: string) => ({
        url,
        name: e.name,
        date: e.date,
        location: e.location,
        description: e.description
      }))
    )
    if (allPhotos.length === 0) return

    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % allPhotos.length)
    }, 5000) // Cycle every 5 seconds
    return () => clearInterval(interval)
  }, [eventsWithPhotos])

  async function loadDashboard() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(profileData)
      }
      
      // Total students
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'scholarship', 'partial_scholarship'])

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
        .in('status', ['active', 'scholarship', 'partial_scholarship'])

      const birthdaysThisWeek = (students || []).filter((s) => {
        if (!s.birth_date) return false
        const birth = new Date(s.birth_date + 'T12:00:00')
        const thisYearBday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate())
        return thisYearBday >= startOfWeek && thisYearBday <= endOfWeek
      })

      // Fetch current year data (from January 1st of current year)
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;
      const { data: allFinances } = await supabase
          .from('financial_entries')
          .select('*')
          .gte('date', startOfYear);

      const monthlyDataMap: Record<string, any> = {};
      
      // Initialize January to December of the current year
      for (let month = 0; month < 12; month++) {
        const d = new Date(currentYear, month, 1);
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

      // Fetch events with photos
      const { data: eventsData } = await supabase.from('events').select('*').order('date', { ascending: true })
      const filteredEvents = (eventsData || []).filter(e => e.photo_urls && e.photo_urls.length > 0)
      setEventsWithPhotos(filteredEvents)

      // Fetch total active classes
      const { count: classesCount } = await supabase
        .from('dance_classes')
        .select('*', { count: 'exact', head: true })

      setData({
        totalStudents: studentCount || 0,
        overduePayments: overdueCount || 0,
        cashFlowToday: todayIncome - todayExpense,
        todayIncome,
        todayExpense,
        birthdaysThisWeek,
        monthlyChartData,
        totalClasses: classesCount || 0,
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
    ...(profile?.role !== 'coordinator' ? [
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
      }
    ] : [
      {
        title: 'Turmas Ativas',
        value: data.totalClasses || 0,
        icon: BookOpen,
        gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
        iconBg: 'rgba(6, 182, 212, 0.2)',
      }
    ]),
    {
      title: 'Aniversariantes da Semana',
      value: data.birthdaysThisWeek.length,
      icon: Cake,
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
      iconBg: 'rgba(245, 158, 11, 0.2)',
    },
  ]

  // Extract all photos list for the slideshow animation
  const allPhotosList = eventsWithPhotos.flatMap(e => 
    (e.photo_urls || []).map((url: string) => ({
      url,
      eventName: e.name,
      eventDate: e.date,
      eventLocation: e.location,
      eventDescription: e.description
    }))
  )

  const activePhotoObj = allPhotosList[currentSlideIndex]

  const nextSlide = () => setCurrentSlideIndex(prev => (prev + 1) % allPhotosList.length)
  const prevSlide = () => setCurrentSlideIndex(prev => (prev - 1 + allPhotosList.length) % allPhotosList.length)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <QuantumLoader size={40} speed={1.75} color="var(--accent-color)" />
      </div>
    )
  }

  if (profile?.role === 'secretary') {
    return (
      <div className="flex flex-col pb-10">
        {/* Header Section with Background Highlight - LEVEMENTE ARREDONDADO */}
        <div 
          className="p-5 sm:p-8 md:p-10 pb-10 sm:pb-16 rounded-3xl border border-white/5 shadow-2xl mb-8 sm:mb-12 relative overflow-hidden"
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
                className="font-black tracking-tighter leading-tight inline-block py-4 sm:py-8 rounded-2xl shadow-2xl shadow-purple-500/30" 
                style={{ 
                  backgroundColor: 'var(--accent-color)', 
                  color: '#fff',
                  fontSize: 'var(--title-size, 32px)',
                  paddingLeft: 'clamp(16px, 4vw, 40px)',
                  paddingRight: 'clamp(16px, 4vw, 40px)'
                }}
              >
                Painel
              </h1>
              <br />
              <p 
                className="font-bold inline-block py-3 sm:py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
               style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: 'clamp(12px, 3vw, 32px)', paddingRight: 'clamp(12px, 3vw, 32px)' }}
              >
                Bem-vindo de volta! Aqui está o resumo da sua escola hoje.
              </p>
            </div>
          </div>
        </div>

        {/* Birthdays - LEVEMENTE ARREDONDADO */}
        <div
          className="rounded-3xl p-8 sm:p-12 border max-w-2xl mx-auto w-full mt-8 animate-fade-in"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <h2 className="text-xl font-black mb-6 uppercase tracking-wider flex items-center gap-3 text-white">
            <Cake size={24} className="text-amber-400" />
            Aniversariantes da Semana
          </h2>
          {data.birthdaysThisWeek.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Cake size={64} style={{ color: 'var(--text-muted)' }} className="mb-4" />
              <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                Nenhum aniversariante esta semana
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.birthdaysThisWeek.map((student, i) => {
                const birth = new Date(student.birth_date + 'T12:00:00')
                const day = birth.getDate().toString().padStart(2, '0')
                const month = (birth.getMonth() + 1).toString().padStart(2, '0')
                return (
                  <div
                    key={i}
                    className="flex items-center gap-4 rounded-none p-4 transition-colors border border-white/5"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-none text-xl shrink-0"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
                    >
                      🎉
                    </div>
                    <div>
                      <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{student.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Dia {day}/{month}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-10 items-center">
      {/* Header Section with Background Highlight - LEVEMENTE ARREDONDADO */}
      <div 
        className="p-5 sm:p-8 md:p-10 pb-10 sm:pb-16 rounded-3xl border border-white/5 shadow-2xl mb-8 sm:mb-12 relative overflow-hidden max-w-7xl mx-auto w-full"
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
              className="font-black tracking-tighter leading-tight inline-block py-4 sm:py-8 rounded-2xl shadow-2xl shadow-purple-500/30" 
              style={{ 
                backgroundColor: 'var(--accent-color)', 
                color: '#fff',
                fontSize: 'var(--title-size, 32px)',
                paddingLeft: 'clamp(16px, 4vw, 40px)',
                paddingRight: 'clamp(16px, 4vw, 40px)'
              }}
            >
              Visão geral
            </h1>
            <br />
            <p 
              className="font-bold inline-block py-3 sm:py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
               style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: 'clamp(12px, 3vw, 32px)', paddingRight: 'clamp(12px, 3vw, 32px)' }}
            >
              Bem-vindo de volta! Aqui está o resumo da sua escola hoje.
            </p>
          </div>
        </div>
      </div>

      {/* 🎪 Event Photos & Summary Cards Layout (Side-by-Side when photos exist) */}
      {allPhotosList.length > 0 && activePhotoObj ? (
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-8 sm:mb-16 md:mb-24 items-stretch max-w-7xl mx-auto w-full lg:h-[520px]">
          {/* Left Side: Slideshow Card (flex-[2] w-full) */}
          <div className="flex-[2] w-full flex flex-col justify-between">
            <div className="rounded-none border border-white/5 shadow-2xl p-6 sm:p-8 relative overflow-hidden h-full flex flex-col" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-6 w-2 rounded-full bg-purple-500" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <ImageIcon size={16} className="text-purple-400" />
                  Galeria de Eventos & Espetáculos
                </h3>
              </div>
     
              <div className="relative h-80 sm:h-[400px] lg:h-full lg:flex-1 min-h-[320px] w-full overflow-hidden rounded-none border border-white/5 shadow-2xl">
                {/* Background Blur Image for premium depth */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src={activePhotoObj.url} 
                    alt="Blur Background" 
                    className="w-full h-full object-cover filter blur-2xl opacity-20 scale-105 transition-all duration-1000"
                  />
                  <div className="absolute inset-0 bg-black/40" />
                </div>
     
                {/* Front Image Slider Container */}
                <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
                  <div className="relative w-full h-full rounded-none overflow-hidden border border-white/10 shadow-2xl group/slide">
                    <img 
                      src={activePhotoObj.url} 
                      alt={activePhotoObj.eventName} 
                      className="w-full h-full object-contain transition-all duration-1000 transform scale-100 hover:scale-[1.01]"
                    />
                    
                    {/* Text Overlay Details */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 text-left flex flex-col justify-end">
                      <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                        Evento: {activePhotoObj.eventName}
                      </span>
                      <h4 className="text-lg sm:text-xl font-black text-white leading-tight mt-1">
                        {activePhotoObj.eventDescription || 'Um espetáculo inesquecível da nossa escola'}
                      </h4>
                      <p className="text-[10px] text-gray-300 mt-2 font-bold flex items-center gap-2">
                        📅 {new Date(activePhotoObj.eventDate + 'T12:00:00').toLocaleDateString('pt-BR')} 
                        {activePhotoObj.eventLocation && ` 📍 ${activePhotoObj.eventLocation}`}
                      </p>
                    </div>
     
                    {/* Left/Right controls */}
                    <button 
                      onClick={prevSlide}
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-purple-650 hover:border-purple-500 text-white transition-all cursor-pointer shadow-lg z-20"
                    >
                      ◀
                    </button>
                    <button 
                      onClick={nextSlide}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-purple-650 hover:border-purple-500 text-white transition-all cursor-pointer shadow-lg z-20"
                    >
                      ▶
                    </button>
                  </div>
                </div>
     
                {/* Carousel Indicator Dots */}
                <div className="absolute bottom-3 inset-x-0 z-20 flex justify-center gap-2">
                  {allPhotosList.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlideIndex ? 'w-5 bg-purple-500' : 'w-1.5 bg-white/30'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Stacked Summary Cards */}
          <div className="flex-1 lg:max-w-xs xl:max-w-sm w-full grid grid-cols-2 gap-4 lg:flex lg:flex-col lg:justify-between lg:h-full">
            {cards.map((card) => (
              <div
                key={card.title}
                className="group relative overflow-hidden rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl flex items-center gap-4 lg:flex-1"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-10" style={{ background: card.gradient }} />
                
                {/* Icon Wrapper */}
                <div className="rounded-none p-3 animate-pulse-slow shrink-0" style={{ background: card.iconBg }}>
                  <card.icon size={24} style={{ color: card.gradient.includes('#8b5cf6') ? '#8b5cf6' : card.gradient.includes('#f43f5e') ? '#f43f5e' : card.gradient.includes('#10b981') ? '#10b981' : '#f59e0b' }} />
                </div>
                
                {/* Card Info */}
                <div className="w-full text-left min-w-0">
                  <p className="text-xl sm:text-2xl font-black leading-none truncate" style={{ color: 'var(--text-primary)' }}>
                    {card.value}
                  </p>
                  <p className="mt-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-wrap" style={{ color: 'var(--text-secondary)' }}>
                    {card.title}
                  </p>
                </div>
                
                <div className="absolute left-0 top-0 h-full w-1" style={{ background: card.gradient }} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Original horizontal grid layout when there are NO photos */
        <div 
          className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4 xl:grid-cols-4 animate-fade-in max-w-7xl mx-auto w-full"
          style={{ marginBottom: '16px' }}
        >
          {cards.map((card) => (
            <div
              key={card.title}
              className="group relative overflow-hidden rounded-2xl p-4 sm:p-6 md:p-8 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-10" style={{ background: card.gradient }} />
              <div className="relative flex flex-col items-center justify-center h-24 sm:h-32 text-center gap-2 sm:gap-3">
                <div className="rounded-none p-3 animate-pulse-slow" style={{ background: card.iconBg }}>
                  <card.icon size={26} style={{ color: card.gradient.includes('#8b5cf6') ? '#8b5cf6' : card.gradient.includes('#f43f5e') ? '#f43f5e' : card.gradient.includes('#10b981') ? '#10b981' : '#f59e0b' }} />
                </div>
                <div className="w-full">
                  <p className="text-xl sm:text-2xl md:text-3xl font-black leading-none" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
                  <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-wrap" style={{ color: 'var(--text-secondary)' }}>{card.title}</p>
                </div>
              </div>
              <div className="absolute left-0 top-0 h-full w-1" style={{ background: card.gradient }} />
            </div>
          ))}
        </div>
      )}

      {/* Charts Section - SQUARE */}
      {profile?.role !== 'coordinator' && (
        <div 
          className="grid grid-cols-1 gap-4 sm:gap-6 max-w-7xl mx-auto w-full"
          style={{ marginTop: '8px', marginBottom: '24px' }}
        >
          <div className="rounded-none p-4 sm:p-8 md:p-10 shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h2 className="text-lg font-bold mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
              <div className="p-2 rounded-none bg-purple-500/20">
                <TrendingUp size={20} className="text-purple-400" />
              </div>
              Faturamento Mensal ({new Date().getFullYear()})
            </h2>
            <div className="w-full overflow-x-auto pb-2 select-none scrollbar-thin">
              <div className="h-[250px] sm:h-[350px] min-w-[600px] md:min-w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthlyChartData} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <YAxis 
                      stroke="var(--text-muted)" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(v) => {
                        if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
                        return `R$ ${v}`;
                      }} 
                    />
                    <RechartsTooltip 
                      cursor={{ stroke: 'var(--border-color)', strokeWidth: 1 }}
                      contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                      itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                      formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
                    <defs>
                      <filter id="glowEntradas" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#10b981" floodOpacity="0.4" />
                      </filter>
                      <filter id="glowSaidas" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#f43f5e" floodOpacity="0.4" />
                      </filter>
                    </defs>
                    <Line 
                      type="monotone" 
                      dataKey="Entradas" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 1, fill: 'var(--bg-card)' }}
                      activeDot={{ r: 7, strokeWidth: 0 }}
                      filter="url(#glowEntradas)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Saídas" 
                      stroke="#f43f5e" 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 1, fill: 'var(--bg-card)' }}
                      activeDot={{ r: 7, strokeWidth: 0 }}
                      filter="url(#glowSaidas)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Flow Detail + Birthdays - SQUARE */}
      <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${profile?.role === 'coordinator' ? 'lg:grid-cols-1 max-w-3xl' : 'lg:grid-cols-2 max-w-7xl'} mx-auto w-full`}>
        {/* Cash Flow Detail - SQUARE */}
        {profile?.role !== 'coordinator' && (
          <div
            className="rounded-none p-4 sm:p-8 md:p-10 border shadow-2xl"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Fluxo de Caixa - Hoje
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-none p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-3">
                  <div className="rounded-none p-3" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
                    <TrendingUp size={20} className="text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Entradas</span>
                </div>
                <span className="text-lg font-bold text-emerald-400">
                  R$ {data.todayIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-none p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-3">
                  <div className="rounded-none p-3" style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)' }}>
                    <TrendingDown size={20} className="text-rose-400" />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Saídas</span>
                </div>
                <span className="text-lg font-bold text-rose-400">
                  R$ {data.todayExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-none p-4 border border-white/5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Saldo do Dia</span>
                <span className={`text-lg font-bold ${data.cashFlowToday >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  R$ {data.cashFlowToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Birthdays - SQUARE */}
        <div
          className="rounded-none p-4 sm:p-8 md:p-10 border shadow-2xl"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
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
                    className="flex items-center gap-4 rounded-none p-4 transition-colors border border-white/5"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-none text-lg"
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
