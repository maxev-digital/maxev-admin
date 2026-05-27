'use client';

import { useState } from 'react';

type FilterTab = 'all' | 'email' | 'sms' | 'replied';

interface HistoryRow {
  id: string;
  channel: string;
  subject: string | null;
  status: string;
  createdAt: string;
  openedAt: string | null;
  repliedAt: string | null;
  prospectName: string | null;
  leadName: string | null;
}

const channelBadge: Record<string, string> = {
  email: 'badge-blue',
  sms:   'badge-green',
  call:  'badge-orange',
};

const statusBadge: Record<string, string> = {
  sent:    'badge-gray',
  opened:  'badge-blue',
  clicked: 'badge-green',
  replied: 'badge-green',
  bounced: 'badge-red',
};

const tabs: { key: FilterTab; label: string }[] = [
  { key: 'all',     label: 'All'     },
  { key: 'email',   label: 'Email'   },
  { key: 'sms',     label: 'SMS'     },
  { key: 'replied', label: 'Replied' },
];

export default function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  const [active, setActive] = useState<FilterTab>('all');

  const filtered = rows.filter((r) => {
    if (active === 'all')     return true;
    if (active === 'email')   return r.channel === 'email';
    if (active === 'sms')     return r.channel === 'sms';
    if (active === 'replied') return !!r.repliedAt || r.status === 'replied';
    return true;
  });

  const toName = (r: HistoryRow) => r.prospectName ?? r.leadName ?? '—';

  return (
    <div className="card" style={{ padding: 0 }}>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '14px 20px 0', borderBottom: '1px solid var(--border)' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={active === t.key ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            style={{ marginBottom: -1, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--gray)' }}>
          No outreach sent yet
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>To</th>
                <th>Channel</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Opened At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--gray)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--white)' }}>{toName(r)}</td>
                  <td>
                    <span className={`badge ${channelBadge[r.channel] ?? 'badge-gray'}`} style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>
                      {r.channel}
                    </span>
                  </td>
                  <td style={{ color: 'var(--light)', fontSize: '0.82rem', maxWidth: 260 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>
                      {r.subject ?? '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${statusBadge[r.status] ?? 'badge-gray'}`} style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--gray)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {r.openedAt
                      ? new Date(r.openedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
