'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Copy, Check } from 'lucide-react';

type Lead = {
  id: number;
  business_name: string;
  category: string;
  business_email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  grade: string | null;
  outreach_priority: string | null;
  outreach_status: string | null;
  last_contacted_at: string | null;
  owner_name: string | null;
};

type ApiResponse = { leads: Lead[]; total: number; page: number; limit: number; _mock: boolean };

const GRADE_BADGE: Record<string, string> = { F: 'badge-red', D: 'badge-orange', C: 'badge-orange', B: 'badge-blue' };
const PRIORITY_BADGE: Record<string, string> = { tier1: 'badge-red', tier2: 'badge-orange', tier3: 'badge-gray' };
const STATUS_BADGE: Record<string, string> = {
  none: 'badge-gray', emailed: 'badge-blue', called: 'badge-purple',
  warm_lead: 'badge-orange', hot_lead: 'badge-red', not_a_fit: 'badge-gray',
};

const COLD_EMAIL_TEMPLATE = (businessName: string, ownerName: string, city: string) =>
  `Subject: Quick question about ${businessName}'s online presence

Hi ${ownerName || 'there'},

I came across ${businessName} while researching businesses in ${city || 'the area'} — and noticed your online presence could be significantly stronger.

I'm Will with MAX EV Digital, a DFW-based agency that builds complete digital platforms for local businesses: modern website, CRM, booking, billing, and automation — all connected.

Most businesses we work with see more leads within 30 days. Would a quick 15-minute call this week make sense?

Will Austin
MAX EV Digital
maxevdigital.com`;

export default function LeadQueueTable() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const [filters, setFilters] = useState({
    tier: 'all',
    status: 'all',
    contact: 'any',
    grade: 'all',
    city: '',
  });

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.tier !== 'all') params.set('tier', filters.tier);
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.contact === 'email') params.set('hasEmail', 'true');
    if (filters.contact === 'phone') params.set('hasPhone', 'true');
    if (filters.contact === 'both') { params.set('hasEmail', 'true'); params.set('hasPhone', 'true'); }
    if (filters.grade !== 'all') params.set('grade', filters.grade);
    if (filters.city) params.set('city', filters.city);
    params.set('page', String(page));
    params.set('limit', '25');
    return params.toString();
  }, [filters, page]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/leads?${buildQuery()}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const setFilter = (k: string, v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  const markStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setData((d) => d ? {
      ...d,
      leads: d.leads.map((l) => l.id === id ? { ...l, outreach_status: status } : l),
    } : d);
  };

  const copyTemplate = (lead: Lead) => {
    const text = COLD_EMAIL_TEMPLATE(lead.business_name, lead.owner_name ?? '', lead.city ?? '');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(lead.id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

  const totalPages = data ? Math.ceil(data.total / 25) : 1;

  return (
    <>
      {data?._mock && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: '0.82rem', color: '#EF4444' }}>
          <AlertTriangle size={15} />
          DB Offline — showing mock data. DFW Daily database is not connected.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <div className="input-group" style={{ margin: 0 }}>
          <select className="input" style={{ fontSize: '0.78rem', height: 34, padding: '0 10px' }} value={filters.tier} onChange={(e) => setFilter('tier', e.target.value)}>
            <option value="all">All Priority</option>
            <option value="tier1">Tier 1</option>
            <option value="tier2">Tier 2</option>
            <option value="tier3">Tier 3</option>
          </select>
        </div>
        <div className="input-group" style={{ margin: 0 }}>
          <select className="input" style={{ fontSize: '0.78rem', height: 34, padding: '0 10px' }} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="all">All Status</option>
            <option value="none">None</option>
            <option value="emailed">Emailed</option>
            <option value="called">Called</option>
            <option value="warm_lead">Warm</option>
            <option value="hot_lead">Hot</option>
            <option value="not_a_fit">Not a Fit</option>
          </select>
        </div>
        <div className="input-group" style={{ margin: 0 }}>
          <select className="input" style={{ fontSize: '0.78rem', height: 34, padding: '0 10px' }} value={filters.contact} onChange={(e) => setFilter('contact', e.target.value)}>
            <option value="any">Any Contact</option>
            <option value="email">Has Email</option>
            <option value="phone">Has Phone</option>
            <option value="both">Has Both</option>
          </select>
        </div>
        <div className="input-group" style={{ margin: 0 }}>
          <select className="input" style={{ fontSize: '0.78rem', height: 34, padding: '0 10px' }} value={filters.grade} onChange={(e) => setFilter('grade', e.target.value)}>
            <option value="all">All Grades</option>
            <option value="F">F</option>
            <option value="D">D</option>
            <option value="C">C</option>
            <option value="B">B</option>
          </select>
        </div>
        <input
          className="input"
          placeholder="City..."
          value={filters.city}
          onChange={(e) => setFilter('city', e.target.value)}
          style={{ fontSize: '0.78rem', height: 34, padding: '0 10px', width: 120 }}
        />
        {loading && <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>Loading...</span>}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Business Name</th>
                <th>Category</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Grade</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Last Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!data && (
                <tr><td colSpan={9} style={{ color: 'var(--gray)', textAlign: 'center', padding: 32 }}>Loading leads...</td></tr>
              )}
              {data?.leads.length === 0 && (
                <tr><td colSpan={9} style={{ color: 'var(--gray)', textAlign: 'center', padding: 32 }}>No leads match your filters</td></tr>
              )}
              {data?.leads.map((lead) => (
                <tr key={lead.id}>
                  <td style={{ color: 'var(--white)', fontWeight: 600 }}>
                    <div>{lead.business_name}</div>
                    {lead.city && <div style={{ fontSize: '0.71rem', color: 'var(--gray)', marginTop: 2 }}>{lead.city}</div>}
                  </td>
                  <td style={{ color: 'var(--light)', fontSize: '0.8rem' }}>{lead.category ?? '—'}</td>
                  <td style={{ fontSize: '0.76rem', color: lead.business_email ? 'var(--light)' : 'var(--gray)' }}>{lead.business_email ?? '—'}</td>
                  <td style={{ fontSize: '0.76rem', color: lead.phone ? 'var(--light)' : 'var(--gray)' }}>{lead.phone ?? '—'}</td>
                  <td>
                    {lead.grade ? <span className={`badge ${GRADE_BADGE[lead.grade] ?? 'badge-gray'}`}>{lead.grade}</span> : <span style={{ color: 'var(--gray)' }}>—</span>}
                  </td>
                  <td>
                    {lead.outreach_priority ? <span className={`badge ${PRIORITY_BADGE[lead.outreach_priority] ?? 'badge-gray'}`}>{lead.outreach_priority}</span> : <span style={{ color: 'var(--gray)' }}>—</span>}
                  </td>
                  <td>
                    {lead.outreach_status ? (
                      <span className={`badge ${STATUS_BADGE[lead.outreach_status] ?? 'badge-gray'}`}>{lead.outreach_status.replace(/_/g, ' ')}</span>
                    ) : <span className="badge badge-gray">none</span>}
                  </td>
                  <td style={{ color: 'var(--gray)', fontSize: '0.76rem' }}>{fmtDate(lead.last_contacted_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem', padding: '3px 7px' }} onClick={() => markStatus(lead.id, 'emailed')}>Emailed</button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem', padding: '3px 7px' }} onClick={() => markStatus(lead.id, 'called')}>Called</button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem', padding: '3px 7px', color: 'var(--orange)' }} onClick={() => markStatus(lead.id, 'warm_lead')}>Warm</button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem', padding: '3px 7px', color: '#EF4444' }} onClick={() => markStatus(lead.id, 'hot_lead')}>Hot</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.68rem', padding: '3px 7px', color: copied === lead.id ? 'var(--green)' : undefined }}
                        onClick={() => copyTemplate(lead)}
                      >
                        {copied === lead.id ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.total > 25 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--gray)' }}>
            Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, data.total)} of {data.total.toLocaleString()}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={14} />
              Prev
            </button>
            <span style={{ color: 'var(--light)', padding: '0 10px', lineHeight: '32px' }}>Page {page} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
