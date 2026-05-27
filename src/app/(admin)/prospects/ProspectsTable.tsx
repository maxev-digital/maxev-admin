'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Users, Search } from 'lucide-react';

type Prospect = {
  id: string;
  businessName: string;
  industry: string;
  city: string | null;
  email: string | null;
  phone: string | null;
  presenceScore: number | null;
  outreachStatus: string;
  lastContactAt: string | null;
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const statusBadge: Record<string, string> = {
  COLD: 'badge-gray',
  WARM: 'badge-orange',
  HOT: 'badge-red',
  DEMO_BOOKED: 'badge-green',
  PROPOSAL_SENT: 'badge-blue',
  CONVERTED: 'badge-blue',
  UNINTERESTED: 'badge-gray',
  DEAD: 'badge-gray',
};

const gradeBadge = (score: number | null): { cls: string; label: string } => {
  if (score === null) return { cls: 'badge-gray', label: '—' };
  if (score >= 80) return { cls: 'badge-green', label: 'A' };
  if (score >= 60) return { cls: 'badge-blue', label: 'B' };
  if (score >= 40) return { cls: 'badge-orange', label: 'C' };
  if (score >= 20) return { cls: 'badge-orange', label: 'D' };
  return { cls: 'badge-red', label: 'F' };
};

const STATUS_FILTERS = ['All', 'COLD', 'WARM', 'HOT', 'DEMO_BOOKED', 'CONVERTED'];

export default function ProspectsTable({ prospects: initialProspects }: { prospects: Prospect[] }) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [pending, setPending] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return prospects.filter((p) => {
      if (statusFilter !== 'All' && p.outreachStatus !== statusFilter) return false;
      if (!term) return true;
      return (
        p.businessName.toLowerCase().includes(term) ||
        p.industry.toLowerCase().includes(term) ||
        (p.city ?? '').toLowerCase().includes(term) ||
        (p.email ?? '').toLowerCase().includes(term)
      );
    });
  }, [prospects, search, statusFilter]);

  const hot = prospects.filter((p) => p.outreachStatus === 'HOT' || p.outreachStatus === 'DEMO_BOOKED').length;
  const warm = prospects.filter((p) => p.outreachStatus === 'WARM').length;
  const cold = prospects.filter((p) => p.outreachStatus === 'COLD').length;

  const updateStatus = async (id: string, status: 'WARM' | 'HOT') => {
    setPending((s) => new Set([...s, id]));
    setProspects((list) =>
      list.map((p) => (p.id === id ? { ...p, outreachStatus: status, lastContactAt: new Date().toISOString() } : p))
    );
    try {
      await fetch(`/api/prospects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outreachStatus: status, lastContactAt: new Date().toISOString() }),
      });
    } catch {
      // optimistic UI keeps the change
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Prospect Database</h1>
          <p className="page-sub">{prospects.length} prospects tracked</p>
        </div>
        <Link href="/prospects/new" className="btn btn-primary btn-sm">
          <Plus size={13} />
          Add Prospect
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{prospects.length}</div>
            <Users size={18} style={{ color: 'var(--light)', opacity: 0.7 }} />
          </div>
          <div className="kpi-label">Total Prospects</div>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#EF4444', marginBottom: 8 }}>{hot}</div>
          <div className="kpi-label">Hot / Demo Booked</div>
        </div>
        <div className="card-orange" style={{ padding: 20 }}>
          <div className="kpi-value-orange">{warm}</div>
          <div className="kpi-label" style={{ marginTop: 8 }}>Warm</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--gray)', marginBottom: 8 }}>{cold}</div>
          <div className="kpi-label">Cold</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray)' }} />
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business, industry, city, email..."
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
              {s === 'All' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Business</th>
                <th>Industry</th>
                <th>City</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Score</th>
                <th>Status</th>
                <th>Last Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ color: 'var(--gray)', textAlign: 'center', padding: 32 }}>
                    {prospects.length === 0 ? 'No prospects yet' : 'No prospects match your filters'}
                  </td>
                </tr>
              ) : filtered.map((p) => {
                const grade = gradeBadge(p.presenceScore);
                const isPending = pending.has(p.id);
                return (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--white)', fontWeight: 600 }}>{p.businessName}</td>
                    <td style={{ color: 'var(--light)' }}>{p.industry}</td>
                    <td style={{ color: 'var(--gray)' }}>{p.city ?? '—'}</td>
                    <td style={{ color: 'var(--light)', fontSize: '0.78rem' }}>{p.email ?? '—'}</td>
                    <td style={{ color: 'var(--light)', fontSize: '0.78rem' }}>{p.phone ?? '—'}</td>
                    <td><span className={`badge ${grade.cls}`}>{grade.label}</span></td>
                    <td><span className={`badge ${statusBadge[p.outreachStatus]}`}>{p.outreachStatus.replace('_', ' ')}</span></td>
                    <td style={{ color: 'var(--gray)' }}>{fmtDate(p.lastContactAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.7rem', color: 'var(--orange)' }}
                          disabled={isPending || p.outreachStatus === 'WARM'}
                          onClick={() => updateStatus(p.id, 'WARM')}
                        >
                          Warm
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.7rem', color: '#EF4444' }}
                          disabled={isPending || p.outreachStatus === 'HOT'}
                          onClick={() => updateStatus(p.id, 'HOT')}
                        >
                          Hot
                        </button>
                      </div>
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
