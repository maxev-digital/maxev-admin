'use client';

import { useState } from 'react';
import Link from 'next/link';

type Project = {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate: string | null;
  launchDate: string | null;
  createdAt: string;
  client: { id: string; businessName: string };
};

const statusBadge: Record<string, string> = {
  NOT_STARTED: 'badge-gray',
  IN_PROGRESS: 'badge-blue',
  REVIEW: 'badge-orange',
  LIVE: 'badge-green',
  PAUSED: 'badge-gray',
};

const FILTERS = ['All', 'In Progress', 'Review', 'Live'];

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function ProjectsFilter({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState('All');

  const filtered = projects.filter((p) => {
    if (active === 'All') return true;
    if (active === 'In Progress') return p.status === 'IN_PROGRESS';
    if (active === 'Review') return p.status === 'REVIEW';
    if (active === 'Live') return p.status === 'LIVE';
    return true;
  });

  const daysRunning = (startDate: string | null) => {
    if (!startDate) return '—';
    const d = Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000);
    return `${d}d`;
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActive(f)}
            className={`btn btn-sm ${active === f ? 'btn-primary' : 'btn-ghost'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Project Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>Launch Target</th>
                <th>Days Running</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ color: 'var(--gray)', textAlign: 'center' }}>No projects found</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/clients/${p.client.id}`} style={{ color: 'var(--light)', fontWeight: 600 }}>
                      {p.client.businessName}
                    </Link>
                  </td>
                  <td style={{ color: 'var(--white)', fontWeight: 600 }}>{p.name}</td>
                  <td style={{ color: 'var(--light)' }}>{p.type.replace(/_/g, ' ')}</td>
                  <td><span className={`badge ${statusBadge[p.status]}`}>{p.status.replace(/_/g, ' ')}</span></td>
                  <td style={{ color: 'var(--gray)' }}>{fmtDate(p.startDate)}</td>
                  <td style={{ color: 'var(--gray)' }}>{fmtDate(p.launchDate)}</td>
                  <td style={{ color: 'var(--gray)' }}>{daysRunning(p.startDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
