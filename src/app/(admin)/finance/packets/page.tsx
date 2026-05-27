'use client';

import { useState, useEffect } from 'react';
import { Package, Send, Plus, Edit2, X, Check } from 'lucide-react';

type Packet = {
  id: string;
  name: string;
  contents: string;
  status: string;
  createdAt: string;
};

export default function DocPacketsPage() {
  const [packets, setPackets]   = useState<Packet[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sent, setSent]         = useState<Set<string>>(new Set());
  const [sending, setSending]   = useState<Set<string>>(new Set());
  const [showNew, setShowNew]   = useState(false);
  const [editTarget, setEdit]   = useState<Packet | null>(null);

  const [form, setForm] = useState({ name: '', contents: '', status: 'Active' });
  const [saving, setSaving]     = useState(false);
  const [formMsg, setFormMsg]   = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/finance/packets');
      if (r.ok) setPackets(await r.json());
    } finally { setLoading(false); }
  }

  function openNew() {
    setForm({ name: '', contents: '', status: 'Active' });
    setFormMsg('');
    setShowNew(true);
    setEdit(null);
  }

  function openEdit(p: Packet) {
    setForm({ name: p.name, contents: p.contents, status: p.status });
    setFormMsg('');
    setEdit(p);
    setShowNew(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormMsg('Name is required.'); return; }
    setSaving(true);
    try {
      let r: Response;
      if (editTarget) {
        r = await fetch(`/api/finance/packets/${editTarget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        r = await fetch('/api/finance/packets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      if (r.ok) {
        setShowNew(false);
        setEdit(null);
        load();
      } else {
        const d = await r.json();
        setFormMsg(d.error ?? 'Save failed.');
      }
    } finally { setSaving(false); }
  }

  function handleSend(id: string) {
    setSending((s) => new Set([...s, id]));
    setTimeout(() => {
      setSending((s) => { const n = new Set(s); n.delete(id); return n; });
      setSent((s) => new Set([...s, id]));
    }, 900);
  }

  const active  = packets.filter((p) => p.status === 'Active').length;
  const drafted = packets.filter((p) => p.status === 'Draft').length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Doc Packets</h1>
          <p className="page-sub">Curated onboarding document bundles sent to new clients</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <Plus size={13} />
          Create Packet
        </button>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div className="kpi-value">{packets.length}</div>
          <div className="kpi-label">Total Packets</div>
        </div>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div className="kpi-value-green">{active}</div>
          <div className="kpi-label">Active</div>
        </div>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div className="kpi-value-orange">{drafted}</div>
          <div className="kpi-label">Draft</div>
        </div>
      </div>

      {/* Packet Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gray)', fontSize: '0.85rem' }}>
          Loading packets...
        </div>
      ) : packets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gray)', fontSize: '0.85rem' }}>
          No packets yet.{' '}
          <button onClick={openNew} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Create your first packet
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {packets.map((p) => {
            const items = p.contents ? p.contents.split('\n').filter(Boolean) : [];
            const isSending = sending.has(p.id);
            const isSent    = sent.has(p.id);
            return (
              <div key={p.id} className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8,
                      background: 'rgba(37,99,235,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Package size={15} style={{ color: 'var(--primary)' }} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--white)', lineHeight: 1.3 }}>
                      {p.name}
                    </span>
                  </div>
                  <span className={`badge ${p.status === 'Active' ? 'badge-green' : 'badge-gray'}`} style={{ flexShrink: 0, marginLeft: 8 }}>
                    {p.status}
                  </span>
                </div>

                <div style={{ marginBottom: 16, flex: 1 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray)', marginBottom: 8 }}>
                    Contents
                  </div>
                  {items.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {items.map((doc, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.78rem', color: 'var(--light)' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, opacity: 0.7 }} />
                          {doc}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>No items listed.</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', opacity: isSending ? 0.7 : 1 }}
                    onClick={() => handleSend(p.id)}
                    disabled={isSending}
                  >
                    {isSent ? <Check size={11} /> : <Send size={11} />}
                    {isSending ? 'Sending...' : isSent ? 'Queued' : 'Send to Client'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => openEdit(p)}
                  >
                    <Edit2 size={11} />
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showNew && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div className="card" style={{ width: 480, padding: 28, position: 'relative' }}>
            <button onClick={() => setShowNew(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>{editTarget ? 'Edit Packet' : 'New Packet'}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Packet Name</label>
                <input
                  className="input"
                  placeholder="e.g. Starter Onboarding Packet"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--gray)', display: 'block', marginBottom: 6 }}>
                  Contents <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(one item per line)</span>
                </label>
                <textarea
                  className="input"
                  rows={5}
                  placeholder={'Welcome Letter\nBrand Questionnaire\nPayment Authorization'}
                  value={form.contents}
                  onChange={(e) => setForm({ ...form, contents: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Status</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option>Active</option>
                  <option>Draft</option>
                </select>
              </div>

              {formMsg && <p style={{ fontSize: '0.78rem', color: 'var(--red)' }}>{formMsg}</p>}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowNew(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editTarget ? 'Save Changes' : 'Create Packet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
