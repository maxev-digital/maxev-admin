'use client';

import { Fragment, useState } from 'react';
import { Check, Phone, PenLine } from 'lucide-react';
import { useAIHighlight } from '@/lib/ai-highlight';

type HotLead = {
  id: string;
  businessName: string;
  contactName: string | null;
  industry: string;
  stage: string;
  estimatedValue: number | null;
  city: string | null;
  source: string | null;
  notes: string | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const stageBadge: Record<string, string> = {
  LEAD: 'badge-gray',
  DEMO_SCHEDULED: 'badge-blue',
  PROPOSAL_SENT: 'badge-orange',
  CONTRACT_SIGNED: 'badge-green',
  IN_DEV: 'badge-purple',
  REVIEW: 'badge-orange',
  LIVE: 'badge-green',
  ON_RETAINER: 'badge-green',
};

export default function HotLeadsTable({ initialLeads }: { initialLeads: HotLead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [called, setCalled] = useState<Set<string>>(new Set());
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const { isHighlighted, hasAnyHighlight } = useAIHighlight();
  const hotGlow = isHighlighted('lead-priority', 'HOT');
  const anyStage = hasAnyHighlight('lead-stage');

  const markCalled = async (id: string) => {
    setCalled((s) => new Set([...s, id]));
    const existing = leads.find((l) => l.id === id);
    const newNotes = existing?.notes ? `${existing.notes}\nCalled ${new Date().toLocaleDateString()}` : 'Called';
    setLeads((list) => list.map((l) => (l.id === id ? { ...l, notes: newNotes } : l)));
    try {
      await fetch(`/api/pipeline/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNotes }),
      });
    } catch {
      // optimistic UI keeps the state
    }
  };

  const openNoteInput = (id: string, currentNotes: string | null) => {
    setNoteOpen(id);
    setNoteValue(currentNotes ?? '');
  };

  const saveNote = async (id: string) => {
    setSavingId(id);
    setLeads((list) => list.map((l) => (l.id === id ? { ...l, notes: noteValue } : l)));
    try {
      await fetch(`/api/pipeline/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: noteValue }),
      });
    } catch {
      // optimistic UI keeps the state
    } finally {
      setSavingId(null);
      setNoteOpen(null);
      setNoteValue('');
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hot Leads</h1>
          <p className="page-sub">{leads.length} leads marked as high priority</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Business</th>
                <th>Contact</th>
                <th>Industry</th>
                <th>Stage</th>
                <th>Est. Value</th>
                <th>City</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ color: 'var(--gray)', textAlign: 'center', padding: 32 }}>
                    No hot leads — go find some.
                  </td>
                </tr>
              ) : leads.map((l) => {
                const stageEffect = isHighlighted('lead-stage', l.stage);
                const rowClass = stageEffect === 'glow' ? 'ai-highlight-glow'
                  : hotGlow === 'glow' ? 'ai-highlight-glow'
                  : anyStage && !stageEffect ? 'ai-highlight-dim'
                  : '';
                return (
                <Fragment key={l.id}>
                  <tr className={rowClass}>
                    <td style={{ color: 'var(--white)', fontWeight: 700 }}>{l.businessName}</td>
                    <td style={{ color: 'var(--light)' }}>{l.contactName ?? '—'}</td>
                    <td style={{ color: 'var(--light)' }}>{l.industry}</td>
                    <td><span className={`badge ${stageBadge[l.stage]}`}>{l.stage.replace(/_/g, ' ')}</span></td>
                    <td style={{ color: 'var(--green)', fontWeight: 600 }}>
                      {l.estimatedValue ? fmt(l.estimatedValue) : '—'}
                    </td>
                    <td style={{ color: 'var(--gray)' }}>{l.city ?? '—'}</td>
                    <td style={{ color: 'var(--gray)' }}>{l.source ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => markCalled(l.id)}
                          disabled={called.has(l.id)}
                          style={{ color: called.has(l.id) ? 'var(--green)' : undefined, fontSize: '0.72rem' }}
                        >
                          {called.has(l.id) ? <Check size={12} /> : <Phone size={12} />}
                          {called.has(l.id) ? 'Called' : 'Mark Called'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openNoteInput(l.id, l.notes)}
                          style={{ fontSize: '0.72rem' }}
                        >
                          <PenLine size={12} />
                          Add Note
                        </button>
                      </div>
                    </td>
                  </tr>
                  {noteOpen === l.id && (
                    <tr>
                      <td colSpan={8} style={{ background: 'var(--card2)', padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <textarea
                            className="input"
                            rows={2}
                            value={noteValue}
                            onChange={(e) => setNoteValue(e.target.value)}
                            placeholder="Write a note for this lead..."
                            style={{ flex: 1, resize: 'vertical' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => saveNote(l.id)}
                              disabled={savingId === l.id}
                            >
                              {savingId === l.id ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => { setNoteOpen(null); setNoteValue(''); }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                        {l.notes && (
                          <div style={{ marginTop: 10, fontSize: '0.74rem', color: 'var(--gray)', whiteSpace: 'pre-line' }}>
                            <span style={{ fontWeight: 700, color: 'var(--light)' }}>Current note:</span> {l.notes}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
