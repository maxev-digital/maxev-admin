'use client';

import { useMemo, useState } from 'react';
import { Plus, Copy, Check, Edit, Sparkles, X } from 'lucide-react';

type Template = {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
};

const TABS       = ['Email', 'SMS', 'Call Scripts'];
const INDUSTRIES = ['Home Services', 'Restaurant', 'Dental', 'Legal', 'Real Estate', 'Automotive', 'Healthcare', 'Fitness', 'Roofing', 'HVAC', 'Plumbing', 'Technology', 'Retail'];
const OBJECTIVES: Array<{ value: string; label: string }> = [
  { value: 'cold_outreach', label: 'Cold Outreach (1st touch)' },
  { value: 'follow_up',     label: 'Follow-Up' },
  { value: 'demo_request',  label: 'Book a Demo Call' },
  { value: 'check_in',      label: 'Client Check-In' },
];

function matchesTab(category: string, tab: string) {
  if (tab === 'Email') return /email|outreach|follow|demo/i.test(category);
  if (tab === 'SMS') return /sms|text/i.test(category);
  if (tab === 'Call Scripts') return /call|script/i.test(category);
  return true;
}

export default function TemplatesList({ templates }: { templates: Template[] }) {
  const [tab, setTab]       = useState('Email');
  const [copied, setCopied] = useState<string | null>(null);

  // AI Compose state
  const [showCompose, setShowCompose]     = useState(false);
  const [compIndustry, setCompIndustry]   = useState(INDUSTRIES[0]);
  const [compBiz, setCompBiz]             = useState('');
  const [compObj, setCompObj]             = useState('cold_outreach');
  const [compType, setCompType]           = useState<'email' | 'sms'>('email');
  const [compTone, setCompTone]           = useState<'professional' | 'casual' | 'urgent'>('professional');
  const [compLoading, setCompLoading]     = useState(false);
  const [compResult, setCompResult]       = useState<{ subject?: string; body: string } | null>(null);
  const [compCopied, setCompCopied]       = useState(false);
  const [compSaved, setCompSaved]         = useState(false);
  const [compError, setCompError]         = useState('');

  const visible = useMemo(
    () => templates.filter((t) => matchesTab(t.category, tab)),
    [templates, tab]
  );
  const list = visible.length > 0 ? visible : templates;

  async function compose() {
    if (!compBiz.trim()) { setCompError('Enter a business name.'); return; }
    setCompLoading(true);
    setCompError('');
    setCompResult(null);
    try {
      const res = await fetch('/api/ai/compose-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: compIndustry, businessName: compBiz.trim(), objective: compObj, type: compType, tone: compTone }),
      });
      const data = await res.json();
      setCompResult(data);
    } catch {
      setCompError('AI compose failed — check API key.');
    } finally {
      setCompLoading(false);
    }
  }

  function copyResult() {
    if (!compResult) return;
    const text = compResult.subject ? `Subject: ${compResult.subject}\n\n${compResult.body}` : compResult.body;
    navigator.clipboard.writeText(text);
    setCompCopied(true);
    setTimeout(() => setCompCopied(false), 2000);
  }

  async function saveTemplate() {
    if (!compResult) return;
    setCompSaved(false);
    try {
      await fetch('/api/outreach/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:     `${compObj.replace('_', ' ')} — ${compIndustry} (${compBiz || 'Generic'})`,
          category: compType === 'email' ? 'Cold Email' : 'SMS',
          subject:  compResult.subject ?? '',
          bodyText: compResult.body,
          industry: compIndustry,
        }),
      });
      setCompSaved(true);
      setTimeout(() => setCompSaved(false), 3000);
    } catch {
      // silent fail
    }
  }

  const copy = (t: Template) => {
    const text = `Subject: ${t.subject}\n\n${t.body}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(t.id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Templates</h1>
          <p className="page-sub">Email, SMS and call script library</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setShowCompose(true); setCompResult(null); setCompError(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={13} /> AI Compose
          </button>
          <button type="button" className="btn btn-ghost btn-sm">
            <Plus size={13} /> New Template
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {list.map((t) => {
          const isCopied = copied === t.id;
          return (
            <div key={t.id} className="card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--white)', marginBottom: 4 }}>{t.name}</div>
                  <span className="badge badge-blue" style={{ fontSize: '0.66rem' }}>{t.category}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-ghost btn-sm">
                    <Edit size={12} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${isCopied ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => copy(t)}
                  >
                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                    {isCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginBottom: 10 }}>
                Subject: <span style={{ color: 'var(--light)' }}>{t.subject}</span>
              </div>
              <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', fontSize: '0.78rem', color: 'var(--gray)', lineHeight: 1.6, whiteSpace: 'pre-line', maxHeight: 160, overflow: 'hidden', position: 'relative' }}>
                {t.body}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(to bottom, transparent, var(--card2))' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Compose Modal */}
      {showCompose && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCompose(false); }}>
          <div style={{ width: '100%', maxWidth: 560, background: '#0a0a0f', border: '1px solid #1a1a2e', borderRadius: 14, padding: 32, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Sparkles size={14} style={{ color: '#818cf8' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#818cf8' }}>AI Compose</span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>Generate Outreach Message</h2>
              </div>
              <button type="button" onClick={() => setShowCompose(false)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #222', borderRadius: 8, padding: '6px 8px', color: '#888', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Industry</label>
                <select style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14 }}
                  value={compIndustry} onChange={(e) => setCompIndustry(e.target.value)}>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Business Name</label>
                <input style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                  placeholder="e.g. Smith Plumbing" value={compBiz} onChange={(e) => setCompBiz(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Objective</label>
                <select style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14 }}
                  value={compObj} onChange={(e) => setCompObj(e.target.value)}>
                  {OBJECTIVES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['email', 'sms'] as const).map((t) => (
                    <button key={t} type="button"
                      className={`btn btn-sm ${compType === t ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ flex: 1, textTransform: 'capitalize' }}
                      onClick={() => setCompType(t)}>{t.toUpperCase()}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tone</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['professional', 'casual', 'urgent'] as const).map((t) => (
                  <button key={t} type="button"
                    className={`btn btn-sm ${compTone === t ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, textTransform: 'capitalize' }}
                    onClick={() => setCompTone(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                ))}
              </div>
            </div>

            {compError && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 10 }}>{compError}</div>}

            {!compResult ? (
              <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={compose} disabled={compLoading}>
                <Sparkles size={13} /> {compLoading ? 'Composing...' : 'Generate Message'}
              </button>
            ) : (
              <>
                {compResult.subject && (
                  <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: 6 }}>
                    Subject: <span style={{ color: '#e0e0e0', fontWeight: 600 }}>{compResult.subject}</span>
                  </div>
                )}
                <textarea
                  style={{ width: '100%', minHeight: 180, background: '#111', border: '1px solid #222', borderRadius: 8, padding: '12px 14px', color: '#e0e0e0', fontSize: 13, lineHeight: 1.65, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  value={compResult.body}
                  onChange={(e) => setCompResult((prev) => prev ? { ...prev, body: e.target.value } : prev)}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={copyResult}>
                    <Copy size={12} /> {compCopied ? 'Copied!' : 'Copy'}
                  </button>
                  <button type="button" className={`btn btn-sm ${compSaved ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 2 }} onClick={saveTemplate}>
                    {compSaved ? <><Check size={12} /> Saved!</> : <><Plus size={12} /> Save to Library</>}
                  </button>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setCompResult(null); setCompBiz(''); }}>
                    New
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
