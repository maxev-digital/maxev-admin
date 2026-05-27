'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, ChevronRight, Sparkles, X, Check } from 'lucide-react';

type Priority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
type Status   = 'OPEN' | 'URGENT' | 'RESOLVED' | 'CLOSED';

interface Ticket {
  id: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  body: string;
  status: Status;
  priority: Priority;
  createdAt: string;
  assignee: string;
  category: string;
}

function priorityBadge(priority: Priority) {
  const map: Record<Priority, { cls: string; label: string }> = {
    URGENT: { cls: 'badge badge-red',    label: 'Urgent' },
    HIGH:   { cls: 'badge badge-orange', label: 'High' },
    MEDIUM: { cls: 'badge badge-blue',   label: 'Medium' },
    LOW:    { cls: 'badge badge-gray',   label: 'Low' },
  };
  return map[priority];
}

function categoryBadge(cat: string) {
  const map: Record<string, string> = {
    Clinical: 'badge badge-red', Billing: 'badge badge-orange',
    Appointments: 'badge badge-blue', Records: 'badge badge-gray',
    Technical: 'badge badge-purple',
  };
  return map[cat] ?? 'badge badge-gray';
}

function hoursOpen(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 3600000);
}

const PRIORITY_ORDER: Record<Priority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export default function OpenTicketsPage() {
  const [tickets, setTickets]           = useState<Ticket[]>([]);
  const [loading, setLoading]           = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/helpdesk/tickets')
      .then((r) => r.json())
      .then((all: Ticket[]) => {
        setTickets(all.filter((t) => t.status === 'OPEN' || t.status === 'URGENT'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stale      = tickets.filter((t) => hoursOpen(t.createdAt) >= 48);
  const unassigned = tickets.filter((t) => !t.assignee || t.assignee === 'Unassigned');
  const urgent     = tickets.filter((t) => t.priority === 'URGENT' || t.status === 'URGENT');

  const sorted = [...tickets].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  if (loading) {
    return (
      <>
        <div className="page-header"><div><h1 className="page-title">Open Tickets</h1></div></div>
        <div style={{ color: 'var(--gray)', padding: '40px 0', textAlign: 'center' }}>Loading...</div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Open Tickets</h1>
          <p className="page-sub">{tickets.length} open — sorted by priority</p>
        </div>
        <a href="/helpdesk" className="btn btn-ghost btn-sm">Back to Inbox</a>
      </div>

      {!bannerDismissed && stale.length > 0 && (
        <div style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.22)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={15} style={{ color: '#60A5FA', flexShrink: 0 }} />
            <span style={{ fontSize: '0.84rem', color: 'var(--light)' }}>
              <strong style={{ color: 'var(--white)' }}>{stale.length} ticket{stale.length !== 1 ? 's' : ''}</strong> {stale.length === 1 ? 'has' : 'have'} been open for 48+ hours without a response.
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setBannerDismissed(true)}><X size={11} /> Dismiss</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Open',   value: tickets.length,   cls: 'kpi-value' },
          { label: 'Urgent',       value: urgent.length,    cls: 'kpi-value-orange' },
          { label: 'Unassigned',   value: unassigned.length, cls: 'kpi-value' },
          { label: 'Stale (48h+)', value: stale.length,     cls: 'kpi-value-orange' },
        ].map((k) => (
          <div key={k.label} className="card" style={{ padding: '14px 18px' }}>
            <div className={k.cls}>{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Check size={32} style={{ color: 'var(--green)', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontWeight: 700, color: 'var(--white)', marginBottom: 4 }}>All caught up</div>
          <div style={{ color: 'var(--gray)', fontSize: '0.84rem' }}>No open tickets right now.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>From</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Time Open</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => {
                  const pb     = priorityBadge(t.priority);
                  const hrs    = hoursOpen(t.createdAt);
                  const isStale = hrs >= 48;
                  return (
                    <tr key={t.id} style={t.status === 'URGENT' ? { background: 'rgba(239,68,68,0.03)' } : {}}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--white)' }}>{t.fromName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>{t.fromEmail}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.83rem', color: 'var(--light)', maxWidth: 220, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.subject}
                        </span>
                      </td>
                      <td><span className={categoryBadge(t.category)}>{t.category}</span></td>
                      <td><span className={pb.cls}>{pb.label}</span></td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: !t.assignee || t.assignee === 'Unassigned' ? 'var(--gray)' : 'var(--light)', fontStyle: !t.assignee || t.assignee === 'Unassigned' ? 'italic' : 'normal' }}>
                          {t.assignee || 'Unassigned'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Clock size={11} style={{ color: isStale ? 'var(--orange)' : 'var(--gray)' }} />
                          <span style={{ fontSize: '0.82rem', color: isStale ? 'var(--orange)' : 'var(--light)', fontWeight: isStale ? 600 : 400 }}>
                            {hrs < 1 ? '< 1h' : hrs < 24 ? `${hrs}h` : `${Math.floor(hrs / 24)}d ${hrs % 24}h`}
                          </span>
                          {isStale && <AlertTriangle size={11} style={{ color: 'var(--orange)' }} />}
                        </div>
                      </td>
                      <td>
                        <a href="/helpdesk" className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }}>
                          <ChevronRight size={11} /> View
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
