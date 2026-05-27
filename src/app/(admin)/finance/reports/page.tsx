import { prisma } from '@/lib/db';
import { DollarSign, AlertCircle, TrendingUp, FileText, Calendar, Users, BarChart3 } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_BADGE: Record<string, string> = {
  PENDING:   'badge-orange',
  SENT:      'badge-blue',
  PAID:      'badge-green',
  OVERDUE:   'badge-red',
  CANCELLED: 'badge-gray',
};

export default async function FinanceReportsPage() {
  const allInvoices = await prisma.invoice.findMany({ include: { client: true } });

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const totalCollected = allInvoices
    .filter((i) => i.status === 'PAID')
    .reduce((s, i) => s + i.amount, 0);

  const outstanding = allInvoices
    .filter((i) => i.status === 'PENDING' || i.status === 'SENT')
    .reduce((s, i) => s + i.amount, 0);

  const overdue = allInvoices
    .filter((i) => i.status === 'OVERDUE')
    .reduce((s, i) => s + i.amount, 0);

  const totalInvoiced = allInvoices.reduce((s, i) => s + i.amount, 0);

  // ── Monthly Revenue (last 6 months of PAID invoices) ─────────────────────────
  const paidInvoices = allInvoices.filter((i) => i.status === 'PAID' && i.paidAt);

  const now = new Date();
  const monthBuckets: { year: number; month: number }[] = [];
  for (let offset = 5; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    monthBuckets.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  const monthlyRevenue = monthBuckets.map(({ year, month }) => {
    const invoicesInMonth = paidInvoices.filter((i) => {
      const d = new Date(i.paidAt!);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return {
      label: `${MONTH_NAMES[month]} ${year}`,
      count: invoicesInMonth.length,
      total: invoicesInMonth.reduce((s, i) => s + i.amount, 0),
    };
  });

  // ── Revenue by Client (top 10) ────────────────────────────────────────────────
  const clientMap = new Map<string, { name: string; paidCount: number; paidTotal: number; outstanding: number }>();

  for (const inv of allInvoices) {
    const name = inv.client.businessName;
    if (!clientMap.has(inv.clientId)) {
      clientMap.set(inv.clientId, { name, paidCount: 0, paidTotal: 0, outstanding: 0 });
    }
    const entry = clientMap.get(inv.clientId)!;
    if (inv.status === 'PAID') {
      entry.paidCount += 1;
      entry.paidTotal += inv.amount;
    } else if (inv.status === 'PENDING' || inv.status === 'SENT' || inv.status === 'OVERDUE') {
      entry.outstanding += inv.amount;
    }
  }

  const topClients = Array.from(clientMap.values())
    .sort((a, b) => b.paidTotal - a.paidTotal)
    .slice(0, 10);

  // ── Status Breakdown ──────────────────────────────────────────────────────────
  const statuses = ['PAID', 'SENT', 'PENDING', 'OVERDUE', 'CANCELLED'] as const;
  const statusBreakdown = statuses.map((status) => {
    const invoicesForStatus = allInvoices.filter((i) => i.status === status);
    return {
      status,
      count: invoicesForStatus.length,
      total: invoicesForStatus.reduce((s, i) => s + i.amount, 0),
    };
  });

  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Finance Reports</h1>
          <p className="page-sub">Revenue summary, monthly trends, and invoice breakdown</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green">{fmt(totalCollected)}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total Collected</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{collectionRate}% collection rate</div>
        </div>

        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{fmt(outstanding)}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Outstanding</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>Pending + Sent</div>
        </div>

        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">{fmt(overdue)}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Overdue</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
            {allInvoices.filter((i) => i.status === 'OVERDUE').length} invoice(s) past due
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{fmt(totalInvoiced)}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total Invoiced</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{allInvoices.length} invoices total</div>
        </div>
      </div>

      {/* ── Monthly Revenue + Status Breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Monthly Revenue Table */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={14} style={{ color: 'var(--primary)' }} />
            </div>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--white)' }}>Monthly Revenue</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--gray)', marginLeft: 'auto' }}>Last 6 months (paid)</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'center' }}>Invoices</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRevenue.map((row) => (
                  <tr key={row.label}>
                    <td style={{ fontWeight: 600, color: 'var(--white)' }}>{row.label}</td>
                    <td style={{ textAlign: 'center', color: 'var(--light)' }}>
                      {row.count > 0 ? (
                        <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{row.count}</span>
                      ) : (
                        <span style={{ color: 'var(--gray)' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', color: row.total > 0 ? 'var(--green)' : 'var(--gray)', fontWeight: row.total > 0 ? 700 : 400 }}>
                      {row.total > 0 ? fmt(row.total) : '—'}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <td style={{ fontWeight: 700, color: 'var(--white)' }}>Total</td>
                  <td style={{ textAlign: 'center', color: 'var(--light)', fontWeight: 700 }}>
                    {monthlyRevenue.reduce((s, r) => s + r.count, 0)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 800 }}>
                    {fmt(monthlyRevenue.reduce((s, r) => s + r.total, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(0,212,200,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={14} style={{ color: 'var(--green)' }} />
            </div>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--white)' }}>Invoice Status Breakdown</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Count</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {statusBreakdown.map((row) => (
                  <tr key={row.status}>
                    <td>
                      <span className={`badge ${STATUS_BADGE[row.status]}`} style={{ fontSize: '0.65rem' }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--light)' }}>
                      {row.count > 0 ? row.count : <span style={{ color: 'var(--gray)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right', color: row.count > 0 ? 'var(--light)' : 'var(--gray)', fontWeight: row.count > 0 ? 600 : 400 }}>
                      {row.total > 0 ? fmt(row.total) : '—'}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <td style={{ fontWeight: 700, color: 'var(--white)' }}>Total</td>
                  <td style={{ textAlign: 'center', color: 'var(--light)', fontWeight: 700 }}>{allInvoices.length}</td>
                  <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 800 }}>{fmt(totalInvoiced)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Revenue by Client ── */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(229,90,43,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={14} style={{ color: 'var(--orange)' }} />
          </div>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--white)' }}>Revenue by Client</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--gray)', marginLeft: 'auto' }}>Top 10 by total paid</span>
        </div>
        {topClients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray)', fontSize: '0.85rem' }}>
            No paid invoices yet
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th style={{ textAlign: 'center' }}>Paid Invoices</th>
                  <th style={{ textAlign: 'right' }}>Paid Total</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((c, i) => (
                  <tr key={c.name}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray)', width: 18 }}>#{i + 1}</span>
                        <span style={{ fontWeight: 600, color: 'var(--white)' }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--light)' }}>
                      {c.paidCount > 0 ? (
                        <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>{c.paidCount}</span>
                      ) : (
                        <span style={{ color: 'var(--gray)' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 700 }}>
                      {c.paidTotal > 0 ? fmt(c.paidTotal) : <span style={{ color: 'var(--gray)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {c.outstanding > 0 ? (
                        <span style={{ color: 'var(--orange)', fontWeight: 600 }}>{fmt(c.outstanding)}</span>
                      ) : (
                        <span style={{ color: 'var(--gray)' }}>—</span>
                      )}
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
