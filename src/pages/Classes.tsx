import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Users, Music, UserCheck, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DanceClass, TeamMember, Student, Profile } from '../types'
import Modal from '../components/Modal'

export default function Classes() {
  const [classes, setClasses] = useState<DanceClass[]>([])
  const [instructors, setInstructors] = useState<TeamMember[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editClass, setEditClass] = useState<DanceClass | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    schedule: '',
    max_students: 20,
    style: '',
    instructor_id: '',
    age_group: '',
    display_order: 0,
  })
  
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [classTime, setClassTime] = useState('')

  useEffect(() => {
    loadData()
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data || null)
    }
  }

  async function loadData() {
    setLoading(true)
    
    // Resilient load sorting by display_order, fallback to name
    let res = await supabase.from('dance_classes').select('*').order('display_order', { ascending: true })
    if (res.error) {
      res = await supabase.from('dance_classes').select('*').order('name', { ascending: true })
    }
    setClasses(res.data || [])

    const { data: instructorsData } = await supabase.from('team_members').select('*').or('role.eq.instructor,role.eq.Professor').order('name')
    setInstructors(instructorsData || [])

    const { data: studentsData } = await supabase.from('students').select('*').order('name')
    setStudents(studentsData || [])
    
    setLoading(false)
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
  }

  async function handleDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) return

    const reordered = [...classes]
    const [draggedItem] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, draggedItem)

    setClasses(reordered) // Instant UI update

    // Save display_order sequentially in database
    const updates = reordered.map((cls, idx) => {
      return supabase
        .from('dance_classes')
        .update({ display_order: idx })
        .eq('id', cls.id)
    })

    const results = await Promise.all(updates)
    const errors = results.map(r => r.error).filter(Boolean)

    if (errors.length > 0) {
      console.error('Erro ao salvar reordenação:', errors)
      alert('Erro ao salvar a nova ordem das turmas no banco de dados.')
    } else {
      loadData()
    }

    setDraggedIndex(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const finalSchedule = selectedDays.length > 0 
      ? `${selectedDays.join(', ')} às ${classTime}`
      : classTime

    const payload = {
      ...formData,
      schedule: finalSchedule,
      instructor_id: formData.instructor_id || null,
      display_order: Number(formData.display_order) || 0
    }

    let error = null
    const res = editClass 
      ? await supabase.from('dance_classes').update(payload).eq('id', editClass.id)
      : await supabase.from('dance_classes').insert([payload])
    error = res.error
    
    if (error && (error.message.includes('column') || error.code === 'PGRST204' || error.message.includes('não existe'))) {
      // Fallback: strip new columns and save
      const strippedPayload: any = { ...payload }
      delete strippedPayload.age_group
      delete strippedPayload.display_order
      
      const retryRes = editClass
        ? await supabase.from('dance_classes').update(strippedPayload).eq('id', editClass.id)
        : await supabase.from('dance_classes').insert([strippedPayload])
      error = retryRes.error
      if (!error) {
        alert('Turma salva com sucesso! (Nota: as novas colunas de Faixa Etária e Ordenação não foram salvas no banco de dados. Por favor, execute o script SQL de migração).')
      }
    }
    
    if (error) {
      console.error(error)
      alert('Erro ao salvar turma: ' + error.message)
    } else {
      setShowModal(false)
      setEditClass(null)
      resetForm()
      loadData()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta turma?')) return
    await supabase.from('dance_classes').delete().eq('id', id)
    loadData()
  }

  function openEdit(cls: DanceClass) {
    setEditClass(cls)
    setFormData({
      name: cls.name,
      description: cls.description || '',
      schedule: cls.schedule || '',
      max_students: cls.max_students || 20,
      style: cls.style || '',
      instructor_id: cls.instructor_id || '',
      age_group: cls.age_group || '',
      display_order: cls.display_order || 0,
    })

    const sched = cls.schedule || ''
    const parts = sched.split(/ às | - | at /i)
    if (parts.length >= 2) {
      const daysPart = parts[0]
      const timePart = parts.slice(1).join(' - ')
      
      const parsedDays = daysPart.split(',').map(d => d.trim()).filter(Boolean)
      setSelectedDays(parsedDays)
      setClassTime(timePart)
    } else {
      setSelectedDays([])
      setClassTime(sched)
    }

    setShowModal(true)
  }

  function resetForm() {
    setFormData({ 
      name: '', description: '', schedule: '', 
      max_students: 20, style: '', instructor_id: '',
      age_group: '', display_order: 0
    })
    setSelectedDays([])
    setClassTime('')
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  }

  if (loading && classes.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--accent-color)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-10 px-4 sm:px-8 lg:px-12">
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
              Turmas
            </h1>
            <br />
            <p 
              className="font-bold inline-block py-3 sm:py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
               style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: 'clamp(12px, 3vw, 32px)', paddingRight: 'clamp(12px, 3vw, 32px)' }}
            >
              Gerencie os horários, estilos e os professores de cada turma
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setEditClass(null); setShowModal(true) }}
            className="flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/20"
            style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
          >
            <Music size={26} />
            Nova Turma
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {classes.map((cls, idx) => {
          const instructor = instructors.find(i => i.id === cls.instructor_id)
          const isDraggable = ((profile?.role as any) === 'admin' || (profile?.role as any) === 'Diretor' || (profile?.role as any) === 'user')
          
          return (
            <div
              key={cls.id}
              draggable={isDraggable}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              className={`group rounded-2xl p-8 sm:p-10 transition-all duration-300 border border-white/5 ${
                draggedIndex === idx ? 'opacity-40 scale-95 border-purple-500/50' : 'hover:scale-[1.03] hover:shadow-2xl'
              } ${
                isDraggable ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl p-3" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)' }}>
                    <Music size={28} style={{ color: '#8b5cf6' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{cls.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <p className="text-xs font-black uppercase tracking-widest text-purple-400">{cls.style}</p>
                      {cls.age_group && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
                          {cls.age_group}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 space-y-3 border-t border-white/5 pt-4">
                <div className="flex items-center gap-3 text-sm">
                  <UserCheck size={18} className="text-emerald-400" />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <strong>Professor:</strong> {instructor ? instructor.name : 'Não atribuído'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock size={18} className="text-blue-400" />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <strong>Horário:</strong> {cls.schedule || 'Não definido'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Users size={18} className="text-purple-400" />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <strong>Vagas:</strong> {cls.max_students}
                  </span>
                </div>
              </div>

              {/* Students List */}
              <div className="mt-4 pt-4" style={{ borderTop: '1px dashed var(--border-color)' }}>
                <h4 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">Alunos Matriculados</h4>
                <div className="max-h-32 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                  {(() => {
                    const classStudents = students.filter(s => s.class_id === cls.id || (s.class_ids && s.class_ids.includes(cls.id)))
                    if (classStudents.length === 0) {
                      return <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Nenhum aluno nesta turma.</p>
                    }
                    return classStudents.map(student => {
                      const names = student.name.split(' ')
                      const displayName = names.length > 1 ? `${names[0]} ${names[names.length - 1]}` : names[0]
                      return (
                        <div key={student.id} className="text-sm py-1 px-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                          <span style={{ color: 'var(--text-primary)' }}>{displayName}</span>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button onClick={() => openEdit(cls)} className="p-2.5 rounded-2xl hover:opacity-70 transition-all hover:bg-blue-500/10 cursor-pointer" style={{ color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                  <Edit size={18} />
                </button>
                <button onClick={() => handleDelete(cls.id)} className="p-2.5 rounded-2xl hover:opacity-70 transition-all hover:bg-rose-500/10 cursor-pointer" style={{ color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.1)' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); setEditClass(null); }} title={editClass ? 'Editar Turma' : 'Nova Turma'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Nome da Turma *</label>
              <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" style={inputStyle} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Professor Responsável</label>
                <select 
                  value={formData.instructor_id} 
                  onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })} 
                  className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none" 
                  style={inputStyle}
                >
                  <option value="">-- Selecione um Professor --</option>
                  {instructors.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Estilo (Ex: Ballet, Jazz)</label>
                <input value={formData.style} onChange={(e) => setFormData({ ...formData, style: e.target.value })} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" style={inputStyle} />
              </div>
              <div>
                <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Faixa Etária</label>
                <input placeholder="Ex: Infantil, Adulto, 7-10 anos" value={formData.age_group} onChange={(e) => setFormData({ ...formData, age_group: e.target.value })} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" style={inputStyle} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-full space-y-4">
                <div>
                  <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Dias da Semana</label>
                  <div className="flex flex-wrap gap-2 p-3.5 rounded-2xl bg-black/20 border" style={{ borderColor: 'var(--border-color)' }}>
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => {
                      const isSelected = selectedDays.includes(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedDays(selectedDays.filter(d => d !== day))
                            } else {
                              setSelectedDays([...selectedDays, day])
                            }
                          }}
                          className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer border ${
                            isSelected ? 'bg-purple-600 text-white border-transparent shadow-lg shadow-purple-500/20 scale-[1.02]' : 'bg-transparent text-[var(--text-secondary)] border-white/10 hover:text-white'
                          }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Horário das Aulas *</label>
                  <input 
                    required 
                    placeholder="Ex: 19:00 - 20:00 ou 18:30" 
                    value={classTime} 
                    onChange={(e) => setClassTime(e.target.value)} 
                    className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                    style={inputStyle} 
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Vagas Totais</label>
                <input type="number" required min="1" value={formData.max_students} onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) })} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" style={inputStyle} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="rounded-2xl px-6 py-3 text-sm font-bold transition-all hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>Cancelar</button>
            <button 
              type="submit" 
              className="rounded-2xl px-8 py-3 text-sm font-bold text-white transition-all hover:scale-105 shadow-lg shadow-purple-500/20" 
              style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
            >
              {editClass ? 'Salvar Alterações' : 'Cadastrar Turma'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
