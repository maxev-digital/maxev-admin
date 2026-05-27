'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const INDUSTRIES = [
  'Home Services', 'Restaurant', 'Dental', 'Legal', 'Real Estate', 'Automotive',
  'Healthcare', 'Fitness', 'Beauty', 'Technology', 'Roofing', 'HVAC', 'Plumbing',
  'Electrical', 'Landscaping', 'Cleaning', 'Childcare', 'Education', 'Finance', 'Retail',
];

type ClientForm = {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  industry: string;
  city: string;
  state: string;
  packageTier: string;
  status: string;
  mrr: string;
  notes: string;
};

const EMPTY_FORM: ClientForm = {
  businessName: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  industry: '',
  city: '',
  state: '',
  packageTier: 'STARTER',
  status: 'ACTIVE',
  mrr: '',
  notes: '',
};

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/clients/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load client');
        return r.json();
      })
      .then((c) => {
        setForm({
          businessName: c.businessName ?? '',
          contactName: c.contactName ?? '',
          email: c.email ?? '',
          phone: c.phone ?? '',
          website: c.website ?? '',
          industry: c.industry ?? '',
          city: c.city ?? '',
          state: c.state ?? '',
          packageTier: c.packageTier ?? 'STARTER',
          status: c.status ?? 'ACTIVE',
          mrr: c.mrr ? String(c.mrr) : '',
          notes: c.notes ?? '',
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load client'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k: keyof ClientForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to save client');
      router.push(`/clients/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save client');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--gray)' }}>
        Loading client...
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Edit Client</h1>
          <p className="page-sub">Update {form.businessName}</p>
        </div>
        <Link href={`/clients/${id}`} className="btn btn-ghost btn-sm">Cancel</Link>
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
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Package & Status</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
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
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="CHURNED">Churned</option>
                  <option value="PROSPECT">Prospect</option>
                </select>
              </div>
              <div className="input-group">
                <label className="label">MRR ($)</label>
                <input className="input" type="number" min="0" value={form.mrr} onChange={(e) => set('mrr', e.target.value)} />
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
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href={`/clients/${id}`} className="btn btn-ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </>
  );
}
