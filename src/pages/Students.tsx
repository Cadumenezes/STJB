import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const DEFAULT_TAX_TEMPLATE = `DECLARAÇÃO DE RENDIMENTOS DE INSTRUÇÃO (IRPF)

Declaramos para os devidos fins de comprovação de despesas com instrução, de acordo com as diretrizes da Receita Federal, que a instituição de ensino {escola}, inscrita no CNPJ sob o nº {cnpj}, sediada em {endereco}, recebeu do(a) responsável financeiro(a) {responsavel} (CPF: {cpf_responsavel}), referente ao(à) aluno(a) beneficiário(a) {aluno} (CPF: {cpf_aluno}), os valores abaixo discriminados correspondentes às atividades escolares quitadas durante o ano-calendário de {ano}:

{mensalidades}

Esta declaração é emitida eletronicamente pelo sistema oficial da escola e refere-se exclusivamente aos pagamentos efetivamente quitados.

{data}

{diretor}
Direção Geral`;

const DEFAULT_ACTIVITY_TEMPLATE = `DECLARAÇÃO DE MATRÍCULA E FREQUÊNCIA

Declaramos para os devidos fins que o(a) aluno(a) {aluno} (CPF: {cpf_aluno}), representado(a) por seu responsável legal {responsavel} (CPF: {cpf_responsavel}), encontra-se regularmente matriculado(a) e frequentando ativamente as aulas e atividades de dança na escola {escola}.

O(a) referido discente realiza suas atividades nas seguintes turmas:

{turmas}

Pelo presente documento, confirmamos a regularidade da matrícula e a frequência habitual do(a) estudante.

{endereco}, {data}.

{diretor}
Direção Geral`;
import {
  Users, UserPlus, Search, Filter, CheckCircle, Clock, AlertTriangle,
  Edit, Trash2, CreditCard, X, ChevronDown, Music, FileText, Calendar, MessageCircle, Printer, Lock, GraduationCap
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Student, MonthlyPayment, DanceClass, Attendance } from '../types'
import Modal from '../components/Modal'

type PaymentFilter = 'all' | 'paid' | 'pending' | 'overdue' | 'scholarship' | 'partial_scholarship' | 'locked'

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
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profilePayments, setProfilePayments] = useState<MonthlyPayment[]>([])
  const [profileAttendance, setProfileAttendance] = useState<Attendance[]>([])
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [reportData, setReportData] = useState<{ payments: any[], attendance: any[], school: any } | null>(null)
  const [receiptData, setReceiptData] = useState<{ payment: any, school: any } | null>(null)
  const [taxReportData, setTaxReportData] = useState<{ payments: any[], school: any } | null>(null)
  const [enrollmentReportData, setEnrollmentReportData] = useState<{ school: any } | null>(null)
  const [discountDueDay, setDiscountDueDay] = useState(10)
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', birth_date: '', cpf: '', address: '', guardian_name: '', guardian_phone: '', notes: '',
    monthly_fee: '', discount_monthly_fee: '', enrollment_fee: '', class_ids: [] as string[], status: 'active' as Student['status'],
    photo_url: '',
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
    const { data: activeStudents } = await supabase.from('students').select('*').in('status', ['active', 'scholarship', 'partial_scholarship'])
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
        user_id: s.user_id,
        student_id: s.id,
        amount: s.status === 'scholarship' ? 0 : (s.monthly_fee || 0),
        due_date: dueDate,
        status: s.status === 'scholarship' ? 'paid' : (s.status === 'partial_scholarship' ? 'pending' : 'pending'),
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
    
    const { data: schoolData } = await supabase.from('school_settings').select('discount_due_day').limit(1).single()
    if (schoolData && schoolData.discount_due_day !== undefined) {
      setDiscountDueDay(schoolData.discount_due_day)
    }
    
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


  async function generateReceipt(student: Student, payment: MonthlyPayment) {
    const { data: school } = await supabase.from('school_settings').select('*').limit(1).single()
    setReceiptData({
      payment,
      school: school || { school_name: 'DanceFlow' }
    })
    setSelectedStudent(student)
    setTimeout(() => {
      window.print()
      setReceiptData(null)
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
    if (paymentFilter === 'scholarship') return s.status === 'scholarship'
    if (paymentFilter === 'partial_scholarship') return s.status === 'partial_scholarship'
    if (paymentFilter === 'locked') return s.status === 'locked'
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
    scholarship: students.filter(s => s.status === 'scholarship').length,
    partial_scholarship: students.filter(s => s.status === 'partial_scholarship').length,
    locked: students.filter(s => s.status === 'locked').length,
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...formData,
      birth_date: formData.birth_date || null,
      monthly_fee: parseFloat(formData.monthly_fee) || 0,
      discount_monthly_fee: parseFloat(formData.discount_monthly_fee) || 0,
      enrollment_fee: parseFloat(formData.enrollment_fee) || 0,
      class_ids: formData.class_ids || [],
      status: formData.status || 'active',
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
      discount_monthly_fee: parseFloat(formData.discount_monthly_fee) || 0,
      enrollment_fee: parseFloat(formData.enrollment_fee) || 0,
      class_ids: formData.class_ids || [],
      status: formData.status,
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
    
    // Check if eligible for discount
    const hasDiscount = student.discount_monthly_fee && student.discount_monthly_fee > 0;
    let isEligible = false;
    if (hasDiscount && payment.reference_month) {
      const [yr, mn] = payment.reference_month.split('-');
      const year = parseInt(yr);
      const month = parseInt(mn);
      const limitDate = new Date(year, month - 1, discountDueDay, 23, 59, 59, 999);
      const todayDate = new Date();
      isEligible = todayDate <= limitDate;
    }

    const finalAmount = isEligible ? student.discount_monthly_fee : payment.amount;

    // 1. Update monthly payment status
    const { error: payError } = await supabase.from('monthly_payments').update({
      status: 'paid',
      paid_date: today,
      amount: finalAmount,
    }).eq('id', paymentId)
    
    if (payError) {
      alert('Erro ao confirmar pagamento: ' + payError.message)
      return
    }

    // 2. Create financial entry
    const { error: finError } = await supabase.from('financial_entries').insert([{
      type: 'income',
      category: 'Mensalidade',
      description: `Mensalidade: ${student.name} - Ref: ${payment.reference_month}${isEligible ? ' (Com Desconto)' : ''}`,
      amount: finalAmount,
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
      user_id: student.user_id,
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
      guardian_phone: student.guardian_phone || '',
      notes: student.notes || '',
      monthly_fee: student.monthly_fee?.toString() || '',
      discount_monthly_fee: student.discount_monthly_fee?.toString() || '',
      enrollment_fee: student.enrollment_fee?.toString() || '',
      class_ids: student.class_ids || (student.class_id ? [student.class_id] : []),
      status: student.status || 'active',
      photo_url: student.photo_url || '',
    })
    setShowEditModal(true)
  }

  async function openProfileModal(student: Student) {
    setSelectedStudent(student)
    setLoadingProfile(true)
    setShowProfileModal(true)

    try {
      // 1. Fetch complete monthly payments history for this student
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('monthly_payments')
        .select('*')
        .eq('student_id', student.id)
        .order('reference_month', { ascending: false })

      if (paymentsError) throw paymentsError
      setProfilePayments(paymentsData || [])

      // 2. Fetch complete attendance history for this student
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', student.id)
        .order('date', { ascending: false })

      if (attendanceError) throw attendanceError
      setProfileAttendance(attendanceData || [])
    } catch (err) {
      console.error('Erro ao carregar dados do perfil:', err)
    } finally {
      setLoadingProfile(false)
    }
  }

  async function generateTaxReport(student: Student) {
    const year = new Date().getFullYear()
    const { data: school } = await supabase.from('school_settings').select('*').limit(1).single()
    const { data: paidPayments } = await supabase
      .from('monthly_payments')
      .select('*')
      .eq('student_id', student.id)
      .eq('status', 'paid')
      .gte('reference_month', `${year}-01`)
      .lte('reference_month', `${year}-12`)
      .order('reference_month')

    setTaxReportData({
      payments: paidPayments || [],
      school: school || { school_name: 'DanceFlow' }
    })
    setSelectedStudent(student)
    setTimeout(() => {
      window.print()
      setTaxReportData(null)
    }, 500)
  }

  async function generateEnrollmentDeclaration(student: Student) {
    const { data: school } = await supabase.from('school_settings').select('*').limit(1).single()
    setEnrollmentReportData({
      school: school || { school_name: 'DanceFlow' }
    })
    setSelectedStudent(student)
    setTimeout(() => {
      window.print()
      setEnrollmentReportData(null)
    }, 500)
  }

  function renderTemplate(template: string, student: Student, school: any, type: 'tax' | 'activity', paymentsData?: any[]) {
    if (!template) return null

    // Replace details (new & old tags)
    let text = template
      .replace(/{nome_escola}/g, school.school_name || 'DanceFlow')
      .replace(/{escola}/g, school.school_name || 'DanceFlow')
      .replace(/{cnpj_escola}/g, school.cnpj || 'Não cadastrado')
      .replace(/{cnpj}/g, school.cnpj || 'Não cadastrado')
      .replace(/{endereco_escola}/g, school.address || 'Não cadastrado')
      .replace(/{endereco}/g, school.address || 'Não cadastrado')
      .replace(/{nome_diretor}/g, school.director || 'Direção Geral')
      .replace(/{diretor}/g, school.director || 'Direção Geral')
      .replace(/{nome_aluno}/g, student.name)
      .replace(/{aluno}/g, student.name)
      .replace(/{cpf_aluno}/g, student.cpf || 'Não informado')
      .replace(/{nome_responsavel}/g, student.guardian_name || student.name)
      .replace(/{responsavel}/g, student.guardian_name || student.name)
      .replace(/{cpf_responsavel}/g, student.cpf || 'Não informado')
      .replace(/{data_atual}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/{data}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/{ano_letivo}/g, String(new Date().getFullYear()))
      .replace(/{ano}/g, String(new Date().getFullYear()))

    // Replace classes
    if (text.includes('{turmas_aluno}') || text.includes('{turmas}')) {
      const classListHtml = student.class_ids?.length ? (
        `<ul style="list-style-type: disc; padding-left: 20px; margin: 10px 0;">` +
        student.class_ids.map(id => {
          const cls = classes.find(c => c.id === id)
          return cls ? `<li style="margin-bottom: 5px;"><strong>${cls.name}</strong> (${cls.style}) — Horário: ${cls.schedule}</li>` : ''
        }).filter(Boolean).join('') +
        `</ul>`
      ) : '<em>Nenhuma turma vinculada</em>'
      text = text.replace(/{turmas_aluno}/g, classListHtml).replace(/{turmas}/g, classListHtml)
    }

    // Replace payments table
    if ((text.includes('{tabela_pagamentos}') || text.includes('{mensalidades}')) && paymentsData) {
      const totalAmount = paymentsData.reduce((acc: number, cur: any) => acc + Number(cur.amount), 0)
      const tableHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; border: 1px solid #ddd;">
          <thead>
            <tr style="background-color: #f5f5f5; border-bottom: 2px solid #ddd;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Mês de Referência</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Data de Pagamento</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Valor Pago</th>
            </tr>
          </thead>
          <tbody>
            ${paymentsData.length === 0 ? `
              <tr>
                <td colspan="3" style="padding: 12px; text-align: center; color: #777; font-style: italic;">
                  Nenhum pagamento quitado registrado neste ano letivo.
                </td>
              </tr>
            ` : paymentsData.map((p: any) => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px; border: 1px solid #ddd; text-transform: capitalize;">
                  ${new Date(p.reference_month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </td>
                <td style="padding: 8px; border: 1px solid #ddd;">
                  ${p.paid_date ? new Date(p.paid_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                </td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">
                  R$ ${Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            `).join('')}
            <tr style="background-color: #f9f9f9; font-weight: bold; border-top: 2px solid #ddd; font-size: 14px;">
              <td colspan="2" style="padding: 10px; border: 1px solid #ddd; text-align: right; text-transform: uppercase;">Valor Total Quitado:</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-size: 15px;">
                R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      `
      text = text.replace(/{tabela_pagamentos}/g, tableHtml).replace(/{mensalidades}/g, tableHtml)
    }

    // Check if HTML or Plain Text
    const isHtml = /<[a-z][\s\S]*>/i.test(template)
    
    if (!isHtml) {
      // Split paragraphs by double newline
      const paragraphs = text.split(/\r?\n\r?\n/)
      
      let formattedHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; line-height: 1.8; color: #111; max-width: 800px; margin: 0 auto; box-sizing: border-box;">
      `
      
      // School Header (Logo & Name)
      if (school.logo_url) {
        formattedHtml += `
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${school.logo_url}" alt="${school.school_name || 'Logo'}" style="max-height: 70px; max-width: 180px; object-fit: contain; margin-bottom: 8px;" />
            <div style="font-size: 12px; font-weight: bold; color: #555; text-transform: uppercase; letter-spacing: 1px;">${school.school_name || 'DanceFlow'}</div>
          </div>
        `
      } else {
        formattedHtml += `
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
            <h1 style="font-size: 22px; font-weight: 800; margin: 0; color: #111; text-transform: uppercase; letter-spacing: 1px;">${school.school_name || 'DanceFlow'}</h1>
          </div>
        `
      }
      
      paragraphs.forEach((p, idx) => {
        const trimmed = p.trim()
        if (!trimmed) return
        
        // Render document title (first paragraph if it's short)
        if (idx === 0 && trimmed.length < 100) {
          formattedHtml += `
            <div style="text-align: center; margin-bottom: 35px;">
              <h2 style="font-size: 18px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #111; padding-bottom: 6px; display: inline-block; letter-spacing: 0.5px;">
                ${trimmed}
              </h2>
            </div>
          `
          return
        }
        
        // Render signature lines
        if (trimmed.toLowerCase().includes('assinatura') || trimmed.toLowerCase().includes(school.director?.toLowerCase() || 'direção') || trimmed.startsWith('____')) {
          formattedHtml += `
            <div style="text-align: center; margin-top: 50px; page-break-inside: avoid;">
              <div style="width: 250px; border-top: 1px solid #111; margin: 0 auto 5px auto;"></div>
              <div style="font-weight: bold; font-size: 14px; color: #111;">${trimmed.replace(/assinatura:?/gi, '').trim() || school.director || 'Direção Geral'}</div>
            </div>
          `
          return
        }
        
        // Render elements directly if it contains the tables or lists
        if (trimmed.startsWith('<table') || trimmed.startsWith('<ul') || trimmed.startsWith('<div')) {
          formattedHtml += `<div style="margin: 15px 0;">${trimmed}</div>`
          return
        }
        
        // Date block (right aligned)
        if (trimmed.includes(new Date().toLocaleDateString('pt-BR')) && trimmed.length < 150) {
          formattedHtml += `
            <p style="text-align: right; margin-top: 30px; font-size: 14px; color: #444;">
              ${trimmed}
            </p>
          `
          return
        }
        
        // Indented text paragraph
        const textWithBreaks = trimmed.replace(/\r?\n/g, '<br />')
        formattedHtml += `
          <p style="text-indent: 40px; text-align: justify; margin-bottom: 15px; font-size: 14px; color: #222;">
            ${textWithBreaks}
          </p>
        `
      })
      
      formattedHtml += `</div>`
      text = formattedHtml
    }

    return <div dangerouslySetInnerHTML={{ __html: text }} />
  }

  function openPaymentModal(student: Student) {
    setSelectedStudent(student)
    setShowPaymentModal(true)
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem é muito grande. O tamanho máximo é 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setFormData({ ...formData, photo_url: base64 })
    }
    reader.readAsDataURL(file)
  }

  function resetForm() {
    setFormData({ name: '', email: '', phone: '', birth_date: '', cpf: '', address: '', guardian_name: '', guardian_phone: '', notes: '', monthly_fee: '', discount_monthly_fee: '', enrollment_fee: '', class_ids: [] as string[], status: 'active' as Student['status'], photo_url: '' })
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
    { label: 'Bolsistas', value: stats.scholarship, icon: GraduationCap, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
    { label: 'Trancados', value: stats.locked, icon: Lock, color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
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
            <label className="text-sm font-bold block mb-3 text-purple-400 uppercase tracking-widest">Turmas Vinculadas</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
              {classes.map(c => (
                <label key={c.id} className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-5 h-5 rounded border border-purple-500/30 group-hover:border-purple-500/60 transition-colors" style={{ backgroundColor: formData.class_ids.includes(c.id) ? 'var(--accent-color)' : 'transparent' }}>
                    {formData.class_ids.includes(c.id) && <CheckCircle size={14} color="#fff" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={formData.class_ids.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, class_ids: [...formData.class_ids, c.id] })
                      } else {
                        setFormData({ ...formData, class_ids: formData.class_ids.filter(id => id !== c.id) })
                      }
                    }}
                  />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                </label>
              ))}
              {classes.length === 0 && <span className="text-sm opacity-50" style={{ color: 'var(--text-muted)' }}>Nenhuma turma cadastrada</span>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome do Aluno *</label>
            <input
              required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome do Responsável *</label>
            <input
              required value={formData.guardian_name} onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
              className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Telefone do Responsável *</label>
            <input
              required
              value={formData.guardian_phone} onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
              className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="Ex: (11) 99999-9999"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email *</label>
            <input
              required
              type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Telefone</label>
            <input
              value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Data de Nascimento *</label>
            <input
              required
              type="date" value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>CPF do Responsável *</label>
            <input
              required
              value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={inputStyle}
            />
          </div>
          <div className="col-span-full">
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Endereço *</label>
            <input
              required
              value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={inputStyle}
            />
          </div>
          <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 col-span-full space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold block mb-1.5 text-purple-400">Valor da Mensalidade (R$)</label>
                <input
                  type="number" step="0.01" value={formData.monthly_fee} onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                  placeholder="Ex: 150.00"
                  className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-sm font-bold block mb-1.5 text-purple-400">Valor com Desconto (R$)</label>
                <input
                  type="number" step="0.01" value={formData.discount_monthly_fee} onChange={(e) => setFormData({ ...formData, discount_monthly_fee: e.target.value })}
                  placeholder="Ex: 120.00"
                  className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold block mb-1.5 text-purple-400">Valor da Matrícula (R$)</label>
              <input
                type="number" step="0.01" min="0" max="2000" value={formData.enrollment_fee} onChange={(e) => setFormData({ ...formData, enrollment_fee: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={inputStyle}
              />
              <p className="text-[10px] text-purple-400/70 mt-1.5">
                * O valor com desconto é aplicado automaticamente caso o pagamento seja feito até o dia configurado em Configurações.
              </p>
            </div>
          </div>
          <div className="col-span-full">
            <label className="text-sm font-bold block mb-3 text-purple-400 uppercase tracking-widest">Status do Aluno</label>
            <div className="flex gap-3">
              {[
                { value: 'active', label: 'Ativo', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
                { value: 'scholarship', label: 'Bolsista Total', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
                { value: 'partial_scholarship', label: 'Bolsista Parcial', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
                { value: 'locked', label: 'Trancado', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: opt.value as any })}
                  className="flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition-all"
                  style={{
                    backgroundColor: formData.status === opt.value ? opt.bg : 'var(--bg-input)',
                    color: formData.status === opt.value ? opt.color : 'var(--text-muted)',
                    border: `2px solid ${formData.status === opt.value ? opt.color : 'var(--border-color)'}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-full">
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Foto do Aluno</label>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-2">
              {formData.photo_url ? (
                <div className="p-1 rounded-2xl border border-dashed flex justify-center items-center bg-black/20 w-24 h-24 shrink-0 overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
                  <img src={formData.photo_url} alt="Foto Preview" className="h-full w-full object-cover rounded-xl" />
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-dashed flex justify-center items-center bg-black/20 w-24 h-24 shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>Sem foto</span>
                </div>
              )}
              
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-xs
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-xl file:border-0
                    file:text-xs file:font-semibold
                    file:bg-purple-600 file:text-white
                    hover:file:bg-purple-700
                    cursor-pointer transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Tamanho máximo recomendado: 2MB.
                </p>
                {formData.photo_url && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, photo_url: '' })}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors cursor-pointer"
                  >
                    Remover foto
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Observações</label>
          <textarea
            value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            style={inputStyle}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm() }}
            className="rounded-2xl px-5 py-2.5 text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
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
        <div className="h-8 w-8 animate-spin rounded-2xl border-2 border-transparent" style={{ borderTopColor: 'var(--accent-color)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-10">
      {/* Print-only template */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          #root { display: none !important; }
          #printable-report {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
          }
          .no-print { display: none !important; }
        }
      `}} />
      
      {reportData && selectedStudent && createPortal(
        <div id="printable-report" className="font-sans text-black">
          <div className="flex items-center justify-between border-b-2 border-black pb-6 mb-8">
            <div className="flex items-center gap-6">
              {reportData.school.logo_url && (
                <img src={reportData.school.logo_url} alt="Logo" className="w-24 h-24 object-contain" />
              )}
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter">{reportData.school.school_name}</h1>
                <p className="text-sm font-bold">Relatório Anual do Aluno</p>
                {reportData.school.cnpj && <p className="text-[10px] mt-1 text-gray-600">CNPJ: {reportData.school.cnpj}</p>}
                {reportData.school.address && <p className="text-[10px] text-gray-600">{reportData.school.address}</p>}
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
              <p className="text-sm"><b>Telefone:</b> {selectedStudent.phone || 'Não informado'}</p>
              <p className="text-sm"><b>Turmas:</b> {selectedStudent.class_ids?.length ? selectedStudent.class_ids.map(id => classes.find(c => c.id === id)?.name).filter(Boolean).join(', ') : 'Nenhuma'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-gray-500">Dados do Responsável</p>
              <p className="text-lg font-black uppercase">{selectedStudent.guardian_name || selectedStudent.name}</p>
              <p className="text-sm"><b>CPF do Responsável:</b> {selectedStudent.cpf || 'Não informado'}</p>
              <p className="text-sm"><b>Telefone do Responsável:</b> {selectedStudent.guardian_phone || 'Não informado'}</p>
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

          <div className="flex flex-col items-center" style={{ marginTop: '200px', paddingTop: '40px' }}>
            <div className="w-64 border-t-2 border-black mb-2"></div>
            <p className="text-sm font-black uppercase">{reportData.school.director || reportData.school.school_name}</p>
            <p className="text-xs">{reportData.school.director ? 'Direção / Responsável' : 'Assinatura da Direção'}</p>
            <p className="mt-8 text-[10px] text-gray-400">Este documento é uma declaração oficial de frequência e quitação financeira gerada pelo sistema DanceFlow.</p>
          </div>
        </div>,
        document.body
      )}

      {receiptData && selectedStudent && createPortal(
        <div id="printable-report" className="font-sans text-black max-w-4xl mx-auto p-12 border-4 double border-black my-8 bg-white">
          {/* Cabeçalho do Recibo */}
          <div className="flex items-center justify-between border-b-2 border-black pb-8 mb-12">
            <div className="flex items-center gap-6">
              {receiptData.school.logo_url && (
                <img src={receiptData.school.logo_url} alt="Logo" className="w-24 h-24 object-contain" />
              )}
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter">{receiptData.school.school_name}</h1>
                <p className="text-sm font-bold tracking-widest uppercase text-gray-700">Recibo de Pagamento de Mensalidade</p>
                {receiptData.school.cnpj && <p className="text-xs mt-1 text-gray-600 font-semibold">CNPJ: {receiptData.school.cnpj}</p>}
                {receiptData.school.address && <p className="text-xs text-gray-500">{receiptData.school.address}</p>}
              </div>
            </div>
            <div className="text-right text-xs font-mono space-y-1">
              <p className="font-bold">Data: {new Date().toLocaleDateString('pt-BR')}</p>
              <p>Nº: {receiptData.payment.id.split('-')[0].toUpperCase()}</p>
            </div>
          </div>

          {/* Destaque de Valor */}
          <div className="flex justify-end mb-12">
            <div className="border-2 border-black px-8 py-3 bg-gray-50 text-2xl font-black rounded-lg">
              R$ {Number(receiptData.payment.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </div>
          </div>

          {/* Texto Principal */}
          <div className="my-16 text-lg leading-relaxed text-justify space-y-6">
            <p>
              Recebemos de <strong className="uppercase">{selectedStudent.guardian_name || selectedStudent.name}</strong>
              {selectedStudent.guardian_name ? (
                <span>, responsável financeiramente de <strong className="uppercase">{selectedStudent.name}</strong></span>
              ) : (
                <span> (aluno matriculado)</span>
              )}
              , o pagamento de <strong className="text-xl">R$ {Number(receiptData.payment.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong> referente à mensalidade do mês de <strong className="uppercase">{new Date(receiptData.payment.reference_month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong>.
            </p>
            <p className="text-sm text-gray-500 italic mt-8">
              Pelo presente documento, declaramos quitado o valor acima mencionado para todos os fins de direito.
            </p>
          </div>

          {/* Assinatura do Diretor */}
          <div className="flex flex-col items-center justify-center" style={{ marginTop: '200px', paddingTop: '40px' }}>
            <div className="w-80 border-t-2 border-black mb-2"></div>
            <p className="text-sm font-black uppercase">{receiptData.school.director || receiptData.school.school_name}</p>
            <p className="text-xs text-gray-600">{receiptData.school.director ? 'Direção Geral' : 'Assinatura / Carimbo do Responsável'}</p>
          </div>
        </div>,
        document.body
      )}

      {taxReportData && selectedStudent && createPortal(
        <div id="printable-report" className="font-sans text-black">
          {renderTemplate(
            taxReportData.school.tax_declaration_template || localStorage.getItem('tax_declaration_template') || DEFAULT_TAX_TEMPLATE,
            selectedStudent,
            taxReportData.school,
            'tax',
            taxReportData.payments
          )}
        </div>,
        document.body
      )}

      {enrollmentReportData && selectedStudent && createPortal(
        <div id="printable-report" className="font-sans text-black">
          {renderTemplate(
            enrollmentReportData.school.activity_declaration_template || localStorage.getItem('activity_declaration_template') || DEFAULT_ACTIVITY_TEMPLATE,
            selectedStudent,
            enrollmentReportData.school,
            'activity'
          )}
        </div>,
        document.body
      )}
      {/* Header Section with Dynamic Style */}
      <div 
        className="p-5 sm:p-8 md:p-10 pb-10 sm:pb-16 rounded-2xl border border-white/5 shadow-2xl mb-8 sm:mb-12 relative overflow-hidden"
        style={{ 
          backgroundColor: 'rgba(255,255,255,0.03)', 
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Accent Glow */}
        <div 
          className="absolute -left-20 -top-20 w-64 h-64 rounded-2xl blur-[100px] opacity-20"
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
              Alunos
            </h1>
            <br />
            <p 
              className="font-bold inline-block py-3 sm:py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
               style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: 'clamp(12px, 3vw, 32px)', paddingRight: 'clamp(12px, 3vw, 32px)' }}
            >
              Gerencie seus alunos, mensalidades e taxas de matrícula
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowAddModal(true) }}
            className="flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/20"
            style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
          >
            <UserPlus size={26} />
            Novo Aluno
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div 
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
        style={{ marginBottom: '32px' }}
      >
        {statCards.map((card) => (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-2xl p-8 sm:p-10 transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex flex-col items-center justify-center text-center gap-4">
              <div className="rounded-xl p-3" style={{ backgroundColor: card.bg }}>
                <card.icon size={26} style={{ color: card.color }} />
              </div>
              <div className="w-full">
                <p className="text-2xl sm:text-3xl font-black leading-none" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-wrap" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
              </div>
            </div>
            <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: card.color }} />
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-4 sm:flex-row mb-12">
        <div className="flex flex-1 items-center gap-3 rounded-xl px-4 py-2.5 border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
          <Search size={18} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Buscar aluno por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder:text-gray-500"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
          <Filter size={18} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
            className="bg-transparent text-sm text-white focus:outline-none pr-8 appearance-none cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
          >
            <option value="all" className="bg-[#12121a]">Todos</option>
            <option value="paid" className="bg-[#12121a]">Pagos</option>
            <option value="pending" className="bg-[#12121a]">Pendentes</option>
            <option value="overdue" className="bg-[#12121a]">Atrasados</option>
            <option value="scholarship" className="bg-[#12121a]">Bolsistas Total ({stats.scholarship})</option>
            <option value="partial_scholarship" className="bg-[#12121a]">Bolsistas Parcial ({stats.partial_scholarship})</option>
            <option value="locked" className="bg-[#12121a]">Trancados ({stats.locked})</option>
          </select>
          <ChevronDown size={16} className="shrink-0 ml-1" style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Student List */}
      <div className="rounded-none overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Aluno</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>Telefone</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>Responsável</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Mensalidade</th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
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
                      className="transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                      onClick={() => openProfileModal(student)}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {student.photo_url ? (
                            <img
                              src={student.photo_url}
                              alt={student.name}
                              className="h-10 w-10 rounded-2xl object-cover border border-purple-500/20 shadow-lg shrink-0"
                            />
                          ) : (
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-lg shrink-0"
                              style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
                            >
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>{student.name}</p>
                            <p className="text-[10px] opacity-50" style={{ color: 'var(--text-muted)' }}>{student.email}</p>
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider mt-1"
                              style={{
                                backgroundColor: student.status === 'active' ? 'rgba(16,185,129,0.15)' : student.status === 'scholarship' ? 'rgba(59,130,246,0.15)' : student.status === 'partial_scholarship' ? 'rgba(139,92,246,0.15)' : 'rgba(107,114,128,0.15)',
                                color: student.status === 'active' ? '#10b981' : student.status === 'scholarship' ? '#3b82f6' : student.status === 'partial_scholarship' ? '#8b5cf6' : '#6b7280',
                              }}
                            >
                              {student.status === 'active' ? 'Ativo' : student.status === 'scholarship' ? 'Bolsista' : student.status === 'partial_scholarship' ? 'Bolsista Parcial' : student.status === 'locked' ? 'Trancado' : 'Inativo'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {student.guardian_phone || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {student.guardian_name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                            R$ {Number(student.monthly_fee || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {student.discount_monthly_fee && student.discount_monthly_fee > 0 ? (
                            <span className="text-[10px] text-emerald-400 font-bold">
                              Desc: R$ {Number(student.discount_monthly_fee).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          ) : null}
                          <span
                            className="inline-flex items-center rounded-2xl px-3 py-1 text-[9px] font-black uppercase tracking-widest mt-1 w-fit"
                            style={{ backgroundColor: statusInfo.bg, color: statusInfo.text, border: `1px solid ${statusInfo.text}33` }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); openPaymentModal(student); }}
                            className="rounded-2xl p-2 transition-all hover:bg-emerald-500/10 active:scale-90"
                            style={{ color: '#10b981' }}
                            title="Dar baixa na mensalidade"
                          >
                            <CreditCard size={18} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); generateAnnualReport(student); }}
                            className="rounded-2xl p-2 transition-all hover:bg-purple-500/10 active:scale-90"
                            style={{ color: 'var(--accent-color)' }}
                            title="Gerar Relatório Anual Oficial"
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(student); }}
                            className="rounded-2xl p-2 transition-all hover:bg-blue-500/10 active:scale-90"
                            style={{ color: '#3b82f6' }}
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student.id); }}
                            className="rounded-2xl p-2 transition-all hover:bg-red-500/10 active:scale-90"
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
              const studentPayments = payments.filter((p) => p.student_id === selectedStudent.id)
              if (studentPayments.length === 0) {
                return (
                  <div className="space-y-6">
                    <div className="rounded-2xl p-8 sm:p-10 text-center border-2 border-dashed border-white/5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <p className="text-sm italic mb-4" style={{ color: 'var(--text-muted)' }}>
                        Nenhuma mensalidade encontrada para este aluno.
                      </p>
                      <button
                        onClick={() => generatePayment(selectedStudent)}
                        className="flex items-center gap-2 mx-auto rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20"
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
                  {studentPayments.map((payment) => {
                    const hasDiscount = selectedStudent.discount_monthly_fee && selectedStudent.discount_monthly_fee > 0;
                    let isEligible = false;
                    let limitDateStr = '';
                    
                    if (hasDiscount && payment.status !== 'paid' && payment.reference_month) {
                      const [yr, mn] = payment.reference_month.split('-');
                      const year = parseInt(yr);
                      const month = parseInt(mn);
                      
                      // Construct the limit date
                      const limitDate = new Date(year, month - 1, discountDueDay, 23, 59, 59, 999);
                      const today = new Date();
                      isEligible = today <= limitDate;
                      limitDateStr = new Date(year, month - 1, discountDueDay).toLocaleDateString('pt-BR');
                    }

                    return (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-2xl p-4 shadow-lg"
                        style={{ 
                          backgroundColor: 'var(--bg-secondary)', 
                          border: `1px solid ${payment.status === 'paid' ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'}` 
                        }}
                      >
                        <div className="space-y-1">
                          <p className={`text-xs font-bold uppercase tracking-widest ${payment.status === 'paid' ? 'text-emerald-400' : 'text-purple-400'}`}>
                            Referência: {payment.reference_month}
                            {payment.status === 'paid' && ' (PAGO)'}
                          </p>
                          <p className="text-[10px] opacity-60" style={{ color: 'var(--text-muted)' }}>
                            Vencimento: {new Date(payment.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </p>
                          
                          {payment.status !== 'paid' && isEligible && (
                            <div className="flex flex-col">
                              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 py-0.5 px-2 rounded-full inline-block w-fit">
                                🌟 Desconto Ativo (até {limitDateStr})
                              </span>
                              <div className="flex items-baseline gap-2 mt-1">
                                <p className="text-lg font-black text-emerald-400">
                                  R$ {Number(selectedStudent.discount_monthly_fee).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs line-through opacity-50" style={{ color: 'var(--text-muted)' }}>
                                  R$ {Number(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                          )}

                          {payment.status !== 'paid' && !isEligible && (
                            <div>
                              {hasDiscount && (
                                <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">
                                  ⚠️ Desconto expirou em {limitDateStr}
                                </p>
                              )}
                              <p className="text-lg font-black text-rose-400 mt-1">
                                R$ {Number(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          )}

                          {payment.status === 'paid' && (
                            <p className="text-lg font-black text-emerald-500 mt-1">
                              R$ {Number(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                        
                        {payment.status === 'paid' ? (
                          <button
                            onClick={() => generateReceipt(selectedStudent, payment)}
                            className="flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-tighter text-emerald-400 transition-all hover:bg-emerald-500/10 active:scale-95 border border-dashed border-emerald-500/30"
                          >
                            <Printer size={16} />
                            Recibo
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePayment(selectedStudent.id, payment.id)}
                            className="flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-tighter text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
                            style={{ background: 'linear-gradient(135deg, #10b981, #000)' }}
                          >
                            <CheckCircle size={16} />
                            Confirmar
                          </button>
                        )}
                      </div>
                    );
                  })}
                  
                  <div className="pt-4 border-t border-white/5">
                    <button
                      onClick={() => generatePayment(selectedStudent)}
                      className="w-full rounded-2xl py-3 text-[10px] font-bold uppercase tracking-widest text-purple-400 hover:bg-purple-500/5 transition-all border border-dashed border-purple-500/20"
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

      {/* Student Profile Modal */}
      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Perfil Completo do Aluno" size="lg">
        {selectedStudent && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-white/5">
              {selectedStudent.photo_url ? (
                <img
                  src={selectedStudent.photo_url}
                  alt={selectedStudent.name}
                  className="h-20 w-20 rounded-3xl object-cover border border-purple-500/20 shadow-xl shrink-0"
                />
              ) : (
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-3xl text-3xl font-bold text-white shadow-xl shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
                >
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl font-black uppercase tracking-tight text-white">{selectedStudent.name}</h2>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: selectedStudent.status === 'active' ? 'rgba(16,185,129,0.15)' : selectedStudent.status === 'scholarship' ? 'rgba(59,130,246,0.15)' : selectedStudent.status === 'partial_scholarship' ? 'rgba(139,92,246,0.15)' : 'rgba(107,114,128,0.15)',
                      color: selectedStudent.status === 'active' ? '#10b981' : selectedStudent.status === 'scholarship' ? '#3b82f6' : selectedStudent.status === 'partial_scholarship' ? '#8b5cf6' : '#6b7280',
                    }}
                  >
                    {selectedStudent.status === 'active' ? 'Ativo' : selectedStudent.status === 'scholarship' ? 'Bolsista' : selectedStudent.status === 'partial_scholarship' ? 'Bolsista Parcial' : selectedStudent.status === 'locked' ? 'Trancado' : 'Inativo'}
                  </span>
                </div>
                <p className="text-sm text-gray-400">{selectedStudent.email}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-gray-500">
                  {selectedStudent.phone && <span><b>Tel:</b> {selectedStudent.phone}</span>}
                  {selectedStudent.cpf && <span><b>CPF do Responsável:</b> {selectedStudent.cpf}</span>}
                  {selectedStudent.birth_date && <span><b>Nasc:</b> {new Date(selectedStudent.birth_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                </div>
              </div>
            </div>

            {/* Main Tabs/Grid */}
            {loadingProfile ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-2xl border-2 border-transparent" style={{ borderTopColor: 'var(--accent-color)' }} />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Side: Cadastral Info */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Endereço e Observações */}
                  <div className="rounded-2xl p-4 border border-white/5 space-y-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">Informações de Cadastro</h3>
                    <div className="text-xs space-y-2" style={{ color: 'var(--text-secondary)' }}>
                      <p><b>Endereço:</b> {selectedStudent.address || '-'}</p>
                      <p><b>Mensalidade:</b> R$ {Number(selectedStudent.monthly_fee || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      {selectedStudent.discount_monthly_fee && selectedStudent.discount_monthly_fee > 0 ? (
                        <p className="text-emerald-400"><b>Desconto Pontualidade:</b> R$ {Number(selectedStudent.discount_monthly_fee).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      ) : null}
                    </div>
                  </div>

                  {/* Responsável */}
                  <div className="rounded-2xl p-4 border border-white/5 space-y-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">Responsável Financeiro</h3>
                    <div className="text-xs space-y-2" style={{ color: 'var(--text-secondary)' }}>
                      <p><b>Nome:</b> {selectedStudent.guardian_name || '-'}</p>
                      <p><b>Telefone:</b> {selectedStudent.guardian_phone || '-'}</p>
                    </div>
                  </div>

                  {/* Turmas */}
                  <div className="rounded-2xl p-4 border border-white/5 space-y-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">Turmas Vinculadas</h3>
                    {(() => {
                      const studentClasses = classes.filter(c => selectedStudent.class_ids?.includes(c.id))
                      if (studentClasses.length === 0) {
                        return <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Nenhuma turma vinculada</p>
                      }
                      return (
                        <div className="space-y-2">
                          {studentClasses.map(c => (
                            <div key={c.id} className="flex flex-col gap-0.5 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                              <p className="text-xs font-bold text-white">{c.name}</p>
                              <p className="text-[10px] text-gray-400">{c.style} • {c.schedule}</p>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Ações e Documentos */}
                  <div className="rounded-2xl p-4 border border-white/5 space-y-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <h3 className="text-xs font-black uppercase tracking-widest text-purple-400 font-bold">Documentos</h3>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => generateAnnualReport(selectedStudent)}
                        className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-white/5 active:scale-95 border border-white/10"
                      >
                        <FileText size={16} />
                        Imprimir Ficha Geral (A4)
                      </button>
                      <button
                        onClick={() => generateTaxReport(selectedStudent)}
                        className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-white/5 active:scale-95 border border-white/10"
                      >
                        <Calendar size={16} />
                        Declaração de IR (Imposto de Renda)
                      </button>
                      <button
                        onClick={() => generateEnrollmentDeclaration(selectedStudent)}
                        className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-white/5 active:scale-95 border border-white/10"
                      >
                        <GraduationCap size={16} />
                        Declaração de Matrícula (Atividade)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Side: Tabbed or continuous columns for Payments and Attendance */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Mensalidades */}
                  <div className="rounded-2xl p-4 border border-white/5 space-y-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-purple-400 font-bold">Histórico de Mensalidades</h3>
                      <button
                        onClick={() => { setShowProfileModal(false); openPaymentModal(selectedStudent); }}
                        className="text-[10px] font-black uppercase tracking-wider text-emerald-400 hover:underline"
                      >
                        Dar Baixa / Gerar
                      </button>
                    </div>

                    {profilePayments.length === 0 ? (
                      <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Nenhuma mensalidade registrada</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-white/5" style={{ color: 'var(--text-muted)' }}>
                              <th className="py-2">Mês</th>
                              <th className="py-2">Vencimento</th>
                              <th className="py-2 text-right">Valor</th>
                              <th className="py-2 text-right">Status</th>
                              <th className="py-2 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {profilePayments.map(p => {
                              const payStatus = p.status
                              const statusInfo = statusColors[payStatus] || { bg: 'rgba(107,114,128,0.15)', text: '#6b7280', label: 'Desconhecido' }
                              return (
                                <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                  <td className="py-2 font-semibold capitalize">
                                    {new Date(p.reference_month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                  </td>
                                  <td className="py-2 text-gray-400">
                                    {new Date(p.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                  </td>
                                  <td className="py-2 text-right font-bold text-white">
                                    R$ {Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2 text-right">
                                    <span
                                      className="inline-flex items-center rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                                      style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
                                    >
                                      {statusInfo.label}
                                    </span>
                                  </td>
                                  <td className="py-2 text-right">
                                    {p.status === 'paid' ? (
                                      <button
                                        onClick={() => generateReceipt(selectedStudent, p)}
                                        className="text-emerald-400 hover:text-emerald-300 p-1"
                                        title="Imprimir Recibo"
                                      >
                                        <Printer size={14} />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => { setShowProfileModal(false); openPaymentModal(selectedStudent); }}
                                        className="text-amber-400 hover:text-amber-300 p-1 font-bold"
                                      >
                                        Quitar
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Frequência (Presenças / Faltas) */}
                  <div className="rounded-2xl p-4 border border-white/5 space-y-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <h3 className="text-xs font-black uppercase tracking-widest text-purple-400 font-bold">Resumo de Frequência</h3>
                    
                    {(() => {
                      const totalClasses = profileAttendance.length
                      const presences = profileAttendance.filter(a => a.status === 'present').length
                      const absences = profileAttendance.filter(a => a.status === 'absent').length
                      const lates = profileAttendance.filter(a => a.status === 'late').length
                      
                      const rate = totalClasses > 0 ? Math.round(((presences + lates) / totalClasses) * 100) : 100

                      return (
                        <div className="space-y-4">
                          {/* Cards de estatísticas de frequência */}
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="p-2 rounded-xl bg-white/5">
                              <p className="text-lg font-black text-white">{totalClasses}</p>
                              <p className="text-[8px] font-bold uppercase text-gray-400">Aulas</p>
                            </div>
                            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/10">
                              <p className="text-lg font-black text-emerald-400">{presences}</p>
                              <p className="text-[8px] font-bold uppercase text-emerald-400">Presenças</p>
                            </div>
                            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/10">
                              <p className="text-lg font-black text-rose-400">{absences}</p>
                              <p className="text-[8px] font-bold uppercase text-rose-400">Faltas</p>
                            </div>
                            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/10">
                              <p className={`text-lg font-black ${rate >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>{rate}%</p>
                              <p className="text-[8px] font-bold uppercase text-gray-400">Aproveitam.</p>
                            </div>
                          </div>

                          {/* List of recent call logs */}
                          <div>
                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">Chamadas Recentes</p>
                            {profileAttendance.length === 0 ? (
                              <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Nenhuma chamada registrada</p>
                            ) : (
                              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                {profileAttendance.map(a => {
                                  const classObj = classes.find(c => c.id === a.class_id)
                                  return (
                                    <div key={a.id} className="flex items-center justify-between text-xs p-2 rounded-xl bg-white/5 border border-white/5">
                                      <div>
                                        <p className="font-bold text-white">{classObj?.name || 'Aula Geral'}</p>
                                        <p className="text-[10px] text-gray-400">
                                          {new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                                        </p>
                                      </div>
                                      <span
                                        className="inline-flex items-center rounded-xl px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                                        style={{
                                          backgroundColor: a.status === 'present' ? 'rgba(16,185,129,0.15)' : a.status === 'absent' ? 'rgba(244,63,94,0.15)' : 'rgba(245,158,11,0.15)',
                                          color: a.status === 'present' ? '#10b981' : a.status === 'absent' ? '#f43f5e' : '#f59e0b',
                                        }}
                                      >
                                        {a.status === 'present' ? 'Presente' : a.status === 'absent' ? 'Ausente' : 'Atraso'}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
