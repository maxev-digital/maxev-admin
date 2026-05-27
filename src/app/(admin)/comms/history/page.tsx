import { prisma } from '@/lib/db';
import { Send, Mail, MessageSquare, Reply } from 'lucide-react';
import HistoryTable from './HistoryTable';

export default async function SendHistoryPage() {
  const records = await prisma.outreachHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { prospect: true, lead: true },
  });

  const totalSent   = records.length;
  const emailSent   = records.filter((r) => r.channel === 'email').length;
  const smsSent     = records.filter((r) => r.channel === 'sms').length;
  const replied     = records.filter((r) => !!r.repliedAt || r.status === 'replied').length;

  // Serialize dates for the client component
  const rows = records.map((r) => ({
    id:           r.id,
    channel:      r.channel,
    subject:      r.subject,
    status:       r.status,
    createdAt:    r.createdAt.toISOString(),
    openedAt:     r.openedAt ? r.openedAt.toISOString() : null,
    repliedAt:    r.repliedAt ? r.repliedAt.toISOString() : null,
    prospectName: r.prospect?.businessName ?? null,
    leadName:     r.lead?.businessName ?? null,
  }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Send History</h1>
          <p className="page-sub">Complete log of all outbound emails and SMS</p>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{totalSent}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total Sent</div>
        </div>

        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{emailSent}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Emails Sent</div>
        </div>

        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green">{smsSent}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">SMS Sent</div>
        </div>

        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">{replied}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Reply size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Replies Received</div>
        </div>
      </div>

      <HistoryTable rows={rows} />
    </>
  );
}
