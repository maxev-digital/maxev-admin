'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      {/* Grid bg */}
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
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <Image
              src="/max-ev-digital_logo.png"
              alt="Max EV Digital"
              width={200}
              height={60}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <div
            style={{
              fontSize: '0.68rem',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--gray)',
            }}
          >
            Admin Panel
          </div>
        </div>

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

          <div className="input-group">
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: 38 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--gray)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '9px 12px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8,
                color: '#FCA5A5',
                fontSize: '0.8rem',
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            {loading ? (
              <span style={{ opacity: 0.7 }}>Signing in...</span>
            ) : (
              <>
                <LogIn size={14} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a
            href="/forgot-password"
            style={{ fontSize: '0.76rem', color: 'var(--gray)', textDecoration: 'none' }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'var(--primary)')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'var(--gray)')}
          >
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
}
