import { prisma } from '@/lib/db';
import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const fmtDate = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

function monthsRetained(launchDate: Date | null): number {
  if (!launchDate) return 0;
  const diff = Date.now() - new Date(launchDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
}

export default async function RevenuePage() {
  const [clients, invoices] = await Promise.all([
    prisma.client.findMany({ orderBy: { mrr: 'desc' } }),
    prisma.invoice.findMany({ include: { client: true }, orderBy: { createdAt: 'desc' } }),
  ]);

  const activeClients = clients.filter((c) => c.status === 'ACTIVE');
  const mrr = activeClients.reduce((s, c) => s + c.mrr, 0);

  const thisYear = new Date().getFullYear();
  const ytdRevenue = invoices
    .filter((i) => i.status === 'PAID' && new Date(i.createdAt).getFullYear() === thisYear)
    .reduce((s, i) => s + i.amount, 0);

  const allTimeRevenue = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((s, i) => s + i.amount, 0);

  const overdueInvoices = invoices.filter((i) => i.status === 'OVERDUE');

  const now = new Date();
  const months: { label: string; year: number; month: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), year: d.getFullYear(), month: d.getMonth() });
  }

  const monthlyBreakdown = months.map((m) => {
    const monthInvoices = invoices.filter((i) => {
      const d = new Date(i.createdAt);
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    });
    const newClients = clients.filter((c) => {
      if (!c.launchDate) return false;
      const d = new Date(c.launchDate);
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    }).length;
    const collected = monthInvoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
    const invoiced = monthInvoices.reduce((s, i) => s + i.amount, 0);
    return { ...m, newClients, churned: 0, mrrSnapshot: mrr, invoiced, collected };
  });

  const packageBadge: Record<string, string> = {
    STARTER: 'badge-gray', GROWTH: 'badge-blue', PRO: 'badge-purple', ENTERPRISE: 'badge-orange', CUSTOM: 'badge-blue',
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Revenue</h1>
          <p className="page-sub">MRR, invoiced revenue, and collection tracking</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card-green" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green" style={{ fontSize: '2rem' }}>{fmt(mrr)}</div>
            <DollarSign size={20} style={{ color: 'var(--green)', opacity: 0.7 }} />
          </div>
          <div className="kpi-label">Monthly Recurring Revenue</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>{activeClients.length} active clients</div>
        </div>
        <div className="card-blue" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value" style={{ fontSize: '2rem' }}>{fmt(ytdRevenue)}</div>
            <TrendingUp size={20} style={{ color: 'var(--light)', opacity: 0.7 }} />
          </div>
          <div className="kpi-label">YTD Revenue ({thisYear})</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>Collected invoices</div>
        </div>
        <div className="card-blue" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value" style={{ fontSize: '2rem' }}>{fmt(allTimeRevenue)}</div>
            <DollarSign size={20} style={{ color: 'var(--light)', opacity: 0.7 }} />
          </div>
          <div className="kpi-label">All-Time Revenue</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 4 }}>All paid invoices</div>
        </div>
      </div>

      {overdueInvoices.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={18} style={{ color: '#EF4444', flexShrink: 0 }} />
          <div>
            <span style={{ fontWeight: 700, color: '#EF4444', fontSize: '0.85rem' }}>
              {overdueInvoices.length} overdue {overdueInvoices.length === 1 ? 'invoice' : 'invoices'}
            </span>
            <span style={{ color: 'var(--light)', fontSize: '0.85rem' }}>
              {' '}— {fmt(overdueInvoices.reduce((s, i) => s + i.amount, 0))} outstanding
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Monthly Breakdown (Last 6 Months)</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>New</th>
                  <th>MRR</th>
                  <th>Invoiced</th>
                  <th>Collected</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBreakdown.map((m) => (
                  <tr key={m.label}>
                    <td style={{ color: 'var(--light)', fontWeight: 600 }}>{m.label}</td>
                    <td style={{ color: m.newClients > 0 ? 'var(--green)' : 'var(--gray)' }}>+{m.newClients}</td>
                    <td style={{ color: 'var(--light)' }}>{fmt(m.mrrSnapshot)}</td>
                    <td style={{ color: 'var(--light)' }}>{fmt(m.invoiced)}</td>
                    <td style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt(m.collected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Client MRR</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Package</th>
                  <th>MRR</th>
                  <th>Months</th>
                </tr>
              </thead>
              <tbody>
                {activeClients.map((c) => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--white)', fontWeight: 600 }}>{c.businessName}</td>
                    <td><span className={`badge ${packageBadge[c.packageTier]}`} style={{ fontSize: '0.65rem' }}>{c.packageTier}</span></td>
                    <td style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt(c.mrr)}</td>
                    <td style={{ color: 'var(--gray)' }}>{monthsRetained(c.launchDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
