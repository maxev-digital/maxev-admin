import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Mail, MessageSquare, FileText, Users, Send, BarChart2, Reply, Calendar } from 'lucide-react';

const fmtDate = (d: Date) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default async function OutreachPage() {
  const history = await prisma.outreachHistory.findMany({
    include: { prospect: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const quickLinks = [
    { label: 'Templates', href: '/outreach/templates', icon: FileText, color: 'var(--primary)', desc: 'Email, SMS & call scripts' },
    { label: 'Campaigns', href: '/outreach/campaigns', icon: Send, color: 'var(--green)', desc: 'Bulk outreach sequences' },
    { label: 'SMS', href: '/outreach/sms', icon: MessageSquare, color: 'var(--orange)', desc: 'Twilio two-way SMS' },
    { label: 'Subscribers', href: '/outreach/subscribers', icon: Users, color: '#8B5CF6', desc: 'List management' },
  ];

  const stats = [
    { label: 'Emails Sent', value: '847', icon: Mail, cardClass: 'card-blue', valueClass: 'kpi-value' },
    { label: 'Open Rate', value: '34%', icon: BarChart2, cardClass: 'card-green', valueClass: 'kpi-value-green' },
    { label: 'Replies', value: '67', icon: Reply, cardClass: 'card-orange', valueClass: 'kpi-value-orange' },
    { label: 'Demos Booked', value: '18', icon: Calendar, cardClass: 'card-blue', valueClass: 'kpi-value' },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Outreach</h1>
          <p className="page-sub">Email, SMS, and prospect outreach activity</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {stats.map((s) => {
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {quickLinks.map((ql) => {
          const Icon = ql.icon;
          return (
            <Link
              key={ql.label}
              href={ql.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: 18,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${ql.color}18`, border: `1px solid ${ql.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={17} style={{ color: ql.color }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--white)', marginBottom: 3 }}>{ql.label}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--gray)' }}>{ql.desc}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Outreach</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Prospect</th>
                <th>Channel</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--gray)', textAlign: 'center', padding: 32 }}>No outreach history yet</td>
                </tr>
              ) : history.map((h) => (
                <tr key={h.id}>
                  <td style={{ color: 'var(--white)', fontWeight: 600 }}>{h.prospect?.businessName ?? '—'}</td>
                  <td>
                    <span className={`badge ${h.channel === 'email' ? 'badge-blue' : h.channel === 'sms' ? 'badge-green' : 'badge-gray'}`}>
                      {h.channel}
                    </span>
                  </td>
                  <td style={{ color: 'var(--light)', fontSize: '0.8rem' }}>{h.subject ?? '—'}</td>
                  <td>
                    <span className={`badge ${h.status === 'opened' ? 'badge-green' : h.status === 'replied' ? 'badge-purple' : 'badge-gray'}`}>
                      {h.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--gray)' }}>{fmtDate(h.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
