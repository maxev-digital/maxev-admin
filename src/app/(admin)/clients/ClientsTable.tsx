'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, DollarSign, TrendingUp, Plus, Search } from 'lucide-react';
import { useAIHighlight } from '@/lib/ai-highlight';

type Client = {
  id: string;
  businessName: string;
  industry: string;
  packageTier: string;
  status: string;
  mrr: number;
  city: string | null;
  launchDate: string | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const statusBadge: Record<string, string> = {
  ACTIVE: 'badge-green',
  PAUSED: 'badge-orange',
  CHURNED: 'badge-red',
  PROSPECT: 'badge-gray',
};

const packageBadge: Record<string, string> = {
  STARTER: 'badge-gray',
  GROWTH: 'badge-blue',
  PRO: 'badge-purple',
  ENTERPRISE: 'badge-orange',
  CUSTOM: 'badge-blue',
};

const STATUS_FILTERS = ['All', 'ACTIVE', 'PAUSED', 'CHURNED', 'PROSPECT'];

export default function ClientsTable({ clients }: { clients: Client[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { isHighlighted, hasAnyHighlight } = useAIHighlight();
  const navGlow = isHighlighted('nav-path', '/clients');
  const anyClientId = hasAnyHighlight('client-id');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (!term) return true;
      return (
        c.businessName.toLowerCase().includes(term) ||
        c.industry.toLowerCase().includes(term) ||
        (c.city ?? '').toLowerCase().includes(term)
      );
    });
  }, [clients, search, statusFilter]);

  const total = clients.length;
  const active = clients.filter((c) => c.status === 'ACTIVE').length;
  const mrr = clients.filter((c) => c.status === 'ACTIVE').reduce((s, c) => s + c.mrr, 0);
  const avgMrr = active > 0 ? mrr / active : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-sub">All agency clients and retainer accounts</p>
        </div>
        <Link href="/clients/new" className="btn btn-primary btn-sm">
          <Plus size={13} />
          Add Client
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className={`card-blue${navGlow ? ' ai-highlight-glow' : ''}`} style={{ padding: 20, transition: 'box-shadow 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className={`kpi-value${navGlow ? ' ai-text-fill' : ''}`}>{total}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total Clients</div>
        </div>
        <div className={`card-green${navGlow ? ' ai-highlight-glow' : ''}`} style={{ padding: 20, transition: 'box-shadow 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className={`kpi-value-green${navGlow ? ' ai-text-fill' : ''}`}>{active}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Active</div>
        </div>
        <div className={`card-blue${navGlow ? ' ai-highlight-glow' : ''}`} style={{ padding: 20, transition: 'box-shadow 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className={`kpi-value${navGlow ? ' ai-text-fill' : ''}`}>{fmt(mrr)}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">MRR Total</div>
        </div>
        <div className={`card-orange${navGlow ? ' ai-highlight-glow' : ''}`} style={{ padding: 20, transition: 'box-shadow 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className={`kpi-value-orange${navGlow ? ' ai-text-fill' : ''}`}>{fmt(avgMrr)}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Avg MRR / Client</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray)' }} />
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            style={{ paddingLeft: 32, fontSize: '0.82rem', height: 34 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.72rem' }}
            >
              {s === 'All' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Business Name</th>
                <th>Industry</th>
                <th>Package</th>
                <th>Status</th>
                <th>MRR</th>
                <th>City</th>
                <th>Launch Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ color: 'var(--gray)', textAlign: 'center', padding: 32 }}>
                    {clients.length === 0 ? 'No clients yet' : 'No clients match your filters'}
                  </td>
                </tr>
              ) : filtered.map((c) => {
                const aiEffect = isHighlighted('client-id', undefined, c.id);
                return (
                  <tr key={c.id} className={aiEffect === 'glow' ? 'ai-highlight-glow' : anyClientId && !aiEffect ? 'ai-highlight-dim' : ''}>
                    <td>
                      <Link href={`/clients/${c.id}`} style={{ color: 'var(--white)', fontWeight: 600 }}>
                        {c.businessName}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--light)' }}>{c.industry}</td>
                    <td>
                      <span className={`badge ${packageBadge[c.packageTier]}`}>{c.packageTier}</span>
                    </td>
                    <td>
                      <span className={`badge ${statusBadge[c.status]}`}>{c.status}</span>
                    </td>
                    <td style={{ color: 'var(--green)', fontWeight: 600 }} className={aiEffect === 'glow' ? 'ai-text-fill' : ''}>{fmt(c.mrr)}</td>
                    <td style={{ color: 'var(--light)' }}>{c.city ?? '—'}</td>
                    <td style={{ color: 'var(--gray)' }}>
                      {c.launchDate
                        ? new Date(c.launchDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    <td>
                      <Link href={`/clients/${c.id}`} className="btn btn-ghost btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
