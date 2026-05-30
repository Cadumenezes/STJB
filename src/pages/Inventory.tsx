import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Product } from '../types'
import Modal from '../components/Modal'

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost_price: '',
    quantity: 0,
    category: '',
  })

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Obter o usuário autenticado para definir o user_id no cadastro do produto
    const { data: { user } } = await supabase.auth.getUser()
    
    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      cost_price: parseFloat(formData.cost_price),
      user_id: user?.id,
    }

    let error = null
    if (editProduct) {
      const res = await supabase.from('products').update(payload).eq('id', editProduct.id)
      error = res.error
    } else {
      const res = await supabase.from('products').insert([payload])
      error = res.error
    }
    
    if (error) {
      console.error(error)
      alert('Erro ao salvar produto: ' + error.message)
    } else {
      setShowModal(false)
      setEditProduct(null)
      resetForm()
      loadProducts()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este produto?')) return
    await supabase.from('products').delete().eq('id', id)
    loadProducts()
  }

  function openEdit(prod: Product) {
    setEditProduct(prod)
    setFormData({
      name: prod.name,
      description: prod.description || '',
      price: prod.price.toString(),
      cost_price: prod.cost_price.toString(),
      quantity: prod.quantity,
      category: prod.category || '',
    })
    setShowModal(true)
  }

  function resetForm() {
    setFormData({ name: '', description: '', price: '', cost_price: '', quantity: 0, category: '' })
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="flex flex-col pb-10">
      {/* Header Section with Dynamic Style */}
      <div 
        className="p-8 sm:p-10 pb-16 rounded-2xl border border-white/5 shadow-2xl mb-52 relative overflow-hidden"
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
              className="font-black tracking-tighter leading-tight inline-block py-8 rounded-2xl shadow-2xl shadow-purple-500/30" 
              style={{ 
                backgroundColor: 'var(--accent-color)', 
                color: '#fff',
                fontSize: 'var(--title-size, 32px)',
                paddingLeft: '40px',
                paddingRight: '40px'
              }}
            >
              Estoque
            </h1>
            <br />
            <p 
              className="font-bold inline-block py-6 mt-2 rounded-2xl shadow-xl border border-white/10" 
               style={{ backgroundColor: 'var(--accent-color)', color: '#fff', fontSize: 'var(--subtitle-size, 16px)', paddingLeft: '32px', paddingRight: '32px' }}
            >
              Controle de produtos e uniformes
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setEditProduct(null); setShowModal(true) }}
            className="flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/20"
            style={{ background: 'linear-gradient(135deg, var(--accent-color), #000)' }}
          >
            <Plus size={26} />
            Novo Produto
          </button>
        </div>
      </div>

      <div className="rounded-none overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Produto</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Categoria</th>
                <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Qtd</th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Preço Venda</th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum produto cadastrado</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border-color)' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl p-2" style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
                          <Package size={18} style={{ color: '#8b5cf6' }} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{p.category}</td>
                    <td className="px-6 py-4 text-sm text-center font-bold" style={{ color: p.quantity <= 5 ? '#f43f5e' : 'var(--text-primary)' }}>{p.quantity}</td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-emerald-400">R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(p)} className="p-2 rounded-2xl hover:opacity-70 transition-opacity" style={{ color: '#3b82f6' }}><Edit size={16} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-2xl hover:opacity-70 transition-opacity" style={{ color: '#f43f5e' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editProduct ? 'Editar Produto' : 'Novo Produto'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome *</label>
              <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" style={inputStyle} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Categoria</label>
              <input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" style={inputStyle} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Preço Custo (R$)</label>
              <input type="number" step="0.01" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })} className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" style={inputStyle} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Preço Venda (R$) *</label>
              <input required type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" style={inputStyle} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Quantidade *</label>
              <input required type="number" min="0" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })} className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Descrição</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50" style={inputStyle} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-2xl px-5 py-2.5 text-sm font-medium" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>Cancelar</button>
            <button type="submit" className="rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>{editProduct ? 'Salvar' : 'Cadastrar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
