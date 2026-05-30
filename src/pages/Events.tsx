import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Calendar, MapPin, DollarSign, Users, Download, PlusCircle, CheckCircle, CreditCard, Box, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event, EventParticipant, Student, Installment, Profile } from '../types'
import Modal from '../components/Modal'

export default function Events() {
  const [events, setEvents] = useState<Event[]>([])
  const [participants, setParticipants] = useState<EventParticipant[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [activeEventId, setActiveEventId] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [showEventModal, setShowEventModal] = useState(false)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)

  function getDynamicFontSize(val: string | number) {
    const len = val.toString().length
    if (len > 15) return 'text-sm'
    if (len > 11) return 'text-base'
    if (len > 8) return 'text-lg'
    return 'text-2xl'
  }
  
  const [eventFormData, setEventFormData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    description: '',
    ticket_price: 0,
    cost: 0,
    base_choreography_price: 0,
    base_clothes_cost: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)
    }

    const { data: eventsData } = await supabase.from('events').select('*').order('date', { ascending: true })
    setEvents(eventsData || [])
    
    if (eventsData && eventsData.length > 0 && !activeEventId) {
      setActiveEventId(eventsData[0].id)
    }

    const { data: studentsData } = await supabase.from('students').select('*').order('name')
    setStudents(studentsData || [])

    const { data: partsData } = await supabase.from('event_participants').select('*')
    setParticipants(partsData || [])
    
    setLoading(false)
  }

  async function handleEventSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    let error = null
    if (editEvent) {
      const res = await supabase.from('events').update(eventFormData).eq('id', editEvent.id)
      error = res.error
    } else {
      const res = await supabase.from('events').insert([eventFormData]).select()
      error = res.error
      if (!error && res.data && res.data.length > 0) {
        setActiveEventId(res.data[0].id)
      }
    }
    
    if (error) {
      alert('Erro ao salvar evento: ' + error.message)
    } else {
      setShowEventModal(false)
      setEditEvent(null)
      loadData()
    }
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm('Tem certeza que deseja excluir este evento e todos os seus participantes?')) return
    await supabase.from('events').delete().eq('id', id)
    if (activeEventId === id) setActiveEventId(null)
    loadData()
  }

  function openEventEdit(ev: Event) {
    setEditEvent(ev)
    setEventFormData({
      name: ev.name,
      date: ev.date,
      location: ev.location || '',
      description: ev.description || '',
      ticket_price: ev.ticket_price || 0,
      cost: ev.cost || 0,
      base_choreography_price: ev.base_choreography_price || 0,
      base_clothes_cost: ev.base_clothes_cost || 0
    })
    setShowEventModal(true)
  }

  // --- Participant Spreadsheet Logic ---
  
  async function handleAddParticipant(studentId: string) {
    if (!activeEventId || !studentId) return
    const exists = participants.some(p => p.event_id === activeEventId && p.student_id === studentId)
    if (exists) return alert('Aluno já está no evento!')

    const activeEvent = events.find(e => e.id === activeEventId)
    
    const payload = {
      event_id: activeEventId,
      student_id: studentId,
      has_ticket: false,
      ticket_quantity: 0,
      total_value: 0,
      amount_paid: 0,
      kit: false,
      payment_method: null,
      choreography_count: 0,
      clothes_cost: 0,
      installments: []
    }

    const { error } = await supabase.from('event_participants').insert([payload])
    if (error) alert('Erro ao adicionar participante')
    else loadData()
  }

  async function handleRemoveParticipant(id: string) {
    if (!confirm('Remover aluno do evento?')) return
    await supabase.from('event_participants').delete().eq('id', id)
    loadData()
  }

  function distributeInstallments(installments: Installment[], totalValue: number, startIndex: number): Installment[] {
    if (installments.length === 0) return []
    const newInsts = [...installments]
    const sumBefore = newInsts.slice(0, startIndex).reduce((acc, inst) => acc + Number(inst.value), 0)
    const remaining = Math.max(0, totalValue - sumBefore)
    const remainingCount = newInsts.length - startIndex
    
    if (remainingCount > 0) {
      const baseValue = Math.floor((remaining / remainingCount) * 100) / 100
      let totalDistributed = 0
      for (let i = startIndex; i < newInsts.length - 1; i++) {
        newInsts[i] = { ...newInsts[i], value: baseValue }
        totalDistributed += baseValue
      }
      const lastValue = Math.max(0, remaining - totalDistributed)
      newInsts[newInsts.length - 1] = { ...newInsts[newInsts.length - 1], value: Number(lastValue.toFixed(2)) }
    }
    return newInsts
  }

  async function handleUpdateParticipant(id: string, field: keyof EventParticipant, value: any) {
    if (value === '') value = 0;
    let payload: any = { [field]: value }
    let optimUpdate: any = { [field]: value }
    
    const p = participants.find(x => x.id === id)
    if (!p) return

    // Auto-calculate total value if quantities change
    if (field === 'choreography_count' || field === 'clothes_cost' || field === 'ticket_quantity') {
      const activeEvent = events.find(e => e.id === p.event_id)
      if (activeEvent) {
        const choreoCount = field === 'choreography_count' ? Number(value) : Number(p.choreography_count || 0)
        let clothesQty = field === 'clothes_cost' ? Number(value) : Number(p.clothes_cost || 0)
        const ticketQty = field === 'ticket_quantity' ? Number(value) : Number(p.ticket_quantity || 0)
        
        // Regra de Negócio: Se alterar o número de coreografias, auto-ajusta a quantidade de roupas para ser IGUAL
        if (field === 'choreography_count') {
          clothesQty = choreoCount
          payload.clothes_cost = clothesQty
          optimUpdate.clothes_cost = clothesQty
        }

        const choreoFee = choreoCount > 0 ? (activeEvent.base_choreography_price || 0) : 0
        
        let clothesFee = 0
        if (choreoCount === 1) {
          clothesFee = Math.max(0, clothesQty - 1) * (activeEvent.base_clothes_cost || 0)
        } else if (choreoCount > 1) {
          clothesFee = clothesQty * (activeEvent.base_clothes_cost || 0)
        }
        
        const newTotal = choreoFee + clothesFee + (ticketQty * (activeEvent.ticket_price || 0))
        
        payload.total_value = newTotal
        optimUpdate.total_value = newTotal
        
        // Redistribute installments automatically using the new total
        if (p.installments && p.installments.length > 0) {
          const updatedInstallments = distributeInstallments(p.installments, newTotal, 0)
          const amount_paid = updatedInstallments.reduce((acc, inst) => inst.paid ? acc + (Number(inst.value) || 0) : acc, 0)
          payload.installments = updatedInstallments
          payload.amount_paid = amount_paid
          optimUpdate.installments = updatedInstallments
          optimUpdate.amount_paid = amount_paid
        }
      }
    }

    if (field === 'total_value' && p.installments && p.installments.length > 0) {
      const updatedInstallments = distributeInstallments(p.installments, Number(value), 0)
      const amount_paid = updatedInstallments.reduce((acc, inst) => inst.paid ? acc + (Number(inst.value) || 0) : acc, 0)
      payload.installments = updatedInstallments
      payload.amount_paid = amount_paid
      optimUpdate.installments = updatedInstallments
      optimUpdate.amount_paid = amount_paid
    }
    
    if (field === 'payment_method' && value !== 'Boleto' && p.installments && p.installments.length > 0) {
       payload.installments = []
       optimUpdate.installments = []
    }

    // Optimistic UI Update
    setParticipants(prev => prev.map(part => part.id === id ? { ...part, ...optimUpdate } : part))
    
    // Server Update
    const { error } = await supabase.from('event_participants').update(payload).eq('id', id)
    if (error) {
      alert('Erro ao atualizar. Recarregando dados...')
      loadData()
    }
  }

  async function handleInstallmentCountChange(p: EventParticipant, count: number) {
    if (count < 0) count = 0
    let updatedInstallments = [...(p.installments || [])]
    
    if (count > updatedInstallments.length) {
      while (updatedInstallments.length < count) {
        updatedInstallments.push({ id: crypto.randomUUID(), value: 0, paid: false })
      }
    } else if (count < updatedInstallments.length) {
      updatedInstallments = updatedInstallments.slice(0, count)
    }
    
    if (updatedInstallments.length > 0) {
      updatedInstallments = distributeInstallments(updatedInstallments, Number(p.total_value), 0)
    }
    
    const amount_paid = updatedInstallments.reduce((acc, inst) => inst.paid ? acc + (Number(inst.value) || 0) : acc, 0)
    const total_value = updatedInstallments.reduce((acc, inst) => acc + (Number(inst.value) || 0), 0)

    setParticipants(prev => prev.map(part => part.id === p.id ? { 
      ...part, 
      installments: updatedInstallments,
      amount_paid,
      total_value: updatedInstallments.length > 0 ? total_value : p.total_value
    } : part))
    
    await supabase.from('event_participants').update({ 
      installments: updatedInstallments,
      amount_paid,
      total_value: updatedInstallments.length > 0 ? total_value : p.total_value
    }).eq('id', p.id)
  }

  async function handleUpdateInstallment(p: EventParticipant, installmentId: string, field: keyof Installment, value: any) {
    if (value === '') value = 0;
    let updatedInstallments = (p.installments || []).map(inst => 
      inst.id === installmentId ? { ...inst, [field]: value } : inst
    )
    
    if (field === 'value') {
      const index = updatedInstallments.findIndex(inst => inst.id === installmentId)
      updatedInstallments = distributeInstallments(updatedInstallments, Number(p.total_value), index + 1)
    }
    
    const amount_paid = updatedInstallments.reduce((acc, inst) => inst.paid ? acc + (Number(inst.value) || 0) : acc, 0)
    const total_value = updatedInstallments.reduce((acc, inst) => acc + (Number(inst.value) || 0), 0)

    // Optimistic UI
    setParticipants(prev => prev.map(part => part.id === p.id ? { 
      ...part, 
      installments: updatedInstallments,
      amount_paid,
      total_value
    } : part))

    // Server update
    const { error } = await supabase.from('event_participants').update({ 
      installments: updatedInstallments,
      amount_paid,
      total_value
    }).eq('id', p.id)

    if (error) {
      alert('Erro ao atualizar parcela.')
      loadData()
    }
  }

  const activeEvent = events.find(e => e.id === activeEventId)
  const currentParticipants = participants.filter(p => p.event_id === activeEventId)

  // Sort and Filter for the UI list
  const filteredParticipants = currentParticipants
    .filter(p => {
      const student = students.find(s => s.id === p.student_id)
      if (!student) return false
      if (searchQuery) {
        return student.name.toLowerCase().includes(searchQuery.toLowerCase())
      }
      return true
    })
    .sort((a, b) => {
      const studentA = students.find(s => s.id === a.student_id)?.name || ''
      const studentB = students.find(s => s.id === b.student_id)?.name || ''
      return studentA.localeCompare(studentB)
    })
  
  // Calculate Summaries
  const expectedRevenue = currentParticipants.reduce((acc, p) => acc + (Number(p.total_value) || 0), 0)
  const totalReceived = currentParticipants.reduce((acc, p) => acc + (Number(p.amount_paid) || 0), 0)
  const totalTickets = currentParticipants.reduce((acc, p) => acc + (Number(p.ticket_quantity) || 0), 0)
  const totalChoreographies = currentParticipants.reduce((acc, p) => acc + (Number(p.choreography_count) || 0), 0)
  const participantsWithChoreo = currentParticipants.filter(p => (Number(p.choreography_count) || 0) > 0).length
  const totalChoreoRevenue = participantsWithChoreo * (activeEvent?.base_choreography_price || 0)

  const totalClothesQuantity = currentParticipants.reduce((acc, p) => acc + (Number(p.clothes_cost) || 0), 0)
  
  const totalClothesRevenue = currentParticipants.reduce((acc, p) => {
    const choreoCount = Number(p.choreography_count) || 0;
    const clothesQty = Number(p.clothes_cost) || 0;
    let fee = 0;
    if (choreoCount === 1) {
      fee = Math.max(0, clothesQty - 1) * (activeEvent?.base_clothes_cost || 0);
    } else if (choreoCount > 1) {
      fee = clothesQty * (activeEvent?.base_clothes_cost || 0);
    }
    return acc + fee;
  }, 0);

  const eventCost = activeEvent?.cost || 0
  const netResult = totalReceived - eventCost

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  }

  if (loading && events.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--accent-color)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-10">
      {/* Header */}
      <div 
        className="p-8 sm:p-10 pb-12 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden mb-8"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
      >
        <div 
          className="absolute -left-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-20"
          style={{ backgroundColor: 'var(--accent-color)' }}
        />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8 relative z-10">
          <div className="space-y-4">
            <h1 
              className="font-black tracking-tighter leading-tight inline-block py-8 rounded-2xl shadow-2xl shadow-purple-500/30" 
              style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--title-size, 32px)', paddingLeft: '40px', paddingRight: '40px' }}
            >
              Eventos
            </h1>
            <br />
            <p className="font-bold inline-block py-6 mt-2 rounded-2xl shadow-xl border border-white/10" style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: '32px', paddingRight: '32px' }}>
              Gerencie espetáculos, festivais e participantes
            </p>
          </div>
          {profile?.role !== 'secretary' && (
            <button
              onClick={() => {
                setEditEvent(null)
                setEventFormData({ name: '', date: new Date().toISOString().split('T')[0], location: '', description: '', ticket_price: 0, cost: 0, base_choreography_price: 0, base_clothes_cost: 0 })
                setShowEventModal(true)
              }}
              className="flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105 shadow-xl"
              style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
            >
              <Calendar size={26} />
              Novo Evento
            </button>
          )}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 bg-black/20 rounded-3xl border border-dashed border-white/10">
          <Calendar size={64} className="mx-auto mb-6 text-white/20" />
          <h2 className="text-2xl font-bold text-white mb-2">Nenhum evento criado</h2>
          <p className="text-[var(--text-muted)]">Comece criando o seu primeiro espetáculo ou festival.</p>
        </div>
      ) : (
        <>
          {/* Event Tabs */}
          <div className="flex gap-4 overflow-x-auto pb-4 mb-4 custom-scrollbar">
            {events.map(ev => (
              <button
                key={ev.id}
                onClick={() => setActiveEventId(ev.id)}
                className={`flex-shrink-0 px-8 py-4 rounded-2xl font-bold transition-all ${activeEventId === ev.id ? 'shadow-xl text-white' : 'text-[var(--text-muted)] hover:bg-white/5'}`}
                style={{
                  background: activeEventId === ev.id ? 'linear-gradient(135deg, var(--accent-color), #000)' : 'var(--bg-card)',
                  border: activeEventId === ev.id ? 'none' : '1px solid var(--border-color)'
                }}
              >
                {ev.name}
              </button>
            ))}
          </div>

          {activeEvent && (
            <div className="space-y-8">
              {/* Highlighted Event Title/Subtitle Header */}
              <div 
                className="p-8 sm:p-10 pb-16 rounded-3xl border border-white/5 shadow-2xl mb-8 relative overflow-hidden"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
              >
                {/* Accent Glow */}
                <div 
                  className="absolute -left-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-20"
                  style={{ backgroundColor: 'var(--accent-color)' }}
                />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8 relative z-10">
                  <div className="space-y-4">
                    <h2 
                      className="font-black tracking-tighter leading-tight inline-block py-8 rounded-2xl shadow-2xl shadow-purple-500/30" 
                      style={{ 
                        backgroundColor: 'var(--accent-color)', 
                        color: '#fff',
                        fontSize: 'var(--title-size, 32px)',
                        paddingLeft: '40px',
                        paddingRight: '40px'
                      }}
                    >
                      {activeEvent.name}
                    </h2>
                    <br />
                    <p 
                      className="font-bold inline-block py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
                       style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: '32px', paddingRight: '32px' }}
                    >
                      {activeEvent.description || 'Sem descrição'} {activeEvent.location ? `• Local: ${activeEvent.location}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Event Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="p-6 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 text-center">Participantes</p>
                  <p className={`font-black text-white ${getDynamicFontSize(currentParticipants.length)}`}>{currentParticipants.length}</p>
                </div>
                <div className="p-6 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 text-center">Custo do Evento</p>
                  <p className={`font-black text-rose-400 ${getDynamicFontSize(`R$ ${Number(eventCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}`}>
                    R$ {Number(eventCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-6 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 text-center">A Receber Total</p>
                  <p className={`font-black text-blue-400 ${getDynamicFontSize(`R$ ${Number(expectedRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}`}>
                    R$ {Number(expectedRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-6 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 text-center">Já Recebido</p>
                  <p className={`font-black text-emerald-400 ${getDynamicFontSize(`R$ ${Number(totalReceived).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}`}>
                    R$ {Number(totalReceived).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-6 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 text-center">Falta Receber</p>
                  <p className={`font-black text-amber-400 ${getDynamicFontSize(`R$ ${Number(expectedRevenue - totalReceived).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}`}>
                    R$ {Number(expectedRevenue - totalReceived).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-6 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 text-center">Convites Vendidos</p>
                  <p className={`font-black text-purple-400 ${getDynamicFontSize(totalTickets)}`}>{totalTickets}</p>
                </div>
              </div>

              {/* Relatório Financeiro Detalhado */}
              <div className="p-6 rounded-3xl border mt-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <h3 className="text-lg font-black text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                  <DollarSign size={20} className="text-emerald-400" />
                  Relatório Detalhado
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Convites */}
                  <div className="p-4 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Convites Vendidos</span>
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-black">{totalTickets} un.</span>
                    </div>
                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Valor Base (un)</p>
                        <p className="text-sm font-bold text-white/50">R$ {Number(activeEvent?.ticket_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Total Convites</p>
                        <p className="text-xl font-black text-purple-400">R$ {Number(totalTickets * (activeEvent?.ticket_price || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>

                  {/* Coreografias */}
                  <div className="p-4 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Coreografias</span>
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-black">{totalChoreographies} un.</span>
                    </div>
                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Taxa Única (un)</p>
                        <p className="text-sm font-bold text-white/50">R$ {Number(activeEvent?.base_choreography_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Total (Pagantes: {participantsWithChoreo})</p>
                        <p className="text-xl font-black text-blue-400">R$ {Number(totalChoreoRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>

                  {/* Roupas */}
                  <div className="p-4 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Roupas</span>
                      <span className="px-2 py-1 bg-rose-500/20 text-rose-400 rounded-lg text-xs font-black">{totalClothesQuantity} un.</span>
                    </div>
                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Custo Base Estimado (un)</p>
                        <p className="text-sm font-bold text-white/50">R$ {Number(activeEvent?.base_clothes_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Total Arrecadado (Automático)</p>
                        <p className="text-xl font-black text-rose-400">R$ {Number(totalClothesRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Actions & Add Participant */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-black/20 p-4 rounded-3xl border border-white/5">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                  {profile?.role !== 'secretary' && (
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <select 
                        className="flex-1 sm:w-64 rounded-xl px-4 py-3 text-sm focus:outline-none" 
                        style={inputStyle}
                        id="addStudentSelect"
                      >
                        <option value="">Selecione um Aluno para Adicionar</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id} disabled={currentParticipants.some(p => p.student_id === s.id)}>{s.name}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => {
                          const sel = document.getElementById('addStudentSelect') as HTMLSelectElement
                          handleAddParticipant(sel.value)
                          sel.value = ''
                        }}
                        className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3 rounded-xl px-4 py-3 border w-full sm:w-64" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
                    <Search className="text-white/30 shrink-0" size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar aluno na planilha..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-sm text-white focus:outline-none placeholder:text-white/30"
                    />
                  </div>
                </div>
                {profile?.role !== 'secretary' && (
                  <div className="flex gap-2">
                    <button onClick={() => openEventEdit(activeEvent)} className="px-6 py-3 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-bold text-sm transition-all flex items-center gap-2">
                      <Edit size={16} /> Detalhes do Evento
                    </button>
                    <button onClick={() => handleDeleteEvent(activeEvent.id)} className="px-6 py-3 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-bold text-sm transition-all flex items-center gap-2">
                      <Trash2 size={16} /> Excluir Evento
                    </button>
                  </div>
                )}
              </div>

              {/* Spreadsheet Table */}
              <div className="overflow-x-auto rounded-none border border-white/5 shadow-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <tr>
                      <th className="p-4 font-black text-[11px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5">Aluno</th>
                      <th className="p-4 font-black text-[11px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-center">Tipo Pgto</th>
                      <th className="p-4 font-black text-[11px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-center">Coreo</th>
                      <th className="p-4 font-black text-[11px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-center">Roupa (Qtd)</th>
                      <th className="p-4 font-black text-[11px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-left">Parcelas</th>
                      <th className="p-4 font-black text-[11px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-right">Valor Total</th>
                      <th className="p-4 font-black text-[11px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-right">Valor Pago</th>
                      <th className="p-4 font-black text-[11px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-right">Falta Pagar</th>
                      <th className="p-4 font-black text-[11px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-center">Convites</th>
                      <th className="p-4 font-black text-[11px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-center">Qtd</th>
                      <th className="p-4 font-black text-[11px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-center">Kit</th>
                      <th className="p-4 font-black text-[11px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-[var(--text-muted)]">
                          Nenhum participante encontrado neste evento.
                        </td>
                      </tr>
                    ) : (
                      filteredParticipants
                        .sort((a, b) => {
                          const nameA = students.find(s => s.id === a.student_id)?.name || ''
                          const nameB = students.find(s => s.id === b.student_id)?.name || ''
                          return nameA.localeCompare(nameB)
                        })
                        .map(p => {
                        const student = students.find(s => s.id === p.student_id)
                        const faltaPagar = (Number(p.total_value) || 0) - (Number(p.amount_paid) || 0)
                        
                        return (
                          <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4 font-bold text-white max-w-[200px] truncate">{student?.name}</td>
                            
                            {/* Payment Method */}
                            <td className="p-4 text-center">
                              <select 
                                value={p.payment_method || ''} 
                                onChange={(e) => handleUpdateParticipant(p.id, 'payment_method', e.target.value)}
                                disabled={profile?.role === 'secretary'}
                                className="bg-transparent border border-white/10 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                              >
                                <option value="" className="bg-gray-900">-</option>
                                <option value="Boleto" className="bg-gray-900">Boleto</option>
                                <option value="Cartão" className="bg-gray-900">Cartão</option>
                                <option value="Pix" className="bg-gray-900">Pix</option>
                                <option value="Isento" className="bg-gray-900">Isento</option>
                              </select>
                            </td>

                            {/* Coreografias */}
                            <td className="p-4 text-center">
                              <input 
                                type="number" 
                                min="0"
                                value={p.choreography_count || 0} 
                                onChange={(e) => handleUpdateParticipant(p.id, 'choreography_count', parseInt(e.target.value) || 0)}
                                disabled={profile?.role === 'secretary'}
                                className={`w-16 text-center bg-transparent border border-white/10 rounded-lg px-2 py-1 font-black transition-all disabled:opacity-50 ${p.choreography_count > 0 ? 'text-purple-400' : 'text-white/30'}`}
                              />
                            </td>

                            {/* Quantidade de Roupa */}
                            <td className="p-4 text-center">
                              <input 
                                type="number" 
                                min="0"
                                value={p.clothes_cost || 0} 
                                onChange={(e) => handleUpdateParticipant(p.id, 'clothes_cost', parseInt(e.target.value) || 0)}
                                disabled={profile?.role === 'secretary'}
                                className={`w-16 text-center bg-transparent border border-white/10 rounded-lg px-2 py-1 font-black transition-all disabled:opacity-50 ${p.clothes_cost > 0 ? 'text-rose-400' : 'text-white/30'}`}
                              />
                            </td>

                            {/* Parcelas */}
                            <td className="p-4">
                              {p.payment_method === 'Boleto' ? (
                                <div className="flex flex-col gap-2 min-w-[180px]">
                                  <div className="flex items-center gap-2 mb-2 bg-white/5 p-2 rounded-xl">
                                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Qtd Parcelas:</span>
                                    <input 
                                      type="number" 
                                      min="0"
                                      value={(p.installments || []).length}
                                      onChange={(e) => handleInstallmentCountChange(p, parseInt(e.target.value) || 0)}
                                      disabled={profile?.role === 'secretary'}
                                      className="w-12 bg-transparent border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-emerald-400 focus:outline-none focus:ring-1 focus:ring-purple-500 text-center ml-auto disabled:opacity-50"
                                    />
                                  </div>
                                  {(p.installments || []).map((inst, i) => (
                                    <div key={inst.id} className="flex items-center gap-2 bg-black/20 p-1.5 rounded-lg border border-white/5">
                                      <span className="text-[10px] text-[var(--text-muted)] font-bold w-4">{i + 1}º</span>
                                      <button 
                                        onClick={() => handleUpdateInstallment(p, inst.id, 'paid', !inst.paid)}
                                        className={`p-1 rounded transition-all ${inst.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/20'}`}
                                      >
                                        <CheckCircle size={14} />
                                      </button>
                                      <span className="text-[10px] text-white/30">R$</span>
                                      <input 
                                        type="number" 
                                        step="0.01"
                                        value={inst.value} 
                                        onChange={(e) => handleUpdateInstallment(p, inst.id, 'value', e.target.value)}
                                        disabled={profile?.role === 'secretary'}
                                        className="w-20 text-right bg-transparent border-none px-1 py-0.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-purple-500 rounded ml-auto disabled:opacity-50"
                                      />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center text-[10px] text-[var(--text-muted)] p-2">
                                  Somente Boleto
                                </div>
                              )}
                            </td>
                            
                            {/* Total Value */}
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-[10px] text-white/30">R$</span>
                                <input 
                                  type="number" 
                                  step="0.01"
                                  value={p.total_value} 
                                  onChange={(e) => handleUpdateParticipant(p.id, 'total_value', e.target.value)}
                                  className="w-24 text-right bg-transparent border border-white/10 rounded-lg px-2 py-1 font-black text-blue-400 focus:bg-black/40 focus:ring-1 focus:ring-purple-500 transition-all disabled:opacity-50"
                                  disabled={profile?.role === 'secretary' || (p.installments || []).length > 0}
                                  title={(p.installments || []).length > 0 ? "Calculado pelas parcelas" : ""}
                                />
                              </div>
                            </td>

                            {/* Amount Paid */}
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-[10px] text-white/30">R$</span>
                                <input 
                                  type="number" 
                                  step="0.01"
                                  value={p.amount_paid} 
                                  onChange={(e) => handleUpdateParticipant(p.id, 'amount_paid', e.target.value)}
                                  className="w-24 text-right bg-transparent border border-white/10 rounded-lg px-2 py-1 font-black text-emerald-400 focus:bg-black/40 focus:ring-1 focus:ring-purple-500 transition-all disabled:opacity-50"
                                  disabled={(p.installments || []).length > 0}
                                  title={(p.installments || []).length > 0 ? "Calculado pelas parcelas pagas" : ""}
                                />
                              </div>
                            </td>

                            {/* Falta Pagar */}
                            <td className="p-4 text-right">
                              <span className={`font-black ${faltaPagar > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                R$ {faltaPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            {/* Has Ticket */}
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => handleUpdateParticipant(p.id, 'has_ticket', !p.has_ticket)}
                                className={`p-1.5 rounded-lg transition-all ${p.has_ticket ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/20'}`}
                              >
                                <CheckCircle size={18} />
                              </button>
                            </td>

                            {/* Ticket Quantity */}
                            <td className="p-4 text-center">
                              <input 
                                type="number" 
                                min="0"
                                value={p.ticket_quantity} 
                                onChange={(e) => handleUpdateParticipant(p.id, 'ticket_quantity', parseInt(e.target.value) || 0)}
                                className={`w-16 text-center bg-transparent border border-white/10 rounded-lg px-2 py-1 font-black transition-all ${p.ticket_quantity > 0 ? 'text-purple-400' : 'text-white/30'}`}
                              />
                            </td>

                            {/* Kit */}
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => handleUpdateParticipant(p.id, 'kit', !p.kit)}
                                className={`p-1.5 rounded-lg transition-all ${p.kit ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/20'}`}
                              >
                                <Box size={18} />
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="p-4 text-center">
                              {profile?.role !== 'secretary' ? (
                                <button 
                                  onClick={() => handleRemoveParticipant(p.id)}
                                  className="p-2 text-rose-400/50 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                                  title="Remover Aluno"
                                >
                                  <Trash2 size={16} />
                                </button>
                              ) : (
                                <span className="text-white/20 text-xs font-bold">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Criar/Editar Evento */}
      <Modal isOpen={showEventModal} onClose={() => setShowEventModal(false)} title={editEvent ? "Editar Evento" : "Novo Evento"}>
        <form onSubmit={handleEventSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Nome do Evento (ex: Espetáculo 2026) *</label>
            <input required value={eventFormData.name} onChange={e => setEventFormData({...eventFormData, name: e.target.value})} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Data *</label>
              <input required type="date" value={eventFormData.date} onChange={e => setEventFormData({...eventFormData, date: e.target.value})} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Local</label>
              <input value={eventFormData.location} onChange={e => setEventFormData({...eventFormData, location: e.target.value})} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Custo do Evento (R$)</label>
              <input type="number" step="0.01" value={eventFormData.cost} onChange={e => setEventFormData({...eventFormData, cost: parseFloat(e.target.value) || 0})} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Preço do Convite (R$)</label>
              <input type="number" step="0.01" value={eventFormData.ticket_price} onChange={e => setEventFormData({...eventFormData, ticket_price: parseFloat(e.target.value) || 0})} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Valor Base Coreografia (R$)</label>
              <input type="number" step="0.01" value={eventFormData.base_choreography_price} onChange={e => setEventFormData({...eventFormData, base_choreography_price: parseFloat(e.target.value) || 0})} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Custo Base Roupa (R$)</label>
              <input type="number" step="0.01" value={eventFormData.base_clothes_cost} onChange={e => setEventFormData({...eventFormData, base_clothes_cost: parseFloat(e.target.value) || 0})} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" style={inputStyle} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <button type="button" onClick={() => setShowEventModal(false)} className="px-6 py-3 rounded-2xl text-sm font-bold text-white/50 hover:text-white transition-all">Cancelar</button>
            <button type="submit" className="px-8 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105 shadow-xl" style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}>
              {editEvent ? 'Salvar' : 'Criar Evento'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
