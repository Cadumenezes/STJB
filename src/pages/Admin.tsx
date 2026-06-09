import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'
import { Shield, CheckCircle, XCircle, Search, AlertTriangle, Key, Edit, Calendar } from 'lucide-react'
import Modal from '../components/Modal'

export default function Admin() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [formData, setFormData] = useState({
    status: 'pending' as 'pending' | 'active' | 'suspended',
    plan: 'gratis' as 'gratis' | 'bronze' | 'prata' | 'ouro' | 'diamante',
    expires_at: ''
  })

  useEffect(() => {
    loadProfiles()
  }, [])

  async function loadProfiles() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setProfiles(data || [])
    setLoading(false)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!editingProfile) return

    setLoading(true)
    const { error } = await supabase.from('profiles').update({
      status: formData.status,
      plan: formData.plan,
      expires_at: formData.expires_at || null
    }).eq('id', editingProfile.id)

    if (!error) {
      setEditingProfile(null)
      loadProfiles()
    } else {
      console.error('Update Profile Error:', error)
      alert(`Erro ao atualizar o perfil: ${error.message}`)
      setLoading(false)
    }
  }

  const filteredProfiles = profiles.filter(p => 
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone && p.phone.includes(search))
  )

  const pendingCount = profiles.filter(p => p.status === 'pending').length
  const activeCount = profiles.filter(p => p.status === 'active').length

  return (
    <div className="space-y-8">
      {/* Header Section with Background Highlight - GEOMÉTRICO/QUADRADO */}
      <div 
        className="p-8 sm:p-10 pb-16 rounded-none border border-white/5 shadow-2xl mb-12 relative overflow-hidden"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
      >
        {/* Accent Glow */}
        <div 
          className="absolute -left-20 -top-20 w-64 h-64 rounded-none blur-[100px] opacity-20"
          style={{ backgroundColor: 'var(--accent-color)' }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8 relative z-10">
          <div className="space-y-4">
            <h1 
              className="font-black tracking-tighter leading-tight inline-block py-8 rounded-none shadow-2xl shadow-purple-500/30" 
              style={{ 
                backgroundColor: 'var(--accent-color)', 
                color: '#fff',
                fontSize: 'var(--title-size, 32px)',
                paddingLeft: '40px',
                paddingRight: '40px'
              }}
            >
              Painel do Dono
            </h1>
            <br />
            <p 
              className="font-bold inline-block py-6 mt-2 rounded-none shadow-xl border border-white/10" 
               style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: '32px', paddingRight: '32px' }}
            >
              Aprove ou suspenda as escolas e usuários do seu SaaS
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-none p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-none bg-purple-500/10 text-purple-400">
               <Shield size={32} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total de Contas</p>
              <h2 className="text-3xl font-black text-white">{profiles.length}</h2>
            </div>
          </div>
        </div>
        <div className="rounded-none p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-none bg-yellow-500/10 text-yellow-400">
               <AlertTriangle size={32} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Aguardando Pagto</p>
              <h2 className="text-3xl font-black text-white">{pendingCount}</h2>
            </div>
          </div>
        </div>
        <div className="rounded-none p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-none bg-emerald-500/10 text-emerald-400">
               <CheckCircle size={32} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Ativos (Pagantes)</p>
              <h2 className="text-3xl font-black text-white">{activeCount}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 rounded-none px-4 py-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <Search className="text-gray-400 shrink-0" size={20} />
        <input 
          type="text"
          placeholder="Buscar por e-mail ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-white focus:outline-none placeholder:text-gray-500 text-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-none overflow-hidden shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <tr>
                <th className="p-4 font-black text-[11px] uppercase tracking-wider text-gray-400">E-mail</th>
                <th className="p-4 font-black text-[11px] uppercase tracking-wider text-gray-400">Telefone</th>
                <th className="p-4 font-black text-[11px] uppercase tracking-wider text-gray-400 text-center">Status</th>
                <th className="p-4 font-black text-[11px] uppercase tracking-wider text-gray-400 text-center">Role</th>
                <th className="p-4 font-black text-[11px] uppercase tracking-wider text-gray-400 text-center">Plano</th>
                <th className="p-4 font-black text-[11px] uppercase tracking-wider text-gray-400 text-center">Validade</th>
                <th className="p-4 font-black text-[11px] uppercase tracking-wider text-gray-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">Carregando contas...</td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">Nenhuma conta encontrada.</td>
                </tr>
              ) : (
                filteredProfiles.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-medium text-white">{p.email}</td>
                    <td className="p-4 text-gray-300">{p.phone || '-'}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                        p.status === 'suspended' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {p.status === 'active' ? 'Ativo' : p.status === 'suspended' ? 'Suspenso' : 'Pendente'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {p.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                          <Key size={10} /> Admin
                        </span>
                      ) : (
                        <span className="text-gray-500 text-[10px] font-black uppercase tracking-wider">User</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        p.plan === 'diamante' ? 'bg-cyan-500/10 text-cyan-400' :
                        p.plan === 'ouro' ? 'bg-yellow-500/10 text-yellow-400' :
                        p.plan === 'prata' ? 'bg-gray-450/10 text-gray-300' :
                        p.plan === 'bronze' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-purple-500/10 text-purple-400'
                      }`}>
                        {p.plan || 'gratis'}
                      </span>
                    </td>
                    <td className="p-4 text-center text-gray-400">
                      {p.expires_at ? new Date(p.expires_at).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}
                      {p.expires_at && new Date(p.expires_at) < new Date() && p.role !== 'admin' && (
                        <span className="block text-[9px] text-rose-400 font-bold uppercase mt-1">Vencido</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {p.role !== 'admin' && (
                          <button
                            onClick={() => {
                              setEditingProfile(p)
                              setFormData({
                                status: p.status,
                                plan: (p.plan as any) || 'gratis',
                                expires_at: p.expires_at || ''
                              })
                            }}
                            className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                          >
                            <Edit size={14} /> Gerenciar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!editingProfile} onClose={() => setEditingProfile(null)} title="Gerenciar Cliente">
        {editingProfile && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
              <p className="text-sm font-medium text-gray-400 mb-1">E-mail do Cliente</p>
              <p className="text-lg font-black text-white">{editingProfile.email}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold block mb-2 text-gray-400">Status da Conta</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all font-medium"
                >
                  <option value="pending" className="bg-gray-900">Pendente (Em Análise)</option>
                  <option value="active" className="bg-gray-900">Ativo (Aprovado)</option>
                  <option value="suspended" className="bg-gray-900">Suspenso (Bloqueado)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold block mb-2 text-gray-400">Plano do Cliente</label>
                <select
                  value={formData.plan}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value as any })}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all font-medium"
                >
                  <option value="gratis" className="bg-gray-900">Grátis (7 Dias)</option>
                  <option value="bronze" className="bg-gray-900">Bronze (Até 15 Alunos)</option>
                  <option value="prata" className="bg-gray-900">Prata (Até 25 Alunos)</option>
                  <option value="ouro" className="bg-gray-900">Ouro (Até 50 Alunos)</option>
                  <option value="diamante" className="bg-gray-900">Diamante (Ilimitado)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-bold block mb-2 text-gray-400">Data de Vencimento</label>
              <div className="flex items-center gap-3 bg-black/20 border border-white/10 rounded-xl px-4 py-3">
                <Calendar className="text-gray-500 shrink-0" size={20} />
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full bg-transparent text-white focus:outline-none font-medium [color-scheme:dark]"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Se a data chegar e o cliente não renovar, ele será automaticamente bloqueado. Deixe em branco se não tiver data final.
              </p>
            </div>

            <div className="flex gap-4 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center"
              >
                {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
