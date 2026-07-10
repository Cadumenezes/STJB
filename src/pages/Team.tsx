import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, UserCog, Calendar, Check, X, Clock, Users, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { TeamMember } from '../types'
import Modal from '../components/Modal'
import QuantumLoader from '../components/QuantumLoader'

export default function Team() {
  // Tabs: 'members' | 'attendance' | 'summary'
  const [activeTab, setActiveTab] = useState<'members' | 'attendance' | 'summary'>('members')
  
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editMember, setEditMember] = useState<TeamMember | null>(null)
  
  // Daily Attendance States
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [teamAttendance, setTeamAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({})
  const [savingAttendance, setSavingAttendance] = useState<string | null>(null)
  const [schoolOwnerId, setSchoolOwnerId] = useState<string | null>(null)

  // Monthly Summary States
  const [summaryMonth, setSummaryMonth] = useState<string>(new Date().toISOString().slice(0, 7))
  const [summaryData, setSummaryData] = useState<Record<string, { classDays: number; classHours: number; pointDays: number }>>({})
  const [loadingSummary, setLoadingSummary] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Professor' as any,
    specialty: '',
    salary: '',
    hourly_rate: '',
    daily_transport: '',
    photo_url: '',
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (activeTab === 'attendance') {
      loadTeamAttendance()
    }
  }, [activeTab, attendanceDate])

  useEffect(() => {
    if (activeTab === 'summary' && members.length > 0) {
      loadTeamSummary()
    }
  }, [activeTab, summaryMonth, members])

  async function loadTeamSummary() {
    if (!summaryMonth) return
    setLoadingSummary(true)
    try {
      const year = parseInt(summaryMonth.split('-')[0])
      const month = parseInt(summaryMonth.split('-')[1])
      const startDate = `${summaryMonth}-01`
      const endDate = `${summaryMonth}-${new Date(year, month, 0).getDate()}`

      // 1. Fetch class attendance for instructors
      const { data: attData } = await supabase
        .from('attendance')
        .select('*')
        .eq('type', 'instructor')
        .eq('status', 'present')
        .gte('date', startDate)
        .lte('date', endDate)

      // 2. Fetch daily team points
      const { data: teamAttData } = await supabase
        .from('team_attendance')
        .select('*')
        .in('status', ['present', 'late'])
        .gte('date', startDate)
        .lte('date', endDate)

      // 3. Compute totals
      const summaryMap: Record<string, { classDays: number; classHours: number; pointDays: number }> = {}
      
      members.forEach(m => {
        // Class attendance
        const teacherAtt = (attData || []).filter(a => a.instructor_id === m.id)
        const uniqueClassDays = new Set(teacherAtt.map(a => a.date)).size
        const classHoursCount = teacherAtt.length // 1 class = 1 hour

        // Daily point attendance
        const teacherPoints = (teamAttData || []).filter(a => a.member_id === m.id)
        const uniquePointDays = new Set(teacherPoints.map(a => a.date)).size

        summaryMap[m.id] = {
          classDays: uniqueClassDays,
          classHours: classHoursCount,
          pointDays: uniquePointDays
        }
      })

      setSummaryData(summaryMap)
    } catch (err) {
      console.error('Error loading team summary:', err)
    } finally {
      setLoadingSummary(false)
    }
  }

  const handlePrevMonth = () => {
    const [year, month] = summaryMonth.split('-').map(Number)
    const date = new Date(year, month - 2, 1)
    setSummaryMonth(date.toISOString().slice(0, 7))
  }

  const handleNextMonth = () => {
    const [year, month] = summaryMonth.split('-').map(Number)
    const date = new Date(year, month, 1)
    setSummaryMonth(date.toISOString().slice(0, 7))
  }

  async function loadInitialData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profile && ['secretary', 'coordinator', 'financial_director', 'teacher'].includes(profile.role)) {
        const { data: tm } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('email', profile.email)
          .eq('status', 'active')
          .maybeSingle()
        if (tm) {
          setSchoolOwnerId(tm.user_id)
        }
      } else {
        setSchoolOwnerId(user.id)
      }
    }
    await loadMembers()
  }

  async function loadMembers() {
    setLoading(true)
    const { data } = await supabase.from('team_members').select('*').order('name')
    setMembers(data || [])
    setLoading(false)
  }

  async function loadTeamAttendance() {
    if (!schoolOwnerId) return
    const { data } = await supabase
      .from('team_attendance')
      .select('*')
      .eq('date', attendanceDate)
    
    const attMap: Record<string, 'present' | 'absent' | 'late'> = {}
    if (data) {
      data.forEach(item => {
        attMap[item.member_id] = item.status
      })
    }
    setTeamAttendance(attMap)
  }

  async function handleMarkAttendance(memberId: string, status: 'present' | 'absent' | 'late') {
    setSavingAttendance(memberId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // If already marked, click toggles/updates it
      const payload = {
        user_id: schoolOwnerId || user.id,
        member_id: memberId,
        date: attendanceDate,
        status: status
      }

      const { error } = await supabase
        .from('team_attendance')
        .upsert(payload, { onConflict: 'member_id,date' })

      if (error) throw error

      setTeamAttendance(prev => ({
        ...prev,
        [memberId]: status
      }))
    } catch (err: any) {
      console.error(err)
      alert('Erro ao marcar presença: ' + err.message)
    } finally {
      setSavingAttendance(null)
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validação rígida de tipo MIME (apenas formatos raster seguros, sem SVG)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedMimeTypes.includes(file.type)) {
      alert('Por favor, selecione um arquivo de imagem válido (JPEG, PNG, WebP ou GIF). Imagens SVG e outros formatos não são permitidos por motivos de segurança.')
      return
    }

    // Validação rígida de extensão
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!allowedExtensions.includes(fileExtension)) {
      alert('Extensão de arquivo inválida. Apenas .jpg, .jpeg, .png, .webp e .gif são permitidos.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem é muito grande. O tamanho máximo é 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setFormData({ ...formData, photo_url: base64 })
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...formData,
      salary: parseFloat(formData.salary || '0'),
      hourly_rate: parseFloat(formData.hourly_rate || '0'),
      daily_transport: parseFloat(formData.daily_transport || '0'),
      status: 'active' as const
    }

    let error = null
    if (editMember) {
      const res = await supabase.from('team_members').update(payload).eq('id', editMember.id)
      error = res.error
    } else {
      const res = await supabase.from('team_members').insert([payload])
      error = res.error
    }
    
    if (error) {
      console.error(error)
      alert('Erro ao salvar funcionário: ' + error.message)
    } else {
      setShowModal(false)
      setEditMember(null)
      resetForm()
      loadMembers()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir membro da equipe?')) return
    await supabase.from('team_members').delete().eq('id', id)
    loadMembers()
  }

  function openEdit(m: TeamMember) {
    setEditMember(m)
    setFormData({
      name: m.name,
      email: m.email || '',
      phone: m.phone || '',
      role: m.role,
      specialty: m.specialty || '',
      salary: m.salary ? m.salary.toString() : '',
      hourly_rate: m.hourly_rate ? m.hourly_rate.toString() : '',
      daily_transport: m.daily_transport ? m.daily_transport.toString() : '',
      photo_url: m.photo_url || '',
    })
    setShowModal(true)
  }

  function resetForm() {
    setFormData({ 
      name: '', email: '', phone: '', role: 'Professor', specialty: '', 
      salary: '', hourly_rate: '', daily_transport: '',
      photo_url: '',
    })
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  }

  const roleColors: Record<string, { bg: string; text: string; label: string }> = {
    instructor: { bg: 'rgba(139,92,246,0.15)', text: '#8b5cf6', label: 'Professor' },
    staff: { bg: 'rgba(16,185,129,0.15)', text: '#10b981', label: 'Staff' },
    admin: { bg: 'rgba(244,63,94,0.15)', text: '#f43f5e', label: 'Admin' },
    
    // Portuguese unisex roles mapping
    'Secretário': { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', label: 'Secretário' },
    'Diretor': { bg: 'rgba(244,63,94,0.15)', text: '#f43f5e', label: 'Diretor' },
    'Professor': { bg: 'rgba(139,92,246,0.15)', text: '#8b5cf6', label: 'Professor' },
    'Zelador': { bg: 'rgba(16,185,129,0.15)', text: '#10b981', label: 'Zelador' },
    'Porteiro': { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', label: 'Porteiro' },
    'Coordenador': { bg: 'rgba(236,72,153,0.15)', text: '#ec4899', label: 'Coordenador' },
    'coordinator': { bg: 'rgba(236,72,153,0.15)', text: '#ec4899', label: 'Coordenador' },
    'Diretor Financeiro': { bg: 'rgba(6,182,212,0.15)', text: '#06b6d4', label: 'Diretor Financeiro' },
    'financial_director': { bg: 'rgba(6,182,212,0.15)', text: '#06b6d4', label: 'Diretor Financeiro' },
  }

  return (
    <div className="flex flex-col pb-10">
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
              Equipe
            </h1>
            <br />
            <p 
              className="font-bold inline-block py-3 sm:py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
               style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: 'clamp(12px, 3vw, 32px)', paddingRight: 'clamp(12px, 3vw, 32px)' }}
            >
              Gerencie seus professores, colaboradores, cargos individuais e ponto diário
            </p>
          </div>
          
          {activeTab === 'members' && (
            <button
              onClick={() => { resetForm(); setEditMember(null); setShowModal(true) }}
              className="flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/20"
              style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
            >
              <Plus size={26} />
              Novo Membro
            </button>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-4 p-1 bg-black/20 rounded-2xl w-fit mt-12 relative z-10">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-12 py-4 text-sm font-bold transition-all rounded-2xl shadow-lg border ${
              activeTab === 'members' ? 'text-white' : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
            }`}
            style={{ 
              backgroundColor: activeTab === 'members' ? 'var(--bg-card)' : 'transparent',
              borderColor: activeTab === 'members' ? 'var(--border-color)' : 'transparent'
            }}
          >
            Membros da Equipe
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-12 py-4 text-sm font-bold transition-all rounded-2xl shadow-lg border ${
              activeTab === 'attendance' ? 'text-white' : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
            }`}
            style={{ 
              backgroundColor: activeTab === 'attendance' ? 'var(--bg-card)' : 'transparent',
              borderColor: activeTab === 'attendance' ? 'var(--border-color)' : 'transparent'
            }}
          >
            Chamada Diária (Ponto)
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-12 py-4 text-sm font-bold transition-all rounded-2xl shadow-lg border ${
              activeTab === 'summary' ? 'text-white' : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
            }`}
            style={{ 
              backgroundColor: activeTab === 'summary' ? 'var(--bg-card)' : 'transparent',
              borderColor: activeTab === 'summary' ? 'var(--border-color)' : 'transparent'
            }}
          >
            Resumo Mensal
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <QuantumLoader size={45} speed={1.75} color="var(--accent-color)" />
        </div>
      ) : activeTab === 'members' ? (
        /* Team Members List View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {members.map((m) => {
            const roleConf = roleColors[m.role] || { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af', label: m.role }
            return (
              <div
                key={m.id}
                className="group rounded-2xl p-8 sm:p-10 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl border border-white/5 flex flex-col justify-between"
                style={{ backgroundColor: 'var(--bg-card)' }}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {m.photo_url ? (
                        <img 
                          src={m.photo_url} 
                          alt={m.name} 
                          className="h-14 w-14 rounded-xl object-cover border border-purple-500/20 shadow-lg shadow-purple-500/10 shrink-0" 
                        />
                      ) : (
                        <div className="rounded-2xl p-3 shrink-0" style={{ backgroundColor: roleConf.bg }}>
                          <UserCog size={28} style={{ color: roleConf.text }} />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{m.name}</h3>
                        <span className="text-xs font-bold uppercase tracking-widest px-3 py-0.5 rounded-2xl mt-1 inline-block" style={{ backgroundColor: roleConf.bg, color: roleConf.text }}>
                          {roleConf.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    {m.email && (
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{m.email}</span>
                      </div>
                    )}
                    {m.phone && (
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'var(--text-muted)' }}>Telefone:</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{m.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>Especialidade:</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{m.specialty || '-'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>Hora Aula:</span>
                      <span className="font-bold text-emerald-400">R$ {m.hourly_rate?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>Passagem/Dia:</span>
                      <span className="font-bold text-blue-400">R$ {m.daily_transport?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>Salário Base:</span>
                      <span style={{ color: 'var(--text-secondary)' }}>R$ {m.salary?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                  <button onClick={() => openEdit(m)} className="flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold transition-all hover:bg-blue-500/10" style={{ color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <Edit size={14} />
                    EDITAR
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold transition-all hover:bg-rose-500/10" style={{ color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                    <Trash2 size={14} />
                    EXCLUIR
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : activeTab === 'attendance' ? (
        /* Team Attendance Point Logging View */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl border border-white/5" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-purple-400" />
              <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>Data da Chamada da Equipe:</span>
            </div>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
              style={inputStyle}
            />
          </div>

          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                    <th className="p-6 text-xs font-black uppercase tracking-widest text-white/50">Membro da Equipe</th>
                    <th className="p-6 text-xs font-black uppercase tracking-widest text-white/50">Função</th>
                    <th className="p-6 text-xs font-black uppercase tracking-widest text-white/50 text-center">Registrar Ponto (Diário)</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-10 text-center opacity-50 text-sm">
                        Nenhum funcionário cadastrado.
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => {
                      const currentStatus = teamAttendance[m.id]
                      const isSaving = savingAttendance === m.id
                      const roleConf = roleColors[m.role] || { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af', label: m.role }

                      return (
                        <tr key={m.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                <span className="text-white font-bold">{m.name.charAt(0)}</span>
                              </div>
                              <div>
                                <p className="font-bold text-white text-sm">{m.name}</p>
                                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m.specialty || 'Geral'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full" style={{ backgroundColor: roleConf.bg, color: roleConf.text }}>
                              {roleConf.label}
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="flex justify-center items-center gap-3">
                              {isSaving ? (
                                <div className="h-6 w-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>
                                  {/* Present */}
                                  <button
                                    onClick={() => handleMarkAttendance(m.id, 'present')}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                      currentStatus === 'present'
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                                        : 'border-white/5 text-white/50 hover:bg-emerald-500/5 hover:text-emerald-400'
                                    }`}
                                  >
                                    <Check size={14} />
                                    PRESENTE
                                  </button>

                                  {/* Late */}
                                  <button
                                    onClick={() => handleMarkAttendance(m.id, 'late')}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                      currentStatus === 'late'
                                        ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                                        : 'border-white/5 text-white/50 hover:bg-amber-500/5 hover:text-amber-400'
                                    }`}
                                  >
                                    <Clock size={14} />
                                    ATRASADO
                                  </button>

                                  {/* Absent */}
                                  <button
                                    onClick={() => handleMarkAttendance(m.id, 'absent')}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                      currentStatus === 'absent'
                                        ? 'bg-rose-500/20 text-rose-400 border-rose-500'
                                        : 'border-white/5 text-white/50 hover:bg-rose-500/5 hover:text-rose-400'
                                    }`}
                                  >
                                    <X size={14} />
                                    FALTOU
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        ) : (
        /* Team Attendance Monthly Summary View */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl border border-white/5" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-purple-400" />
              <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>Mês de Referência:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-purple-400 hover:text-purple-300 transition-all border border-white/5 cursor-pointer"
                title="Mês Anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="relative flex items-center">
                <input
                  type="month"
                  value={summaryMonth}
                  onChange={(e) => setSummaryMonth(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="rounded-xl pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer text-sm select-none"
                  style={{ ...inputStyle, width: '180px' }}
                />
                <ChevronDown size={14} className="absolute right-3 text-white/50 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-purple-400 hover:text-purple-300 transition-all border border-white/5 cursor-pointer"
                title="Próximo Mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
            {loadingSummary ? (
              <div className="flex items-center justify-center p-20">
                <QuantumLoader size={45} speed={1.75} color="var(--accent-color)" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                      <th className="p-6 text-xs font-black uppercase tracking-widest text-white/50">Membro da Equipe</th>
                      <th className="p-6 text-xs font-black uppercase tracking-widest text-white/50">Função</th>
                      <th className="p-6 text-xs font-black uppercase tracking-widest text-white/50 text-center">Dias com Aula</th>
                      <th className="p-6 text-xs font-black uppercase tracking-widest text-white/50 text-center">Horas de Aula (Aulas)</th>
                      <th className="p-6 text-xs font-black uppercase tracking-widest text-white/50 text-center">Presenças no Ponto</th>
                      <th className="p-6 text-xs font-black uppercase tracking-widest text-white/50 text-center">Status no Mês</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center opacity-50 text-sm">
                          Nenhum funcionário cadastrado.
                        </td>
                      </tr>
                    ) : (
                      members.map((m) => {
                        const data = summaryData[m.id] || { classDays: 0, classHours: 0, pointDays: 0 }
                        const roleConf = roleColors[m.role] || { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af', label: m.role }
                        const hasActivity = data.classDays > 0 || data.pointDays > 0

                        return (
                          <tr key={m.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                            <td className="p-6">
                              <div className="flex items-center gap-3">
                                {m.photo_url ? (
                                  <img 
                                    src={m.photo_url} 
                                    alt={m.name} 
                                    className="h-10 w-10 rounded-xl object-cover border border-purple-500/20 shadow-md shrink-0" 
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                                    <span className="text-white font-bold">{m.name.charAt(0)}</span>
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-white text-sm">{m.name}</p>
                                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m.specialty || 'Geral'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-6">
                              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full" style={{ backgroundColor: roleConf.bg, color: roleConf.text }}>
                                {roleConf.label}
                              </span>
                            </td>
                            <td className="p-6 text-center font-bold text-sm text-purple-300">
                              {data.classDays} {data.classDays === 1 ? 'dia' : 'dias'}
                            </td>
                            <td className="p-6 text-center font-bold text-sm text-emerald-400">
                              {data.classHours} {data.classHours === 1 ? 'hora' : 'horas'}
                            </td>
                            <td className="p-6 text-center font-bold text-sm text-blue-400">
                              {data.pointDays} {data.pointDays === 1 ? 'dia' : 'dias'}
                            </td>
                            <td className="p-6 text-center">
                              {hasActivity ? (
                                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Ativo
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/5 text-white/30">
                                  Sem Atividade
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Member Creation/Editing Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={() => { setShowModal(false); resetForm(); }} 
        title={editMember ? 'Editar Membro' : 'Novo Membro'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Informações Básicas */}
            <div className="sm:col-span-2">
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Nome Completo *</label>
              <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all" style={inputStyle} />
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Cargo / Função</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none" style={inputStyle}>
                  <option value="Secretário">Secretário</option>
                  <option value="Diretor">Diretor</option>
                  <option value="Professor">Professor</option>
                  <option value="Zelador">Zelador</option>
                  <option value="Porteiro">Porteiro</option>
                  <option value="Coordenador">Coordenador</option>
                  <option value="Diretor Financeiro">Diretor Financeiro</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Especialidade</label>
                <input value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} placeholder="Ex: Hip Hop, Ballet..." className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all" style={inputStyle} />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>E-mail de Contato</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all" style={inputStyle} />
            </div>
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Telefone / WhatsApp</label>
              <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all" style={inputStyle} />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Foto do Membro da Equipe</label>
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-2">
                {formData.photo_url ? (
                  <div className="p-1 rounded-2xl border border-dashed flex justify-center items-center bg-black/20 w-24 h-24 shrink-0 overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
                    <img src={formData.photo_url} alt="Foto Preview" className="h-full w-full object-cover rounded-xl" />
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-dashed flex justify-center items-center bg-black/20 w-24 h-24 shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>Sem foto</span>
                  </div>
                )}
                
                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-xs
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-xl file:border-0
                      file:text-xs file:font-semibold
                      file:bg-purple-600 file:text-white
                      hover:file:bg-purple-700
                      cursor-pointer transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Tamanho máximo recomendado: 2MB.
                  </p>
                  {formData.photo_url && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, photo_url: '' })}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors cursor-pointer"
                    >
                      Remover foto
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Seção Financeira com Destaque */}
            <div className="sm:col-span-2 p-8 sm:p-10 rounded-3xl bg-white/5 border border-white/5 mt-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-6 rounded-full bg-purple-500" />
                <h4 className="text-sm font-black uppercase tracking-widest text-white">Financeiro & Pagamentos</h4>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Hora Aula (R$)</label>
                  <input type="number" step="0.01" value={formData.hourly_rate} onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" style={inputStyle} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Passagem/Dia (R$)</label>
                  <input type="number" step="0.01" value={formData.daily_transport} onChange={(e) => setFormData({ ...formData, daily_transport: e.target.value })} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" style={inputStyle} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Salário Base (R$)</label>
                  <input type="number" step="0.01" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" style={inputStyle} />
                </div>
              </div>
              <p className="mt-4 text-[10px] text-white/30 italic">* A passagem será computada apenas uma vez por dia trabalhado automaticamente.</p>
            </div>
          </div>
          
          <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
            <button 
              type="button" 
              onClick={() => setShowModal(false)} 
              className="rounded-2xl px-8 py-3.5 text-sm font-bold transition-all hover:bg-white/5 border border-white/10" 
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="rounded-2xl px-10 py-3.5 text-sm font-black text-white transition-all hover:scale-105 shadow-xl shadow-purple-500/20" 
              style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
            >
              {editMember ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR MEMBRO'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
