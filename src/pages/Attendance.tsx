import { useEffect, useState } from 'react'
import { ClipboardCheck, Search, Check, X, Clock } from 'lucide-react'
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

  useEffect(() => {
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
    const { data: studentsData } = await supabase.from('students').select('*').eq('class_id', selectedClassId).eq('status', 'active')
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
        type: 'instructor'
      })
    }

    Object.entries(attendance).forEach(([studentId, status]) => {
      inserts.push({
        class_id: selectedClassId,
        student_id: studentId,
        date,
        status,
        type: 'student'
      })
    })

    if (inserts.length > 0) {
      await supabase.from('attendance').insert(inserts)
    }
    
    alert('Chamada salva com sucesso!')
    setSaving(false)
  }

  const selectStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="space-y-12 pb-10">
      {/* Header Section with Dynamic Style */}
      <div 
        className="p-8 sm:p-10 pb-16 rounded-2xl border border-white/5 shadow-2xl mb-20 relative overflow-hidden"
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
              className="font-black tracking-tighter leading-tight inline-block pl-20 pr-8 py-3 rounded-2xl shadow-lg shadow-purple-500/20" 
              style={{ 
                backgroundColor: 'var(--accent-color)', 
                color: '#fff',
                fontSize: 'var(--title-size, 32px)' 
              }}
            >
              Chamada
            </h1>
            <br />
            <p 
              className="font-medium inline-block pl-16 pr-5 py-2 rounded-2xl border border-white/5" 
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: 'var(--text-secondary)', 
                fontSize: 'var(--subtitle-size, 16px)' 
              }}
            >
              Marque a presença de alunos e professor
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Selecione a Turma</label>
          <select 
            value={selectedClassId} 
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            style={selectStyle}
          >
            <option value="">-- Escolha uma turma --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.schedule})</option>)}
          </select>
        </div>
        <div className="sm:w-48">
          <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Data</label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            style={selectStyle}
          />
        </div>
      </div>

      {selectedClassId && (
        <div className="space-y-6">
          {/* Professor */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Professor da Turma</h3>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Status:</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setInstructorPresence('present')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm transition-colors border ${instructorPresence === 'present' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
                >
                  <Check size={16} /> Presente
                </button>
                <button 
                  onClick={() => setInstructorPresence('late')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm transition-colors border ${instructorPresence === 'late' ? 'border-amber-500 bg-amber-500/20 text-amber-400' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
                >
                  <Clock size={16} /> Atrasado
                </button>
                <button 
                  onClick={() => setInstructorPresence('absent')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm transition-colors border ${instructorPresence === 'absent' ? 'border-rose-500 bg-rose-500/20 text-rose-400' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
                >
                  <X size={16} /> Faltou
                </button>
              </div>
            </div>
          </div>

          {/* Alunos */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Alunos Matriculados</h3>
            </div>
            
            {students.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>Nenhum aluno matriculado nesta turma.</p>
            ) : (
              <div className="space-y-3">
                {students.map(student => (
                  <div key={student.id} className="flex items-center justify-between p-3 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{student.name}</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setAttendance(prev => ({...prev, [student.id]: 'present'}))}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors border ${attendance[student.id] === 'present' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'}`}
                      >
                        <Check size={14} /> P
                      </button>
                      <button 
                        onClick={() => setAttendance(prev => ({...prev, [student.id]: 'late'}))}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors border ${attendance[student.id] === 'late' ? 'border-amber-500 bg-amber-500/20 text-amber-400' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'}`}
                      >
                        <Clock size={14} /> A
                      </button>
                      <button 
                        onClick={() => setAttendance(prev => ({...prev, [student.id]: 'absent'}))}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors border ${attendance[student.id] === 'absent' ? 'border-rose-500 bg-rose-500/20 text-rose-400' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'}`}
                      >
                        <X size={14} /> F
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={saveAttendance}
                disabled={saving || (students.length === 0 && !instructorPresence)}
                className="flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                <ClipboardCheck size={18} />
                {saving ? 'Salvando...' : 'Salvar Chamada'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
