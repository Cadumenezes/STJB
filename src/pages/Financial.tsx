import { useEffect, useState } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Trash2, Edit,
  Wallet, ArrowUpCircle, ArrowDownCircle, Pin, CheckCircle2, Circle, Users
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { FinancialEntry } from '../types'
import Modal from '../components/Modal'

interface FixedBill {
  id: string
  description: string
  amount: number
  category: string
  due_day: number
  active: boolean
}

export default function Financial() {
  const [activeTab, setActiveTab] = useState<'flow' | 'fixed' | 'payroll'>('flow')
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [fixedBills, setFixedBills] = useState<FixedBill[]>([])
  const [payrollData, setPayrollData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showFixedModal, setShowFixedModal] = useState(false)
  const [editEntry, setEditEntry] = useState<FinancialEntry | null>(null)
  const [editFixed, setEditFixed] = useState<FixedBill | null>(null)
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  })

  const [fixedFormData, setFixedFormData] = useState({
    description: '',
    amount: '',
    category: '',
    due_day: '1',
  })

  useEffect(() => {
    loadData()
  }, [activeTab])

  async function loadData() {
    setLoading(true)
    try {
      if (activeTab === 'payroll') {
        const { data: members } = await supabase.from('team_members').select('*').eq('role', 'instructor').eq('status', 'active')
        const { data: att } = await supabase.from('attendance').select('*').eq('type', 'instructor').eq('status', 'present')
        
        const currentMonth = new Date().toISOString().slice(0, 7)
        const monthAtt = (att || []).filter(a => a.date.startsWith(currentMonth))

        const calculated = (members || []).map(m => {
          const teacherAtt = monthAtt.filter(a => a.instructor_id === m.id)
          const classesCount = teacherAtt.length
          const uniqueDays = new Set(teacherAtt.map(a => a.date)).size
          
          const hourlyTotal = classesCount * (m.hourly_rate || 0)
          const transportTotal = uniqueDays * (m.daily_transport || 0)
          
          return {
            ...m,
            classesCount,
            uniqueDays,
            hourlyTotal,
            transportTotal,
            totalToPay: hourlyTotal + transportTotal + (m.salary || 0)
          }
        })
        setPayrollData(calculated)
      } else {
        const { data: entriesData } = await supabase.from('financial_entries').select('*').order('date', { ascending: false })
        setEntries(entriesData || [])

        const { data: fixedData } = await supabase.from('fixed_bills').select('*').order('due_day')
        setFixedBills(fixedData || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const todayEntries = entries.filter((e) => e.date === today)
  const todayIncome = todayEntries.filter((e) => e.type === 'income').reduce((sum, e) => sum + Number(e.amount), 0)
  const todayExpense = todayEntries.filter((e) => e.type === 'expense').reduce((sum, e) => sum + Number(e.amount), 0)

  const currentMonthStr = new Date().toISOString().slice(0, 7)
  const monthEntries = entries.filter((e) => e.date.startsWith(currentMonthStr))
  const monthIncome = monthEntries.filter((e) => e.type === 'income').reduce((sum, e) => sum + Number(e.amount), 0)
  const monthExpense = monthEntries.filter((e) => e.type === 'expense').reduce((sum, e) => sum + Number(e.amount), 0)
  const currentBalance = entries.reduce((sum, e) => e.type === 'income' ? sum + Number(e.amount) : sum - Number(e.amount), 0)

  const payrollTotal = payrollData.reduce((sum, p) => sum + p.totalToPay, 0)

  const filteredEntries = entries.filter((e) => filter === 'all' || e.type === filter)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...formData, amount: parseFloat(formData.amount) }
    const { error } = editEntry 
      ? await supabase.from('financial_entries').update(payload).eq('id', editEntry.id)
      : await supabase.from('financial_entries').insert([payload])

    if (error) {
      alert('Erro ao salvar lançamento: ' + error.message)
    } else {
      setShowModal(false)
      setEditEntry(null)
      resetForm()
      loadData()
    }
  }

  async function handleFixedSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { 
      ...fixedFormData, 
      amount: parseFloat(fixedFormData.amount), 
      due_day: parseInt(fixedFormData.due_day) 
    }
    
    const { error } = editFixed
      ? await supabase.from('fixed_bills').update(payload).eq('id', editFixed.id)
      : await supabase.from('fixed_bills').insert([payload])

    if (error) {
      alert('Erro ao salvar conta fixa: ' + error.message)
    } else {
      setShowFixedModal(false)
      setEditFixed(null)
      setFixedFormData({ description: '', amount: '', category: '', due_day: '1' })
      loadData()
    }
  }

  async function toggleFixedPaid(bill: FixedBill, isPaid: boolean) {
    if (isPaid) {
      const entryToDelete = entries.find(e => e.fixed_bill_id === bill.id && e.date.startsWith(currentMonthStr))
      if (entryToDelete) {
        await supabase.from('financial_entries').delete().eq('id', entryToDelete.id)
      }
    } else {
      const payload = {
        type: 'expense',
        category: bill.category,
        description: `[FIXA] ${bill.description}`,
        amount: bill.amount,
        date: new Date().toISOString().split('T')[0],
        is_fixed: true,
        fixed_bill_id: bill.id
      }
      await supabase.from('financial_entries').insert([payload])
    }
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta entrada?')) return
    const { error } = await supabase.from('financial_entries').delete().eq('id', id)
    if (error) alert('Erro ao excluir')
    loadData()
  }

  async function handleDeleteFixed(id: string) {
    if (!confirm('Excluir esta conta fixa?')) return
    const { error } = await supabase.from('fixed_bills').delete().eq('id', id)
    if (error) alert('Erro ao excluir')
    loadData()
  }

  function openEdit(entry: FinancialEntry) {
    setEditEntry(entry)
    setFormData({
      type: entry.type,
      category: entry.category,
      description: entry.description,
      amount: entry.amount.toString(),
      date: entry.date,
    })
    setShowModal(true)
  }

  function resetForm() {
    setFormData({ type: 'income', category: '', description: '', amount: '', date: new Date().toISOString().split('T')[0] })
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  }

  const summaryCards = [
    {
      label: 'Saldo Geral',
      value: currentBalance,
      icon: Wallet,
      color: currentBalance >= 0 ? '#10b981' : '#f43f5e',
      bg: currentBalance >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
      gradient: currentBalance >= 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f43f5e, #be123c)',
    },
    {
      label: 'Ganhos Hoje',
      value: todayIncome,
      icon: TrendingUp,
      color: '#34d399',
      bg: 'rgba(52,211,153,0.1)',
      gradient: 'linear-gradient(135deg, #34d399, #059669)',
    },
    {
      label: 'Gastos Hoje',
      value: todayExpense,
      icon: TrendingDown,
      color: '#fb7185',
      bg: 'rgba(251,113,133,0.1)',
      gradient: 'linear-gradient(135deg, #fb7185, #be123c)',
    },
    {
      label: 'Previsão Pagamentos',
      value: payrollTotal,
      icon: Users,
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.1)',
      gradient: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    },
    {
      label: 'Entradas (Mês)',
      value: monthIncome,
      icon: ArrowUpCircle,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.15)',
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
    },
  ]

  if (loading && entries.length === 0 && payrollData.length === 0) {
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
        style={{ 
          backgroundColor: 'rgba(255,255,255,0.03)', 
          backdropFilter: 'blur(20px)',
        }}
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
              Financeiro
            </h1>
            <br />
            <p 
              className="font-bold inline-block px-10 py-4 rounded-2xl border border-white/10 shadow-2xl" 
               style={{ background: 'var(--accent-gradient, linear-gradient(135deg, #8b5cf6, #ec4899))', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', opacity: 0.95 }}
            >
              Controle de caixa, contas fixas e pagamentos de equipe
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { resetForm(); setEditEntry(null); setShowModal(true) }}
              className="flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/20"
              style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
            >
              <Plus size={26} />
              Novo Lançamento
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-4 p-1 bg-black/20 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('flow')}
          className={`px-6 py-2.5 text-sm font-bold transition-all rounded-2xl shadow-lg ${activeTab === 'flow' ? 'text-white' : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'}`}
          style={{ 
            background: activeTab === 'flow' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'transparent'
          }}
        >
          Fluxo de Caixa
        </button>
        <button
          onClick={() => setActiveTab('fixed')}
          className={`px-6 py-2.5 text-sm font-bold transition-all rounded-xl shadow-lg ${activeTab === 'fixed' ? 'text-white' : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'}`}
          style={{ 
            background: activeTab === 'fixed' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'transparent'
          }}
        >
          Contas Fixas
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-6 py-2.5 text-sm font-bold transition-all rounded-xl shadow-lg ${activeTab === 'payroll' ? 'text-white' : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'}`}
          style={{ 
            background: activeTab === 'payroll' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'transparent'
          }}
        >
          Pagamentos Equipe
        </button>
      </div>

      {activeTab === 'flow' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="group relative overflow-hidden rounded-3xl p-8 sm:p-10 transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                <div className="flex flex-col items-center justify-center h-28 text-center gap-2 relative z-10">
                  <div className="rounded-xl p-3" style={{ backgroundColor: card.bg }}>
                    <card.icon size={26} style={{ color: card.color }} />
                  </div>
                  <div className="w-full">
                    <p className="text-xl font-bold leading-none truncate" style={{ color: card.color }}>
                      R$ {card.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-wider text-wrap" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
                  </div>
                </div>
                <div className="absolute left-0 top-0 h-full w-1" style={{ background: card.gradient }} />
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            {(['all', 'income', 'expense'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="rounded-xl px-4 py-2 text-sm font-medium transition-all"
                style={{
                  backgroundColor: filter === f ? 'var(--accent-color)' : 'var(--bg-card)',
                  color: filter === f ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${filter === f ? 'transparent' : 'var(--border-color)'}`,
                }}
              >
                {f === 'all' ? 'Todos' : f === 'income' ? 'Entradas' : 'Saídas'}
              </button>
            ))}
          </div>

          {/* Entries List */}
          <div className="rounded-2xl overflow-hidden shadow-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }} className="bg-black/20">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Descrição</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>Categoria</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>Data</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Valor</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                        Nenhuma entrada encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="transition-colors hover:bg-white/5"
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="rounded-xl p-3"
                              style={{
                                backgroundColor: entry.type === 'income' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                              }}
                            >
                              {entry.type === 'income' ? (
                                <TrendingUp size={18} style={{ color: '#10b981' }} />
                              ) : (
                                <TrendingDown size={18} style={{ color: '#f43f5e' }} />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                {entry.description}
                                {entry.is_fixed && (
                                  <Pin size={12} className="inline ml-2 text-purple-400" />
                                )}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                          {entry.category || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>
                          {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-sm font-bold ${entry.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {entry.type === 'income' ? '+' : '-'} R$ {Number(entry.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEdit(entry)} className="rounded-lg p-2 text-blue-400 hover:bg-blue-400/10 transition-colors">
                              <Edit size={18} />
                            </button>
                            <button onClick={() => handleDelete(entry.id)} className="rounded-lg p-2 text-rose-400 hover:bg-rose-400/10 transition-colors">
                              <Trash2 size={18} />
                            </button>
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
      )}

      {activeTab === 'fixed' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Minhas Contas Fixas</h2>
            <button
              onClick={() => { setEditFixed(null); setFixedFormData({ description: '', amount: '', category: '', due_day: '1' }); setShowFixedModal(true) }}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all"
            >
              <Plus size={18} />
              Configurar Conta Fixa
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fixedBills.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-black/20 rounded-2xl border border-dashed border-white/10">
                <p className="text-[var(--text-muted)]">Nenhuma conta fixa configurada.</p>
              </div>
            ) : (
              fixedBills.map(bill => {
                const isPaid = entries.some(e => e.fixed_bill_id === bill.id && e.date.startsWith(currentMonthStr))
                return (
                  <div 
                    key={bill.id} 
                    className="p-5 rounded-2xl border transition-all" 
                    style={{ 
                      backgroundColor: 'var(--bg-card)', 
                      borderColor: isPaid ? 'rgba(16,185,129,0.3)' : 'var(--border-color)',
                      opacity: bill.active ? 1 : 0.6
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleFixedPaid(bill, isPaid)}
                          className={`transition-all ${isPaid ? 'text-emerald-400' : 'text-[var(--text-muted)] hover:text-white'}`}
                        >
                          {isPaid ? <CheckCircle2 size={32} /> : <Circle size={32} />}
                        </button>
                        <div>
                          <h3 className="font-bold text-lg text-white leading-tight">{bill.description}</h3>
                          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Vence todo dia {bill.due_day}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-black ${isPaid ? 'text-emerald-400' : 'text-white'}`}>
                          R$ {Number(bill.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {isPaid ? 'PAGO' : 'PENDENTE'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
                      <button 
                        onClick={() => {
                          setEditFixed(bill)
                          setFixedFormData({
                            description: bill.description,
                            amount: bill.amount.toString(),
                            category: bill.category || '',
                            due_day: bill.due_day.toString()
                          })
                          setShowFixedModal(true)
                        }}
                        className="p-2 text-[var(--text-muted)] hover:text-blue-400 transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteFixed(bill.id)}
                        className="p-2 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Resumo de Pagamentos - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {payrollData.length === 0 ? (
              <div className="py-20 text-center bg-black/20 rounded-3xl border border-dashed border-white/10">
                <p className="text-[var(--text-muted)]">Nenhum professor com aulas registradas este mês.</p>
              </div>
            ) : (
              payrollData.map(teacher => (
                <div 
                  key={teacher.id} 
                  className="p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.01]"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                >
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Users size={80} />
                  </div>
                  
                  <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start relative z-10">
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-white mb-1">{teacher.name}</h3>
                      <p className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-6">{teacher.specialty || 'Professor'}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Aulas Dadas</p>
                          <p className="text-xl font-black text-white">{teacher.classesCount}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Dias Trabalhados</p>
                          <p className="text-xl font-black text-white">{teacher.uniqueDays}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Total Hora Aula</p>
                          <p className="text-xl font-black text-emerald-400">R$ {teacher.hourlyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Total Passagem</p>
                          <p className="text-xl font-black text-blue-400">R$ {teacher.transportTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full lg:w-72 p-8 sm:p-10 rounded-3xl bg-black/40 border border-white/10 flex flex-col justify-center items-center text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Total Acumulado</p>
                      <p className="text-3xl font-black text-white mb-4">R$ {teacher.totalToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <button 
                        onClick={async () => {
                          const payload = {
                            type: 'expense',
                            category: 'Salários',
                            description: `Pagamento Professor: ${teacher.name}`,
                            amount: teacher.totalToPay,
                            date: new Date().toISOString().split('T')[0],
                          }
                          const { error } = await supabase.from('financial_entries').insert([payload])
                          if (error) alert('Erro ao registrar pagamento')
                          else {
                            alert('Pagamento registrado no fluxo de caixa!')
                            setActiveTab('flow')
                          }
                        }}
                        className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                      >
                        Registrar Pagamento
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modais omitidos para brevidade, mas mantidos no arquivo real */}

      {/* Modal Lançamento Comum */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditEntry(null); resetForm() }} title={editEntry ? 'Editar Entrada' : 'Nova Entrada'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tipo</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'income' })}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
                style={{
                  backgroundColor: formData.type === 'income' ? 'rgba(16,185,129,0.2)' : 'var(--bg-secondary)',
                  color: formData.type === 'income' ? '#10b981' : 'var(--text-secondary)',
                  border: `1px solid ${formData.type === 'income' ? '#10b981' : 'var(--border-color)'}`,
                }}
              >
                ↗ Entrada
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'expense' })}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
                style={{
                  backgroundColor: formData.type === 'expense' ? 'rgba(244,63,94,0.2)' : 'var(--bg-secondary)',
                  color: formData.type === 'expense' ? '#f43f5e' : 'var(--text-secondary)',
                  border: `1px solid ${formData.type === 'expense' ? '#f43f5e' : 'var(--border-color)'}`,
                }}
              >
                ↘ Despesa
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-full">
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Descrição *</label>
              <input
                required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Categoria</label>
              <input
                value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Aluguel, Material..."
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Valor (R$) *</label>
              <input
                required type="number" step="0.01" min="0" value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Data *</label>
              <input
                required type="date" value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowModal(false); setEditEntry(null); resetForm() }}
              className="rounded-xl px-5 py-2.5 text-sm font-medium"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
            >
              {editEntry ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Conta Fixa */}
      <Modal isOpen={showFixedModal} onClose={() => setShowFixedModal(false)} title={editFixed ? 'Editar Conta Fixa' : 'Nova Conta Fixa'}>
        <form onSubmit={handleFixedSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-full">
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Descrição da Conta *</label>
              <input
                required value={fixedFormData.description} onChange={(e) => setFixedFormData({ ...fixedFormData, description: e.target.value })}
                placeholder="Ex: Aluguel da Sala"
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Valor Mensal *</label>
              <input
                required type="number" step="0.01" value={fixedFormData.amount} onChange={(e) => setFixedFormData({ ...fixedFormData, amount: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Dia do Vencimento *</label>
              <input
                required type="number" min="1" max="31" value={fixedFormData.due_day} onChange={(e) => setFixedFormData({ ...fixedFormData, due_day: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={inputStyle}
              />
            </div>
            <div className="col-span-full">
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Categoria</label>
              <input
                value={fixedFormData.category} onChange={(e) => setFixedFormData({ ...fixedFormData, category: e.target.value })}
                placeholder="Ex: Operacional, Impostos..."
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowFixedModal(false)}
              className="rounded-xl px-5 py-2.5 text-sm font-medium"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
            >
              {editFixed ? 'Salvar Alterações' : 'Salvar Conta Fixa'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
