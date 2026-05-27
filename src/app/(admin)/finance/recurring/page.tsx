'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Plus, X, Check, Pause, Play, Clock, Users } from 'lucide-react';

interface Client {
  id: string;
  businessName: string;
  email: string | null;
  mrr: number;
  packageTier: string;
}

interface RecurringBilling {
  id: string;
  clientId: string;
  amount: number;
  cycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  nextBillingAt: string;
  isActive: boolean;
  autoSend: boolean;
  notes: string | null;
  client: Client;
}

const CYCLE_LABELS = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ANNUAL: 'Annual' };
const CYCLE_MULT   = { MONTHLY: 1, QUARTERLY: 3, ANNUAL: 12 };

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export default function RecurringBillingPage() {
  const [billings, setBillings]   = useState<RecurringBilling[]>([]);
  const [clients, setClients]     = useState<Client[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [newForm, setNewForm]     = useState({ clientId: '', amount: '', cycle: 'MONTHLY', nextBillingAt: '', autoSend: false, notes: '' });
  const [newSaving, setNewSaving] = useState(false);
  const [newErr, setNewErr]       = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/billing/recurring').then((r) => r.json()),
      fetch('/api/clients').then((r) => r.json()),
    ]).then(([b, c]: [RecurringBilling[], Client[]]) => {
      setBillings(b);
      setClients(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setNewSaving(true); setNewErr('');
    try {
      const res = await fetch('/api/billing/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newForm, amount: parseFloat(newForm.amount) }),
      });
      if (!res.ok) throw new Error('Failed');
      const created: RecurringBilling = await res.json();
      setBillings((prev) => {
        const existing = prev.findIndex((b) => b.clientId === created.clientId);
        if (existing >= 0) return prev.map((b, i) => i === existing ? created : b);
        return [created, ...prev];
      });
      setShowNew(false);
      setNewForm({ clientId: '', amount: '', cycle: 'MONTHLY', nextBillingAt: '', autoSend: false, notes: '' });
    } catch {
      setNewErr('Failed to save — please try again.');
    } finally { setNewSaving(false); }
  }

  async function toggle(billing: RecurringBilling) {
    const res = await fetch(`/api/billing/recurring/${billing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !billing.isActive }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setBillings((prev) => prev.map((b) => b.id === billing.id ? updated : b));
  }

  const totalMonthlyRevenue = billings
    .filter((b) => b.isActive)
    .reduce((s, b) => s + b.amount / CYCLE_MULT[b.cycle], 0);

  const dueIn7 = billings.filter((b) => b.isActive && daysUntil(b.nextBillingAt) <= 7);

  if (loading) return (
    <>
      <div className="page-header"><div><h1 className="page-title">Recurring Billing</h1></div></div>
      <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--gray)' }}>Loading...</div>
    </>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Recurring Billing</h1>
          <p className="page-sub">Automated invoice generation for retainer clients</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}><Plus size={13} />Add Client</button>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Active Subscriptions', value: billings.filter((b) => b.isActive).length,  cls: 'kpi-value-green' },
          { label: 'Monthly Recurring',    value: fmt(totalMonthlyRevenue),                    cls: 'kpi-value' },
          { label: 'Billing This Month',   value: dueIn7.length,                               cls: 'kpi-value' },
          { label: 'Total Schedules',      value: billings.length,                             cls: 'kpi-value' },
        ].map((k) => (
          <div key={k.label} className="card" style={{ padding: '16px 20px' }}>
            <div className={k.cls}>{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {billings.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <DollarSign size={36} style={{ color: 'var(--gray)', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--light)', marginBottom: 6 }}>No recurring billing yet</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--gray)', marginBottom: 16 }}>Set up automated billing for retainer clients.</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}><Plus size={13} />Add Client</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th><th>Amount</th><th>Cycle</th><th>MRR Equiv</th>
                  <th>Next Bill</th><th>Auto-Send</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {billings.map((b) => {
                  const days = daysUntil(b.nextBillingAt);
                  const mrr  = b.amount / CYCLE_MULT[b.cycle];
                  return (
                    <tr key={b.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--white)', fontSize: '0.85rem' }}>{b.client.businessName}</div>
                        {b.client.email && <div style={{ fontSize: '0.7rem', color: 'var(--gray)' }}>{b.client.email}</div>}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(b.amount)}</td>
                      <td><span className="badge badge-blue">{CYCLE_LABELS[b.cycle]}</span></td>
                      <td style={{ color: 'var(--light)', fontSize: '0.82rem' }}>{fmt(mrr)}/mo</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}>
                          <Clock size={11} style={{ color: days <= 0 ? 'var(--red)' : 'var(--gray)' }} />
                          <span style={{ color: days <= 0 ? 'var(--red)' : 'var(--light)' }}>
                            {days <= 0 ? 'Overdue' : new Date(b.nextBillingAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td>
                        {b.autoSend
                          ? <span className="badge badge-green">Auto</span>
                          : <span className="badge badge-gray">Manual</span>}
                      </td>
                      <td><span className={b.isActive ? 'badge badge-green' : 'badge badge-gray'}>{b.isActive ? 'Active' : 'Paused'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => toggle(b)} title={b.isActive ? 'Pause' : 'Activate'}>
                            {b.isActive ? <Pause size={12} /> : <Play size={12} />}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => {
                            setNewForm({ clientId: b.clientId, amount: String(b.amount), cycle: b.cycle, nextBillingAt: new Date(b.nextBillingAt).toISOString().slice(0, 10), autoSend: b.autoSend, notes: b.notes || '' });
                            setShowNew(true);
                          }}>Edit</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Add/Edit Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowNew(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 520, padding: 28 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>Recurring Billing Schedule</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>Set up automated invoice generation</p>
              </div>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Client *</label>
                <select className="input" required value={newForm.clientId} onChange={(e) => {
                  const cl = clients.find((c) => c.id === e.target.value);
                  setNewForm((f) => ({ ...f, clientId: e.target.value, amount: cl ? String(cl.mrr || '') : f.amount }));
                }}>
                  <option value="">-- Select Client --</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label className="label">Amount ($) *</label>
                  <input className="input" type="number" min={1} required placeholder="2500" value={newForm.amount} onChange={(e) => setNewForm((f) => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Cycle *</label>
                  <select className="input" value={newForm.cycle} onChange={(e) => setNewForm((f) => ({ ...f, cycle: e.target.value }))}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUAL">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="label">First Bill Date *</label>
                  <input className="input" type="date" required value={newForm.nextBillingAt} onChange={(e) => setNewForm((f) => ({ ...f, nextBillingAt: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <input type="checkbox" id="autoSend" checked={newForm.autoSend} onChange={(e) => setNewForm((f) => ({ ...f, autoSend: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="autoSend" style={{ cursor: 'pointer', fontSize: '0.83rem', color: 'var(--light)' }}>
                  Auto-send invoice email when generated
                </label>
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input" placeholder="Optional billing notes" value={newForm.notes} onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              {newErr && <div style={{ fontSize: '0.8rem', color: 'var(--red)', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>{newErr}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" className="btn btn-primary" disabled={newSaving} style={{ flex: 1 }}>{newSaving ? 'Saving...' : 'Save Schedule'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
