import Link from 'next/link';
import {
  FileText, TrendingUp, Plus,
  UserPlus, ChevronRight, Activity, Building2, Zap,
} from 'lucide-react';
import { prisma } from '@/lib/db';
import DashboardKPICards from '@/components/DashboardKPICards';

const STAGE_LABELS: Record<string, string> = {
  LEAD: 'Lead',
  DEMO_SCHEDULED: 'Demo Scheduled',
  PROPOSAL_SENT: 'Proposal Sent',
  CONTRACT_SIGNED: 'Contract Signed',
  IN_DEV: 'In Dev',
  REVIEW: 'Review',
  LIVE: 'Live',
  ON_RETAINER: 'On Retainer',
  DEAD: 'Dead',
};

const ACTIVE_STAGES = ['LEAD', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'CONTRACT_SIGNED', 'IN_DEV', 'REVIEW'];

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  note: 'var(--primary)',
  email: 'var(--green)',
  call: 'var(--orange)',
  stage_change: '#a78bfa',
  invoice: 'var(--green)',
  proposal: 'var(--primary)',
  client_added: 'var(--green)',
  lead_added: 'var(--orange)',
};

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

function fmtDate(d: Date) {
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function DashboardPage() {
  // ── Parallel data fetches ────────────────────────────────────────────────
  const sevenDaysAgo  = new Date(Date.now() - 7 * 86400000);
  const fiveDaysAgo   = new Date(Date.now() - 5 * 86400000);

  const [
    activeClients,
    allLeads,
    outstandingInvoices,
    recentActivity,
    recentClients,
    staleLeads,
    staleProposals,
    overdueInvoiceList,
    overdueTaskCount,
  ] = await Promise.all([
    prisma.client.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, mrr: true },
    }),
    prisma.lead.findMany({
      select: { stage: true, estimatedValue: true },
    }),
    prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { status: { in: ['PENDING', 'SENT', 'OVERDUE'] } },
    }),
    prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        description: true,
        createdAt: true,
        client: { select: { businessName: true } },
        lead: { select: { businessName: true } },
      },
    }),
    prisma.client.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        businessName: true,
        industry: true,
        status: true,
        mrr: true,
        packageTier: true,
        createdAt: true,
      },
    }),
    // Pipeline alerts
    prisma.lead.findMany({
      where: { stage: { in: ACTIVE_STAGES }, updatedAt: { lt: sevenDaysAgo } },
      select: { id: true, businessName: true, stage: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
      take: 5,
    }),
    prisma.proposal.findMany({
      where: { status: { in: ['SENT', 'VIEWED'] }, sentAt: { lt: fiveDaysAgo } },
      select: { id: true, businessName: true, oneTimeTotal: true, monthlyTotal: true, sentAt: true, status: true },
      orderBy: { sentAt: 'asc' },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: { status: 'OVERDUE' },
      select: { id: true, invoiceNumber: true, amount: true, client: { select: { businessName: true } } },
      take: 5,
    }),
    prisma.task.count({
      where: { status: { not: 'DONE' }, dueDate: { lt: new Date(new Date().toDateString()) } },
    }),
  ]);

  // ── KPI computation ──────────────────────────────────────────────────────
  const mrr = activeClients.reduce((sum, c) => sum + c.mrr, 0);
  const activeCount = activeClients.length;

  const openPipelineLeads = allLeads.filter((l) => ACTIVE_STAGES.includes(l.stage));
  const openPipelineValue = openPipelineLeads.reduce(
    (sum, l) => sum + (l.estimatedValue ?? 0),
    0,
  );

  const outstandingTotal = outstandingInvoices._sum.amount ?? 0;

  // ── Pipeline stage counts ────────────────────────────────────────────────
  const stageCounts: Record<string, number> = {};
  for (const l of allLeads) {
    stageCounts[l.stage] = (stageCounts[l.stage] ?? 0) + 1;
  }
  const pipelineRows = ACTIVE_STAGES.map((s) => ({
    stage: s,
    label: STAGE_LABELS[s],
    count: stageCounts[s] ?? 0,
  }));

  // ── Status badge helper ──────────────────────────────────────────────────
  function statusBadge(status: string) {
    const map: Record<string, string> = {
      ACTIVE: 'badge-green',
      PAUSED: 'badge-orange',
      CHURNED: 'badge-red',
      PROSPECT: 'badge-blue',
    };
    const labels: Record<string, string> = {
      ACTIVE: 'Active',
      PAUSED: 'Paused',
      CHURNED: 'Churned',
      PROSPECT: 'Prospect',
    };
    return (
      <span className={`badge ${map[status] ?? 'badge-gray'}`}>
        {labels[status] ?? status}
      </span>
    );
  }

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Business at a glance — live data from your CRM.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/pipeline/new" className="btn btn-primary btn-sm">
            <Plus size={13} />
            New Lead
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <DashboardKPICards
        mrr={mrr}
        activeCount={activeCount}
        openPipelineValue={openPipelineValue}
        openPipelineLeads={openPipelineLeads.length}
        outstandingTotal={outstandingTotal}
      />

      {/* Pipeline Alerts */}
      {(staleLeads.length > 0 || staleProposals.length > 0 || overdueInvoiceList.length > 0 || overdueTaskCount > 0) && (
        <div className="card" style={{ padding: 20, marginBottom: 20, borderLeft: '3px solid var(--orange)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Zap size={14} style={{ color: 'var(--orange)' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--white)' }}>Pipeline Alerts</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--gray)', marginLeft: 4 }}>Items requiring your attention</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {staleLeads.map((lead) => {
              const days = Math.floor((Date.now() - lead.updatedAt.getTime()) / 86400000);
              return (
                <div key={lead.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8 }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--white)' }}>{lead.businessName}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray)', marginLeft: 8 }}>No activity in {days} days · {STAGE_LABELS[lead.stage]}</span>
                  </div>
                  <Link href={`/pipeline`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem' }}>View Lead</Link>
                </div>
              );
            })}
            {staleProposals.map((p) => {
              const days = p.sentAt ? Math.floor((Date.now() - p.sentAt.getTime()) / 86400000) : 0;
              const value = p.monthlyTotal > 0 ? `$${p.monthlyTotal.toLocaleString()}/mo` : `$${p.oneTimeTotal.toLocaleString()}`;
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(59,125,217,0.06)', border: '1px solid rgba(59,125,217,0.15)', borderRadius: 8 }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--white)' }}>{p.businessName}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray)', marginLeft: 8 }}>Proposal {p.status === 'VIEWED' ? 'viewed' : 'sent'} {days} days ago · {value}</span>
                  </div>
                  <Link href={`/proposals`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem' }}>View Proposal</Link>
                </div>
              );
            })}
            {overdueInvoiceList.map((inv) => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8 }}>
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--white)' }}>{inv.client.businessName}</span>
                  <span style={{ fontSize: '0.72rem', color: '#f87171', marginLeft: 8 }}>Invoice {inv.invoiceNumber} overdue · ${inv.amount.toLocaleString()}</span>
                </div>
                <Link href={`/invoices`} className="btn btn-danger btn-sm" style={{ fontSize: '0.68rem' }}>View Invoice</Link>
              </div>
            ))}
            {overdueTaskCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8 }}>
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--white)' }}>{overdueTaskCount} overdue task{overdueTaskCount !== 1 ? 's' : ''}</span>
                  <span style={{ fontSize: '0.72rem', color: '#f87171', marginLeft: 8 }}>Past due date and not completed</span>
                </div>
                <Link href="/tasks" className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem' }}>View Tasks</Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Quick Actions */}
          <div className="card" style={{ padding: 20 }}>
            <SectionHeader icon={<TrendingUp size={15} style={{ color: '#fff' }} />} title="Quick Actions" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Add Lead',      icon: UserPlus,  href: '/pipeline/new',   color: 'var(--green)' },
                { label: 'Add Client',    icon: Users,     href: '/clients/new',    color: 'var(--primary)' },
                { label: 'New Invoice',   icon: FileText,  href: '/proposals/new',  color: 'var(--orange)' },
              ].map(({ label, icon: Icon, href, color }) => (
                <Link
                  key={label}
                  href={href}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    padding: '16px 8px',
                    background: 'var(--card2)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    textAlign: 'center',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 9,
                      background: `${color}1a`,
                      border: `1px solid ${color}33`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--light)' }}>
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Clients */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <SectionHeader icon={<Building2 size={15} style={{ color: '#fff' }} />} title="Recent Clients" />
              <Link href="/clients" style={{ fontSize: '0.72rem', color: 'var(--primary)', textDecoration: 'none' }}>
                View all
              </Link>
            </div>

            {recentClients.length === 0 ? (
              <EmptyState text="No clients yet — add your first client to get started." />
            ) : (
              <div className="table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Business', 'Industry', 'Tier', 'MRR', 'Status', 'Added'].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentClients.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={tdStyle}>
                          <Link
                            href={`/clients/${c.id}`}
                            style={{ color: 'var(--light)', textDecoration: 'none', fontWeight: 500 }}
                          >
                            {c.businessName}
                          </Link>
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--gray)' }}>{c.industry}</td>
                        <td style={tdStyle}>
                          <span className="badge badge-gray" style={{ textTransform: 'capitalize', fontSize: '0.66rem' }}>
                            {c.packageTier.toLowerCase()}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--green)', fontWeight: 600 }}>
                          {c.mrr > 0 ? fmt$(c.mrr) : <span style={{ color: 'var(--gray)' }}>—</span>}
                        </td>
                        <td style={tdStyle}>{statusBadge(c.status)}</td>
                        <td style={{ ...tdStyle, color: 'var(--gray)' }}>
                          {c.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Activity Feed */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <SectionHeader icon={<Activity size={15} style={{ color: '#fff' }} />} title="Activity" />
            </div>

            {recentActivity.length === 0 ? (
              <EmptyState text="No activity logged yet." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recentActivity.map((item, i) => {
                  const dotColor = ACTIVITY_TYPE_COLORS[item.type] ?? 'var(--gray)';
                  const entity = item.client?.businessName ?? item.lead?.businessName;
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        gap: 10,
                        padding: '9px 0',
                        borderBottom: i < recentActivity.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div style={{ paddingTop: 4, flexShrink: 0 }}>
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: dotColor,
                            boxShadow: `0 0 5px ${dotColor}88`,
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--light)', lineHeight: 1.45 }}>
                          {item.description}
                        </div>
                        {entity && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--primary)', marginTop: 1 }}>
                            {entity}
                          </div>
                        )}
                        <div style={{ fontSize: '0.67rem', color: 'var(--gray)', marginTop: 2 }}>
                          {fmtDate(item.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pipeline Snapshot */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <SectionHeader icon={<GitBranch size={15} style={{ color: '#fff' }} />} title="Pipeline" />
              <Link href="/pipeline" style={{ fontSize: '0.72rem', color: 'var(--primary)', textDecoration: 'none' }}>
                View all
              </Link>
            </div>

            {pipelineRows.map((row, i) => (
              <div
                key={row.stage}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '7px 0',
                  borderBottom: i < pipelineRows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  fontSize: '0.8rem',
                }}
              >
                <span style={{ color: 'var(--light)' }}>{row.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      color: row.count > 0 ? 'var(--light)' : 'var(--gray)',
                      fontWeight: row.count > 0 ? 600 : 400,
                      minWidth: 14,
                      textAlign: 'right',
                    }}
                  >
                    {row.count}
                  </span>
                  <ChevronRight size={12} style={{ color: 'var(--gray)' }} />
                </div>
              </div>
            ))}

            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
              }}
            >
              <span style={{ color: 'var(--gray)' }}>Total open leads</span>
              <span style={{ color: 'var(--light)', fontWeight: 700 }}>
                {openPipelineLeads.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Shared sub-components (server-side, no 'use client') ───────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          background: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--light)' }}>{title}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: '24px 0',
        textAlign: 'center',
        color: 'var(--gray)',
        fontSize: '0.78rem',
      }}
    >
      {text}
    </div>
  );
}

// ── Style constants ────────────────────────────────────────────────────────

const iconWrap: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 8,
  background: 'rgba(255,255,255,0.06)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const subText: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--gray)',
  marginTop: 4,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 10px',
  fontSize: '0.69rem',
  fontWeight: 600,
  color: 'var(--gray)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: '1px solid var(--border)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 10px',
  fontSize: '0.8rem',
  color: 'var(--light)',
  verticalAlign: 'middle',
};
