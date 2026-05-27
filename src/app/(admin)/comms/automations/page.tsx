'use client';

import { useState, useEffect } from 'react';
import { Zap, Activity, Mail, Plus, Power, Edit } from 'lucide-react';

type Sequence = {
  id: string;
  name: string;
  trigger: string;
  isActive: boolean;
  steps: Array<{ id: string }>;
  enrollments: Array<{ id: string }>;
  updatedAt: string;
};

const TRIGGER_LABELS: Record<string, string> = {
  manual:          'Manual',
  new_lead:        'New lead added',
  proposal_sent:   'Proposal sent',
  new_client:      'New client signed',
  invoice_overdue: 'Invoice 7+ days overdue',
};

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function AutomationsPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading]     = useState(true);
  const [queueCount, setQueueCount] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/outreach/sequences').then((r) => r.json()),
      fetch('/api/cron/drip').then((r) => r.json()).catch(() => ({ pending: 0 })),
    ]).then(([seqs, drip]) => {
      setSequences(seqs);
      setQueueCount(drip.pending ?? 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function toggle(seq: Sequence) {
    const res = await fetch(`/api/outreach/sequences/${seq.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !seq.isActive }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setSequences((prev) => prev.map((s) => s.id === seq.id ? { ...s, isActive: updated.isActive } : s));
  }

  const active     = sequences.filter((s) => s.isActive).length;
  const totalEnrolled = sequences.reduce((n, s) => n + s.enrollments.length, 0);
  const mostActive = sequences.reduce((best, s) => s.enrollments.length > (best?.enrollments.length ?? -1) ? s : best, null as Sequence | null);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Automations</h1>
          <p className="page-sub">Trigger-based email workflows — manage via Drip Sequences</p>
        </div>
        <a href="/outreach/sequences" className="btn btn-primary btn-sm">
          <Plus size={13} />
          New Workflow
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green">{loading ? '—' : active}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Active Workflows</div>
        </div>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{loading ? '—' : totalEnrolled}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Active Enrollments</div>
        </div>
        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">{loading || queueCount === null ? '—' : queueCount}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Emails Pending Send</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--gray)', fontSize: '0.84rem' }}>Loading...</div>
        ) : sequences.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--gray)', fontSize: '0.84rem' }}>
            No workflows yet. <a href="/outreach/sequences" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Create your first drip sequence</a>.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Workflow Name</th>
                  <th>Trigger</th>
                  <th>Steps</th>
                  <th>Enrolled</th>
                  <th>Last Updated</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sequences.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700, color: 'var(--white)' }}>{s.name}</td>
                    <td style={{ color: 'var(--light)', fontSize: '0.82rem' }}>{TRIGGER_LABELS[s.trigger] ?? s.trigger}</td>
                    <td>
                      <span style={{ padding: '2px 10px', background: 'rgba(37,99,235,0.12)', borderRadius: 6, fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700 }}>
                        {s.steps.length}-step
                      </span>
                    </td>
                    <td style={{ color: 'var(--light)', fontSize: '0.82rem' }}>{s.enrollments.length}</td>
                    <td style={{ color: 'var(--gray)', fontSize: '0.82rem' }}>{fmtDate(s.updatedAt)}</td>
                    <td>
                      <span className={`badge ${s.isActive ? 'badge-green' : 'badge-gray'}`}>{s.isActive ? 'Active' : 'Paused'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggle(s)}
                          style={{ color: s.isActive ? 'var(--orange)' : 'var(--green)' }}
                        >
                          <Power size={12} /> {s.isActive ? 'Pause' : 'Resume'}
                        </button>
                        <a href="/outreach/sequences" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                          <Edit size={12} /> Edit
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="divider" style={{ margin: '24px 0' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          {
            title: 'Most Active',
            value: mostActive?.name ?? 'None yet',
            sub: mostActive ? `${mostActive.enrollments.length} enrolled` : 'Create a sequence',
          },
          {
            title: 'Pending Sends',
            value: queueCount !== null ? `${queueCount} email${queueCount !== 1 ? 's' : ''}` : '—',
            sub: 'Run cron/drip to process',
          },
          {
            title: 'Total Sequences',
            value: String(sequences.length),
            sub: `${active} active`,
          },
        ].map((stat) => (
          <div key={stat.title} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{stat.title}</div>
            <div style={{ fontWeight: 700, color: 'var(--white)', fontSize: '0.92rem', marginBottom: 2 }}>{stat.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--green)' }}>{stat.sub}</div>
          </div>
        ))}
      </div>
    </>
  );
}
