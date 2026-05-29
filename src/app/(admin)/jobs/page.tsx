'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, ExternalLink, FileText, CheckCircle2,
  Clock, Star, Zap, Plus, X, ChevronDown, Search,
  MapPin, DollarSign, Calendar, RefreshCw, TrendingUp,
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
  matchScore: number | null;
  tags: string[];
  postedDate: string | null;
  companyStage: string | null;
}

const TYPE_LABELS: Record<number, string> = {
  1: 'Creative',
  2: 'Marketing',
  3: 'Solutions / SE / CSM',
  4: 'FDE / AI Eng',
  5: 'Eng On-Ramp',
  6: 'DevRel / Growth',
  7: 'Domain Vertical',
};

const TYPE_SUBLABELS: Record<number, string> = {
  1: 'Design, social, brand',
  2: 'Marketing mgr, director',
  3: 'Solutions Eng, TAM, CSM, Implementation, TPM',
  4: 'Forward Deployed, Applied AI, AI Automation',
  5: 'Full Stack, Senior Eng, Backend AI',
  6: 'DevRel, Developer Advocate, Growth Eng, Founding',
  7: 'Hospitality Tech, Sports / Gaming Tech',
};

const TYPE_COLORS: Record<number, string> = {
  1: '#7C3AED',
  2: '#0891B2',
  3: '#059669',
  4: '#DC2626',
  5: '#D97706',
  6: '#EA580C',
  7: '#0F766E',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  building:  { label: 'Evaluating',     color: '#B45309', icon: <Clock size={13} /> },
  ready:     { label: 'Qualified',      color: '#15803D', icon: <CheckCircle2 size={13} /> },
  applied:   { label: 'Proposal Sent',  color: '#7C3AED', icon: <Zap size={13} /> },
  interview: { label: 'Discovery Call', color: '#0891B2', icon: <Star size={13} /> },
  offer:     { label: 'Contracted',     color: '#B45309', icon: <Star size={13} /> },
  rejected:  { label: 'Passed',         color: '#6B7280', icon: <X size={13} /> },
};

const STATUSES = ['building', 'ready', 'applied', 'interview', 'offer', 'rejected'];

const pdfBase = '/files/resumes/';

function calcPriorityScore(job: Job): number {
  let score = 0;

  // Role fit match score (0-35 pts)
  score += ((job.matchScore ?? 65) / 100) * 35;

  // Remote (0 or 15 pts)
  if (job.isRemote) score += 15;

  // Salary tier (0-15 pts)
  const minSal = job.salaryMin ?? 0;
  if (minSal >= 130000) score += 15;
  else if (minSal >= 110000) score += 10;
  else if (minSal >= 90000) score += 5;
  else if (minSal > 0) score += 2;

  // Company stage (0-10 pts) — startups hire faster
  if (job.companyStage === 'startup') score += 10;
  else if (job.companyStage === 'growth') score += 6;
  else if (job.companyStage === 'enterprise') score += 2;

  // Listing recency (0-10 pts)
  if (job.postedDate) {
    const days = (Date.now() - new Date(job.postedDate).getTime()) / 86400000;
    if (days <= 3) score += 10;
    else if (days <= 7) score += 8;
    else if (days <= 14) score += 4;
    else if (days <= 30) score += 1;
  } else {
    score += 3;
  }

  // Domain tag bonus (0-8 pts)
  const valueTags = new Set(['ai', 'devrel', 'hospitality', 'sports', 'gaming', 'startup', 'edtech']);
  const tagHits = (job.tags ?? []).filter(t => valueTags.has(t)).length;
  score += Math.min(tagHits * 3, 8);

  // Type tier bonus
  if (job.type === 4) score += 5;
  else if (job.type === 6) score += 4;
  else if (job.type === 3) score += 3;

  return Math.round(Math.min(score, 100));
}

function scoreColor(score: number): string {
  if (score >= 80) return '#15803D';
  if (score >= 65) return '#0891B2';
  if (score >= 50) return '#D97706';
  return '#6B7280';
}

function salaryPts(salaryMin: number | null): string {
  if (!salaryMin) return '+0';
  if (salaryMin >= 130000) return '+15';
  if (salaryMin >= 110000) return '+10';
  if (salaryMin >= 90000) return '+5';
  return '+2';
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<number | 'all'>('all');
  const [activeStatus, setActiveStatus] = useState<string | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'status' | 'salary' | 'recent'>('priority');
  const [groupByType, setGroupByType] = useState(false);
  const [hideApplied, setHideApplied] = useState(false);

  const [form, setForm] = useState({
    company: '', role: '', type: '4', status: 'building',
    salaryMin: '', salaryMax: '', location: '', isRemote: false,
    applyUrl: '', pdfFilename: '', notes: '',
    matchScore: '', tags: '', companyStage: '',
  });

  const load = useCallback(async () => {
    const res = await fetch('/api/jobs');
    const data = await res.json();
    setJobs(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selectedJob) {
      const updated = jobs.find(j => j.id === selectedJob.id);
      if (updated) setSelectedJob(updated);
    }
  }, [jobs]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!confirm('Remove this prospect?')) return;
    if (selectedJob?.id === id) setSelectedJob(null);
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
        matchScore: form.matchScore ? Number(form.matchScore) : null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        companyStage: form.companyStage || null,
      }),
    });
    setForm({ company: '', role: '', type: '4', status: 'building', salaryMin: '', salaryMax: '', location: '', isRemote: false, applyUrl: '', pdfFilename: '', notes: '', matchScore: '', tags: '', companyStage: '' });
    setShowAdd(false);
    setSaving(false);
    load();
  };

  const runSearch = async () => {
    setSearching(true);
    try {
      const res = await fetch('/api/jobs/search', { method: 'POST' });
      const data = await res.json();
      if (data.added > 0) {
        load();
        alert(`Search complete — ${data.added} new prospect${data.added > 1 ? 's' : ''} added.`);
      } else {
        alert(data.message ?? 'No new prospects found. Check search config.');
      }
    } catch {
      alert('Search failed. Check your API configuration.');
    }
    setSearching(false);
  };

  const STATUS_ORDER: Record<string, number> = {
    interview: 0, applied: 1, ready: 2, building: 3, offer: 4, rejected: 5,
  };

  const sorted = [...jobs].sort((a, b) => {
    if (sortBy === 'priority') return calcPriorityScore(b) - calcPriorityScore(a);
    if (sortBy === 'salary')   return (b.salaryMax ?? 0) - (a.salaryMax ?? 0);
    if (sortBy === 'recent')   return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
  });

  const filtered = sorted.filter(j =>
    (activeType === 'all' || j.type === activeType) &&
    (activeStatus === 'all' || j.status === activeStatus) &&
    (!hideApplied || !['applied', 'rejected'].includes(j.status))
  );

  const counts = {
    building:  jobs.filter(j => j.status === 'building').length,
    ready:     jobs.filter(j => j.status === 'ready').length,
    applied:   jobs.filter(j => j.status === 'applied').length,
    interview: jobs.filter(j => j.status === 'interview').length,
    offer:     jobs.filter(j => j.status === 'offer').length,
    rejected:  jobs.filter(j => j.status === 'rejected').length,
  };

  const renderCard = (job: Job) => {
    const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.building;
    const typeColor = TYPE_COLORS[job.type] ?? '#6B7280';
    const pScore = calcPriorityScore(job);
    const pColor = scoreColor(pScore);

    return (
      <div
        key={job.id}
        onClick={() => setSelectedJob(job)}
        style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
          padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
          borderLeft: `4px solid ${typeColor}`, cursor: 'pointer',
          transition: 'box-shadow 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)';
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          (e.currentTarget as HTMLDivElement).style.transform = 'none';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{job.company}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{job.role}</div>
          </div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
            <span style={{
              fontSize: 12, fontWeight: 800, color: pColor,
              background: `${pColor}18`, borderRadius: 6, padding: '3px 7px',
              display: 'flex', alignItems: 'center', gap: 3, border: `1px solid ${pColor}30`,
            }}>
              <TrendingUp size={10} /> {pScore}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: typeColor,
              background: `${typeColor}18`, borderRadius: 5, padding: '3px 8px' }}>
              {TYPE_LABELS[job.type] ?? `T${job.type}`}
            </span>
            <button
              onClick={e => { e.stopPropagation(); deleteJob(job.id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {job.salaryMin && job.salaryMax && (
            <span style={{ fontSize: 12, color: '#15803D', fontWeight: 600 }}>
              ${(job.salaryMin / 1000).toFixed(0)}K&ndash;${(job.salaryMax / 1000).toFixed(0)}K
            </span>
          )}
          {job.isRemote && !job.location && (
            <span style={{ fontSize: 12, color: '#0891B2', fontWeight: 600 }}>Remote</span>
          )}
          {job.location && (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {job.location}{job.isRemote ? ' · Remote' : ''}
            </span>
          )}
          {job.companyStage && (
            <span style={{
              fontSize: 11, borderRadius: 4, padding: '1px 6px', fontWeight: 600, textTransform: 'capitalize',
              color: job.companyStage === 'startup' ? '#EA580C' : job.companyStage === 'growth' ? '#7C3AED' : '#6B7280',
              background: job.companyStage === 'startup' ? '#EA580C18' : job.companyStage === 'growth' ? '#7C3AED18' : '#6B728018',
            }}>
              {job.companyStage}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
            color: cfg.color, background: `${cfg.color}18`, borderRadius: 20, padding: '4px 10px',
          }}>
            {cfg.icon} {cfg.label}
          </span>
          <button
            onClick={e => { e.stopPropagation(); setExpandedJobId(expandedJobId === job.id ? null : job.id); }}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)', fontSize: 11, padding: '2px 4px', borderRadius: 4 }}
          >
            Details <ChevronDown size={13} style={{ transition: 'transform 0.2s', transform: expandedJobId === job.id ? 'rotate(180deg)' : 'none' }} />
          </button>
        </div>

        {job.appliedAt && (
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Sent {new Date(job.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }} onClick={e => e.stopPropagation()}>
          {job.applyUrl && (
            <a href={job.applyUrl} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, padding: '8px 0', background: '#15803D', color: '#fff', border: 'none',
                borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
            >
              <ExternalLink size={13} /> Apply
            </a>
          )}
          {job.pdfFilename && (
            <a href={`${pdfBase}${job.pdfFilename}`} target="_blank" rel="noopener noreferrer"
              style={{ padding: '8px 12px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)',
                borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
            >
              <FileText size={13} /> PDF
            </a>
          )}
          {!['applied','interview','offer','rejected'].includes(job.status) && (
            <button onClick={() => markApplied(job)}
              style={{ padding: '8px 12px', background: '#7C3AED', color: '#fff', border: 'none',
                borderRadius: 7, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <CheckCircle2 size={13} />
            </button>
          )}
        </div>

        {expandedJobId === job.id && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}
            onClick={e => e.stopPropagation()}>
            {/* Score breakdown */}
            <div style={{ background: `${pColor}0d`, border: `1px solid ${pColor}30`, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.06em' }}>
                Priority Score Breakdown
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11 }}><span style={{ color: 'var(--muted)' }}>Fit: </span><strong>{Math.round(((job.matchScore ?? 65) / 100) * 35)}/35</strong></span>
                <span style={{ fontSize: 11 }}><span style={{ color: 'var(--muted)' }}>Remote: </span><strong>{job.isRemote ? '+15' : '+0'}</strong></span>
                <span style={{ fontSize: 11 }}><span style={{ color: 'var(--muted)' }}>Salary: </span><strong>{salaryPts(job.salaryMin)}</strong></span>
                <span style={{ fontSize: 11 }}><span style={{ color: 'var(--muted)' }}>Stage: </span><strong>{job.companyStage === 'startup' ? '+10' : job.companyStage === 'growth' ? '+6' : job.companyStage === 'enterprise' ? '+2' : '—'}</strong></span>
                <span style={{ fontSize: 13, fontWeight: 900, color: pColor, marginLeft: 'auto' }}>{pScore}/100</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2, letterSpacing: '0.06em' }}>Category</div>
                <div style={{ fontSize: 12, color: typeColor, fontWeight: 600 }}>{TYPE_LABELS[job.type] ?? 'Unknown'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2, letterSpacing: '0.06em' }}>Salary</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: job.salaryMin ? 'var(--text)' : 'var(--muted)' }}>
                  {job.salaryMin && job.salaryMax ? `$${(job.salaryMin / 1000).toFixed(0)}K–$${(job.salaryMax / 1000).toFixed(0)}K` : 'Not listed'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2, letterSpacing: '0.06em' }}>Location</div>
                <div style={{ fontSize: 12, color: 'var(--text)' }}>
                  {job.location ? (job.isRemote ? `${job.location} · Remote` : job.location) : job.isRemote ? 'Remote' : 'On-site'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2, letterSpacing: '0.06em' }}>Stage</div>
                <div style={{ fontSize: 12, color: 'var(--text)', textTransform: 'capitalize' }}>{job.companyStage ?? 'Unknown'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {job.isRemote && <span style={{ fontSize: 10, background: '#0EA5E918', color: '#0EA5E9', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>Remote</span>}
              {job.salaryMax !== null && job.salaryMax >= 150000 && <span style={{ fontSize: 10, background: '#22C55E18', color: '#22C55E', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>$150K+</span>}
              {/clearance|secret|top.?secret/i.test(job.notes ?? '') && <span style={{ fontSize: 10, background: '#EF444418', color: '#EF4444', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>Clearance Req</span>}
              {/ai|machine.?learning|llm|openai|anthropic|langchain|gpt/i.test(job.notes ?? '') && <span style={{ fontSize: 10, background: '#8B5CF618', color: '#8B5CF6', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>AI Focus</span>}
              {/enterprise|fortune|b2b/i.test(job.notes ?? '') && <span style={{ fontSize: 10, background: '#F59E0B18', color: '#F59E0B', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>Enterprise</span>}
              {/degree|bachelor|master|phd/i.test(job.notes ?? '') && <span style={{ fontSize: 10, background: '#64748B18', color: '#64748B', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>Degree Req</span>}
              {(job.tags ?? []).map(tag => (
                <span key={tag} style={{ fontSize: 10, background: '#7C3AED18', color: '#7C3AED', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>#{tag}</span>
              ))}
            </div>
            {job.notes && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4, letterSpacing: '0.06em' }}>Notes</div>
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.65, opacity: 0.85 }}>
                  {job.notes.length > 280 ? job.notes.slice(0, 280) + '...' : job.notes}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Detail drawer */}
      {selectedJob && (() => {
        const pScore = calcPriorityScore(selectedJob);
        const pColor = scoreColor(pScore);
        const recencyPts = selectedJob.postedDate
          ? (() => { const d = (Date.now() - new Date(selectedJob.postedDate).getTime()) / 86400000; return d <= 3 ? '+10' : d <= 7 ? '+8' : d <= 14 ? '+4' : d <= 30 ? '+1' : '+0'; })()
          : 'Unknown';
        return (
          <>
            <div onClick={() => setSelectedJob(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, backdropFilter: 'blur(2px)' }} />
            <div style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: 440,
              background: 'var(--card)', borderLeft: '1px solid var(--border)',
              zIndex: 101, overflowY: 'auto', padding: 28,
              display: 'flex', flexDirection: 'column', gap: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                    color: TYPE_COLORS[selectedJob.type], background: `${TYPE_COLORS[selectedJob.type]}18`,
                    borderRadius: 5, padding: '3px 8px', display: 'inline-block', marginBottom: 8,
                  }}>
                    Type {selectedJob.type} &mdash; {TYPE_LABELS[selectedJob.type]}
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{selectedJob.company}</div>
                  <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>{selectedJob.role}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                  <div style={{
                    fontSize: 26, fontWeight: 900, color: pColor,
                    background: `${pColor}12`, border: `1px solid ${pColor}30`,
                    borderRadius: 10, padding: '8px 14px', textAlign: 'center', lineHeight: 1,
                  }}>
                    {pScore}
                    <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority</div>
                  </div>
                  <button onClick={() => setSelectedJob(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Score breakdown */}
              <div style={{ background: `${pColor}08`, border: `1px solid ${pColor}25`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8, letterSpacing: '0.06em' }}>Score Breakdown</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['Role Fit', `${Math.round(((selectedJob.matchScore ?? 65) / 100) * 35)}/35`],
                    ['Remote', selectedJob.isRemote ? '+15' : '+0'],
                    ['Salary Tier', salaryPts(selectedJob.salaryMin)],
                    ['Stage', selectedJob.companyStage === 'startup' ? '+10' : selectedJob.companyStage === 'growth' ? '+6' : selectedJob.companyStage === 'enterprise' ? '+2' : '—'],
                    ['Recency', recencyPts],
                    ['Tier Bonus', selectedJob.type === 4 ? '+5' : selectedJob.type === 6 ? '+4' : selectedJob.type === 3 ? '+3' : '+0'],
                  ].map(([label, val]) => (
                    <div key={label} style={{ fontSize: 12 }}>
                      <span style={{ color: 'var(--muted)' }}>{label}: </span>
                      <span style={{ fontWeight: 700 }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meta pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedJob.salaryMin && selectedJob.salaryMax && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '5px 12px' }}>
                    <DollarSign size={13} style={{ color: '#15803D' }} />
                    ${(selectedJob.salaryMin / 1000).toFixed(0)}K &ndash; ${(selectedJob.salaryMax / 1000).toFixed(0)}K
                  </span>
                )}
                {(selectedJob.location || selectedJob.isRemote) && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '5px 12px' }}>
                    <MapPin size={13} style={{ color: '#0891B2' }} />
                    {selectedJob.location ?? ''}{selectedJob.isRemote ? (selectedJob.location ? ' · Remote' : 'Remote') : ''}
                  </span>
                )}
                {selectedJob.companyStage && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '5px 12px', textTransform: 'capitalize' }}>
                    {selectedJob.companyStage}
                  </span>
                )}
              </div>

              {/* Status row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600,
                  color: (STATUS_CONFIG[selectedJob.status] ?? STATUS_CONFIG.building).color,
                  background: `${(STATUS_CONFIG[selectedJob.status] ?? STATUS_CONFIG.building).color}18`,
                  borderRadius: 20, padding: '5px 12px',
                }}>
                  {(STATUS_CONFIG[selectedJob.status] ?? STATUS_CONFIG.building).icon}
                  {(STATUS_CONFIG[selectedJob.status] ?? STATUS_CONFIG.building).label}
                </span>
                <div style={{ position: 'relative', marginLeft: 'auto' }}>
                  <select
                    value={selectedJob.status}
                    onChange={e => setStatus(selectedJob, e.target.value)}
                    style={{ padding: '6px 28px 6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted)' }} />
                </div>
              </div>

              {selectedJob.appliedAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
                  <Calendar size={13} />
                  Proposal sent {new Date(selectedJob.appliedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              )}

              {(selectedJob.tags ?? []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedJob.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 11, background: '#7C3AED18', color: '#7C3AED', borderRadius: 6, padding: '3px 9px', fontWeight: 600 }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {selectedJob.notes && (
                <div style={{ fontSize: 13, color: 'var(--text)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', lineHeight: 1.6 }}>
                  {selectedJob.notes}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
                {selectedJob.applyUrl && (
                  <a href={selectedJob.applyUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', background: '#15803D', color: '#fff', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none', letterSpacing: 0.3 }}>
                    <ExternalLink size={16} /> Go Apply
                  </a>
                )}
                {selectedJob.pdfFilename && (
                  <a href={`${pdfBase}${selectedJob.pdfFilename}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
                    <FileText size={16} /> View PDF Application
                  </a>
                )}
                {!['applied','interview','offer','rejected'].includes(selectedJob.status) && (
                  <button onClick={() => markApplied(selectedJob)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    <CheckCircle2 size={15} /> Mark Proposal Sent
                  </button>
                )}
                <button onClick={() => deleteJob(selectedJob.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', background: 'none', color: '#EF4444', border: '1px solid #EF444440', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>
                  <X size={14} /> Remove Prospect
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Briefcase size={22} /> Job Pipeline
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            {jobs.length} tracked &middot; {counts.applied} applied &middot; {counts.interview} in discovery &middot; {counts.ready} ready to apply
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}
          >
            <option value="priority">Sort: Priority Score</option>
            <option value="status">Sort: By Status</option>
            <option value="salary">Sort: By Salary</option>
            <option value="recent">Sort: Most Recent</option>
          </select>
          <button
            onClick={() => setHideApplied(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px',
              background: hideApplied ? '#15803D' : 'var(--card)',
              color: hideApplied ? '#fff' : 'var(--text)',
              border: `1px solid ${hideApplied ? '#15803D' : 'var(--border)'}`,
              borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            <CheckCircle2 size={14} /> Not Applied
          </button>
          <button
            onClick={() => setGroupByType(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px',
              background: groupByType ? 'var(--accent)' : 'var(--card)',
              color: groupByType ? '#fff' : 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            Group by Tier
          </button>
          <button
            onClick={runSearch}
            disabled={searching}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
              background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)',
              borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
              opacity: searching ? 0.6 : 1,
            }}
          >
            {searching ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={15} />}
            {searching ? 'Searching...' : 'Search Now'}
          </button>
          <button
            onClick={() => setShowAdd(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            <Plus size={15} /> Add Prospect
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 24 }}>
        {STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s];
          const active = activeStatus === s;
          return (
            <button key={s} onClick={() => setActiveStatus(active ? 'all' : s)}
              style={{ padding: '12px 10px', borderRadius: 10, border: `2px solid ${active ? cfg.color : 'var(--border)'}`, background: active ? `${cfg.color}18` : 'var(--card)', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: cfg.color }}>{counts[s as keyof typeof counts]}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Type tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveType('all')}
          style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: activeType === 'all' ? 'var(--accent)' : 'var(--card)', color: activeType === 'all' ? '#fff' : 'var(--muted)' }}>
          All Types
        </button>
        {([4, 3, 5, 6, 7, 2, 1] as const).map(t => {
          const active = activeType === t;
          const count = jobs.filter(j => j.type === t).length;
          if (count === 0 && !active) return null;
          return (
            <button key={t} onClick={() => setActiveType(active ? 'all' : t)}
              style={{
                padding: '7px 14px', borderRadius: 20, border: `2px solid ${active ? TYPE_COLORS[t] : 'var(--border)'}`,
                cursor: 'pointer', fontWeight: 600, fontSize: 12,
                background: active ? TYPE_COLORS[t] : 'var(--card)',
                color: active ? '#fff' : 'var(--muted)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span>{TYPE_LABELS[t]}</span>
                {!active && <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>{TYPE_SUBLABELS[t]}</span>}
              </span>
              <span style={{ background: active ? 'rgba(255,255,255,0.3)' : `${TYPE_COLORS[t]}20`, color: active ? '#fff' : TYPE_COLORS[t], borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Add New Prospect</h3>
          <form onSubmit={addJob}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px 140px', gap: 12, marginBottom: 12 }}>
              <input required placeholder="Company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
              <input required placeholder="Role / Title" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}>
                <option value="4">T4 &mdash; FDE / AI Eng</option>
                <option value="3">T3 &mdash; Solutions / SE / CSM</option>
                <option value="5">T5 &mdash; Eng On-Ramp</option>
                <option value="6">T6 &mdash; DevRel / Growth</option>
                <option value="7">T7 &mdash; Domain Vertical</option>
                <option value="2">T2 &mdash; Marketing</option>
                <option value="1">T1 &mdash; Creative</option>
              </select>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <input placeholder="Min Salary" type="number" value={form.salaryMin} onChange={e => setForm(f => ({ ...f, salaryMin: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
              <input placeholder="Max Salary" type="number" value={form.salaryMax} onChange={e => setForm(f => ({ ...f, salaryMax: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
              <input placeholder="Match Score (0-100)" type="number" value={form.matchScore} onChange={e => setForm(f => ({ ...f, matchScore: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
              <input placeholder="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
              <select value={form.companyStage} onChange={e => setForm(f => ({ ...f, companyStage: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}>
                <option value="">Stage (unknown)</option>
                <option value="startup">Startup</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 12 }}>
              <input placeholder="PDF filename" value={form.pdfFilename} onChange={e => setForm(f => ({ ...f, pdfFilename: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
              <input placeholder="Apply URL" value={form.applyUrl} onChange={e => setForm(f => ({ ...f, applyUrl: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
              <input placeholder="Tags (ai, startup, sports...)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={form.isRemote} onChange={e => setForm(f => ({ ...f, isRemote: e.target.checked }))} />
                Remote
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving}
                style={{ padding: '9px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Add Prospect'}
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
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>No prospects match this filter.</div>
      ) : groupByType ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {([4, 3, 6, 5, 7, 2, 1] as const).map(typeNum => {
            const tierJobs = filtered.filter(j => j.type === typeNum);
            if (tierJobs.length === 0) return null;
            const tierColor = TYPE_COLORS[typeNum];
            return (
              <div key={typeNum}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, borderBottom: `2px solid ${tierColor}`, paddingBottom: 10 }}>
                  <span style={{ background: tierColor, color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {TYPE_LABELS[typeNum]}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{TYPE_SUBLABELS[typeNum]}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: tierColor }}>
                    {tierJobs.length} {tierJobs.length === 1 ? 'role' : 'roles'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                  {tierJobs.map(job => renderCard(job))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(job => renderCard(job))}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
