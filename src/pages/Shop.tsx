import { useEffect, useState } from 'react'
import { ShoppingBag, Search, Plus, Minus, Check, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Product, Profile } from '../types'
import Modal from '../components/Modal'
import QuantumLoader from '../components/QuantumLoader'

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sellingId, setSellingId] = useState<string | null>(null)
  const [saleQuantities, setSaleQuantities] = useState<Record<string, number>>({})
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)

  const [showSaleModal, setShowSaleModal] = useState(false)

  const [customSaleForm, setCustomSaleForm] = useState({
    productId: '',
    quantity: 1,
    hasDiscount: false,
    discountAmount: '0'
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  async function loadInitialData() {
    setLoading(true)
    try {
      // 1. Get current user & profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)

      // 2. Load products
      await loadProducts()
      
      // 3. Load recent sales (financial entries type=income and category=Venda today)
      await loadRecentSales()

    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('name')
    setProducts(data || [])
    
    // Initialize quantities to 1
    const qtyMap: Record<string, number> = {}
    if (data) {
      data.forEach(p => {
        qtyMap[p.id] = 1
      })
    }
    setSaleQuantities(qtyMap)
  }

  async function loadRecentSales() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('financial_entries')
      .select('*')
      .eq('type', 'income')
      .eq('category', 'Venda de Produto')
      .eq('date', today)
      .order('created_at', { ascending: false })
    
    setRecentSales(data || [])
  }

  function handleQtyChange(id: string, amount: number, max: number) {
    const current = saleQuantities[id] || 1
    const next = Math.max(1, Math.min(max, current + amount))
    setSaleQuantities({
      ...saleQuantities,
      [id]: next
    })
  }

  async function handleSell(product: Product) {
    const qty = saleQuantities[product.id] || 1
    if (qty > product.quantity) {
      alert('Quantidade solicitada é maior que o estoque disponível!')
      return
    }

    setSellingId(product.id)

    try {
      // 1. Decrement product quantity in DB
      const newQty = product.quantity - qty
      const { error: prodErr } = await supabase
        .from('products')
        .update({ quantity: newQty })
        .eq('id', product.id)

      if (prodErr) throw prodErr

      // 2. Insert into financial_entries
      const { error: finErr } = await supabase
        .from('financial_entries')
        .insert([{
          type: 'income',
          category: 'Venda de Produto',
          description: `Venda Loja: ${qty}x ${product.name}`,
          amount: product.price * qty,
          date: new Date().toISOString().split('T')[0]
        }])

      if (finErr) throw finErr

      // 3. Reload
      await loadProducts()
      await loadRecentSales()
      
      // Success visual feedback
      alert(`Venda de ${qty}x ${product.name} registrada com sucesso!`)

    } catch (err: any) {
      console.error(err)
      alert('Erro ao processar venda: ' + err.message)
    } finally {
      setSellingId(null)
    }
  }

  async function handleCustomSale(e: React.FormEvent) {
    e.preventDefault()
    const product = products.find(p => p.id === customSaleForm.productId)
    if (!product) {
      alert('Selecione um produto cadastrado!')
      return
    }

    const qty = customSaleForm.quantity
    if (qty > product.quantity) {
      alert(`Quantidade solicitada (${qty}) é maior que o estoque disponível (${product.quantity})!`)
      return
    }

    const discount = customSaleForm.hasDiscount ? parseFloat(customSaleForm.discountAmount) || 0 : 0
    const subtotal = product.price * qty
    if (discount > subtotal) {
      alert('O valor do desconto não pode ser maior que o subtotal da venda!')
      return
    }

    const total = subtotal - discount
    setLoading(true)

    try {
      // 1. Decrement product quantity in DB
      const newQty = product.quantity - qty
      const { error: prodErr } = await supabase
        .from('products')
        .update({ quantity: newQty })
        .eq('id', product.id)

      if (prodErr) throw prodErr

      // 2. Insert into financial_entries
      const descStr = `Venda Loja: ${qty}x ${product.name}${discount > 0 ? ` (Desconto: R$ ${discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : ''}`
      const { error: finErr } = await supabase
        .from('financial_entries')
        .insert([{
          type: 'income',
          category: 'Venda de Produto',
          description: descStr,
          amount: total,
          date: new Date().toISOString().split('T')[0]
        }])

      if (finErr) throw finErr

      // 3. Reload
      await loadProducts()
      await loadRecentSales()
      
      alert('Venda registrada com sucesso!')
      setShowSaleModal(false)
      setCustomSaleForm({ productId: '', quantity: 1, hasDiscount: false, discountAmount: '0' })
    } catch (err: any) {
      console.error(err)
      alert('Erro ao registrar venda: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  )

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="flex flex-col pb-10">
      {/* Header section with accent glows */}
      <div 
        className="p-5 sm:p-8 md:p-10 pb-10 sm:pb-16 rounded-2xl border border-white/5 shadow-2xl mb-12 relative overflow-hidden"
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
              style={{ 
                backgroundColor: 'var(--accent-color)', 
                color: '#fff',
                fontSize: 'var(--title-size, 32px)',
                paddingLeft: 'clamp(16px, 4vw, 40px)',
                paddingRight: 'clamp(16px, 4vw, 40px)'
              }}
            >
              Loja
            </h1>
            <br />
            <p 
              className="font-bold inline-block py-3 sm:py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
               style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: 'clamp(12px, 3vw, 32px)', paddingRight: 'clamp(12px, 3vw, 32px)' }}
            >
              Realize vendas de produtos com baixa automática de estoque e fluxo de caixa
            </p>
          </div>

          <div className="flex flex-wrap gap-4 relative z-10 shrink-0">
            <button
              onClick={() => setShowSaleModal(true)}
              className="flex items-center gap-2 rounded-2xl px-6 py-4 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/20 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
            >
              <ShoppingBag size={20} />
              Nova Venda
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <QuantumLoader size={45} speed={1.75} color="var(--accent-color)" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Catalog Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/5" style={{ backgroundColor: 'var(--bg-card)' }}>
              <Search className="opacity-40" size={20} />
              <input
                type="text"
                placeholder="Buscar produto ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent border-none text-sm focus:outline-none placeholder-white/30"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 rounded-2xl border border-white/5" style={{ backgroundColor: 'var(--bg-card)' }}>
                <ShoppingBag size={48} className="mx-auto opacity-20 mb-4" />
                <p style={{ color: 'var(--text-muted)' }}>Nenhum produto disponível para venda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.quantity <= 0
                  const qtyToSell = saleQuantities[product.id] || 1
                  const isSelling = sellingId === product.id

                  return (
                    <div
                      key={product.id}
                      className="group rounded-2xl p-6 border border-white/5 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between"
                      style={{ backgroundColor: 'var(--bg-card)' }}
                    >
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{product.name}</h3>
                            {product.category && (
                              <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">
                                {product.category}
                              </span>
                            )}
                          </div>
                          <span className="text-xl font-black text-emerald-400">
                            R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {product.description && (
                          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                            {product.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        {isOutOfStock ? (
                          <div className="flex items-center gap-2 text-rose-500 text-xs font-bold py-3 justify-center">
                            <AlertCircle size={16} />
                            PRODUTO ESGOTADO
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs">
                              <span style={{ color: 'var(--text-muted)' }}>Estoque disponível:</span>
                              <span className="font-bold text-white">{product.quantity} un</span>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)' }}>
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(product.id, -1, product.quantity)}
                                  className="p-3 text-white/50 hover:text-white transition-colors"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="px-4 text-sm font-bold w-12 text-center" style={{ color: 'var(--text-primary)' }}>
                                  {qtyToSell}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(product.id, 1, product.quantity)}
                                  className="p-3 text-white/50 hover:text-white transition-colors"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>

                              <button
                                onClick={() => handleSell(product)}
                                disabled={isSelling}
                                className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 cursor-pointer"
                                style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
                              >
                                {isSelling ? (
                                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <ShoppingBag size={14} />
                                    Realizar Venda (R$ {(product.price * qtyToSell).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Side Panel: Recent Sales */}
          <div className="space-y-6">
            <div className="rounded-2xl p-6 border border-white/5" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="flex items-center gap-3 mb-6">
                <ShoppingBag size={20} className="text-purple-400" />
                <h2 className="font-black text-sm uppercase tracking-widest text-white">Vendas de Hoje</h2>
              </div>

              {recentSales.length === 0 ? (
                <div className="text-center py-10 opacity-40">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nenhuma venda registrada hoje.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-4 rounded-xl border border-white/5 flex items-center justify-between"
                      style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{sale.description}</p>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="text-sm font-black text-emerald-400">
                        + R$ {sale.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Modal Nova Venda */}
      <Modal isOpen={showSaleModal} onClose={() => setShowSaleModal(false)} title="Registrar Nova Venda">
        <form onSubmit={handleCustomSale} className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Selecione o Produto *</label>
              <select
                required
                value={customSaleForm.productId}
                onChange={(e) => setCustomSaleForm({ ...customSaleForm, productId: e.target.value, quantity: 1 })}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all font-medium"
              >
                <option value="" className="bg-gray-900">-- Selecione um produto --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} disabled={p.quantity <= 0} className="bg-gray-900">
                    {p.name} {p.quantity <= 0 ? '(Esgotado)' : `(Estoque: ${p.quantity})`}
                  </option>
                ))}
              </select>
            </div>

            {customSaleForm.productId && (() => {
              const selectedProduct = products.find(p => p.id === customSaleForm.productId)
              if (!selectedProduct) return null
              
              const subtotal = selectedProduct.price * customSaleForm.quantity
              const discount = customSaleForm.hasDiscount ? parseFloat(customSaleForm.discountAmount) || 0 : 0
              const total = Math.max(0, subtotal - discount)

              return (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4 animate-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 font-bold">Preço Unitário</p>
                      <p className="text-lg font-black text-white">R$ {selectedProduct.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold">Estoque Disponível</p>
                      <p className="text-lg font-black text-purple-400">{selectedProduct.quantity} unidades</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 font-bold block mb-1">Quantidade *</label>
                      <input
                        required
                        type="number"
                        min="1"
                        max={selectedProduct.quantity}
                        value={customSaleForm.quantity}
                        onChange={(e) => setCustomSaleForm({ ...customSaleForm, quantity: Math.max(1, Math.min(selectedProduct.quantity, parseInt(e.target.value) || 1)) })}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-400 font-bold block mb-2">Desconto?</label>
                      <label className="inline-flex items-center gap-2 cursor-pointer mt-1">
                        <input
                          type="checkbox"
                          checked={customSaleForm.hasDiscount}
                          onChange={(e) => setCustomSaleForm({ ...customSaleForm, hasDiscount: e.target.checked, discountAmount: '0' })}
                          className="rounded border-white/10 text-purple-600 focus:ring-purple-500/50 bg-black/20 h-4 w-4"
                        />
                        <span className="text-xs text-white font-medium">Aplicar Desconto</span>
                      </label>
                    </div>
                  </div>

                  {customSaleForm.hasDiscount && (
                    <div className="animate-in">
                      <label className="text-xs text-gray-400 font-bold block mb-1">Valor do Desconto (R$)</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        max={subtotal}
                        value={customSaleForm.discountAmount}
                        onChange={(e) => setCustomSaleForm({ ...customSaleForm, discountAmount: e.target.value })}
                        placeholder="0,00"
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-gray-400 font-bold">Subtotal: R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      {discount > 0 && <span className="block text-[10px] text-rose-400 font-bold">Desconto: - R$ {discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400 font-bold block">Total a Pagar:</span>
                      <span className="text-2xl font-black text-emerald-400">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button 
              type="button" 
              onClick={() => setShowSaleModal(false)} 
              className="rounded-2xl px-5 py-2.5 text-sm font-bold border cursor-pointer" 
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={!customSaleForm.productId || loading}
              className="rounded-2xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:scale-105 cursor-pointer disabled:opacity-50 disabled:hover:scale-100" 
              style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
            >
              Confirmar Venda
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
