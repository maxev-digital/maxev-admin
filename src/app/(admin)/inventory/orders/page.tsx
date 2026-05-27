'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Truck, Package, Sparkles } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierName: string;
  status: string;
  orderDate: string;
  expectedDate: string | null;
  receivedDate: string | null;
  total: number;
  items: string[];
  notes: string | null;
}

interface ReorderItem {
  id: string;
  name: string;
  inStock: number;
  minStock: number;
  unitCost: number;
  supplier?: { id: string; name: string } | null;
}

const fmt$ = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const STATUS_BADGE: Record<string, string> = {
  delivered:    'badge-green',
  received:     'badge-green',
  'in-transit': 'badge-blue',
  ordered:      'badge-blue',
  pending:      'badge-orange',
  cancelled:    'badge-red',
};

const STATUS_LABEL: Record<string, string> = {
  delivered:    'Delivered',
  received:     'Received',
  'in-transit': 'In Transit',
  ordered:      'Ordered',
  pending:      'Pending',
  cancelled:    'Cancelled',
};

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontSize: '0.68rem', fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', fontSize: '0.8rem', color: 'var(--light)', verticalAlign: 'middle', borderBottom: '1px solid rgba(255,255,255,0.04)' };

export default function OrdersPage() {
  const [orders, setOrders]       = useState<PurchaseOrder[]>([]);
  const [reorder, setReorder]     = useState<ReorderItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [aiDismissed, setAiDismissed] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory/orders').then((r) => r.json()),
      fetch('/api/inventory/products').then((r) => r.json()),
    ])
      .then(([ords, prods]) => {
        setOrders(ords);
        const low: ReorderItem[] = (prods.products ?? prods).filter((p: ReorderItem) => p.inStock <= p.minStock && p.inStock >= 0);
        setReorder(low.slice(0, 4));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalOrders   = orders.length;
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const inTransit     = orders.filter((o) => o.status === 'in-transit' || o.status === 'ordered').length;
  const totalSpend    = orders.filter((o) => o.status === 'received' || o.status === 'delivered').reduce((s, o) => s + o.total, 0);

  const visibleSuggestions = reorder.filter((r) => !dismissed.has(r.id));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-sub">Order history, fulfillment status, and supplier deliveries</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{loading ? '—' : totalOrders}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total Orders</div>
        </div>

        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">{loading ? '—' : pendingOrders}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Pending</div>
        </div>

        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{loading ? '—' : inTransit}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">In Transit</div>
        </div>

        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green">{loading ? '—' : fmt$(totalSpend)}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total Spend</div>
        </div>
      </div>

      {!aiDismissed && visibleSuggestions.length > 0 && (
        <div className="card-blue" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={17} style={{ color: '#818cf8' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--light)' }}>Low Stock — Reorder Suggested</span>
                <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>AI Agent</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--gray)', lineHeight: 1.5, marginBottom: 16 }}>
                {visibleSuggestions.length} item{visibleSuggestions.length !== 1 ? 's' : ''} at or below minimum stock level.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
                {visibleSuggestions.map((p) => (
                  <div key={p.id} style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--white)', marginBottom: 6 }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginBottom: 2 }}>
                      Stock: <span style={{ color: p.inStock === 0 ? 'var(--red)' : 'var(--orange)', fontWeight: 600 }}>{p.inStock}</span> / min {p.minStock}
                    </div>
                    {p.unitCost > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginBottom: 12 }}>
                        Unit cost: <span style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt$(p.unitCost)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem' }} onClick={() => setDismissed((prev) => new Set([...prev, p.id]))}>
                        Skip
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn btn-ghost btn-sm" onClick={() => setAiDismissed(true)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--light)' }}>All Purchase Orders</span>
        </div>

        {loading ? (
          <div style={{ color: 'var(--gray)', padding: '40px 0', textAlign: 'center' }}>Loading...</div>
        ) : orders.length === 0 ? (
          <div style={{ color: 'var(--gray)', padding: '40px 0', textAlign: 'center', fontSize: '0.84rem' }}>No purchase orders yet.</div>
        ) : (
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['PO Number', 'Supplier', 'Items', 'Total', 'Status', 'Order Date', 'Expected / Received'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{o.orderNumber}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--white)' }}>{o.supplierName}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {o.items.map((item, i) => (
                          <span key={i} style={{ fontSize: '0.74rem', color: 'var(--gray)' }}>{item}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--green)', fontWeight: 700 }}>{fmt$(o.total)}</td>
                    <td style={tdStyle}>
                      <span className={`badge ${STATUS_BADGE[o.status] ?? 'badge-gray'}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--gray)' }}>{fmtDate(o.orderDate)}</td>
                    <td style={{ ...tdStyle, color: 'var(--gray)' }}>
                      {o.receivedDate ? fmtDate(o.receivedDate) : o.expectedDate ? fmtDate(o.expectedDate) : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
