import { useEffect, useState } from 'react'
import { ShoppingBag, Search, Plus, Minus, Check, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Product, Profile } from '../types'

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sellingId, setSellingId] = useState<string | null>(null)
  const [saleQuantities, setSaleQuantities] = useState<Record<string, number>>({})
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [schoolAdminId, setSchoolAdminId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

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

      let adminId = user.id
      if (profileData && profileData.role === 'secretary') {
        // Find secretary's school admin user_id
        const { data: teamData } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('email', user.email)
          .single()
        if (teamData) {
          adminId = teamData.user_id
        }
      }
      setSchoolAdminId(adminId)

      // 2. Load products
      await loadProducts(adminId)
      
      // 3. Load recent sales (financial entries type=income and category=Venda today)
      await loadRecentSales(adminId)

    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadProducts(adminId: string) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', adminId)
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

  async function loadRecentSales(adminId: string) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('financial_entries')
      .select('*')
      .eq('user_id', adminId)
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

    if (!schoolAdminId) {
      alert('Configuração do administrador da escola não localizada.')
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
          user_id: schoolAdminId,
          type: 'income',
          category: 'Venda de Produto',
          description: `Venda Loja: ${qty}x ${product.name}`,
          amount: product.price * qty,
          date: new Date().toISOString().split('T')[0]
        }])

      if (finErr) throw finErr

      // 3. Reload
      await loadProducts(schoolAdminId)
      await loadRecentSales(schoolAdminId)
      
      // Success visual feedback
      alert(`Venda de ${qty}x ${product.name} registrada com sucesso!`)

    } catch (err: any) {
      console.error(err)
      alert('Erro ao processar venda: ' + err.message)
    } finally {
      setSellingId(null)
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
        className="p-8 sm:p-10 pb-16 rounded-2xl border border-white/5 shadow-2xl mb-52 relative overflow-hidden"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
      >
        <div 
          className="absolute -left-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-20"
          style={{ backgroundColor: 'var(--accent-color)' }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8 relative z-10">
          <div className="space-y-4">
            <h1 
              className="font-black tracking-tighter leading-tight inline-block py-8 rounded-2xl shadow-2xl shadow-purple-500/30" 
              style={{ 
                backgroundColor: 'var(--accent-color)', 
                color: '#fff',
                fontSize: 'var(--title-size, 32px)',
                paddingLeft: '40px',
                paddingRight: '40px'
              }}
            >
              Loja
            </h1>
            <br />
            <p 
              className="font-bold inline-block py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
               style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: '32px', paddingRight: '32px' }}
            >
              Realize vendas de produtos com baixa automática de estoque e fluxo de caixa
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <div className="h-12 w-12 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
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
                                className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
                              >
                                {isSelling ? (
                                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <ShoppingBag size={14} />
                                    VENDER (R$ {(product.price * qtyToSell).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
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
    </div>
  )
}
