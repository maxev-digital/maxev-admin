'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Star, Truck, Phone, Plus, X } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  category: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  rating: number;
  leadTimeDays: number;
  notes: string | null;
  createdAt: string;
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const partial = rating - full;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ fontSize: '0.85rem', color: i < full ? '#fbbf24' : i === full && partial >= 0.5 ? '#fbbf24' : 'rgba(255,255,255,0.15)' }}>★</span>
      ))}
      {rating > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--gray)', marginLeft: 4 }}>{rating.toFixed(1)}</span>}
    </div>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({ name: '', category: '', contactName: '', phone: '', email: '', leadTimeDays: '0', rating: '5.0', notes: '' });

  useEffect(() => {
    fetch('/api/inventory/suppliers')
      .then((r) => r.json())
      .then((d: Supplier[]) => setSuppliers(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const avgLeadTime = suppliers.length > 0 ? (suppliers.reduce((s, sup) => s + sup.leadTimeDays, 0) / suppliers.length).toFixed(1) : '—';
  const bestRated   = suppliers.length > 0 ? suppliers.reduce((best, s) => s.rating > best.rating ? s : best, suppliers[0]) : null;

  async function createSupplier() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:         form.name.trim(),
          category:     form.category.trim() || null,
          contactName:  form.contactName.trim() || null,
          phone:        form.phone.trim() || null,
          email:        form.email.trim() || null,
          leadTimeDays: parseInt(form.leadTimeDays) || 0,
          rating:       parseFloat(form.rating) || 0,
          notes:        form.notes.trim() || null,
        }),
      });
      const created: Supplier = await res.json();
      setSuppliers((prev) => [...prev, created]);
      setShowNew(false);
      setForm({ name: '', category: '', contactName: '', phone: '', email: '', leadTimeDays: '0', rating: '5.0', notes: '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Supplier Database</h1>
          <p className="page-sub">Vendor contacts, performance ratings, and order history</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={13} /> Add Supplier
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{loading ? '—' : suppliers.length}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total Suppliers</div>
        </div>

        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green">{loading ? '—' : `${avgLeadTime}d`}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Avg Lead Time</div>
        </div>

        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--orange)' }}>{bestRated ? bestRated.name : '—'}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Best Rated Supplier</div>
          {bestRated && bestRated.rating > 0 && (
            <div style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: 4 }}>{'★'.repeat(Math.floor(bestRated.rating))} {bestRated.rating.toFixed(1)}/5.0</div>
          )}
        </div>
      </div>

      {!loading && suppliers.length > 0 && (
        <div className="card-blue" style={{ padding: 20, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={17} style={{ color: '#818cf8' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--light)' }}>AI Supplier Insight</span>
                <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>AI Agent</span>
              </div>
              <p style={{ fontSize: '0.83rem', color: 'var(--light)', lineHeight: 1.6 }}>
                {bestRated ? `${bestRated.name} has your highest supplier rating. ` : ''}
                Add lead time and rating data for all suppliers to get optimization suggestions for consolidated ordering.
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--gray)', padding: '40px 0', textAlign: 'center' }}>Loading...</div>
      ) : suppliers.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Truck size={32} style={{ color: 'var(--gray)', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontWeight: 700, color: 'var(--white)', marginBottom: 4 }}>No suppliers yet</div>
          <div style={{ color: 'var(--gray)', fontSize: '0.84rem', marginBottom: 16 }}>Add your vendors to track lead times, ratings, and orders.</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}><Plus size={13} /> Add First Supplier</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {suppliers.map((s) => (
            <div key={s.id} className="card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--white)', marginBottom: 4 }}>{s.name}</div>
                  {s.category && <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{s.category}</span>}
                </div>
                {s.rating > 0 && (
                  <div style={{ textAlign: 'right' }}><StarRating rating={s.rating} /></div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {s.phone && (
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Phone</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--light)' }}>
                      <Phone size={12} style={{ color: 'var(--gray)', flexShrink: 0 }} />
                      {s.phone}
                    </div>
                  </div>
                )}
                {s.contactName && (
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Account Rep</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--light)' }}>{s.contactName}</div>
                  </div>
                )}
                {s.leadTimeDays > 0 && (
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Avg Lead Time</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}>
                      <Truck size={12} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <span style={{ color: s.leadTimeDays <= 3 ? 'var(--green)' : s.leadTimeDays <= 5 ? 'var(--light)' : 'var(--orange)' }}>
                        {s.leadTimeDays} day{s.leadTimeDays !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}
                {s.email && (
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Email</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email}</div>
                  </div>
                )}
              </div>

              {s.notes && (
                <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginBottom: 14, lineHeight: 1.5 }}>{s.notes}</div>
              )}

              {s.phone && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <a href={`tel:${s.phone.replace(/\D/g, '')}`} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                    <Phone size={11} /> Call {s.contactName || s.name}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div style={{ width: '100%', maxWidth: 520, background: '#0a0a0f', border: '1px solid #1a1a2e', borderRadius: 14, padding: 32, boxShadow: '0 24px 80px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>Add Supplier</h2>
              <button type="button" onClick={() => setShowNew(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #222', borderRadius: 8, padding: '6px 8px', color: '#888', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Supplier Name *', key: 'name', placeholder: 'e.g. Grainger Industrial' },
                { label: 'Category', key: 'category', placeholder: 'e.g. Office Supplies, PPE' },
                { label: 'Account Rep / Contact', key: 'contactName', placeholder: 'e.g. John Smith' },
                { label: 'Phone', key: 'phone', placeholder: '(800) 000-0000' },
                { label: 'Email', key: 'email', placeholder: 'rep@supplier.com' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
                  <input
                    style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lead Time (days)</label>
                  <input type="number" min="0"
                    style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                    value={form.leadTimeDays}
                    onChange={(e) => setForm((f) => ({ ...f, leadTimeDays: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rating (0-5)</label>
                  <input type="number" min="0" max="5" step="0.1"
                    style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                    value={form.rating}
                    onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</label>
                <textarea
                  style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, resize: 'vertical', minHeight: 70, boxSizing: 'border-box', fontFamily: 'inherit' }}
                  placeholder="Any notes about this supplier..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 18 }}
              onClick={createSupplier}
              disabled={saving || !form.name.trim()}
            >
              {saving ? 'Saving...' : 'Add Supplier'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
