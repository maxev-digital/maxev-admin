import { prisma } from '@/lib/db';
import { Users, DollarSign, GitBranch, FileText, TrendingUp, BarChart2 } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

export default async function AnalyticsPage() {
  const [clients, leads, proposals, invoices] = await Promise.all([
    prisma.client.findMany(),
    prisma.lead.findMany({ where: { stage: { not: 'DEAD' } } }),
    prisma.proposal.findMany(),
    prisma.invoice.findMany({ where: { status: 'PAID' } }),
  ]);

  const activeClients = clients.filter((c) => c.status === 'ACTIVE');
  const mrr = activeClients.reduce((s, c) => s + c.mrr, 0);
  const avgMrr = activeClients.length > 0 ? mrr / activeClients.length : 0;
  const signed = proposals.filter((p) => p.status === 'SIGNED').length;
  const lifetimeRevenue = invoices.reduce((s, i) => s + i.amount, 0);

  const tierBreakdown = (['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE', 'CUSTOM'] as const).map((tier) => {
    const tieredClients = activeClients.filter((c) => c.packageTier === tier);
    return { tier, count: tieredClients.length, mrr: tieredClients.reduce((s, c) => s + c.mrr, 0) };
  }).filter((t) => t.count > 0);

  const industryMap = new Map<string, { count: number; mrr: number }>();
  for (const c of activeClients) {
    const ex = industryMap.get(c.industry) ?? { count: 0, mrr: 0 };
    industryMap.set(c.industry, { count: ex.count + 1, mrr: ex.mrr + c.mrr });
  }
  const industries = Array.from(industryMap.entries())
    .map(([industry, d]) => ({ industry, ...d }))
    .sort((a, b) => b.mrr - a.mrr);

  const stageMap = new Map<string, number>();
  for (const l of leads) {
    stageMap.set(l.stage, (stageMap.get(l.stage) ?? 0) + 1);
  }

  const top5 = [...activeClients].sort((a, b) => b.mrr - a.mrr).slice(0, 5);

  const kpis = [
    { label: 'MRR', value: fmt(mrr), icon: DollarSign, cardClass: 'card-blue', valueClass: 'kpi-value' },
    { label: 'Active Clients', value: String(activeClients.length), icon: Users, cardClass: 'card-green', valueClass: 'kpi-value-green' },
    { label: 'Pipeline Leads', value: String(leads.length), icon: GitBranch, cardClass: 'card-blue', valueClass: 'kpi-value' },
    { label: 'Proposals Signed', value: String(signed), icon: FileText, cardClass: 'card-green', valueClass: 'kpi-value-green' },
    { label: 'Avg Client MRR', value: fmt(avgMrr), icon: TrendingUp, cardClass: 'card-orange', valueClass: 'kpi-value-orange' },
    { label: 'Lifetime Revenue', value: fmt(lifetimeRevenue), icon: BarChart2, cardClass: 'card-blue', valueClass: 'kpi-value' },
  ];

  const STAGES = ['LEAD', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'CONTRACT_SIGNED', 'IN_DEV', 'REVIEW', 'LIVE', 'ON_RETAINER'];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Business performance overview</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={k.cardClass} style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div className={k.valueClass}>{k.value}</div>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} style={{ color: 'var(--light)' }} />
                </div>
              </div>
              <div className="kpi-label">{k.label}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>MRR by Package Tier</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', color: 'var(--gray)', fontWeight: 600, paddingBottom: 8, borderBottom: '1px solid var(--border)', fontSize: '0.72rem' }}>Tier</th>
                <th style={{ textAlign: 'right', color: 'var(--gray)', fontWeight: 600, paddingBottom: 8, borderBottom: '1px solid var(--border)', fontSize: '0.72rem' }}>Clients</th>
                <th style={{ textAlign: 'right', color: 'var(--gray)', fontWeight: 600, paddingBottom: 8, borderBottom: '1px solid var(--border)', fontSize: '0.72rem' }}>MRR</th>
              </tr>
            </thead>
            <tbody>
              {tierBreakdown.map((t) => (
                <tr key={t.tier}>
                  <td style={{ padding: '8px 0', color: 'var(--light)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{t.tier}</td>
                  <td style={{ padding: '8px 0', color: 'var(--light)', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{t.count}</td>
                  <td style={{ padding: '8px 0', color: 'var(--green)', fontWeight: 600, textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{fmt(t.mrr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Clients by Industry</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', color: 'var(--gray)', fontWeight: 600, paddingBottom: 8, borderBottom: '1px solid var(--border)', fontSize: '0.72rem' }}>Industry</th>
                <th style={{ textAlign: 'right', color: 'var(--gray)', fontWeight: 600, paddingBottom: 8, borderBottom: '1px solid var(--border)', fontSize: '0.72rem' }}>Count</th>
                <th style={{ textAlign: 'right', color: 'var(--gray)', fontWeight: 600, paddingBottom: 8, borderBottom: '1px solid var(--border)', fontSize: '0.72rem' }}>MRR</th>
              </tr>
            </thead>
            <tbody>
              {industries.map((ind) => (
                <tr key={ind.industry}>
                  <td style={{ padding: '8px 0', color: 'var(--light)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{ind.industry}</td>
                  <td style={{ padding: '8px 0', color: 'var(--light)', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{ind.count}</td>
                  <td style={{ padding: '8px 0', color: 'var(--green)', fontWeight: 600, textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{fmt(ind.mrr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Pipeline by Stage</div>
          {STAGES.map((stage) => {
            const count = stageMap.get(stage) ?? 0;
            const maxCount = Math.max(...Array.from(stageMap.values()), 1);
            return (
              <div key={stage} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--light)' }}>{stage.replace(/_/g, ' ')}</span>
                  <span style={{ color: 'var(--gray)', fontWeight: 600 }}>{count}</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${(count / maxCount) * 100}%`, background: 'var(--primary)', borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Top 5 Clients by MRR</div>
          {top5.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', minWidth: 18 }}>#{i + 1}</span>
                <div>
                  <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--white)' }}>{c.businessName}</div>
                  <div style={{ fontSize: '0.71rem', color: 'var(--gray)' }}>{c.industry}</div>
                </div>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--green)' }}>{fmt(c.mrr)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
