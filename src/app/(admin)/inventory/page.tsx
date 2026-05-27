'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Package, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Sparkles, Plus, X,
} from 'lucide-react';

type StockTrend = 'UP' | 'DOWN' | 'STABLE';

type Product = {
  id: string;
  name: string;
  category: string;
  sku: string;
  inStock: number;
  minStock: number;
  unitCost: number;
  unit: string;
  trend: StockTrend;
  supplier: { name: string } | null;
};

const fmt$ = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

function getStatus(p: Product): 'OK' | 'LOW' | 'CRITICAL' {
  if (p.inStock < p.minStock * 0.5) return 'CRITICAL';
  if (p.inStock < p.minStock) return 'LOW';
  return 'OK';
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '8px 12px', fontSize: '0.68rem', fontWeight: 600,
  color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '10px 12px', fontSize: '0.8rem', color: 'var(--light)',
  verticalAlign: 'middle', borderBottom: '1px solid rgba(255,255,255,0.04)',
};

interface AddItemForm {
  name: string; category: string; sku: string; inStock: string;
  minStock: string; unitCost: string; unit: string;
}
const BLANK_ITEM: AddItemForm = { name: '', category: '', sku: '', inStock: '0', minStock: '0', unitCost: '0', unit: 'units' };

export default function InventoryPage() {
  const [products, setProducts]           = useState<Product[]>([]);
  const [loading, setLoading]             = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [aiDismissed, setAiDismissed]     = useState(false);
  const [aiRecs, setAiRecs]               = useState('');
  const [aiRecsLoading, setAiRecsLoading] = useState(false);
  const [showAdd, setShowAdd]             = useState(false);
  const [addForm, setAddForm]             = useState<AddItemForm>(BLANK_ITEM);
  const [addSaving, setAddSaving]         = useState(false);
  const [addErr, setAddErr]               = useState('');

  useEffect(() => {
    fetch('/api/inventory/products')
      .then((r) => r.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
        // Auto-fetch AI reorder recommendations if low-stock items exist
        const hasLowStock = data.some((p: Product) => p.inStock < p.minStock);
        if (hasLowStock) loadReorderRecs();
      })
      .catch(() => setLoading(false));
  }, []);

  async function loadReorderRecs() {
    setAiRecsLoading(true);
    try {
      const res  = await fetch('/api/ai/reorder');
      const data = await res.json();
      setAiRecs(data.recommendations ?? '');
    } catch {
      setAiRecs('');
    } finally {
      setAiRecsLoading(false);
    }
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name || !addForm.category || !addForm.sku) { setAddErr('Name, Category, and SKU are required.'); return; }
    setAddSaving(true); setAddErr('');
    try {
      const res = await fetch('/api/inventory/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:      addForm.name.trim(),
          category:  addForm.category.trim(),
          sku:       addForm.sku.trim().toUpperCase(),
          inStock:   parseFloat(addForm.inStock) || 0,
          minStock:  parseFloat(addForm.minStock) || 0,
          unitCost:  parseFloat(addForm.unitCost) || 0,
          unit:      addForm.unit.trim() || 'units',
          trend:     'STABLE',
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const product = await res.json();
      setProducts((prev) => [...prev, { ...product, supplier: null }]);
      setShowAdd(false);
      setAddForm(BLANK_ITEM);
    } catch {
      setAddErr('Could not add item. Try again.');
    } finally {
      setAddSaving(false);
    }
  }

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category))).sort();
    return ['All', ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    if (categoryFilter === 'All') return products;
    return products.filter((p) => p.category === categoryFilter);
  }, [products, categoryFilter]);

  const lowStockItems = products.filter((p) => p.inStock < p.minStock);
  const totalValue    = products.reduce((s, p) => s + p.inStock * p.unitCost, 0);
  const onReorder     = products.filter((p) => getStatus(p) === 'CRITICAL').length;

  if (loading) return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Inventory</h1><p className="page-sub">Stock levels, reorder queue, and supply status</p></div>
      </div>
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--gray)', fontSize: '0.88rem' }}>Loading inventory...</div>
    </>
  );

  if (products.length === 0) return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Inventory</h1><p className="page-sub">Stock levels, reorder queue, and supply status</p></div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={13} />Add Item</button>
      </div>
      <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <Package size={36} style={{ color: 'var(--gray)', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--light)', marginBottom: 6 }}>No inventory items yet</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--gray)' }}>Add your first product to start tracking stock levels.</div>
      </div>
    </>
  );

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Inventory</h1><p className="page-sub">Stock levels, reorder queue, and supply status</p></div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={13} />Add Item</button>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{products.length}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total SKUs</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>Across all categories</div>
        </div>

        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">{lowStockItems.length}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Low Stock Items</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>Below minimum threshold</div>
        </div>

        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green">{fmt$(totalValue)}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total Inventory Value</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>Current stock × unit cost</div>
        </div>

        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{onReorder}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Items on Reorder</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>Critical level reached</div>
        </div>
      </div>

      {/* AI Reorder panel */}
      {!aiDismissed && (onReorder > 0 || lowStockItems.length > 0) && (
        <div className="card-blue" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={17} style={{ color: '#818cf8' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--light)' }}>AI Reorder Recommendations</span>
                <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Powered by Claude</span>
                {aiRecsLoading && <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>Analyzing stock...</span>}
              </div>
              {aiRecsLoading ? (
                <p style={{ fontSize: '0.83rem', color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, fontStyle: 'italic' }}>Generating recommendations from your inventory data...</p>
              ) : aiRecs ? (
                <div style={{ fontSize: '0.83rem', color: 'var(--light)', lineHeight: 1.7, marginBottom: 14, whiteSpace: 'pre-wrap' }}>{aiRecs}</div>
              ) : (
                <p style={{ fontSize: '0.83rem', color: 'var(--light)', lineHeight: 1.6, marginBottom: 14 }}>
                  {lowStockItems.length} item{lowStockItems.length !== 1 ? 's are' : ' is'} below minimum stock. Click Refresh for AI recommendations.
                </p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={loadReorderRecs} disabled={aiRecsLoading}>
                  <Sparkles size={11} /> {aiRecsLoading ? 'Analyzing...' : 'Refresh Recommendations'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setAiDismissed(true)}>Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 10, marginBottom: 20, fontSize: '0.83rem', color: 'var(--orange)' }}>
          <AlertTriangle size={15} />
          <span><strong>{lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''}</strong> below minimum stock levels — review and reorder promptly.</span>
        </div>
      )}

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <button key={cat} type="button" onClick={() => setCategoryFilter(cat)}
            className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.72rem' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Product Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['SKU', 'Name', 'Category', 'In Stock', 'Min Stock', 'Status', 'Unit Cost', 'Supplier', 'Trend'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const status = getStatus(p);
                return (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--gray)' }}>{p.sku}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--white)' }}>{p.name}</td>
                    <td style={tdStyle}><span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{p.category}</span></td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: status === 'CRITICAL' ? '#f87171' : status === 'LOW' ? 'var(--orange)' : 'var(--light)' }}>
                      {p.inStock.toLocaleString()} {p.unit}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--gray)' }}>{p.minStock.toLocaleString()}</td>
                    <td style={tdStyle}>
                      {status === 'OK'       && <span className="badge badge-green">OK</span>}
                      {status === 'LOW'      && <span className="badge badge-orange">LOW</span>}
                      {status === 'CRITICAL' && <span className="badge badge-red">CRITICAL</span>}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--light)' }}>{fmt$(p.unitCost)}</td>
                    <td style={{ ...tdStyle, color: 'var(--gray)', fontSize: '0.75rem' }}>{p.supplier?.name ?? '—'}</td>
                    <td style={tdStyle}>
                      {p.trend === 'UP'     && <TrendingUp size={15} style={{ color: 'var(--green)' }} />}
                      {p.trend === 'DOWN'   && <TrendingDown size={15} style={{ color: '#f87171' }} />}
                      {p.trend === 'STABLE' && <Minus size={15} style={{ color: 'var(--gray)' }} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div style={{ width: '100%', maxWidth: 500, background: '#0a0a0f', border: '1px solid #1a1a2e', borderRadius: 14, padding: 32, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 4 }}>Inventory</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>Add Item</h2>
              </div>
              <button type="button" onClick={() => setShowAdd(false)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #222', borderRadius: 8, padding: '6px 8px', color: '#888', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            <form onSubmit={saveItem} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Item Name *</label>
                  <input style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                    placeholder="e.g. Cleaning Supplies" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category *</label>
                  <input style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                    placeholder="e.g. Supplies" value={addForm.category} onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>SKU *</label>
                  <input style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                    placeholder="e.g. CLN-001" value={addForm.sku} onChange={(e) => setAddForm((f) => ({ ...f, sku: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Unit</label>
                  <input style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                    placeholder="units / kg / liters" value={addForm.unit} onChange={(e) => setAddForm((f) => ({ ...f, unit: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>In Stock</label>
                  <input type="number" min="0" style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                    value={addForm.inStock} onChange={(e) => setAddForm((f) => ({ ...f, inStock: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Min Stock</label>
                  <input type="number" min="0" style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                    value={addForm.minStock} onChange={(e) => setAddForm((f) => ({ ...f, minStock: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Unit Cost ($)</label>
                  <input type="number" min="0" step="0.01" style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                    value={addForm.unitCost} onChange={(e) => setAddForm((f) => ({ ...f, unitCost: e.target.value }))} />
                </div>
              </div>
              {addErr && <div style={{ color: '#f87171', fontSize: 13 }}>{addErr}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={addSaving}>{addSaving ? 'Saving...' : 'Add Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
