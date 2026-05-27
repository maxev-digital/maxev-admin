'use client';

import { useMemo, useState } from 'react';
import { useAIHighlight } from '@/lib/ai-highlight';
import {
  DollarSign, AlertTriangle, Clock, Check, FileText,
  Plus, Send, ExternalLink, X, ChevronDown, Sparkles, Copy,
} from 'lucide-react';

type Invoice = {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  type: string;
  amount: number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  stripeLink: string | null;
  notes: string | null;
};

type Client = {
  id: string;
  businessName: string;
  email: string | null;
  contactName: string | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const statusBadge: Record<string, string> = {
  PENDING:   'badge-blue',
  SENT:      'badge-blue',
  PAID:      'badge-green',
  OVERDUE:   'badge-red',
  CANCELLED: 'badge-gray',
};

const STATUS_FILTERS = ['All', 'Pending', 'Paid', 'Overdue'];
const INVOICE_TYPES  = ['DEPOSIT', 'FINAL', 'RETAINER', 'CUSTOM'];

function matchesFilter(status: string, filter: string) {
  if (filter === 'All')     return true;
  if (filter === 'Pending') return status === 'PENDING' || status === 'SENT';
  if (filter === 'Paid')    return status === 'PAID';
  if (filter === 'Overdue') return status === 'OVERDUE';
  return true;
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8,
  padding: '9px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#888',
  marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase',
};

export default function InvoicesTable({ invoices: initial, clients, initialFilter = 'All' }: { invoices: Invoice[]; clients: Client[]; initialFilter?: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>(initial);
  const { isHighlighted, hasAnyHighlight } = useAIHighlight();
  const [filter, setFilter]     = useState(() => {
    const up = initialFilter.toUpperCase();
    if (up === 'OVERDUE') return 'Overdue';
    if (up === 'PAID')    return 'Paid';
    if (up === 'PENDING' || up === 'SENT') return 'Pending';
    return 'All';
  });
  const [showNew, setShowNew]   = useState(false);
  const [busy, setBusy]         = useState<string | null>(null);
  const [stripeErr, setStripeErr] = useState('');
  const [reminderInv, setReminderInv]   = useState<Invoice | null>(null);
  const [reminderText, setReminderText] = useState('');
  const [reminderLoading, setReminderLoading] = useState(false);
  const [copied, setCopied]             = useState(false);

  // new invoice form state
  const [nClientId, setNClientId] = useState(clients[0]?.id ?? '');
  const [nType,     setNType]     = useState('RETAINER');
  const [nAmount,   setNAmount]   = useState('');
  const [nDue,      setNDue]      = useState('');
  const [nNotes,    setNNotes]    = useState('');
  const [creating,  setCreating]  = useState(false);
  const [createErr, setCreateErr] = useState('');

  const totalPaid    = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
  const outstanding  = invoices.filter((i) => i.status === 'PENDING' || i.status === 'SENT').reduce((s, i) => s + i.amount, 0);
  const overdueCount = invoices.filter((i) => i.status === 'OVERDUE').length;
  const filtered     = useMemo(() => invoices.filter((i) => matchesFilter(i.status, filter)), [invoices, filter]);

  async function createInvoice() {
    if (!nClientId || !nAmount) { setCreateErr('Client and amount are required.'); return; }
    setCreating(true); setCreateErr('');
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: nClientId,
          type:     nType,
          amount:   parseFloat(nAmount),
          dueDate:  nDue || null,
          notes:    nNotes || null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const inv = await res.json();
      setInvoices((prev) => [{
        id:            inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientId:      inv.clientId,
        clientName:    inv.client.businessName,
        clientEmail:   inv.client.email ?? null,
        type:          inv.type,
        amount:        inv.amount,
        status:        inv.status,
        dueDate:       inv.dueDate ?? null,
        paidAt:        inv.paidAt  ?? null,
        stripeLink:    inv.stripeLink ?? null,
        notes:         inv.notes ?? null,
      }, ...prev]);
      setShowNew(false);
      setNAmount(''); setNDue(''); setNNotes('');
    } catch {
      setCreateErr('Could not create invoice. Try again.');
    } finally {
      setCreating(false);
    }
  }

  async function markPaid(inv: Invoice) {
    setBusy(inv.id + '_paid');
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', paidAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error();
      setInvoices((prev) => prev.map((i) =>
        i.id === inv.id ? { ...i, status: 'PAID', paidAt: new Date().toISOString() } : i
      ));
    } finally {
      setBusy(null);
    }
  }

  async function sendInvoice(inv: Invoice) {
    setBusy(inv.id + '_send');
    try {
      const res = await fetch(`/api/invoices/${inv.id}/stripe-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendEmail: !!inv.clientEmail }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInvoices((prev) => prev.map((i) =>
        i.id === inv.id ? { ...i, stripeLink: data.stripeLink, status: 'SENT' } : i
      ));
    } catch {
      setStripeErr('Stripe not configured — add STRIPE_SECRET_KEY to the server environment.');
    } finally {
      setBusy(null);
    }
  }

  async function draftReminder(inv: Invoice) {
    setReminderInv(inv);
    setReminderText('');
    setReminderLoading(true);
    setCopied(false);
    const daysOverdue = inv.dueDate
      ? Math.max(0, Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86400000))
      : 0;
    try {
      const res = await fetch('/api/ai/draft-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName:    inv.clientName,
          invoiceNumber: inv.invoiceNumber,
          amount:        inv.amount,
          daysOverdue,
          contactName:   null,
        }),
      });
      const data = await res.json();
      setReminderText(data.message ?? '');
    } catch {
      setReminderText('Could not generate reminder — check your API key and try again.');
    } finally {
      setReminderLoading(false);
    }
  }

  function copyReminder() {
    navigator.clipboard.writeText(reminderText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-sub">{invoices.length} total</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
          <Plus size={13} /> New Invoice
        </button>
      </div>

      {stripeErr && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, marginBottom: 16 }}>
          <AlertTriangle size={14} style={{ color: '#E05252', flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', color: '#E05252', flex: 1 }}>{stripeErr}</span>
          <button type="button" onClick={() => setStripeErr('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E05252', padding: 0 }}><X size={14} /></button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green">{fmt(totalPaid)}</div>
            <DollarSign size={18} style={{ color: 'var(--green)', opacity: 0.7 }} />
          </div>
          <div className="kpi-label">Total Paid</div>
        </div>
        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">{fmt(outstanding)}</div>
            <Clock size={18} style={{ color: 'var(--orange)', opacity: 0.7 }} />
          </div>
          <div className="kpi-label">Outstanding</div>
        </div>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value" style={{ color: overdueCount > 0 ? '#EF4444' : undefined }}>{overdueCount}</div>
            <AlertTriangle size={18} style={{ color: 'var(--light)', opacity: 0.7 }} />
          </div>
          <div className="kpi-label">Overdue</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {STATUS_FILTERS.map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)}
            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.74rem' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due</th>
                <th>Paid</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ color: 'var(--gray)', textAlign: 'center', padding: 32 }}>
                    {invoices.length === 0 ? 'No invoices yet — create your first one above.' : 'No invoices match this filter'}
                  </td>
                </tr>
              ) : filtered.map((inv) => {
                const aiEffect = isHighlighted('invoice-status', inv.status);
                const anyStatusHighlight = hasAnyHighlight('invoice-status');
                return (
                <tr
                  key={inv.id}
                  className={aiEffect === 'glow' ? 'ai-highlight-glow' : anyStatusHighlight ? 'ai-highlight-dim' : ''}
                  style={inv.status === 'OVERDUE' && !aiEffect ? { background: 'rgba(239,68,68,0.05)' } : undefined}
                >
                  <td style={{ color: 'var(--white)', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {inv.invoiceNumber}
                      {inv.stripeLink && (
                        <a href={inv.stripeLink} target="_blank" rel="noreferrer"
                          style={{ color: 'var(--primary)', display: 'flex' }} title="Payment link">
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--light)', fontWeight: 600 }}>{inv.clientName}</td>
                  <td style={{ color: 'var(--gray)', fontSize: '0.78rem' }}>{inv.type}</td>
                  <td style={{ color: 'var(--green)', fontWeight: 700 }}>{fmt(inv.amount)}</td>
                  <td><span className={`badge ${statusBadge[inv.status] ?? 'badge-gray'}`}>{inv.status}</span></td>
                  <td style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>{fmtDate(inv.dueDate)}</td>
                  <td style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>{fmtDate(inv.paidAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                        <>
                          <button type="button" className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.72rem' }}
                            disabled={busy === inv.id + '_send'}
                            onClick={() => sendInvoice(inv)}
                            title={inv.clientEmail ? 'Generate Stripe link & email client' : 'Generate Stripe payment link'}>
                            {busy === inv.id + '_send' ? <Clock size={11} /> : <Send size={11} />}
                            {inv.stripeLink ? 'Resend' : 'Send'}
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.72rem', color: 'var(--green)' }}
                            disabled={busy === inv.id + '_paid'}
                            onClick={() => markPaid(inv)}>
                            {busy === inv.id + '_paid' ? <Clock size={11} /> : <Check size={11} />}
                            Paid
                          </button>
                        </>
                      )}
                      {inv.status === 'OVERDUE' && (
                        <button type="button" className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.72rem', color: '#818cf8' }}
                          onClick={() => draftReminder(inv)}
                          title="AI-draft a payment reminder email">
                          <Sparkles size={11} /> Reminder
                        </button>
                      )}
                      {inv.status === 'PAID' && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Check size={11} /> Collected
                        </span>
                      )}
                      <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer"
                        className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem', color: 'var(--gray)' }}
                        title="Download PDF">
                        <FileText size={11} />
                      </a>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Reminder Modal */}
      {reminderInv && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 24,
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setReminderInv(null); }}>
          <div style={{
            width: '100%', maxWidth: 540, background: '#0a0a0f',
            border: '1px solid #1a1a2e', borderRadius: 14, padding: 32,
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Sparkles size={14} style={{ color: '#818cf8' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#818cf8' }}>AI Payment Reminder</span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>{reminderInv.clientName}</h2>
                <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{reminderInv.invoiceNumber} — {fmt(reminderInv.amount)}</div>
              </div>
              <button type="button" onClick={() => setReminderInv(null)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #222', borderRadius: 8, padding: '6px 8px', color: '#888', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>

            {reminderLoading ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#555', fontSize: 13, fontStyle: 'italic' }}>
                Drafting reminder...
              </div>
            ) : (
              <>
                <textarea
                  style={{
                    width: '100%', minHeight: 220, background: '#111', border: '1px solid #222',
                    borderRadius: 8, padding: '12px 14px', color: '#e0e0e0', fontSize: 13,
                    lineHeight: 1.65, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                  value={reminderText}
                  onChange={(e) => setReminderText(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={copyReminder}>
                    <Copy size={12} /> {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setReminderInv(null)}>
                    Close
                  </button>
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: '#444', textAlign: 'center' }}>
                  Edit the draft above before sending — paste into email or SMS
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* New Invoice Modal */}
      {showNew && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 24,
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div style={{
            width: '100%', maxWidth: 480, background: '#0a0a0f',
            border: '1px solid #1a1a2e', borderRadius: 14, padding: 32,
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 4 }}>New Invoice</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>Create Invoice</h2>
              </div>
              <button type="button" onClick={() => setShowNew(false)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #222', borderRadius: 8, padding: '6px 8px', color: '#888', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Client *</label>
                {clients.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#888', padding: '10px 0' }}>No active clients yet — add a client first.</div>
                ) : (
                  <select style={inputStyle} value={nClientId} onChange={(e) => setNClientId(e.target.value)}>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.businessName}{c.email ? ` — ${c.email}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select style={inputStyle} value={nType} onChange={(e) => setNType(e.target.value)}>
                    {INVOICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Amount *</label>
                  <input style={inputStyle} type="number" min="1" step="0.01"
                    placeholder="1500" value={nAmount} onChange={(e) => setNAmount(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Due Date</label>
                <input style={inputStyle} type="date" value={nDue} onChange={(e) => setNDue(e.target.value)} />
              </div>

              <div>
                <label style={labelStyle}>Notes</label>
                <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                  placeholder="Website build — Phase 1 deposit" value={nNotes}
                  onChange={(e) => setNNotes(e.target.value)} />
              </div>

              {createErr && (
                <div style={{ color: '#E05252', fontSize: 13, padding: '8px 12px', background: 'rgba(224,82,82,0.1)', borderRadius: 8 }}>
                  {createErr}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowNew(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" style={{ flex: 2 }}
                  disabled={creating || clients.length === 0} onClick={createInvoice}>
                  {creating ? 'Creating…' : 'Create Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
