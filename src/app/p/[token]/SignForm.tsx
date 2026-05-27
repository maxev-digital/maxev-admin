'use client';

import { useState } from 'react';

interface Props {
  proposalId: string;
  signToken:  string;
  defaultName: string;
  proposalNumber: string;
}

export default function SignForm({ proposalId, signToken, defaultName, proposalNumber }: Props) {
  const [name,    setName]    = useState(defaultName);
  const [agreed,  setAgreed]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [err,     setErr]     = useState('');

  const handleSign = async () => {
    if (!name.trim() || !agreed) return;
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`/api/proposals/${proposalId}/sign`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ signToken, signerName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sign failed');
      setDone(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ width: 64, height: 64, background: 'rgba(20,184,173,0.15)', border: '2px solid #14B8AD', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>
          ✓
        </div>
        <h2 style={{ color: '#14B8AD', fontSize: '1.4rem', fontWeight: 800, margin: '0 0 10px' }}>Proposal Signed!</h2>
        <p style={{ color: '#999', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: 360, margin: '0 auto 24px' }}>
          Thank you, <strong style={{ color: '#fff' }}>{name}</strong>. Your signature on proposal <strong style={{ color: '#fff' }}>{proposalNumber}</strong> has been recorded.
          Our team will be in touch within 1 business day to confirm your installation appointment.
        </p>
        <div style={{ padding: '14px 20px', background: 'rgba(20,184,173,0.08)', border: '1px solid rgba(20,184,173,0.25)', borderRadius: 8, fontSize: '0.82rem', color: '#a7f3d0', maxWidth: 360, margin: '0 auto' }}>
          Check your inbox for a confirmation email with your appointment details.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Full Name (as signature)
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type your full name"
          style={{ width: '100%', padding: '12px 14px', background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', fontStyle: 'italic' }}
        />
      </div>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 24 }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          style={{ marginTop: 2, width: 16, height: 16, accentColor: '#14B8AD', flexShrink: 0 }}
        />
        <span style={{ fontSize: '0.84rem', color: '#ccc', lineHeight: 1.55 }}>
          I have reviewed the proposal above and agree to the scope of work, pricing, and terms outlined. I understand that signing this proposal authorizes SampleShield Security to proceed with scheduling installation.
        </span>
      </label>

      {err && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#fca5a5', fontSize: '0.82rem', marginBottom: 16 }}>
          {err}
        </div>
      )}

      <button
        onClick={handleSign}
        disabled={!name.trim() || !agreed || loading}
        style={{
          width: '100%', padding: '15px 24px', background: (!name.trim() || !agreed) ? '#1a1a1a' : '#14B8AD',
          color: (!name.trim() || !agreed) ? '#555' : '#000', border: 'none', borderRadius: 8,
          fontSize: '0.95rem', fontWeight: 800, cursor: (!name.trim() || !agreed) ? 'not-allowed' : 'pointer',
          letterSpacing: '0.03em', transition: 'background 0.2s',
        }}
      >
        {loading ? 'Signing...' : 'Sign & Accept Proposal'}
      </button>
    </div>
  );
}
