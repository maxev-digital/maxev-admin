'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Zap } from 'lucide-react';

export default function DemoLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/demo/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Invalid credentials');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 60%, #0f0f1a 100%)',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: 420, padding: '0 24px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <Zap size={28} color="#6366f1" fill="#6366f1" />
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>MAX EV Digital</span>
          </div>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>Private Demo Access</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, padding: '36px 32px',
        }}>
          <h1 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px' }}>Welcome to your demo</h1>
          <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: '0 0 28px' }}>
            Sign in with the credentials sent to you.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff', fontSize: '0.9rem', outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff', fontSize: '0.9rem', outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                color: '#fca5a5', fontSize: '0.82rem',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: loading ? '#4f46e5' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#fff', fontSize: '0.9rem', fontWeight: 700, display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : <><Lock size={16} /> Access Demo</>}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#4b5563', fontSize: '0.75rem', marginTop: 20 }}>
          This is a private demo environment. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
