'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Check } from 'lucide-react';
import Image from 'next/image';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get('token') ?? '';

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!token) setError('Invalid or missing reset token.');
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }

    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Reset failed.'); return; }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-card">
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <Image src="/max-ev-digital_logo.png" alt="Max EV Digital" width={200} height={60} style={{ objectFit: 'contain' }} priority />
        </div>
        <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--gray)' }}>
          New Password
        </div>
      </div>

      {success ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Check size={22} style={{ color: 'var(--green)' }} />
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--white)', marginBottom: 8 }}>Password updated</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--gray)', lineHeight: 1.6 }}>Redirecting to login...</p>
        </div>
      ) : (
        <>
          {!token || error === 'Invalid or missing reset token.' ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ fontSize: '0.83rem', color: '#FCA5A5', marginBottom: 16 }}>This reset link is invalid or has expired.</p>
              <a href="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>Request a new reset link</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    style={{ paddingRight: 38 }}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className="input-group">
                <label className="label">Confirm Password</label>
                <input type="password" className="input" placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              {error && (
                <div style={{ padding: '9px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#FCA5A5', fontSize: '0.8rem', marginBottom: 16 }}>
                  {error}
                </div>
              )}
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? <span style={{ opacity: 0.7 }}>Updating...</span> : <><Lock size={14} /> Set New Password</>}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
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
      <Suspense fallback={<div className="login-card" style={{ textAlign: 'center', color: 'var(--gray)' }}>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
