'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

type PaymentStatus = 'completed' | 'failed' | 'pending';
type FilterTab     = 'all' | PaymentStatus;

interface Payment {
  id:            string;
  client:        string;
  type:          string;
  amount:        number;
  status:        PaymentStatus;
  date:          string;
  invoiceNumber: string;
}

interface Subscription {
  client: string;
  amount: number;
  status: 'Active' | 'Past Due';
}

const STATUS_BADGE: Record<PaymentStatus, string> = {
  completed: 'badge badge-green',
  failed:    'badge badge-red',
  pending:   'badge badge-orange',
};

const TYPE_BADGE: Record<string, string> = {
  RETAINER: 'badge badge-purple',
  DEPOSIT:  'badge badge-gray',
  FINAL:    'badge badge-blue',
  CUSTOM:   'badge badge-blue',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PaymentsTable({
  payments,
  subscriptions,
}: {
  payments:      Payment[];
  subscriptions: Subscription[];
}) {
  const [filter, setFilter]         = useState<FilterTab>('all');
  const [alertDismissed, setAlert]  = useState(false);

  const totalCollected  = payments.filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const failedPayments  = payments.filter((p) => p.status === 'failed');
  const failedAmount    = failedPayments.reduce((s, p) => s + p.amount, 0);
  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const pendingAmount   = pendingPayments.reduce((s, p) => s + p.amount, 0);
  const mrr             = subscriptions.filter((s) => s.status === 'Active').reduce((s, r) => s + r.amount, 0);

  const filtered = filter === 'all' ? payments : payments.filter((p) => p.status === filter);

  const TABS: { id: FilterTab; label: string }[] = [
    { id: 'all',       label: 'All' },
    { id: 'completed', label: 'Completed' },
    { id: 'failed',    label: 'Failed' },
    { id: 'pending',   label: 'Pending' },
  ];

  return (
    <>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-sub">Payment history and active retainers</p>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div className="kpi-value-green">{fmt(totalCollected)}</div>
          <div className="kpi-label">Total Collected</div>
        </div>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div className="kpi-value-orange">
            {failedPayments.length} {failedPayments.length === 1 ? 'payment' : 'payments'}
          </div>
          <div className="kpi-label">Overdue — {fmt(failedAmount)}</div>
        </div>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div className="kpi-value">{fmt(pendingAmount)}</div>
          <div className="kpi-label">Pending ({pendingPayments.length})</div>
        </div>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div className="kpi-value-green">{fmt(mrr)}</div>
          <div className="kpi-label">Active Retainers MRR</div>
        </div>
      </div>

      {/* Overdue Alert */}
      {!alertDismissed && failedPayments.length > 0 && (
        <div className="card" style={{
          padding: '18px 22px', marginBottom: 24, position: 'relative',
          borderLeft: '4px solid #ef4444', background: 'rgba(239,68,68,0.07)',
        }}>
          <button onClick={() => setAlert(true)}
            style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)' }}
            aria-label="Dismiss">
            <X size={15} />
          </button>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Overdue Invoices
          </div>
          <p style={{ fontSize: 13, color: 'var(--white)', marginBottom: 0, lineHeight: 1.6 }}>
            {failedPayments.length} overdue invoice{failedPayments.length !== 1 ? 's' : ''} totaling {fmt(failedAmount)}.
            Send a payment reminder from the Invoices page.
          </p>
        </div>
      )}

      {/* Empty state */}
      {payments.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--gray)', marginBottom: 24 }}>
          No invoices yet. Create your first invoice on the Invoices page.
        </div>
      )}

      {payments.length > 0 && (
        <>
          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {TABS.map((tab) => (
              <button key={tab.id} type="button"
                className={`btn btn-sm ${filter === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(tab.id)}>
                {tab.label}
                {tab.id !== 'all' && (
                  <span style={{ marginLeft: 5, opacity: 0.7 }}>
                    ({tab.id === 'completed' ? payments.filter((p) => p.status === 'completed').length
                      : tab.id === 'failed'  ? failedPayments.length
                      : pendingPayments.length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Payment Table */}
          <div className="card" style={{ marginBottom: 36, padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray)', padding: 32 }}>
                        No payments match this filter.
                      </td>
                    </tr>
                  ) : filtered.map((p) => (
                    <tr key={p.id} style={{ background: p.status === 'failed' ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                      <td style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray)', fontFamily: 'monospace' }}>{p.invoiceNumber}</td>
                      <td style={{ fontWeight: 600, color: 'var(--white)' }}>{p.client}</td>
                      <td><span className={TYPE_BADGE[p.type] ?? 'badge badge-gray'}>{p.type}</span></td>
                      <td style={{ fontWeight: 700, color: p.status === 'failed' ? '#f87171' : 'var(--white)' }}>{fmt(p.amount)}</td>
                      <td><span className={STATUS_BADGE[p.status]}>{p.status}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--gray)', whiteSpace: 'nowrap' }}>{fmtDate(p.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Retainer Subscriptions */}
      {subscriptions.length > 0 && (
        <>
          <div style={{ marginBottom: 8 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--white)', marginBottom: 4 }}>
              Active Retainers
            </h2>
            <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 18 }}>
              {subscriptions.filter((s) => s.status === 'Active').length} of {subscriptions.length} retainer clients active
            </p>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Monthly Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => (
                    <tr key={s.client} style={{ background: s.status === 'Past Due' ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                      <td style={{ fontWeight: 600, color: 'var(--white)' }}>{s.client}</td>
                      <td style={{ fontWeight: 700, color: 'var(--green)' }}>
                        {fmt(s.amount)}<span style={{ fontSize: 11, color: 'var(--gray)', fontWeight: 400 }}>/mo</span>
                      </td>
                      <td>
                        <span className={s.status === 'Active' ? 'badge badge-green' : 'badge badge-red'}>{s.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)' }}>
                    <td style={{ fontWeight: 700, color: 'var(--gray)', fontSize: '0.82rem' }}>Total MRR</td>
                    <td style={{ fontWeight: 700, color: 'var(--green)' }}>
                      {fmt(mrr)}<span style={{ fontSize: 11, color: 'var(--gray)', fontWeight: 400 }}>/mo</span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
