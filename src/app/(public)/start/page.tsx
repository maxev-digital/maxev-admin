'use client';

import { useState } from 'react';

const INDUSTRIES = [
  'HVAC', 'Roofing', 'Plumbing', 'Electrical', 'Restaurant',
  'Retail', 'Healthcare', 'Real Estate', 'Legal', 'Fitness',
  'Automotive', 'Beauty & Wellness', 'Dental', 'Landscaping', 'Other',
];

const SERVICES = [
  'Website Design & Development',
  'SEO & Local Search',
  'Social Media Management',
  'Email Marketing',
  'CRM & Automation',
  'Paid Advertising',
  'Full Digital Marketing Package',
  'Not Sure Yet',
];

export default function StartPage() {
  const [step, setStep]       = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [form, setForm] = useState({
    businessName:    '',
    contactName:     '',
    email:           '',
    phone:           '',
    industry:        '',
    serviceInterest: '',
    message:         '',
  });

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.businessName.trim() || !form.industry) {
      setError('Please fill in your business name and industry.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/public/lead', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Server error');
      setStep('success');
    } catch {
      setError('Something went wrong. Please try again or email info@maxevdigital.com');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.badge}>Max EV Digital</div>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h1 style={styles.heading}>You're on the list.</h1>
          <p style={styles.sub}>
            We'll review your info and reach out within one business day to schedule a free strategy call.
          </p>
          <p style={{ color: '#555', fontSize: 13, marginTop: 32 }}>
            Questions? Email us at{' '}
            <a href="mailto:info@maxevdigital.com" style={{ color: '#3B7DD9' }}>
              info@maxevdigital.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.badge}>Max EV Digital</div>
        <h1 style={styles.heading}>Let's grow your business.</h1>
        <p style={styles.sub}>
          Tell us about yourself and we'll put together a custom digital strategy — no obligation.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 32 }}>
          <div style={styles.row}>
            <Field label="Business Name *" required>
              <input
                style={styles.input}
                placeholder="Acme Roofing Co."
                value={form.businessName}
                onChange={(e) => set('businessName', e.target.value)}
                required
              />
            </Field>
            <Field label="Your Name">
              <input
                style={styles.input}
                placeholder="John Smith"
                value={form.contactName}
                onChange={(e) => set('contactName', e.target.value)}
              />
            </Field>
          </div>

          <div style={styles.row}>
            <Field label="Email">
              <input
                style={styles.input}
                type="email"
                placeholder="john@acmeroofing.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <input
                style={styles.input}
                type="tel"
                placeholder="(555) 555-5555"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Industry *" required>
            <select
              style={styles.input}
              value={form.industry}
              onChange={(e) => set('industry', e.target.value)}
              required
            >
              <option value="">Select your industry…</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </Field>

          <Field label="What are you looking for?">
            <select
              style={styles.input}
              value={form.serviceInterest}
              onChange={(e) => set('serviceInterest', e.target.value)}
            >
              <option value="">Select a service…</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>

          <Field label="Anything else we should know?">
            <textarea
              style={{ ...styles.input, minHeight: 90, resize: 'vertical' }}
              placeholder="Current challenges, goals, timeline…"
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
            />
          </Field>

          {error && (
            <div style={{ color: '#E05252', fontSize: 13, marginBottom: 16, padding: '10px 14px', background: 'rgba(224,82,82,0.1)', borderRadius: 8 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Submitting…' : 'Get My Free Strategy Review'}
          </button>

          <p style={{ color: '#444', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
            No spam. No pressure. We reply within 1 business day.
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight:      '100vh',
    background:     'radial-gradient(ellipse at 50% 0%, #0d1929 0%, #050508 60%)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '40px 16px',
  },
  card: {
    width:        '100%',
    maxWidth:     560,
    background:   '#0a0a0f',
    border:       '1px solid #1a1a2e',
    borderRadius: 16,
    padding:      '40px 36px',
    boxShadow:    '0 24px 80px rgba(0,0,0,0.6)',
  },
  badge: {
    display:       'inline-block',
    fontSize:      11,
    fontWeight:    700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color:         '#3B7DD9',
    marginBottom:  20,
  },
  heading: {
    fontSize:   28,
    fontWeight: 800,
    color:      '#fff',
    margin:     '0 0 12px',
    lineHeight: 1.2,
  },
  sub: {
    fontSize:   15,
    color:      '#888',
    lineHeight: 1.6,
    margin:     0,
  },
  row: {
    display:             'grid',
    gridTemplateColumns: '1fr 1fr',
    gap:                 16,
  },
  input: {
    width:        '100%',
    background:   '#111',
    border:       '1px solid #222',
    borderRadius: 8,
    padding:      '10px 14px',
    color:        '#fff',
    fontSize:     14,
    outline:      'none',
    boxSizing:    'border-box',
    transition:   'border-color 0.15s',
  },
  btn: {
    width:        '100%',
    padding:      '14px 0',
    background:   'linear-gradient(135deg, #3B7DD9 0%, #2563c7 100%)',
    color:        '#fff',
    border:       'none',
    borderRadius: 10,
    fontSize:     15,
    fontWeight:   700,
    cursor:       'pointer',
    letterSpacing: '0.02em',
  },
};
