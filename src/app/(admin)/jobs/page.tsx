'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, ExternalLink, FileText, CheckCircle2,
  Clock, Star, Zap, Plus, X, ChevronDown,
} from 'lucide-react';

interface Job {
  id: string;
  company: string;
  role: string;
  type: number;
  status: string;
  salaryMin: number | null;
  salaryMax: number | null;
  location: string | null;
  isRemote: boolean;
  applyUrl: string | null;
  pdfFilename: string | null;
  notes: string | null;
  appliedAt: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<number, string> = {
  1: 'Creative',
  2: 'Marketing',
  3: 'Solutions',
  4: 'FDE / AI',
};

const TYPE_COLORS: Record<number, string> = {
  1: '#7C3AED',
  2: '#0891B2',
  3: '#059669',
  4: '#DC2626',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  building:  { label: 'Building',   color: '#B45309', icon: <Clock size={13} /> },
  ready:     { label: 'Ready',      color: '#15803D', icon: <CheckCircle2 size={13} /> },
  applied:   { label: 'Applied',    color: '#7C3AED', icon: <Zap size={13} /> },
  interview: { label: 'Interview',  color: '#0891B2', icon: <Star size={13} /> },
  offer:     { label: 'Offer',      color: '#B45309', icon: <Star size={13} /> },
  rejected:  { label: 'Rejected',   color: '#6B7280', icon: <X size={13} /> },
};

const STATUSES = ['building', 'ready', 'applied', 'interview', 'offer', 'rejected'];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<number | 'all'>('all');
  const [activeStatus, setActiveStatus] = useState<string | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    company: '', role: '', type: '4', status: 'building',
    salaryMin: '', salaryMax: '', location: '', isRemote: false,
    applyUrl: '', pdfFilename: '', notes: '',
  });

  const load = useCallback(async () => {
    const res = await fetch('/api/jobs');
    const data = await res.json();
    setJobs(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markApplied = async (job: Job) => {
    const now = new Date().toISOString();
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'applied', appliedAt: now }),
    });
    load();
  };

  const setStatus = async (job: Job, status: string) => {
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const deleteJob = async (id: string) => {
    if (!confirm('Remove this application?')) return;
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
    load();
  };

  const addJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        type: Number(form.type),
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
      }),
    });
    setForm({ company: '', role: '', type: '4', status: 'building', salaryMin: '', salaryMax: '', location: '', isRemote: false, applyUrl: '', pdfFilename: '', notes: '' });
    setShowAdd(false);
    setSaving(false);
    load();
  };

  const filtered = jobs.filter(j =>
    (activeType === 'all' || j.type === activeType) &&
    (activeStatus === 'all' || j.status === activeStatus)
  );

  const counts = {
    building:  jobs.filter(j => j.status === 'building').length,
    ready:     jobs.filter(j => j.status === 'ready').length,
    applied:   jobs.filter(j => j.status === 'applied').length,
    interview: jobs.filter(j => j.status === 'interview').length,
    offer:     jobs.filter(j => j.status === 'offer').length,
    rejected:  jobs.filter(j => j.status === 'rejected').length,
  };

  const pdfBase = '/files/resumes/';

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Briefcase size={22} /> Job Application Pipeline
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            {jobs.length} applications tracked · {counts.applied} submitted · {counts.interview} interviewing
          </p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
        >
          <Plus size={15} /> Add Job
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 24 }}>
        {STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s];
          const active = activeStatus === s;
          return (
            <button
              key={s}
              onClick={() => setActiveStatus(active ? 'all' : s)}
              style={{
                padding: '12px 10px', borderRadius: 10, border: `2px solid ${active ? cfg.color : 'var(--border)'}`,
                background: active ? `${cfg.color}18` : 'var(--card)', cursor: 'pointer', textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: cfg.color }}>{counts[s as keyof typeof counts]}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Type tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 1, 2, 3, 4] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            style={{
              padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: activeType === t ? (t === 'all' ? 'var(--accent)' : TYPE_COLORS[t]) : 'var(--card)',
              color: activeType === t ? '#fff' : 'var(--muted)',
            }}
          >
            {t === 'all' ? 'All Types' : `Type ${t}: ${TYPE_LABELS[t]}`}
            {t !== 'all' && (
              <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                {jobs.filter(j => j.type === t).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Add New Application</h3>
          <form onSubmit={addJob}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 140px', gap: 12, marginBottom: 12 }}>
              <input required placeholder="Company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
              <input required placeholder="Role / Title" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}>
                <option value="1">Type 1 — Creative</option>
                <option value="2">Type 2 — Marketing</option>
                <option value="3">Type 3 — Solutions</option>
                <option value="4">Type 4 — FDE/AI</option>
              </select>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <input placeholder="Min Salary" type="number" value={form.salaryMin} onChange={e => setForm(f => ({ ...f, salaryMin: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
              <input placeholder="Max Salary" type="number" value={form.salaryMax} onChange={e => setForm(f => ({ ...f, salaryMax: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
              <input placeholder="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
              <input placeholder="PDF filename (e.g. will-austin-haast.pdf)" value={form.pdfFilename} onChange={e => setForm(f => ({ ...f, pdfFilename: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 12 }}>
              <input placeholder="Apply URL" value={form.applyUrl} onChange={e => setForm(f => ({ ...f, applyUrl: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isRemote} onChange={e => setForm(f => ({ ...f, isRemote: e.target.checked }))} />
                Remote
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving}
                style={{ padding: '9px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Add Application'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                style={{ padding: '9px 16px', background: 'var(--card)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Job cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>Loading pipeline...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>No applications match this filter.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(job => {
            const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.building;
            const typeColor = TYPE_COLORS[job.type] ?? '#6B7280';
            return (
              <div key={job.id} style={{
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
                padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
                borderLeft: `4px solid ${typeColor}`,
              }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{job.company}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{job.role}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: typeColor,
                      background: `${typeColor}18`, borderRadius: 5, padding: '3px 8px' }}>
                      T{job.type}
                    </span>
                    <button onClick={() => deleteJob(job.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {job.salaryMin && job.salaryMax && (
                    <span style={{ fontSize: 12, color: 'var(--text)' }}>
                      ${(job.salaryMin / 1000).toFixed(0)}K–${(job.salaryMax / 1000).toFixed(0)}K
                    </span>
                  )}
                  {job.location && (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {job.location}{job.isRemote && ' · Remote'}
                    </span>
                  )}
                  {!job.location && job.isRemote && (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Remote</span>
                  )}
                </div>

                {/* Status + status changer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
                    color: cfg.color, background: `${cfg.color}18`, borderRadius: 20, padding: '4px 10px',
                  }}>
                    {cfg.icon} {cfg.label}
                  </span>
                  <div style={{ position: 'relative', marginLeft: 'auto' }}>
                    <select
                      value={job.status}
                      onChange={e => setStatus(job, e.target.value)}
                      style={{ padding: '5px 24px 5px 9px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'var(--bg)', color: 'var(--text)', fontSize: 12, cursor: 'pointer',
                        appearance: 'none', WebkitAppearance: 'none' }}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted)' }} />
                  </div>
                </div>

                {/* Applied date */}
                {job.appliedAt && (
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Applied {new Date(job.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {job.status !== 'applied' && job.status !== 'interview' && job.status !== 'offer' && job.status !== 'rejected' && (
                    <button
                      onClick={() => markApplied(job)}
                      style={{ flex: 1, padding: '8px 0', background: '#7C3AED', color: '#fff', border: 'none',
                        borderRadius: 7, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <CheckCircle2 size={13} /> Mark Applied
                    </button>
                  )}
                  {job.pdfFilename && (
                    <a
                      href={`${pdfBase}${job.pdfFilename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ flex: job.status === 'applied' || job.status === 'interview' || job.status === 'offer' || job.status === 'rejected' ? 1 : 0,
                        padding: '8px 12px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)',
                        borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
                    >
                      <FileText size={13} /> View PDF
                    </a>
                  )}
                  {job.applyUrl && (
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: '8px 12px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)',
                        borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>

                {job.notes && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    {job.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
