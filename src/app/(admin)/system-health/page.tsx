'use client';

import { useEffect, useState, useCallback } from 'react';
import { Activity, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

interface ServiceResult {
  name: string;
  status: 'ok' | 'error' | 'unconfigured';
  latencyMs?: number;
  detail?: string;
}

interface HealthData {
  overall: 'ok' | 'degraded' | 'partial';
  checkedAt: string;
  services: ServiceResult[];
}

function StatusIcon({ status }: { status: ServiceResult['status'] }) {
  if (status === 'ok')           return <CheckCircle2 size={18} style={{ color: '#22c55e' }} />;
  if (status === 'error')        return <XCircle      size={18} style={{ color: '#ef4444' }} />;
  return                                <AlertTriangle size={18} style={{ color: '#f59e0b' }} />;
}

function statusColor(status: ServiceResult['status']) {
  if (status === 'ok')           return '#22c55e';
  if (status === 'error')        return '#ef4444';
  return                                '#f59e0b';
}

function overallBadge(overall: HealthData['overall']) {
  if (overall === 'ok')      return { label: 'All Systems Operational', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' };
  if (overall === 'degraded') return { label: 'Systems Degraded',        color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
  return                              { label: 'Partial Configuration',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
}

export default function SystemHealthPage() {
  const [data,    setData]    = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as HealthData;
      setData(json);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { runCheck(); }, [runCheck]);

  const badge = data ? overallBadge(data.overall) : null;

  return (
    <div style={{ padding: '32px 28px', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={22} style={{ color: 'var(--accent)' }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>System Health</h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gray)' }}>Platform connectivity &amp; API status</p>
          </div>
        </div>
        <button
          type="button"
          onClick={runCheck}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--card)', color: 'var(--text)', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 500, opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Checking...' : 'Run Check'}
        </button>
      </div>

      {/* Overall status banner */}
      {badge && data && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderRadius: 10, marginBottom: 24,
          background: badge.bg, border: `1px solid ${badge.color}33`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: badge.color, display: 'inline-block', boxShadow: `0 0 6px ${badge.color}` }} />
            <span style={{ fontWeight: 600, color: badge.color, fontSize: 14 }}>{badge.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--gray)', fontSize: 12 }}>
            <Clock size={12} />
            {new Date(data.checkedAt).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, marginBottom: 24 }}>
          Failed to reach health endpoint: {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[...Array(9)].map((_, i) => (
            <div key={i} style={{ padding: '18px 20px', borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border)', height: 80, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {/* Service cards */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {data.services.map((svc) => (
            <div
              key={svc.name}
              style={{
                padding: '18px 20px', borderRadius: 10,
                background: 'var(--card)', border: `1px solid var(--border)`,
                borderLeft: `3px solid ${statusColor(svc.status)}`,
                transition: 'box-shadow 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{svc.name}</div>
                  {svc.detail && (
                    <div style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.4 }}>{svc.detail}</div>
                  )}
                  {svc.status === 'error' && !svc.detail && (
                    <div style={{ fontSize: 12, color: '#ef4444' }}>Connection failed</div>
                  )}
                  {svc.status === 'unconfigured' && !svc.detail && (
                    <div style={{ fontSize: 12, color: '#f59e0b' }}>Not configured</div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <StatusIcon status={svc.status} />
                  {svc.latencyMs != null && (
                    <span style={{ fontSize: 11, color: 'var(--gray)' }}>{svc.latencyMs}ms</span>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${statusColor(svc.status)}22`, color: statusColor(svc.status), textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {svc.status}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary row */}
      {data && (
        <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
          {[
            { label: 'Online',        count: data.services.filter(s => s.status === 'ok').length,            color: '#22c55e' },
            { label: 'Errors',        count: data.services.filter(s => s.status === 'error').length,         color: '#ef4444' },
            { label: 'Unconfigured',  count: data.services.filter(s => s.status === 'unconfigured').length,  color: '#f59e0b' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ padding: '10px 18px', borderRadius: 8, background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color }}>{count}</span>
              <span style={{ fontSize: 12, color: 'var(--gray)' }}>{label}</span>
            </div>
          ))}
          <div style={{ padding: '10px 18px', borderRadius: 8, background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <span style={{ fontSize: 12, color: 'var(--gray)' }}>Total services checked:</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{data.services.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
