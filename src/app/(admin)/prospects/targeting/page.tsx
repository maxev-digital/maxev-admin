'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Target, TrendingUp, Users, DollarSign } from 'lucide-react';

const INDUSTRIES = [
  { name: 'Home Services',  count: 2847,  deal: 1200, priority: 'HOT',  conv: 8  },
  { name: 'Dental',         count: 634,   deal: 2400, priority: 'HOT',  conv: 12 },
  { name: 'Restaurant',     count: 4210,  deal: 800,  priority: 'HOT',  conv: 6  },
  { name: 'Auto Repair',    count: 1203,  deal: 1000, priority: 'WARM', conv: 7  },
  { name: 'Real Estate',    count: 987,   deal: 1500, priority: 'WARM', conv: 9  },
  { name: 'Fitness / Gym',  count: 456,   deal: 900,  priority: 'WARM', conv: 8  },
  { name: 'Legal',          count: 1102,  deal: 1800, priority: 'WARM', conv: 10 },
  { name: 'HVAC',           count: 892,   deal: 1100, priority: 'WARM', conv: 7  },
  { name: 'Beauty / Salon', count: 2103,  deal: 700,  priority: 'COLD', conv: 5  },
  { name: 'Roofing',        count: 743,   deal: 1400, priority: 'COLD', conv: 6  },
  { name: 'Landscaping',    count: 1456,  deal: 650,  priority: 'COLD', conv: 5  },
  { name: 'Retail',         count: 3201,  deal: 600,  priority: 'COLD', conv: 4  },
  { name: 'Childcare',      count: 389,   deal: 850,  priority: 'COLD', conv: 5  },
  { name: 'Cleaning',       count: 1872,  deal: 600,  priority: 'COLD', conv: 4  },
  { name: 'Insurance',      count: 892,   deal: 1200, priority: 'COLD', conv: 6  },
];

const PRIORITY_BADGE: Record<string, string> = {
  HOT:  'badge-red',
  WARM: 'badge-orange',
  COLD: 'badge-gray',
};

const TOP_3 = INDUSTRIES.slice(0, 3);

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

export default function TargetingPage() {
  const [targeted, setTargeted] = useState<string[]>([]);

  function toggleTarget(name: string) {
    setTargeted((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  const totalAddressable = INDUSTRIES.reduce((sum, i) => sum + i.count, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Targeting Strategy</h1>
          <p className="page-sub">DFW industry breakdown — focus outreach on the highest-converting verticals</p>
        </div>
        <Link href="/outreach" className="btn btn-primary btn-sm">
          <Target size={13} />
          Run Outreach
        </Link>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{INDUSTRIES.length}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Industries Tracked</div>
        </div>
        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green">{INDUSTRIES.filter((i) => i.priority === 'HOT').length}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">HOT Verticals</div>
        </div>
        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">{totalAddressable.toLocaleString()}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total DFW Businesses</div>
        </div>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{fmt(2400)}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Best Avg Deal Size</div>
        </div>
      </div>

      {/* Current Focus */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
          Current Focus — This Month
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {TOP_3.map((ind, idx) => {
            const subtitles = [
              'Plumbing, HVAC, Electrical',
              'Dental & Healthcare',
              'Restaurants & Food',
            ];
            return (
              <div
                key={ind.name}
                className="card"
                style={{
                  padding: 24,
                  borderTop: `3px solid ${idx === 0 ? '#EF4444' : idx === 1 ? 'var(--green)' : 'var(--primary)'}`,
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--white)', marginBottom: 3 }}>{ind.name}</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--gray)' }}>{subtitles[idx]}</div>
                  </div>
                  <span className={`badge ${PRIORITY_BADGE[ind.priority]}`} style={{ fontSize: '0.66rem', flexShrink: 0 }}>{ind.priority}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 16 }}>
                  <div style={{ textAlign: 'center', padding: '10px 6px', background: 'var(--card2)', borderRadius: 8 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--white)', fontFamily: 'var(--font-display)' }}>{ind.count.toLocaleString()}</div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--gray)', marginTop: 2 }}>Businesses</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px 6px', background: 'var(--card2)', borderRadius: 8 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-display)' }}>{fmt(ind.deal)}</div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--gray)', marginTop: 2 }}>Avg/mo</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px 6px', background: 'var(--card2)', borderRadius: 8 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--orange)', fontFamily: 'var(--font-display)' }}>{ind.conv}%</div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--gray)', marginTop: 2 }}>Conv.</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Industries table */}
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
          All Industries
        </h2>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Industry</th>
                <th>DFW Businesses</th>
                <th>Avg Deal Size</th>
                <th>Conv. Rate</th>
                <th>Priority</th>
                <th style={{ width: 100 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {INDUSTRIES.map((row) => (
                <tr key={row.name}>
                  <td style={{ fontWeight: 700, color: 'var(--white)' }}>{row.name}</td>
                  <td style={{ color: 'var(--light)' }}>{row.count.toLocaleString()}</td>
                  <td style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt(row.deal)}</td>
                  <td style={{ color: 'var(--light)' }}>{row.conv}%</td>
                  <td>
                    <span className={`badge ${PRIORITY_BADGE[row.priority]}`} style={{ fontSize: '0.66rem' }}>
                      {row.priority}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`btn btn-sm ${targeted.includes(row.name) ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => toggleTarget(row.name)}
                    >
                      {targeted.includes(row.name) ? 'Targeted' : 'Target'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
