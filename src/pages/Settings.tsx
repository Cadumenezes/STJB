import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Settings, Upload, FileText, Calendar, Code, GraduationCap, Shield, Lock, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

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

export default function SettingsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'general' | 'gateways' | 'templates' | 'security'>('general')
  
  // MFA States
  const [mfaActive, setMfaActive] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState('')
  const [mfaEnrollData, setMfaEnrollData] = useState<any>(null)
  const [mfaEnrollStatus, setMfaEnrollStatus] = useState<'idle' | 'enrolling' | 'verified'>('idle')
  const [mfaVerificationCode, setMfaVerificationCode] = useState('')
  const [mfaError, setMfaError] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)

  async function loadMfaStatus() {
    try {
      if (!supabase.auth || !supabase.auth.mfa) {
        console.warn('Supabase MFA API is not available on this client.')
        return
      }
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (!error && data) {
        const activeTotp = data.totp?.find(f => f.status === 'verified')
        if (activeTotp) {
          setMfaActive(true)
          setMfaFactorId(activeTotp.id)
        } else {
          setMfaActive(false)
          setMfaFactorId('')
        }
      }
    } catch (e) {
      console.error('MFA load error:', e)
    }
  }

  async function handleMfaEnroll() {
    if (!supabase.auth || !supabase.auth.mfa) {
      setMfaError('Autenticação MFA não disponível neste cliente.')
      return
    }
    setMfaLoading(true)
    setMfaError('')
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'DanceFlow (' + formData.school_name + ')'
      })
      if (error) throw error
      setMfaEnrollData(data)
      setMfaEnrollStatus('enrolling')
    } catch (err: any) {
      setMfaError(err.message || 'Erro ao iniciar ativação de MFA.')
    } finally {
      setMfaLoading(false)
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!mfaEnrollData || mfaVerificationCode.length !== 6) return
    if (!supabase.auth || !supabase.auth.mfa) {
      setMfaError('Autenticação MFA não disponível neste cliente.')
      return
    }

    setMfaLoading(true)
    setMfaError('')
    try {
      const factorId = mfaEnrollData.id
      
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: mfaVerificationCode
      })
      if (verifyError) throw verifyError

      alert('Autenticação de Duas Etapas (MFA) ativada com sucesso!')
      setMfaEnrollStatus('verified')
      setMfaVerificationCode('')
      await loadMfaStatus()
    } catch (err: any) {
      setMfaError(err.message || 'Código de verificação inválido. Tente novamente.')
    } finally {
      setMfaLoading(false)
    }
  }

  async function handleMfaDisable() {
    if (!confirm('Tem certeza que deseja desativar a Autenticação de Duas Etapas (MFA)? Isso tornará sua conta menos segura.')) return
    if (!supabase.auth || !supabase.auth.mfa) {
      setMfaError('Autenticação MFA não disponível neste cliente.')
      return
    }

    setMfaLoading(true)
    setMfaError('')
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId })
      if (error) throw error

      alert('Autenticação de Duas Etapas (MFA) desativada com sucesso!')
      setMfaEnrollStatus('idle')
      setMfaEnrollData(null)
      await loadMfaStatus()
    } catch (err: any) {
      setMfaError(err.message || 'Erro ao desativar MFA.')
    } finally {
      setMfaLoading(false)
    }
  }
  
  const [hasBgMenuColumn, setHasBgMenuColumn] = useState(false)
  const [formData, setFormData] = useState({
    school_name: 'DanceFlow',
    logo_url: '',
    bg_color: '#0a0a0f',
    bg_card: '#1a1a2e',
    bg_menu: '#1a1a2e',
    text_color: '#f0f0ff',
    accent_color: '#8b5cf6',
    title_font_size: 32,
    subtitle_font_size: 16,
    cnpj: '',
    address: '',
    director: '',
    discount_due_day: 10,
    gateway_type: 'none' as 'none' | 'asaas' | 'cora',
    gateway_api_key: '',
    cora_client_id: '',
    cora_client_secret: '',
    tax_declaration_template: '',
    activity_declaration_template: '',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    const { data } = await supabase.from('school_settings').select('*').limit(1).single()
    if (data) {
      setSettingsId(data.id)
      const hasMenuCol = 'bg_menu' in data
      setHasBgMenuColumn(hasMenuCol)
      setFormData({
        school_name: data.school_name || 'DanceFlow',
        logo_url: data.logo_url || '',
        bg_color: data.bg_color || '#0a0a0f',
        bg_card: data.bg_card || '#1a1a2e',
        bg_menu: data.bg_menu || data.bg_card || '#1a1a2e',
        text_color: data.text_color || '#f0f0ff',
        accent_color: data.accent_color || '#8b5cf6',
        title_font_size: data.title_font_size || 32,
        subtitle_font_size: data.subtitle_font_size || 16,
        cnpj: data.cnpj || '',
        address: data.address || '',
        director: data.director || '',
        discount_due_day: data.discount_due_day !== undefined ? data.discount_due_day : 10,
        gateway_type: (data.gateway_type || 'none') as 'none' | 'asaas' | 'cora',
        gateway_api_key: data.gateway_api_key || '',
        cora_client_id: data.cora_client_id || '',
        cora_client_secret: data.cora_client_secret || '',
        tax_declaration_template: data.tax_declaration_template || localStorage.getItem('tax_declaration_template') || DEFAULT_TAX_TEMPLATE,
        activity_declaration_template: data.activity_declaration_template || localStorage.getItem('activity_declaration_template') || DEFAULT_ACTIVITY_TEMPLATE,
      })
    } else {
      const { error } = await supabase.from('school_settings').select('bg_menu').limit(1)
      setHasBgMenuColumn(!error)
      setFormData(prev => ({
        ...prev,
        tax_declaration_template: localStorage.getItem('tax_declaration_template') || DEFAULT_TAX_TEMPLATE,
        activity_declaration_template: localStorage.getItem('activity_declaration_template') || DEFAULT_ACTIVITY_TEMPLATE,
      }))
    }
    await loadMfaStatus()
    setLoading(false)
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
      setFormData({ ...formData, logo_url: base64 })
    }
    reader.readAsDataURL(file)
  }

  function handleTemplateUpload(e: React.ChangeEvent<HTMLInputElement>, field: 'tax_declaration_template' | 'activity_declaration_template') {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setFormData(prev => ({ ...prev, [field]: text }))
    }
    reader.readAsText(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Erro: Usuário não autenticado.')
      setSaving(false)
      return
    }

    const savePayload: any = { ...formData }
    if (!hasBgMenuColumn) {
      delete savePayload.bg_menu
    }
    
    let error = null
    if (settingsId) {
      const res = await supabase.from('school_settings').update(savePayload).eq('id', settingsId)
      if (res.error && (res.error.message.includes('column') || res.error.code === 'PGRST204')) {
        // Fallback: Salva localmente as colunas novas de template e atualiza o resto
        localStorage.setItem('tax_declaration_template', formData.tax_declaration_template)
        localStorage.setItem('activity_declaration_template', formData.activity_declaration_template)
        const strippedPayload = { ...savePayload }
        delete strippedPayload.tax_declaration_template
        delete strippedPayload.activity_declaration_template
        const fallbackRes = await supabase.from('school_settings').update(strippedPayload).eq('id', settingsId)
        error = fallbackRes.error
      } else {
        error = res.error
      }
    } else {
      const res = await supabase.from('school_settings').insert([{ ...savePayload, id: user.id }]).select().single()
      if (res.error && res.error.message.includes('column')) {
        localStorage.setItem('tax_declaration_template', formData.tax_declaration_template)
        localStorage.setItem('activity_declaration_template', formData.activity_declaration_template)
        const strippedPayload = { ...savePayload }
        delete strippedPayload.tax_declaration_template
        delete strippedPayload.activity_declaration_template
        const fallbackRes = await supabase.from('school_settings').insert([{ ...strippedPayload, id: user.id }]).select().single()
        error = fallbackRes.error
        if (fallbackRes.data) setSettingsId(fallbackRes.data.id)
      } else {
        error = res.error
        if (res.data) setSettingsId(res.data.id)
      }
    }

    if (error) {
      console.error(error)
      alert('Erro ao salvar configurações: ' + error.message)
      setSaving(false)
      return
    }

    // Garante persistência local imediata
    localStorage.setItem('tax_declaration_template', formData.tax_declaration_template)
    localStorage.setItem('activity_declaration_template', formData.activity_declaration_template)

    // Apply styles immediately
    document.documentElement.style.setProperty('--bg-primary', formData.bg_color)
    document.documentElement.style.setProperty('--bg-card', formData.bg_card)
    document.documentElement.style.setProperty('--bg-secondary', formData.bg_menu)
    document.documentElement.style.setProperty('--text-primary', formData.text_color)
    document.documentElement.style.setProperty('--accent-color', formData.accent_color)
    document.documentElement.style.setProperty('--title-size', `${formData.title_font_size}px`)
    document.documentElement.style.setProperty('--subtitle-size', `${formData.subtitle_font_size}px`)
    
    alert('Configurações salvas com sucesso!')
    window.location.reload()
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--accent-color)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-10">
      {/* Header Section with Dynamic Style - DESTAQUES LEVEMENTE ARREDONDADOS */}
      <div 
        className="p-5 sm:p-8 md:p-10 pb-10 sm:pb-16 rounded-2xl border border-white/5 shadow-2xl mb-12 relative overflow-hidden"
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
              className="font-black tracking-tighter leading-tight inline-block py-4 sm:py-8 rounded-2xl shadow-2xl shadow-purple-500/30" 
              style={{ 
                backgroundColor: 'var(--accent-color)', 
                color: '#fff',
                fontSize: 'var(--title-size, 32px)',
                paddingLeft: 'clamp(16px, 4vw, 40px)',
                paddingRight: 'clamp(16px, 4vw, 40px)'
              }}
            >
              Configurações
            </h1>
            <br />
            <p 
              className="font-bold inline-block py-3 sm:py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
               style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: 'clamp(12px, 3vw, 32px)', paddingRight: 'clamp(12px, 3vw, 32px)' }}
            >
              Personalize a aparência do sistema
            </p>
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex flex-wrap gap-6 p-2 bg-black/30 rounded-2xl w-fit mb-12 max-w-7xl mx-auto select-none border border-white/5">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-8 py-3.5 text-sm font-bold transition-all rounded-xl shadow-md border cursor-pointer ${
            activeTab === 'general' ? 'font-black scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          style={{
            backgroundColor: activeTab === 'general' ? 'var(--bg-card)' : 'rgba(0, 0, 0, 0.2)',
            borderColor: activeTab === 'general' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'general' ? '#fff' : 'var(--text-primary)',
            boxShadow: activeTab === 'general' ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 0 8px var(--accent-color)' : 'none'
          }}
        >
          Aparência & Identidade
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('gateways')}
          className={`px-8 py-3.5 text-sm font-bold transition-all rounded-xl shadow-md border cursor-pointer ${
            activeTab === 'gateways' ? 'font-black scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          style={{
            backgroundColor: activeTab === 'gateways' ? 'var(--bg-card)' : 'rgba(0, 0, 0, 0.2)',
            borderColor: activeTab === 'gateways' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'gateways' ? '#fff' : 'var(--text-primary)',
            boxShadow: activeTab === 'gateways' ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 0 8px var(--accent-color)' : 'none'
          }}
        >
          Integrações & Bancos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`px-8 py-3.5 text-sm font-bold transition-all rounded-xl shadow-md border cursor-pointer ${
            activeTab === 'templates' ? 'font-black scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          style={{
            backgroundColor: activeTab === 'templates' ? 'var(--bg-card)' : 'rgba(0, 0, 0, 0.2)',
            borderColor: activeTab === 'templates' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'templates' ? '#fff' : 'var(--text-primary)',
            boxShadow: activeTab === 'templates' ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 0 8px var(--accent-color)' : 'none'
          }}
        >
          Modelos de Documentos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-8 py-3.5 text-sm font-bold transition-all rounded-xl shadow-md border cursor-pointer ${
            activeTab === 'security' ? 'font-black scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          style={{
            backgroundColor: activeTab === 'security' ? 'var(--bg-card)' : 'rgba(0, 0, 0, 0.2)',
            borderColor: activeTab === 'security' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'security' ? '#fff' : 'var(--text-primary)',
            boxShadow: activeTab === 'security' ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 0 8px var(--accent-color)' : 'none'
          }}
        >
          Segurança (MFA)
        </button>
      </div>

      <div className="w-full max-w-7xl mx-auto">
        {activeTab === 'general' && (
          <div className="rounded-none p-8 sm:p-10" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>Nome da Escola</label>
                  <input 
                    value={formData.school_name} 
                    onChange={(e) => setFormData({ ...formData, school_name: e.target.value })} 
                    className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                    style={inputStyle} 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>CNPJ</label>
                    <input 
                      value={formData.cnpj} 
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} 
                      placeholder="00.000.000/0001-00"
                      className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                      style={inputStyle} 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>Direção / Responsável</label>
                    <input 
                      value={formData.director} 
                      onChange={(e) => setFormData({ ...formData, director: e.target.value })} 
                      placeholder="Nome do Diretor(a)"
                      className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                      style={inputStyle} 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>Endereço Completo</label>
                  <input 
                    value={formData.address} 
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                    className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                    style={inputStyle} 
                  />
                </div>

                <div className="p-5 border border-purple-500/20 bg-purple-500/5 rounded-none space-y-3">
                  <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider">Regra de Faturamento & Desconto</h3>
                  <div>
                    <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>Dia Limite para Desconto Pontualidade *</label>
                    <input 
                      type="number"
                      min="1"
                      max="31"
                      value={formData.discount_due_day} 
                      onChange={(e) => setFormData({ ...formData, discount_due_day: parseInt(e.target.value) || 10 })} 
                      placeholder="Ex: 10"
                      className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                      style={inputStyle} 
                      required
                    />
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                      Os alunos receberão desconto automático caso efetuem o pagamento da mensalidade até este dia do mês de referência. (Padrão: 10)
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>Logotipo da Escola</label>
                  
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-2">
                    {formData.logo_url ? (
                      <div className="p-4 rounded-none border border-dashed flex justify-center items-center bg-black/20 w-full sm:w-48 h-32" style={{ borderColor: 'var(--border-color)' }}>
                        <img src={formData.logo_url} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="p-4 rounded-none border border-dashed flex justify-center items-center bg-black/20 w-full sm:w-48 h-32" style={{ borderColor: 'var(--border-color)' }}>
                        <span className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>Nenhuma logo</span>
                      </div>
                    )}
                    
                    <div className="flex-1 space-y-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="block w-full text-sm
                          file:mr-4 file:py-2.5 file:px-4
                          file:rounded-none file:border-0
                          file:text-sm file:font-semibold
                          file:bg-purple-600 file:text-white
                          hover:file:bg-purple-700
                          cursor-pointer transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                      />
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Recomendado: Imagem com fundo transparente (PNG), máximo 2MB.
                      </p>
                      {formData.logo_url && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, logo_url: '' })}
                          className="text-xs text-red-500 hover:text-red-400 font-medium transition-colors"
                        >
                          Remover logotipo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <div>
                    <label className="text-sm font-bold block mb-3 text-purple-400 uppercase tracking-wider">Cores</label>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Fundo</span>
                        <input type="color" value={formData.bg_color} onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })} className="h-8 w-12 rounded-none cursor-pointer border-0 p-0" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Texto</span>
                        <input type="color" value={formData.text_color} onChange={(e) => setFormData({ ...formData, text_color: e.target.value })} className="h-8 w-12 rounded-none cursor-pointer border-0 p-0" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Cards</span>
                        <input type="color" value={formData.bg_card} onChange={(e) => setFormData({ ...formData, bg_card: e.target.value })} className="h-8 w-12 rounded-none cursor-pointer border-0 p-0" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Menu Lateral</span>
                        <input type="color" value={formData.bg_menu} onChange={(e) => setFormData({ ...formData, bg_menu: e.target.value })} className="h-8 w-12 rounded-none cursor-pointer border-0 p-0" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Destaque</span>
                        <input type="color" value={formData.accent_color} onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })} className="h-8 w-12 rounded-none cursor-pointer border-0 p-0" />
                      </div>
                      {!hasBgMenuColumn && (
                        <div className="text-[10px] text-yellow-500/80 p-2.5 rounded-none border border-yellow-500/20 bg-yellow-500/5 leading-normal mt-2">
                          💡 <strong>Dica:</strong> Para salvar a cor do menu de forma persistente, rode o script <code>migration_bg_menu.sql</code> no <strong>SQL Editor</strong>! Por enquanto, ela será aplicada apenas nesta sessão.
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold block mb-3 text-purple-400 uppercase tracking-wider">Tamanhos de Letra</label>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Título</span>
                          <span className="text-xs font-bold text-purple-400">{formData.title_font_size}px</span>
                        </div>
                        <input 
                          type="range" min="20" max="64" value={formData.title_font_size} 
                          onChange={(e) => setFormData({ ...formData, title_font_size: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-black/40 rounded-none appearance-none cursor-pointer accent-purple-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Subtítulo</span>
                          <span className="text-xs font-bold text-purple-400">{formData.subtitle_font_size}px</span>
                        </div>
                        <input 
                          type="range" min="12" max="32" value={formData.subtitle_font_size} 
                          onChange={(e) => setFormData({ ...formData, subtitle_font_size: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-black/40 rounded-none appearance-none cursor-pointer accent-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex items-center gap-2 rounded-none px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105 disabled:opacity-50 cursor-pointer" 
                  style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
                >
                  <Save size={18} />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'gateways' && (
          <div className="rounded-none p-8 sm:p-10" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-6 w-2 rounded-full bg-purple-500" />
                  <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider">Integrações de Cobrança & Bancos</h3>
                </div>

                <div>
                  <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>Meio de Faturamento / Banco Principal</label>
                  <select
                    value={formData.gateway_type}
                    onChange={(e) => setFormData({ ...formData, gateway_type: e.target.value as any })}
                    className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    style={inputStyle}
                  >
                    <option value="none">Controle Manual / Conciliação por Extrato Bancário (Qualquer Banco)</option>
                    <option value="asaas">Asaas (Recomendado - Use qualquer banco comercial)</option>
                    <option value="cora">Banco Cora (Integração Direta com Conta PJ Cora)</option>
                  </select>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                    Selecione o modelo que melhor se adapta à sua escola. Você pode automatizar tudo ou continuar no seu banco preferido e usar conciliação por extrato.
                  </p>
                </div>

                {formData.gateway_type === 'asaas' && (
                  <div className="pt-3 border-t border-purple-500/10 space-y-3">
                    <div>
                      <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>Chave de API do Asaas (API Key) *</label>
                      <input
                        type="password"
                        value={formData.gateway_api_key}
                        onChange={(e) => setFormData({ ...formData, gateway_api_key: e.target.value })}
                        placeholder="Produção: $aek_..."
                        className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        style={inputStyle}
                        required
                      />
                      <div className="p-3 rounded-none bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 mt-2 space-y-1">
                        <p className="font-bold">🌟 Como funciona para Outros Bancos:</p>
                        <p>Você pode ter conta em <strong>qualquer banco comercial</strong> (Itaú, Bradesco, Nubank, etc.). O Asaas gera os boletos/Pix automáticos para seus alunos e você programa repasses automáticos diários de todo o saldo acumulado diretamente para o seu banco tradicional!</p>
                      </div>
                    </div>
                  </div>
                )}

                {formData.gateway_type === 'cora' && (
                  <div className="pt-3 border-t border-purple-500/10 space-y-3">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>Client ID do Banco Cora *</label>
                        <input
                          value={formData.cora_client_id}
                          onChange={(e) => setFormData({ ...formData, cora_client_id: e.target.value })}
                          placeholder="Ex: client_..."
                          className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          style={inputStyle}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>Client Secret do Banco Cora *</label>
                        <input
                          type="password"
                          value={formData.cora_client_secret}
                          onChange={(e) => setFormData({ ...formData, cora_client_secret: e.target.value })}
                          placeholder="Ex: secret_..."
                          className="w-full rounded-none px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          style={inputStyle}
                          required
                        />
                      </div>
                    </div>
                    <div className="p-3 rounded-none bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
                      <p className="font-bold">🏦 Conexão Direta com sua Conta Cora:</p>
                      <p>Ideal se sua escola já usa a conta digital PJ da Cora. Os boletos e Pix são gerados diretamente dentro da sua conta, sem taxas adicionais de gateway intermediário.</p>
                    </div>
                  </div>
                )}

                {formData.gateway_type === 'none' && (
                  <div className="pt-3 border-t border-purple-500/10 space-y-4">
                    <div className="p-3 rounded-none bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                      <p className="font-bold">📂 Conciliação Universal via Extrato Bancário:</p>
                      <p>Mantenha a conta do seu banco atual (Itaú, Banco do Brasil, Bradesco, Inter, Cora, etc.). Basta baixar o extrato diário no seu banco (OFX ou CSV) e fazer o upload para dar baixa automática em lote em poucos segundos!</p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => navigate('/financial?tab=reconciliation')}
                      className="w-full flex items-center justify-center gap-3 rounded-none px-6 py-4 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95 cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #10b981, #065f46)' }}
                    >
                      <Upload size={20} />
                      Enviar Extrato Bancário (OFX / CSV)
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex items-center gap-2 rounded-none px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105 disabled:opacity-50 cursor-pointer" 
                  style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
                >
                  <Save size={18} />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4 max-w-2xl mx-auto border border-purple-500/10 shadow-2xl relative overflow-hidden mt-6" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[60px] opacity-10" style={{ backgroundColor: 'var(--accent-color)' }} />
            <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400 animate-pulse">
              <Settings size={40} className="animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <h3 className="text-lg font-black uppercase tracking-wider text-white">Modelos de Documentos</h3>
            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
              Em Construção 🚧
            </span>
            <p className="text-sm text-gray-400 leading-relaxed max-w-md">
              Estamos preparando uma experiência incrível e simplificada para você personalizar as declarações de Imposto de Renda (IRPF) e Fichas de Matrícula da sua escola. Esta aba estará disponível em breve!
            </p>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="rounded-none p-8 sm:p-10 space-y-6 animate-fade-in" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-6 w-2 rounded-full bg-purple-500" />
              <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider">Segurança da Conta</h3>
            </div>

            <div className="p-6 border border-white/5 bg-black/20 rounded-none flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2 max-w-xl text-left">
                <h4 className="text-base font-bold flex items-center gap-2 text-white">
                  <Shield size={18} className={mfaActive ? "text-emerald-400" : "text-gray-400"} />
                  Autenticação de Duas Etapas (MFA)
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Adicione uma camada extra de segurança à sua conta de Diretor. Quando ativada, você precisará digitar um código de 6 dígitos gerado no aplicativo autenticador do seu celular (como Google Authenticator) toda vez que fizer login.
                </p>
                <div className="pt-2">
                  <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-none border ${
                    mfaActive 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {mfaActive ? 'Ativado (Seguro)' : 'Desativado (Menos Seguro)'}
                  </span>
                </div>
              </div>

              {!mfaActive && mfaEnrollStatus === 'idle' && (
                <button
                  type="button"
                  onClick={handleMfaEnroll}
                  disabled={mfaLoading}
                  className="rounded-none px-6 py-3.5 text-xs font-bold text-white transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-md"
                  style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
                >
                  <Lock size={14} />
                  {mfaLoading ? 'Iniciando...' : 'Ativar MFA'}
                </button>
              )}

              {mfaActive && (
                <button
                  type="button"
                  onClick={handleMfaDisable}
                  disabled={mfaLoading}
                  className="rounded-none px-6 py-3.5 text-xs font-bold text-red-400 hover:text-red-300 transition-all border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <AlertTriangle size={14} />
                  {mfaLoading ? 'Desativando...' : 'Desativar MFA'}
                </button>
              )}
            </div>

            {mfaError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-none text-xs font-semibold text-red-400">
                {mfaError}
              </div>
            )}

            {mfaEnrollStatus === 'enrolling' && mfaEnrollData && (
              <div className="p-8 border border-white/5 bg-black/40 rounded-none space-y-6 animate-fade-in max-w-2xl mx-auto text-left">
                <div className="text-center space-y-2">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Configurar Aplicativo Autenticador</h4>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Siga os passos abaixo para configurar o aplicativo autenticador no seu celular.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-none border border-white/10 shadow-lg w-fit mx-auto">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mfaEnrollData.totp.uri)}`} 
                      alt="MFA QR Code" 
                      className="w-40 h-40 object-contain"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-purple-400">Passo 1:</p>
                      <p className="text-xs text-gray-300 leading-normal">
                        Abra o Google Authenticator ou Microsoft Authenticator no seu celular e escaneie o código QR ao lado.
                      </p>
                    </div>

                    <div className="space-y-1 pt-2">
                      <p className="text-xs font-bold text-purple-400">Passo 2:</p>
                      <p className="text-xs text-gray-300 leading-normal">
                        Se não conseguir escanear, adicione manualmente uma conta no aplicativo digitando a chave abaixo:
                      </p>
                      <code className="block p-2.5 bg-black/60 border border-white/10 rounded-none text-xs text-gray-300 font-mono select-all tracking-wider text-center break-all">
                        {mfaEnrollData.totp.secret}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-6 space-y-4">
                  <div className="text-center">
                    <p className="text-xs font-bold text-purple-400 mb-1">Passo 3:</p>
                    <p className="text-xs text-gray-300">
                      Digite o código de 6 dígitos gerado pelo seu aplicativo autenticador para confirmar a ativação:
                    </p>
                  </div>

                  <form onSubmit={handleMfaVerify} className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto items-stretch">
                    <input
                      type="text"
                      maxLength={6}
                      pattern="\d*"
                      required
                      value={mfaVerificationCode}
                      onChange={(e) => setMfaVerificationCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="flex-1 bg-black/40 border border-white/10 rounded-none px-4 py-2.5 text-center text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      style={inputStyle}
                    />
                    <button
                      type="submit"
                      disabled={mfaLoading || mfaVerificationCode.length !== 6}
                      className="rounded-none px-6 py-2.5 text-xs font-bold text-white transition-all hover:scale-105 disabled:opacity-50 cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
                    >
                      {mfaLoading ? 'Confirmando...' : 'Confirmar e Ativar'}
                    </button>
                  </form>
                </div>

                <div className="flex justify-end pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setMfaEnrollStatus('idle')
                      setMfaEnrollData(null)
                      setMfaVerificationCode('')
                      setMfaError('')
                    }}
                    className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
