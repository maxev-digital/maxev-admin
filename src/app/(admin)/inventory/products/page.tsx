'use client';

import { useState, useMemo, Fragment } from 'react';
import {
  Package, TrendingUp, TrendingDown, Minus, Sparkles,
  Plus, Search, PenLine, Trash2, Check, X,
} from 'lucide-react';

type Product = {
  id: number;
  name: string;
  category: string;
  sku: string;
  inStock: number;
  minStock: number;
  unitCost: number;
  unit: string;
  supplier: string;
  trend: 'up' | 'down' | 'stable';
};

const INITIAL: Product[] = [
  // ── Residential Hardware ─────────────────────────────────────────────────
  { id: 1,  name: '4-Camera Security Bundle',      category: 'Hardware',     sku: 'SS-CAM-4K',      inStock: 38,  minStock: 10, unitCost: 480,   unit: 'system',       supplier: 'SecurityTech Distributors', trend: 'down'   },
  { id: 2,  name: 'HD Video Doorbell',             category: 'Hardware',     sku: 'SS-BELL-HD',     inStock: 27,  minStock: 10, unitCost: 95,    unit: 'unit',         supplier: 'SecurityTech Distributors', trend: 'up'     },
  { id: 3,  name: 'Smart Lock Pro',                category: 'Hardware',     sku: 'SS-LOCK-PRO',    inStock: 21,  minStock: 8,  unitCost: 145,   unit: 'unit',         supplier: 'SecurityTech Distributors', trend: 'stable' },
  { id: 4,  name: 'Indoor Motion Sensor',          category: 'Hardware',     sku: 'SS-MOT-IN',      inStock: 9,   minStock: 15, unitCost: 65,    unit: 'unit',         supplier: 'SecurityTech Distributors', trend: 'stable' },
  // ── Commercial Hardware ──────────────────────────────────────────────────
  { id: 5,  name: '8-Camera Commercial Bundle',   category: 'Hardware',     sku: 'SS-CAM-8PACK',   inStock: 22,  minStock: 5,  unitCost: 1200,  unit: 'system',       supplier: 'SecurityTech Distributors', trend: 'up'     },
  { id: 6,  name: '16-Camera Commercial System',  category: 'Hardware',     sku: 'SS-CAM-16PACK',  inStock: 15,  minStock: 4,  unitCost: 2600,  unit: 'system',       supplier: 'SecurityTech Distributors', trend: 'up'     },
  { id: 7,  name: '32-Camera Enterprise System',  category: 'Hardware',     sku: 'SS-CAM-32ENT',   inStock: 6,   minStock: 2,  unitCost: 5800,  unit: 'system',       supplier: 'SecurityTech Distributors', trend: 'up'     },
  { id: 8,  name: 'Smart Lock Pro (2-Pack)',       category: 'Hardware',     sku: 'SS-LOCK-COM',    inStock: 18,  minStock: 6,  unitCost: 240,   unit: 'pack',         supplier: 'SecurityTech Distributors', trend: 'up'     },
  { id: 9,  name: 'Smart Lock Pro (4-Pack)',       category: 'Hardware',     sku: 'SS-LOCK-4PK',    inStock: 12,  minStock: 4,  unitCost: 480,   unit: 'pack',         supplier: 'SecurityTech Distributors', trend: 'up'     },
  { id: 10, name: 'Smart Lock Pro (8-Pack)',       category: 'Hardware',     sku: 'SS-LOCK-8PK',    inStock: 8,   minStock: 2,  unitCost: 960,   unit: 'pack',         supplier: 'SecurityTech Distributors', trend: 'up'     },
  { id: 11, name: 'HD Video Doorbell (2-Pack)',    category: 'Hardware',     sku: 'SS-BELL-COM',    inStock: 20,  minStock: 5,  unitCost: 170,   unit: 'pack',         supplier: 'SecurityTech Distributors', trend: 'up'     },
  { id: 12, name: 'HD Video Doorbell (4-Pack)',    category: 'Hardware',     sku: 'SS-BELL-4PK',    inStock: 14,  minStock: 4,  unitCost: 340,   unit: 'pack',         supplier: 'SecurityTech Distributors', trend: 'up'     },
  { id: 13, name: 'Motion Sensor (10-Pack)',       category: 'Hardware',     sku: 'SS-MOT-10PK',    inStock: 16,  minStock: 4,  unitCost: 520,   unit: 'pack',         supplier: 'SecurityTech Distributors', trend: 'up'     },
  // ── Installation Services ────────────────────────────────────────────────
  { id: 14, name: 'Professional Installation',    category: 'Service',      sku: 'SS-INSTALL',     inStock: 999, minStock: 0,  unitCost: 0,     unit: 'job',          supplier: 'In-House',                  trend: 'up'     },
  { id: 15, name: 'Commercial Installation',      category: 'Service',      sku: 'SS-COM-INSTALL', inStock: 999, minStock: 0,  unitCost: 0,     unit: 'job',          supplier: 'In-House',                  trend: 'up'     },
  { id: 16, name: 'Enterprise Installation',      category: 'Service',      sku: 'SS-ENT-INSTALL', inStock: 999, minStock: 0,  unitCost: 0,     unit: 'job',          supplier: 'In-House',                  trend: 'up'     },
  // ── Monitoring Subscriptions ─────────────────────────────────────────────
  { id: 17, name: 'Monthly Monitoring Plan',      category: 'Subscription', sku: 'SS-MON-MO',      inStock: 999, minStock: 0,  unitCost: 0,     unit: 'subscription', supplier: 'In-House',                  trend: 'up'     },
  { id: 18, name: 'Commercial Monitoring Plan',   category: 'Subscription', sku: 'SS-COM-MON',     inStock: 999, minStock: 0,  unitCost: 0,     unit: 'subscription', supplier: 'In-House',                  trend: 'up'     },
  { id: 19, name: 'Enterprise Monitoring Plan',   category: 'Subscription', sku: 'SS-ENT-MON',     inStock: 999, minStock: 0,  unitCost: 0,     unit: 'subscription', supplier: 'In-House',                  trend: 'up'     },
];

const CATEGORIES = ['Hardware', 'Service', 'Subscription'];
const SUPPLIERS   = ['SecurityTech Distributors', 'In-House'];
const UNITS       = ['unit', 'system', 'pack', 'job', 'subscription'];

const fmt$ = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '8px 12px', fontSize: '0.68rem', fontWeight: 600,
  color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px', fontSize: '0.8rem', color: 'var(--light)',
  verticalAlign: 'middle', borderBottom: '1px solid rgba(255,255,255,0.04)',
};

export default function ProductsPage() {
  const [products, setProducts]       = useState<Product[]>(INITIAL);
  const [search, setSearch]           = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editingId, setEditingId]     = useState<number | null>(null);
  const [draft, setDraft]             = useState<Partial<Product>>({});

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category))).sort();
    return ['All', ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.supplier.toLowerCase().includes(term)
      );
    });
  }, [products, search, categoryFilter]);

  const totalValue  = products.reduce((s, p) => s + p.inStock * p.unitCost, 0);
  const avgCost     = products.reduce((s, p) => s + p.unitCost, 0) / products.length;
  const categoryCount = new Set(products.map((p) => p.category)).size;

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setDraft({ ...p });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const saveEdit = (id: number) => {
    setProducts((prev) =>
      prev.map((p) => p.id === id ? { ...p, ...draft, id } as Product : p)
    );
    setEditingId(null);
    setDraft({});
  };

  const deleteProduct = (id: number) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (editingId === id) cancelEdit();
  };

  const field = (label: string, children: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Catalog</h1>
          <p className="page-sub">{products.length} active SKUs</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm">
          <Plus size={13} />
          Add Product
        </button>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{products.length}</div>
            <Package size={18} style={{ color: 'var(--primary)', opacity: 0.7 }} />
          </div>
          <div className="kpi-label">Total Products</div>
        </div>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{categoryCount}</div>
            <Package size={18} style={{ color: 'var(--primary)', opacity: 0.7 }} />
          </div>
          <div className="kpi-label">Categories</div>
        </div>
        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(totalValue)}
            </div>
            <TrendingUp size={18} style={{ color: 'var(--green)', opacity: 0.7 }} />
          </div>
          <div className="kpi-label">Total Value</div>
        </div>
        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">{fmt$(avgCost)}</div>
            <Package size={18} style={{ color: 'var(--orange)', opacity: 0.7 }} />
          </div>
          <div className="kpi-label">Avg Cost / Item</div>
        </div>
      </div>

      {/* Search + Category Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray)' }} />
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, supplier..."
            style={{ paddingLeft: 32, fontSize: '0.82rem', height: 34 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.72rem' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['SKU', 'Product Name', 'Category', 'In Stock', 'Min Stock', 'Unit Cost', 'Unit', 'Supplier', 'Trend', 'Actions'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--gray)', fontSize: '0.83rem' }}>
                    No products match your search
                  </td>
                </tr>
              ) : filtered.map((p) => (
                <Fragment key={p.id}>
                  {/* ── Main row ── */}
                  <tr style={{ background: editingId === p.id ? 'rgba(37,99,235,0.06)' : undefined }}>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--gray)' }}>{p.sku}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--white)' }}>{p.name}</td>
                    <td style={tdStyle}>
                      <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{p.category}</span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: p.inStock < p.minStock ? 'var(--orange)' : 'var(--light)' }}>
                      {p.inStock.toLocaleString()}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--gray)' }}>{p.minStock.toLocaleString()}</td>
                    <td style={{ ...tdStyle, color: 'var(--green)', fontWeight: 600 }}>{fmt$(p.unitCost)}</td>
                    <td style={{ ...tdStyle, color: 'var(--gray)', fontSize: '0.75rem' }}>{p.unit}</td>
                    <td style={{ ...tdStyle, color: 'var(--gray)', fontSize: '0.75rem' }}>{p.supplier}</td>
                    <td style={tdStyle}>
                      {p.trend === 'up'     && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={14} style={{ color: 'var(--green)' }} /><span className="badge badge-blue" style={{ fontSize: '0.6rem', padding: '2px 5px' }}>+23% this month</span></div>}
                      {p.trend === 'down'   && <TrendingDown size={14} style={{ color: '#f87171' }} />}
                      {p.trend === 'stable' && <Minus size={14} style={{ color: 'var(--gray)' }} />}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${editingId === p.id ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ fontSize: '0.7rem' }}
                          onClick={() => editingId === p.id ? cancelEdit() : openEdit(p)}
                        >
                          <PenLine size={12} />
                          {editingId === p.id ? 'Editing' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.7rem', color: '#f87171' }}
                          onClick={() => deleteProduct(p.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* ── Inline edit panel ── */}
                  {editingId === p.id && (
                    <tr>
                      <td colSpan={10} style={{ padding: 0, borderBottom: '2px solid var(--primary)' }}>
                        <div style={{ padding: '20px 24px', background: 'rgba(37,99,235,0.05)', borderLeft: '3px solid var(--primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <PenLine size={14} style={{ color: 'var(--primary)' }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--white)' }}>
                              Editing — {p.name}
                            </span>
                          </div>

                          {/* Row 1: Name, SKU, Category, Unit */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
                            {field('Product Name',
                              <input className="input" style={{ fontSize: '0.82rem', height: 34 }}
                                value={draft.name ?? ''} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                            )}
                            {field('SKU',
                              <input className="input" style={{ fontSize: '0.82rem', height: 34, fontFamily: 'monospace' }}
                                value={draft.sku ?? ''} onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))} />
                            )}
                            {field('Category',
                              <select className="input" style={{ fontSize: '0.82rem', height: 34 }}
                                value={draft.category ?? ''} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}>
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            )}
                            {field('Unit',
                              <select className="input" style={{ fontSize: '0.82rem', height: 34 }}
                                value={draft.unit ?? ''} onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}>
                                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                              </select>
                            )}
                          </div>

                          {/* Row 2: In Stock, Min Stock, Unit Cost, Supplier, Trend */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
                            {field('In Stock',
                              <input className="input" type="number" min={0} style={{ fontSize: '0.82rem', height: 34 }}
                                value={draft.inStock ?? 0} onChange={(e) => setDraft((d) => ({ ...d, inStock: Number(e.target.value) }))} />
                            )}
                            {field('Min Stock (Reorder Point)',
                              <input className="input" type="number" min={0} style={{ fontSize: '0.82rem', height: 34 }}
                                value={draft.minStock ?? 0} onChange={(e) => setDraft((d) => ({ ...d, minStock: Number(e.target.value) }))} />
                            )}
                            {field('Unit Cost ($)',
                              <input className="input" type="number" min={0} step={0.01} style={{ fontSize: '0.82rem', height: 34 }}
                                value={draft.unitCost ?? 0} onChange={(e) => setDraft((d) => ({ ...d, unitCost: Number(e.target.value) }))} />
                            )}
                            {field('Supplier',
                              <select className="input" style={{ fontSize: '0.82rem', height: 34 }}
                                value={draft.supplier ?? ''} onChange={(e) => setDraft((d) => ({ ...d, supplier: e.target.value }))}>
                                {SUPPLIERS.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            )}
                            {field('Usage Trend',
                              <select className="input" style={{ fontSize: '0.82rem', height: 34 }}
                                value={draft.trend ?? 'stable'} onChange={(e) => setDraft((d) => ({ ...d, trend: e.target.value as Product['trend'] }))}>
                                <option value="up">Trending Up</option>
                                <option value="stable">Stable</option>
                                <option value="down">Trending Down</option>
                              </select>
                            )}
                          </div>

                          {/* Stock value preview */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                            <Sparkles size={13} style={{ color: 'var(--primary)' }} />
                            <span style={{ fontSize: '0.76rem', color: 'var(--gray)' }}>
                              Stock value at these figures:
                              <span style={{ color: 'var(--green)', fontWeight: 700, marginLeft: 6 }}>
                                {fmt$((draft.inStock ?? 0) * (draft.unitCost ?? 0))}
                              </span>
                            </span>
                            {(draft.inStock ?? 0) < (draft.minStock ?? 0) && (
                              <span style={{ fontSize: '0.74rem', color: 'var(--orange)', fontWeight: 600 }}>
                                Below reorder point — purchase order recommended
                              </span>
                            )}
                          </div>

                          {/* Save / Cancel */}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => saveEdit(p.id)}>
                              <Check size={13} />
                              Save Changes
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                              <X size={13} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
