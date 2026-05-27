import { prisma } from '@/lib/db';
import { MessageSquare, Mail, Phone, Reply, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default async function RepliesPage() {
  const [replies, totalSent] = await Promise.all([
    prisma.outreachHistory.findMany({
      where: { OR: [{ repliedAt: { not: null } }, { status: 'replied' }] },
      orderBy: { repliedAt: 'desc' },
      include: { prospect: true, lead: true },
    }),
    prisma.outreachHistory.count(),
  ]);

  const totalReplies  = replies.length;
  const emailReplies  = replies.filter((r) => r.channel === 'email').length;
  const smsReplies    = replies.filter((r) => r.channel === 'sms').length;
  const convRate      = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : '0.0';

  const channelIcon = (channel: string) => {
    if (channel === 'email') return <Mail size={11} />;
    if (channel === 'sms')   return <MessageSquare size={11} />;
    return <Phone size={11} />;
  };

  const channelBadge: Record<string, string> = {
    email: 'badge-blue',
    sms:   'badge-green',
    call:  'badge-orange',
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reply Tracker</h1>
          <p className="page-sub">Prospects and leads who replied to your outreach</p>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">{totalReplies}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Reply size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total Replies</div>
        </div>

        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{emailReplies}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Email Replies</div>
        </div>

        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green">{smsReplies}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">SMS Replies</div>
        </div>

        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green">{convRate}%</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Conversion Rate</div>
        </div>
      </div>

      {/* Reply cards */}
      {replies.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray)', marginBottom: 8 }}>No replies tracked yet.</p>
          <p style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>
            Mark outreach as replied in the{' '}
            <Link href="/comms/history" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
              History tab
            </Link>
            .
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {replies.map((r) => {
            const businessName = r.prospect?.businessName ?? r.lead?.businessName ?? 'Unknown';
            const contactName  = r.prospect?.contactName  ?? r.lead?.contactName  ?? null;
            const isProspect   = !!r.prospectId;
            const linkHref     = isProspect
              ? `/prospects/${r.prospectId}`
              : `/leads/${r.leadId}`;
            const linkLabel    = isProspect ? 'View Prospect' : 'View Lead';

            const replyDate = r.repliedAt
              ? r.repliedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : r.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            return (
              <div
                key={r.id}
                className="card"
                style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 20 }}
              >
                {/* Left: identity */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: 'var(--white)', fontSize: '0.95rem' }}>
                      {businessName}
                    </span>
                    <span
                      className={`badge ${channelBadge[r.channel] ?? 'badge-gray'}`}
                      style={{ fontSize: '0.62rem', display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'capitalize' }}
                    >
                      {channelIcon(r.channel)}
                      {r.channel}
                    </span>
                  </div>
                  {contactName && (
                    <div style={{ color: 'var(--gray)', fontSize: '0.78rem', marginBottom: 6 }}>
                      {contactName}
                    </div>
                  )}
                  {r.subject && (
                    <div
                      style={{
                        color: 'var(--light)',
                        fontSize: '0.82rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 480,
                      }}
                    >
                      {r.subject}
                    </div>
                  )}
                </div>

                {/* Right: date + action */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                  <div style={{ color: 'var(--gray)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {replyDate}
                  </div>
                  {(r.leadId || r.prospectId) && (
                    <Link href={linkHref} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                      {linkLabel}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
