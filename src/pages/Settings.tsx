import { useEffect, useState } from 'react'
import { Save, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    school_name: 'DanceFlow',
    logo_url: '',
    bg_color: '#0a0a0f',
    bg_card: '#1a1a2e',
    text_color: '#f0f0ff',
    accent_color: '#8b5cf6',
    title_font_size: 32,
    subtitle_font_size: 16,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    const { data } = await supabase.from('school_settings').select('*').limit(1).single()
    if (data) {
      setSettingsId(data.id)
      setFormData({
        school_name: data.school_name || 'DanceFlow',
        logo_url: data.logo_url || '',
        bg_color: data.bg_color || '#0a0a0f',
        bg_card: data.bg_card || '#1a1a2e',
        text_color: data.text_color || '#f0f0ff',
        accent_color: data.accent_color || '#8b5cf6',
        title_font_size: data.title_font_size || 32,
        subtitle_font_size: data.subtitle_font_size || 16,
      })
    }
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    
    let error = null
    if (settingsId) {
      const res = await supabase.from('school_settings').update(formData).eq('id', settingsId)
      error = res.error
    } else {
      const res = await supabase.from('school_settings').insert([formData]).select().single()
      error = res.error
      if (res.data) setSettingsId(res.data.id)
    }

    if (error) {
      console.error(error)
      alert('Erro ao salvar configurações: ' + error.message)
      setSaving(false)
      return
    }

    // Apply styles immediately
    document.documentElement.style.setProperty('--bg-primary', formData.bg_color)
    document.documentElement.style.setProperty('--bg-card', formData.bg_card)
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
    <div className="space-y-12 pb-10">
      {/* Header Section with Dynamic Style */}
      <div 
        className="p-8 sm:p-10 pb-16 rounded-2xl border border-white/5 shadow-2xl mb-20 relative overflow-hidden"
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
              className="font-black tracking-tighter leading-tight inline-block pl-20 pr-8 py-3 rounded-2xl shadow-lg shadow-purple-500/20" 
              style={{ 
                backgroundColor: 'var(--accent-color)', 
                color: '#fff',
                fontSize: 'var(--title-size, 32px)' 
              }}
            >
              Configurações
            </h1>
            <br />
            <p 
              className="font-medium inline-block pl-16 pr-5 py-2 rounded-2xl border border-white/5" 
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: 'var(--text-secondary)', 
                fontSize: 'var(--subtitle-size, 16px)' 
              }}
            >
              Personalize a aparência do sistema
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome da Escola</label>
              <input 
                value={formData.school_name} 
                onChange={(e) => setFormData({ ...formData, school_name: e.target.value })} 
                className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                style={inputStyle} 
              />
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Logotipo da Escola</label>
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-2">
                {formData.logo_url ? (
                  <div className="p-4 rounded-2xl border border-dashed flex justify-center items-center bg-black/20 w-full sm:w-48 h-32" style={{ borderColor: 'var(--border-color)' }}>
                    <img src={formData.logo_url} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-dashed flex justify-center items-center bg-black/20 w-full sm:w-48 h-32" style={{ borderColor: 'var(--border-color)' }}>
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
                      file:rounded-2xl file:border-0
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
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Fundo</span>
                    <input type="color" value={formData.bg_color} onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })} className="h-8 w-12 rounded-2xl cursor-pointer border-0 p-0" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Texto</span>
                    <input type="color" value={formData.text_color} onChange={(e) => setFormData({ ...formData, text_color: e.target.value })} className="h-8 w-12 rounded-2xl cursor-pointer border-0 p-0" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cards</span>
                    <input type="color" value={formData.bg_card} onChange={(e) => setFormData({ ...formData, bg_card: e.target.value })} className="h-8 w-12 rounded-2xl cursor-pointer border-0 p-0" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold" style={{ color: 'var(--accent-color)' }}>Destaque</span>
                    <input type="color" value={formData.accent_color} onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })} className="h-8 w-12 rounded-2xl cursor-pointer border-0 p-0" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold block mb-3 text-purple-400 uppercase tracking-wider">Tamanhos de Letra</label>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Título</span>
                      <span className="text-xs font-bold text-purple-400">{formData.title_font_size}px</span>
                    </div>
                    <input 
                      type="range" min="20" max="64" value={formData.title_font_size} 
                      onChange={(e) => setFormData({ ...formData, title_font_size: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-black/40 rounded-2xl appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Subtítulo</span>
                      <span className="text-xs font-bold text-purple-400">{formData.subtitle_font_size}px</span>
                    </div>
                    <input 
                      type="range" min="12" max="32" value={formData.subtitle_font_size} 
                      onChange={(e) => setFormData({ ...formData, subtitle_font_size: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-black/40 rounded-2xl appearance-none cursor-pointer accent-purple-500"
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
              className="flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105 disabled:opacity-50" 
              style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
