'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';

const INDUSTRIES = [
  'Residential', 'Home Security', 'Commercial Real Estate', 'Property Management',
  'Home Services', 'Restaurant', 'Dental', 'Legal', 'Real Estate', 'Automotive',
  'Healthcare', 'Fitness', 'Beauty', 'Technology', 'Roofing', 'HVAC', 'Plumbing',
  'Electrical', 'Landscaping', 'Cleaning', 'Childcare', 'Education', 'Finance', 'Retail',
];

export default function NewClientPage() {
  const router   = useRouter();
  const params   = useSearchParams();
  const fromLead = params.has('businessName');

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    businessName: params.get('businessName') ?? '',
    contactName:  params.get('contactName')  ?? '',
    email:        params.get('email')        ?? '',
    phone:        params.get('phone')        ?? '',
    website:      '',
    industry:     params.get('industry')     ?? '',
    city:         params.get('city')         ?? '',
    state:        params.get('state')        ?? '',
    packageTier:  'STARTER',
    mrr:          '',
    notes:        '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create client');
      router.push('/clients');
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Ensure the industry from the lead is available in the list
  const industryOptions = form.industry && !INDUSTRIES.includes(form.industry)
    ? [form.industry, ...INDUSTRIES]
    : INDUSTRIES;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Add Client</h1>
          <p className="page-sub">Create a new client account</p>
        </div>
        <Link href="/clients" className="btn btn-ghost btn-sm">Cancel</Link>
      </div>

      <div style={{ maxWidth: 700 }}>
        {fromLead && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
            background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)',
            borderRadius: 10, marginBottom: 20, fontSize: '0.8rem', color: '#f97316',
          }}>
            <UserPlus size={14} />
            Pre-filled from lead record — review and add any missing details below.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Business Info</div>
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
                  {industryOptions.map((i) => <option key={i} value={i}>{i}</option>)}
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
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Package & Revenue</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="input-group">
                <label className="label">Package Tier</label>
                <select className="input" value={form.packageTier} onChange={(e) => set('packageTier', e.target.value)}>
                  <option value="STARTER">Starter</option>
                  <option value="GROWTH">Growth</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
              <div className="input-group">
                <label className="label">Monthly Retainer (MRR)</label>
                <input className="input" type="number" value={form.mrr} onChange={(e) => set('mrr', e.target.value)} placeholder="0" min="0" />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Notes</div>
            <div className="input-group">
              <textarea
                className="input"
                rows={4}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Any notes about this client..."
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Client'}
            </button>
            <Link href="/clients" className="btn btn-ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </>
  );
}
