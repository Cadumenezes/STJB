import React, { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, MapPin, AlignLeft, User, Mail, ShieldAlert, Flag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'
import Modal from '../components/Modal'

interface Appointment {
  id: string
  title: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  category: string
  color: string // hex or tailwind class
  description: string
  teacherEmail?: string
}

const DEFAULT_APPOINTMENTS: Appointment[] = [
  {
    id: '1',
    title: 'Espetáculo de Encerramento (Teatro Municipal)',
    date: `${new Date().getFullYear()}-12-15`,
    time: '19:30',
    category: 'Espetáculo',
    color: '#ec4899', // Pink
    description: 'Apresentação anual oficial de encerramento de todas as turmas da escola no Teatro Municipal principal.',
    teacherEmail: 'carolina@danceflow.com.br'
  },
  {
    id: '2',
    title: 'Reunião Geral Pedagógica de Planejamento',
    date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-05`,
    time: '09:00',
    category: 'Reunião',
    color: '#eab308', // Yellow
    description: 'Reunião de alinhamento com todos os instrutores e professores para organizar a grade curricular do semestre.',
    teacherEmail: 'ricardo@danceflow.com.br'
  },
  {
    id: '3',
    title: 'Início do Ensaio Geral da Coreografia de Jazz',
    date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-18`,
    time: '14:00',
    category: 'Ensaio',
    color: '#8b5cf6', // Purple
    description: 'Primeiro ensaio de palco e marcações de espaço com as turmas de Jazz Avançado e Intermediário.',
    teacherEmail: 'carolina@danceflow.com.br'
  },
  {
    id: '4',
    title: 'Abertura de Matrículas do Segundo Semestre',
    date: `${new Date().getFullYear()}-07-01`,
    time: '08:00',
    category: 'Outros',
    color: '#3b82f6', // Blue
    description: 'Período oficial de matrículas e rematrículas promocionais com isenção de taxa para novos alunos.',
    teacherEmail: 'financeiro@danceflow.com.br'
  },
  {
    id: '5',
    title: 'Workshop Especial de Dança Contemporânea',
    date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate() + 1).padStart(2, '0')}`,
    time: '10:00',
    category: 'Aulas',
    color: '#10b981', // Emerald
    description: 'Workshop intensivo com instrutor convidado sobre técnicas contemporâneas de improvisação e dinâmica.',
    teacherEmail: 'contato@danceflow.com.br'
  }
]

const CATEGORIES = ['Ensaio', 'Espetáculo', 'Reunião', 'Aulas', 'Outros'] as const;
const COLORS = [
  { name: 'Roxo', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#10b981' }
]

export default function Schedule() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [schoolName, setSchoolName] = useState('DanceFlow-Escola')
  const [viewMode, setViewMode] = useState<'monthly' | 'semestral' | 'annual'>('monthly')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDayEvents, setSelectedDayEvents] = useState<Appointment[]>([])
  const [selectedDateStr, setSelectedDateStr] = useState('')
  const [schoolAdminId, setSchoolAdminId] = useState<string | null>(null)
  const [customHolidays, setCustomHolidays] = useState<any[]>([])
  const [showHolidayModal, setShowHolidayModal] = useState(false)
  const [addingHoliday, setAddingHoliday] = useState(false)
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '' })
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Appointment | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    category: 'Ensaio' as Appointment['category'],
    color: '#8b5cf6',
    description: '',
    teacherEmail: ''
  })
  
  // Easter algorithm
  function getEaster(year: number) {
    const a = year % 19
    const b = Math.floor(year / 100)
    const c = year % 100
    const d = Math.floor(b / 4)
    const e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - d - g + 15) % 30
    const i = Math.floor(c / 4)
    const k = c % 4
    const L = (32 + 2 * e + 2 * i - h - k) % 7
    const m = Math.floor((a + 11 * h + 22 * L) / 451)
    const monthIdx = Math.floor((h + L - 7 * m + 114) / 31) - 1
    const day = ((h + L - 7 * m + 114) % 31) + 1
    return new Date(year, monthIdx, day, 12, 0, 0)
  }

  function getHolidaysForYear(year: number, customList: any[] = []): Map<string, string> {
    const holidays = new Map<string, string>()
    
    // Fixed national holidays in Brazil
    const fixed = [
      { date: '01-01', name: 'Confraternização Universal' },
      { date: '04-21', name: 'Tiradentes' },
      { date: '05-01', name: 'Dia do Trabalhador' },
      { date: '09-07', name: 'Independência do Brasil' },
      { date: '10-12', name: 'Nossa Senhora Aparecida' },
      { date: '11-02', name: 'Finados' },
      { date: '11-15', name: 'Proclamação da República' },
      { date: '11-20', name: 'Dia da Consciência Negra' },
      { date: '12-25', name: 'Natal' }
    ]
    fixed.forEach(f => holidays.set(`${year}-${f.date}`, f.name))

    const easter = getEaster(year)
    const addDays = (d: Date, days: number) => {
      const res = new Date(d)
      res.setDate(res.getDate() + days)
      return res.toISOString().slice(0, 10)
    }

    holidays.set(addDays(easter, -47), 'Carnaval')
    holidays.set(addDays(easter, -2), 'Sexta-feira Santa')
    holidays.set(addDays(easter, 60), 'Corpus Christi')

    // Add custom holidays
    customList.forEach(ch => {
      if (ch.date && ch.date.startsWith(`${year}-`)) {
        holidays.set(ch.date, ch.name)
      }
    })

    return holidays
  }

  useEffect(() => {
    loadProfile()
    loadAppointments()
    loadCustomHolidays()
  }, [])

  async function loadCustomHolidays() {
    try {
      const { data, error } = await supabase.from('school_holidays').select('*').order('date', { ascending: true })
      if (data) {
        setCustomHolidays(data)
      }
    } catch (e) {
      console.error('Erro ao buscar feriados:', e)
    }
  }

  async function handleAddHoliday(e: React.FormEvent) {
    e.preventDefault()
    if (isTeacher) return
    setAddingHoliday(true)
    try {
      const payload: any = {
        name: holidayForm.name,
        date: holidayForm.date
      }
      if (profile && ['secretary', 'coordinator', 'financial_director', 'teacher'].includes(profile.role) && schoolAdminId) {
        payload.user_id = schoolAdminId
      }
      const { error } = await supabase.from('school_holidays').insert([payload])
      if (error) {
        alert('Erro ao salvar feriado: ' + error.message)
      } else {
        setHolidayForm({ name: '', date: '' })
        loadCustomHolidays()
      }
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar feriado.')
    } finally {
      setAddingHoliday(false)
    }
  }

  async function handleDeleteHoliday(id: string) {
    if (isTeacher) return
    if (!confirm('Deseja realmente remover este feriado?')) return
    try {
      const { error } = await supabase.from('school_holidays').delete().eq('id', id)
      if (error) {
        alert('Erro ao remover feriado: ' + error.message)
      } else {
        loadCustomHolidays()
      }
    } catch (err: any) {
      console.error(err)
      alert('Erro ao remover feriado.')
    }
  }

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileData) {
        setProfile(profileData)
        
        let adminId = user.id
        if (profileData && ['secretary', 'coordinator', 'financial_director', 'teacher'].includes(profileData.role)) {
          const { data: teamData } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('email', user.email)
            .maybeSingle()
          if (teamData) {
            adminId = teamData.user_id
          }
        }
        setSchoolAdminId(adminId)
      }
    }
    const { data: settings } = await supabase.from('school_settings').select('school_name').limit(1).single()
    if (settings?.school_name) {
      setSchoolName(settings.school_name)
    }
  }

  function loadAppointments() {
    const stored = localStorage.getItem('danceflow_appointments')
    if (stored) {
      setAppointments(JSON.parse(stored))
    } else {
      setAppointments(DEFAULT_APPOINTMENTS)
      localStorage.setItem('danceflow_appointments', JSON.stringify(DEFAULT_APPOINTMENTS))
    }
  }

  // Update selected day events when calendar details change
  useEffect(() => {
    const todayStr = getFormattedDateStr(currentDate)
    setSelectedDateStr(todayStr)
    const dayEvents = appointments.filter(a => a.date === todayStr)
    setSelectedDayEvents(dayEvents)
  }, [appointments, currentDate])

  function getFormattedDateStr(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const isTeacher = profile?.role === 'teacher'

  // Appointment Actions
  function saveAppointment(e: React.FormEvent) {
    e.preventDefault()
    if (isTeacher) return

    let updatedAppointments: Appointment[] = []
    
    if (editingEvent) {
      // Edit
      updatedAppointments = appointments.map(a => 
        a.id === editingEvent.id 
          ? { ...editingEvent, ...formData } 
          : a
      )
    } else {
      // Create new
      const newEvent: Appointment = {
        id: crypto.randomUUID(),
        ...formData
      }
      updatedAppointments = [...appointments, newEvent]
    }

    setAppointments(updatedAppointments)
    localStorage.setItem('danceflow_appointments', JSON.stringify(updatedAppointments))
    setShowAddModal(false)
    setEditingEvent(null)
    
    // Refresh selected day events list
    const dayEvents = updatedAppointments.filter(a => a.date === formData.date)
    setSelectedDayEvents(dayEvents)
    setSelectedDateStr(formData.date)
  }

  function deleteAppointment(id: string) {
    if (isTeacher) return
    if (!confirm('Deseja realmente remover este compromisso?')) return

    const updated = appointments.filter(a => a.id !== id)
    setAppointments(updated)
    localStorage.setItem('danceflow_appointments', JSON.stringify(updated))
    
    // Update selected day list
    setSelectedDayEvents(selectedDayEvents.filter(a => a.id !== id))
  }

  function openEditModal(event: Appointment) {
    if (isTeacher) return
    setEditingEvent(event)
    setFormData({
      title: event.title,
      date: event.date,
      time: event.time,
      category: event.category,
      color: event.color,
      description: event.description,
      teacherEmail: event.teacherEmail || ''
    })
    setShowAddModal(true)
  }

  function openCreateModal(dateStr?: string) {
    if (isTeacher) return
    setEditingEvent(null)
    setFormData({
      title: '',
      date: dateStr || getFormattedDateStr(new Date()),
      time: '12:00',
      category: 'Ensaio',
      color: '#8b5cf6',
      description: '',
      teacherEmail: ''
    })
    setShowAddModal(true)
  }

  // Monthly Calendar Helper Calculations
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const daysInMonth = getDaysInMonth(year, month)
  const firstDayIndex = getFirstDayOfMonth(year, month)

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const selectDay = (day: number) => {
    const newSelectedDate = new Date(year, month, day)
    const dateStr = getFormattedDateStr(newSelectedDate)
    setSelectedDateStr(dateStr)
    const dayEvents = appointments.filter(a => a.date === dateStr)
    setSelectedDayEvents(dayEvents)
  }

  // Render Monthly Calendar Grid
  const renderMonthlyGrid = () => {
    const cells = []
    const holidaysMap = getHolidaysForYear(year, customHolidays)
    
    // Empty cells before the 1st day of the month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="bg-transparent h-20 sm:h-28 border border-white/5 opacity-20" />)
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayEvents = appointments.filter(a => a.date === dateString)
      const isSelected = selectedDateStr === dateString
      const isToday = getFormattedDateStr(new Date()) === dateString
      const holidayName = holidaysMap.get(dateString)

      cells.push(
        <div 
          key={`day-${day}`}
          onClick={() => selectDay(day)}
          className={`h-20 sm:h-28 border border-white/5 p-2 flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
            isSelected ? 'bg-purple-600/10 border-purple-500/30' : 'bg-black/10 hover:bg-white/[0.02]'
          }`}
        >
          {/* Day number */}
          <div className="flex justify-between items-center z-10">
            <span className={`text-xs sm:text-sm font-bold ${
              isToday 
                ? 'h-6 w-6 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/25' 
                : isSelected ? 'text-purple-400 font-extrabold' : 'text-gray-400'
            }`}>
              {day}
            </span>
          </div>

          {/* Dots/Event Tags */}
          <div className="space-y-1 overflow-y-auto max-h-[48px] sm:max-h-[64px] custom-scrollbar z-10">
            {holidayName && (
              <div 
                className="hidden sm:block text-[9px] px-2 py-0.5 rounded font-black truncate text-[#ef4444] border border-[#ef4444]/30 bg-[#ef4444]/10"
                title={`Feriado: ${holidayName}`}
              >
                <Flag size={10} className="inline-block mr-1 -mt-0.5" />{holidayName}
              </div>
            )}
            {dayEvents.map(event => (
              <div 
                key={event.id}
                className="hidden sm:block text-[9px] px-2 py-0.5 rounded font-black truncate text-white border"
                style={{ backgroundColor: `${event.color}25`, borderColor: `${event.color}50`, color: event.color }}
                title={event.title}
              >
                {event.title}
              </div>
            ))}
            {/* Dots on mobile screen */}
            <div className="flex sm:hidden gap-1 flex-wrap">
              {holidayName && (
                <span 
                  className="h-1.5 w-1.5 rounded-full bg-[#ef4444] animate-pulse"
                  title={`Feriado: ${holidayName}`}
                />
              )}
              {dayEvents.map(event => (
                <span 
                  key={event.id} 
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: event.color }}
                  title={event.title}
                />
              ))}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-7 rounded-none overflow-hidden shadow-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        {/* Day name headers */}
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="p-3 text-center text-xs font-bold text-gray-500 uppercase tracking-widest bg-black/40 border border-white/5">
            {d}
          </div>
        ))}
        {cells}
      </div>
    )
  }

  // Render Semestral View (Next 6 Months List)
  const renderSemestralList = () => {
    const semestralMonths = []
    const tempDate = new Date()

    for (let i = 0; i < 6; i++) {
      const curYear = tempDate.getFullYear()
      const curMonth = tempDate.getMonth()
      const curMonthName = monthNames[curMonth]

      // Filter events and holidays in this month
      const monthHolidays: any[] = []
      const holidaysMap = getHolidaysForYear(curYear, customHolidays)
      holidaysMap.forEach((name, dateStr) => {
        const hDate = new Date(dateStr + 'T12:00:00')
        if (hDate.getFullYear() === curYear && hDate.getMonth() === curMonth) {
          monthHolidays.push({
            id: `holiday-${dateStr}`,
            title: `Feriado: ${name}`,
            date: dateStr,
            time: '--:--',
            category: 'Feriado',
            color: '#ef4444',
            description: 'Feriado nacional ou customizado da escola.',
            isHoliday: true
          })
        }
      })

      const monthEvents = [
        ...appointments.filter(a => {
          const eventDate = new Date(a.date + 'T00:00:00')
          return eventDate.getFullYear() === curYear && eventDate.getMonth() === curMonth
        }),
        ...monthHolidays
      ].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

      semestralMonths.push(
        <div key={`sem-${i}`} className="p-6 rounded-none shadow-xl space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <h3 className="text-sm font-black uppercase tracking-wider text-purple-400">
              {curMonthName} <span className="text-gray-500 text-xs">({curYear})</span>
            </h3>
            <span className="text-[10px] font-black uppercase bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
              {monthEvents.length} {monthEvents.length === 1 ? 'Item' : 'Itens'}
            </span>
          </div>

          <div className="space-y-3">
            {monthEvents.length === 0 ? (
              <p className="text-xs text-gray-500 italic p-2">Nenhum compromisso ou feriado para este mês.</p>
            ) : (
              monthEvents.map(event => (
                <div 
                  key={event.id}
                  className="p-3 rounded-xl bg-black/20 border border-white/5 flex gap-3 hover:border-white/10 transition-all"
                >
                  <div className="h-2 w-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: event.color }} />
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">{event.title}</h4>
                      <span className="text-[10px] text-gray-400 shrink-0 font-bold">
                        {new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{event.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1.5 text-[10px] text-gray-500 font-semibold uppercase">
                      <span className="flex items-center gap-1"><Clock size={11} /> {event.time}</span>
                      <span className="flex items-center gap-1"><AlignLeft size={11} /> {event.category}</span>
                      {event.teacherEmail && <span className="flex items-center gap-1"><Mail size={11} /> {event.teacherEmail}</span>}
                    </div>
                  </div>
                  {!isTeacher && !event.isHoliday && (
                    <div className="flex flex-col gap-1.5 justify-center pl-2 border-l border-white/5">
                      <button onClick={() => openEditModal(event)} className="text-[10px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wider">Editar</button>
                      <button onClick={() => deleteAppointment(event.id)} className="text-[10px] text-rose-500 hover:text-rose-400 font-bold uppercase tracking-wider">Excluir</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )

      tempDate.setMonth(tempDate.getMonth() + 1)
    }

    return <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{semestralMonths}</div>
  }

  // Render Annual Planner (12 Months Summary)
  const renderAnnualPlanner = () => {
    const annualMonths = []
    const curYear = new Date().getFullYear()

    for (let m = 0; m < 12; m++) {
      // Combine appointments and holidays for this month
      const monthHolidays: any[] = []
      const holidaysMap = getHolidaysForYear(curYear, customHolidays)
      holidaysMap.forEach((name, dateStr) => {
        const hDate = new Date(dateStr + 'T12:00:00')
        if (hDate.getFullYear() === curYear && hDate.getMonth() === m) {
          monthHolidays.push({
            id: `holiday-${dateStr}`,
            title: name,
            date: dateStr,
            time: '00:00',
            category: 'Feriado',
            color: '#ef4444',
            description: 'Feriado',
            isHoliday: true
          })
        }
      })

      const monthEvents = [
        ...appointments.filter(a => {
          const eventDate = new Date(a.date + 'T00:00:00')
          return eventDate.getFullYear() === curYear && eventDate.getMonth() === m
        }),
        ...monthHolidays
      ].sort((a, b) => a.date.localeCompare(b.date))

      annualMonths.push(
        <div 
          key={`ann-${m}`} 
          className="p-5 rounded-2xl flex flex-col justify-between hover:border-purple-500/20 transition-all duration-300 group cursor-pointer shadow-md"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          onClick={() => {
            setCurrentDate(new Date(curYear, m, 1))
            setViewMode('monthly')
          }}
        >
          <div>
            <div className="flex flex-col items-center pb-2 border-b border-white/5 mb-3 text-center w-full">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-300 group-hover:text-purple-400 transition-colors">
                {monthNames[m]}
              </h4>
              <span className="text-[10px] font-black text-gray-500 mt-1">
                {monthEvents.length} {monthEvents.length === 1 ? 'compromisso' : 'compromissos'}
              </span>
            </div>
            
            <div className="space-y-1.5 max-h-[80px] overflow-y-auto custom-scrollbar">
              {monthEvents.slice(0, 3).map(event => (
                <div key={event.id} className="flex items-center gap-1.5 text-[10px] text-gray-400 truncate">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                  <span className="font-bold text-gray-500 mr-0.5">
                    {new Date(event.date + 'T00:00:00').getDate()}:
                  </span>
                  <span className="truncate" title={event.title}>{event.title}</span>
                </div>
              ))}
              {monthEvents.length > 3 && (
                <span className="block text-[9px] text-purple-400 font-extrabold uppercase pt-1">
                  + {monthEvents.length - 3} outros...
                </span>
              )}
              {monthEvents.length === 0 && (
                <span className="text-[10px] text-gray-600 italic">Sem eventos</span>
              )}
            </div>
          </div>

          <span className="block text-[9px] text-gray-500 font-black uppercase tracking-widest text-right mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            Ver detalhes →
          </span>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div 
          className="p-8 sm:p-10 pb-12 rounded-2xl border border-white/5 shadow-2xl mb-8 relative overflow-hidden text-center flex flex-col items-center justify-center gap-4 w-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
        >
          {/* Accent Glow */}
          <div 
            className="absolute -left-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-10"
            style={{ backgroundColor: 'var(--accent-color)' }}
          />
          
          <h3 
            className="font-black tracking-tighter leading-tight inline-block py-6 rounded-2xl shadow-2xl shadow-purple-500/30 text-center uppercase"
            style={{ 
              backgroundColor: 'var(--accent-color)', 
              color: '#fff',
              fontSize: 'var(--title-size, 26px)',
              paddingLeft: '32px',
              paddingRight: '32px'
            }}
          >
            Planejamento Anual de {curYear}
          </h3>
          <p 
            className="font-bold inline-block py-4 rounded-xl shadow-md border border-white/10 text-center"
            style={{ 
              backgroundColor: 'var(--accent-color)', 
              color: '#fff', 
              fontSize: 'var(--subtitle-size, 13px)',
              paddingLeft: '24px',
              paddingRight: '24px'
            }}
          >
            Clique em qualquer mês para abrir a visualização detalhada da agenda!
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{annualMonths}</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10 flex flex-col">
      {/* Header Section with Dynamic Style */}
      <div 
        className="p-5 sm:p-8 md:p-10 pb-10 sm:pb-16 rounded-2xl border border-white/5 shadow-2xl mb-8 sm:mb-12 relative overflow-hidden"
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
              Agenda escolar
            </h1>
            <br />
            <p 
              className="font-bold inline-block py-3 sm:py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
               style={{ 
                 backgroundColor: 'var(--accent-color)', 
                 color: '#fff', 
                 fontSize: 'var(--subtitle-size, 16px)',
                 paddingLeft: 'clamp(12px, 3vw, 32px)',
                 paddingRight: 'clamp(12px, 3vw, 32px)'
               }}
            >
              Organização completa de ensaios, espetáculos, reuniões e eventos do {schoolName}
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            {isTeacher && (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-black uppercase tracking-wider">
                <ShieldAlert size={14} className="animate-pulse" />
                Modo Leitura (Professor)
              </div>
            )}
            {!isTeacher && (
              <>
                <button
                  onClick={() => setShowHolidayModal(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest text-white border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
                    borderColor: 'rgba(139, 92, 246, 0.5)',
                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.15)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(236, 72, 153, 0.35))';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.15)';
                  }}
                >
                  <CalendarIcon size={16} className="text-purple-300" />
                  Gerenciar Feriados
                </button>
                <button
                  onClick={() => openCreateModal()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest text-white hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/10 transition-all cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
                >
                  <Plus size={16} />
                  Novo Compromisso
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* View Toggles Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center p-3 rounded-none shadow-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        {/* Navigation for Monthly View */}
        {viewMode === 'monthly' ? (
          <div className="flex items-center gap-3">
            <button 
              onClick={prevMonth}
              className="p-2 rounded-lg bg-black/30 border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-base font-black text-white min-w-[120px] text-center uppercase tracking-widest">
              {monthNames[month]} {year}
            </h2>
            <button 
              onClick={nextMonth}
              className="p-2 rounded-lg bg-black/30 border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="ml-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Hoje
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-gray-400" />
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Visualização Estendida</span>
          </div>
        )}

        {/* View Mode Switching Tabs */}
        <div className="flex items-center p-1 bg-black/40 border border-white/5 rounded-xl w-full sm:w-auto shrink-0 gap-1 sm:gap-2">
          <button
            onClick={() => setViewMode('monthly')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
              viewMode === 'monthly' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Mensal
          </button>
          <span className="text-white/20 font-bold select-none px-1">/</span>
          <button
            onClick={() => setViewMode('semestral')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
              viewMode === 'semestral' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Semestral
          </button>
          <span className="text-white/20 font-bold select-none px-1">/</span>
          <button
            onClick={() => setViewMode('annual')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
              viewMode === 'annual' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Anual
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Side: Dynamic Calendar Grid or lists */}
        <div className="flex-1 w-full overflow-hidden">
          {viewMode === 'monthly' && renderMonthlyGrid()}
          {viewMode === 'semestral' && renderSemestralList()}
          {viewMode === 'annual' && renderAnnualPlanner()}
        </div>

        {/* Right Side Sidebar: Selected Day Details (Only visible in Monthly Mode) */}
        {viewMode === 'monthly' && (
          <div className="w-full lg:w-80 shrink-0 space-y-6">
            <div className="p-6 rounded-none shadow-xl space-y-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div className="pb-3 border-b border-white/5 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">Compromissos do Dia</span>
                <h3 className="text-base font-black text-white leading-none">
                  {new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </h3>
              </div>

              {(() => {
                if (!selectedDateStr) return null;
                const selYear = new Date(selectedDateStr + 'T12:00:00').getFullYear()
                const holidaysMap = getHolidaysForYear(selYear, customHolidays)
                const selectedHoliday = holidaysMap.get(selectedDateStr)
                if (selectedHoliday) {
                  return (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-bold flex items-center gap-2">
                      <Flag size={20} className="shrink-0" />
                      <div>
                        <p className="font-extrabold uppercase text-[10px] text-red-400 tracking-wider">Feriado Escolar</p>
                        <p>{selectedHoliday}</p>
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              {/* Day Events List */}
              <div className="space-y-4 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {selectedDayEvents.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <CalendarIcon size={32} className="mx-auto text-gray-700 opacity-30" />
                    <p className="text-xs text-gray-500 italic">Sem eventos neste dia.</p>
                    {!isTeacher && (
                      <button 
                        onClick={() => openCreateModal(selectedDateStr)}
                        className="text-[10px] text-purple-400 font-extrabold uppercase hover:underline"
                      >
                        + Criar evento
                      </button>
                    )}
                  </div>
                ) : (
                  selectedDayEvents.map(event => (
                    <div 
                      key={event.id}
                      className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3 hover:border-white/10 transition-all relative overflow-hidden group"
                    >
                      {/* Left color bar */}
                      <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: event.color }} />
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">{event.title}</h4>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">{event.description}</p>
                      </div>

                      {/* Metadata tags */}
                      <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-gray-500 font-bold uppercase">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5"><Clock size={11} /> {event.time}</span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5"><AlignLeft size={11} /> {event.category}</span>
                      </div>
                      
                      {event.teacherEmail && (
                        <div className="flex items-center gap-1 text-[10px] text-purple-400 font-semibold">
                          <User size={10} /> {event.teacherEmail}
                        </div>
                      )}

                      {/* Admin Controls */}
                      {!isTeacher && (
                        <div className="flex gap-4 pt-3 border-t border-white/5 justify-end opacity-40 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(event)} className="text-[9px] font-black text-purple-400 uppercase tracking-widest hover:text-purple-300">Editar</button>
                          <button onClick={() => deleteAppointment(event.id)} className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-400">Excluir</button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Create / Edit Appointment Modal */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => { setShowAddModal(false); setEditingEvent(null); }}
        title={editingEvent ? 'Editar Compromisso' : 'Novo Compromisso'}
      >
        <form onSubmit={saveAppointment} className="space-y-4">
          <div>
            <label className="text-xs font-bold block mb-1.5 text-gray-400 uppercase tracking-wider">Título do Compromisso *</label>
            <input 
              required 
              type="text"
              value={formData.title} 
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Ensaio de Palco de Ballet"
              className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-black/20 border border-white/10 focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold block mb-1.5 text-gray-400 uppercase tracking-wider">Data *</label>
              <input 
                required 
                type="date"
                value={formData.date} 
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-black/20 border border-white/10 focus:outline-none focus:border-purple-500 transition-all [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1.5 text-gray-400 uppercase tracking-wider">Horário *</label>
              <input 
                required 
                type="time"
                value={formData.time} 
                onChange={e => setFormData({ ...formData, time: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-black/20 border border-white/10 focus:outline-none focus:border-purple-500 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold block mb-1.5 text-gray-400 uppercase tracking-wider">Categoria</label>
              <input
                required
                type="text"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Ensaio, Reunião, Aulas..."
                className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-black/20 border border-white/10 focus:outline-none focus:border-purple-500 transition-all placeholder-white/30"
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1.5 text-gray-400 uppercase tracking-wider">Marcador de Cor</label>
              <select
                value={formData.color}
                onChange={e => setFormData({ ...formData, color: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-black/20 border border-white/10 focus:outline-none focus:border-purple-500 transition-all appearance-none cursor-pointer font-bold"
                style={{ color: formData.color }}
              >
                {COLORS.map(c => <option key={c.value} value={c.value} className="bg-gray-900 font-bold" style={{ color: c.value }}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold block mb-1.5 text-gray-400 uppercase tracking-wider">E-mail do Professor Responsável</label>
            <input 
              type="email"
              value={formData.teacherEmail} 
              onChange={e => setFormData({ ...formData, teacherEmail: e.target.value })}
              placeholder="Ex: professor@escola.com"
              className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-black/20 border border-white/10 focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1.5 text-gray-400 uppercase tracking-wider">Descrição dos Detalhes</label>
            <textarea
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Diga detalhes adicionais sobre o ensaio, figurino, roupas ou pauta da reunião..."
              rows={3}
              className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-black/20 border border-white/10 focus:outline-none focus:border-purple-500 transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/5">
            <button 
              type="button" 
              onClick={() => { setShowAddModal(false); setEditingEvent(null); }}
              className="flex-1 py-3 text-xs font-bold text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-lg transition-all"
              style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
            >
              {editingEvent ? 'Salvar Alterações' : 'Confirmar Compromisso'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Gerenciamento de Feriados */}
      <Modal
        isOpen={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        title="Gerenciar Feriados Municipais / Customizados"
      >
        <div className="space-y-6">
          {/* Formulário de Cadastro */}
          <form onSubmit={handleAddHoliday} className="p-4 rounded-xl border border-white/5 bg-black/20 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-purple-400">Cadastrar Novo Feriado</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold block mb-1.5 text-gray-400 uppercase tracking-wider">Nome do Feriado *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Padroeiro da Cidade"
                  value={holidayForm.name}
                  onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-black/20 border border-white/10 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1.5 text-gray-400 uppercase tracking-wider">Data *</label>
                <input
                  required
                  type="date"
                  value={holidayForm.date}
                  onChange={e => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-black/20 border border-white/10 focus:outline-none focus:border-purple-500 transition-all [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={addingHoliday}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:scale-105 active:scale-95 shadow-md transition-all cursor-pointer bg-purple-600 disabled:opacity-50"
              >
                {addingHoliday ? 'Adicionando...' : 'Adicionar Feriado'}
              </button>
            </div>
          </form>

          {/* Listagem de Feriados Cadastrados */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-purple-400">Feriados Customizados Cadastrados</h4>
            {customHolidays.length === 0 ? (
              <p className="text-xs text-gray-500 italic text-center py-4">Nenhum feriado municipal/customizado cadastrado.</p>
            ) : (
              <div className="max-h-[250px] overflow-y-auto pr-1 custom-scrollbar space-y-2">
                {customHolidays.map(h => (
                  <div key={h.id} className="p-3 rounded-lg bg-black/30 border border-white/5 flex items-center justify-between hover:border-white/10 transition-all">
                    <div>
                      <p className="text-xs font-bold text-white">{h.name}</p>
                      <p className="text-[10px] text-gray-500 font-semibold">{new Date(h.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteHoliday(h.id)}
                      className="text-[10px] text-rose-500 hover:text-rose-400 font-black uppercase tracking-wider pl-2"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

    </div>
  )
}
