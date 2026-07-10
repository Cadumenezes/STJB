import React, { useEffect, useState } from 'react'
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
  const [exceptions, setExceptions] = useState<Record<string, any>>({})
  const [corridorsInput, setCorridorsInput] = useState('')
  const [horizontalCorridorsInput, setHorizontalCorridorsInput] = useState('')
  const [selectedPreviewTheater, setSelectedPreviewTheater] = useState<Theater | null>(null)

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

    const payload = {
      name,
      rows_count: Number(rowsCount),
      seats_per_row: Number(seatsPerRow),
      exceptions: updatedExceptions,
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
    const corridors = (th.exceptions?._corridors || []) as number[]
    setCorridorsInput(corridors.length > 0 ? corridors.join(', ') : '')
    const hCorridors = (th.exceptions?._horizontal_corridors || []) as string[]
    setHorizontalCorridorsInput(hCorridors.length > 0 ? hCorridors.join(', ') : '')
    setShowModal(true)
  }

  function resetForm() {
    setName('')
    setRowsCount(10)
    setSeatsPerRow(12)
    setExceptions({})
    setCorridorsInput('')
    setHorizontalCorridorsInput('')
  }

  function getRowLabel(index: number): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if (index < alphabet.length) {
      return alphabet[index]
    }
    return `Fileira ${index + 1}`
  }

  // Calculate dynamic seat sizes for the preview grid
  const rowExceptions = Object.entries(exceptions)
    .filter(([key]) => !key.startsWith('_'))
    .map(([, val]) => val as number)
  const corridors = (exceptions._corridors || []) as number[]
  const maxSeats = Math.max(
    seatsPerRow,
    ...rowExceptions,
    1
  ) + (corridors.length * 0.6)
  const seatSize = Math.max(22, Math.min(28, Math.floor((360 - (maxSeats - 1) * 3) / maxSeats)))

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

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--accent-color)' }} />
        </div>
      ) : theaters.length === 0 ? (
        <div className="max-w-2xl mx-auto w-full rounded-2xl p-8 sm:p-12 text-center border border-white/5" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="h-20 w-20 rounded-3xl mx-auto flex items-center justify-center mb-6 bg-purple-500/10 border border-purple-500/20 animate-bounce">
            <Map size={40} className="text-purple-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-wider">Nenhum Teatro Cadastrado</h2>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Crie um modelo de mapa de assentos para associar aos seus eventos!
          </p>
          <button
            onClick={() => { resetForm(); setEditTheater(null); setShowModal(true) }}
            className="flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-xl mx-auto cursor-pointer"
            style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
          >
            <Plus size={26} />
            Novo Teatro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {theaters.map((t) => {
            const totalRows = t.rows_count
            const defaultSeats = t.seats_per_row
            
            // Total capacity calculation
            let totalSeatsCount = 0
            for (let r = 0; r < totalRows; r++) {
              const rowName = getRowLabel(r)
              const count = t.exceptions?.[rowName] !== undefined ? t.exceptions[rowName] : defaultSeats
              totalSeatsCount += count
            }

            // Preview configuration (limit max dimensions in card)
            const previewRows = Math.min(6, totalRows)

            return (
              <div 
                key={t.id}
                onClick={() => setSelectedPreviewTheater(t)}
                className="group rounded-3xl border border-white/5 p-6 hover:border-purple-500/50 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] flex flex-col justify-between cursor-pointer"
                style={{ backgroundColor: 'var(--bg-card)' }}
              >
                <div>
                  {/* Card Title & Info */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="rounded-2xl p-3 bg-purple-500/10 border border-purple-500/20 group-hover:bg-purple-500/20 transition-all shrink-0">
                        <Map size={22} style={{ color: 'var(--accent-color)' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-black text-white uppercase tracking-tight line-clamp-1">{t.name}</h3>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-purple-400 mt-0.5">{totalSeatsCount} Poltronas</p>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-1 shrink-0">
                      <button 
                        onClick={(ev) => { ev.stopPropagation(); openEdit(t); }} 
                        className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all cursor-pointer"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={(ev) => { ev.stopPropagation(); handleDelete(t.id); }} 
                        className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Config details tags */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-[var(--text-secondary)]">
                      📁 {totalRows} Fileiras
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-[var(--text-secondary)]">
                      🪑 {defaultSeats} Assentos/Fil.
                    </span>
                    {Object.keys(t.exceptions || {}).filter(k => !k.startsWith('_')).length > 0 && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full text-purple-400">
                        ⚡ {Object.keys(t.exceptions || {}).filter(k => !k.startsWith('_')).length} Customizadas
                      </span>
                    )}
                    {t.exceptions?._corridors && t.exceptions._corridors.length > 0 && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full text-sky-400">
                        🛣️ {t.exceptions._corridors.length} Corredores
                      </span>
                    )}
                  </div>

                  {/* Seating Map Mini Preview */}
                  <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-black/25 border border-white/5 relative overflow-hidden h-36">
                    {/* Tiny stage representation */}
                    <div 
                      className="w-1/2 py-0.5 mb-4 rounded-b-md border-b text-center text-[7px] font-bold uppercase tracking-widest text-white/50"
                      style={{ 
                        background: 'linear-gradient(to bottom, rgba(139,92,246,0.05), rgba(139,92,246,0.15))',
                        borderBottomColor: 'var(--accent-color)'
                      }}
                    >
                      Palco
                    </div>
                    
                    {/* Rows */}
                    <div className="flex flex-col gap-1 w-full overflow-hidden items-center">
                      {Array.from({ length: previewRows }).map((_, rIdx) => {
                        const rowName = getRowLabel(rIdx)
                        const count = t.exceptions?.[rowName] !== undefined ? t.exceptions[rowName] : defaultSeats
                        const finalCount = Math.min(14, count) // max dots in preview
                        return (
                          <div key={rowName} className="flex gap-0.5 justify-center items-center">
                            {Array.from({ length: finalCount }).map((_, sIdx) => (
                              <div 
                                key={sIdx}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: 'rgba(139, 92, 246, 0.4)' }}
                              />
                            ))}
                            {count > 14 && (
                              <span className="text-[6px] text-gray-500 font-bold ml-0.5 leading-none">+</span>
                            )}
                          </div>
                        )
                      })}
                      {totalRows > previewRows && (
                        <div className="text-[7px] text-gray-500 font-bold tracking-widest mt-0.5">
                          + {totalRows - previewRows} FILEIRAS
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

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

              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Corredores (colunas após as quais haverá um corredor)</label>
                <input 
                  value={corridorsInput} 
                  onChange={(e) => setCorridorsInput(e.target.value)} 
                  placeholder="Ex: 4, 9 (separadas por vírgula)"
                  className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                  style={inputStyle} 
                />
                <span className="text-[10px] text-gray-500 block mt-1">Coloque os números das colunas separados por vírgula.</span>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Corredores Horizontais (fileiras após as quais haverá corredor)</label>
                <input 
                  value={horizontalCorridorsInput} 
                  onChange={(e) => setHorizontalCorridorsInput(e.target.value)} 
                  placeholder="Ex: D, H (separadas por vírgula)"
                  className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                  style={inputStyle} 
                />
                <span className="text-[10px] text-gray-500 block mt-1">Coloque as letras das fileiras separadas por vírgula.</span>
              </div>

              <div className="space-y-3 pt-2">
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
                  className="w-full max-w-xs py-1.5 mb-3 rounded-b-xl border-b-2 text-center text-[9px] font-black uppercase tracking-widest text-white/70 shadow-lg shrink-0"
                  style={{ 
                    background: 'linear-gradient(to bottom, rgba(139,92,246,0.1), rgba(139,92,246,0.25))',
                    borderBottomColor: 'var(--accent-color)',
                    boxShadow: '0 5px 15px -5px rgba(139,92,246,0.3)'
                  }}
                >
                  PALCO / TELA
                </div>

                {/* Corridor between Stage and first row */}
                <div className="w-full max-w-xs py-1.5 mb-4 border-y border-dashed border-white/10 text-[8px] text-gray-500 uppercase tracking-widest font-black shrink-0 text-center select-none bg-white/[0.01]">
                  🛣️ Corredor de Acesso ao Palco
                </div>

                <div className="w-full overflow-auto max-h-60 py-1 custom-scrollbar flex flex-col">
                  <div className="flex flex-col gap-1.5 mx-auto py-1 px-1 w-fit">
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
                            <span className="text-[10px] font-black text-gray-500 w-4 text-center shrink-0">{rowName}</span>
                            <div className="flex gap-1 items-center">
                              {count === 0 ? (
                                <span className="text-[8px] text-rose-400 italic font-semibold">Sem cadeiras</span>
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
                                        className="rounded flex items-center justify-center font-bold border shrink-0 transition-all select-none hover:scale-110 cursor-help"
                                        style={{ 
                                          width: `${seatSize}px`,
                                          height: `${seatSize}px`,
                                          fontSize: `${previewSeatFontSize}px`,
                                          backgroundColor: 'rgba(139, 92, 246, 0.15)',
                                          borderColor: 'rgba(139, 92, 246, 0.35)',
                                          color: 'var(--text-primary)',
                                        }}
                                        title={`Assento ${seatLabel}`}
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

      {/* Modal Visualização Prévia do Teatro */}
      <Modal 
        isOpen={!!selectedPreviewTheater} 
        onClose={() => setSelectedPreviewTheater(null)} 
        title={`Mapa do Teatro: ${selectedPreviewTheater?.name}`} 
        size="2xl"
      >
        {selectedPreviewTheater && (() => {
          const config = selectedPreviewTheater
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

          return (
            <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Info stats */}
              <div className="grid grid-cols-3 gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400">Total Fileiras</p>
                  <p className="text-lg font-black text-white">{rows}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400">Cadeiras Padrão</p>
                  <p className="text-lg font-black text-white">{stdSeats}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400">Capacidade Total</p>
                  <p className="text-lg font-black text-purple-400">
                    {(() => {
                      let total = 0
                      for (let r = 0; r < rows; r++) {
                        const rowName = getRowLabel(r)
                        const count = excs[rowName] !== undefined ? excs[rowName] : stdSeats
                        total += count
                      }
                      return total
                    })()}
                  </p>
                </div>
              </div>

              {/* Stage Visualizer */}
              <div className="flex flex-col items-center justify-center p-6 rounded-3xl border border-white/5 relative overflow-hidden bg-black/30">
                <div 
                  className="w-full max-w-xs py-2 mb-3 rounded-b-xl border-b-2 text-center text-[10px] font-black uppercase tracking-widest text-white/70 shadow-lg shrink-0"
                  style={{ 
                    background: 'linear-gradient(to bottom, rgba(139,92,246,0.1), rgba(139,92,246,0.25))',
                    borderBottomColor: 'var(--accent-color)',
                    boxShadow: '0 5px 15px -5px rgba(139,92,246,0.3)'
                  }}
                >
                  PALCO / TELA
                </div>

                {/* Corridor between Stage and first row */}
                <div className="w-full max-w-xs py-1.5 mb-4 border-y border-dashed border-white/10 text-[8px] text-gray-500 uppercase tracking-widest font-black shrink-0 text-center select-none bg-white/[0.01]">
                  🛣️ Corredor de Acesso ao Palco
                </div>

                {/* Seating Grid */}
                <div className="w-full overflow-auto max-h-96 py-2 custom-scrollbar flex flex-col">
                  <div className="flex flex-col gap-2.5 mx-auto py-2 px-2 w-fit">
                    {Array.from({ length: rows }).map((_, rIdx) => {
                      const rowName = getRowLabel(rIdx)
                      const count = excs[rowName] !== undefined ? excs[rowName] : stdSeats
                      const rowStartNum = rowStartNumbers[rIdx]
                      const hasHorizontalCorridorAfter = hCorridors.includes(rowName)

                      return (
                        <React.Fragment key={rowName}>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-black text-gray-500 w-4 text-center shrink-0">{rowName}</span>
                            <div className="flex gap-1 items-center">
                              {count === 0 ? (
                                <span className="text-[9px] text-rose-400 italic font-semibold">Sem cadeiras</span>
                              ) : (
                                Array.from({ length: count }).map((_, sIdx) => {
                                  const seatNum = rowStartNum + sIdx
                                  const seatLabel = `${rowName}${seatNum}`
                                  const isCorridorAfter = mapCorridors.includes(sIdx + 1)
                                  const isThreeDigits = seatNum > 99
                                  const seatFontSize = isThreeDigits 
                                    ? Math.max(8, displaySeatSize * 0.35) 
                                    : Math.max(9, displaySeatSize * 0.45)
                                  return (
                                    <React.Fragment key={seatLabel}>
                                      <div 
                                        className="rounded flex items-center justify-center font-bold border shrink-0 transition-all select-none hover:scale-110 cursor-help"
                                        style={{ 
                                          width: `${displaySeatSize}px`,
                                          height: `${displaySeatSize}px`,
                                          fontSize: `${seatFontSize}px`,
                                          backgroundColor: 'rgba(139, 92, 246, 0.15)',
                                          borderColor: 'rgba(139, 92, 246, 0.35)',
                                          color: 'var(--text-primary)',
                                        }}
                                        title={`Assento ${seatLabel}`}
                                      >
                                        {seatNum}
                                      </div>
                                      {isCorridorAfter && sIdx < count - 1 && (
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
                            <span className="text-[10px] font-black text-gray-500 w-4 text-center shrink-0">{rowName}</span>
                          </div>
                          {hasHorizontalCorridorAfter && rIdx < rows - 1 && (
                            <div 
                              className="shrink-0 select-none pointer-events-none" 
                              style={{ height: '14px' }} 
                            />
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setSelectedPreviewTheater(null)} 
                  className="rounded-2xl px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
