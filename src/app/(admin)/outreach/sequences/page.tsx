'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, Plus, X, Play, Pause, Users, Clock, Check, Sparkles } from 'lucide-react';

interface Step {
  stepNumber: number;
  dayOffset: number;
  subject: string;
  body: string;
}

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  isActive: boolean;
  steps: Step[];
  enrollments: Array<{ id: string }>;
  createdAt: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  manual:         'Manual',
  new_lead:       'New Lead',
  proposal_sent:  'Proposal Sent',
  new_client:     'New Client',
  invoice_overdue:'Invoice Overdue',
};

const BLANK_SEQ = { name: '', description: '', trigger: 'manual' };
const BLANK_STEP = { dayOffset: 0, subject: '', body: '' };

function SequencesPageInner() {
  const searchParams = useSearchParams();
  const preEmail = searchParams.get('email') ?? '';
  const preName  = searchParams.get('name') ?? '';

  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Sequence | null>(null);

  // New sequence modal
  const [showNew, setShowNew]     = useState(false);
  const [seqForm, setSeqForm]     = useState(BLANK_SEQ);
  const [steps, setSteps]         = useState<typeof BLANK_STEP[]>([{ dayOffset: 0, subject: '', body: '' }]);
  const [saving, setSaving]       = useState(false);
  const [saveErr, setSaveErr]     = useState('');

  // Enroll modal
  const [showEnroll, setShowEnroll]       = useState(false);
  const [enrollSeq, setEnrollSeq]         = useState<Sequence | null>(null);
  const [enrollForm, setEnrollForm]       = useState({ contactEmail: preEmail, contactName: preName, contactType: 'lead' });
  const [enrollSaving, setEnrollSaving]   = useState(false);
  const [enrollMsg, setEnrollMsg]         = useState('');

  useEffect(() => {
    fetch('/api/outreach/sequences')
      .then((r) => r.json())
      .then((data: Sequence[]) => {
        setSequences(data);
        if (data.length > 0) {
          setSelected(data[0]);
          // Auto-open enroll modal if coming from a lead
          if (preEmail) {
            setEnrollSeq(data[0]);
            setShowEnroll(true);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function addStep() {
    const last = steps[steps.length - 1];
    setSteps((s) => [...s, { dayOffset: (last?.dayOffset ?? 0) + 3, subject: '', body: '' }]);
  }

  function removeStep(i: number) {
    setSteps((s) => s.filter((_, idx) => idx !== i));
  }

  async function saveSequence(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveErr('');
    try {
      const res = await fetch('/api/outreach/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...seqForm, steps }),
      });
      if (!res.ok) throw new Error('Failed');
      const created: Sequence = await res.json();
      setSequences((prev) => [created, ...prev]);
      setSelected(created);
      setShowNew(false);
      setSeqForm(BLANK_SEQ);
      setSteps([{ dayOffset: 0, subject: '', body: '' }]);
    } catch {
      setSaveErr('Failed to create sequence — please try again.');
    } finally { setSaving(false); }
  }

  async function toggleActive(seq: Sequence) {
    const res = await fetch(`/api/outreach/sequences/${seq.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !seq.isActive }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setSequences((prev) => prev.map((s) => s.id === seq.id ? updated : s));
    if (selected?.id === seq.id) setSelected(updated);
  }

  async function enroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollSeq) return;
    setEnrollSaving(true); setEnrollMsg('');
    try {
      const res = await fetch(`/api/outreach/sequences/${enrollSeq.id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrollForm),
      });
      if (res.status === 409) { setEnrollMsg('Already enrolled in this sequence.'); return; }
      if (!res.ok) throw new Error('Failed');
      setEnrollMsg('Enrolled successfully!');
      setEnrollForm({ contactEmail: '', contactName: '', contactType: 'lead' });
      // Refresh enrollments count
      fetch('/api/outreach/sequences').then((r) => r.json()).then((data: Sequence[]) => {
        setSequences(data);
        if (enrollSeq) setSelected(data.find((s) => s.id === enrollSeq.id) ?? null);
      });
    } catch {
      setEnrollMsg('Enrollment failed — please try again.');
    } finally { setEnrollSaving(false); }
  }

  if (loading) return (
    <>
      <div className="page-header"><div><h1 className="page-title">Drip Sequences</h1></div></div>
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--gray)' }}>Loading sequences...</div>
    </>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Drip Sequences</h1>
          <p className="page-sub">Automated multi-step email campaigns</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}><Plus size={13} />New Sequence</button>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Sequences', value: sequences.length, cls: 'kpi-value' },
          { label: 'Active',          value: sequences.filter((s) => s.isActive).length, cls: 'kpi-value-green' },
          { label: 'Total Enrolled',  value: sequences.reduce((n, s) => n + s.enrollments.length, 0), cls: 'kpi-value' },
          { label: 'Total Steps',     value: sequences.reduce((n, s) => n + s.steps.length, 0), cls: 'kpi-value' },
        ].map((k) => (
          <div key={k.label} className="card" style={{ padding: '16px 20px' }}>
            <div className={k.cls}>{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {sequences.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Mail size={36} style={{ color: 'var(--gray)', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--light)', marginBottom: 6 }}>No sequences yet</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--gray)', marginBottom: 16 }}>Create your first automated email sequence to nurture leads and onboard clients.</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}><Plus size={13} />New Sequence</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 280px)', minHeight: 500 }}>
          {/* Sequence list */}
          <div className="card" style={{ width: '38%', flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)' }}>
              Sequences ({sequences.length})
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {sequences.map((seq) => (
                <div key={seq.id} onClick={() => setSelected(seq)}
                  style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selected?.id === seq.id ? 'rgba(37,99,235,0.08)' : 'transparent', borderLeft: seq.isActive ? '3px solid var(--green)' : '3px solid transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                    <div style={{ fontWeight: 600, color: 'var(--white)', fontSize: '0.84rem' }}>{seq.name}</div>
                    <span className={seq.isActive ? 'badge badge-green' : 'badge badge-gray'}>{seq.isActive ? 'Active' : 'Paused'}</span>
                  </div>
                  {seq.description && <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginBottom: 5 }}>{seq.description}</div>}
                  <div style={{ display: 'flex', gap: 8, fontSize: '0.7rem', color: 'var(--gray)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Mail size={10} />{seq.steps.length} step{seq.steps.length !== 1 ? 's' : ''}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Users size={10} />{seq.enrollments.length} active</span>
                    <span className="badge badge-gray" style={{ fontSize: '0.62rem' }}>{TRIGGER_LABELS[seq.trigger] ?? seq.trigger}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sequence detail */}
          <div className="card" style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            {!selected ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--gray)' }}>
                <div style={{ textAlign: 'center' }}><Mail size={36} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} /><p>Select a sequence to view details</p></div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 4 }}>{selected.name}</h2>
                    {selected.description && <p style={{ fontSize: '0.82rem', color: 'var(--gray)' }}>{selected.description}</p>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <span className="badge badge-blue">Trigger: {TRIGGER_LABELS[selected.trigger] ?? selected.trigger}</span>
                      <span className="badge badge-gray">{selected.enrollments.length} enrolled</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => { setEnrollSeq(selected); setShowEnroll(true); setEnrollMsg(''); }}><Users size={12} />Enroll Contact</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(selected)}>
                      {selected.isActive ? <><Pause size={12} />Pause</> : <><Play size={12} />Activate</>}
                    </button>
                  </div>
                </div>

                {/* Steps timeline */}
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: 14 }}>Email Steps</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selected.steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)' }}>{i + 1}</span>
                      </div>
                      <div className="card" style={{ flex: 1, padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--white)' }}>{step.subject}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: 'var(--gray)' }}>
                            <Clock size={10} />Day {step.dayOffset}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--gray)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{step.body.slice(0, 200)}{step.body.length > 200 ? '...' : ''}</div>
                      </div>
                    </div>
                  ))}
                  {selected.steps.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray)', fontSize: '0.84rem' }}>No steps yet — edit this sequence to add email steps.</div>
                  )}
                </div>

                {/* AI tip */}
                <div className="card-blue" style={{ padding: 14, marginTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Sparkles size={14} style={{ color: '#60A5FA' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--white)' }}>AI Optimization Tip</span>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--light)', lineHeight: 1.55 }}>
                    Sequences with 3-5 steps and 2-4 day intervals see 40% higher reply rates. Use the AI Compose feature to generate personalized templates for each step. Add variables like {"{{name}}"} and {"{{email}}"} for personalization.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* New Sequence Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }} onClick={() => setShowNew(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 640, padding: 28, margin: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>New Drip Sequence</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>Build an automated multi-step email campaign</p>
              </div>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={saveSequence} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="label">Sequence Name *</label>
                  <input className="input" required placeholder="New Client Welcome Series" value={seqForm.name} onChange={(e) => setSeqForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Trigger</label>
                  <select className="input" value={seqForm.trigger} onChange={(e) => setSeqForm((f) => ({ ...f, trigger: e.target.value }))}>
                    {Object.entries(TRIGGER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" placeholder="What this sequence is for..." value={seqForm.description} onChange={(e) => setSeqForm((f) => ({ ...f, description: e.target.value }))} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label className="label" style={{ marginBottom: 0 }}>Email Steps ({steps.length})</label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addStep}><Plus size={12} />Add Step</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
                  {steps.map((step, i) => (
                    <div key={i} className="card" style={{ padding: 14, position: 'relative' }}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label className="label">Subject *</label>
                          <input className="input" required placeholder="Hi {{name}}, let's get started!" value={step.subject}
                            onChange={(e) => setSteps((s) => s.map((st, idx) => idx === i ? { ...st, subject: e.target.value } : st))} />
                        </div>
                        <div style={{ width: 100 }}>
                          <label className="label">Send on Day</label>
                          <input className="input" type="number" min={0} value={step.dayOffset}
                            onChange={(e) => setSteps((s) => s.map((st, idx) => idx === i ? { ...st, dayOffset: Number(e.target.value) } : st))} />
                        </div>
                      </div>
                      <div>
                        <label className="label">Body *</label>
                        <textarea className="input" rows={3} required placeholder="Hi {{name}},&#10;&#10;Welcome to Max EV Digital..." value={step.body}
                          onChange={(e) => setSteps((s) => s.map((st, idx) => idx === i ? { ...st, body: e.target.value } : st))}
                          style={{ resize: 'vertical', fontSize: '0.83rem', lineHeight: 1.6 }} />
                      </div>
                      {steps.length > 1 && (
                        <button type="button" onClick={() => removeStep(i)}
                          style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', padding: 2 }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {saveErr && <div style={{ fontSize: '0.8rem', color: 'var(--red)', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>{saveErr}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>{saving ? 'Creating...' : 'Create Sequence'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Modal */}
      {showEnroll && enrollSeq && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowEnroll(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 28 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>Enroll Contact</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>in: {enrollSeq.name}</p>
              </div>
              <button onClick={() => setShowEnroll(false)} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={enroll} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="label">Name *</label>
                  <input className="input" required placeholder="John Smith" value={enrollForm.contactName} onChange={(e) => setEnrollForm((f) => ({ ...f, contactName: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input className="input" type="email" required placeholder="john@company.com" value={enrollForm.contactEmail} onChange={(e) => setEnrollForm((f) => ({ ...f, contactEmail: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input" value={enrollForm.contactType} onChange={(e) => setEnrollForm((f) => ({ ...f, contactType: e.target.value }))}>
                  <option value="lead">Lead</option>
                  <option value="client">Client</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>
              {enrollMsg && (
                <div style={{ fontSize: '0.8rem', padding: '8px 12px', borderRadius: 8, background: enrollMsg.includes('success') ? 'rgba(0,212,200,0.08)' : 'rgba(239,68,68,0.08)', color: enrollMsg.includes('success') ? 'var(--green)' : 'var(--red)', border: `1px solid ${enrollMsg.includes('success') ? 'rgba(0,212,200,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                  {enrollMsg.includes('success') ? <Check size={12} style={{ display: 'inline', marginRight: 4 }} /> : null}{enrollMsg}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" className="btn btn-primary" disabled={enrollSaving} style={{ flex: 1 }}>{enrollSaving ? 'Enrolling...' : 'Enroll'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowEnroll(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function SequencesPage() {
  return (
    <Suspense>
      <SequencesPageInner />
    </Suspense>
  );
}
