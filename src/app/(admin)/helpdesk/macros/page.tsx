'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, MessageSquare, Plus, Trash2, X } from 'lucide-react';

interface Macro {
  id: string;
  title: string;
  body: string;
  category: string;
  useCount: number;
}

const CATEGORIES = ['General', 'Billing', 'Technical', 'Sales', 'Onboarding', 'Support', 'Urgent'];

function categoryBadge(cat: string) {
  const map: Record<string, string> = {
    Billing:    'badge badge-orange',
    Technical:  'badge badge-purple',
    Sales:      'badge badge-blue',
    Onboarding: 'badge badge-blue',
    Urgent:     'badge badge-red',
    Support:    'badge badge-gray',
    General:    'badge badge-gray',
  };
  return map[cat] ?? 'badge badge-gray';
}

function MacroCard({ macro, onCopy, onDelete }: { macro: Macro; onCopy: (m: Macro) => void; onDelete: (id: string) => void }) {
  const [copied, setCopied]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  function copyMacro() {
    navigator.clipboard.writeText(macro.body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    onCopy(macro);
  }

  async function deleteMacro() {
    setDeleting(true);
    await fetch(`/api/helpdesk/macros/${macro.id}`, { method: 'DELETE' });
    onDelete(macro.id);
  }

  const preview = macro.body.length > 120 ? macro.body.slice(0, 120) + '...' : macro.body;

  return (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--white)', marginBottom: 4 }}>{macro.title}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className={categoryBadge(macro.category)}>{macro.category}</span>
            {macro.useCount > 0 && (
              <span style={{ fontSize: '0.65rem', color: 'var(--gray)' }}>Used {macro.useCount}x</span>
            )}
          </div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MessageSquare size={14} style={{ color: '#60A5FA' }} />
        </div>
      </div>

      <p style={{ fontSize: '0.81rem', color: 'var(--gray)', lineHeight: 1.6, flex: 1 }}>{preview}</p>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ background: copied ? 'rgba(0,212,200,0.08)' : undefined, color: copied ? 'var(--green)' : undefined, border: copied ? '1px solid rgba(0,212,200,0.2)' : undefined, transition: 'all 0.2s' }}
          onClick={copyMacro}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={deleteMacro} disabled={deleting} style={{ marginLeft: 'auto' }}>
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

export default function MacrosPage() {
  const [macros, setMacros]     = useState<Macro[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showNew, setShowNew]   = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody]   = useState('');
  const [newCat, setNewCat]     = useState('General');
  const [saving, setSaving]     = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ title: string; reason: string }[]>([]);

  useEffect(() => {
    fetch('/api/helpdesk/macros')
      .then((r) => r.json())
      .then((d: Macro[]) => setMacros(d))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Derive AI suggestions from recent unresolved tickets
    fetch('/api/helpdesk/tickets')
      .then((r) => r.json())
      .then((tickets: { subject: string; category: string }[]) => {
        const catCounts: Record<string, number> = {};
        tickets.forEach((t) => { catCounts[t.category] = (catCounts[t.category] || 0) + 1; });
        const top = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 2);
        setAiSuggestions(
          top.map(([cat, count]) => ({
            title: `${cat} Quick Response`,
            reason: `${count} recent ticket${count !== 1 ? 's' : ''} in the ${cat} category`,
          }))
        );
      })
      .catch(() => {});
  }, []);

  async function createMacro() {
    if (!newTitle.trim() || !newBody.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/helpdesk/macros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), body: newBody.trim(), category: newCat }),
      });
      const created: Macro = await res.json();
      setMacros((prev) => [created, ...prev]);
      setShowNew(false);
      setNewTitle('');
      setNewBody('');
      setNewCat('General');
    } finally {
      setSaving(false);
    }
  }

  function handleCopy(macro: Macro) {
    fetch(`/api/helpdesk/macros/${macro.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incrementUse: true }),
    }).catch(() => {});
  }

  function handleDelete(id: string) {
    setMacros((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Macros & Canned Responses</h1>
          <p className="page-sub">Quick replies for common support questions</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={13} /> New Macro
        </button>
      </div>

      {aiSuggestions.length > 0 && (
        <div className="card-blue" style={{ padding: '18px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Sparkles size={15} style={{ color: '#60A5FA' }} />
            <span style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--white)' }}>AI Suggested Macros</span>
            <span style={{ fontSize: '0.65rem', color: '#60A5FA', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 999, padding: '2px 7px', fontWeight: 600 }}>Based on ticket history</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {aiSuggestions.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 14px', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--white)', marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--gray)' }}>{s.reason}</div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0 }}
                  onClick={() => { setNewTitle(s.title); setNewCat(s.title.split(' ')[0]); setShowNew(true); }}
                >
                  <Sparkles size={11} /> Create
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--gray)', padding: '40px 0', textAlign: 'center' }}>Loading...</div>
      ) : macros.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <MessageSquare size={32} style={{ color: 'var(--gray)', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontWeight: 700, color: 'var(--white)', marginBottom: 4 }}>No macros yet</div>
          <div style={{ color: 'var(--gray)', fontSize: '0.84rem', marginBottom: 16 }}>Create canned responses for common questions to save time.</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}><Plus size={13} /> Create First Macro</button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: 14 }}>
            Macro Library ({macros.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {macros.map((m) => (
              <MacroCard key={m.id} macro={m} onCopy={handleCopy} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}

      {showNew && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div style={{ width: '100%', maxWidth: 520, background: '#0a0a0f', border: '1px solid #1a1a2e', borderRadius: 14, padding: 32, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>New Macro</h2>
              <button type="button" onClick={() => setShowNew(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #222', borderRadius: 8, padding: '6px 8px', color: '#888', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title</label>
                <input
                  style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                  placeholder="e.g. Billing Question Response"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</label>
                <select
                  style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14 }}
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Response Body</label>
                <textarea
                  style={{ width: '100%', minHeight: 140, background: '#111', border: '1px solid #222', borderRadius: 8, padding: '10px 12px', color: '#e0e0e0', fontSize: 13, lineHeight: 1.65, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  placeholder="Type the canned response text. Use [PLACEHOLDERS] for dynamic fields."
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 18 }}
              onClick={createMacro}
              disabled={saving || !newTitle.trim() || !newBody.trim()}
            >
              {saving ? 'Saving...' : 'Save Macro'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
