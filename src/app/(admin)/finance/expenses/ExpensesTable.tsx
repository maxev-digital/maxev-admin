'use client';

import { useMemo, useState } from 'react';
import { Receipt, TrendingDown, CalendarDays, Clock, Plus, Trash2, X } from 'lucide-react';

type Status = 'paid' | 'pending';

type Expense = {
  id: string;
  date: string;
  vendor: string;
  category: string;
  description: string;
  amount: number;
  status: Status;
};

const BASE_CATEGORIES = ['Hosting', 'Software', 'SMS/Comms', 'Domains', 'AI/APIs', 'Payment Fees', 'Advertising', 'Other'];

const categoryBadge: Record<string, string> = {
  Hosting:        'badge-blue',
  Software:       'badge-purple',
  'SMS/Comms':    'badge-orange',
  Domains:        'badge-gray',
  'AI/APIs':      'badge-blue',
  'Payment Fees': 'badge-gray',
  Advertising:    'badge-orange',
  Other:          'badge-gray',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function ExpensesTable({ expenses: initial }: { expenses: Expense[] }) {
  const [expenses, setExpenses]   = useState<Expense[]>(initial);
  const [showForm, setShowForm]   = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    date:        todayIso(),
    vendor:      '',
    category:    'Software',
    description: '',
    amount:      '',
    status:      'paid' as Status,
  });

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const allCategories = useMemo(() => {
    const cats = new Set(expenses.map((e) => e.category));
    return ['All', ...Array.from(cats)];
  }, [expenses]);

  const filtered = useMemo(
    () => activeTab === 'All' ? expenses : expenses.filter((e) => e.category === activeTab),
    [expenses, activeTab],
  );

  const currentYear  = new Date().getFullYear().toString();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const paidExpenses   = expenses.filter((e) => e.status === 'paid');
  const pendingCount   = expenses.filter((e) => e.status === 'pending').length;
  const thisMonthTotal = useMemo(
    () => paidExpenses.filter((e) => e.date.startsWith(currentMonth)).reduce((s, e) => s + e.amount, 0),
    [paidExpenses, currentMonth],
  );
  const ytd = useMemo(
    () => paidExpenses.filter((e) => e.date.startsWith(currentYear)).reduce((s, e) => s + e.amount, 0),
    [paidExpenses, currentYear],
  );
  const monthsWithData = useMemo(() => {
    const months = new Set(paidExpenses.filter((e) => e.date.startsWith(currentYear)).map((e) => e.date.slice(0, 7)));
    return Math.max(months.size, 1);
  }, [paidExpenses, currentYear]);
  const avgMonthly   = Math.round(ytd / monthsWithData);
  const filteredTotal = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.vendor.trim() || !form.description.trim() || isNaN(amount) || amount <= 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, amount }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setExpenses((list) => [created, ...list]);
      setForm({ date: todayIso(), vendor: '', category: 'Software', description: '', amount: '', status: 'paid' });
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      setExpenses((list) => list.filter((e) => e.id !== id));
    } catch {
      // ignore — row stays if delete fails
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expense Log</h1>
          <p className="page-sub">Track all business costs and software subscriptions</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? <X size={13} /> : <Plus size={13} />}
          {showForm ? 'Cancel' : 'Add Expense'}
        </button>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">{fmt(thisMonthTotal)}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">This Month Total</div>
        </div>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{fmt(ytd)}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">YTD Total</div>
        </div>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{fmt(avgMonthly)}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Avg Monthly</div>
        </div>
        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">{pendingCount}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Pending</div>
        </div>
      </div>

      {/* Add Expense Inline Form */}
      {showForm && (
        <form onSubmit={submit} className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 160px 1fr 120px 100px auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} required />
            </div>
            <div>
              <label className="label">Vendor *</label>
              <input className="input" value={form.vendor} onChange={(e) => set('vendor', e.target.value)} placeholder="e.g. Anthropic" required />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
                {BASE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Description *</label>
              <input className="input" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Monthly subscription" required />
            </div>
            <div>
              <label className="label">Amount ($) *</label>
              <input className="input" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" required />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as Status)}>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div style={{ paddingBottom: 1 }}>
              <button type="submit" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }} disabled={submitting}>
                <Plus size={12} />
                {submitting ? 'Saving…' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Category Filter Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {allCategories.map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} style={{
            padding: '8px 14px', fontSize: '0.78rem', fontWeight: 600,
            color: activeTab === tab ? 'var(--white)' : 'var(--gray)',
            background: 'none', border: 'none',
            borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Vendor</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray)', padding: '32px 0' }}>
                    {expenses.length === 0 ? 'No expenses yet — add your first one above.' : 'No expenses in this category.'}
                  </td>
                </tr>
              )}
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--gray)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--white)' }}>{e.vendor || '—'}</td>
                  <td>
                    <span className={`badge ${categoryBadge[e.category] ?? 'badge-gray'}`} style={{ fontSize: '0.64rem' }}>
                      {e.category}
                    </span>
                  </td>
                  <td style={{ color: 'var(--light)' }}>{e.description}</td>
                  <td style={{ color: '#EF4444', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(e.amount)}</td>
                  <td>
                    <span className={e.status === 'paid' ? 'badge badge-green' : 'badge badge-orange'} style={{ fontSize: '0.64rem' }}>
                      {e.status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="btn btn-ghost btn-sm"
                      style={{ color: '#EF4444', opacity: 0.7 }}
                      onClick={() => remove(e.id)}
                      aria-label="Delete expense">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid var(--border)' }}>
                <td colSpan={4} style={{ fontWeight: 700, color: 'var(--light)', fontSize: '0.82rem' }}>
                  {activeTab === 'All' ? 'Total' : `${activeTab} Total`}
                  <span style={{ color: 'var(--gray)', fontWeight: 400, marginLeft: 8, fontSize: '0.75rem' }}>
                    ({filtered.length} item{filtered.length !== 1 ? 's' : ''})
                  </span>
                </td>
                <td style={{ color: '#EF4444', fontWeight: 800, fontSize: '0.92rem' }}>{fmt(filteredTotal)}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
