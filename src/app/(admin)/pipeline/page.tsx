'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, ChevronRight, Calendar, X, UserPlus, Send, Trash2 } from 'lucide-react';
import { useAIHighlight } from '@/lib/ai-highlight';

type Lead = {
  id: string;
  businessName: string;
  industry: string;
  stage: string;
  priority: string;
  estimatedValue: number | null;
  city: string | null;
  state: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  demoDate: string | null;
  signedProposal: { oneTimeTotal: number; monthlyTotal: number; packageTier: string } | null;
};

const STAGES = [
  { key: 'LEAD',             label: 'Lead',             color: 'var(--gray)' },
  { key: 'DEMO_SCHEDULED',   label: 'Demo Scheduled',   color: 'var(--primary)' },
  { key: 'PROPOSAL_SENT',    label: 'Proposal Sent',    color: 'var(--orange)' },
  { key: 'CONTRACT_SIGNED',  label: 'Contract Signed',  color: 'var(--green)' },
  { key: 'IN_DEV',           label: 'In Dev',           color: '#8B5CF6' },
  { key: 'REVIEW',           label: 'Review',           color: 'var(--orange)' },
  { key: 'LIVE',             label: 'Live',             color: 'var(--green)' },
  { key: 'ON_RETAINER',      label: 'On Retainer',      color: 'var(--green)' },
];

const STAGE_KEYS = STAGES.map((s) => s.key);

const CONVERT_STAGES  = new Set(['CONTRACT_SIGNED', 'IN_DEV', 'REVIEW', 'LIVE']);
const PROPOSAL_STAGES = new Set(['LEAD', 'DEMO_SCHEDULED']);

const SS_PRODUCTS = [
  { id: 'cam-4k',     name: '4-Camera Security Bundle',    price: 1049 },
  { id: 'cam-8pk',    name: '8-Camera Commercial Bundle',  price: 2499 },
  { id: 'cam-16pk',   name: '16-Camera Commercial System', price: 5499 },
  { id: 'cam-32ent',  name: '32-Camera Enterprise System', price: 11499 },
  { id: 'bell-hd',    name: 'HD Video Doorbell',           price: 299  },
  { id: 'bell-com',   name: 'HD Commercial Doorbell',      price: 449  },
  { id: 'lock-pro',   name: 'Smart Lock Pro',              price: 149  },
  { id: 'lock-4pk',   name: 'Smart Lock 4-Pack',           price: 549  },
  { id: 'lock-8pk',   name: 'Smart Lock 8-Pack',           price: 1299 },
  { id: 'access-int', name: 'Access Control Integration',  price: 899  },
  { id: 'inst-res',   name: 'Professional Installation',   price: 449  },
  { id: 'inst-com',   name: 'Commercial Installation',     price: 951  },
  { id: 'inst-ent',   name: 'Enterprise Installation',     price: 3303 },
  { id: 'mon-setup',  name: 'Monitoring Setup',            price: 200  },
];

const priorityBadge: Record<string, string> = {
  HOT:  'badge-red',
  WARM: 'badge-orange',
  COLD: 'badge-gray',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

export default function PipelinePage() {
  const searchParams = useSearchParams();
  const stageFilter  = searchParams.get('stage')?.toUpperCase() ?? null;
  const { isHighlighted, hasAnyHighlight } = useAIHighlight();
  const [leads, setLeads]     = useState<Lead[]>([]);
  const [pending, setPending] = useState<Set<string>>(new Set());

  // Demo date modal
  const [demoModal, setDemoModal] = useState<{ leadId: string; businessName: string; newStage: string } | null>(null);
  const [demoDate, setDemoDate]   = useState('');
  const [demoTime, setDemoTime]   = useState('10:00');

  // Convert-to-client modal
  const [convertLead,    setConvertLead]    = useState<Lead | null>(null);
  const [convertPkg,     setConvertPkg]     = useState('PRO');
  const [convertSetup,   setConvertSetup]   = useState('');
  const [convertMonthly, setConvertMonthly] = useState('');
  const [converting,     setConverting]     = useState(false);
  const [convertResult,  setConvertResult]  = useState<{ appointmentDate: string } | null>(null);

  // Send-proposal modal
  const [proposalLead,  setProposalLead]  = useState<Lead | null>(null);
  const [propPkg,       setPropPkg]       = useState('PRO');
  const [propChecked,   setPropChecked]   = useState<Set<string>>(new Set());
  const [propCustom,    setPropCustom]    = useState<{ name: string; price: string }[]>([]);
  const [propMonthly,   setPropMonthly]   = useState('');
  const [propMessage,   setPropMessage]   = useState('');
  const [propSending,   setPropSending]   = useState(false);
  const [propResult,    setPropResult]    = useState<{ signUrl: string; proposalNumber: string } | null>(null);

  useEffect(() => {
    fetch('/api/pipeline')
      .then((r) => r.json())
      .then(setLeads)
      .catch(() => setLeads([]));
  }, []);

  const byStage = (stage: string) => leads.filter((l) => l.stage === stage);

  const moveStage = async (id: string, newStage: string, demoDateTime?: string) => {
    setPending((s) => new Set([...s, id]));
    setLeads((list) => list.map((l) => (l.id === id ? { ...l, stage: newStage, demoDate: demoDateTime ?? l.demoDate } : l)));
    try {
      await fetch(`/api/pipeline/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage, ...(demoDateTime ? { demoDate: demoDateTime } : {}) }),
      });
    } catch {
      // optimistic UI stays
    } finally {
      setPending((s) => { const next = new Set(s); next.delete(id); return next; });
    }
  };

  const handleStageChange = (lead: Lead, newStage: string) => {
    if (newStage === 'DEMO_SCHEDULED') {
      setDemoDate('');
      setDemoTime('10:00');
      setDemoModal({ leadId: lead.id, businessName: lead.businessName, newStage });
    } else {
      moveStage(lead.id, newStage);
    }
  };

  const confirmDemo = () => {
    if (!demoModal || !demoDate) return;
    moveStage(demoModal.leadId, demoModal.newStage, `${demoDate}T${demoTime}:00`);
    setDemoModal(null);
  };

  const advanceStage = (lead: Lead) => {
    const idx = STAGE_KEYS.indexOf(lead.stage);
    if (idx < 0 || idx >= STAGE_KEYS.length - 1) return;
    handleStageChange(lead, STAGE_KEYS[idx + 1]);
  };

  const openConvert = (lead: Lead) => {
    setConvertLead(lead);
    setConvertPkg(lead.signedProposal?.packageTier ?? 'PRO');
    setConvertSetup(lead.signedProposal ? String(lead.signedProposal.oneTimeTotal) : lead.estimatedValue ? String(lead.estimatedValue) : '');
    setConvertMonthly(lead.signedProposal ? String(lead.signedProposal.monthlyTotal) : '');
    setConvertResult(null);
    setConverting(false);
  };

  const openProposal = (lead: Lead) => {
    setProposalLead(lead);
    setPropPkg('PRO');
    setPropChecked(new Set());
    setPropCustom([]);
    setPropMonthly('');
    setPropMessage('');
    setPropSending(false);
    setPropResult(null);
  };

  const toggleProduct = (id: string) =>
    setPropChecked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const propOneTimeTotal = (() => {
    const checked = SS_PRODUCTS.filter((p) => propChecked.has(p.id)).reduce((s, p) => s + p.price, 0);
    const custom  = propCustom.reduce((s, c) => s + (parseFloat(c.price) || 0), 0);
    return checked + custom;
  })();

  const handleSendProposal = async () => {
    if (!proposalLead) return;
    setPropSending(true);
    try {
      const checkedItems = SS_PRODUCTS.filter((p) => propChecked.has(p.id)).map((p) => ({ name: p.name, price: p.price }));
      const customItems  = propCustom.filter((c) => c.name.trim() && c.price).map((c) => ({ name: c.name.trim(), price: parseFloat(c.price) }));
      const lineItems    = [...checkedItems, ...customItems];

      const res  = await fetch('/api/proposals/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ leadId: proposalLead.id, packageTier: propPkg, lineItems, oneTimeTotal: propOneTimeTotal, monthlyTotal: parseFloat(propMonthly) || 0, message: propMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      setLeads((list) => list.map((l) => l.id === proposalLead.id ? { ...l, stage: 'PROPOSAL_SENT' } : l));
      setPropResult({ signUrl: data.signUrl, proposalNumber: data.proposalNumber });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert('Failed to send proposal: ' + msg);
      setPropSending(false);
    }
  };

  const handleConvert = async () => {
    if (!convertLead) return;
    setConverting(true);
    try {
      const res  = await fetch(`/api/pipeline/${convertLead.id}/convert`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ packageTier: convertPkg, setupFee: convertSetup, monthly: convertMonthly }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion failed');
      setLeads((list) => list.map((l) => l.id === convertLead.id ? { ...l, stage: 'ON_RETAINER' } : l));
      setConvertResult({ appointmentDate: data.appointmentDate });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert('Conversion failed: ' + msg);
    } finally {
      setConverting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Lead Pipeline</h1>
          <p className="page-sub">Move leads through stages with one click</p>
        </div>
        <Link href="/pipeline/new" className="btn btn-primary btn-sm">
          <Plus size={13} />
          Add Lead
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, minHeight: 'calc(100vh - 200px)' }}>
        {STAGES.map((stage) => {
          const stageLeads   = byStage(stage.key);
          const urlMatch     = stageFilter === stage.key;
          const aiStageMatch = isHighlighted('lead-stage', stage.key);
          const anyAiStage   = hasAnyHighlight('lead-stage');
          const shouldDim    = (stageFilter && !urlMatch) || (anyAiStage && !aiStageMatch);
          return (
            <div
              key={stage.key}
              style={{ minWidth: 240, maxWidth: 240, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, opacity: shouldDim ? 0.35 : 1, transition: 'opacity 0.25s ease' }}
            >
              <div
                className={aiStageMatch === 'glow' ? 'ai-highlight-glow' : ''}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderTop: `3px solid ${stage.color}`, borderRadius: 10 }}
              >
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stage.label}
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: stage.color, background: `${stage.color}18`, border: `1px solid ${stage.color}40`, borderRadius: 12, padding: '2px 8px' }}>
                  {stageLeads.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {stageLeads.map((lead) => {
                  const idx       = STAGE_KEYS.indexOf(lead.stage);
                  const nextStage = idx >= 0 && idx < STAGE_KEYS.length - 1 ? STAGES[idx + 1] : null;
                  const isPending = pending.has(lead.id);
                  return (
                    <div key={lead.id} style={{ padding: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10 }}>
                      <Link href={`/pipeline/${lead.id}`} style={{ fontWeight: 700, fontSize: '0.83rem', color: 'var(--white)', marginBottom: 6, textDecoration: 'none', display: 'block', lineHeight: 1.3 }}>
                        {lead.businessName}
                      </Link>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span className={`badge ${priorityBadge[lead.priority]}`} style={{ fontSize: '0.64rem' }}>
                          {lead.priority}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--gray)', marginBottom: 4 }}>{lead.industry}</div>
                      {lead.estimatedValue && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--green)', fontWeight: 600 }}>{fmt(lead.estimatedValue)}</div>
                      )}
                      {lead.city && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 2 }}>{lead.city}</div>
                      )}
                      {lead.stage === 'DEMO_SCHEDULED' && lead.demoDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontSize: '0.7rem', color: 'var(--primary)' }}>
                          <Calendar size={10} />
                          {new Date(lead.demoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}

                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <select
                          className="input"
                          value={lead.stage}
                          onChange={(e) => handleStageChange(lead, e.target.value)}
                          disabled={isPending}
                          style={{ fontSize: '0.72rem', height: 28, padding: '0 8px' }}
                        >
                          {STAGES.map((s) => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                        {nextStage && (
                          <button type="button" className="btn btn-ghost btn-sm" disabled={isPending} onClick={() => advanceStage(lead)} style={{ fontSize: '0.7rem', justifyContent: 'center' }}>
                            <ChevronRight size={11} />
                            {nextStage.label}
                          </button>
                        )}
                        {PROPOSAL_STAGES.has(lead.stage) && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => openProposal(lead)}
                            style={{ fontSize: '0.7rem', justifyContent: 'center', color: '#14B8AD', borderColor: 'rgba(20,184,173,0.35)' }}
                          >
                            <Send size={11} />
                            Send Proposal
                          </button>
                        )}
                        {CONVERT_STAGES.has(lead.stage) && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => openConvert(lead)}
                            style={{ fontSize: '0.7rem', justifyContent: 'center', color: 'var(--orange)', borderColor: 'rgba(249,115,22,0.35)' }}
                          >
                            <UserPlus size={11} />
                            Convert to Client
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {stageLeads.length === 0 && (
                  <div style={{ padding: '20px 14px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)', borderRadius: 10, textAlign: 'center', fontSize: '0.75rem', color: 'var(--gray)' }}>
                    No leads
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Send Proposal modal ─────────────────────────────────────────────── */}
      {proposalLead && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}
          onClick={() => !propSending && setProposalLead(null)}
        >
          <div className="card" style={{ width: '100%', maxWidth: 560, padding: 28, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            {propResult ? (
              // Success state
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ fontSize: 32, color: '#14B8AD', marginBottom: 10 }}>✓</div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#14B8AD', marginBottom: 8 }}>Proposal Sent!</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 16 }}>
                  {proposalLead.businessName} received proposal <strong style={{ color: 'var(--light)' }}>{propResult.proposalNumber}</strong>.
                  Lead moved to Proposal Sent.
                </p>
                <div style={{ background: 'rgba(20,184,173,0.06)', border: '1px solid rgba(20,184,173,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 6 }}>Sign Link (share manually if email unavailable)</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      readOnly
                      value={propResult.signUrl}
                      style={{ flex: 1, background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 10px', color: '#14B8AD', fontSize: '0.75rem', outline: 'none' }}
                    />
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigator.clipboard.writeText(propResult!.signUrl)}
                      style={{ fontSize: '0.7rem', flexShrink: 0 }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setProposalLead(null)}>Done</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 4 }}>Send Proposal</h2>
                    <p style={{ fontSize: '0.78rem', color: 'var(--gray)', margin: 0 }}>{proposalLead.businessName}{proposalLead.email ? ` — ${proposalLead.email}` : ''}</p>
                  </div>
                  <button onClick={() => setProposalLead(null)} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                {/* Package tier */}
                <div style={{ marginBottom: 16 }}>
                  <label className="label">Package Tier</label>
                  <select className="input" value={propPkg} onChange={(e) => setPropPkg(e.target.value)}>
                    <option value="STARTER">Starter</option>
                    <option value="GROWTH">Growth</option>
                    <option value="PRO">Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                {/* Products */}
                <div style={{ marginBottom: 16 }}>
                  <label className="label">Products & Services</label>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    {SS_PRODUCTS.map((p, i) => (
                      <label
                        key={p.id}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', cursor: 'pointer', borderBottom: i < SS_PRODUCTS.length - 1 ? '1px solid var(--border)' : 'none', background: propChecked.has(p.id) ? 'rgba(20,184,173,0.05)' : 'transparent', gap: 10 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                          <input type="checkbox" checked={propChecked.has(p.id)} onChange={() => toggleProduct(p.id)} style={{ accentColor: '#14B8AD', width: 14, height: 14 }} />
                          <span style={{ fontSize: '0.8rem', color: propChecked.has(p.id) ? 'var(--white)' : 'var(--gray)' }}>{p.name}</span>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#14B8AD', fontWeight: 600, flexShrink: 0 }}>${p.price.toLocaleString()}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Custom items */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="label" style={{ margin: 0 }}>Custom Items</label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setPropCustom((c) => [...c, { name: '', price: '' }])}
                      style={{ fontSize: '0.68rem' }}
                    >
                      <Plus size={10} />
                      Add Row
                    </button>
                  </div>
                  {propCustom.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {propCustom.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            className="input"
                            placeholder="Item name"
                            value={item.name}
                            onChange={(e) => setPropCustom((c) => c.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                            style={{ flex: 2, fontSize: '0.8rem', height: 32 }}
                          />
                          <input
                            className="input"
                            placeholder="Price"
                            type="number"
                            value={item.price}
                            onChange={(e) => setPropCustom((c) => c.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                            style={{ flex: 1, fontSize: '0.8rem', height: 32 }}
                          />
                          <button
                            type="button"
                            onClick={() => setPropCustom((c) => c.filter((_, j) => j !== i))}
                            style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', padding: 4 }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Monthly + totals */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                  <div>
                    <label className="label">Monthly Monitoring ($)</label>
                    <input className="input" type="number" value={propMonthly} onChange={(e) => setPropMonthly(e.target.value)} placeholder="e.g. 49" min="0" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 0 4px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 4 }}>One-Time Total</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: propOneTimeTotal > 0 ? '#14B8AD' : 'var(--gray)' }}>
                      ${propOneTimeTotal.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div style={{ marginBottom: 20 }}>
                  <label className="label">Message (optional)</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={propMessage}
                    onChange={(e) => setPropMessage(e.target.value)}
                    placeholder="Add a personal message to include in the proposal email..."
                    style={{ resize: 'vertical', fontSize: '0.82rem' }}
                  />
                </div>

                {!proposalLead.email && (
                  <div style={{ padding: '10px 14px', background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, marginBottom: 14, fontSize: '0.76rem', color: '#d1d5db' }}>
                    No email on file — proposal will be created but not emailed. Copy the sign link from the success screen.
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, background: '#14B8AD', color: '#000' }}
                    disabled={propSending}
                    onClick={handleSendProposal}
                  >
                    <Send size={13} />
                    {propSending ? 'Sending...' : 'Send Proposal'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setProposalLead(null)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Convert to Client modal ────────────────────────────────────────── */}
      {convertLead && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => !converting && setConvertLead(null)}
        >
          <div className="card" style={{ width: '100%', maxWidth: 460, padding: 28 }} onClick={(e) => e.stopPropagation()}>
            {convertResult ? (
              // Success state
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 10, color: 'var(--green)' }}>✓</div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>Conversion Complete</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 20 }}>
                  {convertLead.businessName} is now an active client.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20, textAlign: 'left', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.77rem', color: 'var(--light)' }}>&#10003; Client profile created</div>
                  <div style={{ fontSize: '0.77rem', color: 'var(--light)' }}>&#10003; Setup invoice created (due in 7 days)</div>
                  <div style={{ fontSize: '0.77rem', color: 'var(--light)' }}>&#10003; Monthly billing activated</div>
                  <div style={{ fontSize: '0.77rem', color: 'var(--light)' }}>&#10003; Install appointment: {convertResult.appointmentDate} at 9:00 AM</div>
                  <div style={{ fontSize: '0.77rem', color: 'var(--light)' }}>&#10003; Lead moved to On Retainer</div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setConvertLead(null)}>Done</button>
              </div>
            ) : (
              // Convert form
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 4 }}>Convert to Client</h2>
                    <p style={{ fontSize: '0.78rem', color: 'var(--gray)', margin: 0 }}>{convertLead.businessName}</p>
                  </div>
                  <button onClick={() => setConvertLead(null)} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                {/* Lead summary */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: '0.74rem' }}>
                  {convertLead.contactName && <div style={{ color: 'var(--gray)' }}>Contact: <span style={{ color: 'var(--light)' }}>{convertLead.contactName}</span></div>}
                  {convertLead.email       && <div style={{ color: 'var(--gray)' }}>Email: <span style={{ color: 'var(--light)' }}>{convertLead.email}</span></div>}
                  {convertLead.phone       && <div style={{ color: 'var(--gray)' }}>Phone: <span style={{ color: 'var(--light)' }}>{convertLead.phone}</span></div>}
                  {convertLead.city        && <div style={{ color: 'var(--gray)' }}>City: <span style={{ color: 'var(--light)' }}>{convertLead.city}</span></div>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Package Tier</label>
                    <select className="input" value={convertPkg} onChange={(e) => setConvertPkg(e.target.value)}>
                      <option value="STARTER">Starter</option>
                      <option value="GROWTH">Growth</option>
                      <option value="PRO">Pro</option>
                      <option value="ENTERPRISE">Enterprise</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Setup Fee ($)</label>
                    <input className="input" type="number" value={convertSetup} onChange={(e) => setConvertSetup(e.target.value)} placeholder="e.g. 2146" min="0" />
                  </div>
                  <div>
                    <label className="label">Monthly ($)</label>
                    <input className="input" type="number" value={convertMonthly} onChange={(e) => setConvertMonthly(e.target.value)} placeholder="e.g. 49" min="0" />
                  </div>
                </div>

                <div style={{ padding: '10px 14px', background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, marginBottom: 18, fontSize: '0.74rem', color: '#d1d5db', lineHeight: 1.5 }}>
                  Creates: <strong style={{ color: 'var(--orange)' }}>Client profile</strong> + <strong style={{ color: 'var(--orange)' }}>Invoice</strong> + <strong style={{ color: 'var(--orange)' }}>Recurring billing</strong> + <strong style={{ color: 'var(--orange)' }}>Install appointment</strong> — and moves lead to On Retainer.
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={converting} onClick={handleConvert}>
                    {converting ? 'Creating records...' : 'Convert & Create All Records'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setConvertLead(null)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Demo date modal ──────────────────────────────────────────────────── */}
      {demoModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setDemoModal(null)}
        >
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 28 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 4 }}>Schedule Demo</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--gray)', margin: 0 }}>{demoModal.businessName}</p>
              </div>
              <button onClick={() => setDemoModal(null)} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label className="label">Demo Date *</label>
                <input className="input" type="date" required value={demoDate} onChange={(e) => setDemoDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <label className="label">Time</label>
                <input className="input" type="time" value={demoTime} onChange={(e) => setDemoTime(e.target.value)} />
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, marginBottom: 18, fontSize: '0.76rem', color: '#93C5FD' }}>
              If Google Calendar is connected, a calendar event will be created automatically.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!demoDate} onClick={confirmDemo}>
                <Calendar size={13} />
                Confirm Demo
              </button>
              <button className="btn btn-ghost" onClick={() => setDemoModal(null)}>Skip Date</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
