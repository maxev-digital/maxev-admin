'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const INDUSTRIES = [
  'Home Services', 'Restaurant', 'Dental', 'Legal', 'Real Estate', 'Automotive',
  'Healthcare', 'Fitness', 'Beauty', 'Technology', 'Roofing', 'HVAC', 'Plumbing',
  'Electrical', 'Landscaping', 'Cleaning', 'Childcare', 'Education', 'Finance', 'Retail',
];

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    estimatedValue: '',
    stage: 'LEAD',
    priority: 'WARM',
    notes: '',
    demoDate: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed');
      router.push('/pipeline');
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Add Lead</h1>
          <p className="page-sub">Log a new prospect into the pipeline</p>
        </div>
        <Link href="/pipeline" className="btn btn-ghost btn-sm">Cancel</Link>
      </div>

      <div style={{ maxWidth: 700 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Lead Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Business Name *</label>
                <input className="input" value={form.businessName} onChange={(e) => set('businessName', e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="label">Contact Name</label>
                <input className="input" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="label">Industry *</label>
                <select className="input" value={form.industry} onChange={(e) => set('industry', e.target.value)} required>
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="label">Phone</label>
                <input className="input" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="label">City</label>
                <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="label">Source</label>
                <input className="input" value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="e.g. Cold Call, Referral" />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Pipeline Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="input-group">
                <label className="label">Stage</label>
                <select className="input" value={form.stage} onChange={(e) => set('stage', e.target.value)}>
                  <option value="LEAD">Lead</option>
                  <option value="DEMO_SCHEDULED">Demo Scheduled</option>
                  <option value="PROPOSAL_SENT">Proposal Sent</option>
                  <option value="CONTRACT_SIGNED">Contract Signed</option>
                </select>
              </div>
              <div className="input-group">
                <label className="label">Priority</label>
                <select className="input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                  <option value="HOT">Hot</option>
                  <option value="WARM">Warm</option>
                  <option value="COLD">Cold</option>
                </select>
              </div>
              <div className="input-group">
                <label className="label">Estimated Value ($)</label>
                <input className="input" type="number" value={form.estimatedValue} onChange={(e) => set('estimatedValue', e.target.value)} placeholder="0" min="0" />
              </div>
              <div className="input-group">
                <label className="label">Demo Date</label>
                <input className="input" type="datetime-local" value={form.demoDate} onChange={(e) => set('demoDate', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div className="input-group">
              <label className="label">Notes</label>
              <textarea className="input" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Lead'}
            </button>
            <Link href="/pipeline" className="btn btn-ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </>
  );
}
