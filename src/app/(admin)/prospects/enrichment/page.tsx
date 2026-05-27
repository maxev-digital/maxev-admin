'use client';

import { useState, useEffect } from 'react';
import { Mail, MailX, Zap, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

type Prospect = {
  id: string;
  businessName: string;
  phone: string | null;
  website: string | null;
  city: string | null;
};

const mockProspects: Prospect[] = [];

export default function ProspectEnrichmentPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [withEmail, setWithEmail]   = useState(0);
  const [queued, setQueued] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/prospects?limit=100')
      .then((r) => r.json())
      .then((d) => {
        const all = d.prospects ?? [];
        const noEmail = all.filter((p: Prospect & { email: string | null }) => !p.email);
        setProspects(noEmail.length > 0 ? noEmail : mockProspects);
        setWithEmail(all.length - noEmail.length);
      })
      .catch(() => setProspects(mockProspects))
      .finally(() => setLoading(false));
  }, []);

  const enrich = (id: string) => {
    setQueued((q) => new Set([...q, id]));
  };

  const withoutEmail = prospects.length;
  const queueCount = prospects.filter((p) => p.website).length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Enrichment</h1>
          <p className="page-sub">Prospects missing contact info — find emails before outreach</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green">{withEmail}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Prospects with Email</div>
        </div>
        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">{withoutEmail}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MailX size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Prospects without Email</div>
        </div>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{queueCount}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Enrichment Queue</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Missing Email — Ready to Enrich
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Business Name</th>
                    <th>Phone</th>
                    <th>Website</th>
                    <th>City</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={5} style={{ color: 'var(--gray)', textAlign: 'center', padding: 32 }}>Loading...</td></tr>
                  )}
                  {!loading && prospects.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, color: 'var(--white)' }}>{p.businessName}</td>
                      <td style={{ color: 'var(--light)' }}>{p.phone ?? '—'}</td>
                      <td style={{ color: 'var(--primary)', fontSize: '0.78rem' }}>{p.website ?? '—'}</td>
                      <td style={{ color: 'var(--gray)' }}>{p.city ?? '—'}</td>
                      <td>
                        {queued.has(p.id) ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--green)', fontSize: '0.78rem' }}>
                            <CheckCircle2 size={13} /> Queued
                          </span>
                        ) : (
                          <button className="btn btn-ghost btn-sm" onClick={() => enrich(p.id)}>
                            <Zap size={12} /> Enrich
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
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Enrichment Tips</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: <CheckCircle2 size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />, text: 'Filter for prospects with a website — those are most likely to have contact pages.' },
              { icon: <AlertTriangle size={13} style={{ color: 'var(--orange)', flexShrink: 0 }} />, text: 'Prospects without email cannot be added to drip sequences until enriched.' },
              { icon: <Zap size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />, text: 'Use BatchData or Hunter.io to bulk-find emails from domain names.' },
            ].map((tip, i) => (
              <div key={i} style={{ padding: '10px 14px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                {tip.icon}
                <span style={{ fontSize: '0.78rem', color: 'var(--light)', lineHeight: 1.5 }}>{tip.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
