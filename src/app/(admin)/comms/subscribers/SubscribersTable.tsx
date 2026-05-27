'use client';

import { useState } from 'react';
import { Users, UserCheck, Mail, Upload, Plus } from 'lucide-react';

type SubscriberList = 'PROSPECT' | 'CLIENT' | 'NEWSLETTER';

type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  businessName: string | null;
  industry: string | null;
  city: string | null;
  listType: SubscriberList;
  status: string;
  source: string | null;
  tags: string;
  createdAt: string;
};

const LIST_LABELS: Record<SubscriberList, string> = {
  PROSPECT: 'Prospect',
  CLIENT: 'Client',
  NEWSLETTER: 'Newsletter',
};

const LIST_BADGE: Record<SubscriberList, string> = {
  PROSPECT: 'badge-blue',
  CLIENT: 'badge-green',
  NEWSLETTER: 'badge-orange',
};

const TABS = ['All', 'Prospects', 'Clients', 'Newsletter'] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function SubscribersTable({ subscribers }: { subscribers: Subscriber[] }) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('All');
  const [search, setSearch] = useState('');

  const total = subscribers.length;
  const prospects = subscribers.filter((s) => s.listType === 'PROSPECT').length;
  const clients = subscribers.filter((s) => s.listType === 'CLIENT').length;
  const newsletter = subscribers.filter((s) => s.listType === 'NEWSLETTER').length;

  const filtered = subscribers.filter((s) => {
    const matchTab =
      activeTab === 'All' ||
      (activeTab === 'Prospects' && s.listType === 'PROSPECT') ||
      (activeTab === 'Clients' && s.listType === 'CLIENT') ||
      (activeTab === 'Newsletter' && s.listType === 'NEWSLETTER');

    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (s.name ?? '').toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.businessName ?? '').toLowerCase().includes(q) ||
      (s.city ?? '').toLowerCase().includes(q);

    return matchTab && matchSearch;
  });

  function handleExport() {
    const rows = [
      ['Email', 'Name', 'Business', 'Industry', 'City', 'List', 'Status', 'Source', 'Added'],
      ...filtered.map((s) => [
        s.email,
        s.name ?? '',
        s.businessName ?? '',
        s.industry ?? '',
        s.city ?? '',
        LIST_LABELS[s.listType],
        s.status,
        s.source ?? '',
        formatDate(s.createdAt),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${activeTab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscribers</h1>
          <p className="page-sub">All contacts across client, prospect, and newsletter lists</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleExport}>
            <Upload size={13} /> Export CSV
          </button>
          <button className="btn btn-primary btn-sm">
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{total}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total Subscribers</div>
        </div>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{prospects}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Prospects</div>
        </div>
        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green">{clients}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={16} style={{ color: 'var(--green)' }} />
            </div>
          </div>
          <div className="kpi-label">Clients</div>
        </div>
        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">{newsletter}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={16} style={{ color: 'var(--orange)' }} />
            </div>
          </div>
          <div className="kpi-label">Newsletter</div>
        </div>
      </div>

      {/* Filter tabs + search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', flex: 1 }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: activeTab === tab ? 'var(--white)' : 'var(--gray)',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 16, marginBottom: 1 }}>
          <input
            className="input"
            style={{ width: 220, fontSize: '0.8rem', padding: '6px 12px' }}
            placeholder="Search name, email, business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ marginTop: 20 }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ color: 'var(--gray)', fontSize: '0.9rem', marginBottom: 8 }}>
              {subscribers.length === 0
                ? 'No subscribers yet — import or add manually.'
                : 'No subscribers match your search or filter.'}
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Business</th>
                    <th>Industry</th>
                    <th>City</th>
                    <th>List</th>
                    <th>Status</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700, color: 'var(--white)' }}>
                        {s.name ?? <span style={{ color: 'var(--gray)' }}>—</span>}
                      </td>
                      <td style={{ color: 'var(--light)', fontSize: '0.8rem' }}>{s.email}</td>
                      <td style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>{s.businessName ?? '—'}</td>
                      <td style={{ color: 'var(--gray)', fontSize: '0.78rem' }}>{s.industry ?? '—'}</td>
                      <td style={{ color: 'var(--gray)', fontSize: '0.78rem' }}>{s.city ?? '—'}</td>
                      <td>
                        <span className={`badge ${LIST_BADGE[s.listType]}`} style={{ fontSize: '0.65rem' }}>
                          {LIST_LABELS[s.listType]}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-gray'}`}
                          style={{ fontSize: '0.65rem' }}
                        >
                          {s.status === 'active' ? 'Active' : 'Unsubscribed'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--gray)', fontSize: '0.78rem' }}>
                        {formatDate(s.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
