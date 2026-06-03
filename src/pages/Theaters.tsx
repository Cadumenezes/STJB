import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Map } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Theater } from '../types'
import Modal from '../components/Modal'

export default function Theaters() {
  const [theaters, setTheaters] = useState<Theater[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTheater, setEditTheater] = useState<Theater | null>(null)

  const [name, setName] = useState('')
  const [rowsCount, setRowsCount] = useState<number>(10)
  const [seatsPerRow, setSeatsPerRow] = useState<number>(12)
  const [exceptions, setExceptions] = useState<Record<string, number>>({})

  useEffect(() => {
    loadTheaters()
  }, [])

  async function loadTheaters() {
    setLoading(true)
    const { data } = await supabase.from('theaters').select('*').order('name')
    setTheaters(data || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      name,
      rows_count: Number(rowsCount),
      seats_per_row: Number(seatsPerRow),
      exceptions,
      user_id: user?.id,
    }

    let error = null
    if (editTheater) {
      const res = await supabase.from('theaters').update(payload).eq('id', editTheater.id)
      error = res.error
    } else {
      const res = await supabase.from('theaters').insert([payload])
      error = res.error
    }

    if (error) {
      console.error(error)
      alert('Erro ao salvar teatro: ' + error.message)
    } else {
      setShowModal(false)
      setEditTheater(null)
      resetForm()
      loadTheaters()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este modelo de teatro?')) return
    await supabase.from('theaters').delete().eq('id', id)
    loadTheaters()
  }

  function openEdit(th: Theater) {
    setEditTheater(th)
    setName(th.name)
    setRowsCount(th.rows_count)
    setSeatsPerRow(th.seats_per_row)
    setExceptions(th.exceptions || {})
    setShowModal(true)
  }

  function resetForm() {
    setName('')
    setRowsCount(10)
    setSeatsPerRow(12)
    setExceptions({})
  }

  function getRowLabel(index: number): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if (index < alphabet.length) {
      return alphabet[index]
    }
    return `Fileira ${index + 1}`
  }

  // Calculate dynamic seat sizes for the preview grid
  const maxSeats = Math.max(
    seatsPerRow,
    ...Object.values(exceptions),
    1
  )
  const seatSize = Math.max(8, Math.min(28, Math.floor((360 - (maxSeats - 1) * 3) / maxSeats)))

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="flex flex-col pb-10">
      {/* Header Section with Dynamic Style */}
      <div 
        className="p-5 sm:p-8 md:p-10 pb-10 sm:pb-16 rounded-2xl border border-white/5 shadow-2xl mb-8 sm:mb-12 relative overflow-hidden"
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
              Teatros
            </h1>
            <br />
            <p 
              className="font-bold inline-block py-3 sm:py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
               style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: 'clamp(12px, 3vw, 32px)', paddingRight: 'clamp(12px, 3vw, 32px)' }}
            >
              Modelos de mapas de assento para eventos
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setEditTheater(null); setShowModal(true) }}
            className="flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/20 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
          >
            <Plus size={26} />
            Novo Teatro
          </button>
        </div>
      </div>

      <div className="rounded-none overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Teatro</th>
                <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Fileiras</th>
                <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Cadeiras/Fileira</th>
                <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Exceções</th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    Carregando...
                  </td>
                </tr>
              ) : theaters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    Nenhum teatro cadastrado. Crie um modelo de mapa de assentos para associar aos seus eventos!
                  </td>
                </tr>
              ) : (
                theaters.map((t) => (
                  <tr 
                    key={t.id} 
                    className="transition-colors" 
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl p-2 animate-pulse" style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
                          <Map size={18} style={{ color: 'var(--accent-color)' }} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-center font-bold" style={{ color: 'var(--text-primary)' }}>{t.rows_count}</td>
                    <td className="px-6 py-4 text-sm text-center font-bold" style={{ color: 'var(--text-primary)' }}>{t.seats_per_row}</td>
                    <td className="px-6 py-4 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                      {Object.keys(t.exceptions || {}).length > 0 
                        ? `${Object.keys(t.exceptions).length} fileiras customizadas` 
                        : 'Nenhuma exceção'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(t)} className="p-2 rounded-2xl hover:opacity-70 transition-opacity cursor-pointer" style={{ color: '#3b82f6' }}><Edit size={16} /></button>
                        <button onClick={() => handleDelete(t.id)} className="p-2 rounded-2xl hover:opacity-70 transition-opacity cursor-pointer" style={{ color: '#f43f5e' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={showModal} 
        onClose={() => { setShowModal(false); resetForm(); }} 
        title={editTheater ? 'Editar Teatro' : 'Novo Teatro'}
        size="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LADO ESQUERDO: CONFIGS */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-purple-400 border-b border-white/5 pb-2">Configuração Geral</h3>
              
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome do Teatro *</label>
                <input 
                  required 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Ex: Teatro Municipal, Teatro Alfa"
                  className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                  style={inputStyle} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Fileiras *</label>
                  <input 
                    required 
                    type="number" 
                    min="1"
                    max="50"
                    value={rowsCount} 
                    onChange={(e) => setRowsCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))} 
                    className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                    style={inputStyle} 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Poltronas/Fileira *</label>
                  <input 
                    required 
                    type="number" 
                    min="1"
                    max="100"
                    value={seatsPerRow} 
                    onChange={(e) => setSeatsPerRow(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))} 
                    className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                    style={inputStyle} 
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase text-gray-400">Exceções de Fileira</h4>
                  {Object.keys(exceptions).length > 0 && (
                    <button 
                      type="button" 
                      onClick={() => setExceptions({})} 
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-widest cursor-pointer"
                    >
                      Limpar Tudo
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Altere a quantidade de assentos de fileiras específicas caso não correspondam ao padrão ({seatsPerRow}):
                </p>

                <div className="max-h-48 overflow-y-auto pr-1 space-y-2 border border-white/5 p-3 rounded-2xl bg-black/10 custom-scrollbar">
                  {Array.from({ length: rowsCount }).map((_, idx) => {
                    const rowName = getRowLabel(idx)
                    const val = exceptions[rowName] !== undefined ? exceptions[rowName] : seatsPerRow
                    return (
                      <div key={rowName} className="flex items-center justify-between py-1 px-3 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/20 transition-all">
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
                                setExceptions({ ...exceptions, [rowName]: v })
                              }
                            }}
                            className="w-14 px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-center text-xs text-white"
                          />
                          {exceptions[rowName] !== undefined && (
                            <button 
                              type="button" 
                              onClick={() => {
                                const newExc = { ...exceptions }
                                delete newExc[rowName]
                                setExceptions(newExc)
                              }}
                              className="text-[10px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
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

            {/* LADO DIREITO: PREVIEW */}
            <div className="space-y-4 flex flex-col h-full">
              <h3 className="text-sm font-black uppercase text-purple-400 border-b border-white/5 pb-2">Visualização Prévia</h3>
              
              <div className="flex-1 flex flex-col items-center justify-center p-6 rounded-3xl border border-white/5 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', minHeight: '260px' }}>
                <div 
                  className="w-full max-w-xs py-1.5 mb-6 rounded-b-xl border-b-2 text-center text-[9px] font-black uppercase tracking-widest text-white/70 shadow-lg shrink-0"
                  style={{ 
                    background: 'linear-gradient(to bottom, rgba(139,92,246,0.1), rgba(139,92,246,0.25))',
                    borderBottomColor: 'var(--accent-color)',
                    boxShadow: '0 5px 15px -5px rgba(139,92,246,0.3)'
                  }}
                >
                  PALCO / TELA
                </div>

                <div className="w-full overflow-auto max-h-60 pr-1 py-1 custom-scrollbar flex flex-col items-center">
                  <div className="flex flex-col gap-1.5 min-w-max p-1">
                    {(() => {
                    let previewSeatCounter = 1;
                    const previewStartNumbers = Array.from({ length: rowsCount }).map((_, rIdx) => {
                      const rowName = getRowLabel(rIdx)
                      const count = exceptions[rowName] !== undefined ? exceptions[rowName] : seatsPerRow
                      const startNum = previewSeatCounter
                      previewSeatCounter += count
                      return startNum
                    })

                    return Array.from({ length: rowsCount }).map((_, rIdx) => {
                      const rowName = getRowLabel(rIdx)
                      const count = exceptions[rowName] !== undefined ? exceptions[rowName] : seatsPerRow
                      const rowStartNum = previewStartNumbers[rIdx]
                      return (
                        <div key={rowName} className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-black text-gray-500 w-4 text-center shrink-0">{rowName}</span>
                          <div className="flex gap-1 items-center">
                            {count === 0 ? (
                              <span className="text-[8px] text-rose-400 italic font-semibold">Sem cadeiras</span>
                            ) : (
                              Array.from({ length: count }).map((_, sIdx) => {
                                const seatNum = rowStartNum + sIdx
                                const seatLabel = `${rowName}${seatNum}`
                                return (
                                  <div 
                                    key={seatLabel}
                                    className="rounded flex items-center justify-center font-bold border shrink-0 transition-all select-none hover:scale-110 cursor-help"
                                    style={{ 
                                      width: `${seatSize}px`,
                                      height: `${seatSize}px`,
                                      fontSize: `${Math.max(6, seatSize * 0.45)}px`,
                                      backgroundColor: 'rgba(139, 92, 246, 0.15)',
                                      borderColor: 'rgba(139, 92, 246, 0.35)',
                                      color: 'var(--text-primary)',
                                    }}
                                    title={`Assento ${seatLabel}`}
                                  >
                                    {seatSize >= 15 ? seatNum : ''}
                                  </div>
                                )
                              })
                            )}
                          </div>
                          <span className="text-[10px] font-black text-gray-500 w-4 text-center shrink-0">{rowName}</span>
                        </div>
                      )
                    })
                  })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button 
              type="button" 
              onClick={() => { setShowModal(false); resetForm(); }} 
              className="rounded-2xl px-5 py-2.5 text-sm font-medium cursor-pointer" 
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 cursor-pointer" 
              style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
            >
              {editTheater ? 'Salvar Alterações' : 'Cadastrar Teatro'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
