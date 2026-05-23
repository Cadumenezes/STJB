import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, UserCog } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { TeamMember } from '../types'
import Modal from '../components/Modal'

export default function Team() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editMember, setEditMember] = useState<TeamMember | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'instructor' as 'instructor' | 'staff' | 'admin',
    specialty: '',
    salary: '',
    hourly_rate: '',
    daily_transport: '',
  })

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    setLoading(true)
    const { data } = await supabase.from('team_members').select('*').order('name')
    setMembers(data || [])
    setLoading(false)
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
    })
    setShowModal(true)
  }

  function resetForm() {
    setFormData({ 
      name: '', email: '', phone: '', role: 'instructor', specialty: '', 
      salary: '', hourly_rate: '', daily_transport: '' 
    })
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  }

  const roleColors = {
    instructor: { bg: 'rgba(139,92,246,0.15)', text: '#8b5cf6', label: 'Professor' },
    staff: { bg: 'rgba(16,185,129,0.15)', text: '#10b981', label: 'Staff' },
    admin: { bg: 'rgba(244,63,94,0.15)', text: '#f43f5e', label: 'Admin' },
  }

  return (
    <div className="flex flex-col pb-10">
      {/* Header Section with Dynamic Style */}
      <div 
        className="p-8 sm:p-10 pb-16 rounded-2xl border border-white/5 shadow-2xl mb-52 relative overflow-hidden"
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
              Equipe
            </h1>
            <br />
            <p 
              className="font-bold inline-block px-12 py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
               style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)' }}
            >
              Gerencie seus professores, funcionários e informações de pagamento
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setEditMember(null); setShowModal(true) }}
            className="flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/20"
            style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
          >
            <Plus size={26} />
            Novo Membro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {members.map((m) => (
          <div
            key={m.id}
            className="group rounded-2xl p-8 sm:p-10 transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl border border-white/5"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl p-3" style={{ backgroundColor: roleColors[m.role].bg }}>
                  <UserCog size={28} style={{ color: roleColors[m.role].text }} />
                </div>
                <div>
                  <h3 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{m.name}</h3>
                  <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-2xl mt-1 inline-block" style={{ backgroundColor: roleColors[m.role].bg, color: roleColors[m.role].text }}>
                    {roleColors[m.role].label}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>Especialidade:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{m.specialty || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>Hora Aula:</span>
                <span className="font-bold text-emerald-400">R$ {m.hourly_rate?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>Passagem/Dia:</span>
                <span className="font-bold text-blue-400">R$ {m.daily_transport?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>Salário Base:</span>
                <span style={{ color: 'var(--text-secondary)' }}>R$ {m.salary?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
        ))}
      </div>

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
                  <option value="instructor">Professor</option>
                  <option value="staff">Staff (Recepção/Limpeza)</option>
                  <option value="admin">Administrador</option>
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
