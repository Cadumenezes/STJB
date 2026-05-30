import { useEffect, useState } from 'react'
import { ClipboardCheck, Check, X, Clock, Users, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DanceClass, Student } from '../types'

export default function AttendancePage() {
  const [classes, setClasses] = useState<DanceClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({})
  const [instructorPresence, setInstructorPresence] = useState<'present' | 'absent' | 'late' | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schoolOwnerId, setSchoolOwnerId] = useState<string | null>(null)

  // Estados e auxiliares para o mini calendário customizado
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    if (date) {
      const [year, month, day] = date.split('-')
      setCurrentMonth(new Date(parseInt(year), parseInt(month) - 1, 1))
    }
  }, [date])

  const getDaysInMonth = (dateVal: Date) => {
    const year = dateVal.getFullYear()
    const month = dateVal.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayIndex = new Date(year, month, 1).getDay()
    
    const daysArr: (number | null)[] = []
    for (let i = 0; i < firstDayIndex; i++) {
      daysArr.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      daysArr.push(i)
    }
    return daysArr
  }

  function formatDateDisplay(dateStr: string) {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']


  useEffect(() => {
    async function loadUserProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (profile?.role === 'teacher') {
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('email', profile.email)
            .eq('role', 'instructor')
            .eq('status', 'active')
            .maybeSingle()

          if (teamMember?.user_id) {
            setSchoolOwnerId(teamMember.user_id)
          }
        } else {
          setSchoolOwnerId(user.id)
        }
      }
    }
    loadUserProfile()
    loadClasses()
  }, [])

  useEffect(() => {
    if (selectedClassId) {
      loadClassData()
    } else {
      setStudents([])
      setAttendance({})
    }
  }, [selectedClassId, date])

  async function loadClasses() {
    const { data } = await supabase.from('dance_classes').select('*').order('name')
    setClasses(data || [])
    setLoading(false)
  }

  async function loadClassData() {
    setLoading(true)
    // Get students for this class
    const { data: studentsData } = await supabase.from('students').select('*').contains('class_ids', [selectedClassId]).eq('status', 'active')
    setStudents(studentsData || [])

    // Get today's attendance
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('*')
      .eq('class_id', selectedClassId)
      .eq('date', date)

    const attRecord: Record<string, 'present' | 'absent' | 'late'> = {}
    let instPresence: 'present' | 'absent' | 'late' | null = null

    if (attendanceData) {
      attendanceData.forEach((a) => {
        if (a.type === 'student' && a.student_id) {
          attRecord[a.student_id] = a.status
        } else if (a.type === 'instructor') {
          instPresence = a.status
        }
      })
    }
    
    setAttendance(attRecord)
    setInstructorPresence(instPresence)
    setLoading(false)
  }

  async function saveAttendance() {
    if (!schoolOwnerId) {
      alert('Erro: ID do proprietário da escola não encontrado. Verifique o cadastro do seu e-mail como professor.')
      return
    }

    setSaving(true)
    
    // delete previous records for this class & date
    await supabase.from('attendance').delete().eq('class_id', selectedClassId).eq('date', date)

    const inserts = []

    if (instructorPresence) {
      const selectedClass = classes.find(c => c.id === selectedClassId)
      inserts.push({
        class_id: selectedClassId,
        instructor_id: selectedClass?.instructor_id,
        date,
        status: instructorPresence,
        type: 'instructor',
        user_id: schoolOwnerId
      })
    }

    Object.entries(attendance).forEach(([studentId, status]) => {
      inserts.push({
        class_id: selectedClassId,
        student_id: studentId,
        date,
        status,
        type: 'student',
        user_id: schoolOwnerId
      })
    })

    if (inserts.length > 0) {
      await supabase.from('attendance').insert(inserts)
    }
    
    alert('Chamada salva com sucesso!')
    setSaving(false)
  }

  // Calculate Real-time Statistics
  const totalStudents = students.length
  const presentCount = Object.values(attendance).filter(status => status === 'present').length
  const lateCount = Object.values(attendance).filter(status => status === 'late').length
  const absentCount = Object.values(attendance).filter(status => status === 'absent').length
  const attendanceRate = totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0

  return (
    <div className="flex flex-col pb-10 space-y-6">
      {/* Header Section with Background Highlight */}
      <div 
        className="p-8 sm:p-10 pb-16 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden"
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
              className="font-black tracking-tighter leading-tight inline-block py-8 rounded-2xl shadow-2xl shadow-purple-500/30" 
              style={{ 
                backgroundColor: 'var(--accent-color)', 
                color: '#fff',
                fontSize: 'var(--title-size, 32px)',
                paddingLeft: '40px',
                paddingRight: '40px'
              }}
            >
              Chamada Diária
            </h1>
            <br />
            <p 
              className="font-bold inline-block py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
               style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: '32px', paddingRight: '32px' }}
            >
              Controle de presença e pontualidade dos alunos e professores em tempo real
            </p>
          </div>
        </div>
      </div>

      {/* Selection Toolbar with Cards Theme */}
      <div className="p-6 rounded-none shadow-xl flex flex-col sm:flex-row gap-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="flex-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Turma / Aula</label>
          <select 
            value={selectedClassId} 
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-white transition-all hover:border-purple-500/30"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          >
            <option value="" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>-- Escolha uma turma --</option>
            {classes.map(c => (
              <option key={c.id} value={c.id} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                {c.name} ({c.schedule})
              </option>
            ))}
          </select>
        </div>
        <div className="sm:w-60 relative">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Data da Aula</label>
          <button 
            type="button"
            onClick={() => setShowCalendar(!showCalendar)}
            className="w-full rounded-xl px-4 py-3 text-sm flex items-center justify-between text-white transition-all hover:border-purple-500/30 text-left border cursor-pointer"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          >
            <span>{formatDateDisplay(date)}</span>
            <Calendar size={18} className="text-purple-400" />
          </button>
          
          {showCalendar && (
            <div 
              className="absolute right-0 top-full mt-2 z-50 p-4 rounded-xl shadow-2xl w-72 border backdrop-blur-md"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              {/* Header: Month & Year Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button 
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer font-bold text-sm"
                >
                  &larr;
                </button>
                <span className="font-bold text-sm text-white">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button 
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer font-bold text-sm"
                >
                  &rarr;
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {weekDays.map((d, i) => (
                  <span key={i} className="text-[10px] font-bold text-gray-500 uppercase">
                    {d}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {getDaysInMonth(currentMonth).map((day, index) => {
                  if (day === null) {
                    return <div key={index} className="h-8 w-8" />
                  }
                  
                  const formattedDay = day.toString().padStart(2, '0')
                  const formattedMonth = (currentMonth.getMonth() + 1).toString().padStart(2, '0')
                  const formattedYear = currentMonth.getFullYear()
                  const currentDayStr = `${formattedYear}-${formattedMonth}-${formattedDay}`
                  const isSelected = date === currentDayStr
                  
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setDate(currentDayStr)
                        setShowCalendar(false)
                      }}
                      className={`h-8 w-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                          : 'text-gray-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedClassId && (
        <>
          {/* Real-time Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              className="p-5 rounded-none flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-purple-500/30 transition-all"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <div>
                <span className="text-xs font-medium text-gray-400 uppercase">Frequência Geral</span>
                <h4 className="text-2xl font-black text-white mt-1">{attendanceRate}%</h4>
              </div>
              <div className="h-10 w-10 rounded-none bg-purple-500/10 flex items-center justify-center text-purple-400">
                <ClipboardCheck size={20} />
              </div>
            </div>
            <div 
              className="p-5 rounded-none flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <div>
                <span className="text-xs font-medium text-gray-400 uppercase">Presentes</span>
                <h4 className="text-2xl font-black text-emerald-400 mt-1">
                  {presentCount} <span className="text-xs font-normal text-gray-500">/ {totalStudents}</span>
                </h4>
              </div>
              <div className="h-10 w-10 rounded-none bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Check size={20} />
              </div>
            </div>
            <div 
              className="p-5 rounded-none flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-all"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <div>
                <span className="text-xs font-medium text-gray-400 uppercase">Atrasados</span>
                <h4 className="text-2xl font-black text-amber-400 mt-1">{lateCount}</h4>
              </div>
              <div className="h-10 w-10 rounded-none bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Clock size={20} />
              </div>
            </div>
            <div 
              className="p-5 rounded-none flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-rose-500/30 transition-all"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <div>
                <span className="text-xs font-medium text-gray-400 uppercase">Faltas</span>
                <h4 className="text-2xl font-black text-rose-400 mt-1">{absentCount}</h4>
              </div>
              <div className="h-10 w-10 rounded-none bg-rose-500/10 flex items-center justify-center text-rose-400">
                <X size={20} />
              </div>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left/Main Column: Students List */}
            <div className="lg:col-span-2 space-y-6">
              <div 
                className="rounded-none p-6 shadow-xl relative overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">Alunos Matriculados</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Marque a presença de cada aluno individualmente.</p>
                  </div>
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {totalStudents} alunos
                  </span>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="h-8 w-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-3" />
                    <span className="text-xs text-gray-400">Buscando alunos...</span>
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-12 border border-dashed rounded-xl bg-black/10" style={{ borderColor: 'var(--border-color)' }}>
                    <Users className="mx-auto text-gray-600 mb-2" size={32} />
                    <p className="text-sm text-gray-400">Nenhum aluno matriculado nesta turma.</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                    {students.map(student => {
                      const status = attendance[student.id]
                      return (
                        <div key={student.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 first:pt-0 last:pb-0 gap-4 transition-all hover:bg-white/[0.01] rounded-lg px-2 -mx-2">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-sm font-bold text-purple-300">
                              {student.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-white">{student.name}</h4>
                              <p className="text-xs text-gray-400 mt-0.5">Aluno ativo na turma</p>
                            </div>
                          </div>
                          
                          {/* Presence Action Pills */}
                          <div className="flex gap-2 justify-end sm:justify-start">
                            <button 
                              onClick={() => setAttendance(prev => ({...prev, [student.id]: 'present'}))}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border duration-200 cursor-pointer ${
                                status === 'present' 
                                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)] scale-105' 
                                  : 'text-gray-400 hover:text-white'
                              }`}
                              style={status !== 'present' ? { borderColor: 'var(--border-color)', backgroundColor: 'rgba(0,0,0,0.15)' } : {}}
                            >
                              <Check size={14} /> Presente
                            </button>
                            <button 
                              onClick={() => setAttendance(prev => ({...prev, [student.id]: 'late'}))}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border duration-200 cursor-pointer ${
                                status === 'late' 
                                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)] scale-105' 
                                  : 'text-gray-400 hover:text-white'
                              }`}
                              style={status !== 'late' ? { borderColor: 'var(--border-color)', backgroundColor: 'rgba(0,0,0,0.15)' } : {}}
                            >
                              <Clock size={14} /> Atrasado
                            </button>
                            <button 
                              onClick={() => setAttendance(prev => ({...prev, [student.id]: 'absent'}))}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border duration-200 cursor-pointer ${
                                status === 'absent' 
                                  ? 'border-rose-500/50 bg-rose-500/15 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)] scale-105' 
                                  : 'text-gray-400 hover:text-white'
                              }`}
                              style={status !== 'absent' ? { borderColor: 'var(--border-color)', backgroundColor: 'rgba(0,0,0,0.15)' } : {}}
                            >
                              <X size={14} /> Falta
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Instructor Status & Sinking Action */}
            <div className="space-y-6">
              {/* Instructor Team Card */}
              <div 
                className="rounded-none p-6 shadow-xl relative overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                <h3 className="text-lg font-bold text-white mb-4">Professor da Turma</h3>
                
                {(() => {
                  const selectedClass = classes.find(c => c.id === selectedClassId)
                  return (
                    <div className="space-y-6">
                      <div 
                        className="p-4 rounded-xl flex items-center gap-3"
                        style={{ backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)' }}
                      >
                        <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold">
                          👨‍🏫
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">
                            {selectedClass ? "Docente Vinculado" : "Nenhum professor"}
                          </h4>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {selectedClass?.schedule || "Horário não definido"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Presença do Professor</span>
                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            onClick={() => setInstructorPresence('present')}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold border transition-all duration-200 gap-1.5 cursor-pointer ${
                              instructorPresence === 'present' 
                                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)] scale-105' 
                                : 'text-gray-400 hover:text-white'
                            }`}
                            style={instructorPresence !== 'present' ? { borderColor: 'var(--border-color)', backgroundColor: 'rgba(0,0,0,0.15)' } : {}}
                          >
                            <Check size={16} /> Presente
                          </button>
                          <button 
                            onClick={() => setInstructorPresence('late')}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold border transition-all duration-200 gap-1.5 cursor-pointer ${
                              instructorPresence === 'late' 
                                ? 'border-amber-500/50 bg-amber-500/15 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)] scale-105' 
                                : 'text-gray-400 hover:text-white'
                            }`}
                            style={instructorPresence !== 'late' ? { borderColor: 'var(--border-color)', backgroundColor: 'rgba(0,0,0,0.15)' } : {}}
                          >
                            <Clock size={16} /> Atrasado
                          </button>
                          <button 
                            onClick={() => setInstructorPresence('absent')}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold border transition-all duration-200 gap-1.5 cursor-pointer ${
                              instructorPresence === 'absent' 
                                ? 'border-rose-500/50 bg-rose-500/15 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)] scale-105' 
                                : 'text-gray-400 hover:text-white'
                            }`}
                            style={instructorPresence !== 'absent' ? { borderColor: 'var(--border-color)', backgroundColor: 'rgba(0,0,0,0.15)' } : {}}
                          >
                            <X size={16} /> Faltou
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Sync Action Card */}
              <div 
                className="rounded-none p-6 shadow-xl space-y-4"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                <h4 className="text-sm font-bold text-white">Finalizar Chamada</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Ao salvar, o registro será sincronizado com o banco de dados da escola para fins de acompanhamento pedagógico e financeiro.
                </p>
                <button 
                  onClick={saveAttendance}
                  disabled={saving || (students.length === 0 && !instructorPresence)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  <ClipboardCheck size={18} />
                  {saving ? 'Salvando...' : 'Salvar Chamada'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
