import { Mail, Send, BarChart3, MessageSquare, Plus } from 'lucide-react';
import { prisma } from '@/lib/db';

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d));
}

function daysSince(d: Date | string): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
}

function mostCommon(arr: string[]): string {
  const freq: Record<string, number> = {};
  for (const v of arr) freq[v] = (freq[v] ?? 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'email';
}

const channelBadge: Record<string, string> = {
  email: 'badge-blue',
  sms: 'badge-green',
  phone: 'badge-orange',
  linkedin: 'badge-purple',
};

// ── Example campaigns shown when DB is empty ──────────────────────────────────
const EXAMPLE_CAMPAIGNS = [
  { name: 'Website Audit Offer — Q1 Plumbing Outreach', channel: 'email', sentCount: 47, openedCount: 15, repliedCount: 4, lastSentAt: '2026-03-18', isExample: true },
  { name: 'Google Ads Intro — Auto Shops DFW',          channel: 'email', sentCount: 23, openedCount: 10, repliedCount: 2, lastSentAt: '2026-04-02', isExample: true },
  { name: 'New Client Welcome Series',                   channel: 'email', sentCount: 15, openedCount: 12, repliedCount: 0, lastSentAt: '2026-04-22', isExample: true },
];

type Campaign = {
  name: string;
  channel: string;
  sentCount: number;
  openedCount: number;
  repliedCount: number;
  lastSentAt: string | Date;
  isExample?: boolean;
};

export default async function CampaignsPage() {
  const history = await prisma.outreachHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { prospect: true, lead: true },
  });

  // Group by subject (or "Direct Outreach" if no subject)
  const groupMap = new Map<string, typeof history>();
  for (const record of history) {
    const key = record.subject?.trim() || 'Direct Outreach';
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(record);
  }

  const isEmpty = groupMap.size === 0;

  const campaigns: Campaign[] = isEmpty
    ? EXAMPLE_CAMPAIGNS
    : Array.from(groupMap.entries()).map(([name, records]) => {
        const openedCount  = records.filter((r) => r.openedAt != null).length;
        const repliedCount = records.filter((r) => r.repliedAt != null || r.status === 'replied').length;
        const channel      = mostCommon(records.map((r) => r.channel));
        const lastSentAt   = records[0].createdAt; // already sorted desc
        return { name, channel, sentCount: records.length, openedCount, repliedCount, lastSentAt };
      });

  // KPI aggregates
  const totalCampaigns  = campaigns.length;
  const totalSent       = campaigns.reduce((s, c) => s + c.sentCount, 0);
  const totalOpened     = campaigns.reduce((s, c) => s + c.openedCount, 0);
  const avgOpenRate     = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Email Campaigns</h1>
          <p className="page-sub">Outreach sequences and bulk email performance</p>
        </div>
        <a href="/outreach" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
          <Plus size={13} />
          New Campaign
        </a>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{totalCampaigns}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total Campaigns</div>
        </div>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{totalSent.toLocaleString()}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total Sent</div>
        </div>
        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green">{totalOpened.toLocaleString()}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total Opened</div>
        </div>
        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">{avgOpenRate}%</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Avg Open Rate</div>
        </div>
      </div>

      {/* Campaigns table */}
      <div className="card" style={{ padding: 0 }}>
        {isEmpty && (
          <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-gray" style={{ fontSize: '0.68rem' }}>Example Data</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>No outreach history yet — showing example campaigns</span>
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Campaign Name</th>
                <th>Channel</th>
                <th>Sent</th>
                <th>Opened</th>
                <th>Open Rate</th>
                <th>Replies</th>
                <th>Last Sent</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const openRate = c.sentCount > 0 ? Math.round((c.openedCount / c.sentCount) * 100) : 0;
                const isRecent = daysSince(c.lastSentAt) <= 7;
                const statusLabel = isRecent ? 'Recent' : 'Completed';
                const statusClass = isRecent ? 'badge-green' : 'badge-blue';
                const badgeClass  = channelBadge[c.channel.toLowerCase()] ?? 'badge-gray';
                return (
                  <tr key={c.name}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, color: 'var(--white)' }}>{c.name}</span>
                        {c.isExample && (
                          <span className="badge badge-gray" style={{ fontSize: '0.64rem', opacity: 0.7 }}>Example</span>
                        )}
                      </div>
                    </td>
                    <td><span className={`badge ${badgeClass}`}>{c.channel}</span></td>
                    <td style={{ color: 'var(--light)' }}>{c.sentCount}</td>
                    <td style={{ color: 'var(--light)' }}>{c.openedCount}</td>
                    <td style={{ color: openRate > 0 ? 'var(--green)' : 'var(--gray)', fontWeight: 600 }}>
                      {openRate > 0 ? `${openRate}%` : '—'}
                    </td>
                    <td style={{ color: c.repliedCount > 0 ? 'var(--light)' : 'var(--gray)', fontWeight: 600 }}>
                      {c.repliedCount > 0 ? c.repliedCount : '—'}
                    </td>
                    <td style={{ color: 'var(--gray)', fontSize: '0.82rem' }}>{fmtDate(c.lastSentAt)}</td>
                    <td><span className={`badge ${statusClass}`}>{statusLabel}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm">View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
