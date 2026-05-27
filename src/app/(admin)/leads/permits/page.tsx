'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

type Lead = {
  id: number;
  business_name: string;
  category: string;
  business_email: string | null;
  phone: string | null;
  city: string | null;
  grade: string | null;
  outreach_priority: string | null;
  outreach_status: string | null;
};

const GRADE_BADGE: Record<string, string> = { F: 'badge-red', D: 'badge-orange', C: 'badge-orange', B: 'badge-blue' };

const subNav = [
  { label: 'Lead Queue', href: '/leads' },
  { label: 'Templates', href: '/leads/templates' },
  { label: 'Permit Leads', href: '/leads/permits' },
  { label: 'Enrichment Queue', href: '/leads/enrichment' },
];

export default function PermitLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [mock, setMock] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/leads?hasPermit=true&limit=50')
      .then((r) => r.json())
      .then((d) => { setLeads(d.leads); setMock(d._mock); })
      .catch(() => setMock(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Permit Leads</h1>
          <p className="page-sub">Businesses with active or recent building permits</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {subNav.map((n) => (
          <Link
            key={n.label}
            href={n.href}
            style={{
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: n.href === '/leads/permits' ? 'var(--white)' : 'var(--gray)',
              borderBottom: n.href === '/leads/permits' ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {n.label}
          </Link>
        ))}
      </div>

      {mock && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: '0.82rem', color: '#EF4444' }}>
          <AlertTriangle size={15} />
          DB Offline — showing mock data
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Business Name</th>
                <th>Category</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City</th>
                <th>Grade</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{ color: 'var(--gray)', textAlign: 'center', padding: 32 }}>Loading...</td></tr>
              )}
              {!loading && leads.length === 0 && (
                <tr><td colSpan={8} style={{ color: 'var(--gray)', textAlign: 'center', padding: 32 }}>No permit leads found</td></tr>
              )}
              {leads.map((l) => (
                <tr key={l.id}>
                  <td style={{ color: 'var(--white)', fontWeight: 600 }}>{l.business_name}</td>
                  <td style={{ color: 'var(--light)' }}>{l.category ?? '—'}</td>
                  <td style={{ color: 'var(--light)', fontSize: '0.78rem' }}>{l.business_email ?? '—'}</td>
                  <td style={{ color: 'var(--light)', fontSize: '0.78rem' }}>{l.phone ?? '—'}</td>
                  <td style={{ color: 'var(--gray)' }}>{l.city ?? '—'}</td>
                  <td>{l.grade ? <span className={`badge ${GRADE_BADGE[l.grade] ?? 'badge-gray'}`}>{l.grade}</span> : '—'}</td>
                  <td>{l.outreach_priority ? <span className="badge badge-orange">{l.outreach_priority}</span> : '—'}</td>
                  <td>{l.outreach_status ? <span className="badge badge-blue">{l.outreach_status}</span> : <span className="badge badge-gray">none</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
