import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Trash2, Edit,
  Wallet, ArrowUpCircle, ArrowDownCircle, Pin, CheckCircle2, Circle, Users,
  UploadCloud, Check, AlertCircle, HelpCircle, RefreshCw, FileText,
  Copy, ExternalLink, QrCode, CreditCard
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { FinancialEntry, Student, MonthlyPayment } from '../types'
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
  const [searchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as 'flow' | 'fixed' | 'payroll' | 'events' | 'reconciliation') || 'flow'
  const [activeTab, setActiveTab] = useState<'flow' | 'fixed' | 'payroll' | 'events' | 'reconciliation'>(initialTab)
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [fixedBills, setFixedBills] = useState<FixedBill[]>([])
  const [payrollData, setPayrollData] = useState<any[]>([])
  const [payrollSubTab, setPayrollSubTab] = useState<'summary' | 'annual'>('summary')
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [viewMode, setViewMode] = useState<'projected' | 'realized'>('projected')
  const [annualAttendance, setAnnualAttendance] = useState<any[]>([])
  const [instructorTeamAttendance, setInstructorTeamAttendance] = useState<any[]>([])
  const [instructorClasses, setInstructorClasses] = useState<any[]>([])
  const [instructors, setInstructors] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [eventParticipants, setEventParticipants] = useState<any[]>([])
  
  // Conciliação de Extrato
  const [students, setStudents] = useState<Student[]>([])
  const [discountDueDay, setDiscountDueDay] = useState(10)
  const [payOnHolidays, setPayOnHolidays] = useState(true)
  const [openOnHolidays, setOpenOnHolidays] = useState(false)
  const [customHolidays, setCustomHolidays] = useState<any[]>([])
  const [pendingPayments, setPendingPayments] = useState<MonthlyPayment[]>([])
  const [gatewayType, setGatewayType] = useState<'none' | 'asaas' | 'cora'>('none')
  const [generatingBillingId, setGeneratingBillingId] = useState<string | null>(null)
  const [reconciliationFile, setReconciliationFile] = useState<File | null>(null)
  const [reconciledItems, setReconciledItems] = useState<any[]>([])
  const [processingFile, setProcessingFile] = useState(false)
  const [batchSaving, setBatchSaving] = useState(false)

  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showFixedModal, setShowFixedModal] = useState(false)
  const [editEntry, setEditEntry] = useState<FinancialEntry | null>(null)
  const [editFixed, setEditFixed] = useState<FixedBill | null>(null)
  const [fixedBillMonths, setFixedBillMonths] = useState<{id: string, fixed_bill_id: string, month: string, amount: number}[]>([])
  const [editingMonthBill, setEditingMonthBill] = useState<{billId: string, month: string, amount: string} | null>(null)
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [profile, setProfile] = useState<any>(null)
  const [schoolAdminId, setSchoolAdminId] = useState<string | null>(null)
  
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

  useEffect(() => {
    if (selectedInstructorId) {
      loadAnnualData(selectedInstructorId, selectedYear)
    }
  }, [selectedInstructorId, selectedYear])

  async function loadAnnualData(instructorId: string, year: number) {
    try {
      const { data: attData } = await supabase
        .from('attendance')
        .select('*')
        .eq('instructor_id', instructorId)
        .eq('type', 'instructor')
        .eq('status', 'present')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)
      
      setAnnualAttendance(attData || [])

      const { data: teamAttData } = await supabase
        .from('team_attendance')
        .select('*')
        .eq('member_id', instructorId)
        .in('status', ['present', 'late'])
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)

      setInstructorTeamAttendance(teamAttData || [])

      const { data: classesData } = await supabase
        .from('dance_classes')
        .select('*')
        .eq('instructor_id', instructorId)
      
      setInstructorClasses(classesData || [])
    } catch (error) {
      console.error('Erro ao carregar dados anuais do professor:', error)
    }
  }

  // Algoritmo de Páscoa (Meeus/Jones/Butcher)
  function getEaster(year: number) {
    const a = year % 19
    const b = Math.floor(year / 100)
    const c = year % 100
    const d = Math.floor(b / 4)
    const e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - d - g + 15) % 30
    const i = Math.floor(c / 4)
    const k = c % 4
    const L = (32 + 2 * e + 2 * i - h - k) % 7
    const m = Math.floor((a + 11 * h + 22 * L) / 451)
    const monthIdx = Math.floor((h + L - 7 * m + 114) / 31) - 1
    const day = ((h + L - 7 * m + 114) % 31) + 1
    return new Date(year, monthIdx, day, 12, 0, 0)
  }

  // Retorna os feriados nacionais do Brasil no ano + customizados
  function getHolidaysForYear(year: number, customList?: any[]): Set<string> {
    const holidays = new Set<string>()
    const fixed = [
      '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'
    ]
    fixed.forEach(f => holidays.add(`${year}-${f}`))

    const easter = getEaster(year)
    const addDays = (d: Date, days: number) => {
      const res = new Date(d)
      res.setDate(res.getDate() + days)
      return res.toISOString().slice(0, 10)
    }

    holidays.add(addDays(easter, -47)) // Carnaval (Terça)
    holidays.add(addDays(easter, -2))  // Sexta-feira Santa
    holidays.add(addDays(easter, 60))  // Corpus Christi

    const list = customList !== undefined ? customList : customHolidays
    list.forEach(ch => {
      if (ch.date && ch.date.startsWith(`${year}-`)) {
        holidays.add(ch.date)
      }
    })

    return holidays
  }

  async function triggerCreateBilling(paymentId: string) {
    setGeneratingBillingId(paymentId)
    try {
      const { data, error } = await supabase.functions.invoke('create-billing', {
        body: { paymentId }
      })
      if (error) {
        if ('context' in error && (error as any).context instanceof Response) {
          try {
            const body = await (error as any).context.json()
            throw new Error(body.error || JSON.stringify(body))
          } catch (e) {
            try {
              const text = await (error as any).context.text()
              throw new Error(text || error.message)
            } catch (inner) {
              throw error
            }
          }
        }
        throw error
      }
      if (data?.error) throw new Error(data.error)
      
      const { data: paymentsData } = await supabase.from('monthly_payments').select('*').neq('status', 'paid')
      setPendingPayments(paymentsData || [])
      alert('Cobrança emitida com sucesso no gateway! 🚀')
    } catch (err: any) {
      console.error('Erro ao emitir cobrança:', err)
      alert('Aviso: Não foi possível emitir boleto/Pix automaticamente. Erro: ' + (err.message || err))
    } finally {
      setGeneratingBillingId(null)
    }
  }

  async function loadData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(profileData)
        
        let adminId = user.id
        if (profileData && profileData.role === 'secretary') {
          const { data: teamData } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('email', user.email)
            .maybeSingle()
          if (teamData) {
            adminId = teamData.user_id
          }
        }
        setSchoolAdminId(adminId)
      }

      // Load settings (to get discount_due_day, pay_on_holidays, open_on_holidays) and students for payment forecast
      const { data: settingsData } = await supabase.from('school_settings').select('discount_due_day, pay_on_holidays, open_on_holidays, gateway_type').limit(1).maybeSingle()
      let payHolidaysVal = true
      let openHolidaysVal = false
      if (settingsData) {
        setDiscountDueDay(settingsData.discount_due_day || 10)
        payHolidaysVal = settingsData.pay_on_holidays !== undefined ? settingsData.pay_on_holidays : true
        openHolidaysVal = settingsData.open_on_holidays !== undefined ? settingsData.open_on_holidays : false
        setPayOnHolidays(payHolidaysVal)
        setOpenOnHolidays(openHolidaysVal)
        if (settingsData.gateway_type) {
          setGatewayType(settingsData.gateway_type as any)
        }
      }

      // Fetch custom holidays
      const { data: customHolidaysData } = await supabase.from('school_holidays').select('*')
      const fetchedCustomHolidays = customHolidaysData || []
      setCustomHolidays(fetchedCustomHolidays)

      const { data: allStudents } = await supabase.from('students').select('*')
      setStudents(allStudents || [])

      const { data: membersList } = await supabase.from('team_members').select('*').or('role.eq.instructor,role.eq.Professor').eq('status', 'active')
      setInstructors(membersList || [])
      if (membersList && membersList.length > 0) {
        setSelectedInstructorId(prev => prev || membersList[0].id)
      }

      // Fetch all classes schedule to calculate teacher class schedule in current month
      const { data: allClasses } = await supabase.from('dance_classes').select('*')

      if (activeTab === 'events') {
        const { data: eventsData } = await supabase.from('events').select('*').order('date', { ascending: true })
        setEvents(eventsData || [])
        const { data: participantsData } = await supabase.from('event_participants').select('*')
        setEventParticipants(participantsData || [])
      } else if (activeTab === 'payroll') {
        const { data: att } = await supabase.from('attendance').select('*').eq('type', 'instructor').eq('status', 'present')
        const { data: teamAtt } = await supabase.from('team_attendance').select('*').in('status', ['present', 'late'])
        
        const currentMonth = new Date().toISOString().slice(0, 7)
        const monthAtt = (att || []).filter(a => a.date.startsWith(currentMonth))
        const monthTeamAtt = (teamAtt || []).filter(a => a.date.startsWith(currentMonth))

        const calculated = (membersList || []).map(m => {
          // Parse teacher class schedule
          const teacherClasses = (allClasses || []).filter(c => c.instructor_id === m.id)
          const weeklyCounts: Record<string, number> = {}
          const weekdaysList = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']
          weekdaysList.forEach(d => { weeklyCounts[d] = 0 })
          
          const abbrMap: Record<string, string> = {
            'seg': 'segunda', 'ter': 'terça', 'qua': 'quarta', 'qui': 'quinta', 'sex': 'sexta', 'sáb': 'sábado', 'dom': 'domingo'
          }

          teacherClasses.forEach(c => {
            const sched = (c.schedule || '').toLowerCase()
            Object.entries(abbrMap).forEach(([abbr, fullName]) => {
              if (sched.includes(abbr)) {
                weeklyCounts[fullName] += 1
              }
            })
          })

          const teacherAtt = monthAtt.filter(a => a.instructor_id === m.id)
          const teacherTeamAtt = monthTeamAtt.filter(a => a.member_id === m.id)

          const classDates = teacherAtt.map(a => a.date)
          const teamDates = teacherTeamAtt.map(a => a.date)
          const allWorkedDates = new Set([...classDates, ...teamDates])

          let classesCount = teacherAtt.length
          let uniqueDays = allWorkedDates.size

          // Add holiday compensation if configured
          if (payHolidaysVal && !openHolidaysVal) {
            const holidays = getHolidaysForYear(new Date().getFullYear(), fetchedCustomHolidays)
            const numDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
            const dayMap: Record<number, string> = {
              0: 'domingo', 1: 'segunda', 2: 'terça', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sábado'
            }
            const currentYear = new Date().getFullYear()
            const currentMonthIdx = new Date().getMonth()
            
            for (let d = 1; d <= numDays; d++) {
              const dateStr = `${currentYear}-${(currentMonthIdx + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
              if (holidays.has(dateStr)) {
                const date = new Date(currentYear, currentMonthIdx, d, 12, 0, 0)
                const dayOfWeek = date.getDay()
                const dayName = dayMap[dayOfWeek]
                
                if (weeklyCounts[dayName] > 0) {
                  classesCount += weeklyCounts[dayName]
                }
              }
            }
          }

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
      } else if (activeTab === 'reconciliation') {
        const { data: paymentsData } = await supabase.from('monthly_payments').select('*').neq('status', 'paid')
        setPendingPayments(paymentsData || [])
      } else {
        const { data: entriesData } = await supabase.from('financial_entries').select('*').order('date', { ascending: false })
        setEntries(entriesData || [])

        const { data: fixedData } = await supabase.from('fixed_bills').select('*').order('due_day')
        setFixedBills(fixedData || [])

        const { data: monthsData } = await supabase.from('fixed_bill_months').select('*').order('month')
        setFixedBillMonths(monthsData || [])

        // Fetch payroll data for Expense Forecast calculation (attendance for elapsed days of the current month)
        const { data: att } = await supabase.from('attendance').select('*').eq('type', 'instructor').eq('status', 'present')
        const { data: teamAtt } = await supabase.from('team_attendance').select('*').in('status', ['present', 'late'])
        const currentMonth = new Date().toISOString().slice(0, 7)
        const monthAtt = (att || []).filter(a => a.date.startsWith(currentMonth))
        const monthTeamAtt = (teamAtt || []).filter(a => a.date.startsWith(currentMonth))

        const currentYear = new Date().getFullYear()
        const currentMonthIdx = new Date().getMonth()
        const holidays = getHolidaysForYear(currentYear, fetchedCustomHolidays)
        const numDays = new Date(currentYear, currentMonthIdx + 1, 0).getDate()
        const dayMap: Record<number, string> = {
          0: 'domingo', 1: 'segunda', 2: 'terça', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sábado'
        }

        const calculated = (membersList || []).map(m => {
          // Parse teacher class schedule
          const teacherClasses = (allClasses || []).filter(c => c.instructor_id === m.id)
          const weeklyCounts: Record<string, number> = {}
          const weekdaysList = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']
          weekdaysList.forEach(d => { weeklyCounts[d] = 0 })
          
          const abbrMap: Record<string, string> = {
            'seg': 'segunda', 'ter': 'terça', 'qua': 'quarta', 'qui': 'quinta', 'sex': 'sexta', 'sáb': 'sábado', 'dom': 'domingo'
          }

          teacherClasses.forEach(c => {
            const sched = (c.schedule || '').toLowerCase()
            Object.entries(abbrMap).forEach(([abbr, fullName]) => {
              if (sched.includes(abbr)) {
                weeklyCounts[fullName] += 1
              }
            })
          })

          // Calculate projection/realized hybrid of days and classes for the current month
          let uniqueDays = 0
          let classesCount = 0
          const workedDates = new Set<number>()

          // Filter actual attendance for this teacher
          const instructorAttList = monthAtt.filter(a => a.instructor_id === m.id)
          const attClassesByDate: Record<string, number> = {}
          instructorAttList.forEach(a => {
            attClassesByDate[a.date] = (attClassesByDate[a.date] || 0) + 1
          })

          const instructorTeamAttList = monthTeamAtt.filter(a => a.member_id === m.id)
          const teamAttDates = new Set(instructorTeamAttList.map(a => a.date))

          const todayDay = new Date().getDate()

          for (let d = 1; d <= numDays; d++) {
            const dateStr = `${currentYear}-${(currentMonthIdx + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
            const isHoliday = holidays.has(dateStr)

            const date = new Date(currentYear, currentMonthIdx, d, 12, 0, 0)
            const dayOfWeek = date.getDay()
            const dayName = dayMap[dayOfWeek]
            
            if (d < todayDay) {
              // Past days: use actual attendance recorded (class or team presence)
              if (attClassesByDate[dateStr] > 0 || teamAttDates.has(dateStr)) {
                workedDates.add(d)
                classesCount += attClassesByDate[dateStr] || 0
              }
            } else {
              // Today and future days: use schedule projection
              if (weeklyCounts[dayName] > 0) {
                if (isHoliday) {
                  if (openHolidaysVal) {
                    workedDates.add(d)
                    classesCount += weeklyCounts[dayName]
                  } else {
                    if (payHolidaysVal) {
                      classesCount += weeklyCounts[dayName]
                    }
                  }
                } else {
                  workedDates.add(d)
                  classesCount += weeklyCounts[dayName]
                }
              }
            }
          }

          uniqueDays = workedDates.size

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

  const todayDay = new Date().getDate()
  const isBeforeDiscount = todayDay <= discountDueDay

  const previsaoPagamentos = students
    .filter(s => s.status === 'active' || s.status === 'partial_scholarship')
    .reduce((sum, s) => {
      const fee = isBeforeDiscount && s.discount_monthly_fee && s.discount_monthly_fee > 0
        ? Number(s.discount_monthly_fee)
        : Number(s.monthly_fee || 0)
      return sum + fee
    }, 0)

  const fixedBillsTotal = fixedBills
    .filter(bill => bill.active)
    .reduce((sum, bill) => sum + getFixedBillAmountForMonth(bill.id, currentMonthStr, bill.amount), 0)

  const previsaoGastos = fixedBillsTotal + payrollTotal

  const filteredEntries = entries.filter((e) => filter === 'all' || e.type === filter)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: any = { 
      ...formData, 
      amount: parseFloat(formData.amount) 
    }
    if (profile?.role === 'secretary' && schoolAdminId) {
      payload.user_id = schoolAdminId
    }
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
      const monthAmount = getFixedBillAmountForMonth(bill.id, currentMonthStr, bill.amount)
      const payload = {
        type: 'expense',
        category: bill.category,
        description: `[FIXA] ${bill.description}`,
        amount: monthAmount,
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

  function getFixedBillAmountForMonth(billId: string, month: string, defaultAmount: number): number {
    const override = fixedBillMonths.find(m => m.fixed_bill_id === billId && m.month === month)
    return override ? Number(override.amount) : defaultAmount
  }

  async function saveMonthAmount(billId: string, month: string, amount: number) {
    const existing = fixedBillMonths.find(m => m.fixed_bill_id === billId && m.month === month)
    if (existing) {
      await supabase.from('fixed_bill_months').update({ amount }).eq('id', existing.id)
    } else {
      await supabase.from('fixed_bill_months').insert([{ fixed_bill_id: billId, month, amount }])
    }
    setEditingMonthBill(null)
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
      label: 'Entradas (Mês)',
      value: monthIncome,
      icon: ArrowUpCircle,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.15)',
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
    },
    {
      label: 'Saídas (Mês)',
      value: monthExpense,
      icon: ArrowDownCircle,
      color: '#f43f5e',
      bg: 'rgba(244,63,94,0.15)',
      gradient: 'linear-gradient(135deg, #f43f5e, #be123c)',
    },
    {
      label: 'Saldo do Mês',
      value: monthIncome - monthExpense,
      icon: DollarSign,
      color: (monthIncome - monthExpense) >= 0 ? '#10b981' : '#f43f5e',
      bg: (monthIncome - monthExpense) >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
      gradient: (monthIncome - monthExpense) >= 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f43f5e, #be123c)',
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
      value: previsaoPagamentos,
      icon: Users,
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.1)',
      gradient: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    },
    {
      label: 'Previsão de Gastos',
      value: previsaoGastos,
      icon: Wallet,
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.15)',
      gradient: 'linear-gradient(135deg, #fbbf24, #d97706)',
    },
  ]

  if (loading && entries.length === 0 && payrollData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--accent-color)' }} />
      </div>
    )
  }

  if (profile?.role === 'secretary') {
    return (
      <div className="flex flex-col pb-10">
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
            className="absolute -left-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-20"
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
                Financeiro
              </h1>
              <br />
              <p 
                className="font-bold inline-block py-3 sm:py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
                 style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: 'clamp(12px, 3vw, 32px)', paddingRight: 'clamp(12px, 3vw, 32px)' }}
              >
                Lançamento de novas receitas e despesas
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto w-full rounded-none p-8 sm:p-12 text-center border border-white/5 relative overflow-hidden mt-8" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="h-20 w-20 rounded-3xl mx-auto flex items-center justify-center mb-6 bg-purple-500/10 border border-purple-500/20">
            <DollarSign size={40} className="text-purple-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-wider">Novo Lançamento</h2>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Como Secretário(a), você possui acesso exclusivo para registrar novos lançamentos de fluxo de caixa (entradas e saídas) do DanceFlow.
          </p>
          <button
            onClick={() => { resetForm(); setEditEntry(null); setShowModal(true) }}
            className="flex items-center justify-center gap-3 rounded-2xl px-10 py-5 text-sm font-black text-white transition-all hover:scale-105 active:scale-95 shadow-xl mx-auto"
            style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
          >
            <Plus size={22} />
            CADASTRAR LANÇAMENTO
          </button>
        </div>

        {/* Modal Lançamento Comum */}
        <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditEntry(null); resetForm() }} title={editEntry ? 'Editar Entrada' : 'Nova Entrada'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tipo *</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'income' })}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
                  style={{
                    backgroundColor: formData.type === 'income' ? 'rgba(16,185,129,0.2)' : 'var(--bg-secondary)',
                    color: formData.type === 'income' ? '#10b981' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  Entrada (Receita)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'expense' })}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
                  style={{
                    backgroundColor: formData.type === 'expense' ? 'rgba(244,63,94,0.2)' : 'var(--bg-secondary)',
                    color: formData.type === 'expense' ? '#f43f5e' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  Saída (Despesa)
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Categoria *</label>
              <input
                required
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Mensalidade, Uniforme, Limpeza..."
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition-all"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Descrição *</label>
              <input
                required
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Mensalidade do aluno João..."
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition-all"
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Valor (R$) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0,00"
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition-all"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Data *</label>
                <input
                  required
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition-all [color-scheme:dark]"
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl px-6 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all"
              >
                Salvar Lançamento
              </button>
            </div>
          </form>
        </Modal>
      </div>
    )
  }

  // Métodos de Conciliação Bancária
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReconciliationFile(file)
    setProcessingFile(true)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const isOFX = file.name.toLowerCase().endsWith('.ofx')
      processExtratoText(text, isOFX)
    }
    reader.readAsText(file)
  }

  const processExtratoText = (text: string, isOFX: boolean) => {
    try {
      const items: any[] = []
      
      if (isOFX) {
        // Simple OFX parser using regex tags
        const transactions = text.split(/<STMTTRN>/i)
        // Skip header
        transactions.slice(1).forEach((tx, idx) => {
          const amountMatch = tx.match(/<TRNAMT>([\d.-]+)/i)
          const nameMatch = tx.match(/<NAME>([^<]+)/i) || tx.match(/<MEMO>([^<]+)/i)
          const dateMatch = tx.match(/<DTPOSTED>(\d{8})/i)

          if (amountMatch && nameMatch) {
            const amount = parseFloat(amountMatch[1])
            // Standardize credits (income only)
            if (amount > 0) {
              const description = nameMatch[1].trim()
              let rawDate = dateMatch ? dateMatch[1] : ''
              let formattedDate = new Date().toISOString().split('T')[0]
              if (rawDate.length === 8) {
                formattedDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
              }

              items.push(matchTransaction(idx.toString(), formattedDate, description, amount))
            }
          }
        })
      } else {
        // Simple CSV parser
        const lines = text.split('\n')
        lines.forEach((line, idx) => {
          if (!line.trim()) return
          const cells = line.split(/[;,]/)
          
          // Heuristics: Find a numeric credit amount and description
          let foundAmount = 0
          let description = ''
          let dateStr = new Date().toISOString().split('T')[0]

          // Loop columns to parse float
          cells.forEach((cell) => {
            const val = cell.trim()
            // Try to match amount
            const cleanVal = val.replace('R$', '').replace(' ', '').replace(',', '.')
            const num = parseFloat(cleanVal)
            if (!isNaN(num) && num > 0 && cleanVal.includes('.')) {
              foundAmount = num
            } else if (val.length > 4 && isNaN(Number(val)) && !val.includes('/') && !val.includes('-')) {
              description = val
            } else if (val.includes('/') || val.includes('-')) {
              // Try to identify date
              const cleanDate = val.split(' ')[0]
              if (cleanDate.includes('/')) {
                const parts = cleanDate.split('/')
                if (parts.length === 3) dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`
              } else if (cleanDate.includes('-') && cleanDate.length === 10) {
                dateStr = cleanDate
              }
            }
          })

          if (foundAmount > 0 && description) {
            items.push(matchTransaction(idx.toString(), dateStr, description, foundAmount))
          }
        })
      }

      setReconciledItems(items)
    } catch (err) {
      console.error(err)
      alert('Erro ao processar o extrato. Verifique se o formato está correto.')
    } finally {
      setProcessingFile(false)
    }
  }

  // Heuristic matching algorithm
  const matchTransaction = (id: string, date: string, description: string, amount: number) => {
    let matchedStudent: Student | null = null
    let matchedPayment: MonthlyPayment | null = null
    let status: 'exact' | 'warning' | 'none' = 'none'

    const descUpper = description.toUpperCase()

    // 1. Search students by name or guardian name in description
    const foundStudent = students.find((s) => {
      const nameMatch = s.name && descUpper.includes(s.name.toUpperCase())
      const guardianMatch = s.guardian_name && descUpper.includes(s.guardian_name.toUpperCase())
      return nameMatch || guardianMatch
    })

    if (foundStudent) {
      matchedStudent = foundStudent
      status = 'warning'

      // 2. Search pending payments for matching amount
      const studentPayments = pendingPayments.filter((p) => p.student_id === foundStudent.id)
      const exactAmountPayment = studentPayments.find(
        (p) => p.amount === amount || foundStudent.discount_monthly_fee === amount
      )

      if (exactAmountPayment) {
        matchedPayment = exactAmountPayment
        status = 'exact'
      } else if (studentPayments.length > 0) {
        matchedPayment = studentPayments[0] // Oldest pending
      }
    }

    return {
      id,
      date,
      description,
      amount,
      status,
      matchedStudent,
      matchedPayment,
      selectedStudentId: matchedStudent ? matchedStudent.id : '',
      selected: status === 'exact'
    }
  }

  const handleSimulateExtrato = () => {
    setProcessingFile(true)
    setTimeout(() => {
      const mockItems: any[] = []
      
      // Let's create dummy items using current active students if we have any
      const pendingStudents = students.filter(s => pendingPayments.some(p => p.student_id === s.id))
      
      if (pendingStudents.length > 0) {
        // Item 1: Exact match with monthly fee
        const s1 = pendingStudents[0]
        const p1 = pendingPayments.find(p => p.student_id === s1.id)!
        mockItems.push({
          id: 'sim-1',
          date: new Date().toISOString().split('T')[0],
          description: `PIX RECEBIDO - ${s1.name.toUpperCase()} RECORRENTE`,
          amount: p1.amount,
          status: 'exact',
          matchedStudent: s1,
          matchedPayment: p1,
          selectedStudentId: s1.id,
          selected: true
        })

        // Item 2: Matching name, mismatch/different amount (or discount fee)
        if (pendingStudents.length > 1) {
          const s2 = pendingStudents[1]
          const p2 = pendingPayments.find(p => p.student_id === s2.id)!
          const amount = s2.discount_monthly_fee && s2.discount_monthly_fee > 0 ? s2.discount_monthly_fee : p2.amount - 10
          mockItems.push({
            id: 'sim-2',
            date: new Date().toISOString().split('T')[0],
            description: `TED RECEBIDA - ${s2.guardian_name ? s2.guardian_name.toUpperCase() : s2.name.toUpperCase()}`,
            amount: amount,
            status: amount === s2.discount_monthly_fee ? 'exact' : 'warning',
            matchedStudent: s2,
            matchedPayment: p2,
            selectedStudentId: s2.id,
            selected: true
          })
        }
      }

      // Item 3: Unknown payer
      mockItems.push({
        id: 'sim-3',
        date: new Date().toISOString().split('T')[0],
        description: 'DEPOSITOS PIX - PAGADOR NAO IDENTIFICADO LTDA',
        amount: 150.00,
        status: 'none',
        matchedStudent: null,
        matchedPayment: null,
        selectedStudentId: '',
        selected: false
      })

      setReconciledItems(mockItems)
      setProcessingFile(false)
    }, 1000)
  }

  const handleBatchReconciliation = async () => {
    const selectedItems = reconciledItems.filter(item => item.selected && item.selectedStudentId)
    if (selectedItems.length === 0) {
      alert('Nenhuma mensalidade selecionada para conciliação.')
      return
    }

    setBatchSaving(true)
    let successCount = 0

    try {
      for (const item of selectedItems) {
        const studentId = item.selectedStudentId
        
        // Find or fallback payment
        let payment = item.matchedPayment
        if (!payment || payment.student_id !== studentId) {
          const payments = pendingPayments.filter(p => p.student_id === studentId)
          if (payments.length > 0) {
            payment = payments[0]
          }
        }

        const student = students.find(s => s.id === studentId)
        if (!student) continue

        const todayDate = new Date().toISOString().split('T')[0]

        if (payment) {
          // Give Baixa in Monthly Payment
          const { error: payError } = await supabase.from('monthly_payments').update({
            status: 'paid',
            paid_date: todayDate,
            amount: item.amount,
            payment_method: 'Conciliação Bancária'
          }).eq('id', payment.id)

          if (payError) {
            console.error('Erro ao atualizar mensalidade:', payError)
            continue
          }
        }

        // Register income in financial entries
        const { error: entryError } = await supabase.from('financial_entries').insert([{
          type: 'income',
          category: 'Mensalidades',
          description: `Mensalidade (Conciliação) - ${student.name}`,
          amount: item.amount,
          date: todayDate,
          is_fixed: false
        }])

        if (entryError) {
          console.error('Erro ao registrar entrada financeira:', entryError)
        } else {
          successCount++
        }
      }

      alert(`Sucesso! ${successCount} mensalidades foram conciliadas e lançadas no financeiro com sucesso!`)
      setReconciledItems([])
      setReconciliationFile(null)
      loadData()
    } catch (err) {
      console.error(err)
      alert('Ocorreu um erro ao processar a baixa em lote.')
    } finally {
      setBatchSaving(false)
    }
  }

  // Calculations for Annual Report
  const selectedInstructor = instructors.find(i => i.id === selectedInstructorId)
  const hourlyRate = selectedInstructor?.hourly_rate || 0
  const dailyTransport = selectedInstructor?.daily_transport || 0
  
  // Weekdays tracking for schedule summary and calendar calculation
  const weekdays = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']
  const weeklyClassCounts: Record<string, number> = {}
  weekdays.forEach(d => { weeklyClassCounts[d] = 0 })
  
  const dayAbbrMap: Record<string, string> = {
    'seg': 'segunda',
    'ter': 'terça',
    'qua': 'quarta',
    'qui': 'quinta',
    'sex': 'sexta',
    'sáb': 'sábado',
    'dom': 'domingo'
  }

  instructorClasses.forEach(c => {
    const sched = (c.schedule || '').toLowerCase()
    Object.entries(dayAbbrMap).forEach(([abbr, fullName]) => {
      if (sched.includes(abbr)) {
        weeklyClassCounts[fullName] += 1
      }
    })
  })

  const scheduleSummary = weekdays
    .filter(day => weeklyClassCounts[day] > 0)
    .map(day => `${day} ${weeklyClassCounts[day]} ${weeklyClassCounts[day] === 1 ? 'aula' : 'aulas'}`)
    .join(' | ') || 'Sem aulas configuradas'

  function getMonthDaysAndClasses(year: number, monthIdx: number, dayCounts: Record<string, number>) {
    let totalClassesCount = 0
    
    const numDays = new Date(year, monthIdx + 1, 0).getDate()
    const workedDates = new Set<number>()
    const scheduledDates = new Set<number>()
    const holidays = getHolidaysForYear(year)

    const dayMap: Record<number, string> = {
      0: 'domingo',
      1: 'segunda',
      2: 'terça',
      3: 'quarta',
      4: 'quinta',
      5: 'sexta',
      6: 'sábado'
    }

    for (let d = 1; d <= numDays; d++) {
      const dateStr = `${year}-${(monthIdx + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
      const isHoliday = holidays.has(dateStr)

      const date = new Date(year, monthIdx, d, 12, 0, 0)
      const dayOfWeek = date.getDay()
      const dayName = dayMap[dayOfWeek]
      
      if (dayCounts[dayName] > 0) {
        if (isHoliday) {
          if (openOnHolidays) {
            workedDates.add(d)
            scheduledDates.add(d)
            totalClassesCount += dayCounts[dayName]
          } else {
            if (payOnHolidays) {
              scheduledDates.add(d)
              totalClassesCount += dayCounts[dayName]
            }
          }
        } else {
          workedDates.add(d)
          scheduledDates.add(d)
          totalClassesCount += dayCounts[dayName]
        }
      }
    }

    return {
      workedDays: workedDates.size,
      scheduledDays: scheduledDates.size,
      classes: totalClassesCount
    }
  }

  const monthNames = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ]

  const annualTableData = monthNames.map((monthName, idx) => {
    let dias = 0
    let horas = 0
    let diasTrabalhados = 0

    if (viewMode === 'realized') {
      const monthPrefix = `${selectedYear}-${(idx + 1).toString().padStart(2, '0')}`
      const monthAtt = annualAttendance.filter(a => a.date.startsWith(monthPrefix))
      const monthTeamAtt = instructorTeamAttendance.filter(a => a.date.startsWith(monthPrefix))

      const classDates = monthAtt.map(a => a.date)
      const teamDates = monthTeamAtt.map(a => a.date)
      const allWorkedDates = new Set([...classDates, ...teamDates])
      
      dias = allWorkedDates.size
      diasTrabalhados = dias
      horas = monthAtt.length

      // Adiciona compensação de feriados no realizado se a escola paga no feriado mas fecha
      if (payOnHolidays && !openOnHolidays) {
        const holidays = getHolidaysForYear(selectedYear)
        const numDays = new Date(selectedYear, idx + 1, 0).getDate()
        const dayMap: Record<number, string> = {
          0: 'domingo', 1: 'segunda', 2: 'terça', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sábado'
        }
        
        for (let d = 1; d <= numDays; d++) {
          const dateStr = `${selectedYear}-${(idx + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
          if (holidays.has(dateStr)) {
            const date = new Date(selectedYear, idx, d, 12, 0, 0)
            const dayOfWeek = date.getDay()
            const dayName = dayMap[dayOfWeek]
            
            if (weeklyClassCounts[dayName] > 0) {
              horas += weeklyClassCounts[dayName]
              if (!allWorkedDates.has(dateStr)) {
                dias += 1 // Conta o feriado na exibição se não foi trabalhado (não estava em allWorkedDates)
              }
            }
          }
        }
      }
    } else {
      const proj = getMonthDaysAndClasses(selectedYear, idx, weeklyClassCounts)
      dias = proj.scheduledDays
      diasTrabalhados = proj.workedDays
      horas = proj.classes
    }

    const salario = horas * hourlyRate
    const passagem = diasTrabalhados * dailyTransport

    return {
      name: monthName,
      dias,
      horas,
      salario,
      passagem
    }
  })

  const totalAnnualDays = annualTableData.reduce((sum, m) => sum + m.dias, 0)
  const totalAnnualHours = annualTableData.reduce((sum, m) => sum + m.horas, 0)
  const totalAnnualSalary = annualTableData.reduce((sum, m) => sum + m.salario, 0)
  const totalAnnualTransport = annualTableData.reduce((sum, m) => sum + m.passagem, 0)

  return (
    <div className="flex flex-col pb-10">
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
          className="absolute -left-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-20"
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
              Financeiro
            </h1>
            <br />
            <p 
              className="font-bold inline-block py-3 sm:py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
               style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: 'clamp(12px, 3vw, 32px)', paddingRight: 'clamp(12px, 3vw, 32px)' }}
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
      <div className="flex flex-wrap gap-4 p-1 bg-black/20 rounded-2xl w-fit mb-12">
        <button
          onClick={() => setActiveTab('flow')}
          className={`px-12 py-4 text-sm font-bold transition-all rounded-2xl shadow-lg border ${
            activeTab === 'flow' ? 'font-black scale-105' : 'text-[var(--text-primary)] hover:text-white hover:bg-white/10'
          }`}
          style={{ 
            backgroundColor: activeTab === 'flow' ? 'var(--bg-card)' : 'rgba(0, 0, 0, 0.15)',
            borderColor: activeTab === 'flow' ? 'var(--accent-color)' : 'var(--border-color)',
            color: activeTab === 'flow' ? '#fff' : 'var(--text-primary)'
          }}
        >
          Fluxo de Caixa
        </button>
        <button
          onClick={() => setActiveTab('fixed')}
          className={`px-12 py-4 text-sm font-bold transition-all rounded-2xl shadow-lg border ${
            activeTab === 'fixed' ? 'font-black scale-105' : 'text-[var(--text-primary)] hover:text-white hover:bg-white/10'
          }`}
          style={{ 
            backgroundColor: activeTab === 'fixed' ? 'var(--bg-card)' : 'rgba(0, 0, 0, 0.15)',
            borderColor: activeTab === 'fixed' ? 'var(--accent-color)' : 'var(--border-color)',
            color: activeTab === 'fixed' ? '#fff' : 'var(--text-primary)'
          }}
        >
          Contas Fixas
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-12 py-4 text-sm font-bold transition-all rounded-2xl shadow-lg border ${
            activeTab === 'payroll' ? 'font-black scale-105' : 'text-[var(--text-primary)] hover:text-white hover:bg-white/10'
          }`}
          style={{ 
            backgroundColor: activeTab === 'payroll' ? 'var(--bg-card)' : 'rgba(0, 0, 0, 0.15)',
            borderColor: activeTab === 'payroll' ? 'var(--accent-color)' : 'var(--border-color)',
            color: activeTab === 'payroll' ? '#fff' : 'var(--text-primary)'
          }}
        >
          Pagamentos Equipe
        </button>
        {profile?.role !== 'secretary' && (
          <button
            onClick={() => setActiveTab('events')}
            className={`px-12 py-4 text-sm font-bold transition-all rounded-2xl shadow-lg border ${
              activeTab === 'events' ? 'font-black scale-105' : 'text-[var(--text-primary)] hover:text-white hover:bg-white/10'
            }`}
            style={{ 
              backgroundColor: activeTab === 'events' ? 'var(--bg-card)' : 'rgba(0, 0, 0, 0.15)',
              borderColor: activeTab === 'events' ? 'var(--accent-color)' : 'var(--border-color)',
              color: activeTab === 'events' ? '#fff' : 'var(--text-primary)'
            }}
          >
            Relatório de Eventos
          </button>
        )}
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`px-12 py-4 text-sm font-bold transition-all rounded-2xl shadow-lg border ${
            activeTab === 'reconciliation' ? 'font-black scale-105' : 'text-[var(--text-primary)] hover:text-white hover:bg-white/10'
          }`}
          style={{ 
            backgroundColor: activeTab === 'reconciliation' ? 'var(--bg-card)' : 'rgba(0, 0, 0, 0.15)',
            borderColor: activeTab === 'reconciliation' ? 'var(--accent-color)' : 'var(--border-color)',
            color: activeTab === 'reconciliation' ? '#fff' : 'var(--text-primary)'
          }}
        >
          Conciliação por Extrato
        </button>
      </div>

      {activeTab === 'flow' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="group relative overflow-hidden rounded-2xl p-8 sm:p-10 transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl"
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

          {/* Monthly Report */}
          <div className="rounded-none p-8 shadow-xl mb-8" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', marginTop: '48px' }}>
            <h3 className="text-lg font-black uppercase tracking-tighter mb-6" style={{ color: 'var(--accent-color)' }}>
              📊 Relatório de {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="space-y-6">
              {/* Income bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-emerald-400">Entradas</span>
                  <span className="text-sm font-black text-emerald-400">
                    R$ {monthIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-full h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.max(monthIncome, monthExpense) > 0 ? (monthIncome / Math.max(monthIncome, monthExpense)) * 100 : 0}%`,
                      background: 'linear-gradient(90deg, #10b981, #34d399)',
                    }}
                  />
                </div>
              </div>
              {/* Expense bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-rose-400">Saídas</span>
                  <span className="text-sm font-black text-rose-400">
                    R$ {monthExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-full h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(244,63,94,0.1)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.max(monthIncome, monthExpense) > 0 ? (monthExpense / Math.max(monthIncome, monthExpense)) * 100 : 0}%`,
                      background: 'linear-gradient(90deg, #f43f5e, #fb7185)',
                    }}
                  />
                </div>
              </div>
              {/* Net result */}
              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>Resultado do Mês</span>
                <span className={`text-xl font-black ${(monthIncome - monthExpense) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {(monthIncome - monthExpense) >= 0 ? '+' : ''} R$ {(monthIncome - monthExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
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
          <div className="rounded-none overflow-hidden shadow-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
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
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black uppercase tracking-tighter" style={{ color: 'var(--accent-color)' }}>Minhas Contas Fixas</h2>
            <button
              onClick={() => { setEditFixed(null); setFixedFormData({ description: '', amount: '', category: '', due_day: '1' }); setShowFixedModal(true) }}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all"
            >
              <Plus size={18} />
              Configurar Conta Fixa
            </button>
          </div>

          <div className="space-y-6">
            {fixedBills.length === 0 ? (
              <div className="py-12 text-center bg-black/20 rounded-2xl border border-dashed border-white/10">
                <p className="text-[var(--text-muted)]">Nenhuma conta fixa configurada.</p>
              </div>
            ) : (
              fixedBills.map(bill => {
                const isPaid = entries.some(e => e.fixed_bill_id === bill.id && e.date.startsWith(currentMonthStr))
                const currentAmount = getFixedBillAmountForMonth(bill.id, currentMonthStr, bill.amount)
                
                // Generate 6 months: 3 past + current + 2 future
                const months: string[] = []
                const now = new Date()
                for (let i = -2; i <= 3; i++) {
                  const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
                  months.push(d.toISOString().slice(0, 7))
                }

                return (
                  <div 
                    key={bill.id} 
                    className="rounded-3xl border overflow-hidden transition-all" 
                    style={{ 
                      backgroundColor: 'var(--bg-card)', 
                      borderColor: isPaid ? 'rgba(16,185,129,0.3)' : 'var(--border-color)',
                      opacity: bill.active ? 1 : 0.6
                    }}
                  >
                    {/* Header */}
                    <div className="p-6 flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleFixedPaid(bill, isPaid)}
                          className={`transition-all ${isPaid ? 'text-emerald-400' : 'text-[var(--text-muted)] hover:text-white'}`}
                        >
                          {isPaid ? <CheckCircle2 size={32} /> : <Circle size={32} />}
                        </button>
                        <div>
                          <h3 className="font-bold text-lg text-white leading-tight">{bill.description}</h3>
                          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Vence todo dia {bill.due_day} • Valor base: R$ {Number(bill.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-4">
                          <p className={`text-lg font-black ${isPaid ? 'text-emerald-400' : 'text-white'}`}>
                            R$ {currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {isPaid ? 'PAGO' : 'PENDENTE'}
                          </span>
                        </div>
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

                    {/* Month cards */}
                    <div className="px-6 pb-6">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Valores por Mês</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        {months.map(month => {
                          const mAmount = getFixedBillAmountForMonth(bill.id, month, bill.amount)
                          const isCurrent = month === currentMonthStr
                          const isEditing = editingMonthBill?.billId === bill.id && editingMonthBill?.month === month
                          const monthLabel = new Date(month + '-15').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
                          const monthPaid = entries.some(e => e.fixed_bill_id === bill.id && e.date.startsWith(month))

                          return (
                            <div
                              key={month}
                              className={`rounded-2xl p-3 text-center transition-all cursor-pointer hover:scale-105 ${isCurrent ? 'ring-2 ring-purple-500' : ''}`}
                              style={{
                                backgroundColor: monthPaid ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${monthPaid ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`,
                              }}
                              onClick={() => {
                                if (!isEditing) {
                                  setEditingMonthBill({ billId: bill.id, month, amount: mAmount.toString() })
                                }
                              }}
                            >
                              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isCurrent ? 'text-purple-400' : ''}`} style={{ color: isCurrent ? undefined : 'var(--text-muted)' }}>
                                {monthLabel}
                              </p>
                              {isEditing ? (
                                <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editingMonthBill.amount}
                                    onChange={e => setEditingMonthBill({ ...editingMonthBill, amount: e.target.value })}
                                    className="w-full rounded-lg px-2 py-1 text-xs text-center font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') saveMonthAmount(bill.id, month, parseFloat(editingMonthBill.amount) || 0)
                                      if (e.key === 'Escape') setEditingMonthBill(null)
                                    }}
                                  />
                                  <button
                                    onClick={() => saveMonthAmount(bill.id, month, parseFloat(editingMonthBill.amount) || 0)}
                                    className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                                  >
                                    ✓ Salvar
                                  </button>
                                </div>
                              ) : (
                                <p className={`text-sm font-black ${monthPaid ? 'text-emerald-400' : 'text-white'}`}>
                                  R$ {mAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
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
          {/* Sub-abas */}
          <div className="flex gap-3 border-b border-white/5 pb-4">
            <button
              onClick={() => setPayrollSubTab('summary')}
              className={`px-6 py-2 text-xs font-bold transition-all rounded-xl border ${
                payrollSubTab === 'summary'
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 font-black'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              Resumo Mensal (Atual)
            </button>
            <button
              onClick={() => setPayrollSubTab('annual')}
              className={`px-6 py-2 text-xs font-bold transition-all rounded-xl border ${
                payrollSubTab === 'annual'
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 font-black'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              Histórico Anual / Simulador (Novo)
            </button>
          </div>

          {payrollSubTab === 'summary' ? (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tighter" style={{ color: 'var(--accent-color)' }}>Resumo de Pagamentos - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
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
                      className="p-8 rounded-none border border-white/5 shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.01]"
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

                        <div className="w-full lg:w-72 p-8 sm:p-10 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-center items-center text-center">
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
            </>
          ) : (
            <>
              {/* Seletor de Modo de Visualização e Custo */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/10 p-4 rounded-3xl border border-white/5 mb-6">
                <div className="flex gap-2 p-1 bg-black/20 rounded-2xl border border-white/5 w-fit">
                  <button
                    onClick={() => setViewMode('projected')}
                    className={`px-6 py-2.5 text-xs font-bold transition-all rounded-xl ${
                      viewMode === 'projected' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                  >
                    Visualizar Projeção (Previsão)
                  </button>
                  <button
                    onClick={() => setViewMode('realized')}
                    className={`px-6 py-2.5 text-xs font-bold transition-all rounded-xl ${
                      viewMode === 'realized' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                  >
                    Visualizar Realizado (Frequência)
                  </button>
                </div>
                
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] block">
                    Custo Total {viewMode === 'projected' ? 'Projetado' : 'Realizado'} (Ano)
                  </span>
                  <span className="text-xl font-black text-white">
                    R$ {(totalAnnualSalary + totalAnnualTransport).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Cabeçalho da Planilha de Referência */}
              <div className="rounded-3xl border border-white/10 overflow-hidden mb-8" style={{ backgroundColor: 'var(--bg-card)' }}>
                {/* Linha 1 */}
                <div className="grid grid-cols-5 text-center text-xs font-bold divide-x divide-white/10 bg-white/5 border-b border-white/10">
                  <div className="py-4 uppercase text-[var(--text-muted)] tracking-wider">Hora Aula</div>
                  <div className="py-4 text-emerald-400 text-sm font-black">R$ {hourlyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <div className="py-4 text-purple-400 text-sm font-black uppercase tracking-wider">{selectedInstructor?.name || '-'}</div>
                  <div className="py-4 uppercase text-[var(--text-muted)] tracking-wider">Passagem</div>
                  <div className="py-4 text-blue-400 text-sm font-black">R$ {dailyTransport.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
                
                {/* Linha 2 */}
                <div className="grid grid-cols-5 text-center text-xs divide-x divide-white/10 bg-purple-900/10 items-center border-b border-white/10">
                  <div className="col-span-2 py-4 px-4 flex items-center justify-center gap-3">
                    <select
                      value={selectedInstructorId}
                      onChange={(e) => setSelectedInstructorId(e.target.value)}
                      className="rounded-xl px-4 py-2 text-xs bg-[#1a1a2e] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-purple-500/30 font-bold cursor-pointer"
                    >
                      <option value="" disabled>-- Selecionar Professor --</option>
                      {instructors.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                    
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="rounded-xl px-4 py-2 text-xs bg-[#1a1a2e] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-purple-500/30 font-bold cursor-pointer"
                    >
                      {[2025, 2026, 2027, 2028].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="py-4 text-white/20">-</div>
                  <div className="col-span-2 py-4 text-purple-300 font-bold text-xs truncate px-4" title={scheduleSummary}>
                    📅 {scheduleSummary}
                  </div>
                </div>

                {/* Tabela de 12 Meses */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-black/40 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] border-b border-white/10">
                        <th className="py-3 px-6">Mês</th>
                        <th className="py-3 px-6 text-center">Dias</th>
                        <th className="py-3 px-6 text-center">Horas</th>
                        <th className="py-3 px-6 text-right">Salário</th>
                        <th className="py-3 px-6 text-right">Passagem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm font-semibold">
                      {annualTableData.map((row) => (
                        <tr key={row.name} className="transition-colors hover:bg-white/[0.02]">
                          <td className="py-4 px-6 text-white font-black">{row.name}</td>
                          <td className="py-4 px-6 text-center text-[var(--text-secondary)]">{row.dias}</td>
                          <td className="py-4 px-6 text-center text-[var(--text-secondary)]">{row.horas}</td>
                          <td className="py-4 px-6 text-right text-emerald-400 font-bold">
                            R$ {row.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-right text-blue-400 font-bold">
                            R$ {row.passagem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {/* Totais do Rodapé */}
                      <tr className="bg-white/5 text-sm font-black border-t border-white/20">
                        <td className="py-4 px-6 text-purple-400 uppercase tracking-widest text-xs">Total Geral</td>
                        <td className="py-4 px-6 text-center text-white">{totalAnnualDays}</td>
                        <td className="py-4 px-6 text-center text-white">{totalAnnualHours}</td>
                        <td className="py-4 px-6 text-right text-emerald-400">
                          R$ {totalAnnualSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-right text-blue-400">
                          R$ {totalAnnualTransport.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black uppercase tracking-tighter" style={{ color: 'var(--accent-color)' }}>Relatório Financeiro de Eventos</h2>
          </div>

          {/* Consolidated Event Cards */}
          {(() => {
            const consolidatedCost = events.reduce((sum, ev) => sum + (Number(ev.cost) || 0), 0)
            const consolidatedExpected = eventParticipants.reduce((sum, p) => sum + (Number(p.total_value) || 0), 0)
            const consolidatedPaid = eventParticipants.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0)
            const consolidatedBalance = consolidatedPaid - consolidatedCost

            return (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Projected Revenue */}
                <div
                  className="group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                >
                  <div className="flex flex-col items-center justify-center h-28 text-center gap-2 relative z-10">
                    <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}>
                      <TrendingUp size={26} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-blue-400">
                        R$ {consolidatedExpected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Faturamento Previsto</p>
                    </div>
                  </div>
                  <div className="absolute left-0 top-0 h-full w-1" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }} />
                </div>

                {/* Received Revenue */}
                <div
                  className="group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                >
                  <div className="flex flex-col items-center justify-center h-28 text-center gap-2 relative z-10">
                    <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}>
                      <CheckCircle2 size={26} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-emerald-400">
                        R$ {consolidatedPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Faturamento Recebido</p>
                    </div>
                  </div>
                  <div className="absolute left-0 top-0 h-full w-1" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} />
                </div>

                {/* Total Event Costs */}
                <div
                  className="group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                >
                  <div className="flex flex-col items-center justify-center h-28 text-center gap-2 relative z-10">
                    <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(244,63,94,0.15)' }}>
                      <TrendingDown size={26} className="text-rose-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-rose-400">
                        R$ {consolidatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Custos Acumulados</p>
                    </div>
                  </div>
                  <div className="absolute left-0 top-0 h-full w-1" style={{ background: 'linear-gradient(135deg, #f43f5e, #be123c)' }} />
                </div>

                {/* Net Result */}
                <div
                  className="group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                >
                  <div className="flex flex-col items-center justify-center h-28 text-center gap-2 relative z-10">
                    <div className="rounded-xl p-3" style={{ backgroundColor: consolidatedBalance >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)' }}>
                      <DollarSign size={26} style={{ color: consolidatedBalance >= 0 ? '#10b981' : '#f43f5e' }} />
                    </div>
                    <div>
                      <p className="text-2xl font-black" style={{ color: consolidatedBalance >= 0 ? '#10b981' : '#f43f5e' }}>
                        R$ {consolidatedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Saldo Líquido (Pago)</p>
                    </div>
                  </div>
                  <div className="absolute left-0 top-0 h-full w-1" style={{ background: consolidatedBalance >= 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f43f5e, #be123c)' }} />
                </div>
              </div>
            )
          })()}

          {/* Detailed Events Table */}
          <div className="rounded-none overflow-hidden shadow-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }} className="bg-black/20">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Nome do Evento</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] text-center">Data</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] text-center">Inscritos</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] text-right">Custo</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] text-right">Faturamento Previsto</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] text-right">Faturamento Recebido</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] text-right">Saldo Líquido (Pago)</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] text-center">Planilha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-sm text-[var(--text-muted)]">
                        Nenhum evento registrado.
                      </td>
                    </tr>
                  ) : (
                    events.map((ev) => {
                      const evParticipants = eventParticipants.filter(p => p.event_id === ev.id)
                      const subscribersCount = evParticipants.length
                      const cost = Number(ev.cost) || 0
                      const expected = evParticipants.reduce((sum, p) => sum + (Number(p.total_value) || 0), 0)
                      const paid = evParticipants.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0)
                      const balance = paid - cost

                      return (
                        <tr key={ev.id} className="transition-colors hover:bg-white/5">
                          <td className="px-6 py-4 font-bold text-white">{ev.name}</td>
                          <td className="px-6 py-4 text-center text-sm text-[var(--text-secondary)]">
                            {new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-bold text-white">
                            {subscribersCount}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-rose-400 font-bold">
                            R$ {cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-blue-400 font-bold">
                            R$ {expected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-emerald-400 font-bold">
                            R$ {paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`px-6 py-4 text-right text-sm font-black ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <a
                              href="/events"
                              className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider px-3 py-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-all"
                            >
                              Acessar Planilha →
                            </a>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reconciliation' && (
        <div className="space-y-8">
          <div className="p-6 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ backgroundColor: 'var(--accent-color)', borderColor: 'var(--border-color)', color: '#fff' }}>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter text-white">Conciliação de Extrato Bancário</h2>
              <p className="text-xs mt-1 text-white/90">Dê baixa em lote nas mensalidades dos alunos fazendo upload do extrato de qualquer banco (CSV ou OFX).</p>
            </div>
            {reconciledItems.length > 0 && (
              <button
                onClick={() => { setReconciledItems([]); setReconciliationFile(null) }}
                className="rounded-xl px-4 py-2 text-xs font-bold bg-white/10 border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2 text-white"
              >
                <RefreshCw size={14} />
                Limpar Extrato
              </button>
            )}
          </div>

          <div className="h-6"></div> {/* Espaçador físico infalível */}

          {reconciledItems.length === 0 ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upload Card */}
                <div 
                  className="lg:col-span-2 rounded-2xl p-10 border border-dashed text-center flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden group hover:border-[var(--accent-color)] transition-all"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                >
                  <div className="p-4 rounded-full mb-4 group-hover:scale-110 transition-all" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-color)' }}>
                    <UploadCloud size={40} />
                  </div>
                  <h3 className="font-bold text-lg mb-1.5" style={{ color: 'var(--text-primary)' }}>Enviar arquivo de extrato</h3>
                  <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-6 leading-relaxed">
                    Arraste e solte o extrato em formato <strong>OFX ou CSV</strong> do seu banco. Nosso algoritmo inteligente fará a correspondência automática de pagamentos.
                  </p>
                  <label className="cursor-pointer px-6 py-3 text-white font-bold rounded-xl text-xs transition-all shadow-lg hover:brightness-110 active:scale-95" style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}>
                    Selecionar Arquivo
                    <input
                      type="file"
                      accept=".csv,.ofx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Informational Help Card */}
                <div 
                  className="rounded-2xl p-6 border flex flex-col justify-between"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                >
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--accent-color)' }}>🏦 Como funciona?</h4>
                    <ul className="space-y-3.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                      <li className="flex gap-2">
                        <span className="shrink-0 font-bold" style={{ color: 'var(--accent-color)' }}>1.</span>
                        <span>Entre no seu banco (Cora, Itaú, Nubank, Bradesco, Inter, etc.) e baixe o extrato diário.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 font-bold" style={{ color: 'var(--accent-color)' }}>2.</span>
                        <span>Faça o upload do arquivo ao lado. Nosso sistema lerá os créditos (entradas).</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 font-bold" style={{ color: 'var(--accent-color)' }}>3.</span>
                        <span>O sistema cruzará nomes dos alunos e valores de mensalidades na hora!</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 font-bold" style={{ color: 'var(--accent-color)' }}>4.</span>
                        <span>Você confere a planilha, seleciona os corretos e dá baixa em lote com 1 clique.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-6 border-t space-y-3" style={{ borderColor: 'var(--border-color)' }}>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Quer testar o funcionamento agora mesmo sem um arquivo real?</p>
                    <button
                      onClick={handleSimulateExtrato}
                      disabled={processingFile}
                      className="w-full py-3 bg-white/5 border hover:bg-white/10 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      {processingFile ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-white" />
                      ) : (
                        <>
                          <FileText size={14} />
                          Gerar Extrato de Teste (Simulador)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Mensalidades em Aberto Section */}
              <div className="rounded-2xl border border-white/5 bg-[#141425] p-6 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tighter text-white">Mensalidades em Aberto</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Monitore as cobranças pendentes e envie os boletos/Pix diretamente para os pais dos alunos.</p>
                  </div>
                  {gatewayType !== 'none' && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      ⚡ Automação {gatewayType === 'asaas' ? 'Asaas' : 'Banco Cora'} Ativa
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 uppercase tracking-wider text-[10px]" style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)' }}>
                        <th className="py-3 px-4">Aluno</th>
                        <th className="py-3 px-4">Mês de Referência</th>
                        <th className="py-3 px-4">Data Vencimento</th>
                        <th className="py-3 px-4 text-right">Valor Original</th>
                        <th className="py-3 px-4 text-center">Boleto / Pix</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingPayments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs italic" style={{ color: 'var(--text-muted)' }}>
                            Nenhuma mensalidade em aberto no momento.
                          </td>
                        </tr>
                      ) : (
                        pendingPayments.map((p) => {
                          const student = students.find((s) => s.id === p.student_id);
                          const studentName = student ? student.name : 'Aluno Removido';
                          const hasDiscount = student && student.discount_monthly_fee && student.discount_monthly_fee > 0;
                          
                          // Check discount eligibility
                          let isEligible = false;
                          let limitDateStr = '';
                          if (hasDiscount && p.reference_month) {
                            const [yr, mn] = p.reference_month.split('-');
                            const limitDate = new Date(parseInt(yr), parseInt(mn) - 1, discountDueDay, 23, 59, 59, 999);
                            isEligible = new Date() <= limitDate;
                            limitDateStr = new Date(parseInt(yr), parseInt(mn) - 1, discountDueDay).toLocaleDateString('pt-BR');
                          }

                          const displayAmount = (isEligible && student) ? student.discount_monthly_fee : p.amount;

                          return (
                            <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors text-white">
                              <td className="py-3 px-4 font-semibold">
                                {studentName}
                                {student?.guardian_name && (
                                  <span className="block text-[10px] text-[var(--text-muted)] font-normal">
                                    Resp: {student.guardian_name}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 capitalize font-mono text-[var(--text-secondary)]">
                                {new Date(p.reference_month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                              </td>
                              <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">
                                {new Date(p.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                {isEligible && (
                                  <span className="block text-[9px] text-emerald-400 font-bold uppercase">
                                    🌟 Desconto até {limitDateStr}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-bold">
                                R$ {Number(displayAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                {isEligible && (
                                  <span className="block text-[9px] line-through opacity-50 font-normal">
                                    R$ {Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {gatewayType === 'none' ? (
                                  <span className="text-[10px] text-[var(--text-muted)] italic">Configurações para boleto inativas</span>
                                ) : !p.gateway_id ? (
                                  <button
                                    onClick={() => triggerCreateBilling(p.id)}
                                    disabled={generatingBillingId === p.id}
                                    className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all mx-auto"
                                  >
                                    {generatingBillingId === p.id ? (
                                      <>
                                        <RefreshCw className="animate-spin" size={10} />
                                        Gerando...
                                      </>
                                    ) : (
                                      <>
                                        <CreditCard size={10} />
                                        Gerar Boleto & Pix
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <div className="flex justify-center gap-2">
                                    {p.pix_code && (
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(p.pix_code!);
                                          alert('Pix Copia e Cola copiado com sucesso! 🚀');
                                        }}
                                        className="inline-flex items-center gap-1 bg-teal-600/20 hover:bg-teal-600/40 text-teal-400 border border-teal-500/20 rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider transition-all"
                                        title="Copiar Pix"
                                      >
                                        <QrCode size={10} />
                                        Pix
                                      </button>
                                    )}
                                    {p.barcode && (
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(p.barcode!);
                                          alert('Código de barras copiado com sucesso! 🎫');
                                        }}
                                        className="inline-flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/20 rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider transition-all"
                                        title="Copiar Código de Barras"
                                      >
                                        <Copy size={10} />
                                        Boleto
                                      </button>
                                    )}
                                    {p.payment_url && (
                                      <a
                                        href={p.payment_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 bg-pink-600/20 hover:bg-pink-600/40 text-pink-400 border border-pink-500/20 rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider transition-all"
                                        title="Ver Boleto PDF"
                                      >
                                        <ExternalLink size={10} />
                                        PDF
                                      </a>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Confirmar baixa manual para ${studentName}?`)) return;
                                    try {
                                      const { error: payErr } = await supabase.from('monthly_payments').update({
                                        status: 'paid',
                                        paid_date: new Date().toISOString().split('T')[0],
                                        amount: displayAmount,
                                        payment_method: 'Manual'
                                      }).eq('id', p.id);

                                      if (payErr) throw payErr;

                                      // Register in financial entry
                                      await supabase.from('financial_entries').insert([{
                                        type: 'income',
                                        category: 'Mensalidades',
                                        description: `Mensalidade: ${studentName} - Ref: ${p.reference_month}${isEligible ? ' (Com Desconto)' : ''}`,
                                        amount: displayAmount,
                                        date: new Date().toISOString().split('T')[0]
                                      }]);

                                      // Reload
                                      const { data: paymentsData } = await supabase.from('monthly_payments').select('*').neq('status', 'paid');
                                      setPendingPayments(paymentsData || []);
                                      alert('Pagamento quitado e registrado no financeiro com sucesso! ✅💰');
                                    } catch (err: any) {
                                      alert('Erro ao quitar mensalidade: ' + err.message);
                                    }
                                  }}
                                  className="text-emerald-400 hover:text-emerald-300 font-bold hover:bg-emerald-500/10 px-2.5 py-1 rounded transition-all"
                                >
                                  Quitar
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Batch Action Header */}
              <div 
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border gap-4"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <div className="text-xs text-[var(--text-secondary)]">
                  Foram encontradas <strong>{reconciledItems.length} transações</strong> de entrada no extrato bancário.
                </div>
                <button
                  onClick={handleBatchReconciliation}
                  disabled={batchSaving || reconciledItems.filter(i => i.selected).length === 0}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                >
                  {batchSaving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-white" />
                  ) : (
                    <>
                      <Check size={14} />
                      Dar Baixa em Lote ({reconciledItems.filter(i => i.selected).length} selecionados)
                    </>
                  )}
                </button>
              </div>

              {/* Reconciliation Table */}
              <div className="rounded-2xl border border-white/5 bg-[#141425] overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider" style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)' }}>
                      <th className="py-4 px-6 text-center w-12">
                        <input
                          type="checkbox"
                          checked={reconciledItems.length > 0 && reconciledItems.every(i => i.selected)}
                          onChange={(e) => {
                            const val = e.target.checked
                            setReconciledItems(reconciledItems.map(i => ({ ...i, selected: val })))
                          }}
                          className="rounded border-white/20 bg-black/40 text-purple-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                      </th>
                      <th className="py-4 px-6">Data no Extrato</th>
                      <th className="py-4 px-6">Descrição da Transação</th>
                      <th className="py-4 px-6 text-right">Valor Pago</th>
                      <th className="py-4 px-6">Status do Cruzamento</th>
                      <th className="py-4 px-6">Aluno Correspondente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciledItems.map((item, index) => {
                      const isExact = item.status === 'exact'
                      const isWarning = item.status === 'warning'
                      const isNone = item.status === 'none'

                      return (
                        <tr 
                          key={item.id || index}
                          className="border-b border-white/5 text-xs transition-colors hover:bg-white/[0.01]"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <td className="py-4 px-6 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={(e) => {
                                const val = e.target.checked
                                setReconciledItems(reconciledItems.map(i => i.id === item.id ? { ...i, selected: val } : i))
                              }}
                              className="rounded border-white/20 bg-black/40 text-purple-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-4 px-6 font-mono text-[var(--text-secondary)]">
                            {new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-4 px-6 font-medium text-white truncate max-w-xs" title={item.description}>
                            {item.description}
                          </td>
                          <td className="py-4 px-6 text-right font-bold text-emerald-400">
                            R$ {Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6">
                            {isExact && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Check size={10} />
                                Correspondência Exata
                              </span>
                            )}
                            {isWarning && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <AlertCircle size={10} />
                                Nome Similar / Valor Diferente
                              </span>
                            )}
                            {isNone && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase bg-white/5 text-[var(--text-muted)] border border-white/10">
                                <HelpCircle size={10} />
                                Não Identificado
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <select
                              value={item.selectedStudentId}
                              onChange={(e) => {
                                const val = e.target.value
                                const student = students.find(s => s.id === val) || null
                                const payments = pendingPayments.filter(p => p.student_id === val)
                                const payment = payments.length > 0 ? payments[0] : null
                                
                                setReconciledItems(reconciledItems.map(i => i.id === item.id ? { 
                                  ...i, 
                                  selectedStudentId: val,
                                  matchedStudent: student,
                                  matchedPayment: payment,
                                  selected: !!val,
                                  status: student ? (i.amount === student.monthly_fee || i.amount === student.discount_monthly_fee ? 'exact' : 'warning') : 'none'
                                } : i))
                              }}
                              className="rounded-xl px-3 py-1.5 text-xs bg-[#1a1a2e] border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-purple-500/30 w-full max-w-xs"
                            >
                              <option value="">-- Vincular Aluno Manualmente --</option>
                              {students.map((st) => (
                                <option key={st.id} value={st.id}>
                                  {st.name} {st.guardian_name ? `(Resp: ${st.guardian_name})` : ''} - Mensalidade: R$ {Number(st.monthly_fee).toFixed(2)}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
