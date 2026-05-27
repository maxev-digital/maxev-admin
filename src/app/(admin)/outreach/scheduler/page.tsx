'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, Plus, ChevronDown, ChevronUp, Mail } from 'lucide-react';

interface WorkflowStep { timing: string; label: string; }
interface Workflow {
  id: string;
  name: string;
  isActive: boolean;
  trigger: string;
  steps: WorkflowStep[];
  enrolled: number;
  stepCount: number;
}

interface UpcomingSend {
  id: string;
  nextSendAt: string;
  contactName: string;
  contactEmail: string;
  sequenceName: string;
  currentStep: number;
  totalSteps: number;
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

export default function OutreachSchedulerPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [upcoming, setUpcoming]   = useState<UpcomingSend[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/outreach/scheduler')
      .then((r) => r.json())
      .then((d) => {
        setWorkflows(d.workflows ?? []);
        setUpcoming(d.upcoming ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleStatus(id: string, isActive: boolean) {
    await fetch(`/api/outreach/sequences/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setWorkflows((prev) => prev.map((w) => w.id === id ? { ...w, isActive: !isActive } : w));
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  const activeCount  = workflows.filter((w) => w.isActive).length;
  const upcomingWeek = upcoming.filter((s) => {
    const d = new Date(s.nextSendAt);
    const now = new Date();
    const weekOut = new Date(now.getTime() + 7 * 86400000);
    return d <= weekOut;
  }).length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Outreach Scheduler</h1>
          <p className="page-sub">Automated sequences, drip campaigns, and follow-up schedules</p>
        </div>
        <a href="/outreach/sequences" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={13} /> New Workflow
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div className="kpi-value">{loading ? '—' : activeCount}</div>
          <div className="kpi-label">Active Workflows</div>
        </div>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div className="kpi-value-green">{loading ? '—' : upcomingWeek}</div>
          <div className="kpi-label">Scheduled Sends (Next 7 Days)</div>
        </div>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div className="kpi-value-orange">{loading ? '—' : upcoming.length}</div>
          <div className="kpi-label">Total Upcoming Sends</div>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Workflows
        </div>

        {loading ? (
          <div style={{ color: 'var(--gray)', fontSize: '0.84rem', textAlign: 'center', padding: '24px 0' }}>Loading...</div>
        ) : workflows.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ color: 'var(--gray)', fontSize: '0.84rem', marginBottom: 12 }}>No sequences created yet.</div>
            <a href="/outreach/sequences" className="btn btn-primary btn-sm">Create First Sequence</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {workflows.map((w) => {
              const isExpanded = expanded.has(w.id);
              return (
                <div key={w.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer' }} onClick={() => toggleExpand(w.id)}>
                    <div style={{ color: 'var(--gray)', flexShrink: 0 }}>
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--white)' }}>{w.name}</span>
                        <span className="badge badge-blue" style={{ fontSize: '0.66rem' }}>{w.stepCount}-step</span>
                        {w.trigger !== 'manual' && <span className="badge badge-purple" style={{ fontSize: '0.66rem' }}>{w.trigger}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--white)' }}>{w.enrolled}</div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--gray)' }}>Enrolled</div>
                      </div>
                      <span className={`badge ${w.isActive ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.68rem', minWidth: 52, textAlign: 'center' }}>
                        {w.isActive ? 'Active' : 'Paused'}
                      </span>
                      <button type="button" className={`btn btn-sm ${w.isActive ? 'btn-ghost' : 'btn-primary'}`} style={{ fontSize: '0.72rem', flexShrink: 0 }}
                        onClick={(e) => { e.stopPropagation(); toggleStatus(w.id, w.isActive); }}>
                        {w.isActive ? <Pause size={11} /> : <Play size={11} />}
                        {w.isActive ? 'Pause' : 'Resume'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && w.steps.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px 18px', background: 'var(--card2)' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray)', marginBottom: 10 }}>
                        Sequence Steps
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {w.steps.map((step, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>{i + 1}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', minWidth: 60, flexShrink: 0 }}>{step.timing}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--light)' }}>{step.label}</span>
                            </div>
                            <Mail size={12} style={{ color: 'var(--gray)', flexShrink: 0 }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Upcoming Scheduled Sends
        </div>
        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ color: 'var(--gray)', padding: '32px 0', textAlign: 'center', fontSize: '0.84rem' }}>Loading...</div>
          ) : upcoming.length === 0 ? (
            <div style={{ color: 'var(--gray)', padding: '32px 0', textAlign: 'center', fontSize: '0.84rem' }}>No upcoming sends scheduled.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Contact</th>
                    <th>Sequence</th>
                    <th>Step</th>
                    <th>Channel</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((s) => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--light)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtDateTime(s.nextSendAt)}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--white)', fontSize: '0.84rem' }}>{s.contactName}</div>
                        <div style={{ color: 'var(--gray)', fontSize: '0.72rem' }}>{s.contactEmail}</div>
                      </td>
                      <td style={{ color: 'var(--light)', fontSize: '0.78rem' }}>{s.sequenceName}</td>
                      <td>
                        <span className="badge badge-blue" style={{ fontSize: '0.66rem' }}>Step {s.currentStep} / {s.totalSteps}</span>
                      </td>
                      <td>
                        <span className="badge badge-purple" style={{ fontSize: '0.66rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={9} /> Email
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
