import { useEffect, useState } from 'react'
import {
  Users, UserPlus, Search, Filter, CheckCircle, Clock, AlertTriangle,
  Edit, Trash2, CreditCard, X, ChevronDown, Music, FileText, Calendar
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Student, MonthlyPayment, DanceClass } from '../types'
import Modal from '../components/Modal'

type PaymentFilter = 'all' | 'paid' | 'pending' | 'overdue'

export default function Students() {
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<DanceClass[]>([])
  const [payments, setPayments] = useState<MonthlyPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [reportData, setReportData] = useState<{ payments: any[], attendance: any[], school: any } | null>(null)
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', birth_date: '', cpf: '', address: '', guardian_name: '', notes: '',
    monthly_fee: '', enrollment_fee: '', class_id: '',
  })

  useEffect(() => {
    const init = async () => {
      await checkAndGenerateMonthlyPayments()
      await loadData()
    }
    init()
  }, [])

  async function checkAndGenerateMonthlyPayments() {
    const now = new Date()
    const currentMonth = now.toISOString().slice(0, 7) // YYYY-MM
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 10).toISOString().split('T')[0]

    // Get all active students
    const { data: activeStudents } = await supabase.from('students').select('*').eq('status', 'active')
    if (!activeStudents) return

    // Get existing payments for this month
    const { data: existingPayments } = await supabase
      .from('monthly_payments')
      .select('student_id')
      .eq('reference_month', currentMonth)
    
    const studentsWithPayment = new Set(existingPayments?.map(p => p.student_id) || [])

    const newPayments = activeStudents
      .filter(s => !studentsWithPayment.has(s.id))
      .map(s => ({
        student_id: s.id,
        amount: s.monthly_fee || 0,
        due_date: dueDate,
        status: 'pending',
        reference_month: currentMonth,
      }))

    if (newPayments.length > 0) {
      await supabase.from('monthly_payments').insert(newPayments)
    }
  }

  async function loadData() {
    setLoading(true)
    const { data: studentsData } = await supabase.from('students').select('*').order('name')
    const { data: classesData } = await supabase.from('dance_classes').select('*').order('name')
    
    const currentMonth = new Date().toISOString().slice(0, 7)
    
    // Fetch payments: current month (for stats) OR any pending (for modal)
    const { data: paymentsData } = await supabase
      .from('monthly_payments')
      .select('*')
      .or(`reference_month.eq.${currentMonth},status.neq.paid`)
    
    setStudents(studentsData || [])
    setClasses(classesData || [])
    setPayments(paymentsData || [])
    setLoading(false)
  }

  async function generateAnnualReport(student: Student) {
    const year = new Date().getFullYear()
    const { data: school } = await supabase.from('school_settings').select('*').limit(1).single()
    const { data: allPayments } = await supabase
      .from('monthly_payments')
      .select('*')
      .eq('student_id', student.id)
      .gte('reference_month', `${year}-01`)
      .lte('reference_month', `${year}-12`)
      .order('reference_month')
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', student.id)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)

    setReportData({
      payments: allPayments || [],
      attendance: attendance || [],
      school: school || { school_name: 'DanceFlow' }
    })
    setSelectedStudent(student)
    setTimeout(() => {
      window.print()
      setReportData(null)
    }, 500)
  }

  function getStudentPaymentStatus(studentId: string): 'paid' | 'pending' | 'overdue' | 'none' {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const p = payments.find((pay) => pay.student_id === studentId && pay.reference_month === currentMonth)
    return p ? p.status : 'none'
  }

  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false
    if (paymentFilter === 'all') return true
    const status = getStudentPaymentStatus(s.id)
    return status === paymentFilter
  })

  const stats = {
    total: students.filter(s => s.status === 'active').length,
    paid: payments.filter((p) => p.status === 'paid' && p.reference_month === new Date().toISOString().slice(0, 7)).length,
    pending: students.filter((s) => {
      const status = getStudentPaymentStatus(s.id)
      return status === 'pending' || status === 'none'
    }).length,
    overdue: payments.filter((p) => p.status === 'overdue').length,
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...formData,
      birth_date: formData.birth_date || null,
      monthly_fee: parseFloat(formData.monthly_fee) || 0,
      enrollment_fee: parseFloat(formData.enrollment_fee) || 0,
      class_id: formData.class_id || null,
      status: 'active',
    }
    const { error } = await supabase.from('students').insert([payload])
    if (!error) {
      setShowAddModal(false)
      resetForm()
      loadData()
    } else {
      console.error(error)
      alert('Erro ao cadastrar: ' + error.message)
    }
  }

  async function handleEditStudent(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent) return
    const payload = {
      ...formData,
      birth_date: formData.birth_date || null,
      monthly_fee: parseFloat(formData.monthly_fee) || 0,
      enrollment_fee: parseFloat(formData.enrollment_fee) || 0,
      class_id: formData.class_id || null,
    }
    const { error } = await supabase.from('students').update(payload).eq('id', selectedStudent.id)
    if (!error) {
      setShowEditModal(false)
      resetForm()
      loadData()
    } else {
      console.error(error)
      alert('Erro ao editar: ' + error.message)
    }
  }

  async function handleDeleteStudent(id: string) {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return
    await supabase.from('students').delete().eq('id', id)
    loadData()
  }

  async function handlePayment(studentId: string, paymentId: string) {
    const student = students.find(s => s.id === studentId)
    const payment = payments.find(p => p.id === paymentId)
    if (!student || !payment) return

    const today = new Date().toISOString().split('T')[0]
    
    // 1. Update monthly payment status
    const { error: payError } = await supabase.from('monthly_payments').update({
      status: 'paid',
      paid_date: today,
    }).eq('id', paymentId)
    
    if (payError) {
      alert('Erro ao confirmar pagamento: ' + payError.message)
      return
    }

    // 2. Create financial entry
    const { error: finError } = await supabase.from('financial_entries').insert([{
      type: 'income',
      category: 'Mensalidade',
      description: `Mensalidade: ${student.name} - Ref: ${payment.reference_month}`,
      amount: payment.amount,
      date: today
    }])

    if (!finError) {
      alert('Pagamento confirmado e registrado no financeiro! ✅💰')
      loadData()
      setShowPaymentModal(false)
    } else {
      console.error(finError)
      alert('Pagamento confirmado, mas erro ao registrar no financeiro: ' + finError.message)
      loadData()
      setShowPaymentModal(false)
    }
  }

  async function generatePayment(student: Student) {
    const now = new Date()
    const referenceMonth = now.toISOString().slice(0, 7) // YYYY-MM
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 10).toISOString().split('T')[0] // Day 10
    
    const payload = {
      student_id: student.id,
      amount: student.monthly_fee || 0,
      due_date: dueDate,
      status: 'pending',
      reference_month: referenceMonth,
    }

    const { error } = await supabase.from('monthly_payments').insert([payload])
    
    if (!error) {
      alert('Mensalidade gerada com sucesso! 📄')
      loadData()
    } else {
      alert('Erro ao gerar mensalidade: ' + error.message)
    }
  }

  function openEditModal(student: Student) {
    setSelectedStudent(student)
    setFormData({
      name: student.name,
      email: student.email,
      phone: student.phone,
      birth_date: student.birth_date || '',
      cpf: student.cpf || '',
      address: student.address || '',
      guardian_name: student.guardian_name || '',
      notes: student.notes || '',
      monthly_fee: student.monthly_fee?.toString() || '',
      enrollment_fee: student.enrollment_fee?.toString() || '',
      class_id: student.class_id || '',
    })
    setShowEditModal(true)
  }

  function openPaymentModal(student: Student) {
    setSelectedStudent(student)
    setShowPaymentModal(true)
  }

  function resetForm() {
    setFormData({ name: '', email: '', phone: '', birth_date: '', cpf: '', address: '', guardian_name: '', notes: '', monthly_fee: '', enrollment_fee: '', class_id: '' })
    setSelectedStudent(null)
  }

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    paid: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', label: 'Pago' },
    pending: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', label: 'Pendente' },
    overdue: { bg: 'rgba(244, 63, 94, 0.15)', text: '#f43f5e', label: 'Atrasado' },
    none: { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280', label: 'Sem registro' },
  }

  const statCards = [
    { label: 'Total de Alunos', value: stats.total, icon: Users, color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
    { label: 'Pagos este Mês', value: stats.paid, icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Pendentes', value: stats.pending, icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Atrasados', value: stats.overdue, icon: AlertTriangle, color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' },
  ]

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  }

  const renderStudentForm = (onSubmit: (e: React.FormEvent) => void, submitLabel: string) => (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="col-span-full">
            <label className="text-sm font-bold block mb-1.5 text-purple-400 uppercase tracking-widest">Turma Vinculada</label>
            <div className="relative">
              <select
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                className="w-full rounded-none px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                style={inputStyle}
              >
                <option value="">-- Selecione uma turma --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.schedule})</option>
                ))}
              </select>
              <Music className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 opacity-50" size={18} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome do Aluno *</label>
            <input
              required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome do Responsável *</label>
            <input
              required value={formData.guardian_name} onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
              className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
            <input
              type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Telefone</label>
            <input
              value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Data de Nascimento</label>
            <input
              type="date" value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>CPF</label>
            <input
              value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={inputStyle}
            />
          </div>
          <div className="col-span-full">
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Endereço</label>
            <input
              value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={inputStyle}
            />
          </div>
          <div className="p-4 rounded-none bg-purple-500/5 border border-purple-500/10 col-span-full grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1.5 text-purple-400">Valor da Mensalidade (R$)</label>
              <input
                type="number" step="0.01" value={formData.monthly_fee} onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                placeholder="Ex: 150.00"
                className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1.5 text-purple-400">Valor da Matrícula (R$)</label>
              <input
                type="number" step="0.01" min="0" max="2000" value={formData.enrollment_fee} onChange={(e) => setFormData({ ...formData, enrollment_fee: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={inputStyle}
              />
            </div>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Observações</label>
          <textarea
            value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full rounded-none px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            style={inputStyle}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm() }}
            className="rounded-none px-5 py-2.5 text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-none px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
          >
            {submitLabel}
          </button>
        </div>
      </form>
    )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-none border-2 border-transparent" style={{ borderTopColor: 'var(--accent-color)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-12 pb-10">
      {/* Print-only template */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; background: white !important; color: black !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      
      {reportData && selectedStudent && (
        <div id="printable-report" className="hidden print:block font-sans text-black">
          <div className="flex items-center justify-between border-b-2 border-black pb-6 mb-8">
            <div className="flex items-center gap-6">
              {reportData.school.logo_url && (
                <img src={reportData.school.logo_url} alt="Logo" className="w-24 h-24 object-contain" />
              )}
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter">{reportData.school.school_name}</h1>
                <p className="text-sm font-bold">Relatório Anual de Desempenho e Pagamentos - {new Date().getFullYear()}</p>
              </div>
            </div>
            <div className="text-right text-xs">
              <p>Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
              <p>DanceFlow System</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-10 p-6 bg-gray-50 border border-black/10">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-gray-500">Dados do Aluno</p>
              <p className="text-lg font-black uppercase">{selectedStudent.name}</p>
              <p className="text-sm"><b>CPF:</b> {selectedStudent.cpf || 'Não informado'}</p>
              <p className="text-sm"><b>Turma:</b> {classes.find(c => c.id === selectedStudent.class_id)?.name || 'Sem turma'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-gray-500">Dados do Responsável</p>
              <p className="text-lg font-black uppercase">{selectedStudent.guardian_name}</p>
              <p className="text-sm"><b>Telefone:</b> {selectedStudent.phone}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10">
            <div>
              <h3 className="text-sm font-black uppercase mb-4 border-b border-black pb-1">Histórico de Mensalidades</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/20">
                    <th className="text-left py-2">Mês</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-right py-2">Valor Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.payments.map((p: any) => (
                    <tr key={p.id} className="border-b border-black/5">
                      <td className="py-2 capitalize">{new Date(p.reference_month + '-01').toLocaleDateString('pt-BR', { month: 'long' })}</td>
                      <td className="py-2">{p.status === 'paid' ? '✅ PAGO' : '❌ PENDENTE'}</td>
                      <td className="py-2 text-right">R$ {p.amount_paid?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase mb-4 border-b border-black pb-1">Resumo de Frequência</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 border border-black/10 text-center">
                  <p className="text-2xl font-black">{reportData.attendance.filter((a: any) => a.status === 'present').length}</p>
                  <p className="text-[10px] font-bold uppercase">Presenças</p>
                </div>
                <div className="p-3 border border-black/10 text-center">
                  <p className="text-2xl font-black">{reportData.attendance.filter((a: any) => a.status === 'absent').length}</p>
                  <p className="text-[10px] font-bold uppercase text-red-600">Faltas</p>
                </div>
                <div className="p-3 border border-black/10 text-center">
                  <p className="text-2xl font-black">{reportData.attendance.filter((a: any) => a.status === 'late').length}</p>
                  <p className="text-[10px] font-bold uppercase text-amber-600">Atrasos</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 italic">Total de aulas registradas no ano: {reportData.attendance.length}</p>
            </div>
          </div>

          <div className="mt-24 pt-12 flex flex-col items-center">
            <div className="w-64 border-t-2 border-black mb-2"></div>
            <p className="text-sm font-black uppercase">{reportData.school.school_name}</p>
            <p className="text-xs">Assinatura da Direção</p>
            <p className="mt-8 text-[10px] text-gray-400">Este documento é uma declaração oficial de frequência e quitação financeira gerada pelo sistema DanceFlow.</p>
          </div>
        </div>
      )}
      {/* Header Section with Dynamic Style */}
      <div 
        className="p-8 sm:p-10 pb-16 rounded-none border border-white/5 shadow-2xl mb-20 relative overflow-hidden"
        style={{ 
          backgroundColor: 'rgba(255,255,255,0.03)', 
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Accent Glow */}
        <div 
          className="absolute -left-20 -top-20 w-64 h-64 rounded-none blur-[100px] opacity-20"
          style={{ backgroundColor: 'var(--accent-color)' }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8 relative z-10">
          <div className="space-y-4">
            <h1 
              className="font-black tracking-tighter leading-tight inline-block pl-20 pr-8 py-3 shadow-lg shadow-purple-500/20" 
              style={{ 
                backgroundColor: 'var(--accent-color)', 
                color: '#fff',
                fontSize: 'var(--title-size, 32px)',
                borderRadius: '0px'
              }}
            >
              Alunos
            </h1>
            <br />
            <p 
              className="font-medium inline-block pl-16 pr-5 py-2 border border-white/5" 
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: 'var(--text-secondary)', 
                fontSize: 'var(--subtitle-size, 16px)',
                borderRadius: '0px'
              }}
            >
              Gerencie seus alunos, mensalidades e taxas de matrícula
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowAddModal(true) }}
            className="flex items-center gap-2 rounded-none px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/20"
            style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
          >
            <UserPlus size={22} />
            Novo Aluno
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-none p-4 transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex flex-col items-center justify-center h-28 text-center gap-2">
              <div className="rounded-lg p-2" style={{ backgroundColor: card.bg }}>
                <card.icon size={22} style={{ color: card.color }} />
              </div>
              <div className="w-full">
                <p className="text-2xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
                <p className="mt-1 text-[10px] sm:text-[11px] font-medium uppercase tracking-wider truncate" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
              </div>
            </div>
            <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: card.color }} />
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Buscar aluno por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            style={inputStyle}
          />
        </div>
        <div className="relative">
          <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
            className="appearance-none rounded-xl py-2.5 pl-11 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            style={inputStyle}
          >
            <option value="all">Todos</option>
            <option value="paid">Pagos</option>
            <option value="pending">Pendentes</option>
            <option value="overdue">Atrasados</option>
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Student List */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Aluno</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>Telefone</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Mensalidade</th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    Nenhum aluno encontrado
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const payStatus = getStudentPaymentStatus(student.id)
                  const statusInfo = statusColors[payStatus]
                  return (
                    <tr
                      key={student.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-none text-sm font-bold text-white shadow-lg"
                            style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
                          >
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>{student.name}</p>
                            <p className="text-[10px] opacity-50" style={{ color: 'var(--text-muted)' }}>{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {student.phone || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                            R$ {Number(student.monthly_fee || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span
                            className="inline-flex items-center rounded-none px-3 py-1 text-[9px] font-black uppercase tracking-widest"
                            style={{ backgroundColor: statusInfo.bg, color: statusInfo.text, border: `1px solid ${statusInfo.text}33` }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openPaymentModal(student)}
                            className="rounded-none p-2 transition-all hover:bg-emerald-500/10 active:scale-90"
                            style={{ color: '#10b981' }}
                            title="Dar baixa na mensalidade"
                          >
                            <CreditCard size={18} />
                          </button>
                          <button
                            onClick={() => generateAnnualReport(student)}
                            className="rounded-none p-2 transition-all hover:bg-purple-500/10 active:scale-90"
                            style={{ color: 'var(--accent-color)' }}
                            title="Gerar Relatório Anual Oficial"
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            onClick={() => openEditModal(student)}
                            className="rounded-none p-2 transition-all hover:bg-blue-500/10 active:scale-90"
                            style={{ color: '#3b82f6' }}
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            className="rounded-none p-2 transition-all hover:bg-red-500/10 active:scale-90"
                            style={{ color: '#f43f5e' }}
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); resetForm() }} title="Novo Aluno" size="lg">
        {renderStudentForm(handleAddStudent, "Cadastrar Aluno")}
      </Modal>

      {/* Edit Student Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); resetForm() }} title="Editar Aluno" size="lg">
        {renderStudentForm(handleEditStudent, "Salvar Alterações")}
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Dar Baixa na Mensalidade">
        {selectedStudent && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Selecione a mensalidade para confirmar o pagamento de <strong style={{ color: 'var(--text-primary)' }}>{selectedStudent.name}</strong>:
            </p>
            {(() => {
              const studentPayments = payments.filter((p) => p.student_id === selectedStudent.id && p.status !== 'paid')
              if (studentPayments.length === 0) {
                return (
                  <div className="space-y-6">
                    <div className="rounded-none p-6 text-center border-2 border-dashed border-white/5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <p className="text-sm italic mb-4" style={{ color: 'var(--text-muted)' }}>
                        Nenhuma mensalidade pendente encontrada para este aluno.
                      </p>
                      <button
                        onClick={() => generatePayment(selectedStudent)}
                        className="flex items-center gap-2 mx-auto rounded-none px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20"
                        style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
                      >
                        <Calendar size={18} />
                        Gerar Mensalidade de {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </button>
                    </div>
                  </div>
                )
              }
              return (
                <div className="space-y-3">
                  {studentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-none p-4 shadow-lg"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-purple-400">
                          Referência: {payment.reference_month}
                        </p>
                        <p className="text-[10px] opacity-60" style={{ color: 'var(--text-muted)' }}>
                          Vencimento: {new Date(payment.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-lg font-black mt-1" style={{ color: '#10b981' }}>
                          R$ {Number(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <button
                        onClick={() => handlePayment(selectedStudent.id, payment.id)}
                        className="flex items-center gap-2 rounded-none px-6 py-3 text-xs font-black uppercase tracking-tighter text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
                        style={{ background: 'linear-gradient(135deg, #10b981, #000)' }}
                      >
                        <CheckCircle size={16} />
                        Confirmar
                      </button>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t border-white/5">
                    <button
                      onClick={() => generatePayment(selectedStudent)}
                      className="w-full rounded-none py-3 text-[10px] font-bold uppercase tracking-widest text-purple-400 hover:bg-purple-500/5 transition-all border border-dashed border-purple-500/20"
                    >
                      + Gerar cobrança de outro mês
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </Modal>
    </div>
  )
}
