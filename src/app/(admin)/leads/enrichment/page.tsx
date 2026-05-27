'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';

type Lead = {
  id: number;
  business_name: string;
  website: string | null;
  city: string | null;
  category: string;
};

const subNav = [
  { label: 'Lead Queue', href: '/leads' },
  { label: 'Templates', href: '/leads/templates' },
  { label: 'Permit Leads', href: '/leads/permits' },
  { label: 'Enrichment Queue', href: '/leads/enrichment' },
];

const WEEKLY_WORKFLOW = [
  { day: 'Monday', task: 'Pull 50 Tier 1 leads from queue, run enrichment on websites' },
  { day: 'Wednesday', task: 'Enrich follow-up leads — verify phones via Twilio lookup' },
  { day: 'Friday', task: 'Review enriched leads — mark ready, start outreach sequence' },
  { day: 'Monthly', task: 'Re-audit enriched leads that did not respond — update grade' },
];

export default function EnrichmentQueuePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [mock, setMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [queued, setQueued] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/admin/leads?hasEmail=false&limit=50')
      .then((r) => r.json())
      .then((d) => {
        const noEmail = d.leads.filter((l: Lead & { business_email: string | null }) => !l.business_email && l.website);
        setLeads(noEmail);
        setMock(d._mock);
      })
      .catch(() => setMock(true))
      .finally(() => setLoading(false));
  }, []);

  const enrich = async (id: number) => {
    try {
      await fetch(`/api/admin/leads/enrich/${id}`, { method: 'POST' });
    } catch {
      // stub
    }
    setQueued((q) => new Set([...q, id]));
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Enrichment Queue</h1>
          <p className="page-sub">Businesses with website but no email or phone</p>
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
              color: n.href === '/leads/enrichment' ? 'var(--white)' : 'var(--gray)',
              borderBottom: n.href === '/leads/enrichment' ? '2px solid var(--primary)' : '2px solid transparent',
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        <div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Business Name</th>
                    <th>Website</th>
                    <th>City</th>
                    <th>Category</th>
                    <th>Enrich</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={5} style={{ color: 'var(--gray)', textAlign: 'center', padding: 32 }}>Loading...</td></tr>
                  )}
                  {!loading && leads.length === 0 && (
                    <tr><td colSpan={5} style={{ color: 'var(--gray)', textAlign: 'center', padding: 32 }}>No businesses need enrichment</td></tr>
                  )}
                  {leads.map((l) => (
                    <tr key={l.id}>
                      <td style={{ color: 'var(--white)', fontWeight: 600 }}>{l.business_name}</td>
                      <td style={{ color: 'var(--primary)', fontSize: '0.78rem' }}>{l.website}</td>
                      <td style={{ color: 'var(--gray)' }}>{l.city ?? '—'}</td>
                      <td style={{ color: 'var(--light)' }}>{l.category}</td>
                      <td>
                        {queued.has(l.id) ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--green)', fontSize: '0.78rem' }}>
                            <CheckCircle2 size={13} />
                            Queued
                          </span>
                        ) : (
                          <button className="btn btn-ghost btn-sm" onClick={() => enrich(l.id)}>
                            <Zap size={12} />
                            Enrich
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 20, alignSelf: 'start' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Weekly Workflow</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {WEEKLY_WORKFLOW.map((w) => (
              <div key={w.day} style={{ padding: '10px 14px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{w.day}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--light)', lineHeight: 1.5 }}>{w.task}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
