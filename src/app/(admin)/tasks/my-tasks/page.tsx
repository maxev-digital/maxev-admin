'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Check, Plus, X } from 'lucide-react';

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

const PRIORITY_BADGE: Record<Priority, string> = {
  URGENT: 'badge badge-red', HIGH: 'badge badge-red', MEDIUM: 'badge badge-orange', LOW: 'badge badge-gray',
};

const LINKED_BADGE: Record<string, string> = {
  Lead: 'badge badge-purple', Client: 'badge badge-blue', System: 'badge badge-gray', Internal: 'badge badge-green',
};

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'TODO',        label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'REVIEW',      label: 'Review' },
  { value: 'DONE',        label: 'Done' },
];

type SortMode = 'due' | 'priority';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function weekEndStr() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function isOverdue(due: string | null, status: Status): boolean {
  if (!due || status === 'DONE') return false;
  return due < todayStr();
}

function isDueToday(due: string | null): boolean {
  if (!due) return false;
  return due.slice(0, 10) === todayStr();
}

function isDueThisWeek(due: string | null): boolean {
  if (!due) return false;
  const d = due.slice(0, 10);
  return d > todayStr() && d <= weekEndStr();
}

function formatDue(due: string | null): string {
  if (!due) return '';
  return new Date(due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type Group = { label: string; tasks: Task[] };

interface AddTaskForm {
  title: string; priority: Priority; assignedTo: string; dueDate: string; linkedType: string; notes: string;
}
const BLANK: AddTaskForm = { title: '', priority: 'MEDIUM', assignedTo: '', dueDate: '', linkedType: '', notes: '' };

export default function MyTasksPage() {
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort]       = useState<SortMode>('due');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]       = useState<AddTaskForm>(BLANK);
  const [saving, setSaving]   = useState(false);

  useEffect(() => { loadTasks(); }, []);

  function loadTasks() {
    setLoading(true);
    fetch('/api/tasks')
      .then((r) => r.json())
      .then(async (data: Task[]) => {
        setTasks(data);
        setLoading(false);
        // Auto-score tasks without URGENT priority that aren't done
        const unscored = data.filter((t) => t.status !== 'DONE' && t.priority !== 'HIGH');
        if (unscored.length) {
          try {
            const res    = await fetch('/api/ai/score-tasks', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskIds: unscored.map((t) => t.id) }),
            });
            const scored: Array<{ id: string; priority: Priority }> = await res.json();
            setTasks((prev) => prev.map((t) => {
              const s = scored.find((s) => s.id === t.id);
              return s ? { ...t, priority: s.priority } : t;
            }));
          } catch { /* keep original priorities */ }
        }
      })
      .catch(() => setLoading(false));
  }

  async function updateStatus(id: string, status: Status) {
    const body: Partial<Task> = { status };
    const res     = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function markDone(id: string) {
    await updateStatus(id, 'DONE');
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function saveTask(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title:      form.title.trim(),
      priority:   form.priority,
      status:     'TODO' as Status,
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
      setForm(BLANK);
    } finally {
      setSaving(false);
    }
  }

  const today = todayStr();

  const sorted = [...tasks].sort((a, b) => {
    if (sort === 'priority') {
      const pOrder: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      if (a.status === 'DONE' && b.status !== 'DONE') return 1;
      if (b.status === 'DONE' && a.status !== 'DONE') return -1;
      return pOrder[a.priority] - pOrder[b.priority];
    }
    if (a.status === 'DONE' && b.status !== 'DONE') return 1;
    if (b.status === 'DONE' && a.status !== 'DONE') return -1;
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const groups: Group[] = sort === 'due'
    ? [
        { label: 'Overdue',        tasks: sorted.filter((t) => isOverdue(t.dueDate, t.status)) },
        { label: 'Due Today',      tasks: sorted.filter((t) => isDueToday(t.dueDate) && t.status !== 'DONE') },
        { label: 'Due This Week',  tasks: sorted.filter((t) => isDueThisWeek(t.dueDate) && t.status !== 'DONE') },
        { label: 'Later',          tasks: sorted.filter((t) => t.dueDate && t.dueDate.slice(0, 10) > weekEndStr() && t.status !== 'DONE') },
        { label: 'No Due Date',    tasks: sorted.filter((t) => !t.dueDate && t.status !== 'DONE') },
        { label: 'Completed',      tasks: sorted.filter((t) => t.status === 'DONE') },
      ].filter((g) => g.tasks.length > 0)
    : [
        { label: 'HIGH Priority',   tasks: sorted.filter((t) => t.priority === 'HIGH' && t.status !== 'DONE') },
        { label: 'MEDIUM Priority', tasks: sorted.filter((t) => t.priority === 'MEDIUM' && t.status !== 'DONE') },
        { label: 'LOW Priority',    tasks: sorted.filter((t) => t.priority === 'LOW' && t.status !== 'DONE') },
        { label: 'Completed',       tasks: sorted.filter((t) => t.status === 'DONE') },
      ].filter((g) => g.tasks.length > 0);

  const kpi = {
    total:    tasks.filter((t) => t.status !== 'DONE').length,
    dueToday: tasks.filter((t) => isDueToday(t.dueDate) && t.status !== 'DONE').length,
    overdue:  tasks.filter((t) => isOverdue(t.dueDate, t.status)).length,
    done:     tasks.filter((t) => t.status === 'DONE').length,
  };

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100 }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-sub">Flat list view — all active tasks</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${sort === 'due' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSort('due')}>Sort by Due Date</button>
          <button className={`btn btn-sm ${sort === 'priority' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSort('priority')}>
            <Sparkles size={13} /> Sort by Priority
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm(BLANK); setShowModal(true); }}>
            <Plus size={13} /> Add Task
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Open Tasks',  value: kpi.total,    cls: 'kpi-value' },
          { label: 'Due Today',   value: kpi.dueToday, cls: 'kpi-value' },
          { label: 'Overdue',     value: kpi.overdue,  cls: 'kpi-value-orange' },
          { label: 'Completed',   value: kpi.done,     cls: 'kpi-value-green' },
        ].map((k) => (
          <div key={k.label} className="card" style={{ padding: '20px 24px' }}>
            <div className={k.cls}>{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--gray)', fontSize: '0.88rem' }}>Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--light)', marginBottom: 6 }}>No tasks yet</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--gray)', marginBottom: 16 }}>Add your first task to get started.</div>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm(BLANK); setShowModal(true); }}><Plus size={12} /> Add Task</button>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.label} style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: group.label === 'Overdue' ? '#f87171' : 'var(--gray)',
              marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border)',
            }}>
              {group.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.tasks.map((task) => {
                const overdue = isOverdue(task.dueDate, task.status);
                const done    = task.status === 'DONE';
                return (
                  <div key={task.id} className="card" style={{
                    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
                    borderLeft: overdue ? '3px solid #ef4444' : done ? '3px solid var(--green)' : '3px solid transparent',
                    opacity: done ? 0.6 : 1,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', flex: 1, textDecoration: done ? 'line-through' : 'none' }}>
                      {task.title}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span className={PRIORITY_BADGE[task.priority]}>{task.priority}</span>
                      {task.linkedType && <span className={LINKED_BADGE[task.linkedType] ?? 'badge badge-gray'}>{task.linkedType}</span>}
                      {task.assignedTo && <span style={{ fontSize: 11, color: 'var(--gray)' }}>{task.assignedTo}</span>}
                      {task.dueDate && (
                        <span style={{ fontSize: 11, color: overdue ? '#f87171' : 'var(--gray)', minWidth: 60, textAlign: 'right' }}>
                          {formatDue(task.dueDate)}
                        </span>
                      )}
                      <select
                        value={task.status}
                        onChange={(e) => updateStatus(task.id, e.target.value as Status)}
                        className="input"
                        style={{ fontSize: 11, padding: '4px 8px', width: 120 }}
                      >
                        {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      {!done && (
                        <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: 'var(--green)' }} onClick={() => markDone(task.id)} title="Mark complete">
                          <Check size={14} />
                        </button>
                      )}
                      <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', padding: '4px' }}>
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
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
                <input className="input" required placeholder="What needs to be done?" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
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
                  <label className="label">Due Date</label>
                  <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="label">Assigned To</label>
                  <input className="input" placeholder="Team member" value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} />
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
              </div>
              <div className="input-group">
                <label className="label">Notes</label>
                <textarea className="input" rows={3} placeholder="Optional details..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
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
