'use client';

import { useState } from 'react';
import { Search, Globe, Star, MessageSquare, BarChart2, Smartphone } from 'lucide-react';

type CategoryResult = { name: string; score: number; status: string; detail: string; icon: React.ReactNode };

const DEMO_RESULT: CategoryResult[] = [
  { name: 'Website', score: 35, status: 'Poor', detail: 'Not mobile-optimized, no SSL, loads in 6.2s', icon: <Globe size={16} /> },
  { name: 'Google Business Profile', score: 40, status: 'Incomplete', detail: 'Claimed but no photos, only 3 reviews', icon: <Star size={16} /> },
  { name: 'Social Media', score: 20, status: 'Minimal', detail: 'Facebook page last updated 9 months ago', icon: <Smartphone size={16} /> },
  { name: 'Reviews', score: 30, status: 'Below Average', detail: '3.4 stars, 11 reviews total across platforms', icon: <MessageSquare size={16} /> },
  { name: 'SEO', score: 15, status: 'Not Indexed', detail: 'No meta tags, not ranking for local searches', icon: <BarChart2 size={16} /> },
];

function getGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: 'A+', color: 'var(--green)' };
  if (score >= 80) return { grade: 'A', color: 'var(--green)' };
  if (score >= 70) return { grade: 'B', color: 'var(--primary)' };
  if (score >= 60) return { grade: 'C', color: '#FBBF24' };
  if (score >= 50) return { grade: 'D', color: 'var(--orange)' };
  return { grade: 'F', color: '#EF4444' };
}

export default function PresenceGraderPage() {
  const [url, setUrl] = useState('planoplumbing.com');
  const [results, setResults] = useState<CategoryResult[]>(DEMO_RESULT);
  const [auditing, setAuditing] = useState(false);
  const [audited, setAudited] = useState(true);

  const handleAudit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuditing(true);
    setTimeout(() => {
      setResults(DEMO_RESULT);
      setAuditing(false);
      setAudited(true);
    }, 1800);
  };

  const totalScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  const { grade, color } = getGrade(totalScore);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Presence Grader</h1>
          <p className="page-sub">Enter any business website to generate a digital presence audit</p>
        </div>
      </div>

      <form onSubmit={handleAudit} style={{ display: 'flex', gap: 10, marginBottom: 28, maxWidth: 560 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Globe size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray)' }} />
          <input
            className="input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="example.com"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={auditing}>
          <Search size={14} />
          {auditing ? 'Auditing...' : 'Audit'}
        </button>
      </form>

      {auditing && (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--gray)' }}>
          Running audit on {url}...
        </div>
      )}

      {audited && !auditing && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
          <div className="card" style={{ padding: 24, textAlign: 'center', alignSelf: 'start' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Overall Grade</div>
            <div style={{ fontSize: '5rem', fontWeight: 900, color, lineHeight: 1, marginBottom: 8, fontFamily: 'var(--font-display)' }}>{grade}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray)', marginBottom: 16 }}>{totalScore}/100 points</div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: 16 }}>
              <div style={{ height: '100%', width: `${totalScore}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--light)', lineHeight: 1.5 }}>
              {url} has a weak digital presence. MAX EV can improve this score significantly.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map((r) => {
              const { color: barColor } = getGrade(r.score);
              return (
                <div key={r.name} className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ color: 'var(--gray)' }}>{r.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--white)' }}>{r.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: 2 }}>{r.detail}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: barColor }}>{r.score}/100</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray)', marginTop: 2 }}>{r.status}</div>
                    </div>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${r.score}%`, background: barColor, borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
