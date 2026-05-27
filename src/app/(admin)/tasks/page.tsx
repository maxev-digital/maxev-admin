'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, X, Plus } from 'lucide-react';
import { useAIHighlight } from '@/lib/ai-highlight';

type Priority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
type Status   = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

interface Task {
  id: string;
  title: string;
  priority: Priority;
  status: Status;
  assignedTo: string | null;
  dueDate: string | null;
  completedAt: string | null;
  linkedType: string | null;
  notes: string | null;
}

interface AddTaskForm {
  title: string;
  priority: Priority;
  status: Status;
  assignedTo: string;
  dueDate: string;
  linkedType: string;
  notes: string;
}

const BLANK_FORM: AddTaskForm = {
  title: '', priority: 'MEDIUM', status: 'TODO',
  assignedTo: '', dueDate: '', linkedType: '', notes: '',
};

const COLUMNS: { id: Status; label: string }[] = [
  { id: 'TODO',        label: 'To Do' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'REVIEW',      label: 'Review' },
  { id: 'DONE',        label: 'Done' },
];

const PRIORITY_BADGE: Record<Priority, string> = {
  URGENT: 'badge badge-red', HIGH: 'badge badge-red', MEDIUM: 'badge badge-orange', LOW: 'badge badge-gray',
};

const LINKED_BADGE: Record<string, string> = {
  Lead: 'badge badge-purple', Client: 'badge badge-blue', System: 'badge badge-gray', Internal: 'badge badge-green',
};

const COL_ACCENT: Record<Status, string> = {
  TODO: '#94a3b8', IN_PROGRESS: 'var(--primary)', REVIEW: 'var(--orange)', DONE: 'var(--green)',
};

function formatDue(due: string | null): string {
  if (!due) return '';
  return new Date(due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(due: string | null, status: Status): boolean {
  if (!due || status === 'DONE') return false;
  return new Date(due) < new Date();
}

export default function TaskBoardPage() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status')?.toUpperCase() as Status | null;
  const { isHighlighted, hasAnyHighlight } = useAIHighlight();
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [loading, setLoading]         = useState(true);
  const [briefingVisible, setBriefing] = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState<AddTaskForm>(BLANK_FORM);
  const [saving, setSaving]           = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<Status>('TODO');

  useEffect(() => {
    loadTasks();
  }, []);

  function loadTasks() {
    setLoading(true);
    fetch('/api/tasks')
      .then((r) => r.json())
      .then((data) => { setTasks(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  function openModal(status: Status = 'TODO') {
    setDefaultStatus(status);
    setForm({ ...BLANK_FORM, status });
    setShowModal(true);
  }

  async function saveTask(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title:      form.title.trim(),
      priority:   form.priority,
      status:     form.status,
      assignedTo: form.assignedTo.trim() || null,
      dueDate:    form.dueDate ? new Date(form.dueDate).toISOString() : null,
      linkedType: form.linkedType || null,
      notes:      form.notes.trim() || null,
    };
    try {
      const res  = await fetch('/api/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const task = await res.json();
      setTasks((prev) => [...prev, task]);
      setShowModal(false);
      setForm(BLANK_FORM);
    } finally {
      setSaving(false);
    }
  }

  async function moveTask(id: string, status: Status) {
    const body: Partial<Task> = { status };
    const res    = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const byStatus = (s: Status) => tasks.filter((t) => t.status === s);

  const kpi = {
    total:      tasks.length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    overdue:    tasks.filter((t) => isOverdue(t.dueDate, t.status)).length,
    done:       tasks.filter((t) => t.status === 'DONE').length,
  };

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1600 }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Task Board</h1>
          <p className="page-sub">Kanban view — all open work across clients and internal projects</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal('TODO')}>
          <Plus size={14} /> Add Task
        </button>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Tasks',  value: kpi.total,      cls: 'kpi-value' },
          { label: 'In Progress',  value: kpi.inProgress, cls: 'kpi-value' },
          { label: 'Overdue',      value: kpi.overdue,    cls: 'kpi-value-orange' },
          { label: 'Done',         value: kpi.done,       cls: 'kpi-value-green' },
        ].map((k) => (
          <div key={k.label} className="card" style={{ padding: '20px 24px' }}>
            <div className={k.cls}>{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* AI Briefing */}
      {briefingVisible && (
        <div className="card-blue" style={{ padding: '20px 24px', marginBottom: 28, position: 'relative' }}>
          <button onClick={() => setBriefing(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
            <X size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Sparkles size={16} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>AI Daily Briefing — Powered by Claude</span>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--white)', marginBottom: 14 }}>
            {kpi.overdue > 0 ? `${kpi.overdue} task${kpi.overdue !== 1 ? 's are' : ' is'} overdue. ` : ''}
            {kpi.inProgress > 0 ? `${kpi.inProgress} task${kpi.inProgress !== 1 ? 's' : ''} in progress. ` : ''}
            View your AI briefing for full pipeline context.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/ai-insights" className="btn btn-primary btn-sm">View Full Briefing</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => setBriefing(false)}>Dismiss</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--gray)', fontSize: '0.88rem' }}>Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--light)', marginBottom: 6 }}>No tasks yet</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--gray)', marginBottom: 16 }}>Add your first task to get started.</div>
          <button className="btn btn-primary btn-sm" onClick={() => openModal('TODO')}><Plus size={12} /> Add Task</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, alignItems: 'start' }}>
          {COLUMNS.map((col) => {
            const colTasks    = byStatus(col.id);
            const urlMatch    = statusFilter === col.id;
            const aiMatch     = isHighlighted('task-status', col.id);
            const anyAiMatch  = hasAnyHighlight('task-status');
            const shouldDim   = (statusFilter && !urlMatch) || (anyAiMatch && !aiMatch);
            return (
              <div key={col.id} style={{ opacity: shouldDim ? 0.35 : 1, transition: 'opacity 0.25s ease' }}>
                <div
                  className={aiMatch === 'glow' ? 'ai-highlight-pulse' : ''}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', marginBottom: 12, borderBottom: `3px solid ${COL_ACCENT[col.id]}` }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--white)' }}>{col.label}</span>
                  <span style={{ background: COL_ACCENT[col.id], color: col.id === 'TODO' ? '#1e293b' : 'var(--white)', fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '1px 7px' }}>
                    {colTasks.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {colTasks.map((task) => {
                    const overdue = isOverdue(task.dueDate, task.status);
                    return (
                      <div key={task.id} className="card" style={{ padding: '14px 16px', borderLeft: overdue ? '3px solid #ef4444' : '3px solid transparent' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', lineHeight: 1.4, flex: 1 }}>{task.title}</p>
                          <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', padding: '0 0 0 8px', flexShrink: 0 }}>
                            <X size={12} />
                          </button>
                        </div>
                        {task.notes && (
                          <p style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 8, lineHeight: 1.4 }}>{task.notes}</p>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          <span className={PRIORITY_BADGE[task.priority]}>{task.priority}</span>
                          {task.linkedType && <span className={LINKED_BADGE[task.linkedType] ?? 'badge badge-gray'}>{task.linkedType}</span>}
                          {task.assignedTo && <span style={{ fontSize: 11, color: 'var(--gray)' }}>{task.assignedTo}</span>}
                          {task.dueDate && (
                            <span style={{ fontSize: 11, color: overdue ? '#f87171' : 'var(--gray)', marginLeft: 'auto' }}>
                              {overdue ? 'Overdue · ' : ''}{formatDue(task.dueDate)}
                            </span>
                          )}
                          {task.completedAt && (
                            <span style={{ fontSize: 11, color: 'var(--green)', marginLeft: 'auto' }}>
                              Done {new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        {col.id !== 'DONE' && (
                          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                            {col.id === 'TODO'        && <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.65rem' }} onClick={() => moveTask(task.id, 'IN_PROGRESS')}>Start</button>}
                            {col.id === 'IN_PROGRESS' && <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.65rem' }} onClick={() => moveTask(task.id, 'REVIEW')}>Review</button>}
                            {col.id === 'REVIEW'      && <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.65rem', color: 'var(--green)' }} onClick={() => moveTask(task.id, 'DONE')}>Done</button>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}
                  onClick={() => openModal(col.id)}
                >
                  <Plus size={12} /> Add Task
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 480, maxWidth: '90vw', padding: '28px 32px', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)' }}>
              <X size={18} />
            </button>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 20 }}>Add Task</h2>
            <form onSubmit={saveTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="label">Task Title *</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. Follow up with ABC Roofing proposal"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="label">Priority</label>
                  <select className="input" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Priority }))}>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Status }))}>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="label">Assigned To</label>
                  <input
                    className="input"
                    placeholder="Team member name"
                    value={form.assignedTo}
                    onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                  />
                </div>
                <div className="input-group">
                  <label className="label">Due Date</label>
                  <input
                    className="input"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="label">Category</label>
                <select className="input" value={form.linkedType} onChange={(e) => setForm((f) => ({ ...f, linkedType: e.target.value }))}>
                  <option value="">None</option>
                  <option value="Client">Client</option>
                  <option value="Lead">Lead</option>
                  <option value="Internal">Internal</option>
                  <option value="System">System</option>
                </select>
              </div>
              <div className="input-group">
                <label className="label">Notes</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Optional details..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
