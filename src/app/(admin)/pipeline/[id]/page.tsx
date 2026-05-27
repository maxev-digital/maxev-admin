'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building2, User, Mail, Phone, Globe, MapPin,
  DollarSign, Tag, Calendar, Clock, FileText, Save,
  ChevronRight, Activity, MoreHorizontal, Edit2, Check, X,
  Flame, Thermometer, Snowflake,
} from 'lucide-react';

type ActivityLog = {
  id: string;
  type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type OutreachHistory = {
  id: string;
  channel: string;
  subject: string | null;
  status: string;
  createdAt: string;
};

type Lead = {
  id: string;
  businessName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string;
  city: string | null;
  state: string | null;
  source: string | null;
  presenceScore: number | null;
  packageInterest: string | null;
  estimatedValue: number | null;
  stage: string;
  priority: string;
  notes: string | null;
  demoDate: string | null;
  googleCalendarEventId: string | null;
  createdAt: string;
  updatedAt: string;
  activities: ActivityLog[];
  outreachHistory: OutreachHistory[];
};

const STAGES = [
  { key: 'LEAD',            label: 'Lead',            color: 'var(--gray)' },
  { key: 'DEMO_SCHEDULED',  label: 'Demo Scheduled',  color: 'var(--primary)' },
  { key: 'PROPOSAL_SENT',   label: 'Proposal Sent',   color: 'var(--orange)' },
  { key: 'CONTRACT_SIGNED', label: 'Contract Signed', color: 'var(--green)' },
  { key: 'IN_DEV',          label: 'In Dev',          color: '#8B5CF6' },
  { key: 'REVIEW',          label: 'Review',          color: 'var(--orange)' },
  { key: 'LIVE',            label: 'Live',            color: 'var(--green)' },
  { key: 'ON_RETAINER',     label: 'On Retainer',     color: 'var(--green)' },
  { key: 'DEAD',            label: 'Dead',            color: 'var(--red)' },
];

const PRIORITIES = [
  { key: 'HOT',  label: 'Hot',  icon: Flame,       color: 'var(--red)' },
  { key: 'WARM', label: 'Warm', icon: Thermometer, color: 'var(--orange)' },
  { key: 'COLD', label: 'Cold', icon: Snowflake,   color: 'var(--primary)' },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const timeAgo = (s: string) => {
  const diff = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [lead, setLead]         = useState<Lead | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Edit states
  const [editNotes, setEditNotes]   = useState(false);
  const [notes, setNotes]           = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const [editValue, setEditValue]     = useState(false);
  const [valueInput, setValueInput]   = useState('');
  const [savingValue, setSavingValue] = useState(false);

  // Demo modal
  const [demoModal, setDemoModal] = useState(false);
  const [demoDate, setDemoDate]   = useState('');
  const [demoTime, setDemoTime]   = useState('10:00');
  const [savingDemo, setSavingDemo] = useState(false);

  // Note add
  const [addNote, setAddNote]       = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    fetch(`/api/pipeline/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setLead(d);
          setNotes(d.notes ?? '');
          setValueInput(d.estimatedValue?.toString() ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const patch = async (data: Record<string, unknown>) => {
    const res = await fetch(`/api/pipeline/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json() as Promise<Lead>;
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    const updated = await patch({ notes });
    if (updated) setLead((l) => l ? { ...l, notes: updated.notes } : l);
    setSavingNotes(false);
    setEditNotes(false);
  };

  const saveValue = async () => {
    setSavingValue(true);
    const val = valueInput ? parseFloat(valueInput) : null;
    const updated = await patch({ estimatedValue: val });
    if (updated) setLead((l) => l ? { ...l, estimatedValue: updated.estimatedValue } : l);
    setSavingValue(false);
    setEditValue(false);
  };

  const changeStage = async (stage: string) => {
    if (stage === 'DEMO_SCHEDULED') {
      setDemoModal(true);
      return;
    }
    const updated = await patch({ stage });
    if (updated) setLead((l) => l ? { ...l, stage: updated.stage, activities: l.activities } : l);
    // Refresh to get new activity log entry
    refreshLead();
  };

  const changePriority = async (priority: string) => {
    const updated = await patch({ priority });
    if (updated) setLead((l) => l ? { ...l, priority: updated.priority } : l);
  };

  const confirmDemo = async () => {
    if (!demoDate) return;
    setSavingDemo(true);
    const iso = new Date(`${demoDate}T${demoTime}`).toISOString();
    const updated = await patch({ stage: 'DEMO_SCHEDULED', demoDate: iso });
    if (updated) setLead((l) => l ? { ...l, stage: 'DEMO_SCHEDULED', demoDate: updated.demoDate } : l);
    setSavingDemo(false);
    setDemoModal(false);
    refreshLead();
  };

  const addNoteEntry = async () => {
    if (!addNote.trim()) return;
    setAddingNote(true);
    await fetch(`/api/admin/leads/${id}/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: addNote.trim() }),
    });
    setAddNote('');
    setAddingNote(false);
    refreshLead();
  };

  const refreshLead = () => {
    fetch(`/api/pipeline/${id}`)
      .then((r) => r.json())
      .then((d) => setLead(d))
      .catch(() => {});
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--gray)' }}>
        Loading...
      </div>
    );
  }

  if (notFound || !lead) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>404</div>
        <div style={{ color: 'var(--gray)', marginBottom: 20 }}>Lead not found</div>
        <Link href="/pipeline" className="btn btn-secondary btn-sm">Back to Pipeline</Link>
      </div>
    );
  }

  const stageInfo  = STAGES.find((s) => s.key === lead.stage) ?? STAGES[0];
  const priorityInfo = PRIORITIES.find((p) => p.key === lead.priority) ?? PRIORITIES[1];
  const PriorityIcon = priorityInfo.icon;

  return (
    <>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.back()}
            className="btn btn-ghost btn-sm"
            style={{ padding: '6px 10px', gap: 4 }}
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <span style={{ color: 'var(--border)' }}>/</span>
          <Link href="/pipeline" style={{ color: 'var(--gray)', fontSize: '0.82rem', textDecoration: 'none' }}>Pipeline</Link>
          <ChevronRight size={12} style={{ color: 'var(--border)' }} />
          <span style={{ fontSize: '0.82rem', color: 'var(--white)' }}>{lead.businessName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <Building2 size={20} style={{ color: 'var(--primary)' }} />
          <h1 className="page-title" style={{ marginBottom: 0 }}>{lead.businessName}</h1>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: `${stageInfo.color}22`, color: stageInfo.color, border: `1px solid ${stageInfo.color}44` }}>
            {stageInfo.label}
          </span>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: `${priorityInfo.color}22`, color: priorityInfo.color, border: `1px solid ${priorityInfo.color}44`, display: 'flex', alignItems: 'center', gap: 4 }}>
            <PriorityIcon size={10} />
            {priorityInfo.label}
          </span>
        </div>
        <div style={{ fontSize: '0.76rem', color: 'var(--gray)', marginTop: 4 }}>
          {lead.industry} {lead.city ? `· ${lead.city}${lead.state ? `, ${lead.state}` : ''}` : ''}
          {' · '}Added {fmtDate(lead.createdAt)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Contact Info */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Contact Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {lead.contactName && (
                <InfoRow icon={<User size={13} />} label="Contact" value={lead.contactName} />
              )}
              {lead.email && (
                <InfoRow icon={<Mail size={13} />} label="Email" value={
                  <a href={`mailto:${lead.email}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{lead.email}</a>
                } />
              )}
              {lead.phone && (
                <InfoRow icon={<Phone size={13} />} label="Phone" value={
                  <a href={`tel:${lead.phone}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{lead.phone}</a>
                } />
              )}
              {lead.website && (
                <InfoRow icon={<Globe size={13} />} label="Website" value={
                  <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>{lead.website}</a>
                } />
              )}
              {(lead.city || lead.state) && (
                <InfoRow icon={<MapPin size={13} />} label="Location" value={[lead.city, lead.state].filter(Boolean).join(', ')} />
              )}
              {lead.source && (
                <InfoRow icon={<Tag size={13} />} label="Source" value={lead.source} />
              )}
              {lead.packageInterest && (
                <InfoRow icon={<FileText size={13} />} label="Package Interest" value={lead.packageInterest} />
              )}
              {lead.presenceScore !== null && (
                <InfoRow icon={<Activity size={13} />} label="Presence Score" value={`${lead.presenceScore}/100`} />
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</div>
              {!editNotes && (
                <button onClick={() => setEditNotes(true)} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', gap: 4, fontSize: '0.74rem' }}>
                  <Edit2 size={12} /> Edit
                </button>
              )}
            </div>
            {editNotes ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input"
                  rows={6}
                  style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.84rem' }}
                  placeholder="Add notes about this lead..."
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveNotes} disabled={savingNotes} className="btn btn-secondary btn-sm" style={{ gap: 4 }}>
                    <Save size={12} /> {savingNotes ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => { setEditNotes(false); setNotes(lead.notes ?? ''); }} className="btn btn-ghost btn-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.84rem', color: lead.notes ? 'var(--light)' : 'var(--gray)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {lead.notes || 'No notes yet. Click Edit to add.'}
              </div>
            )}
          </div>

          {/* Activity Log */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Activity Log</div>

            {/* Add note entry */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                className="input"
                style={{ flex: 1, fontSize: '0.82rem', height: 34 }}
                placeholder="Add a note to the activity log..."
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNoteEntry(); } }}
              />
              <button
                onClick={addNoteEntry}
                disabled={addingNote || !addNote.trim()}
                className="btn btn-secondary btn-sm"
                style={{ flexShrink: 0 }}
              >
                {addingNote ? '...' : 'Log'}
              </button>
            </div>

            {lead.activities.length === 0 ? (
              <div style={{ color: 'var(--gray)', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>No activity yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {lead.activities.map((a, i) => (
                  <div key={a.id} style={{ display: 'flex', gap: 12, paddingBottom: i < lead.activities.length - 1 ? 14 : 0, marginBottom: i < lead.activities.length - 1 ? 0 : 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: activityColor(a.type), marginTop: 4, flexShrink: 0 }} />
                      {i < lead.activities.length - 1 && (
                        <div style={{ width: 1, flex: 1, background: 'var(--border)', marginTop: 4 }} />
                      )}
                    </div>
                    <div style={{ flex: 1, paddingBottom: i < lead.activities.length - 1 ? 14 : 0 }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--white)', lineHeight: 1.5 }}>{a.description}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray)', marginTop: 2 }}>
                        {fmtDateTime(a.createdAt)} · {timeAgo(a.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outreach History */}
          {lead.outreachHistory.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Outreach History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lead.outreachHistory.map((o) => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--card2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--white)', fontWeight: 600 }}>{o.subject || `${o.channel} outreach`}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray)', marginTop: 2 }}>{o.channel} · {fmtDate(o.createdAt)}</div>
                    </div>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, background: o.status === 'sent' ? 'rgba(0,212,200,0.1)' : 'rgba(255,255,255,0.05)', color: o.status === 'sent' ? 'var(--green)' : 'var(--gray)', border: `1px solid ${o.status === 'sent' ? 'rgba(0,212,200,0.2)' : 'var(--border)'}` }}>
                      {o.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Stage */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Pipeline Stage</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {STAGES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => s.key !== lead.stage && changeStage(s.key)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 8, border: 'none', cursor: s.key === lead.stage ? 'default' : 'pointer',
                    background: s.key === lead.stage ? `${s.color}18` : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  className={s.key !== lead.stage ? 'btn btn-ghost' : ''}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: s.key === lead.stage ? 700 : 400, color: s.key === lead.stage ? s.color : 'var(--light)' }}>{s.label}</span>
                  </div>
                  {s.key === lead.stage && <Check size={13} style={{ color: s.color }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Priority</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {PRIORITIES.map((p) => {
                const Icon = p.icon;
                const active = p.key === lead.priority;
                return (
                  <button
                    key={p.key}
                    onClick={() => !active && changePriority(p.key)}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      padding: '10px 6px', borderRadius: 8, border: `1px solid ${active ? p.color : 'var(--border)'}`,
                      background: active ? `${p.color}18` : 'var(--card2)', cursor: active ? 'default' : 'pointer',
                    }}
                  >
                    <Icon size={14} style={{ color: active ? p.color : 'var(--gray)' }} />
                    <span style={{ fontSize: '0.7rem', color: active ? p.color : 'var(--gray)', fontWeight: active ? 700 : 400 }}>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deal Value */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Estimated Value</div>
            {editValue ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="input"
                  type="number"
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  placeholder="0"
                  style={{ flex: 1, height: 34, fontSize: '0.9rem' }}
                  autoFocus
                />
                <button onClick={saveValue} disabled={savingValue} className="btn btn-secondary btn-sm" style={{ padding: '0 10px' }}>
                  <Check size={13} />
                </button>
                <button onClick={() => setEditValue(false)} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }}>
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <DollarSign size={18} style={{ color: 'var(--green)' }} />
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--white)' }}>
                    {lead.estimatedValue ? fmt(lead.estimatedValue) : '—'}
                  </span>
                </div>
                <button onClick={() => setEditValue(true)} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
                  <Edit2 size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Demo Date */}
          {lead.demoDate && (
            <div className="card" style={{ padding: 18, border: '1px solid rgba(37,99,235,0.3)', background: 'rgba(37,99,235,0.06)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Demo Scheduled</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.86rem', color: 'var(--white)', fontWeight: 600 }}>{fmtDateTime(lead.demoDate)}</span>
              </div>
              {lead.googleCalendarEventId && (
                <div style={{ fontSize: '0.7rem', color: 'var(--green)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={10} /> Synced to Google Calendar
                </div>
              )}
              <button
                onClick={() => { setDemoDate(''); setDemoTime('10:00'); setDemoModal(true); }}
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 10, fontSize: '0.74rem', width: '100%' }}
              >
                Reschedule
              </button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', gap: 8, textDecoration: 'none' }}
                >
                  <Mail size={13} /> Send Email
                </a>
              )}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', gap: 8, textDecoration: 'none' }}
                >
                  <Phone size={13} /> Call {lead.contactName || 'Contact'}
                </a>
              )}
              {lead.stage !== 'DEMO_SCHEDULED' && (
                <button
                  onClick={() => { setDemoDate(''); setDemoTime('10:00'); setDemoModal(true); }}
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', gap: 8 }}
                >
                  <Calendar size={13} /> Schedule Demo
                </button>
              )}
              <Link
                href={`/outreach/sequences?leadId=${lead.id}&email=${encodeURIComponent(lead.email ?? '')}&name=${encodeURIComponent(lead.contactName ?? lead.businessName)}`}
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start', gap: 8, textDecoration: 'none' }}
              >
                <MoreHorizontal size={13} /> Enroll in Sequence
              </Link>
            </div>
          </div>

          {/* Meta */}
          <div style={{ padding: '12px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray)', lineHeight: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Created</span>
                <span style={{ color: 'var(--light)' }}>{fmtDate(lead.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Updated</span>
                <span style={{ color: 'var(--light)' }}>{timeAgo(lead.updatedAt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Activities</span>
                <span style={{ color: 'var(--light)' }}>{lead.activities.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Modal */}
      {demoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 420, padding: 28, position: 'relative' }}>
            <button onClick={() => setDemoModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)' }}>
              <X size={16} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={17} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--white)', fontSize: '0.96rem' }}>Schedule Demo</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--gray)' }}>{lead.businessName}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label className="label">Date</label>
                <input
                  className="input"
                  type="date"
                  value={demoDate}
                  onChange={(e) => setDemoDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="label">Time</label>
                <input
                  className="input"
                  type="time"
                  value={demoTime}
                  onChange={(e) => setDemoTime(e.target.value)}
                />
              </div>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--gray)', marginBottom: 18, lineHeight: 1.5 }}>
              If Google Calendar is connected, this will create a calendar event automatically.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={confirmDemo}
                disabled={savingDemo || !demoDate}
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
              >
                {savingDemo ? 'Scheduling...' : 'Confirm Demo'}
              </button>
              <button onClick={() => setDemoModal(false)} className="btn btn-ghost btn-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: 'var(--gray)' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '0.84rem', color: 'var(--white)' }}>{value}</div>
    </div>
  );
}

function activityColor(type: string): string {
  if (type === 'STAGE_CHANGE')   return 'var(--primary)';
  if (type === 'NOTE')           return 'var(--gray)';
  if (type === 'EMAIL_SENT')     return 'var(--orange)';
  if (type === 'INVOICE_PAID')   return 'var(--green)';
  return 'var(--border)';
}
