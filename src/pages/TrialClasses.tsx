import { useEffect, useState } from 'react'
import {
  Star, UserPlus, Search, Phone, Calendar, Clock,
  CheckCircle, XCircle, ChevronDown, Check
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { TrialClass, DanceClass } from '../types'
import Modal from '../components/Modal'

export default function TrialClasses() {
  const [trials, setTrials] = useState<TrialClass[]>([])
  const [classes, setClasses] = useState<DanceClass[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [schoolName, setSchoolName] = useState('DanceFlow')
  
  const [formData, setFormData] = useState({
    student_name: '',
    phone: '',
    class_id: '',
    trial_date: '',
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: trialsData } = await supabase.from('trial_classes').select('*').order('trial_date', { ascending: false })
    const { data: classesData } = await supabase.from('dance_classes').select('*').order('name')
    const { data: settings } = await supabase.from('school_settings').select('school_name').limit(1).single()
    
    if (settings?.school_name) setSchoolName(settings.school_name)
    setTrials(trialsData || [])
    setClasses(classesData || [])
    setLoading(false)
  }

  async function handleAddTrial(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...formData,
      class_id: formData.class_id || null,
    }
    const { error } = await supabase.from('trial_classes').insert([payload])
    if (!error) {
      setShowAddModal(false)
      setFormData({ student_name: '', phone: '', class_id: '', trial_date: '', notes: '' })
      loadData()
    } else {
      alert('Erro ao agendar: ' + error.message)
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    const { error } = await supabase.from('trial_classes').update({ status: newStatus }).eq('id', id)
    if (!error) {
      loadData()
    } else {
      alert('Erro ao atualizar status: ' + error.message)
    }
  }

  const filteredTrials = trials.filter((t) =>
    t.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.phone && t.phone.includes(searchTerm))
  )

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    scheduled: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', label: 'Agendada' },
    attended: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', label: 'Compareceu' },
    no_show: { bg: 'rgba(244, 63, 94, 0.15)', text: '#f43f5e', label: 'Faltou' },
    enrolled: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', label: 'Matriculado' },
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--accent-color)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-10">
      <div 
        className="p-5 sm:p-8 md:p-10 pb-10 sm:pb-16 rounded-3xl border border-white/5 shadow-2xl mb-12 relative overflow-hidden"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
      >
        <div 
          className="absolute -left-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-20"
          style={{ backgroundColor: 'var(--accent-color)' }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8 relative z-10">
          <div className="space-y-4">
            <h1 
              className="font-black tracking-tighter leading-tight inline-block py-3 sm:py-6 rounded-2xl shadow-2xl shadow-purple-500/30" 
              style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--title-size, 32px)', paddingLeft: 'clamp(16px, 4vw, 40px)', paddingRight: 'clamp(16px, 4vw, 40px)' }}
            >
              Aulas Experimentais
            </h1>
            <br />
            <p 
              className="font-bold inline-block py-2 sm:py-4 mt-2 rounded-2xl shadow-xl border border-white/10" 
              style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: 'clamp(12px, 3vw, 32px)', paddingRight: 'clamp(12px, 3vw, 32px)' }}
            >
              Gerencie interessados, agendamentos e converta leads em alunos!
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/20"
            style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
          >
            <UserPlus size={26} />
            Agendar Aula
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl px-4 py-3.5 border mb-12 shadow-lg" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
        <Search size={18} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
        <input
          placeholder="Buscar interessado por nome ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-sm text-white focus:outline-none placeholder:text-gray-500"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrials.map((trial) => {
          const statusInfo = statusColors[trial.status]
          const targetClass = classes.find(c => c.id === trial.class_id)
          
          return (
            <div 
              key={trial.id} 
              className="rounded-3xl p-8 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
              style={{ backgroundColor: 'var(--bg-card)', border: `1px solid var(--border-color)` }}
            >
              <div className="flex justify-between items-center mb-4 gap-2 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-black text-white font-black text-lg shadow-lg shrink-0">
                    {trial.student_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black uppercase tracking-tight truncate text-sm sm:text-base" style={{ color: 'var(--text-primary)' }} title={trial.student_name}>{trial.student_name}</h3>
                    <p className="text-[10px] sm:text-xs font-medium truncate" style={{ color: 'var(--text-muted)' }}>Agendado em {new Date(trial.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <span 
                  className="px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border shrink-0 whitespace-nowrap"
                  style={{ backgroundColor: statusInfo.bg, color: statusInfo.text, borderColor: `${statusInfo.text}33` }}
                >
                  {statusInfo.label}
                </span>
              </div>

              <div className="space-y-3 mb-6 p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-3">
                  <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {new Date(trial.trial_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Star size={16} style={{ color: 'var(--accent-color)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {targetClass?.name || 'Turma não definida'}
                  </span>
                </div>
                {trial.phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-emerald-400" />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{trial.phone}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {trial.status === 'scheduled' && (
                  <>
                    <button onClick={() => updateStatus(trial.id, 'attended')} className="flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors">
                      <CheckCircle size={14} /> Compareceu
                    </button>
                    <button onClick={() => updateStatus(trial.id, 'no_show')} className="flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors">
                      <XCircle size={14} /> Faltou
                    </button>
                  </>
                )}
                {(trial.status === 'attended' || trial.status === 'no_show') && (
                  <button onClick={() => updateStatus(trial.id, 'enrolled')} className="col-span-2 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-purple-500/20 hover:scale-105 transition-all" style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}>
                    <Check size={16} /> Matricular Aluno
                  </button>
                )}
              </div>

              {trial.phone && (
                <a
                  href={`https://wa.me/55${trial.phone.replace(/\\D/g, '')}?text=Olá ${trial.student_name.split(' ')[0]}! Tudo bem? Passando para lembrar do seu compromisso hoje. Te espero aqui no ${schoolName}!`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-emerald-400 border border-dashed border-emerald-500/30 hover:bg-emerald-500/10 transition-colors"
                >
                  <Phone size={14} /> Chamar no WhatsApp
                </a>
              )}
            </div>
          )
        })}

        {filteredTrials.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <Star size={48} className="mx-auto mb-6 opacity-40 animate-pulse" style={{ color: 'var(--accent-color)' }} />
            <br />
            <p 
              className="font-bold inline-block py-3 px-8 rounded-2xl shadow-xl border border-white/10" 
              style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)' }}
            >
              Nenhuma aula experimental agendada.
            </p>
          </div>
        )}
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Agendar Experimental">
        <form onSubmit={handleAddTrial} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome do Interessado *</label>
            <input required value={formData.student_name} onChange={(e) => setFormData({ ...formData, student_name: e.target.value })} className="w-full rounded-2xl px-4 py-2.5 text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Telefone (WhatsApp)</label>
            <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full rounded-2xl px-4 py-2.5 text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Turma de Interesse</label>
            <select value={formData.class_id} onChange={(e) => setFormData({ ...formData, class_id: e.target.value })} className="w-full rounded-2xl px-4 py-3 text-sm appearance-none" style={inputStyle}>
              <option value="">-- Selecione uma turma --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.schedule})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Data Agendada *</label>
            <input required type="date" value={formData.trial_date} onChange={(e) => setFormData({ ...formData, trial_date: e.target.value })} className="w-full rounded-2xl px-4 py-2.5 text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Observações</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full rounded-2xl px-4 py-2.5 text-sm resize-none" style={inputStyle} />
          </div>
          <button type="submit" className="w-full mt-4 rounded-2xl px-5 py-4 text-sm font-bold text-white uppercase tracking-widest shadow-xl shadow-purple-500/20 transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}>
            Confirmar Agendamento
          </button>
        </form>
      </Modal>
    </div>
  )
}
