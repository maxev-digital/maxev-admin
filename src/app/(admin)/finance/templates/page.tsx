'use client';

import { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Eye, Copy, X, Check } from 'lucide-react';

type TemplateType = 'Proposals' | 'Contracts' | 'Statements of Work' | 'Onboarding' | 'Delivery' | 'Document';

type Template = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  content: string | null;
  createdAt: string;
  updatedAt: string;
};

const CATEGORY_BADGE: Record<string, string> = {
  'Proposals':          'badge-blue',
  'Contracts':          'badge-purple',
  'Statements of Work': 'badge-orange',
  'Onboarding':         'badge-green',
  'Delivery':           'badge-gray',
  'Document':           'badge-gray',
};

const CATEGORY_ICON_BG: Record<string, string> = {
  'Proposals':          'rgba(37,99,235,0.12)',
  'Contracts':          'rgba(155,89,182,0.12)',
  'Statements of Work': 'rgba(229,90,43,0.12)',
  'Onboarding':         'rgba(0,212,200,0.12)',
  'Delivery':           'rgba(255,255,255,0.06)',
  'Document':           'rgba(255,255,255,0.06)',
};

const CATEGORY_ICON_COLOR: Record<string, string> = {
  'Proposals':          'var(--primary)',
  'Contracts':          'var(--purple, #9B59B6)',
  'Statements of Work': 'var(--orange)',
  'Onboarding':         'var(--green)',
  'Delivery':           'var(--gray)',
  'Document':           'var(--gray)',
};

const ALL_TABS = ['All', 'Proposals', 'Contracts', 'Statements of Work', 'Onboarding', 'Delivery'] as const;
const TYPE_OPTIONS = ['Proposals', 'Contracts', 'Statements of Work', 'Onboarding', 'Delivery', 'Document'];

const EMPTY_FORM = { name: '', type: 'Proposals', description: '', content: '' };

export default function FinanceTemplatesPage() {
  const [templates, setTemplates]   = useState<Template[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('All');
  const [copied, setCopied]         = useState<string | null>(null);

  const [showModal, setShowModal]   = useState(false);
  const [editTarget, setEdit]       = useState<Template | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formMsg, setFormMsg]       = useState('');

  const [preview, setPreview]       = useState<Template | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/finance/templates');
      if (r.ok) setTemplates(await r.json());
    } finally { setLoading(false); }
  }

  const filtered = useMemo(
    () => activeTab === 'All' ? templates : templates.filter((t) => t.type === activeTab),
    [templates, activeTab],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of templates) { counts[t.type] = (counts[t.type] ?? 0) + 1; }
    return counts;
  }, [templates]);

  function openNew() {
    setForm(EMPTY_FORM);
    setFormMsg('');
    setEdit(null);
    setShowModal(true);
  }

  function openEdit(t: Template) {
    setForm({ name: t.name, type: t.type, description: t.description ?? '', content: t.content ?? '' });
    setFormMsg('');
    setEdit(t);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormMsg('Name is required.'); return; }
    setSaving(true);
    try {
      let r: Response;
      if (editTarget) {
        r = await fetch(`/api/finance/templates/${editTarget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        r = await fetch('/api/finance/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      if (r.ok) { setShowModal(false); setEdit(null); load(); }
      else { const d = await r.json(); setFormMsg(d.error ?? 'Save failed.'); }
    } finally { setSaving(false); }
  }

  function handleUse(t: Template) {
    if (t.type === 'Proposals') {
      window.location.href = '/proposals/new';
      return;
    }
    const text = t.content ?? t.name;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(t.id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Document Templates</h1>
          <p className="page-sub">Reusable contracts, proposals, SOWs, and onboarding documents</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={openNew}>
          <Plus size={13} />
          New Template
        </button>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
        {(['Proposals', 'Contracts', 'Statements of Work', 'Onboarding', 'Delivery'] as const).map((cat) => (
          <div
            key={cat}
            className="card"
            style={{
              padding: '16px 18px', cursor: 'pointer',
              border: activeTab === cat ? '1px solid rgba(37,99,235,0.4)' : undefined,
              transition: 'border-color 0.15s',
            }}
            onClick={() => setActiveTab(activeTab === cat ? 'All' : cat)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.8rem', lineHeight: 1,
                background: cat === 'Proposals' ? 'linear-gradient(135deg,#2563EB 0%,#60A5FA 100%)'
                  : cat === 'Contracts' ? 'linear-gradient(135deg,#9B59B6 0%,#C4B5FD 100%)'
                  : cat === 'Statements of Work' ? 'linear-gradient(135deg,#E55A2B 0%,#FB923C 100%)'
                  : cat === 'Onboarding' ? 'linear-gradient(135deg,#059669 0%,#34D399 100%)'
                  : 'linear-gradient(135deg,#888 0%,#bbb 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                {categoryCounts[cat] ?? 0}
              </div>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: CATEGORY_ICON_BG[cat],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FileText size={13} style={{ color: CATEGORY_ICON_COLOR[cat] }} />
              </div>
            </div>
            <div className="kpi-label" style={{ fontSize: '0.65rem' }}>{cat}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {ALL_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 14px', fontSize: '0.78rem', fontWeight: 600,
              color: activeTab === tab ? 'var(--white)' : 'var(--gray)',
              background: 'none', border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -1, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            {tab}
            {tab !== 'All' && (
              <span style={{
                marginLeft: 6, padding: '1px 6px', borderRadius: 999,
                fontSize: '0.6rem',
                background: activeTab === tab ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.06)',
                color: activeTab === tab ? '#93C5FD' : 'var(--gray)',
              }}>
                {categoryCounts[tab] ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gray)', fontSize: '0.85rem' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {filtered.map((t) => (
            <div key={t.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 8,
                  background: CATEGORY_ICON_BG[t.type] ?? 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <FileText size={16} style={{ color: CATEGORY_ICON_COLOR[t.type] ?? 'var(--gray)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--white)', fontSize: '0.88rem', lineHeight: 1.3, marginBottom: 6 }}>
                    {t.name}
                  </div>
                  <span className={`badge ${CATEGORY_BADGE[t.type] ?? 'badge-gray'}`} style={{ fontSize: '0.62rem' }}>
                    {t.type}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--gray)', lineHeight: 1.55, flex: 1 }}>
                {t.description || <span style={{ fontStyle: 'italic' }}>No description.</span>}
              </p>

              <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>
                Modified {new Date(t.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>

              <div style={{ display: 'flex', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => handleUse(t)}
                >
                  {copied === t.id ? <Check size={12} /> : <Copy size={12} />}
                  {copied === t.id ? 'Copied!' : t.type === 'Proposals' ? 'Use Template' : 'Copy Content'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreview(t)}>
                  <Eye size={12} />
                  Preview
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>
                  Edit
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 0', color: 'var(--gray)', fontSize: '0.85rem' }}>
              No templates in this category yet.{' '}
              <button onClick={openNew} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Create one
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 16, textAlign: 'right', fontSize: '0.75rem', color: 'var(--gray)' }}>
        Showing {filtered.length} of {templates.length} templates
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto', padding: 28, position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>{editTarget ? 'Edit Template' : 'New Template'}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Template Name</label>
                <input
                  className="input"
                  placeholder="e.g. Monthly Retainer Agreement"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Type</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Description</label>
                <input
                  className="input"
                  placeholder="Brief description of this template"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Content</label>
                <textarea
                  className="input"
                  rows={8}
                  placeholder="Paste or type the full template content here..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.78rem' }}
                />
              </div>
              {formMsg && <p style={{ fontSize: '0.78rem', color: 'var(--red)' }}>{formMsg}</p>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editTarget ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 28, position: 'relative' }}>
            <button onClick={() => setPreview(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 4 }}>{preview.name}</h3>
              <span className={`badge ${CATEGORY_BADGE[preview.type] ?? 'badge-gray'}`} style={{ fontSize: '0.62rem' }}>
                {preview.type}
              </span>
            </div>
            {preview.description && (
              <p style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 14 }}>{preview.description}</p>
            )}
            <div style={{
              flex: 1, overflowY: 'auto',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 16,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: 'var(--light)',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {preview.content || <span style={{ color: 'var(--gray)', fontStyle: 'italic' }}>No content stored for this template.</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreview(null)}>Close</button>
              <button className="btn btn-primary btn-sm" onClick={() => { handleUse(preview); setPreview(null); }}>
                <Copy size={12} />
                Copy Content
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
