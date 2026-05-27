import { prisma } from '@/lib/db';
import { DollarSign, TrendingUp, Users, BarChart3, Layers } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const TIER_COLORS: Record<string, { color: string; bg: string; badge: string }> = {
  STARTER:    { color: 'var(--gray)',    bg: 'rgba(136,136,136,0.08)', badge: 'badge-gray' },
  GROWTH:     { color: 'var(--primary)', bg: 'rgba(37,99,235,0.08)',   badge: 'badge-blue' },
  PRO:        { color: '#8B5CF6',        bg: 'rgba(139,92,246,0.08)',  badge: 'badge-purple' },
  ENTERPRISE: { color: 'var(--orange)',  bg: 'rgba(229,90,43,0.08)',   badge: 'badge-orange' },
  CUSTOM:     { color: 'var(--green)',   bg: 'rgba(0,212,200,0.08)',   badge: 'badge-green' },
};

const MRR_BANDS = [
  { label: '$0 – $500',    min: 0,    max: 500 },
  { label: '$500 – $1,000', min: 500,  max: 1000 },
  { label: '$1,000 – $2,000', min: 1000, max: 2000 },
  { label: '$2,000+',      min: 2000, max: Infinity },
];

export default async function PackagePnLPage() {
  const [activeClients, paidInvoices] = await Promise.all([
    prisma.client.findMany({ where: { status: 'ACTIVE' } }),
    prisma.invoice.findMany({ where: { status: 'PAID' }, include: { client: true } }),
  ]);

  const totalMrr = activeClients.reduce((s, c) => s + c.mrr, 0);
  const totalClients = activeClients.length;

  // ── Package Tier Summary ──────────────────────────────────────────────────────
  const tierOrder = ['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE', 'CUSTOM'] as const;
  const tierSummary = tierOrder.map((tier) => {
    const clients = activeClients.filter((c) => c.packageTier === tier);
    const mrr = clients.reduce((s, c) => s + c.mrr, 0);
    const avg = clients.length > 0 ? Math.round(mrr / clients.length) : 0;
    return { tier, count: clients.length, mrr, avg };
  });

  // ── Industry Revenue ──────────────────────────────────────────────────────────
  const industryMap = new Map<string, { count: number; mrr: number }>();
  for (const c of activeClients) {
    const key = c.industry || 'Unknown';
    if (!industryMap.has(key)) industryMap.set(key, { count: 0, mrr: 0 });
    const entry = industryMap.get(key)!;
    entry.count += 1;
    entry.mrr += c.mrr;
  }
  const industryRevenue = Array.from(industryMap.entries())
    .map(([industry, data]) => ({ industry, ...data }))
    .sort((a, b) => b.mrr - a.mrr)
    .slice(0, 10);

  // ── MRR Distribution ──────────────────────────────────────────────────────────
  const mrrBands = MRR_BANDS.map((band) => ({
    label: band.label,
    count: activeClients.filter((c) => c.mrr >= band.min && c.mrr < band.max).length,
  }));

  // ── Top 10 by LTV ─────────────────────────────────────────────────────────────
  const topLtv = [...activeClients]
    .sort((a, b) => b.mrr - a.mrr)
    .slice(0, 10)
    .map((c) => ({ ...c, ltv: c.mrr * 24 }));

  // ── Paid revenue total (for context KPI) ─────────────────────────────────────
  const totalPaidRevenue = paidInvoices.reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Package P&amp;L</h1>
          <p className="page-sub">MRR, tier breakdown, industry mix, and lifetime value analysis</p>
        </div>
      </div>

      {/* ── Top KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green">{fmt(totalMrr)}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total MRR</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{fmt(totalMrr * 12)} ARR</div>
        </div>

        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{totalClients}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Active Clients</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
            {totalClients > 0 ? fmt(Math.round(totalMrr / totalClients)) : '$0'} avg MRR
          </div>
        </div>

        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">{fmt(totalMrr * 24)}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Est. Portfolio LTV</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>24-month projection</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{fmt(totalPaidRevenue)}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">All-Time Collected</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{paidInvoices.length} paid invoices</div>
        </div>
      </div>

      {/* ── Package Tier Cards ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={14} style={{ color: 'var(--primary)' }} />
          </div>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--white)' }}>Package Tier Summary</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
          {tierSummary.map((t) => {
            const { color, bg, badge } = TIER_COLORS[t.tier];
            const pct = totalMrr > 0 ? Math.round((t.mrr / totalMrr) * 100) : 0;
            return (
              <div key={t.tier} className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span className={`badge ${badge}`} style={{ fontSize: '0.62rem' }}>{t.tier}</span>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DollarSign size={12} style={{ color }} />
                  </div>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color, fontFamily: 'var(--font-display)', letterSpacing: '0.02em', marginBottom: 2 }}>
                  {fmt(t.mrr)}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>MRR</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--light)' }}>{t.count}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--gray)' }}>Clients</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--light)' }}>{fmt(t.avg)}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--gray)' }}>Avg</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--light)' }}>{pct}%</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--gray)' }}>Mix</div>
                  </div>
                </div>
                {/* MRR bar */}
                <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: color, opacity: 0.75 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Industry Revenue + MRR Distribution ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Industry Revenue */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(229,90,43,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={14} style={{ color: 'var(--orange)' }} />
            </div>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--white)' }}>Industry Revenue</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--gray)', marginLeft: 'auto' }}>Top 10 by MRR</span>
          </div>
          {industryRevenue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--gray)', fontSize: '0.85rem' }}>No active clients</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {industryRevenue.map((row) => {
                const pct = totalMrr > 0 ? Math.round((row.mrr / totalMrr) * 100) : 0;
                return (
                  <div key={row.industry}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--light)' }}>{row.industry}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>
                        {row.count} client{row.count !== 1 ? 's' : ''} &bull; {fmt(row.mrr)} &bull; {pct}%
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: 'var(--primary)', opacity: 0.7 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MRR Distribution */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(0,212,200,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={14} style={{ color: 'var(--green)' }} />
            </div>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--white)' }}>MRR Distribution</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mrrBands.map((band) => {
              const pct = totalClients > 0 ? Math.round((band.count / totalClients) * 100) : 0;
              return (
                <div key={band.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--light)' }}>{band.label}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--gray)' }}>
                      {band.count} client{band.count !== 1 ? 's' : ''} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: 'var(--green)', opacity: 0.75 }} />
                  </div>
                </div>
              );
            })}
            <div style={{ padding: '10px 0 0', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Total active clients</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--white)' }}>{totalClients}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top 10 by LTV ── */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={14} style={{ color: '#8B5CF6' }} />
          </div>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--white)' }}>Lifetime Value Estimate</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--gray)', marginLeft: 'auto' }}>Top 10 active clients &bull; MRR x 24 months</span>
        </div>
        {topLtv.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray)', fontSize: '0.85rem' }}>No active clients</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Client</th>
                  <th>Tier</th>
                  <th style={{ textAlign: 'right' }}>MRR</th>
                  <th style={{ textAlign: 'right' }}>Est. LTV (24 mo)</th>
                </tr>
              </thead>
              <tbody>
                {topLtv.map((c, i) => {
                  const { color, badge } = TIER_COLORS[c.packageTier] ?? TIER_COLORS['CUSTOM'];
                  return (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--gray)', fontWeight: 700, fontSize: '0.8rem' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600, color: 'var(--white)' }}>{c.businessName}</td>
                      <td>
                        <span className={`badge ${badge}`} style={{ fontSize: '0.62rem' }}>{c.packageTier}</span>
                      </td>
                      <td style={{ textAlign: 'right', color, fontWeight: 700 }}>{fmt(c.mrr)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 800 }}>{fmt(c.ltv)}</td>
                    </tr>
                  );
                })}
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <td colSpan={3} style={{ fontWeight: 700, color: 'var(--white)' }}>Portfolio Total</td>
                  <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 800 }}>{fmt(totalMrr)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 800 }}>{fmt(totalMrr * 24)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
