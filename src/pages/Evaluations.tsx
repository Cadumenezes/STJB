import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit, Trash2, Printer, Save, FileText, ClipboardCheck, ArrowRight, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Student, Exam, ExamGrade, DanceClass } from '../types'
import Modal from '../components/Modal'

export default function Evaluations() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'grades' | 'exams'>('grades')
  const [schoolOwnerId, setSchoolOwnerId] = useState<string | null>(null)
  const [teacherMemberId, setTeacherMemberId] = useState<string | null>(null)
  const [schoolInfo, setSchoolInfo] = useState<any>(null)

  // Data
  const [classes, setClasses] = useState<DanceClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [exams, setExams] = useState<Exam[]>([])
  const [selectedExamId, setSelectedExamId] = useState<string>('')
  const [students, setStudents] = useState<Student[]>([])
  
  // Grade Form state (maps student_id to its grade info)
  const [gradesState, setGradesState] = useState<Record<string, { grade: string, concept: string, feedback: string }>>({})

  // Exam Modal Form
  const [showExamModal, setShowExamModal] = useState(false)
  const [editExam, setEditExam] = useState<Exam | null>(null)
  const [examFormData, setExamFormData] = useState({
    name: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    class_id: ''
  })

  // Data for single student printing
  const [printGradeData, setPrintGradeData] = useState<{
    student: Student
    gradeInfo: { grade: string; concept: string; feedback: string }
    examName: string
    date: string
    className: string
    instructorName: string
  } | null>(null)

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
          setProfile(profileData)

          let ownerId = user.id
          if (profileData?.role === 'teacher') {
            const { data: teamMember } = await supabase
              .from('team_members')
              .select('id, user_id')
              .eq('email', profileData.email)
              .or('role.eq.instructor,role.eq.Professor')
              .eq('status', 'active')
              .maybeSingle()

            if (teamMember) {
              ownerId = teamMember.user_id
              setTeacherMemberId(teamMember.id)
            }
          } else if (profileData?.role === 'secretary') {
            const { data: teamMember } = await supabase
              .from('team_members')
              .select('user_id')
              .eq('email', profileData.email)
              .maybeSingle()

            if (teamMember) {
              ownerId = teamMember.user_id
            }
          }
          setSchoolOwnerId(ownerId)

          // Load School settings for header printing
          const { data: settings } = await supabase.from('school_settings').select('*').limit(1).maybeSingle()
          setSchoolInfo(settings)

          // Load Classes
          const { data: classesData } = await supabase.from('dance_classes').select('*').order('name')
          const fetchedClasses = classesData || []
          setClasses(fetchedClasses)

          // Pre-select first class if available
          if (profileData?.role === 'teacher' && fetchedClasses.length > 0) {
            // Find active teacher's class
            const { data: teacher } = await supabase
              .from('team_members')
              .select('id')
              .eq('email', profileData.email)
              .maybeSingle()
            
            const teacherClass = fetchedClasses.find(c => c.instructor_id === teacher?.id)
            setSelectedClassId(teacherClass?.id || fetchedClasses[0].id)
          } else if (fetchedClasses.length > 0) {
            setSelectedClassId(fetchedClasses[0].id)
          }
        }
      } catch (err) {
        console.error('Error loading initial data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  // Load Exams and Students when class selection changes
  useEffect(() => {
    if (selectedClassId) {
      loadClassRelatedData()
    } else {
      setExams([])
      setStudents([])
      setGradesState({})
    }
  }, [selectedClassId])

  // Load existing grades when exam selection changes
  useEffect(() => {
    if (selectedExamId) {
      loadExamGrades()
    } else {
      setGradesState({})
    }
  }, [selectedExamId])

  async function loadClassRelatedData() {
    try {
      // Load Exams for this class
      const { data: examsData } = await supabase
        .from('exams')
        .select('*')
        .eq('class_id', selectedClassId)
        .order('date', { ascending: false })
      
      const fetchedExams = examsData || []
      setExams(fetchedExams)
      if (fetchedExams.length > 0) {
        setSelectedExamId(fetchedExams[0].id)
      } else {
        setSelectedExamId('')
      }

      // Load Students in this class
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .contains('class_ids', [selectedClassId])
        .in('status', ['active', 'scholarship', 'partial_scholarship'])
      
      setStudents(studentsData || [])
    } catch (err) {
      console.error('Error loading class related data:', err)
    }
  }

  async function loadExamGrades() {
    try {
      const { data: gradesData } = await supabase
        .from('exam_grades')
        .select('*')
        .eq('exam_id', selectedExamId)

      const gradesMap: Record<string, { grade: string, concept: string, feedback: string }> = {}
      
      // Initialize for all current students
      students.forEach(s => {
        gradesMap[s.id] = { grade: '', concept: '', feedback: '' }
      })

      // Populate with saved grades
      if (gradesData) {
        gradesData.forEach((g: ExamGrade) => {
          gradesMap[g.student_id] = {
            grade: g.grade !== undefined && g.grade !== null ? String(g.grade) : '',
            concept: g.concept || '',
            feedback: g.feedback || ''
          }
        })
      }

      setGradesState(gradesMap)
    } catch (err) {
      console.error('Error loading exam grades:', err)
    }
  }

  // Load all exams for management tab
  const [allExamsList, setAllExamsList] = useState<any[]>([])
  useEffect(() => {
    if (activeTab === 'exams' && schoolOwnerId) {
      loadAllExams()
    }
  }, [activeTab, schoolOwnerId])

  async function loadAllExams() {
    try {
      const { data } = await supabase
        .from('exams')
        .select('*, dance_classes(name)')
        .order('date', { ascending: false })
      setAllExamsList(data || [])
    } catch (err) {
      console.error('Error loading all exams:', err)
    }
  }

  // Filtra as turmas para professores verem apenas as suas próprias turmas. Diretores e Secretárias veem todas.
  const filteredClasses = profile?.role === 'teacher' && teacherMemberId
    ? classes.filter(c => c.instructor_id === teacherMemberId)
    : classes

  const activeClass = classes.find(c => c.id === selectedClassId)
  const activeExam = exams.find(e => e.id === selectedExamId)

  // Handle Exam Save (Insert / Update)
  async function handleExamSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!schoolOwnerId) return

    setSaving(true)
    const payload: any = {
      name: examFormData.name,
      description: examFormData.description,
      date: examFormData.date,
      class_id: examFormData.class_id,
      user_id: schoolOwnerId
    }

    try {
      let error = null
      if (editExam) {
        const { error: err } = await supabase.from('exams').update(payload).eq('id', editExam.id)
        error = err
      } else {
        const { error: err } = await supabase.from('exams').insert([payload])
        error = err
      }

      if (error) throw error

      setShowExamModal(false)
      setEditExam(null)
      setExamFormData({ name: '', description: '', date: new Date().toISOString().split('T')[0], class_id: '' })
      
      // Reload lists
      if (activeTab === 'exams') {
        loadAllExams()
      } else {
        loadClassRelatedData()
      }
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar avaliação: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Delete Exam
  async function handleExamDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir esta avaliação? Todas as notas vinculadas serão apagadas!')) return

    try {
      const { error } = await supabase.from('exams').delete().eq('id', id)
      if (error) throw error
      
      if (activeTab === 'exams') {
        loadAllExams()
      } else {
        loadClassRelatedData()
      }
    } catch (err: any) {
      console.error(err)
      alert('Erro ao deletar avaliação: ' + err.message)
    }
  }

  // Handle Grades Save (Batch Upsert)
  async function handleSaveGrades() {
    if (!selectedExamId || !schoolOwnerId) return

    setSaving(true)
    const records = Object.entries(gradesState).map(([studentId, info]) => {
      return {
        exam_id: selectedExamId,
        student_id: studentId,
        grade: info.grade ? parseFloat(info.grade) : null,
        concept: info.concept || null,
        feedback: info.feedback || null,
        user_id: schoolOwnerId
      }
    })

    try {
      const { error } = await supabase
        .from('exam_grades')
        .upsert(records, { onConflict: 'exam_id,student_id' })

      if (error) throw error

      alert('Notas salvas com sucesso!')
      loadExamGrades()
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar notas: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Print single student grade sheet
  const handlePrintGrade = async (student: Student, gradeInfo: any) => {
    if (!activeExam) return
    
    // Get instructor name
    let instName = 'Não atribuído'
    if (activeClass?.instructor_id) {
      const { data: instructorData } = await supabase
        .from('team_members')
        .select('name')
        .eq('id', activeClass.instructor_id)
        .maybeSingle()
      
      if (instructorData) {
        instName = instructorData.name || 'Não atribuído'
      }
    }

    setPrintGradeData({
      student,
      gradeInfo,
      examName: activeExam.name,
      date: activeExam.date,
      className: activeClass?.name || '',
      instructorName: instName
    })

    setTimeout(() => {
      window.print()
      setPrintGradeData(null)
    }, 500)
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-12 w-12 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
      </div>
    )
  }

  const isTeacherOrSecretary = profile?.role === 'teacher' || profile?.role === 'secretary'

  return (
    <div className="space-y-8 no-print">
      {/* Header */}
      <div 
        className="p-5 sm:p-8 md:p-10 pb-10 sm:pb-16 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden" 
        style={{ 
          backgroundColor: 'rgba(255,255,255,0.03)', 
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="absolute -left-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-20" style={{ backgroundColor: 'var(--accent-color)' }} />
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
              Avaliações & Notas
            </h1>
            <br />
            <p 
              className="font-bold inline-block py-3 sm:py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
              style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: 'clamp(12px, 3vw, 32px)', paddingRight: 'clamp(12px, 3vw, 32px)' }}
            >
              Criação de avaliações, lançamento de conceitos e impressão de boletins
            </p>
          </div>

          {!isTeacherOrSecretary && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditExam(null)
                  setExamFormData({
                    name: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0],
                    class_id: selectedClassId || (classes.length > 0 ? classes[0].id : '')
                  })
                  setShowExamModal(true)
                }}
                className="flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/20"
                style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
              >
                <Plus size={26} />
                Nova Avaliação
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {!isTeacherOrSecretary && (
        <div className="w-full overflow-x-auto no-scrollbar mb-8 select-none">
          <div className="flex gap-2 p-1 bg-black/20 rounded-2xl w-fit whitespace-nowrap">
            <button
              onClick={() => setActiveTab('grades')}
              className={`px-12 py-4 text-sm font-bold transition-all rounded-2xl shadow-lg border ${
                activeTab === 'grades' ? 'font-black scale-105' : 'text-[var(--text-primary)] hover:text-white hover:bg-white/10'
              }`}
              style={{ 
                backgroundColor: activeTab === 'grades' ? 'var(--bg-card)' : 'rgba(0, 0, 0, 0.15)',
                borderColor: activeTab === 'grades' ? 'var(--accent-color)' : 'var(--border-color)',
                color: activeTab === 'grades' ? '#fff' : 'var(--text-primary)'
              }}
            >
              Lançar Notas
            </button>
            <button
              onClick={() => setActiveTab('exams')}
              className={`px-12 py-4 text-sm font-bold transition-all rounded-2xl shadow-lg border ${
                activeTab === 'exams' ? 'font-black scale-105' : 'text-[var(--text-primary)] hover:text-white hover:bg-white/10'
              }`}
              style={{ 
                backgroundColor: activeTab === 'exams' ? 'var(--bg-card)' : 'rgba(0, 0, 0, 0.15)',
                borderColor: activeTab === 'exams' ? 'var(--accent-color)' : 'var(--border-color)',
                color: activeTab === 'exams' ? '#fff' : 'var(--text-primary)'
              }}
            >
              Gerenciar Provas
            </button>
          </div>
        </div>
      )}

      {/* Tab: Lançar Notas */}
      {activeTab === 'grades' && (
        <div className="space-y-6">
          {/* selectors grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Selecionar Turma</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={inputStyle}
              >
                <option value="" className="bg-[#1e1b4b]">Escolha uma turma...</option>
                {filteredClasses.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#1e1b4b]">{c.name} ({c.style})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text-secondary)' }}>Selecionar Avaliação</label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={inputStyle}
                disabled={!selectedClassId}
              >
                <option value="" className="bg-[#1e1b4b]">Escolha uma avaliação...</option>
                {exams.map(e => (
                  <option key={e.id} value={e.id} className="bg-[#1e1b4b]">{e.name} ({new Date(e.date).toLocaleDateString('pt-BR')})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table of Students & Grades */}
          {selectedExamId ? (
            <div className="rounded-2xl overflow-hidden border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              {students.length > 0 ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                          <th className="p-4 font-bold" style={{ color: 'var(--text-secondary)' }}>Aluno</th>
                          <th className="p-4 font-bold w-28" style={{ color: 'var(--text-secondary)' }}>Nota (0-10)</th>
                          <th className="p-4 font-bold w-44" style={{ color: 'var(--text-secondary)' }}>Conceito</th>
                          <th className="p-4 font-bold" style={{ color: 'var(--text-secondary)' }}>Feedback / Observações</th>
                          <th className="p-4 font-bold text-center w-28" style={{ color: 'var(--text-secondary)' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => {
                          const state = gradesState[student.id] || { grade: '', concept: '', feedback: '' }
                          return (
                            <tr key={student.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                              <td className="p-4 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-purple-900/40 flex items-center justify-center border border-purple-500/30 overflow-hidden text-purple-300 font-black">
                                  {student.photo_url ? (
                                    <img src={student.photo_url} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <User size={18} />
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-white">{student.name}</div>
                                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Matrícula: {student.status === 'active' ? 'Ativo' : 'Bolsista'}</div>
                                </div>
                              </td>
                              <td className="p-4">
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  placeholder="0.0"
                                  value={state.grade}
                                  onChange={(e) => setGradesState({
                                    ...gradesState,
                                    [student.id]: { ...state, grade: e.target.value }
                                  })}
                                  className="w-20 rounded-lg px-2.5 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                  style={inputStyle}
                                />
                              </td>
                              <td className="p-4">
                                <select
                                  value={state.concept}
                                  onChange={(e) => setGradesState({
                                    ...gradesState,
                                    [student.id]: { ...state, concept: e.target.value }
                                  })}
                                  className="w-full rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                  style={inputStyle}
                                >
                                  <option value="" className="bg-[#1e1b4b]">Sem Conceito</option>
                                  <option value="Excelente" className="bg-[#1e1b4b] text-emerald-400">Excelente</option>
                                  <option value="Bom" className="bg-[#1e1b4b] text-blue-400">Bom</option>
                                  <option value="Regular" className="bg-[#1e1b4b] text-amber-400">Regular</option>
                                  <option value="Insuficiente" className="bg-[#1e1b4b] text-rose-400">Insuficiente</option>
                                </select>
                              </td>
                              <td className="p-4">
                                <input
                                  type="text"
                                  placeholder="Evolução técnica, dedicação, pontos a melhorar..."
                                  value={state.feedback}
                                  onChange={(e) => setGradesState({
                                    ...gradesState,
                                    [student.id]: { ...state, feedback: e.target.value }
                                  })}
                                  className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                  style={inputStyle}
                                />
                              </td>
                              <td className="p-4 text-center">
                                {(state.grade || state.concept || state.feedback) ? (
                                  <button
                                    onClick={() => handlePrintGrade(student, state)}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all shadow-md cursor-pointer"
                                    title="Imprimir Boletim / Ficha Individual"
                                  >
                                    <Printer size={16} />
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-500">-</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-black/10 flex justify-between items-center border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Total de alunos nesta turma: <b>{students.length}</b>. Lançamentos serão consolidados.
                    </p>
                    <button
                      onClick={handleSaveGrades}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-md shadow-purple-500/10"
                      style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
                    >
                      <Save size={16} />
                      {saving ? 'Salvando...' : 'Salvar Notas da Turma'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-400">
                  Nenhum aluno matriculado nesta turma.
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400 rounded-2xl border border-dashed border-white/10" style={{ backgroundColor: 'var(--bg-card)' }}>
              Selecione uma turma e uma avaliação para lançar as notas dos alunos.
            </div>
          )}
        </div>
      )}

      {/* Tab: Gerenciar Provas (Apenas Diretores) */}
      {activeTab === 'exams' && !isTeacherOrSecretary && (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            {allExamsList.length > 0 ? (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <th className="p-4 font-bold" style={{ color: 'var(--text-secondary)' }}>Avaliação</th>
                    <th className="p-4 font-bold" style={{ color: 'var(--text-secondary)' }}>Turma Vinculada</th>
                    <th className="p-4 font-bold" style={{ color: 'var(--text-secondary)' }}>Data da Prova</th>
                    <th className="p-4 font-bold" style={{ color: 'var(--text-secondary)' }}>Descrição</th>
                    <th className="p-4 font-bold text-right" style={{ color: 'var(--text-secondary)' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {allExamsList.map((exam) => (
                    <tr key={exam.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-4 font-bold text-white">{exam.name}</td>
                      <td className="p-4 text-purple-300 font-semibold">{exam.dance_classes?.name || 'Não informada'}</td>
                      <td className="p-4 text-gray-300">{new Date(exam.date).toLocaleDateString('pt-BR')}</td>
                      <td className="p-4 text-gray-400 max-w-xs truncate" title={exam.description}>{exam.description || '-'}</td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditExam(exam)
                            setExamFormData({
                              name: exam.name,
                              description: exam.description || '',
                              date: exam.date,
                              class_id: exam.class_id
                            })
                            setShowExamModal(true)
                          }}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-blue-400 hover:text-blue-300 transition-all cursor-pointer"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleExamDelete(exam.id)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-rose-500 hover:text-rose-400 transition-all cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-400">
                Nenhuma avaliação cadastrada no sistema. Clique em "Nova Avaliação" para começar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Nova/Editar Avaliação */}
      <Modal
        isOpen={showExamModal}
        onClose={() => setShowExamModal(false)}
        title={editExam ? 'Editar Avaliação' : 'Nova Avaliação'}
      >
        <form onSubmit={handleExamSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome da Avaliação / Prova *</label>
            <input
              required
              type="text"
              value={examFormData.name}
              onChange={(e) => setExamFormData({ ...examFormData, name: e.target.value })}
              placeholder="Ex: Prova Semestral de Ballet - Módulo 1"
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Turma Vinculada *</label>
              <select
                required
                value={examFormData.class_id}
                onChange={(e) => setExamFormData({ ...examFormData, class_id: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={inputStyle}
              >
                <option value="" className="bg-[#1e1b4b]">Escolha uma turma...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#1e1b4b]">{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Data da Prova *</label>
              <input
                required
                type="date"
                value={examFormData.date}
                onChange={(e) => setExamFormData({ ...examFormData, date: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Descrição / Conteúdo Programático</label>
            <textarea
              rows={3}
              value={examFormData.description}
              onChange={(e) => setExamFormData({ ...examFormData, description: e.target.value })}
              placeholder="Descreva as técnicas avaliadas ou observações importantes sobre esta prova..."
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              style={inputStyle}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowExamModal(false)}
              className="rounded-xl px-5 py-2.5 text-sm font-medium"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
            >
              {saving ? 'Salvando...' : 'Salvar Avaliação'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Estilos para Impressão */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-evaluation-report, #printable-evaluation-report * { visibility: visible; }
          #printable-evaluation-report {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 40px;
            background: white !important;
            color: black !important;
            font-family: 'Inter', sans-serif;
          }
          .no-print { display: none !important; }
        }
      `}} />

      {/* Template de Impressão (Ficha de Avaliação Individual) */}
      {printGradeData && createPortal(
        <div id="printable-evaluation-report" className="hidden print:block text-black">
          {/* Cabeçalho da Escola */}
          <div className="flex items-center justify-between border-b-2 border-gray-800 pb-6 mb-8">
            <div className="flex items-center gap-6">
              {schoolInfo?.logo_url && (
                <img src={schoolInfo.logo_url} alt="Logotipo" className="w-20 h-20 object-contain" />
              )}
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">{schoolInfo?.school_name || 'Escola de Dança'}</h1>
                <p className="text-xs text-gray-500 font-medium">Ficha de Avaliação Acadêmica de Dança</p>
                {schoolInfo?.cnpj && <p className="text-[10px] text-gray-600 mt-1"><b>CNPJ:</b> {schoolInfo.cnpj}</p>}
                {schoolInfo?.address && <p className="text-[10px] text-gray-600"><b>Endereço:</b> {schoolInfo.address}</p>}
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p><b>Emitido em:</b> {new Date().toLocaleDateString('pt-BR')}</p>
              <p><b>Sistema:</b> DanceFlow</p>
            </div>
          </div>

          {/* Dados do Aluno e Turma */}
          <div className="grid grid-cols-2 gap-6 p-6 bg-gray-50 border border-gray-200 rounded-lg mb-8">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Identificação do Aluno</h3>
              <p className="text-lg font-black uppercase text-gray-800">{printGradeData.student.name}</p>
              <p className="text-sm"><b>CPF do Aluno:</b> {printGradeData.student.cpf || 'Não cadastrado'}</p>
              <p className="text-sm"><b>Data de Nascimento:</b> {printGradeData.student.birth_date ? new Date(printGradeData.student.birth_date).toLocaleDateString('pt-BR') : '-'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Turma & Docência</h3>
              <p className="text-base font-bold text-gray-800">{printGradeData.className}</p>
              <p className="text-sm"><b>Professor Responsável:</b> {printGradeData.instructorName}</p>
            </div>
          </div>

          {/* Resultado da Avaliação */}
          <div className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 border-b pb-1">Desempenho da Avaliação</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Avaliação / Prova</span>
                <span className="text-sm font-bold text-gray-800">{printGradeData.examName}</span>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Nota da Prova</span>
                <span className="text-lg font-black text-purple-700">
                  {printGradeData.gradeInfo.grade ? Number(printGradeData.gradeInfo.grade).toFixed(1) : 'Sem nota'}
                </span>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Conceito Obtido</span>
                <span className="text-lg font-black text-purple-700">
                  {printGradeData.gradeInfo.concept || 'Sem conceito'}
                </span>
              </div>
            </div>

            {/* Feedback por extenso */}
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Feedback Qualitativo & Observações Pedagógicas</h4>
              <p className="text-sm text-gray-700 leading-relaxed italic">
                "{printGradeData.gradeInfo.feedback || 'Nenhum parecer pedagógico adicional foi lançado.'}"
              </p>
            </div>
          </div>

          {/* Rodapé e Assinaturas */}
          <div className="mt-20 pt-8 border-t border-dashed border-gray-400 grid grid-cols-2 gap-8 text-xs text-gray-600">
            <div>
              <p className="font-bold">__________________________________________</p>
              <p className="mt-1">{printGradeData.instructorName}</p>
              <p className="text-[10px] text-gray-400">Assinatura do Professor</p>
            </div>
            <div className="text-right">
              <p className="font-bold">__________________________________________</p>
              <p className="mt-1">Ciente do Responsável Legal</p>
              <p className="text-[10px] text-gray-400">Assinatura do Responsável</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
