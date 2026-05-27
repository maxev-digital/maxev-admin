'use client';

import { useState } from 'react';
import { Mail, ArrowLeft, Check } from 'lucide-react';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(37,99,235,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,99,235,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, black 30%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <Image src="/max-ev-digital_logo.png" alt="Max EV Digital" width={200} height={60} style={{ objectFit: 'contain' }} priority />
          </div>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--gray)' }}>
            Password Reset
          </div>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={22} style={{ color: 'var(--green)' }} />
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--white)', marginBottom: 8 }}>Check your email</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 20, lineHeight: 1.6 }}>
              If an account exists for <strong style={{ color: 'var(--light)' }}>{email}</strong>, you will receive a reset link shortly.
            </p>
            <a href="/login" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <ArrowLeft size={13} /> Back to login
            </a>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.83rem', color: 'var(--gray)', marginBottom: 20, lineHeight: 1.6 }}>
              Enter your email address and we will send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="admin@maxevdigital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              {error && (
                <div style={{ padding: '9px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#FCA5A5', fontSize: '0.8rem', marginBottom: 16 }}>
                  {error}
                </div>
              )}
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? <span style={{ opacity: 0.7 }}>Sending...</span> : <><Mail size={14} /> Send Reset Link</>}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <a href="/login" style={{ fontSize: '0.76rem', color: 'var(--gray)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <ArrowLeft size={12} /> Back to login
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
