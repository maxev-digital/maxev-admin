'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, MessageSquare, AlertTriangle, Check, X, Send, User, Clock, Plus } from 'lucide-react';
import { useAIHighlight } from '@/lib/ai-highlight';

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
  resolvedAt?: string | null;
}

const ASSIGNEES  = ['Unassigned', 'Nash', 'Will', 'Office Manager'];
const CATEGORIES = ['Billing', 'Technical', 'General', 'Appointments', 'Clinical', 'Records', 'Other'];

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
  };
  return map[cat] ?? 'badge badge-gray';
}

export default function HelpdeskPage() {
  const searchParams = useSearchParams();
  const priorityFilter = searchParams.get('priority')?.toUpperCase() as Priority | null;
  const { isHighlighted, hasAnyHighlight } = useAIHighlight();
  const [tickets, setTickets]         = useState<Ticket[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<Ticket | null>(null);
  const [assignee, setAssignee]       = useState('Unassigned');
  const [aiDraft, setAiDraft]         = useState('');
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiError, setAiError]         = useState(false);
  const [draftGenerated, setDraftGenerated] = useState(false);
  const [aiDraftEditable, setAiDraftEditable] = useState(false);
  const [manualReply, setManualReply] = useState('');
  const [showNewTicket, setShowNewTicket]   = useState(false);
  const [newForm, setNewForm]               = useState({ fromName: '', fromEmail: '', subject: '', body: '', category: 'General', priority: 'MEDIUM' as Priority });
  const [newSaving, setNewSaving]           = useState(false);
  const [newErr, setNewErr]                 = useState('');
  const [replySending, setReplySending]     = useState(false);
  const [replyDone, setReplyDone]           = useState(false);

  useEffect(() => {
    fetch('/api/helpdesk/tickets')
      .then((r) => r.json())
      .then(async (data: Ticket[]) => {
        setTickets(data);
        if (data.length > 0) { setSelected(data[0]); setAssignee(data[0].assignee); }
        setLoading(false);

        // AI-score tickets that are still at the default MEDIUM priority
        const unscored = data.filter((t) => t.priority === 'MEDIUM' && (t.status === 'OPEN' || t.status === 'URGENT'));
        if (unscored.length > 0) {
          try {
            const res = await fetch('/api/ai/score-tickets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ticketIds: unscored.map((t) => t.id) }),
            });
            const scored: Array<{ id: string; priority: Ticket['priority'] }> = await res.json();
            setTickets((prev) =>
              prev.map((t) => {
                const s = scored.find((s) => s.id === t.id);
                return s ? { ...t, priority: s.priority } : t;
              })
            );
          } catch {
            // AI scoring failed silently — keep original priorities
          }
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const allOpen  = tickets.filter((t) => t.status === 'OPEN' || t.status === 'URGENT');
  const open     = priorityFilter ? allOpen.filter((t) => t.priority === priorityFilter) : allOpen;
  const resolved = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED');
  const urgent   = tickets.filter((t) => t.status === 'URGENT');

  function selectTicket(t: Ticket) {
    setSelected(t); setAssignee(t.assignee);
    setAiDraft(''); setAiError(false); setAiDraftEditable(false);
    setDraftGenerated(false); setManualReply('');
    setReplyDone(false);
  }

  async function sendReply(body: string, resolve = false) {
    if (!selected || !body.trim()) return;
    setReplySending(true);
    try {
      const res = await fetch(`/api/helpdesk/tickets/${selected.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyBody: body, markResolved: resolve }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (resolve && data.ticket) {
        setTickets((prev) => prev.map((t) => t.id === selected.id ? data.ticket : t));
        setSelected(data.ticket);
      }
      setReplyDone(true);
      setManualReply('');
      setTimeout(() => setReplyDone(false), 3000);
    } catch {
      setReplyDone(false);
    } finally { setReplySending(false); }
  }

  async function generateDraft() {
    if (!selected) return;
    setAiLoading(true); setAiError(false); setDraftGenerated(false); setAiDraft('');
    try {
      const res  = await fetch('/api/ai/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: selected.subject, body: selected.body, businessContext: 'MAX EV Digital — web design & digital marketing agency' }),
      });
      const data = await res.json();
      if (data.draft) { setAiDraft(data.draft); setDraftGenerated(true); }
      else setAiError(true);
    } catch { setAiError(true); }
    finally  { setAiLoading(false); }
  }

  async function patchTicket(id: string, update: Partial<Ticket>) {
    const res  = await fetch(`/api/helpdesk/tickets/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    const updated = await res.json();
    setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
    if (selected?.id === id) setSelected(updated);
  }

  function markResolved() {
    if (!selected) return;
    patchTicket(selected.id, { status: 'RESOLVED' });
  }

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    setNewSaving(true); setNewErr('');
    try {
      const res = await fetch('/api/helpdesk/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newForm, status: 'OPEN', assignee: 'Unassigned' }),
      });
      if (!res.ok) throw new Error('Failed');
      const created: Ticket = await res.json();
      setTickets((prev) => [created, ...prev]);
      selectTicket(created);
      setShowNewTicket(false);
      setNewForm({ fromName: '', fromEmail: '', subject: '', body: '', category: 'General', priority: 'MEDIUM' });
    } catch {
      setNewErr('Failed to create ticket — please try again.');
    } finally { setNewSaving(false); }
  }

  if (loading) return (
    <>
      <div className="page-header"><div><h1 className="page-title">Helpdesk</h1><p className="page-sub">Support ticket inbox</p></div></div>
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--gray)', fontSize: '0.88rem' }}>Loading tickets...</div>
    </>
  );

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Helpdesk</h1><p className="page-sub">MAX EV Digital — support inbox</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewTicket(true)}><Plus size={13} />New Ticket</button>
          <a href="/helpdesk/open" className="btn btn-ghost btn-sm"><MessageSquare size={13} />Open Tickets</a>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Open',          value: open.length,     cls: 'kpi-value' },
          { label: 'Urgent',        value: urgent.length,   cls: 'kpi-value-orange' },
          { label: 'Resolved',      value: resolved.length, cls: 'kpi-value-green' },
          { label: 'Total Tickets', value: tickets.length,  cls: 'kpi-value' },
        ].map((k) => (
          <div key={k.label} className="card" style={{ padding: '16px 20px' }}>
            <div className={k.cls}>{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <MessageSquare size={36} style={{ color: 'var(--gray)', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--light)', marginBottom: 6 }}>No tickets yet</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--gray)' }}>Support tickets will appear here when submitted.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 260px)', minHeight: 500 }}>
          {/* Ticket list */}
          <div className="card" style={{ width: '35%', flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)' }}>
              Inbox ({tickets.length})
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {tickets.slice().sort((a, b) => {
                if (a.status === 'URGENT' && b.status !== 'URGENT') return -1;
                if (b.status === 'URGENT' && a.status !== 'URGENT') return  1;
                return 0;
              }).map((t) => {
                const pb          = priorityBadge(t.priority);
                const isSelected  = selected?.id === t.id;
                const isUrgent    = t.status === 'URGENT';
                const aiEffect    = isHighlighted('ticket-priority', t.priority);
                const anyAiPri    = hasAnyHighlight('ticket-priority');
                return (
                  <div
                    key={t.id}
                    onClick={() => selectTicket(t)}
                    className={aiEffect === 'glow' ? 'ai-highlight-glow' : anyAiPri ? 'ai-highlight-dim' : ''}
                    style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isSelected ? 'rgba(37,99,235,0.08)' : 'transparent', borderLeft: isUrgent ? '3px solid var(--red)' : '3px solid transparent', transition: 'background 0.15s', position: 'relative' }}
                  >
                    {t.status !== 'RESOLVED' && t.status !== 'CLOSED' && (
                      <div style={{ position: 'absolute', top: 16, right: 14, width: 7, height: 7, borderRadius: '50%', background: isUrgent ? 'var(--red)' : 'var(--primary)' }} />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: isUrgent ? 'rgba(239,68,68,0.15)' : 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={12} style={{ color: isUrgent ? 'var(--red)' : 'var(--primary)' }} />
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--white)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 14 }}>{t.fromName}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--light)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <span className={categoryBadge(t.category)}>{t.category}</span>
                      <span className={pb.cls}>{pb.label}</span>
                      {(t.status === 'RESOLVED' || t.status === 'CLOSED') && <span className="badge badge-green">Resolved</span>}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} />{new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ticket detail */}
          <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {!selected ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--gray)' }}>
                <MessageSquare size={36} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: '0.88rem' }}>Select a ticket to view details</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: selected.status === 'URGENT' ? 'rgba(239,68,68,0.15)' : 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={15} style={{ color: selected.status === 'URGENT' ? 'var(--red)' : 'var(--primary)' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--white)' }}>{selected.fromName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{selected.fromEmail}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--white)', marginBottom: 6 }}>{selected.subject}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span className={categoryBadge(selected.category)}>{selected.category}</span>
                        <span className={priorityBadge(selected.priority).cls}>{priorityBadge(selected.priority).label}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--gray)', marginBottom: 6 }}>
                        <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
                        {new Date(selected.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                      <select className="input" style={{ width: 'auto', fontSize: '0.78rem', padding: '5px 10px' }} value={assignee}
                        onChange={(e) => { setAssignee(e.target.value); patchTicket(selected.id, { assignee: e.target.value }); }}>
                        {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: 8 }}>Message</div>
                    <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', fontSize: '0.87rem', color: 'var(--light)', lineHeight: 1.65 }}>{selected.body}</div>
                  </div>

                  <div className="card-blue" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Sparkles size={16} style={{ color: '#60A5FA' }} />
                        <span style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--white)' }}>AI Draft Reply</span>
                        <span style={{ fontSize: '0.65rem', color: '#60A5FA', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 999, padding: '2px 7px', fontWeight: 600 }}>Powered by Claude</span>
                      </div>
                      {!draftGenerated && !aiLoading && (
                        <button className="btn btn-primary btn-sm" onClick={generateDraft}><Sparkles size={12} />Generate Draft</button>
                      )}
                    </div>
                    {aiLoading && <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', color: '#60A5FA', fontSize: '0.83rem' }}><div style={{ width: 14, height: 14, border: '2px solid rgba(96,165,250,0.3)', borderTop: '2px solid #60A5FA', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Claude is drafting a reply...</div>}
                    {aiError && !aiLoading && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: '0.82rem', color: '#FCA5A5' }}><X size={14} />AI unavailable — write reply manually</div>}
                    {draftGenerated && !aiLoading && (
                      <div>
                        <textarea className="input" value={aiDraft} onChange={(e) => setAiDraft(e.target.value)} readOnly={!aiDraftEditable} rows={4} style={{ resize: 'vertical', marginBottom: 10, background: aiDraftEditable ? 'var(--card)' : 'rgba(37,99,235,0.04)', borderColor: aiDraftEditable ? 'rgba(37,99,235,0.5)' : 'rgba(37,99,235,0.2)', fontSize: '0.85rem', lineHeight: 1.6 }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-primary btn-sm" disabled={replySending} onClick={() => sendReply(aiDraft)}><Send size={12} />{replySending ? 'Sending...' : replyDone ? 'Sent!' : 'Send Reply'}</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setAiDraftEditable(true)}>Edit Draft</button>
                          <button className="btn btn-ghost btn-sm" onClick={generateDraft}><Sparkles size={12} />Regenerate</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="label">Manual Reply</label>
                    <textarea className="input" placeholder="Write a reply..." rows={3} value={manualReply} onChange={(e) => setManualReply(e.target.value)} style={{ resize: 'vertical', fontSize: '0.85rem', lineHeight: 1.6 }} />
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" disabled={replySending || !manualReply.trim()} onClick={() => sendReply(manualReply)}><Send size={12} />{replySending ? 'Sending...' : replyDone ? 'Sent!' : 'Send Reply'}</button>
                      {selected.status !== 'RESOLVED' && selected.status !== 'CLOSED' && (
                        <>
                          <button className="btn btn-sm" style={{ background: 'rgba(0,212,200,0.1)', color: 'var(--green)', border: '1px solid rgba(0,212,200,0.25)' }} disabled={replySending}
                            onClick={() => manualReply.trim() ? sendReply(manualReply, true) : markResolved()}>
                            <Check size={12} />{manualReply.trim() ? 'Send & Resolve' : 'Mark Resolved'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowNewTicket(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 560, padding: 28 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>New Support Ticket</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>Create a ticket on behalf of a client or contact</p>
              </div>
              <button onClick={() => setShowNewTicket(false)} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
            </div>
            <form onSubmit={createTicket} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="label">Name *</label>
                  <input className="input" placeholder="John Smith" required value={newForm.fromName} onChange={(e) => setNewForm((f) => ({ ...f, fromName: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input className="input" type="email" placeholder="client@example.com" required value={newForm.fromEmail} onChange={(e) => setNewForm((f) => ({ ...f, fromEmail: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Subject *</label>
                <input className="input" placeholder="Brief description of the issue" required value={newForm.subject} onChange={(e) => setNewForm((f) => ({ ...f, subject: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={newForm.category} onChange={(e) => setNewForm((f) => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select className="input" value={newForm.priority} onChange={(e) => setNewForm((f) => ({ ...f, priority: e.target.value as Priority }))}>
                    {(['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as Priority[]).map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Message *</label>
                <textarea className="input" rows={4} placeholder="Describe the issue in detail..." required value={newForm.body} onChange={(e) => setNewForm((f) => ({ ...f, body: e.target.value }))} style={{ resize: 'vertical', lineHeight: 1.6 }} />
              </div>
              {newErr && <div style={{ fontSize: '0.8rem', color: 'var(--red)', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>{newErr}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" className="btn btn-primary" disabled={newSaving} style={{ flex: 1 }}>{newSaving ? 'Creating...' : 'Create Ticket'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNewTicket(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
