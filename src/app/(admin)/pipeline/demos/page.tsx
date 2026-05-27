'use client';

import { useEffect, useState } from 'react';
import { Calendar, DollarSign, User, MapPin, FileText, X } from 'lucide-react';
import { useAIHighlight } from '@/lib/ai-highlight';

type Lead = {
  id: string; businessName: string; contactName: string | null;
  industry: string; priority: string; stage: string;
  demoDate: string | null; city: string | null;
  estimatedValue: number | null; notes: string | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

export default function DemosPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [briefOpen, setBriefOpen] = useState<string | null>(null);
  const { isHighlighted } = useAIHighlight();
  const demoGlow = isHighlighted('lead-stage', 'DEMO_SCHEDULED');
  const hotGlow = isHighlighted('lead-priority', 'HOT');

  useEffect(() => {
    fetch('/api/pipeline')
      .then(r => r.json())
      .then((data: Lead[]) => setLeads(data.filter((l: Lead) => l.stage === 'DEMO_SCHEDULED').sort((a, b) => {
        if (!a.demoDate) return 1;
        if (!b.demoDate) return -1;
        return new Date(a.demoDate).getTime() - new Date(b.demoDate).getTime();
      })));
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Demos Scheduled</h1>
          <p className="page-sub">{leads.length} upcoming demos</p>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--gray)' }}>
          No demos scheduled — go book some.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {leads.map((l) => {
            const cardClass = demoGlow === 'glow' ? 'card ai-highlight-glow'
              : hotGlow === 'glow' && l.priority === 'HOT' ? 'card ai-highlight-glow'
              : hotGlow === 'glow' && l.priority !== 'HOT' ? 'card ai-highlight-dim'
              : 'card';
            return (
            <div key={l.id} className={cardClass} style={{ padding: 20, transition: 'box-shadow 0.3s, opacity 0.3s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--white)', marginBottom: 3 }}>
                    {l.businessName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{l.industry}</div>
                </div>
                <span
                  className={`badge ${l.priority === 'HOT' ? 'badge-red' : l.priority === 'WARM' ? 'badge-orange' : 'badge-gray'}`}
                >
                  {l.priority}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                {l.contactName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: 'var(--light)' }}>
                    <User size={13} style={{ color: 'var(--gray)', flexShrink: 0 }} />
                    {l.contactName}
                  </div>
                )}
                {l.demoDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: 'var(--primary)' }}>
                    <Calendar size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    {new Date(l.demoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                {!l.demoDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: 'var(--gray)' }}>
                    <Calendar size={13} style={{ flexShrink: 0 }} />
                    Date TBD
                  </div>
                )}
                {l.city && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: 'var(--light)' }}>
                    <MapPin size={13} style={{ color: 'var(--gray)', flexShrink: 0 }} />
                    {l.city}
                  </div>
                )}
                {l.estimatedValue && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600 }}>
                    <DollarSign size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
                    {fmt(l.estimatedValue)}
                  </div>
                )}
              </div>

              {l.notes && (
                <p style={{ fontSize: '0.77rem', color: 'var(--gray)', lineHeight: 1.5, marginBottom: 14, margin: '0 0 14px' }}>
                  {l.notes}
                </p>
              )}

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setBriefOpen(briefOpen === l.id ? null : l.id)}
              >
                {briefOpen === l.id ? <X size={13} /> : <FileText size={13} />}
                {briefOpen === l.id ? 'Hide Brief' : 'Demo Prep'}
              </button>

              {briefOpen === l.id && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--light)', lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, color: 'var(--white)', marginBottom: 6 }}>Demo Brief</div>
                  <div><span style={{ color: 'var(--gray)' }}>Industry:</span> {l.industry}</div>
                  <div><span style={{ color: 'var(--gray)' }}>Contact:</span> {l.contactName ?? 'Unknown'}</div>
                  <div><span style={{ color: 'var(--gray)' }}>Value:</span> {l.estimatedValue ? fmt(l.estimatedValue) : 'TBD'}</div>
                  <div style={{ marginTop: 6 }}><span style={{ color: 'var(--gray)' }}>Notes:</span> {l.notes ?? 'None'}</div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </>
  );
}
