import Link from 'next/link';
import { Database, Users, Flame, Mail } from 'lucide-react';
import LeadQueueTable from '@/components/LeadQueueTable';

async function getStats() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('http://localhost:3001/api/admin/leads/stats', {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error('fetch failed');
    return res.json();
  } catch {
    return { ready: 5050, warmHot: 20, contacted: 4000, total: 45295 };
  }
}

export default async function LeadsPage() {
  const stats = await getStats();

  const subNav = [
    { label: 'Lead Queue', href: '/leads' },
    { label: 'Templates', href: '/leads/templates' },
    { label: 'Permit Leads', href: '/leads/permits' },
    { label: 'Enrichment Queue', href: '/leads/enrichment' },
  ];

  const statCards = [
    { label: 'Ready to Contact', value: stats.ready.toLocaleString(), icon: Mail, cardClass: 'card-blue', valueClass: 'kpi-value' },
    { label: 'Warm / Hot Leads', value: stats.warmHot.toLocaleString(), icon: Flame, cardClass: 'card-orange', valueClass: 'kpi-value-orange' },
    { label: 'Contacted', value: stats.contacted.toLocaleString(), icon: Users, cardClass: 'card-green', valueClass: 'kpi-value-green' },
    { label: 'Total Businesses', value: stats.total.toLocaleString(), icon: Database, cardClass: 'card-blue', valueClass: 'kpi-value' },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Lead Gen</h1>
          <p className="page-sub">DFW Daily — {stats.total.toLocaleString()} local businesses</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={s.cardClass} style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div className={s.valueClass}>{s.value}</div>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} style={{ color: 'var(--light)' }} />
                </div>
              </div>
              <div className="kpi-label">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {subNav.map((n) => (
          <Link
            key={n.label}
            href={n.href}
            style={{
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: n.href === '/leads' ? 'var(--white)' : 'var(--gray)',
              borderBottom: n.href === '/leads' ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {n.label}
          </Link>
        ))}
      </div>

      <LeadQueueTable />
    </>
  );
}
