'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, Sparkles, X } from 'lucide-react';

const INDUSTRIES = [
  'Home Services', 'Restaurant', 'Dental', 'Legal', 'Real Estate', 'Automotive',
  'Healthcare', 'Fitness', 'Beauty', 'Technology', 'Roofing', 'HVAC', 'Plumbing',
  'Electrical', 'Landscaping', 'Cleaning', 'Childcare', 'Education', 'Finance', 'Retail',
];

type LineItem = { name: string; type: 'one_time' | 'monthly'; price: string };

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

export default function NewProposalPage() {
  const router = useRouter();
  const [loading, setLoading]           = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry]         = useState('');
  const [packageTier, setPackageTier]   = useState('STARTER');
  const [items, setItems]               = useState<LineItem[]>([{ name: '', type: 'one_time', price: '' }]);
  const [notes, setNotes]               = useState('');
  const [aiDrafting, setAiDrafting]     = useState(false);
  const [aiNarrative, setAiNarrative]   = useState('');
  const [aiError, setAiError]           = useState('');

  const addItem    = () => setItems((i) => [...i, { name: '', type: 'one_time', price: '' }]);
  const removeItem = (idx: number) => setItems((i) => i.filter((_, n) => n !== idx));
  const updateItem = (idx: number, k: keyof LineItem, v: string) =>
    setItems((i) => i.map((item, n) => (n === idx ? { ...item, [k]: v } : item)));

  const oneTimeTotal = items.filter((i) => i.type === 'one_time').reduce((s, i) => s + (parseFloat(i.price) || 0), 0);
  const monthlyTotal = items.filter((i) => i.type === 'monthly').reduce((s, i) => s + (parseFloat(i.price) || 0), 0);

  async function draftWithAI() {
    if (!businessName || !industry) {
      setAiError('Fill in Business Name and Industry first.');
      return;
    }
    setAiDrafting(true);
    setAiError('');
    setAiNarrative('');
    try {
      const res = await fetch('/api/ai/draft-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, industry, packageTier, lineItems: items, oneTimeTotal, monthlyTotal }),
      });
      const data = await res.json();
      setAiNarrative(data.narrative ?? '');
      setNotes(data.narrative ?? '');
    } catch {
      setAiError('AI draft failed — check your API key and try again.');
    } finally {
      setAiDrafting(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, industry, packageTier, lineItems: items, oneTimeTotal, monthlyTotal, notes: notes || null }),
      });
      if (!res.ok) throw new Error('Failed');
      router.push('/proposals');
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">New Proposal</h1>
          <p className="page-sub">Build a proposal with line items</p>
        </div>
        <Link href="/proposals" className="btn btn-ghost btn-sm">Cancel</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Client Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Business Name *</label>
                <input className="input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="label">Industry *</label>
                <select className="input" value={industry} onChange={(e) => setIndustry(e.target.value)} required>
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="label">Package Tier</label>
                <select className="input" value={packageTier} onChange={(e) => setPackageTier(e.target.value)}>
                  <option value="STARTER">Starter</option>
                  <option value="GROWTH">Growth</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Line Items</div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>
                <Plus size={12} /> Add Row
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 36px', gap: 8, fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 4px' }}>
                <span>Item Name</span><span>Type</span><span>Price</span><span></span>
              </div>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 36px', gap: 8, alignItems: 'center' }}>
                  <input className="input" placeholder="e.g. Website Design" value={item.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} />
                  <select className="input" value={item.type} onChange={(e) => updateItem(idx, 'type', e.target.value as 'one_time' | 'monthly')}>
                    <option value="one_time">One-Time</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <input className="input" type="number" placeholder="0" value={item.price} onChange={(e) => updateItem(idx, 'price', e.target.value)} min="0" />
                  <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* AI Narrative Section */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Proposal Narrative</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--gray)', marginTop: 3 }}>Intro paragraph sent with the proposal — or let AI write it</div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={draftWithAI}
                disabled={aiDrafting}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Sparkles size={13} />
                {aiDrafting ? 'Drafting...' : 'AI Draft'}
              </button>
            </div>
            {aiError && (
              <div style={{ fontSize: '0.78rem', color: '#f87171', marginBottom: 10 }}>{aiError}</div>
            )}
            {aiNarrative && !aiDrafting && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                  <Sparkles size={11} style={{ display: 'inline', marginRight: 4 }} />
                  AI draft applied — edit freely below
                </span>
                <button type="button" onClick={() => { setAiNarrative(''); setNotes(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)' }}>
                  <X size={12} />
                </button>
              </div>
            )}
            <textarea
              className="input"
              rows={6}
              placeholder="Write an intro for this proposal, or click AI Draft to generate one based on your line items and industry..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Proposal'}
            </button>
            <Link href="/proposals" className="btn btn-ghost">Cancel</Link>
          </div>
        </form>

        <div className="card" style={{ padding: 24, alignSelf: 'start' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Preview</div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--white)' }}>{businessName || 'Business Name'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: 3 }}>{industry || 'Industry'} — {packageTier}</div>
          </div>
          <div className="divider" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '14px 0' }}>
            {items.filter((i) => i.name).map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--light)' }}>{item.name}</span>
                <span style={{ color: item.type === 'monthly' ? 'var(--green)' : 'var(--white)', fontWeight: 600 }}>
                  {item.price ? fmt(parseFloat(item.price) || 0) : '—'}
                  {item.type === 'monthly' ? '/mo' : ''}
                </span>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
              <span style={{ color: 'var(--gray)' }}>One-Time Total</span>
              <span style={{ color: 'var(--white)', fontWeight: 700 }}>{fmt(oneTimeTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
              <span style={{ color: 'var(--gray)' }}>Monthly Total</span>
              <span style={{ color: 'var(--green)', fontWeight: 700 }}>{fmt(monthlyTotal)}/mo</span>
            </div>
          </div>
          {notes && (
            <>
              <div className="divider" style={{ margin: '14px 0' }} />
              <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Narrative Preview</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--light)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{notes.slice(0, 200)}{notes.length > 200 ? '...' : ''}</div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
