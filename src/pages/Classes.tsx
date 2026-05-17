import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Users, Music, UserCheck, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DanceClass, TeamMember } from '../types'
import Modal from '../components/Modal'

export default function Classes() {
  const [classes, setClasses] = useState<DanceClass[]>([])
  const [instructors, setInstructors] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editClass, setEditClass] = useState<DanceClass | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    schedule: '',
    max_students: 20,
    style: '',
    instructor_id: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: classesData } = await supabase.from('dance_classes').select('*').order('name')
    setClasses(classesData || [])

    const { data: instructorsData } = await supabase.from('team_members').select('*').eq('role', 'instructor').order('name')
    setInstructors(instructorsData || [])
    
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const payload = {
      ...formData,
      instructor_id: formData.instructor_id || null
    }

    let error = null
    if (editClass) {
      const res = await supabase.from('dance_classes').update(payload).eq('id', editClass.id)
      error = res.error
    } else {
      const res = await supabase.from('dance_classes').insert([payload])
      error = res.error
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
    })
    setShowModal(true)
  }

  function resetForm() {
    setFormData({ 
      name: '', description: '', schedule: '', 
      max_students: 20, style: '', instructor_id: '' 
    })
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
    <div className="space-y-12 pb-10">
      {/* Header Section with Dynamic Style */}
      <div 
        className="p-8 sm:p-10 pb-16 rounded-2xl border border-white/5 shadow-2xl mb-36 relative overflow-hidden"
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
              className="font-black tracking-tighter leading-tight inline-block px-12 py-5 rounded-2xl shadow-2xl shadow-purple-500/30" 
              style={{ 
                backgroundColor: 'var(--accent-color)', 
                color: '#fff',
                fontSize: 'var(--title-size, 32px)' 
              }}
            >
              Turmas
            </h1>
            <br />
            <p 
              className="font-bold inline-block px-10 py-4 rounded-2xl border border-white/10 shadow-2xl" 
               style={{ background: 'var(--accent-gradient, linear-gradient(135deg, #8b5cf6, #ec4899))', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', opacity: 0.95 }}
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
        {classes.map((cls) => {
          const instructor = instructors.find(i => i.id === cls.instructor_id)
          return (
            <div
              key={cls.id}
              className="group rounded-2xl p-8 sm:p-10 transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl border border-white/5"
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl p-3" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)' }}>
                    <Music size={28} style={{ color: '#8b5cf6' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{cls.name}</h3>
                    <p className="text-xs font-black uppercase tracking-widest text-purple-400">{cls.style}</p>
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

              <div className="mt-6 flex justify-end gap-2" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button onClick={() => openEdit(cls)} className="p-2.5 rounded-2xl hover:opacity-70 transition-all hover:bg-blue-500/10" style={{ color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                  <Edit size={18} />
                </button>
                <button onClick={() => handleDelete(cls.id)} className="p-2.5 rounded-2xl hover:opacity-70 transition-all hover:bg-rose-500/10" style={{ color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.1)' }}>
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Horário / Dias</label>
                <input value={formData.schedule} onChange={(e) => setFormData({ ...formData, schedule: e.target.value })} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" style={inputStyle} />
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
