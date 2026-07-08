import React, { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Calendar, MapPin, DollarSign, Users, Download, PlusCircle, CheckCircle, CreditCard, Box, Search, Printer, Map, ExternalLink, Copy, Loader2, QrCode } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Event, EventParticipant, Student, Installment, Profile, EventSession, SeatingMapConfig, Theater, EventExpense } from '../types'
import Modal from '../components/Modal'

export default function Events() {
  const [events, setEvents] = useState<Event[]>([])
  const [theaters, setTheaters] = useState<Theater[]>([])
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([])
  const [participants, setParticipants] = useState<EventParticipant[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [activeEventId, setActiveEventId] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [showEventModal, setShowEventModal] = useState(false)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending' | 'exempt'>('all')
  const [pendingInstallmentFilter, setPendingInstallmentFilter] = useState<number | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [reportSchoolData, setReportSchoolData] = useState<any | null>(null)
  const [gatewayType, setGatewayType] = useState<'none' | 'asaas' | 'cora'>('none')
  const [generatingBillingId, setGeneratingBillingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Estados e Funções para Mapa de Teatro
  const [showMapModal, setShowMapModal] = useState(false)
  const [rowsCount, setRowsCount] = useState(10)
  const [seatsPerRow, setSeatsPerRow] = useState(12)
  const [exceptions, setExceptions] = useState<Record<string, any>>({})
  const [corridorsInput, setCorridorsInput] = useState('')
  const [horizontalCorridorsInput, setHorizontalCorridorsInput] = useState('')

  // Estados para Aba de Mapa de Teatro e Reservas
  const [activeSubTab, setActiveSubTab] = useState<'spreadsheet' | 'seating_map' | 'expenses'>('spreadsheet')
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null)
  const [seatingSearchQuery, setSeatingSearchQuery] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  // Estados para Despesas do Evento
  const [eventExpenses, setEventExpenses] = useState<EventExpense[]>([])
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editExpense, setEditExpense] = useState<EventExpense | null>(null)
  const [expenseFormData, setExpenseFormData] = useState({
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0]
  })

  // Estados para Modal de Adicionar Participante
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false)
  const [participantFormData, setParticipantFormData] = useState({
    student_id: '',
    payment_method: '',
    choreography_count: 1,
    choreography_price: 0,
    clothes_count: 1,
    clothes_cost: 0,
    ticket_quantity: 0,
    kit: false,
    installments_count: 1
  })

  // Cálculo do tamanho dinâmico das cadeiras para a visualização prévia
  const rowExceptions = Object.entries(exceptions)
    .filter(([key]) => !key.startsWith('_'))
    .map(([, val]) => val as number)
  const corridors = (exceptions._corridors || []) as number[]
  const maxSeats = Math.max(
    seatsPerRow,
    ...rowExceptions,
    1
  ) + (corridors.length * 0.6)
  const seatSize = Math.max(22, Math.min(28, Math.floor((480 - (maxSeats - 1) * 3) / maxSeats)))

  function getRowLabel(index: number): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if (index < alphabet.length) {
      return alphabet[index]
    }
    return `Fileira ${index + 1}`
  }

  function openSeatingMap() {
    const activeEvent = events.find(e => e.id === activeEventId)
    if (!activeEvent) return

    let config = activeEvent.seating_map
    if (!config) {
      const localData = localStorage.getItem(`danceflow_event_seating_map_${activeEvent.id}`)
      if (localData) {
        try { config = JSON.parse(localData) } catch (e) { console.error(e) }
      }
    }
    if (config) {
      setRowsCount(config.rows_count || 10)
      setSeatsPerRow(config.seats_per_row || 12)
      setExceptions(config.exceptions || {})
      const corridors = (config.exceptions?._corridors || []) as number[]
      setCorridorsInput(corridors.length > 0 ? corridors.join(', ') : '')
      const hCorridors = (config.exceptions?._horizontal_corridors || []) as string[]
      setHorizontalCorridorsInput(hCorridors.length > 0 ? hCorridors.join(', ') : '')
    } else {
      setRowsCount(10)
      setSeatsPerRow(12)
      setExceptions({})
      setCorridorsInput('')
      setHorizontalCorridorsInput('')
    }
    setShowMapModal(true)
  }

  async function handleSaveSeatingMap(e: React.FormEvent) {
    e.preventDefault()
    const activeEvent = events.find(e => e.id === activeEventId)
    if (!activeEvent) return

    const parsedCorridors = corridorsInput
      .split(',')
      .map(c => parseInt(c.trim()))
      .filter(num => !isNaN(num) && num > 0)

    const parsedHorizontalCorridors = horizontalCorridorsInput
      .split(',')
      .map(c => c.trim().toUpperCase())
      .filter(Boolean)

    const updatedExceptions = { ...exceptions }
    if (parsedCorridors.length > 0) {
      updatedExceptions._corridors = parsedCorridors
    } else {
      delete updatedExceptions._corridors
    }

    if (parsedHorizontalCorridors.length > 0) {
      updatedExceptions._horizontal_corridors = parsedHorizontalCorridors
    } else {
      delete updatedExceptions._horizontal_corridors
    }

    const config: SeatingMapConfig = {
      rows_count: Number(rowsCount),
      seats_per_row: Number(seatsPerRow),
      exceptions: updatedExceptions
    }

    const { error } = await supabase
      .from('events')
      .update({ seating_map: config })
      .eq('id', activeEvent.id)

    if (error) {
      console.warn('Erro ao salvar no banco. Salvando no localStorage...', error)
      localStorage.setItem(`danceflow_event_seating_map_${activeEvent.id}`, JSON.stringify(config))
      alert('Configuração do mapa salva localmente com sucesso!')
    } else {
      alert('Mapa de Teatro salvo com sucesso!')
    }
    setEvents(events.map(ev => ev.id === activeEvent.id ? { ...ev, seating_map: config } : ev))
    setShowMapModal(false)
  }

  async function handleUpdateSeats(participantId: string, newSeats: string[], sessionId?: string | null) {
    const activeEvent = events.find(e => e.id === activeEventId)
    const hasSessions = activeEvent?.sessions && activeEvent.sessions.length > 0

    if (hasSessions && sessionId) {
      setParticipants(prev => prev.map(p => {
        if (p.id !== participantId) return p
        const updated = { ...(p.seats_by_session || {}) }
        updated[sessionId] = newSeats
        return { ...p, seats_by_session: updated }
      }))

      const participant = participants.find(p => p.id === participantId)
      const updatedBySession = { ...(participant?.seats_by_session || {}) }
      updatedBySession[sessionId] = newSeats

      const { error } = await supabase
        .from('event_participants')
        .update({ seats_by_session: updatedBySession })
        .eq('id', participantId)

      if (error) {
        console.warn('Erro ao salvar assentos no banco.', error)
        localStorage.setItem(`danceflow_seats_session_${participantId}_${sessionId}`, JSON.stringify(newSeats))
      } else {
        localStorage.removeItem(`danceflow_seats_session_${participantId}_${sessionId}`)
      }
    } else {
      setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, seats: newSeats } : p))

      const { error } = await supabase
        .from('event_participants')
        .update({ seats: newSeats })
        .eq('id', participantId)

      if (error) {
        console.warn('Erro ao salvar assentos no banco.', error)
        localStorage.setItem(`danceflow_seats_alloc_${participantId}`, JSON.stringify(newSeats))
      } else {
        localStorage.removeItem(`danceflow_seats_alloc_${participantId}`)
      }
    }
  }

  // Helper: get participant seats for current view (session-aware)
  function getParticipantSeats(p: EventParticipant, sessionId?: string | null): string[] {
    const activeEvent = events.find(e => e.id === activeEventId)
    const hasSessions = activeEvent?.sessions && activeEvent.sessions.length > 0
    if (hasSessions && sessionId) {
      return p.seats_by_session?.[sessionId] || []
    }
    return p.seats || []
  }

  // Helper: get total seats across all sessions for a participant
  function getTotalSeatsCount(p: EventParticipant): number {
    const activeEvent = events.find(e => e.id === activeEventId)
    const hasSessions = activeEvent?.sessions && activeEvent.sessions.length > 0
    if (hasSessions && p.seats_by_session) {
      return Object.values(p.seats_by_session).reduce((acc, seats) => acc + seats.length, 0)
    }
    return p.seats?.length || 0
  }

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
    base_clothes_cost: 0,
    has_kit: false,
    kit_price: 0,
    photos: '',
    sessions: [] as EventSession[],
    theater_id: '' as string | null,
    sessions_count: 0,
    due_date: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  // Auto-select first session of the active event if it has sessions
  useEffect(() => {
    if (activeEventId) {
      const activeEv = events.find(e => e.id === activeEventId)
      if (activeEv && activeEv.sessions && activeEv.sessions.length > 0) {
        const sessionExists = activeEv.sessions.some(s => s.id === selectedSessionId)
        if (!sessionExists) {
          setSelectedSessionId(activeEv.sessions[0].id)
        }
      } else {
        setSelectedSessionId(null)
      }
    } else {
      setSelectedSessionId(null)
    }
  }, [activeEventId, events, selectedSessionId])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)
    }

    const { data: eventsData } = await supabase.from('events').select('*').order('date', { ascending: true })
    setEvents(eventsData || [])

    const { data: theatersData } = await supabase.from('theaters').select('*').order('name')
    setTheaters(theatersData || [])
    
    if (eventsData && eventsData.length > 0 && !activeEventId) {
      setActiveEventId(eventsData[0].id)
    }

    const { data: studentsData } = await supabase.from('students').select('*').order('name')
    setStudents(studentsData || [])

    const { data: partsData } = await supabase.from('event_participants').select('*')
    const formattedParts = (partsData || []).map(p => {
      let seats = p.seats
      
      // Normalize string array format from Postgres or legacy text fields
      if (typeof seats === 'string') {
        try {
          seats = JSON.parse(seats)
        } catch (e) {
          seats = seats.split(',').map((s: string) => s.trim()).filter(Boolean)
        }
      }
      
      if (!Array.isArray(seats) || seats.length === 0) {
        const local = localStorage.getItem(`danceflow_seats_alloc_${p.id}`)
        if (local) {
          try {
            const parsed = JSON.parse(local)
            if (Array.isArray(parsed)) {
              seats = parsed
            } else if (typeof parsed === 'string') {
              seats = parsed.split(',').map((s: string) => s.trim()).filter(Boolean)
            }
          } catch (e) {
            console.error(e)
          }
        }
      }
      
      const finalSeats = Array.isArray(seats) ? seats.map(s => String(s)) : []
      
      // Parse seats_by_session
      let seatsBySession = p.seats_by_session || {}
      if (typeof seatsBySession === 'string') {
        try { seatsBySession = JSON.parse(seatsBySession) } catch { seatsBySession = {} }
      }
      
      const activeEv = (eventsData || []).find(e => e.id === p.event_id)
      const choreoPrice = p.choreography_price !== undefined && p.choreography_price !== null 
        ? Number(p.choreography_price) 
        : (Number(p.choreography_count || 0) * Number(activeEv?.base_choreography_price || 0))

      return { 
        ...p, 
        seats: finalSeats, 
        seats_by_session: seatsBySession,
        choreography_price: choreoPrice
      }
    })
    setParticipants(formattedParts)

    const { data: expensesData } = await supabase.from('event_expenses').select('*').order('expense_date', { ascending: false })
    setEventExpenses(expensesData || [])
    
    // Carregar configurações de gateway da escola
    const { data: settings } = await supabase
      .from('school_settings')
      .select('gateway_type')
      .limit(1)
      .maybeSingle()
    if (settings) {
      setGatewayType(settings.gateway_type || 'none')
    }
    
    setLoading(false)
  }

  async function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!activeEventId) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        event_id: activeEventId,
        description: expenseFormData.description,
        amount: parseFloat(expenseFormData.amount) || 0,
        expense_date: expenseFormData.expense_date,
        user_id: user?.id
      }

      let error = null
      if (editExpense) {
        const res = await supabase.from('event_expenses').update(payload).eq('id', editExpense.id)
        error = res.error
      } else {
        const res = await supabase.from('event_expenses').insert([payload])
        error = res.error
      }

      if (error) {
        throw error
      } else {
        setShowExpenseModal(false)
        setEditExpense(null)
        setExpenseFormData({
          description: '',
          amount: '',
          expense_date: new Date().toISOString().split('T')[0]
        })
        loadData()
      }
    } catch (error: any) {
      alert('Erro ao salvar despesa: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm('Deseja realmente excluir esta despesa?')) return
    const { error } = await supabase.from('event_expenses').delete().eq('id', id)
    if (error) {
      alert('Erro ao excluir despesa: ' + error.message)
    } else {
      loadData()
    }
  }

  function openEditExpense(exp: EventExpense) {
    setEditExpense(exp)
    setExpenseFormData({
      description: exp.description,
      amount: exp.amount.toString(),
      expense_date: exp.expense_date
    })
    setShowExpenseModal(true)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

    files.forEach(file => {
      // Validação de tipo MIME
      if (!allowedMimeTypes.includes(file.type)) {
        alert(`O arquivo "${file.name}" não é uma imagem válida (JPEG, PNG, WebP ou GIF) e foi rejeitado por segurança.`)
        return
      }

      // Validação de extensão
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
      if (!allowedExtensions.includes(fileExtension)) {
        alert(`O arquivo "${file.name}" possui uma extensão inválida e foi rejeitado.`)
        return
      }

      // Limite de tamanho: 5MB por foto de evento
      if (file.size > 5 * 1024 * 1024) {
        alert(`O arquivo "${file.name}" é muito grande. O limite máximo é 5MB por foto.`)
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        if (reader.result) {
          setUploadedPhotos(prev => [...prev, reader.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemovePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index))
  }

  function handleSessionsCountChange(count: number) {
    const val = Math.max(0, Math.min(100, count))
    const currentSessions = [...eventFormData.sessions]
    
    let updatedSessions: EventSession[] = []
    if (val > currentSessions.length) {
      updatedSessions = [...currentSessions]
      for (let i = currentSessions.length; i < val; i++) {
        updatedSessions.push({
          id: crypto.randomUUID(),
          name: `Sessão ${i + 1}`,
          datetime: ''
        })
      }
    } else if (val < currentSessions.length) {
      updatedSessions = currentSessions.slice(0, val)
    } else {
      updatedSessions = currentSessions
    }

    setEventFormData(prev => ({
      ...prev,
      sessions_count: val,
      sessions: updatedSessions
    }))
  }

  async function handleEventSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const photoUrlsArray = uploadedPhotos

    const payload: any = {
      name: eventFormData.name,
      date: eventFormData.date,
      location: eventFormData.location,
      description: eventFormData.description,
      ticket_price: eventFormData.ticket_price,
      cost: eventFormData.cost,
      base_choreography_price: eventFormData.base_choreography_price,
      base_clothes_cost: eventFormData.base_clothes_cost,
      has_kit: eventFormData.has_kit,
      kit_price: eventFormData.kit_price,
      photo_urls: photoUrlsArray,
      due_date: eventFormData.due_date || null
    }
    
    if (eventFormData.sessions.length > 0) {
      payload.sessions = eventFormData.sessions
    }

    const selectedTheater = theaters.find(t => t.id === eventFormData.theater_id)
    if (selectedTheater) {
      payload.seating_map = {
        rows_count: selectedTheater.rows_count,
        seats_per_row: selectedTheater.seats_per_row,
        exceptions: selectedTheater.exceptions
      }
      payload.theater_id = selectedTheater.id
    } else {
      payload.theater_id = null
    }

    setSaving(true)
    try {
      let error = null
      if (editEvent) {
        const res = await supabase.from('events').update(payload).eq('id', editEvent.id)
        error = res.error
      } else {
        const res = await supabase.from('events').insert([payload]).select()
        error = res.error
        if (!error && res.data && res.data.length > 0) {
          setActiveEventId(res.data[0].id)
        }
      }
      
      if (error) {
        throw error
      } else {
        setShowEventModal(false)
        setEditEvent(null)
        setUploadedPhotos([])
        setEventFormData({
          name: '',
          date: new Date().toISOString().split('T')[0],
          location: '',
          description: '',
          ticket_price: 0,
          cost: 0,
          base_choreography_price: 0,
          base_clothes_cost: 0,
          has_kit: false,
          kit_price: 0,
          photos: '',
          sessions: [] as EventSession[],
          theater_id: '',
          sessions_count: 0,
          due_date: ''
        })
        loadData()
      }
    } catch (error: any) {
      alert('Erro ao salvar evento: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm('Tem certeza que deseja excluir este evento e todos os seus participantes?')) return
    await supabase.from('events').delete().eq('id', id)
    if (activeEventId === id) setActiveEventId(null)
    loadData()
  }

  async function handlePrintReport() {
    if (!activeEventId) return
    const { data: school } = await supabase.from('school_settings').select('*').limit(1).single()
    setReportSchoolData(school || { school_name: 'DanceFlow' })
    setTimeout(() => {
      window.print()
      setReportSchoolData(null)
    }, 500)
  }

  function openEventEdit(ev: Event) {
    setEditEvent(ev)
    setUploadedPhotos(ev.photo_urls || [])
    setEventFormData({
      name: ev.name,
      date: ev.date,
      location: ev.location || '',
      description: ev.description || '',
      ticket_price: ev.ticket_price || 0,
      cost: ev.cost || 0,
      base_choreography_price: ev.base_choreography_price || 0,
      base_clothes_cost: ev.base_clothes_cost || 0,
      has_kit: ev.has_kit || false,
      kit_price: ev.kit_price || 0,
      photos: ev.photo_urls ? ev.photo_urls.join(', ') : '',
      sessions: ev.sessions || [],
      theater_id: ev.theater_id || '',
      sessions_count: ev.sessions ? ev.sessions.length : 0,
      due_date: ev.due_date || ''
    })
    setShowEventModal(true)
  }

  // --- Participant Spreadsheet Logic ---
  
  const handleModalChoreoCountChange = (count: number) => {
    if (!activeEvent) return
    const choreoPrice = count > 0 ? (activeEvent.base_choreography_price || 0) : 0
    const clothesPrice = count * (activeEvent.base_clothes_cost || 0)
    setParticipantFormData(prev => ({
      ...prev,
      choreography_count: count,
      choreography_price: choreoPrice,
      clothes_count: count,
      clothes_cost: clothesPrice
    }))
  }

  async function handleAddParticipantSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeEventId || !participantFormData.student_id) return alert('Selecione um aluno!')

    const exists = participants.some(p => p.event_id === activeEventId && p.student_id === participantFormData.student_id)
    if (exists) return alert('Aluno já está no evento!')

    const activeEvent = events.find(ev => ev.id === activeEventId)
    if (!activeEvent) return

    const choreoPrice = Number(participantFormData.choreography_price) || 0
    const clothesPrice = Number(participantFormData.clothes_cost) || 0
    const clothesCount = Number(participantFormData.clothes_count) || 0
    const ticketQty = Number(participantFormData.ticket_quantity) || 0
    const hasKitSelected = Boolean(participantFormData.kit)
    
    const kitFee = (activeEvent.has_kit && hasKitSelected) ? (activeEvent.kit_price || 0) : 0
    const newTotal = choreoPrice + clothesPrice + (ticketQty * (activeEvent.ticket_price || 0)) + kitFee

    // Generate installments if Boleto
    const installments: Installment[] = []
    const instCount = Number(participantFormData.installments_count) || 1
    if ((participantFormData.payment_method === 'Boleto' || participantFormData.payment_method === 'Cartão') && instCount > 0) {
      const baseValue = Math.floor((newTotal / instCount) * 100) / 100
      let sum = 0
      
      let today: Date
      if (activeEvent.due_date) {
        today = new Date(activeEvent.due_date + 'T00:00:00')
      } else {
        today = new Date()
        today.setDate(today.getDate() + 5) // 5 days from today for first installment
      }
      
      for (let i = 0; i < instCount; i++) {
        const val = i === instCount - 1 ? Number((newTotal - sum).toFixed(2)) : baseValue
        sum += val
        
        const d = new Date(today)
        d.setMonth(d.getMonth() + i)
        const dueStr = d.toISOString().split('T')[0]
        
        installments.push({
          id: crypto.randomUUID(),
          paid: false,
          value: val,
          due_date: dueStr
        })
      }
    }

    const payload = {
      event_id: activeEventId,
      student_id: participantFormData.student_id,
      has_ticket: ticketQty > 0,
      ticket_quantity: ticketQty,
      total_value: newTotal,
      amount_paid: 0,
      kit: hasKitSelected,
      payment_method: participantFormData.payment_method || null,
      choreography_count: Number(participantFormData.choreography_count) || 0,
      choreography_price: choreoPrice,
      clothes_count: clothesCount,
      clothes_cost: clothesPrice,
      installments
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('event_participants').insert([payload])
      if (error) {
        throw error
      } else {
        setShowAddParticipantModal(false)
        loadData()
      }
    } catch (error: any) {
      alert('Erro ao adicionar participante: ' + error.message)
    } finally {
      setSaving(false)
    }
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

    // Auto-calculate total value if quantities or prices change
    if (
      field === 'choreography_count' || 
      field === 'choreography_price' || 
      field === 'clothes_cost' || 
      field === 'ticket_quantity' || 
      field === 'kit'
    ) {
      const activeEvent = events.find(e => e.id === p.event_id)
      if (activeEvent) {
        const choreoCount = field === 'choreography_count' ? Number(value) : Number(p.choreography_count || 0)
        let choreoPrice = field === 'choreography_price' ? Number(value) : Number(p.choreography_price || 0)
        let clothesPrice = field === 'clothes_cost' ? Number(value) : Number(p.clothes_cost || 0)
        const ticketQty = field === 'ticket_quantity' ? Number(value) : Number(p.ticket_quantity || 0)
        const hasKitSelected = field === 'kit' ? Boolean(value) : Boolean(p.kit)
        
        // Regra de Negócio: Se alterar o número de coreografias, auto-ajusta a taxa de participação e roupa
        // A Taxa de Participação é cobrada uma única vez (se count > 0).
        // A roupa é cobrada por coreografia (count * custo base).
        if (field === 'choreography_count') {
          choreoPrice = choreoCount > 0 ? (activeEvent.base_choreography_price || 0) : 0
          payload.choreography_price = choreoPrice
          optimUpdate.choreography_price = choreoPrice

          const newClothesCount = choreoCount
          payload.clothes_count = newClothesCount
          optimUpdate.clothes_count = newClothesCount

          clothesPrice = choreoCount * (activeEvent.base_clothes_cost || 0)
          payload.clothes_cost = clothesPrice
          optimUpdate.clothes_cost = clothesPrice
        }

        const kitFee = (activeEvent.has_kit && hasKitSelected) ? (activeEvent.kit_price || 0) : 0
        
        const newTotal = choreoPrice + clothesPrice + (ticketQty * (activeEvent.ticket_price || 0)) + kitFee
        
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
    
    if (field === 'payment_method' && value !== 'Boleto' && value !== 'Cartão' && p.installments && p.installments.length > 0) {
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
      const activeEvent = events.find(ev => ev.id === p.event_id)
      let today: Date
      if (activeEvent?.due_date) {
        today = new Date(activeEvent.due_date + 'T00:00:00')
      } else {
        today = new Date()
        today.setDate(today.getDate() + 5) // 5 days from today
      }
      while (updatedInstallments.length < count) {
        const i = updatedInstallments.length
        const d = new Date(today)
        d.setMonth(d.getMonth() + i)
        const dueStr = d.toISOString().split('T')[0]
        
        updatedInstallments.push({ 
          id: crypto.randomUUID(), 
          value: 0, 
          paid: false,
          due_date: dueStr
        })
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
    if (value === '' && field !== 'due_date') value = 0;
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

  async function handleGenerateEventBilling(eventParticipantId: string, installmentId: string) {
    if (gatewayType === 'none') {
      const confirmDemo = confirm(
        "Automação Financeira Inativa:\n" +
        "Nenhum gateway de pagamento (Asaas ou Cora PJ) está configurado nas Configurações da sua escola.\n\n" +
        "Deseja simular a geração de um boleto fictício para fins de teste?"
      )
      if (!confirmDemo) return
      
      setGeneratingBillingId(installmentId)
      await new Promise(resolve => setTimeout(resolve, 800)) // Efeito visual de loading
      
      try {
        const demoData = {
          gateway_id: `demo_${crypto.randomUUID()}`,
          payment_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          pix_code: "00020101021226870014br.gov.bcb.pix2565pix-h.asaas.com/qr/v2/demo-key-danceflow5802BR5920DanceFlow%20Demo%20School6009Sao%20Paulo62070503***63041A2F",
          barcode: "34191.79001 01043.513184 91020.150008 7 90280000010000"
        }
        
        const part = participants.find(pt => pt.id === eventParticipantId)
        if (part) {
          const updatedInstallments = (part.installments || []).map(inst => {
            if (inst.id === installmentId) {
              return { ...inst, ...demoData }
            }
            return inst
          })
          
          const { error } = await supabase
            .from('event_participants')
            .update({ installments: updatedInstallments })
            .eq('id', eventParticipantId)
            
          if (error) throw error
          
          setParticipants(prev => prev.map(p => p.id === eventParticipantId ? { ...p, installments: updatedInstallments } : p))
          alert("Boleto/Pix fictício gerado com sucesso!")
        }
      } catch (err: any) {
        alert("Erro ao salvar simulação: " + err.message)
      } finally {
        setGeneratingBillingId(null)
      }
      return
    }

    setGeneratingBillingId(installmentId)
    try {
      const part = participants.find(p => p.id === eventParticipantId)
      const inst = part?.installments?.find(i => i.id === installmentId)
      const dueDate = inst?.due_date

      const { data, error } = await supabase.functions.invoke('create-billing', {
        body: { eventParticipantId, installmentId, dueDate }
      })
      if (error) {
        let errorMsg = error.message
        const errObj = error as any
        if (errObj.context) {
          try {
            const text = typeof errObj.context.text === 'function' ? await errObj.context.text() : null
            if (text) {
              try {
                const body = JSON.parse(text)
                errorMsg = body.error || text
              } catch (e) {
                errorMsg = text
              }
            }
          } catch (e) {
            console.error('Error reading context text:', e)
          }
        }
        throw new Error(errorMsg)
      }

      if (data && data.success) {
        setParticipants(prev => prev.map(part => {
          if (part.id === eventParticipantId) {
            const updatedInstallments = (part.installments || []).map(inst => {
              if (inst.id === installmentId) {
                return {
                  ...inst,
                  gateway_id: data.gateway_id,
                  payment_url: data.payment_url,
                  pix_code: data.pix_code,
                  barcode: data.barcode
                }
              }
              return inst
            })
            return { ...part, installments: updatedInstallments }
          }
          return part
        }))
        alert('Cobrança (Boleto/Pix) gerada com sucesso via gateway!')
      }
    } catch (err: any) {
      console.error('Error generating event billing:', err)
      alert(`Falha ao gerar cobrança: ${err.message}`)
    } finally {
      setGeneratingBillingId(null)
    }
  }

  const activeEvent = events.find(e => e.id === activeEventId)
  const currentParticipants = participants.filter(p => p.event_id === activeEventId)

  // Sort and Filter for the UI list
  const filteredParticipants = currentParticipants
    .filter(p => {
      const student = students.find(s => s.id === p.student_id)
      if (!student) return false
      
      // Filter by Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesStudent = student.name.toLowerCase().includes(query)
        const matchesGuardian = student.guardian_name ? student.guardian_name.toLowerCase().includes(query) : false
        if (!matchesStudent && !matchesGuardian) return false
      }
      
      // Filter by Payment Status
      const faltaPagar = (Number(p.total_value) || 0) - (Number(p.amount_paid) || 0)
      if (paymentFilter === 'paid' && faltaPagar > 0) return false
      if (paymentFilter === 'pending') {
        if (faltaPagar <= 0) return false
        if (pendingInstallmentFilter !== null) {
          const targetInst = (p.installments || [])[pendingInstallmentFilter - 1]
          if (!targetInst || targetInst.paid) return false
        }
      }
      if (paymentFilter === 'exempt') {
        if (p.payment_method?.toLowerCase() !== 'isento') return false
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
  const totalChoreoRevenue = currentParticipants.reduce((acc, p) => acc + (Number(p.choreography_price) || 0), 0)

  const participantsWithClothes = currentParticipants.filter(p => (Number(p.clothes_cost) || 0) > 0).length
  const totalClothesRevenue = currentParticipants.reduce((acc, p) => acc + (Number(p.clothes_cost) || 0), 0)
  const totalClothesCount = currentParticipants.reduce((acc, p) => acc + (Number(p.clothes_count) || 0), 0)

  const totalKits = currentParticipants.filter(p => p.kit).length
  const totalKitRevenue = totalKits * (activeEvent?.kit_price || 0)

  const eventCost = activeEvent?.cost || 0
  const activeEventExpenses = eventExpenses.filter(exp => exp.event_id === activeEventId)
  const totalRealExpenses = activeEventExpenses.reduce((acc, exp) => acc + Number(exp.amount), 0)
  const budgetBalance = eventCost - totalRealExpenses
  const netResult = totalReceived - totalRealExpenses

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
        className="p-5 sm:p-8 md:p-10 pb-10 sm:pb-16 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden mb-8"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
      >
        <div 
          className="absolute -left-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-20"
          style={{ backgroundColor: 'var(--accent-color)' }}
        />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8 relative z-10">
          <div className="space-y-4">
            <h1 
              className="font-black tracking-tighter leading-tight inline-block py-4 sm:py-8 rounded-2xl shadow-2xl shadow-purple-500/30" 
              style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--title-size, 32px)', paddingLeft: 'clamp(16px, 4vw, 40px)', paddingRight: 'clamp(16px, 4vw, 40px)' }}
            >
              Eventos
            </h1>
            <br />
            <p className="font-bold inline-block py-3 sm:py-6 mt-2 rounded-2xl shadow-xl border border-white/10" style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: 'clamp(12px, 3vw, 32px)', paddingRight: 'clamp(12px, 3vw, 32px)' }}>
              Gerencie espetáculos, festivais e participantes
            </p>
          </div>
          <div className="flex gap-4">
            {activeEvent && (
              <button
                type="button"
                onClick={() => openSeatingMap()}
                className="flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105 shadow-xl cursor-pointer"
                style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
              >
                <Map size={26} />
                Mapa de Teatro
              </button>
            )}
            {profile?.role !== 'secretary' && (
              <button
                type="button"
                onClick={() => {
                  setEditEvent(null)
                  setUploadedPhotos([])
                  setEventFormData({ name: '', date: new Date().toISOString().split('T')[0], location: '', description: '', ticket_price: 0, cost: 0, base_choreography_price: 0, base_clothes_cost: 0, has_kit: false, kit_price: 0, photos: '', sessions: [], theater_id: '', sessions_count: 0, due_date: '' })
                  setShowEventModal(true)
                }}
                className="flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105 shadow-xl cursor-pointer"
                style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
              >
                <Calendar size={26} />
                Novo Evento
              </button>
            )}
          </div>
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
          <div className="flex gap-4 overflow-x-auto pb-4 mb-6 custom-scrollbar">
            {events.map(ev => (
              <button
                key={ev.id}
                onClick={() => setActiveEventId(ev.id)}
                className={`flex-shrink-0 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-center min-w-[170px] cursor-pointer whitespace-nowrap ${
                  activeEventId === ev.id ? 'shadow-xl text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                }`}
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
                className="p-5 sm:p-8 md:p-10 pb-10 sm:pb-16 rounded-none border border-white/5 shadow-2xl mb-8 relative overflow-hidden"
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
                      className="font-black tracking-tighter leading-tight inline-block py-4 sm:py-8 rounded-none shadow-2xl shadow-purple-500/30" 
                      style={{ 
                        backgroundColor: 'var(--accent-color)', 
                        color: '#fff',
                        fontSize: 'var(--title-size, 32px)',
                        paddingLeft: 'clamp(16px, 4vw, 40px)',
                        paddingRight: 'clamp(16px, 4vw, 40px)'
                      }}
                    >
                      {activeEvent.name}
                    </h2>
                    <br />
                    <p 
                      className="font-bold inline-block py-3 sm:py-6 mt-2 rounded-none shadow-xl border border-white/10" 
                       style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: 'clamp(12px, 3vw, 32px)', paddingRight: 'clamp(12px, 3vw, 32px)' }}
                    >
                      {activeEvent.description || 'Sem descrição'} {activeEvent.location ? `• Local: ${activeEvent.location}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Event Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 xl:grid-cols-9 gap-4">
                <div className="w-full p-4 sm:p-6 rounded-none border border-white/5 text-center flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 text-center">Participantes</p>
                  <p className={`font-black text-white ${getDynamicFontSize(currentParticipants.length)}`}>{currentParticipants.length}</p>
                </div>
                {profile?.role !== 'secretary' && (
                  <>
                    <div className="w-full p-4 sm:p-6 rounded-none border border-white/5 text-center flex flex-col items-center justify-center animate-fade-in" style={{ backgroundColor: 'var(--bg-card)' }}>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 text-center">Custo Orçado</p>
                      <p className={`font-black text-white/50 ${getDynamicFontSize(`R$ ${Number(eventCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}`}>
                        R$ {Number(eventCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="w-full p-4 sm:p-6 rounded-none border border-white/5 text-center flex flex-col items-center justify-center animate-fade-in" style={{ backgroundColor: 'var(--bg-card)' }}>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 text-center">Despesa Real</p>
                      <p className={`font-black text-rose-400 ${getDynamicFontSize(`R$ ${Number(totalRealExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}`}>
                        R$ {Number(totalRealExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="w-full p-4 sm:p-6 rounded-none border border-white/5 text-center flex flex-col items-center justify-center animate-fade-in" style={{ backgroundColor: 'var(--bg-card)' }}>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 text-center">Saldo Orçamento</p>
                      <p className={`font-black ${budgetBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'} ${getDynamicFontSize(`R$ ${Number(budgetBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}`}>
                        R$ {Number(budgetBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="w-full p-4 sm:p-6 rounded-none border border-white/5 text-center flex flex-col items-center justify-center animate-fade-in" style={{ backgroundColor: 'var(--bg-card)' }}>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 text-center">A Receber Total</p>
                      <p className={`font-black text-blue-400 ${getDynamicFontSize(`R$ ${Number(expectedRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}`}>
                        R$ {Number(expectedRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="w-full p-4 sm:p-6 rounded-none border border-white/5 text-center flex flex-col items-center justify-center animate-fade-in" style={{ backgroundColor: 'var(--bg-card)' }}>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 text-center">Já Recebido</p>
                      <p className={`font-black text-emerald-400 ${getDynamicFontSize(`R$ ${Number(totalReceived).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}`}>
                        R$ {Number(totalReceived).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="w-full p-4 sm:p-6 rounded-none border border-white/5 text-center flex flex-col items-center justify-center animate-fade-in" style={{ backgroundColor: 'var(--bg-card)' }}>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 text-center">Falta Receber</p>
                      <p className={`font-black text-amber-400 ${getDynamicFontSize(`R$ ${Number(expectedRevenue - totalReceived).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}`}>
                        R$ {Number(expectedRevenue - totalReceived).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </>
                )}
                <div className="w-full p-4 sm:p-6 rounded-none border border-white/5 text-center flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 text-center">Convites Vendidos</p>
                  <p className={`font-black text-purple-400 ${getDynamicFontSize(totalTickets)}`}>{totalTickets}</p>
                </div>
                {activeEvent.has_kit && (
                  <div className="w-full p-4 sm:p-6 rounded-none border border-white/5 text-center flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-card)' }}>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 text-center">Total de Kits</p>
                    <p className={`font-black text-blue-400 ${getDynamicFontSize(totalKits)}`}>{totalKits}</p>
                  </div>
                )}
              </div>

              {/* Relatório Financeiro Detalhado */}
              {profile?.role !== 'secretary' && (
                <div className="p-6 rounded-none border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', marginTop: '24px' }}>
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
                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Taxas de Participação</span>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-black">{totalChoreographies} un.</span>
                      </div>
                      <div className="flex justify-between items-end mt-4">
                        <div>
                          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Taxa Base (un)</p>
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
                        <span className="px-2 py-1 bg-rose-500/20 text-rose-400 rounded-lg text-xs font-black">{totalClothesCount} un.</span>
                      </div>
                      <div className="flex justify-between items-end mt-4">
                        <div>
                          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Custo Base Estimado (un)</p>
                          <p className="text-sm font-bold text-white/50">R$ {Number(activeEvent?.base_clothes_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Total Arrecadado</p>
                          <p className="text-xl font-black text-rose-400">R$ {Number(totalClothesRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tabs Selection */}
              <div className="flex flex-wrap gap-4 p-2 rounded-2xl border w-fit" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', marginBottom: '30px' }}>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('spreadsheet')}
                  className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: activeSubTab === 'spreadsheet' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                    boxShadow: activeSubTab === 'spreadsheet' ? '0 0 10px var(--accent-color)' : 'none',
                    opacity: activeSubTab === 'spreadsheet' ? 1 : 0.6
                  }}
                >
                  Planilha de Vendas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('seating_map')}
                  className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: activeSubTab === 'seating_map' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                    boxShadow: activeSubTab === 'seating_map' ? '0 0 10px var(--accent-color)' : 'none',
                    opacity: activeSubTab === 'seating_map' ? 1 : 0.6
                  }}
                >
                  Mapa de Assentos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('expenses')}
                  className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: activeSubTab === 'expenses' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                    boxShadow: activeSubTab === 'expenses' ? '0 0 10px var(--accent-color)' : 'none',
                    opacity: activeSubTab === 'expenses' ? 1 : 0.6
                  }}
                >
                  Despesas do Evento
                </button>
              </div>

              {activeSubTab === 'spreadsheet' ? (
                <>
                  {/* Event Actions & Add Participant */}
                  <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-black/20 p-4 rounded-3xl border border-white/5">
                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
                      {profile?.role !== 'secretary' && (
                        <button
                          type="button"
                          onClick={() => {
                            setParticipantFormData({
                              student_id: '',
                              payment_method: '',
                              choreography_count: 1,
                              choreography_price: activeEvent?.base_choreography_price || 0,
                              clothes_count: 1,
                              clothes_cost: activeEvent?.base_clothes_cost || 0,
                              ticket_quantity: 0,
                              kit: false,
                              installments_count: 1
                            })
                            setShowAddParticipantModal(true)
                          }}
                          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 hover:scale-[1.03] active:scale-95 cursor-pointer w-full sm:w-auto shrink-0"
                        >
                          <Plus size={16} /> Adicionar Aluno
                        </button>
                      )}
                      <div className="flex items-center gap-3 rounded-xl px-4 py-3 border w-full sm:w-64 shrink-0" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
                        <Search className="text-white/30 shrink-0" size={18} />
                        <input 
                          type="text" 
                          placeholder="Buscar aluno na planilha..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-transparent text-sm text-white focus:outline-none placeholder:text-white/30"
                        />
                      </div>

                      {/* Filtros de Pagamento */}
                      <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1 w-full sm:w-auto justify-between sm:justify-start shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentFilter('all')
                            setPendingInstallmentFilter(null)
                          }}
                          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center justify-center ${paymentFilter === 'all' ? 'bg-purple-600 text-white shadow' : 'text-white hover:text-purple-300 hover:bg-purple-600/10'}`}
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentFilter('paid')
                            setPendingInstallmentFilter(null)
                          }}
                          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center justify-center ${paymentFilter === 'paid' ? 'bg-emerald-400 text-slate-950 shadow' : 'text-white hover:text-emerald-400 hover:bg-emerald-400/10'}`}
                        >
                          Pago
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentFilter('pending')
                            setPendingInstallmentFilter(null)
                          }}
                          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center justify-center ${paymentFilter === 'pending' && pendingInstallmentFilter === null ? 'bg-amber-400 text-slate-950 shadow' : 'text-white hover:text-amber-400 hover:bg-amber-400/10'}`}
                        >
                          Falta Pagar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentFilter('exempt')
                            setPendingInstallmentFilter(null)
                          }}
                          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center justify-center ${paymentFilter === 'exempt' ? 'bg-cyan-400 text-slate-950 shadow' : 'text-white hover:text-cyan-400 hover:bg-cyan-400/10'}`}
                        >
                          Isentos
                        </button>
                      </div>

                      {/* Filtros de Parcela Específica */}
                      {paymentFilter === 'pending' && (
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar justify-start sm:justify-start shrink-0">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => {
                                if (pendingInstallmentFilter === num) {
                                  setPendingInstallmentFilter(null)
                                } else {
                                  setPendingInstallmentFilter(num)
                                }
                              }}
                              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center justify-center whitespace-nowrap ${pendingInstallmentFilter === num ? 'bg-amber-500 text-slate-950 shadow' : 'text-white hover:text-amber-400 hover:bg-amber-500/10'}`}
                            >
                              Falta {num}ª
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                     {profile?.role !== 'secretary' && (
                        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto justify-stretch sm:justify-end">
                          <button type="button" onClick={handlePrintReport} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:scale-[1.03] active:scale-95 cursor-pointer">
                            <Printer size={16} /> Imprimir Relatório
                          </button>
                          <button type="button" onClick={() => openEventEdit(activeEvent)} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:scale-[1.03] active:scale-95 cursor-pointer">
                            <Edit size={16} /> Detalhes do Evento
                          </button>
                          <button type="button" onClick={() => handleDeleteEvent(activeEvent.id)} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 hover:scale-[1.03] active:scale-95 cursor-pointer">
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
                          <th className="pl-5 pr-8 py-3.5 font-black text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5">Aluno</th>
                          <th className="px-4 py-3.5 font-black text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-center">Tipo Pgto</th>
                          <th className="px-4 py-3.5 font-black text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-center">Coreo (Qtd / R$)</th>
                          <th className="px-4 py-3.5 font-black text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-center">Roupa (Qtd / R$)</th>
                          <th className="px-4 py-3.5 font-black text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-left">Parcelas</th>
                          <th className="px-4 py-3.5 font-black text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-right">Valor Total</th>
                          <th className="px-4 py-3.5 font-black text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-right">Valor Pago</th>
                          <th className="px-4 py-3.5 font-black text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-right">Falta Pagar</th>
                          <th className="px-4 py-3.5 font-black text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-center">Convites</th>
                          <th className="px-4 py-3.5 font-black text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-center">Qtd</th>
                          <th className="px-4 py-3.5 font-black text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-center">Kit</th>
                          <th className="px-4 py-3.5 font-black text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 text-center">Ações</th>
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
                                <td className="pl-5 pr-8 py-3.5 max-w-[200px] text-xs">
                                  <div className="font-bold text-white truncate">{student?.name}</div>
                                  {student?.guardian_name && (
                                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate font-medium">
                                      Resp: {student.guardian_name}
                                    </div>
                                  )}
                                </td>
                                
                                {/* Payment Method */}
                                <td className="px-4 py-3.5 text-center text-xs">
                                  <select 
                                    value={p.payment_method || ''} 
                                    onChange={(e) => handleUpdateParticipant(p.id, 'payment_method', e.target.value)}
                                    disabled={profile?.role === 'secretary'}
                                    className="bg-transparent border border-white/10 rounded-lg px-1.5 py-0.5 text-[11px] focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                                  >
                                    <option value="" className="bg-gray-900">-</option>
                                    <option value="Boleto" className="bg-gray-900">Boleto</option>
                                    <option value="Cartão" className="bg-gray-900">Cartão</option>
                                    <option value="Pix" className="bg-gray-900">Pix</option>
                                    <option value="Isento" className="bg-gray-900">Isento</option>
                                  </select>
                                </td>

                                {/* Coreografias */}
                                <td className="px-4 py-3.5 text-center text-xs">
                                  <div className="flex flex-col gap-1 items-center">
                                    <input 
                                      type="number" 
                                      min="0"
                                      value={p.choreography_count || 0} 
                                      onChange={(e) => handleUpdateParticipant(p.id, 'choreography_count', parseInt(e.target.value) || 0)}
                                      disabled={profile?.role === 'secretary'}
                                      className={`w-14 text-center bg-transparent border border-white/10 rounded-lg px-1 py-0.5 text-xs font-black transition-all disabled:opacity-50 ${p.choreography_count > 0 ? 'text-purple-400' : 'text-white/30'}`}
                                      placeholder="Qtd"
                                      title="Quantidade de coreografias"
                                    />
                                    <div className="flex items-center gap-0.5 bg-black/20 px-1 py-0.5 rounded border border-white/5 w-[84px]">
                                      <span className="text-[9px] text-white/30">R$</span>
                                      <input 
                                        type="number" 
                                        step="0.01"
                                        value={p.choreography_price ?? 0} 
                                        onChange={(e) => handleUpdateParticipant(p.id, 'choreography_price', parseFloat(e.target.value) || 0)}
                                        disabled={profile?.role === 'secretary'}
                                        className={`w-full bg-transparent border-none p-0 text-[10px] text-right font-black focus:outline-none ${p.choreography_price && p.choreography_price > 0 ? 'text-purple-300' : 'text-white/20'}`}
                                        placeholder="Valor"
                                        title="Valor total de participação"
                                      />
                                    </div>
                                  </div>
                                </td>

                                {/* Roupa (Qtd / R$) */}
                                <td className="px-4 py-3.5 text-center text-xs">
                                  <div className="flex flex-col gap-1 items-center">
                                    <input 
                                      type="number" 
                                      min="0"
                                      value={p.clothes_count ?? 0} 
                                      onChange={(e) => handleUpdateParticipant(p.id, 'clothes_count', parseInt(e.target.value) || 0)}
                                      disabled={profile?.role === 'secretary'}
                                      className={`w-14 text-center bg-transparent border border-white/10 rounded-lg px-1 py-0.5 text-xs font-black transition-all disabled:opacity-50 ${p.clothes_count && p.clothes_count > 0 ? 'text-rose-400' : 'text-white/30'}`}
                                      placeholder="Qtd"
                                      title="Quantidade de roupas"
                                    />
                                    <div className="flex items-center gap-0.5 bg-black/20 px-1 py-0.5 rounded border border-white/5 w-[84px]">
                                      <span className="text-[9px] text-white/30">R$</span>
                                      <input 
                                        type="number" 
                                        step="0.01"
                                        value={p.clothes_cost || 0} 
                                        onChange={(e) => handleUpdateParticipant(p.id, 'clothes_cost', parseFloat(e.target.value) || 0)}
                                        disabled={profile?.role === 'secretary'}
                                        className={`w-full bg-transparent border-none p-0 text-[10px] text-right font-black focus:outline-none ${p.clothes_cost > 0 ? 'text-rose-300' : 'text-white/20'}`}
                                        placeholder="Roupa"
                                        title="Valor total da roupa"
                                      />
                                    </div>
                                  </div>
                                </td>

                                {/* Parcelas */}
                                <td className="px-4 py-3.5 text-xs">
                                  {p.payment_method === 'Boleto' || p.payment_method === 'Cartão' ? (
                                    <div className="flex flex-col gap-2 min-w-[320px]">
                                      <div className="flex items-center gap-2 mb-1 bg-white/5 p-2 rounded-xl">
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
                                      
                                      <div className="flex flex-col gap-1.5 max-h-[150px] overflow-y-auto pr-1">
                                        {(p.installments || []).map((inst, i) => (
                                          <div key={inst.id} className="flex items-center gap-2 bg-black/25 p-1.5 rounded-lg border border-white/5 text-xs">
                                            <span className="text-[10px] text-[var(--text-muted)] font-bold w-4 shrink-0">{i + 1}º</span>
                                            
                                            {/* Check Pago */}
                                            <button 
                                              type="button"
                                              onClick={() => handleUpdateInstallment(p, inst.id, 'paid', !inst.paid)}
                                              className={`p-1 rounded transition-all shrink-0 ${inst.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/20'}`}
                                            >
                                              <CheckCircle size={12} />
                                            </button>
                                            
                                            {/* Valor */}
                                            <div className="flex items-center gap-0.5 shrink-0 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                              <span className="text-[9px] text-white/30">R$</span>
                                              <input 
                                                type="number" 
                                                step="0.01"
                                                value={inst.value} 
                                                onChange={(e) => handleUpdateInstallment(p, inst.id, 'value', e.target.value)}
                                                disabled={profile?.role === 'secretary'}
                                                className="w-14 text-right bg-transparent border-none p-0 text-xs font-bold focus:outline-none text-white disabled:opacity-50"
                                              />
                                            </div>

                                            {/* Vencimento */}
                                            <input 
                                              type="date"
                                              value={inst.due_date || ''}
                                              onChange={(e) => handleUpdateInstallment(p, inst.id, 'due_date', e.target.value)}
                                              disabled={profile?.role === 'secretary' || !!inst.payment_url}
                                              className="bg-transparent border border-white/10 rounded px-1 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-purple-500 text-white disabled:opacity-50 shrink-0 w-28 text-center"
                                              title="Data de Vencimento"
                                            />

                                            {/* Ações da cobrança de boleto */}
                                            <div className="flex gap-1 shrink-0 ml-auto">
                                              {inst.payment_url ? (
                                                <>
                                                  <a
                                                    href={inst.payment_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Abrir Boleto Bancário (PDF)"
                                                    className="flex items-center justify-center p-1 rounded text-blue-400 hover:text-blue-300 transition-all bg-blue-500/10 hover:bg-blue-500/20"
                                                  >
                                                    <ExternalLink size={12} />
                                                  </a>
                                                  {inst.pix_code && (
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        navigator.clipboard.writeText(inst.pix_code || '')
                                                        alert('Chave Pix Copia e Cola copiada com sucesso!')
                                                      }}
                                                      title="Copiar Pix Copia e Cola"
                                                      className="flex items-center justify-center p-1 rounded text-emerald-400 hover:text-emerald-300 transition-all bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer"
                                                    >
                                                      <Copy size={12} />
                                                    </button>
                                                  )}
                                                </>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() => handleGenerateEventBilling(p.id, inst.id)}
                                                  disabled={generatingBillingId === inst.id || inst.paid}
                                                  title="Gerar Boleto/Pix"
                                                  className="flex items-center justify-center p-1 rounded text-purple-400 hover:text-purple-300 disabled:opacity-50 transition-all bg-purple-500/10 hover:bg-purple-500/20 cursor-pointer animate-pulse"
                                                >
                                                  {generatingBillingId === inst.id ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                  ) : (
                                                    <QrCode size={12} />
                                                  )}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center text-[10px] text-[var(--text-muted)] p-2">
                                      Somente Boleto/Cartão
                                    </div>
                                  )}
                                </td>
                                
                                {/* Total Value */}
                                <td className="px-3 py-2.5 text-xs">
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-[10px] text-white/30">R$</span>
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      value={p.total_value} 
                                      onChange={(e) => handleUpdateParticipant(p.id, 'total_value', e.target.value)}
                                      className="w-20 text-right bg-transparent border border-white/10 rounded-lg px-1.5 py-0.5 text-xs font-black text-blue-400 focus:bg-black/40 focus:ring-1 focus:ring-purple-500 transition-all disabled:opacity-50"
                                      disabled={profile?.role === 'secretary' || (p.installments || []).length > 0}
                                      title={(p.installments || []).length > 0 ? "Calculado pelas parcelas" : ""}
                                    />
                                  </div>
                                </td>

                                {/* Amount Paid */}
                                <td className="px-3 py-2.5 text-xs">
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-[10px] text-white/30">R$</span>
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      value={p.amount_paid} 
                                      onChange={(e) => handleUpdateParticipant(p.id, 'amount_paid', e.target.value)}
                                      className="w-20 text-right bg-transparent border border-white/10 rounded-lg px-1.5 py-0.5 text-xs font-black text-emerald-400 focus:bg-black/40 focus:ring-1 focus:ring-purple-500 transition-all disabled:opacity-50"
                                      disabled={(p.installments || []).length > 0}
                                      title={(p.installments || []).length > 0 ? "Calculado pelas parcelas pagas" : ""}
                                    />
                                  </div>
                                </td>

                                {/* Falta Pagar */}
                                <td className="px-3 py-2.5 text-right text-xs">
                                  <div className="flex flex-col items-end">
                                    <span className={`font-black ${faltaPagar > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                      R$ {faltaPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    {faltaPagar > 0 && (p.payment_method === 'Boleto' || p.payment_method === 'Cartão') && p.installments && p.installments.length > 0 && (
                                      <span className="text-[9px] text-amber-500/70 font-bold mt-0.5">
                                        Falta: {(p.installments || [])
                                          .map((inst, idx) => inst.paid ? null : `${idx + 1}ª`)
                                          .filter((x): x is string => x !== null)
                                          .join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Has Ticket */}
                                <td className="px-3 py-2.5 text-center text-xs">
                                  <button 
                                    type="button"
                                    onClick={() => handleUpdateParticipant(p.id, 'has_ticket', !p.has_ticket)}
                                    className={`p-1 rounded-lg transition-all ${p.has_ticket ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/20'}`}
                                  >
                                    <CheckCircle size={16} />
                                  </button>
                                </td>

                                {/* Ticket Quantity */}
                                <td className="px-3 py-2.5 text-center text-xs">
                                  <div className="flex flex-col items-center gap-1">
                                    <input 
                                      type="number" 
                                      min="0"
                                      value={p.ticket_quantity} 
                                      onChange={(e) => handleUpdateParticipant(p.id, 'ticket_quantity', parseInt(e.target.value) || 0)}
                                      className={`w-12 text-center bg-transparent border border-white/10 rounded-lg px-1 py-0.5 text-xs font-black transition-all ${p.ticket_quantity > 0 ? 'text-purple-400' : 'text-white/30'}`}
                                    />
                                    {Array.isArray(p.seats) && p.seats.length > 0 && (
                                      <span className="text-[9px] font-bold max-w-[80px] truncate" style={{ color: 'var(--accent-color)' }} title={p.seats.join(', ')}>
                                        {p.seats.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Kit */}
                                <td className="px-3 py-2.5 text-center text-xs">
                                  {activeEvent.has_kit ? (
                                    <button 
                                      type="button"
                                      onClick={() => handleUpdateParticipant(p.id, 'kit', !p.kit)}
                                      disabled={profile?.role === 'secretary'}
                                      className={`p-1 rounded-lg transition-all disabled:opacity-40 ${p.kit ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/20'}`}
                                      title={`Adicionar Kit (R$ ${Number(activeEvent.kit_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`}
                                    >
                                      <Box size={16} />
                                    </button>
                                  ) : (
                                    <span className="text-white/20 text-xs font-semibold select-none cursor-default">Sem Kit</span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="px-3 py-2.5 text-center text-xs">
                                  {profile?.role !== 'secretary' ? (
                                    <button 
                                      type="button"
                                      onClick={() => handleRemoveParticipant(p.id)}
                                      className="p-1 text-rose-400/50 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
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
                </>
              ) : activeSubTab === 'seating_map' ? (() => {
                const hasSessions = activeEvent.sessions && activeEvent.sessions.length > 0
                const activeSession = hasSessions ? activeEvent.sessions!.find(s => s.id === selectedSessionId) : null
                const displaySeatingMap = activeEvent.seating_map

                return (
                <div className="flex flex-col" style={{ gap: '22px' }}>
                  {/* Session Selector */}
                  {hasSessions && (
                    <div className="flex flex-wrap gap-2 p-3 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                      <span className="flex items-center text-[10px] font-black uppercase tracking-widest px-3" style={{ color: 'var(--text-primary)', opacity: 0.5 }}>Sessão:</span>
                      {activeEvent.sessions!.map(session => {
                        const isActive = selectedSessionId === session.id
                        // Count occupied seats for this session
                        const sessionSeatsCount = currentParticipants.reduce((acc, p) => {
                          return acc + (p.seats_by_session?.[session.id]?.length || 0)
                        }, 0)
                        const totalSeatsInSession = (() => {
                          const map = activeEvent.seating_map
                          if (!map) return 0
                          let total = 0
                          for (let i = 0; i < map.rows_count; i++) {
                            const rowName = getRowLabel(i)
                            total += map.exceptions?.[rowName] !== undefined ? map.exceptions[rowName] : map.seats_per_row
                          }
                          return total
                        })()
                        return (
                          <button
                            key={session.id}
                            type="button"
                            onClick={() => setSelectedSessionId(session.id)}
                            className="px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
                            style={{
                              backgroundColor: 'var(--bg-card)',
                              color: 'var(--text-primary)',
                              border: isActive ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                              boxShadow: isActive ? '0 0 10px var(--accent-color)' : 'none',
                              opacity: isActive ? 1 : 0.6
                            }}
                          >
                            <span>{session.name}</span>
                            {activeEvent.seating_map && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', opacity: 0.8 }}>
                                {sessionSeatsCount}/{totalSeatsInSession}
                              </span>
                            )}
                            {session.datetime && (
                              <span className="text-[9px]" style={{ color: 'var(--text-primary)', opacity: isActive ? 0.8 : 0.4 }}>
                                {new Date(session.datetime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {hasSessions && !selectedSessionId && (
                    <div className="text-center py-16 bg-black/20 rounded-3xl border border-dashed border-white/10">
                      <Map size={48} className="mx-auto text-white/20 mb-4" />
                      <h4 className="text-base font-bold text-white mb-1">Selecione uma sessão</h4>
                      <p className="text-xs text-[var(--text-muted)]">Escolha uma sessão acima para ver e gerenciar o mapa de assentos.</p>
                    </div>
                  )}

                  {(!hasSessions || selectedSessionId) && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LADO ESQUERDO: LISTA DE ALUNOS E ASSENTOS */}
                    <div className="lg:col-span-4 flex flex-col h-[350px] lg:h-[600px]" style={{ gap: '14px' }}>
                      <div className="w-full py-4 px-6 rounded-2xl shadow-xl text-center text-xs font-black uppercase tracking-widest text-white relative overflow-hidden" style={{ backgroundColor: 'var(--accent-color)', backgroundImage: 'linear-gradient(135deg, var(--accent-color), #000)' }}>
                        Alunos & Reservas {hasSessions && activeSession ? `• ${activeSession.name}` : ''}
                      </div>
                      
                      {/* Search Bar */}
                      <div className="flex items-center gap-3 rounded-xl px-4 py-3 border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
                        <Search className="text-white/30 shrink-0" size={18} />
                        <input 
                          type="text" 
                          placeholder="Buscar aluno..." 
                          value={seatingSearchQuery}
                          onChange={(e) => setSeatingSearchQuery(e.target.value)}
                          className="w-full bg-transparent text-sm text-white focus:outline-none placeholder:text-white/30"
                        />
                      </div>

                      {/* Participant scroll list */}
                      <div className="flex-1 overflow-y-auto pr-1 flex flex-col custom-scrollbar" style={{ gap: '10px' }}>
                        {/* Assento de Cortesia */}
                        {activeEvent && (
                          <div 
                            className="p-3.5 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-center shrink-0"
                            style={{ 
                              backgroundColor: selectedParticipantId === 'courtesy' ? 'color-mix(in srgb, #38bdf8 15%, var(--bg-card))' : 'var(--bg-card)', 
                              borderColor: selectedParticipantId === 'courtesy' ? '#38bdf8' : 'var(--border-color)',
                              boxShadow: selectedParticipantId === 'courtesy' ? '0 0 10px rgba(56, 189, 248, 0.2)' : 'none'
                            }}
                            onClick={() => setSelectedParticipantId(selectedParticipantId === 'courtesy' ? null : 'courtesy')}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">🎁</span>
                              <div>
                                <p className="text-xs font-black text-sky-400">Assento de Cortesia</p>
                                <p className="text-[10px] text-[var(--text-muted)]">Reservar para convidados / cortesias</p>
                              </div>
                            </div>
                            {(() => {
                              const map = activeEvent.seating_map
                              const count = hasSessions && selectedSessionId
                                ? map?.courtesies_by_session?.[selectedSessionId]?.length || 0
                                : map?.courtesies?.length || 0
                              return count > 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-black text-white" style={{ backgroundColor: '#38bdf8' }}>
                                  {count}
                                </span>
                              )
                            })()}
                          </div>
                        )}

                        {(() => {
                          const filteredPartsForSeating = currentParticipants
                            .filter(p => {
                              const student = students.find(s => s.id === p.student_id)
                              if (!student) return false
                              if (seatingSearchQuery) {
                                return student.name.toLowerCase().includes(seatingSearchQuery.toLowerCase())
                              }
                              return true
                            })
                            .sort((a, b) => {
                              const studentA = students.find(s => s.id === a.student_id)?.name || ''
                              const studentB = students.find(s => s.id === b.student_id)?.name || ''
                              return studentA.localeCompare(studentB)
                            })

                          if (filteredPartsForSeating.length === 0) {
                            return (
                              <div className="text-center py-10 bg-black/10 rounded-2xl border border-dashed border-white/5">
                                <p className="text-xs text-[var(--text-muted)]">Nenhum aluno encontrado.</p>
                              </div>
                            )
                          }

                          return filteredPartsForSeating.map(p => {
                            const student = students.find(s => s.id === p.student_id)
                            if (!student) return null
                            const isSelected = selectedParticipantId === p.id
                            const currentSessionSeats = getParticipantSeats(p, selectedSessionId)
                            const totalSeatsGlobal = getTotalSeatsCount(p)
                            const limit = p.ticket_quantity || 0
                            
                            // Badge based on global limit
                            let badgeBg = 'bg-black/30 text-white/50 border border-white/5'
                            let badgeText = 'Sem convite'
                            if (limit > 0) {
                              if (totalSeatsGlobal === 0) {
                                badgeBg = 'bg-black/35 text-rose-300 border border-white/10'
                                badgeText = `0 de ${limit} reservadas`
                              } else if (totalSeatsGlobal < limit) {
                                badgeBg = 'bg-black/35 text-amber-300 border border-white/10'
                                badgeText = `${totalSeatsGlobal} de ${limit} reservadas`
                              } else if (totalSeatsGlobal === limit) {
                                badgeBg = 'bg-black/35 text-emerald-200 border border-white/10'
                                badgeText = `Completo (${limit}/${limit})`
                              } else {
                                badgeBg = 'bg-black/35 text-rose-200 border border-white/10 animate-pulse'
                                badgeText = `Excedido (${totalSeatsGlobal}/${limit})`
                              }
                            }

                            return (
                              <div 
                                key={p.id}
                                onClick={() => setSelectedParticipantId(p.id)}
                                className="p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col gap-2 hover:scale-[1.01]"
                                style={{
                                  backgroundColor: 'var(--bg-card)',
                                  color: 'var(--text-primary)',
                                  border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                  boxShadow: isSelected ? '0 0 12px var(--accent-color)' : 'none',
                                }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-bold text-sm truncate">{student.name}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase shrink-0 ${badgeBg}`}>
                                    {badgeText}
                                  </span>
                                </div>

                                {/* Per-session seats info */}
                                {hasSessions && activeEvent.sessions!.length > 0 ? (
                                  <div className="flex flex-col gap-1 mt-1">
                                    {activeEvent.sessions!.map(session => {
                                      const sessionSeats = p.seats_by_session?.[session.id] || []
                                      const isCurrentSession = session.id === selectedSessionId
                                      return (
                                        <div key={session.id} className={`flex flex-wrap gap-1 items-center ${isCurrentSession ? '' : 'opacity-60'}`}>
                                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: isSelected ? 0.7 : 0.4 }}>
                                            {session.name}:
                                          </span>
                                          {sessionSeats.length > 0 ? (
                                            sessionSeats.map(seat => (
                                              <span key={seat} className="text-[9px] font-black px-1 py-0.5 rounded border" style={{
                                                backgroundColor: 'var(--bg-input)',
                                                color: 'var(--text-primary)',
                                                borderColor: isCurrentSession ? 'var(--accent-color)' : 'var(--border-color)'
                                              }}>
                                                {seat}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-[9px] italic" style={{ color: 'var(--text-primary)', opacity: isSelected ? 0.4 : 0.2 }}>—</span>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-1 items-center mt-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: isSelected ? 0.7 : 0.4 }}>Assentos:</span>
                                    {Array.isArray(p.seats) && p.seats.length > 0 ? (
                                      p.seats.map(seat => (
                                        <span key={seat} className="text-[10px] font-black px-1.5 py-0.5 rounded border" style={{
                                          backgroundColor: 'var(--bg-input)',
                                          color: 'var(--text-primary)',
                                          borderColor: 'var(--border-color)'
                                        }}>
                                          {seat}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-[10px] italic" style={{ color: 'var(--text-primary)', opacity: isSelected ? 0.4 : 0.2 }}>Nenhum reservado</span>
                                    )}
                                  </div>
                                )}

                                {isSelected && (
                                  <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }} onClick={(e) => e.stopPropagation()}>
                                    <label className="text-[9px] font-black uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Editar Manualmente{hasSessions && activeSession ? ` (${activeSession.name})` : ''}:</label>
                                    <div className="flex gap-2">
                                      <input 
                                        type="text" 
                                        defaultValue={currentSessionSeats.join(', ')} 
                                        onBlur={async (ev) => {
                                          const val = ev.target.value
                                          const newSeats = val.split(',')
                                            .map(s => s.trim().toUpperCase())
                                            .filter(Boolean)
                                          
                                          // Validate global ticket limit
                                          const otherSessionsCount = hasSessions
                                            ? Object.entries(p.seats_by_session || {})
                                                .filter(([sid]) => sid !== selectedSessionId)
                                                .reduce((acc, [, seats]) => acc + seats.length, 0)
                                            : 0
                                          if (newSeats.length + otherSessionsCount > limit && limit > 0) {
                                            alert(`Limite de ingressos atingido! ${student.name} comprou apenas ${limit} ingresso(s) no total.`)
                                            ev.target.value = currentSessionSeats.join(', ')
                                            return
                                          }
                                          await handleUpdateSeats(p.id, newSeats, selectedSessionId)
                                        }}
                                        onKeyDown={(ev) => {
                                          if (ev.key === 'Enter') {
                                            (ev.target as HTMLInputElement).blur()
                                          }
                                        }}
                                        className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white"
                                        placeholder="Ex: A1, A2"
                                        key={currentSessionSeats.join(', ') + (selectedSessionId || '')}
                                      />
                                      <button
                                        type="button"
                                        onClick={async (ev) => {
                                          ev.stopPropagation()
                                          if (confirm(`Deseja limpar todos os assentos de ${student.name}${hasSessions && activeSession ? ` na ${activeSession.name}` : ''}?`)) {
                                            await handleUpdateSeats(p.id, [], selectedSessionId)
                                          }
                                        }}
                                        className="px-2.5 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-rose-500/30"
                                      >
                                        Limpar
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>

                    {/* LADO DIREITO: MAPA INTERATIVO */}
                    <div className="lg:col-span-8 flex flex-col" style={{ gap: '14px' }}>
                      <div className="w-full py-4 px-6 rounded-2xl shadow-xl text-xs font-black uppercase tracking-widest text-white flex items-center justify-between gap-4" style={{ backgroundColor: 'var(--accent-color)', backgroundImage: 'linear-gradient(135deg, var(--accent-color), #000)' }}>
                        <span>Mapa Seletor de Poltronas {hasSessions && activeSession ? `• ${activeSession.name}` : ''}</span>
                        {selectedParticipantId && (
                          <span className="px-2 py-0.5 rounded bg-white/20 text-[9px] text-white">Configuração Ativa</span>
                        )}
                      </div>

                      {selectedParticipantId ? (
                        <div className="p-4 rounded-xl flex items-center justify-between text-xs font-black uppercase tracking-widest shadow-md text-white transition-all border border-white/10" style={{ backgroundColor: 'var(--accent-color)', backgroundImage: 'linear-gradient(135deg, var(--accent-color), #0a0a0f)' }}>
                          <span>Aluno Selecionado: {students.find(s => s.id === participants.find(p => p.id === selectedParticipantId)?.student_id)?.name}</span>
                          <span className="px-2.5 py-1 rounded bg-black/40 text-[9px]">Selecione os assentos abaixo</span>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-xs text-[var(--text-muted)] text-center font-bold">
                          Selecione um aluno na coluna ao lado para alocar assentos no teatro.
                        </div>
                      )}

                      {!displaySeatingMap ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-black/20 rounded-3xl border border-dashed border-white/10 text-center">
                          <Map size={48} className="text-white/20 mb-4" />
                          <h4 className="text-base font-bold text-white mb-1">Nenhum mapa configurado</h4>
                          <p className="text-xs text-[var(--text-muted)] mb-6 max-w-sm">
                            Para começar a reservar assentos, configure a quantidade de fileiras e poltronas deste evento.
                          </p>
                          <button
                            type="button"
                            onClick={() => openSeatingMap()}
                            className="px-6 py-3 rounded-xl text-white font-bold text-xs transition-all shadow-lg hover:scale-105 cursor-pointer"
                            style={{
                              background: 'linear-gradient(135deg, var(--accent-color), #000)',
                              boxShadow: '0 4px 12px color-mix(in srgb, var(--accent-color) 20%, transparent)'
                            }}
                          >
                            Configurar Agora
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="flex flex-col items-center justify-center p-8 rounded-3xl border border-white/5 relative overflow-hidden" 
                          style={{ backgroundColor: 'var(--bg-card)' }}
                        >
                          {/* Legend */}
                          <div className="flex flex-wrap justify-center gap-6 mb-8 text-[11px] font-bold uppercase tracking-wider text-white/50 border-b border-white/5 pb-4 w-full">
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 rounded border" style={{ 
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                borderColor: '#10b981'
                              }} />
                              <span>Livre</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 rounded border" style={{ 
                                backgroundColor: 'color-mix(in srgb, var(--accent-color) 20%, transparent)',
                                borderColor: '#ef4444'
                              }} />
                              <span>Reservado</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 rounded border" style={{ 
                                backgroundColor: 'var(--accent-color)',
                                borderColor: '#ef4444',
                                boxShadow: '0 0 8px var(--accent-color)'
                              }} />
                              <span>Do Aluno Selecionado</span>
                            </div>
                          </div>

                          {/* Stage */}
                          <div 
                            className="w-full max-w-md py-3 mb-10 rounded-b-2xl border-b-2 text-center text-xs font-black uppercase tracking-widest text-white/70 shadow-lg shrink-0 select-none"
                            style={{ 
                              background: 'linear-gradient(to bottom, color-mix(in srgb, var(--accent-color) 8%, transparent), color-mix(in srgb, var(--accent-color) 20%, transparent))',
                              borderBottomColor: 'var(--accent-color)',
                              boxShadow: '0 8px 20px -8px color-mix(in srgb, var(--accent-color) 30%, transparent)'
                            }}
                          >
                            PALCO / TELA
                          </div>

                          {/* Seating Grid */}
                          <div className="w-full overflow-auto max-h-[450px] pr-2 py-2 custom-scrollbar flex flex-col items-center">
                            <div className="flex flex-col gap-2.5 min-w-max py-2 pr-2">
                              {(() => {
                              const config = displaySeatingMap
                              const rows = config.rows_count || 10
                              const stdSeats = config.seats_per_row || 12
                              const excs = config.exceptions || {}
                              
                              const rowExceptions = Object.entries(excs)
                                .filter(([key]) => !key.startsWith('_'))
                                .map(([, val]) => val as number)
                              const mapCorridors = (excs._corridors || []) as number[]
                              const maxSeatsInRow = Math.max(
                                stdSeats,
                                ...rowExceptions,
                                1
                              ) + (mapCorridors.length * 0.6)
                              const displaySeatSize = Math.max(26, Math.min(36, Math.floor((550 - (maxSeatsInRow - 1) * 4) / maxSeatsInRow)))

                              let currentSeatCounter = 1;
                              const rowStartNumbers = Array.from({ length: rows }).map((_, rIdx) => {
                                const rowName = getRowLabel(rIdx)
                                const count = excs[rowName] !== undefined ? excs[rowName] : stdSeats
                                const startNum = currentSeatCounter
                                currentSeatCounter += count
                                return startNum
                              })

                              const hCorridors = (excs._horizontal_corridors || []) as string[]

                              return Array.from({ length: rows }).map((_, rIdx) => {
                                const rowName = getRowLabel(rIdx)
                                const count = excs[rowName] !== undefined ? excs[rowName] : stdSeats
                                const rowStartNum = rowStartNumbers[rIdx]
                                const hasHorizontalCorridorAfter = hCorridors.includes(rowName)

                                return (
                                  <React.Fragment key={rowName}>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[10px] font-black text-white/30 w-4 text-center shrink-0">{rowName}</span>
                                      
                                      <div className="flex gap-1.5 items-center">
                                        {count === 0 ? (
                                          <span className="text-[9px] text-rose-400 italic font-semibold">Sem cadeiras nesta fileira</span>
                                        ) : (
                                          Array.from({ length: count }).map((_, sIdx) => {
                                            const seatNum = rowStartNum + sIdx
                                            const seatLabel = `${rowName}${seatNum}`
                                            
                                            // Find booking status for current session
                                            const occupiedBy = participants.find(p => {
                                              if (p.event_id !== activeEventId) return false
                                              if (hasSessions && selectedSessionId) {
                                                return p.seats_by_session?.[selectedSessionId]?.includes(seatLabel)
                                              }
                                              return p.seats?.includes(seatLabel)
                                            })
                                            const isSelectedSeat = selectedParticipantId && occupiedBy?.id === selectedParticipantId
                                            
                                            // Check if seat is a courtesy seat
                                            const isCourtesy = (() => {
                                              const map = activeEvent?.seating_map
                                              if (!map) return false
                                              if (hasSessions && selectedSessionId) {
                                                return map.courtesies_by_session?.[selectedSessionId]?.includes(seatLabel) || false
                                              }
                                              return map.courtesies?.includes(seatLabel) || false
                                            })()
 
                                            const isThreeDigits = seatNum > 99
                                            const seatFontSize = isThreeDigits 
                                              ? Math.max(8, displaySeatSize * 0.35) 
                                              : Math.max(9, displaySeatSize * 0.45)

                                            let style: React.CSSProperties = {
                                              width: `${displaySeatSize}px`,
                                              height: `${displaySeatSize}px`,
                                              fontSize: `${seatFontSize}px`
                                            }
 
                                            let seatClass = "rounded-lg flex items-center justify-center font-bold border shrink-0 transition-all select-none cursor-pointer "
                                            let tooltipText = `Poltrona ${seatLabel}`
 
                                            if (isCourtesy) {
                                              tooltipText += " - Cortesia (Reservado)"
                                              if (selectedParticipantId === 'courtesy') {
                                                seatClass += "text-white hover:scale-110"
                                                style.backgroundColor = '#38bdf8'
                                                style.boxShadow = '0 0 12px #38bdf8'
                                                style.borderColor = '#0284c7'
                                              } else {
                                                seatClass += "hover:opacity-90"
                                                style.backgroundColor = 'rgba(56, 189, 248, 0.15)'
                                                style.borderColor = '#38bdf8'
                                                style.color = '#38bdf8'
                                              }
                                            } else if (occupiedBy) {
                                              const occStudent = students.find(s => s.id === occupiedBy.student_id)
                                              tooltipText += ` - Reservado para: ${occStudent?.name || 'Desconhecido'}`
                                              if (isSelectedSeat) {
                                                seatClass += "text-white hover:scale-110"
                                                style.backgroundColor = 'var(--accent-color)'
                                                style.boxShadow = '0 0 12px var(--accent-color)'
                                                style.borderColor = '#ef4444'
                                              } else {
                                                seatClass += "hover:opacity-90"
                                                style.backgroundColor = 'color-mix(in srgb, var(--accent-color) 20%, transparent)'
                                                style.borderColor = '#ef4444'
                                                style.color = 'var(--accent-color)'
                                              }
                                            } else {
                                              tooltipText += " - Livre"
                                              seatClass += "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-white hover:border-[#10b981] hover:scale-105"
                                              style.borderColor = '#10b981'
                                            }
 
                                            const handleSeatClick = async () => {
                                              if (!selectedParticipantId) {
                                                alert('Por favor, selecione um aluno ou "Assento de Cortesia" na lista ao lado primeiro para reservar assentos!')
                                                return
                                              }
 
                                              const map = activeEvent?.seating_map || { rows_count: 10, seats_per_row: 12, exceptions: {} }
 
                                              if (selectedParticipantId === 'courtesy') {
                                                let updatedCourtesies = [...(map.courtesies || [])]
                                                let updatedCourtesiesBySession = { ...(map.courtesies_by_session || {}) }
 
                                                if (hasSessions && selectedSessionId) {
                                                  let sessionCourtesies = [...(updatedCourtesiesBySession[selectedSessionId] || [])]
                                                  if (isCourtesy) {
                                                    sessionCourtesies = sessionCourtesies.filter(s => s !== seatLabel)
                                                  } else {
                                                    if (occupiedBy) {
                                                      const otherSeats = getParticipantSeats(occupiedBy, selectedSessionId)
                                                      await handleUpdateSeats(occupiedBy.id, otherSeats.filter(s => s !== seatLabel), selectedSessionId)
                                                    }
                                                    sessionCourtesies.push(seatLabel)
                                                  }
                                                  updatedCourtesiesBySession[selectedSessionId] = sessionCourtesies
                                                } else {
                                                  if (isCourtesy) {
                                                    updatedCourtesies = updatedCourtesies.filter(s => s !== seatLabel)
                                                  } else {
                                                    if (occupiedBy) {
                                                      const otherSeats = getParticipantSeats(occupiedBy, selectedSessionId)
                                                      await handleUpdateSeats(occupiedBy.id, otherSeats.filter(s => s !== seatLabel), selectedSessionId)
                                                    }
                                                    updatedCourtesies.push(seatLabel)
                                                  }
                                                }
 
                                                const newSeatingMap = {
                                                  ...map,
                                                  courtesies: updatedCourtesies,
                                                  courtesies_by_session: updatedCourtesiesBySession
                                                }
 
                                                const { error } = await supabase
                                                  .from('events')
                                                  .update({ seating_map: newSeatingMap })
                                                  .eq('id', activeEventId)
 
                                                if (error) {
                                                  alert('Erro ao atualizar cortesia: ' + error.message)
                                                } else {
                                                  loadData()
                                                }
                                                return
                                              }
 
                                              const targetPart = participants.find(p => p.id === selectedParticipantId)
                                              if (!targetPart) return
 
                                              const currentSeats = getParticipantSeats(targetPart, selectedSessionId)
 
                                              if (isCourtesy) {
                                                const targetStud = students.find(s => s.id === targetPart.student_id)
                                                if (confirm(`O assento ${seatLabel} é uma cortesia. Deseja liberar a cortesia e reservar para ${targetStud?.name || 'este aluno'}?`)) {
                                                  let updatedCourtesies = [...(map.courtesies || [])]
                                                  let updatedCourtesiesBySession = { ...(map.courtesies_by_session || {}) }
 
                                                  if (hasSessions && selectedSessionId) {
                                                    updatedCourtesiesBySession[selectedSessionId] = (updatedCourtesiesBySession[selectedSessionId] || []).filter(s => s !== seatLabel)
                                                  } else {
                                                    updatedCourtesies = updatedCourtesies.filter(s => s !== seatLabel)
                                                  }
 
                                                  const newSeatingMap = {
                                                    ...map,
                                                    courtesies: updatedCourtesies,
                                                    courtesies_by_session: updatedCourtesiesBySession
                                                  }
 
                                                  await supabase
                                                    .from('events')
                                                    .update({ seating_map: newSeatingMap })
                                                    .eq('id', activeEventId)
 
                                                  // Reserve for student
                                                  const newSeats = [...currentSeats, seatLabel]
                                                  await handleUpdateSeats(selectedParticipantId, newSeats, selectedSessionId)
                                                }
                                                return
                                              }
 
                                              if (occupiedBy) {
                                                if (occupiedBy.id === selectedParticipantId) {
                                                  const newSeats = currentSeats.filter(s => s !== seatLabel)
                                                  await handleUpdateSeats(selectedParticipantId, newSeats, selectedSessionId)
                                                } else {
                                                  const otherStud = students.find(s => s.id === occupiedBy.student_id)
                                                  if (confirm(`O assento ${seatLabel} já está reservado para ${otherStud?.name || 'outro aluno'}. Deseja desmarcar e liberar este assento?`)) {
                                                    const otherSeats = getParticipantSeats(occupiedBy, selectedSessionId)
                                                    const newSeatsOther = otherSeats.filter(s => s !== seatLabel)
                                                    await handleUpdateSeats(occupiedBy.id, newSeatsOther, selectedSessionId)
                                                  }
                                                }
                                              } else {
                                                // Check global limit
                                                const globalCount = getTotalSeatsCount(targetPart)
                                                const limit = targetPart.ticket_quantity || 0
                                                if (limit > 0 && globalCount >= limit) {
                                                  const targetStud = students.find(s => s.id === targetPart.student_id)
                                                  alert(`Limite de ingressos atingido! ${targetStud?.name} comprou apenas ${limit} ingresso(s) no total entre todas as sessões.`)
                                                } else {
                                                  const newSeats = [...currentSeats, seatLabel]
                                                  await handleUpdateSeats(selectedParticipantId, newSeats, selectedSessionId)
                                                }
                                              }
                                            }
 
                                            return (
                                              <React.Fragment key={seatLabel}>
                                                <div 
                                                  className={seatClass}
                                                  style={style}
                                                  title={tooltipText}
                                                  onClick={handleSeatClick}
                                                >
                                                  {displaySeatSize >= 15 ? seatNum : ''}
                                                </div>
                                                {mapCorridors.includes(sIdx + 1) && sIdx < count - 1 && (
                                                  <div 
                                                    className="shrink-0 select-none pointer-events-none" 
                                                    style={{ width: `${displaySeatSize * 0.6}px` }} 
                                                  />
                                                )}
                                              </React.Fragment>
                                            )
                                          })
                                        )}
                                      </div>
 
                                      <span className="text-[10px] font-black text-white/30 w-4 text-center shrink-0">{rowName}</span>
                                    </div>
                                    {hasHorizontalCorridorAfter && rIdx < rows - 1 && (
                                      <div 
                                        className="shrink-0 select-none pointer-events-none" 
                                        style={{ height: `${displaySeatSize * 0.6}px` }} 
                                      />
                                    )}
                                  </React.Fragment>
                                )
                              })
                            })()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </div>
                )
              })() : (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 rounded-3xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <h3 className="text-sm font-black uppercase text-purple-400">Gerenciamento de Despesas</h3>
                    {profile?.role !== 'secretary' && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditExpense(null)
                          setExpenseFormData({
                            description: '',
                            amount: '',
                            expense_date: new Date().toISOString().split('T')[0]
                          })
                          setShowExpenseModal(true)
                        }}
                        className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-purple-600/20 hover:scale-[1.03] active:scale-95 cursor-pointer"
                      >
                        <Plus size={16} /> Nova Despesa
                      </button>
                    )}
                  </div>

                  {/* Comparative Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 rounded-3xl border text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                      <p className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-2">Custo Orçado</p>
                      <p className="text-2xl font-black text-white">R$ {Number(eventCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-gray-400 mt-2">Definido no cadastro do evento</p>
                    </div>
                    <div className="p-6 rounded-3xl border text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                      <p className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-2">Despesa Real (Gasto)</p>
                      <p className="text-2xl font-black text-rose-400">R$ {Number(totalRealExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-gray-400 mt-2">Soma de todas as despesas diárias</p>
                    </div>
                    <div className="p-6 rounded-3xl border text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                      <p className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-2">Saldo do Orçamento</p>
                      <p className={`text-2xl font-black ${budgetBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        R$ {Number(budgetBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-2">
                        {budgetBalance >= 0 ? 'Dentro do orçamento planejado' : 'Orçamento estourado!'}
                      </p>
                    </div>
                  </div>

                  {/* Expenses Table */}
                  <div className="rounded-none overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Data</th>
                            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Descrição</th>
                            <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Valor</th>
                            {profile?.role !== 'secretary' && (
                              <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Ações</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {activeEventExpenses.length === 0 ? (
                            <tr>
                              <td colSpan={profile?.role !== 'secretary' ? 4 : 3} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                                Nenhuma despesa cadastrada para este evento.
                              </td>
                            </tr>
                          ) : (
                            activeEventExpenses.map((exp) => (
                              <tr 
                                key={exp.id} 
                                className="transition-colors border-b" 
                                style={{ borderColor: 'var(--border-color)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')} 
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  {new Date(exp.expense_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-6 py-4 text-sm font-semibold text-white">{exp.description}</td>
                                <td className="px-6 py-4 text-sm text-right font-black text-rose-400">
                                  R$ {Number(exp.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                {profile?.role !== 'secretary' && (
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                      <button onClick={() => openEditExpense(exp)} className="p-2 rounded-2xl hover:opacity-70 transition-opacity" style={{ color: '#3b82f6' }}><Edit size={16} /></button>
                                      <button onClick={() => handleDeleteExpense(exp.id)} className="p-2 rounded-2xl hover:opacity-70 transition-opacity" style={{ color: '#f43f5e' }}><Trash2 size={16} /></button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
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
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Data do Evento *</label>
              <input required type="date" value={eventFormData.date} onChange={e => setEventFormData({...eventFormData, date: e.target.value})} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Vencimento Padrão do Boleto</label>
              <input type="date" value={eventFormData.due_date} onChange={e => setEventFormData({...eventFormData, due_date: e.target.value})} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Quantidade de Sessões</label>
              <input
                type="number"
                min="0"
                max="100"
                value={eventFormData.sessions_count || 0}
                onChange={e => handleSessionsCountChange(parseInt(e.target.value) || 0)}
                className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
            <div></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Local (Teatro)</label>
              <select
                value={eventFormData.theater_id || ''}
                onChange={e => {
                  const val = e.target.value
                  if (val === '') {
                    setEventFormData({
                      ...eventFormData,
                      theater_id: '',
                      location: ''
                    })
                  } else {
                    const th = theaters.find(t => t.id === val)
                    setEventFormData({
                      ...eventFormData,
                      theater_id: val,
                      location: th ? th.name : ''
                    })
                  }
                }}
                className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none"
                style={inputStyle}
              >
                <option value="" style={{ backgroundColor: 'var(--bg-card)' }}>Outro / Digitar Manualmente</option>
                {theaters.map(t => (
                  <option key={t.id} value={t.id} style={{ backgroundColor: 'var(--bg-card)' }}>
                    {t.name} ({t.rows_count} F x {t.seats_per_row} C)
                  </option>
                ))}
              </select>
            </div>
            {!eventFormData.theater_id ? (
              <div>
                <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Nome do Local *</label>
                <input
                  required
                  value={eventFormData.location}
                  onChange={e => setEventFormData({...eventFormData, location: e.target.value})}
                  className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="Digite o nome do local"
                />
              </div>
            ) : (
              <div>
                <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Local Selecionado</label>
                <input
                  disabled
                  value={eventFormData.location}
                  className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none opacity-60"
                  style={inputStyle}
                />
              </div>
            )}
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
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Taxa de Participação (R$)</label>
              <input type="number" step="0.01" value={eventFormData.base_choreography_price} onChange={e => setEventFormData({...eventFormData, base_choreography_price: parseFloat(e.target.value) || 0})} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Custo Base Roupa (R$)</label>
              <input type="number" step="0.01" value={eventFormData.base_clothes_cost} onChange={e => setEventFormData({...eventFormData, base_clothes_cost: parseFloat(e.target.value) || 0})} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>O Evento possui Kit?</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEventFormData({...eventFormData, has_kit: true})}
                  className="flex-1 rounded-2xl py-3 text-xs font-black uppercase transition-all cursor-pointer"
                  style={{
                    backgroundColor: eventFormData.has_kit ? 'var(--accent-color)' : 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: eventFormData.has_kit ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setEventFormData({...eventFormData, has_kit: false, kit_price: 0})}
                  className="flex-1 rounded-2xl py-3 text-xs font-black uppercase transition-all cursor-pointer"
                  style={{
                    backgroundColor: !eventFormData.has_kit ? 'var(--accent-color)' : 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: !eventFormData.has_kit ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  Não
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Valor do Kit (R$)</label>
              <input 
                type="number" 
                step="0.01" 
                disabled={!eventFormData.has_kit}
                value={eventFormData.kit_price} 
                onChange={e => setEventFormData({...eventFormData, kit_price: parseFloat(e.target.value) || 0})} 
                placeholder="Ex: 50.00"
                className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none disabled:opacity-50" 
                style={inputStyle} 
              />
            </div>
          </div>

          {/* Sessões do Evento */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold block" style={{ color: 'var(--text-secondary)' }}>
                Sessões do Evento
              </label>
              <button
                type="button"
                onClick={() => {
                  const newSession: EventSession = {
                    id: crypto.randomUUID(),
                    name: `Sessão ${eventFormData.sessions.length + 1}`,
                    datetime: ''
                  }
                  setEventFormData({
                    ...eventFormData,
                    sessions: [...eventFormData.sessions, newSession]
                  })
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold text-white transition-all hover:scale-105 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
              >
                <PlusCircle size={14} />
                Adicionar Sessão
              </button>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed -mt-2">
              Adicione sessões ao evento para ter mapas de assentos independentes por sessão. (Opcional)
            </p>

            {eventFormData.sessions.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {eventFormData.sessions.map((session, idx) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-purple-500/30"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'var(--border-color)' }}
                  >
                    <span className="text-[10px] font-black text-purple-400 w-6 text-center shrink-0">{idx + 1}</span>
                    <input
                      type="text"
                      value={session.name}
                      onChange={e => {
                        const updated = eventFormData.sessions.map(s =>
                          s.id === session.id ? { ...s, name: e.target.value } : s
                        )
                        setEventFormData({ ...eventFormData, sessions: updated })
                      }}
                      placeholder="Nome da sessão"
                      className="flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      style={inputStyle}
                    />
                    <input
                      type="datetime-local"
                      value={session.datetime || ''}
                      onChange={e => {
                        const updated = eventFormData.sessions.map(s =>
                          s.id === session.id ? { ...s, datetime: e.target.value } : s
                        )
                        setEventFormData({ ...eventFormData, sessions: updated })
                      }}
                      className="w-44 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = eventFormData.sessions.filter(s => s.id !== session.id)
                        setEventFormData({ ...eventFormData, sessions: updated })
                      }}
                      className="p-1.5 text-rose-400/50 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all cursor-pointer"
                      title="Remover sessão"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Galeria de Fotos do Evento
            </label>
            
            {/* Drag & Drop simulated uploader */}
            <div 
              className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-purple-500/50"
              style={{ 
                borderColor: 'rgba(255,255,255,0.1)', 
                backgroundColor: 'rgba(255,255,255,0.02)' 
              }}
              onClick={() => document.getElementById('photo-uploader')?.click()}
            >
              <span className="text-2xl mb-2">📤</span>
              <span className="text-xs font-bold text-gray-300">Arraste ou Clique para fazer Upload</span>
              <span className="text-[10px] text-gray-500 mt-1">PNG, JPG, JPEG (Múltiplas Fotos permitidas)</span>
              
              <input 
                id="photo-uploader"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {/* Thumbnail Preview Grid */}
            {uploadedPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 max-h-48 overflow-y-auto">
                {uploadedPhotos.map((url, index) => (
                  <div key={index} className="relative group aspect-video rounded-xl overflow-hidden border border-white/10 shadow-lg">
                    <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-1 right-1 h-5 w-5 bg-black/85 hover:bg-rose-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold transition-all shadow-md"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-[10px] text-gray-500">
              Faça upload das imagens do evento. Essas fotos serão exibidas em um carrossel animado no Dashboard!
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <button type="button" onClick={() => setShowEventModal(false)} className="px-6 py-3 rounded-2xl text-sm font-bold text-white/50 hover:text-white transition-all">Cancelar</button>
            <button type="submit" disabled={saving} className="px-8 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}>
              {saving ? 'Salvando...' : (editEvent ? 'Salvar' : 'Criar Evento')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Adicionar Participante */}
      <Modal isOpen={showAddParticipantModal} onClose={() => setShowAddParticipantModal(false)} title="Adicionar Aluno ao Evento">
        <form onSubmit={handleAddParticipantSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Selecionar Aluno *</label>
            <select
              required
              value={participantFormData.student_id}
              onChange={e => setParticipantFormData({...participantFormData, student_id: e.target.value})}
              className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none"
              style={inputStyle}
            >
              <option value="">Selecione um aluno...</option>
              {students
                .filter(s => s.status !== 'locked' && s.status !== 'inactive')
                .filter(s => !participants.filter(p => p.event_id === activeEventId).some(p => p.student_id === s.id))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(s => (
                  <option key={s.id} value={s.id} className="bg-gray-900">{s.name}</option>
                ))
              }
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Método de Pagamento</label>
              <select
                value={participantFormData.payment_method}
                onChange={e => setParticipantFormData({...participantFormData, payment_method: e.target.value})}
                className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none"
                style={inputStyle}
              >
                <option value="" className="bg-gray-900">Selecione...</option>
                <option value="Boleto" className="bg-gray-900">Boleto</option>
                <option value="Cartão" className="bg-gray-900">Cartão</option>
                <option value="Pix" className="bg-gray-900">Pix</option>
                <option value="Isento" className="bg-gray-900">Isento</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Qtd de Coreografias</label>
              <input
                type="number"
                min="0"
                value={participantFormData.choreography_count}
                onChange={e => handleModalChoreoCountChange(parseInt(e.target.value) || 0)}
                className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Taxa de Participação (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={participantFormData.choreography_price}
                onChange={e => setParticipantFormData({...participantFormData, choreography_price: parseFloat(e.target.value) || 0})}
                className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Qtd de Convites</label>
              <input
                type="number"
                min="0"
                value={participantFormData.ticket_quantity}
                onChange={e => setParticipantFormData({...participantFormData, ticket_quantity: parseInt(e.target.value) || 0})}
                className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Qtd de Roupas</label>
              <input
                type="number"
                min="0"
                value={participantFormData.clothes_count}
                onChange={e => setParticipantFormData({...participantFormData, clothes_count: parseInt(e.target.value) || 0})}
                className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Custo Total de Roupa (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={participantFormData.clothes_cost}
                onChange={e => setParticipantFormData({...participantFormData, clothes_cost: parseFloat(e.target.value) || 0})}
                className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {participantFormData.payment_method === 'Boleto' || participantFormData.payment_method === 'Cartão' ? (
              <div>
                <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Qtd de Parcelas *</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="24"
                  value={participantFormData.installments_count}
                  onChange={e => setParticipantFormData({...participantFormData, installments_count: Math.max(1, parseInt(e.target.value) || 1)})}
                  className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none"
                  style={inputStyle}
                />
              </div>
            ) : (
              activeEvent?.has_kit ? (
                <div className="flex flex-col">
                  <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Kit do Evento?</label>
                  <div className="flex gap-2 h-full">
                    <button
                      type="button"
                      onClick={() => setParticipantFormData({...participantFormData, kit: true})}
                      className="flex-1 rounded-2xl text-xs font-black uppercase transition-all cursor-pointer"
                      style={{
                        backgroundColor: participantFormData.kit ? 'var(--accent-color)' : 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        color: participantFormData.kit ? '#fff' : 'var(--text-muted)'
                      }}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setParticipantFormData({...participantFormData, kit: false})}
                      className="flex-1 rounded-2xl text-xs font-black uppercase transition-all cursor-pointer"
                      style={{
                        backgroundColor: !participantFormData.kit ? 'var(--accent-color)' : 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        color: !participantFormData.kit ? '#fff' : 'var(--text-muted)'
                      }}
                    >
                      Não
                    </button>
                  </div>
                </div>
              ) : null
            )}
          </div>

          {(participantFormData.payment_method === 'Boleto' || participantFormData.payment_method === 'Cartão') && activeEvent?.has_kit && (
            <div className="flex flex-col">
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Kit do Evento?</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setParticipantFormData({...participantFormData, kit: true})}
                  className="flex-1 rounded-2xl py-3 text-xs font-black uppercase transition-all cursor-pointer"
                  style={{
                    backgroundColor: participantFormData.kit ? 'var(--accent-color)' : 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: participantFormData.kit ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setParticipantFormData({...participantFormData, kit: false})}
                  className="flex-1 rounded-2xl py-3 text-xs font-black uppercase transition-all cursor-pointer"
                  style={{
                    backgroundColor: !participantFormData.kit ? 'var(--accent-color)' : 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: !participantFormData.kit ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  Não
                </button>
              </div>
            </div>
          )}

          {/* Resumo Financeiro */}
          {(() => {
            const modalChoreoPrice = Number(participantFormData.choreography_price) || 0
            const modalClothesPrice = Number(participantFormData.clothes_cost) || 0
            const modalTicketQty = Number(participantFormData.ticket_quantity) || 0
            const modalKitPrice = (activeEvent?.has_kit && participantFormData.kit) ? (activeEvent.kit_price || 0) : 0
            const modalTicketPrice = activeEvent ? (activeEvent.ticket_price || 0) : 0
            const modalTotalValue = modalChoreoPrice + modalClothesPrice + (modalTicketQty * modalTicketPrice) + modalKitPrice
            
            return (
              <div className="p-4 rounded-2xl border border-white/5 space-y-2 mt-4" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-400">Resumo de Valores</h4>
                <div className="flex justify-between text-xs text-white/70">
                  <span>Taxa de Participação:</span>
                  <span>R$ {modalChoreoPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs text-white/70">
                  <span>Custo de Roupa{Number(participantFormData.clothes_count || 0) > 0 ? ` (${participantFormData.clothes_count}x)` : ''}:</span>
                  <span>R$ {modalClothesPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {modalTicketQty > 0 && (
                  <div className="flex justify-between text-xs text-white/70">
                    <span>Convites ({modalTicketQty}x):</span>
                    <span>R$ {(modalTicketQty * modalTicketPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {activeEvent?.has_kit && participantFormData.kit && (
                  <div className="flex justify-between text-xs text-white/70">
                    <span>Kit do Evento:</span>
                    <span>R$ {modalKitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-white/5 pt-2 text-white">
                  <span>Valor Total Estimado:</span>
                  <span className="text-purple-400">R$ {modalTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {(participantFormData.payment_method === 'Boleto' || participantFormData.payment_method === 'Cartão') && (
                  <div className="text-[10px] text-white/50 text-right mt-1">
                    Parcelado em {participantFormData.installments_count}x de R$ {(modalTotalValue / participantFormData.installments_count).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            )
          })()}

          <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
            <button type="button" onClick={() => setShowAddParticipantModal(false)} className="px-6 py-3 rounded-2xl text-sm font-bold text-white/50 hover:text-white transition-all">Cancelar</button>
            <button type="submit" disabled={saving} className="px-8 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}>
              {saving ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Print-only template */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; background: white !important; color: black !important; }
          .no-print { display: none !important; }
        }
      `}} />
      
      {reportSchoolData && activeEvent && (
        <div id="printable-report" className="hidden print:block font-sans text-black">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-black pb-6 mb-8">
            <div className="flex items-center gap-6">
              {reportSchoolData.logo_url && (
                <img src={reportSchoolData.logo_url} alt="Logo" className="w-24 h-24 object-contain" />
              )}
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter">{reportSchoolData.school_name}</h1>
                <p className="text-sm font-bold">Relatório Financeiro do Evento</p>
                {reportSchoolData.cnpj && <p className="text-[10px] mt-1 text-gray-600">CNPJ: {reportSchoolData.cnpj}</p>}
                {reportSchoolData.address && <p className="text-[10px] text-gray-600">{reportSchoolData.address}</p>}
              </div>
            </div>
            <div className="text-right text-xs">
              <p>Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
              <p>DanceFlow-Escola System</p>
            </div>
          </div>

          {/* Event Details Summary */}
          <div className="grid grid-cols-2 gap-8 mb-8 p-6 bg-gray-50 border border-black/10 rounded-lg">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-gray-500">Dados do Evento</p>
              <p className="text-xl font-black uppercase">{activeEvent.name}</p>
              <p className="text-sm"><b>Data:</b> {new Date(activeEvent.date).toLocaleDateString('pt-BR')}</p>
              {activeEvent.location && <p className="text-sm"><b>Local:</b> {activeEvent.location}</p>}
              {activeEvent.description && <p className="text-sm"><b>Descrição:</b> {activeEvent.description}</p>}
            </div>
            <div className="space-y-1 text-right text-sm">
              <p className="text-xs font-bold uppercase text-gray-500">Resumo Geral</p>
              <p className="text-sm"><b>Total de Participantes:</b> {currentParticipants.length}</p>
              <p className="text-sm"><b>Custo Estimado (Orçamento):</b> R$ {Number(eventCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-sm text-rose-600"><b>Despesas Realizadas:</b> R$ {Number(totalRealExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-sm"><b>Receita Prevista (Total):</b> R$ {Number(expectedRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-sm text-emerald-600"><b>Receita Recebida (Pago):</b> R$ {Number(totalReceived).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-sm text-amber-600"><b>Pendente:</b> R$ {Number(expectedRevenue - totalReceived).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <div className="border-t border-black/10 pt-2 mt-2">
                <p className="text-base font-black">
                  <b>Saldo Líquido (Pago - Despesas):</b> <span className={netResult >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    R$ {Number(netResult).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Breakdown / Receitas Por Categoria */}
          <div className="mb-8">
            <h3 className="text-sm font-black uppercase mb-4 border-b border-black pb-1">Detalhamento das Receitas</h3>
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-gray-50 border border-black/10 rounded">
                <p className="font-bold uppercase text-gray-500">Convites</p>
                <p className="text-sm font-black mt-1">{totalTickets} unidades</p>
                <p className="text-xs text-gray-600 mt-0.5">R$ {Number(activeEvent.ticket_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /un</p>
                <p className="font-black mt-2 text-right">R$ {Number(totalTickets * (activeEvent.ticket_price || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="p-3 bg-gray-50 border border-black/10 rounded">
                <p className="font-bold uppercase text-gray-500">Taxas de Participação</p>
                <p className="text-sm font-black mt-1">{totalChoreographies} un.</p>
                <p className="text-xs text-gray-600 mt-0.5">Base: R$ {Number(activeEvent.base_choreography_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="font-black mt-2 text-right">R$ {Number(totalChoreoRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="p-3 bg-gray-50 border border-black/10 rounded">
                <p className="font-bold uppercase text-gray-500">Roupas</p>
                <p className="text-sm font-black mt-1">{totalClothesCount} unidades</p>
                <p className="text-xs text-gray-600 mt-0.5">({participantsWithClothes} alunos)</p>
                <p className="font-black mt-2 text-right">R$ {Number(totalClothesRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="p-3 bg-gray-50 border border-black/10 rounded">
                <p className="font-bold uppercase text-gray-500">Kits</p>
                {activeEvent.has_kit ? (
                  <>
                    <p className="text-sm font-black mt-1">{totalKits} unidades</p>
                    <p className="text-xs text-gray-600 mt-0.5">R$ {Number(activeEvent.kit_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /un</p>
                    <p className="font-black mt-2 text-right">R$ {Number(totalKitRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </>
                ) : (
                  <p className="text-sm font-bold text-gray-400 mt-1">Sem Kit Cadastrado</p>
                )}
              </div>
            </div>
          </div>

          {/* Detalhamento das Despesas */}
          <div className="mb-8">
            <h3 className="text-sm font-black uppercase mb-4 border-b border-black pb-1">Detalhamento das Despesas</h3>
            {activeEventExpenses.length === 0 ? (
              <p className="text-xs text-gray-500 italic">Nenhuma despesa cadastrada para este evento.</p>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-black text-gray-600 font-bold">
                    <th className="py-2 w-1/4">Data</th>
                    <th className="py-2 w-1/2">Descrição</th>
                    <th className="py-2 text-right w-1/4">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {[...activeEventExpenses].sort((a, b) => a.expense_date.localeCompare(b.expense_date)).map((exp) => (
                    <tr key={exp.id}>
                      <td className="py-2">{new Date(exp.expense_date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="py-2 font-medium">{exp.description}</td>
                      <td className="py-2 text-right text-rose-600">R$ {Number(exp.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t-2 border-black">
                    <td colSpan={2} className="py-2 text-right uppercase">Total Despesas:</td>
                    <td className="py-2 text-right text-rose-600">R$ {Number(totalRealExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Participants Table */}
          <div>
            <h3 className="text-sm font-black uppercase mb-4 border-b border-black pb-1">Planilha de Participantes</h3>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-black text-gray-600">
                  <th className="py-2 font-bold">Aluno</th>
                  <th className="py-2 font-bold text-center">Tipo Pgto</th>
                  <th className="py-2 font-bold text-center">Coreos</th>
                  <th className="py-2 font-bold text-center">Roupas</th>
                  {activeEvent.has_kit && <th className="py-2 font-bold text-center">Kit</th>}
                  <th className="py-2 font-bold text-center">Convites</th>
                  <th className="py-2 font-bold text-right">Valor Total</th>
                  <th className="py-2 font-bold text-right">Valor Pago</th>
                  <th className="py-2 font-bold text-right">Falta Pagar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {currentParticipants.map(p => {
                  const student = students.find(s => s.id === p.student_id)
                  const faltaPagar = (Number(p.total_value) || 0) - (Number(p.amount_paid) || 0)
                  return (
                    <tr key={p.id}>
                      <td className="py-2 font-medium">{student?.name}</td>
                      <td className="py-2 text-center uppercase">{p.payment_method || '-'}</td>
                      <td className="py-2 text-center">
                        {p.choreography_count || 0} {p.choreography_price && p.choreography_price > 0 ? `(R$ ${Number(p.choreography_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : ''}
                      </td>
                      <td className="py-2 text-center">
                        {p.clothes_count || 0} {p.clothes_cost && p.clothes_cost > 0 ? `(R$ ${Number(p.clothes_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : ''}
                      </td>
                      {activeEvent.has_kit && (
                        <td className="py-2 text-center">{p.kit ? 'Sim' : 'Não'}</td>
                      )}
                      <td className="py-2 text-center">{p.ticket_quantity || 0}</td>
                      <td className="py-2 text-right">R$ {Number(p.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 text-right text-emerald-600">R$ {Number(p.amount_paid || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 text-right font-bold">R$ {faltaPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Mapa de Teatro */}
      <Modal isOpen={showMapModal} onClose={() => setShowMapModal(false)} title="Configurar Mapa de Teatro" size="2xl">
        <form onSubmit={handleSaveSeatingMap} className="space-y-6 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LADO ESQUERDO: CONTROLES */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-purple-400 border-b border-white/5 pb-2">Parâmetros do Mapa</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Fileiras (Total) *</label>
                  <input 
                    required 
                    type="number" 
                    min="1" 
                    max="50" 
                    value={rowsCount} 
                    onChange={e => {
                      const val = Math.max(1, Math.min(50, parseInt(e.target.value) || 1))
                      setRowsCount(val)
                    }} 
                    className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" 
                    style={inputStyle} 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Cadeiras por Fileira *</label>
                  <input 
                    required 
                    type="number" 
                    min="1" 
                    max="100" 
                    value={seatsPerRow} 
                    onChange={e => {
                      const val = Math.max(1, Math.min(100, parseInt(e.target.value) || 1))
                      setSeatsPerRow(val)
                    }} 
                    className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" 
                    style={inputStyle} 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Corredores (colunas após as quais haverá um corredor)</label>
                <input 
                  value={corridorsInput} 
                  onChange={e => setCorridorsInput(e.target.value)} 
                  placeholder="Ex: 4, 9 (separadas por vírgula)"
                  className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" 
                  style={inputStyle} 
                />
                <span className="text-[10px] text-gray-500 block mt-1">Coloque os números das colunas separados por vírgula.</span>
              </div>

              <div>
                <label className="text-xs font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Corredores Horizontais (fileiras após as quais haverá corredor)</label>
                <input 
                  value={horizontalCorridorsInput} 
                  onChange={e => setHorizontalCorridorsInput(e.target.value)} 
                  placeholder="Ex: D, H (separadas por vírgula)"
                  className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" 
                  style={inputStyle} 
                />
                <span className="text-[10px] text-gray-500 block mt-1">Coloque as letras das fileiras separadas por vírgula.</span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase text-gray-400">Exceções de Fileira</h4>
                  {Object.keys(exceptions).filter(k => !k.startsWith('_')).length > 0 && (
                    <button 
                      type="button" 
                      onClick={() => {
                        const newExc = { ...exceptions }
                        Object.keys(newExc).forEach(k => {
                          if (!k.startsWith('_')) delete newExc[k]
                        })
                        setExceptions(newExc)
                      }}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-widest cursor-pointer"
                    >
                      Limpar Tudo
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Caso alguma fileira tenha mais ou menos cadeiras que o padrão ({seatsPerRow}), altere seu valor na lista abaixo:
                </p>

                {/* Exceções rolagem */}
                <div className="max-h-56 overflow-y-auto pr-1 space-y-2 border border-white/5 p-3 rounded-2xl bg-black/10 custom-scrollbar">
                  {Array.from({ length: rowsCount }).map((_, idx) => {
                    const rowName = getRowLabel(idx)
                    const val = exceptions[rowName] !== undefined ? exceptions[rowName] : seatsPerRow
                    return (
                      <div key={rowName} className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/20 transition-all">
                        <span className="text-xs font-bold">Fileira {rowName}</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            min="0" 
                            max="120"
                            value={val}
                            onChange={(e) => {
                              const v = Math.max(0, Math.min(120, parseInt(e.target.value) || 0))
                              if (v === seatsPerRow) {
                                const newExc = { ...exceptions }
                                delete newExc[rowName]
                                setExceptions(newExc)
                              } else {
                                setExceptions({
                                  ...exceptions,
                                  [rowName]: v
                                })
                              }
                            }}
                            className="w-16 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-center text-xs text-white"
                          />
                          {exceptions[rowName] !== undefined && (
                            <button 
                              type="button" 
                              onClick={() => {
                                const newExc = { ...exceptions }
                                delete newExc[rowName]
                                setExceptions(newExc)
                              }}
                              className="text-[10px] text-rose-400 hover:text-rose-300 font-bold ml-1 cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* LADO DIREITO: INTERACTIVE VISUALIZER */}
            <div className="space-y-4 flex flex-col h-full">
              <h3 className="text-sm font-black uppercase text-purple-400 border-b border-white/5 pb-2">Visualização Prévia</h3>
              
              {/* Palco glow layout */}
              <div className="flex-1 flex flex-col items-center justify-center p-6 rounded-3xl border border-white/5 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                {/* Stage */}
                <div 
                  className="w-full max-w-xs py-2 mb-8 rounded-b-xl border-b-2 text-center text-[10px] font-black uppercase tracking-widest text-white/70 shadow-lg"
                  style={{ 
                    background: 'linear-gradient(to bottom, rgba(139,92,246,0.1), rgba(139,92,246,0.25))',
                    borderBottomColor: 'var(--accent-color)',
                    boxShadow: '0 5px 15px -5px rgba(139,92,246,0.3)'
                  }}
                >
                  PALCO / TELA
                </div>

                {/* Seating Grid Wrapper */}
                <div className="w-full overflow-auto max-h-80 pr-1 py-1 custom-scrollbar flex flex-col gap-2 items-center">
                  {(() => {
                    let previewSeatCounter = 1;
                    const previewStartNumbers = Array.from({ length: rowsCount }).map((_, rIdx) => {
                      const rowName = getRowLabel(rIdx)
                      const count = exceptions[rowName] !== undefined ? exceptions[rowName] : seatsPerRow
                      const startNum = previewSeatCounter
                      previewSeatCounter += count
                      return startNum
                    })
                    const hCorridors = (exceptions._horizontal_corridors || []) as string[]

                    return Array.from({ length: rowsCount }).map((_, rIdx) => {
                      const rowName = getRowLabel(rIdx)
                      const count = exceptions[rowName] !== undefined ? exceptions[rowName] : seatsPerRow
                      const rowStartNum = previewStartNumbers[rIdx]
                      const hasHorizontalCorridorAfter = hCorridors.includes(rowName)

                      return (
                        <React.Fragment key={rowName}>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Left row label */}
                            <span className="text-[10px] font-black text-gray-500 w-4 text-center shrink-0">{rowName}</span>
                            
                            {/* Seats list */}
                            <div className="flex gap-1 items-center">
                              {count === 0 ? (
                                <span className="text-[9px] text-rose-400 italic font-semibold">Sem cadeiras nesta fileira</span>
                              ) : (
                                Array.from({ length: count }).map((_, sIdx) => {
                                  const seatNum = rowStartNum + sIdx
                                  const seatLabel = `${rowName}${seatNum}`
                                  const isCorridorAfter = corridors.includes(sIdx + 1)
                                  const isThreeDigits = seatNum > 99
                                  const previewSeatFontSize = isThreeDigits
                                    ? Math.max(7, seatSize * 0.35)
                                    : Math.max(8, seatSize * 0.45)
                                  return (
                                    <React.Fragment key={seatLabel}>
                                      <div 
                                        className="rounded-md flex items-center justify-center font-bold border shrink-0 transition-all select-none hover:scale-110 cursor-help"
                                        style={{ 
                                          width: `${seatSize}px`,
                                          height: `${seatSize}px`,
                                          fontSize: `${previewSeatFontSize}px`,
                                          backgroundColor: 'rgba(139, 92, 246, 0.15)',
                                          borderColor: 'rgba(139, 92, 246, 0.3)',
                                          color: '#c084fc'
                                        }}
                                        title={`Poltrona ${seatLabel}`}
                                      >
                                        {seatSize >= 15 ? seatNum : ''}
                                      </div>
                                      {isCorridorAfter && sIdx < count - 1 && (
                                        <div 
                                          className="shrink-0 select-none pointer-events-none" 
                                          style={{ width: `${seatSize * 0.6}px` }} 
                                        />
                                      )}
                                    </React.Fragment>
                                  )
                                })
                              )}
                            </div>

                            {/* Right row label */}
                            <span className="text-[10px] font-black text-gray-500 w-4 text-center shrink-0">{rowName}</span>
                          </div>
                          {hasHorizontalCorridorAfter && rIdx < rowsCount - 1 && (
                            <div 
                              className="shrink-0 select-none pointer-events-none" 
                              style={{ height: '14px' }} 
                            />
                          )}
                        </React.Fragment>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={() => setShowMapModal(false)} className="rounded-2xl px-6 py-3 text-sm font-bold transition-all hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>Cancelar</button>
            <button 
              type="submit" 
              className="rounded-2xl px-8 py-3 text-sm font-bold text-white transition-all hover:scale-105 shadow-lg shadow-purple-500/20" 
              style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
            >
              Salvar Mapa de Teatro
            </button>
          </div>

        </form>
      </Modal>

      {/* Modal Criar/Editar Despesa */}
      <Modal isOpen={showExpenseModal} onClose={() => { setShowExpenseModal(false); setEditExpense(null); }} title={editExpense ? 'Editar Despesa' : 'Nova Despesa'}>
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div>
            <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Descrição *</label>
            <input required value={expenseFormData.description} onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })} placeholder="Ex: Cartolina, Livro para encenação" className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" style={inputStyle} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Valor (R$) *</label>
              <input required type="number" step="0.01" value={expenseFormData.amount} onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })} placeholder="0.00" className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Data *</label>
              <input required type="date" value={expenseFormData.expense_date} onChange={(e) => setExpenseFormData({ ...expenseFormData, expense_date: e.target.value })} className="w-full rounded-2xl px-5 py-3 text-sm focus:outline-none [color-scheme:dark]" style={inputStyle} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={() => { setShowExpenseModal(false); setEditExpense(null); }} className="rounded-2xl px-6 py-3 text-sm font-bold transition-all hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-2xl px-8 py-3 text-sm font-bold text-white transition-all hover:scale-105 shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}>{saving ? 'Salvando...' : (editExpense ? 'Salvar' : 'Cadastrar')}</button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
