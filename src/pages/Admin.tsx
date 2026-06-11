import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'
import { Shield, CheckCircle, XCircle, Search, AlertTriangle, Key, Edit, Calendar, Trash2, MessageSquare, Clock, CornerDownRight } from 'lucide-react'
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

  // Suporte Tickets States
  const [activeTab, setActiveTab] = useState<'clients' | 'tickets'>('clients')
  const [tickets, setTickets] = useState<any[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [replyingTicket, setReplyingTicket] = useState<any | null>(null)
  const [adminResponse, setAdminResponse] = useState('')
  const [ticketStatus, setTicketStatus] = useState<'open' | 'in_progress' | 'resolved'>('open')

  useEffect(() => {
    loadProfiles()
    loadTickets()
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

  async function loadTickets() {
    setLoadingTickets(true)
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error loading tickets:', error)
    } else {
      setTickets(data || [])
    }
    setLoadingTickets(false)
  }

  async function handleSaveResponse(e: React.FormEvent) {
    e.preventDefault()
    if (!replyingTicket) return

    setLoadingTickets(true)
    const { error } = await supabase
      .from('support_tickets')
      .update({
        admin_response: adminResponse,
        responded_at: new Date().toISOString(),
        status: ticketStatus
      })
      .eq('id', replyingTicket.id)

    if (!error) {
      setReplyingTicket(null)
      setAdminResponse('')
      loadTickets()
    } else {
      console.error('Error replying ticket:', error)
      alert(`Erro ao responder chamado: ${error.message}`)
      setLoadingTickets(false)
    }
  }

  async function handleDeleteTicket(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este chamado do banco de dados?')) return
    
    setLoadingTickets(true)
    const { error } = await supabase.from('support_tickets').delete().eq('id', id)
    if (!error) {
      loadTickets()
    } else {
      console.error('Error deleting ticket:', error)
      alert(`Erro ao deletar chamado: ${error.message}`)
      setLoadingTickets(false)
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

      {/* Abas Principais */}
      <div className="flex flex-wrap gap-4 p-2 rounded-2xl border w-fit" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', marginBottom: '30px' }}>
        <button
          onClick={() => { setActiveTab('clients'); setSearch(''); }}
          className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: activeTab === 'clients' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
            boxShadow: activeTab === 'clients' ? '0 0 10px var(--accent-color)' : 'none',
            opacity: activeTab === 'clients' ? 1 : 0.6
          }}
        >
          Clientes (SaaS)
        </button>
        <button
          onClick={() => { setActiveTab('tickets'); setSearch(''); }}
          className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: activeTab === 'tickets' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
            boxShadow: activeTab === 'tickets' ? '0 0 10px var(--accent-color)' : 'none',
            opacity: activeTab === 'tickets' ? 1 : 0.6
          }}
        >
          <MessageSquare size={14} /> Chamados de Suporte ({tickets.filter(t => t.status === 'open').length} abertos)
        </button>
      </div>

      {activeTab === 'clients' ? (
        <>
          {/* Search Clientes */}
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

          {/* Table Clientes */}
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
                      <td colSpan={7} className="p-8 text-center text-gray-400">Carregando contas...</td>
                    </tr>
                  ) : filteredProfiles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">Nenhuma conta encontrada.</td>
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
                                className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
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
        </>
      ) : (
        <>
          {/* Search Tickets */}
          <div className="flex items-center gap-3 rounded-none px-4 py-4 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <Search className="text-gray-400 shrink-0" size={20} />
            <input 
              type="text"
              placeholder="Buscar chamados por assunto, mensagem, autor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-white focus:outline-none placeholder:text-gray-500 text-sm"
            />
          </div>

          {/* Tickets List */}
          {loadingTickets ? (
            <div className="text-center py-20 text-sm text-gray-400">Carregando chamados...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-20 text-sm text-gray-400 bg-[var(--bg-card)] border border-[var(--border-color)]">
              Nenhum chamado de suporte técnico aberto.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tickets
                .filter(t => 
                  t.subject.toLowerCase().includes(search.toLowerCase()) ||
                  t.message.toLowerCase().includes(search.toLowerCase()) ||
                  t.sender_name.toLowerCase().includes(search.toLowerCase()) ||
                  t.sender_email.toLowerCase().includes(search.toLowerCase())
                )
                .map((ticket) => (
                  <div 
                    key={ticket.id} 
                    className="p-6 border bg-[var(--bg-card)] rounded-none space-y-4 shadow-xl flex flex-col justify-between"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                            ticket.status === 'open' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                            ticket.status === 'in_progress' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                            'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          }`}>
                            {ticket.status === 'open' ? 'Aberto' : ticket.status === 'in_progress' ? 'Em Análise' : 'Resolvido'}
                          </span>
                          <p className="text-[10px] text-gray-400 mt-1">
                            Autor: <strong className="text-white">{ticket.sender_name}</strong> ({ticket.sender_email})
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock size={10} /> {new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTicket(ticket.id)}
                            className="p-1 rounded hover:bg-white/5 text-rose-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Deletar permanentemente"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-white border-t border-white/5 pt-2">{ticket.subject}</h4>
                      
                      <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap p-3 bg-black/40 rounded border border-white/5 max-h-36 overflow-y-auto">
                        {ticket.message}
                      </div>

                      {ticket.admin_response && (
                        <div className="mt-2 p-3 rounded bg-purple-500/5 border border-purple-500/10 space-y-1">
                          <p className="text-[10px] font-black uppercase text-purple-400 flex items-center gap-1">
                            <CornerDownRight size={10} /> Sua Resposta
                            {ticket.responded_at && (
                              <span className="text-gray-500 font-normal normal-case ml-auto">
                                {new Date(ticket.responded_at).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{ticket.admin_response}</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-white/5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTicket(ticket)
                          setAdminResponse(ticket.admin_response || '')
                          setTicketStatus(ticket.status || 'open')
                        }}
                        className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <MessageSquare size={12} /> {ticket.admin_response ? 'Editar Resposta' : 'Responder'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

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

      {/* Modal Responder Chamado */}
      <Modal isOpen={!!replyingTicket} onClose={() => setReplyingTicket(null)} title="Responder Chamado de Suporte">
        {replyingTicket && (
          <form onSubmit={handleSaveResponse} className="space-y-6">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                  replyingTicket.status === 'open' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                  replyingTicket.status === 'in_progress' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  {replyingTicket.status === 'open' ? 'Aberto' : replyingTicket.status === 'in_progress' ? 'Em Análise' : 'Resolvido'}
                </span>
                <span className="text-[10px] text-gray-400">{new Date(replyingTicket.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              <p className="text-sm font-black text-white">{replyingTicket.subject}</p>
              <p className="text-[10px] text-gray-400">
                Remetente: <strong className="text-white">{replyingTicket.sender_name}</strong> ({replyingTicket.sender_email}) | Cargo: <strong className="text-purple-400 uppercase">{replyingTicket.sender_role || 'user'}</strong>
              </p>
              <div className="text-xs text-gray-300 bg-black/40 p-3 rounded border border-white/5 whitespace-pre-wrap mt-2 max-h-40 overflow-y-auto">
                {replyingTicket.message}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold block mb-2 text-gray-400">Status do Chamado</label>
              <select
                value={ticketStatus}
                onChange={(e) => setTicketStatus(e.target.value as any)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all font-medium"
              >
                <option value="open" className="bg-gray-900">Aberto (Pendente)</option>
                <option value="in_progress" className="bg-gray-900">Em Progresso (Em Análise)</option>
                <option value="resolved" className="bg-gray-900">Resolvido</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold block mb-2 text-gray-400">Resposta para o Diretor *</label>
              <textarea
                required
                rows={5}
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Escreva a resposta ou solução para o chamado..."
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all font-medium text-sm placeholder:text-gray-600 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="flex gap-4 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setReplyingTicket(null)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loadingTickets}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center disabled:opacity-50"
              >
                {loadingTickets ? 'Salvando...' : 'Salvar Resposta'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
