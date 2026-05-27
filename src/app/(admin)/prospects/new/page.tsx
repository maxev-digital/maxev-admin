'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const INDUSTRIES = [
  'Home Services', 'Restaurant', 'Dental', 'Legal', 'Real Estate', 'Automotive',
  'Healthcare', 'Fitness', 'Beauty', 'Technology', 'Roofing', 'HVAC', 'Plumbing',
  'Electrical', 'Landscaping', 'Cleaning', 'Childcare', 'Education', 'Finance', 'Retail',
];

export default function NewProspectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    city: '',
    state: '',
    source: '',
    presenceScore: '',
    outreachStatus: 'COLD',
    notes: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create prospect');
      router.push('/prospects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create prospect');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Add Prospect</h1>
          <p className="page-sub">Track a new outreach target</p>
        </div>
        <Link href="/prospects" className="btn btn-ghost btn-sm">Cancel</Link>
      </div>

      <div style={{ maxWidth: 700 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Business Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Business Name *</label>
                <input className="input" value={form.businessName} onChange={(e) => set('businessName', e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="label">Industry *</label>
                <select className="input" value={form.industry} onChange={(e) => set('industry', e.target.value)} required>
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="label">Contact Name</label>
                <input className="input" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="label">Phone</label>
                <input className="input" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Website</label>
                <input className="input" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="example.com" />
              </div>
              <div className="input-group">
                <label className="label">City</label>
                <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="label">State</label>
                <input className="input" value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="TX" />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Outreach</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div className="input-group">
                <label className="label">Status</label>
                <select className="input" value={form.outreachStatus} onChange={(e) => set('outreachStatus', e.target.value)}>
                  <option value="COLD">Cold</option>
                  <option value="WARM">Warm</option>
                  <option value="HOT">Hot</option>
                  <option value="DEMO_BOOKED">Demo Booked</option>
                </select>
              </div>
              <div className="input-group">
                <label className="label">Source</label>
                <input className="input" value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="e.g. DFW Daily" />
              </div>
              <div className="input-group">
                <label className="label">Presence Score</label>
                <input className="input" type="number" min="0" max="100" value={form.presenceScore} onChange={(e) => set('presenceScore', e.target.value)} placeholder="0-100" />
              </div>
            </div>
            <div className="input-group" style={{ marginTop: 14 }}>
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={3}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: '0.82rem', color: '#EF4444' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Prospect'}
            </button>
            <Link href="/prospects" className="btn btn-ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </>
  );
}
