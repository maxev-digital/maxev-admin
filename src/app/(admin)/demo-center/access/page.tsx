'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Users, Plus, Eye, EyeOff, Trash2, Activity, Clock, BarChart2, ChevronDown, ChevronUp, Copy, Check, X } from 'lucide-react';

type Prospect = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  isActive: boolean;
  loginCount: number;
  lastLoginAt: string | null;
  createdAt: string;
  _count: { activities: number };
  activities: Array<{ createdAt: string; page: string }>;
};

type TopPage = { page: string; count: number };

type ActivityEvent = {
  id: string;
  type: string;
  page: string;
  action: string | null;
  createdAt: string;
  prospect: { name: string; company: string | null };
};

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/analytics': 'Analytics',
  '/revenue': 'Revenue',
  '/ai-insights': 'MAX CEO Intel',
  '/pipeline': 'Pipeline',
  '/leads': 'Leads',
  '/clients': 'Clients',
  '/invoices': 'Invoices',
  '/proposals': 'Proposals',
  '/tasks': 'Tasks',
  '/helpdesk': 'Helpdesk',
  '/booking': 'Booking',
  '/inventory': 'Inventory',
  '/comms': 'Communications',
};

function labelPage(page: string) {
  return PAGE_LABELS[page] ?? page.replace('/', '').replace(/-/g, ' ');
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ProspectAccessPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detailPages, setDetailPages] = useState<TopPage[]>([]);
  const [detailActivity, setDetailActivity] = useState<ActivityEvent[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const [pr, ar] = await Promise.all([
      fetch('/api/demo/prospects').then(r => r.json()),
      fetch('/api/demo/analytics').then(r => r.json()),
    ]);
    setProspects(pr.prospects ?? []);
    setRecentActivity(ar.recentActivity ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(p: Prospect) {
    await fetch(`/api/demo/prospects/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    load();
  }

  async function deleteProspect(id: string) {
    if (!confirm('Delete this prospect account?')) return;
    await fetch(`/api/demo/prospects/${id}`, { method: 'DELETE' });
    setExpanded(null);
    load();
  }

  async function expand(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const data = await fetch(`/api/demo/analytics?prospectId=${id}`).then(r => r.json());
    setDetailPages(data.topPages ?? []);
    setDetailActivity(data.activities ?? []);
  }

  async function createProspect(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch('/api/demo/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setCreating(false);
    if (res.ok) {
      setForm({ name: '', email: '', company: '', password: '' });
      setShowCreate(false);
      load();
    }
  }

  function copyLink(email: string, password: string) {
    const origin = window.location.origin;
    const text = `Demo Access\nURL: ${origin}/demo-login\nEmail: ${email}\nPassword: ${password}`;
    navigator.clipboard.writeText(text);
    setCopied(email);
    setTimeout(() => setCopied(''), 2000);
  }

  const s: Record<string, React.CSSProperties> = {
    page: { padding: '28px 32px', maxWidth: 1100 },
    h1: { fontSize: '1.45rem', fontWeight: 800, color: 'var(--white)', margin: '0 0 4px' },
    sub: { fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 28px' },
    row: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
    card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' },
    th: { padding: '10px 16px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--muted)', borderBottom: '1px solid var(--border)', textAlign: 'left' as const },
    td: { padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text)', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' as const },
    badge: (active: boolean): React.CSSProperties => ({
      display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
      background: active ? 'rgba(34,197,94,0.12)' : 'rgba(107,114,128,0.15)',
      color: active ? '#4ade80' : '#9ca3af', border: `1px solid ${active ? 'rgba(34,197,94,0.25)' : 'rgba(107,114,128,0.2)'}`,
    }),
    btn: { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 },
    input: {
      width: '100%', padding: '9px 12px', borderRadius: 8, boxSizing: 'border-box' as const,
      background: 'var(--surface-2, rgba(255,255,255,0.05))', border: '1px solid var(--border)',
      color: 'var(--white)', fontSize: '0.85rem', outline: 'none',
    },
  };

  return (
    <div style={s.page}>
      <div style={s.row}>
        <Users size={20} color="var(--primary)" />
        <div>
          <h1 style={s.h1}>Prospect Access</h1>
          <p style={s.sub}>Create demo logins for prospects. Track every page they visit and every action they take.</p>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          style={{ ...s.btn, background: 'var(--primary)', color: '#fff', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={14} /> New Prospect Login
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ ...s.card, padding: 24, marginBottom: 24 }}>
          <h3 style={{ color: 'var(--white)', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 18px' }}>Create Prospect Account</h3>
          <form onSubmit={createProspect}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>Name *</label>
                <input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>Email *</label>
                <input style={s.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@company.com" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>Company</label>
                <input style={s.input} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Corp" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>Temp Password *</label>
                <input style={s.input} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="e.g. Demo2026!" required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={creating} style={{ ...s.btn, background: 'var(--primary)', color: '#fff' }}>
                {creating ? 'Creating...' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} style={{ ...s.btn, background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Prospects table */}
      <div style={{ ...s.card, marginBottom: 32 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Prospect', 'Status', 'Logins', 'Page Views', 'Last Seen', 'Actions'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ ...s.td, textAlign: 'center', color: 'var(--muted)', padding: 32 }}>Loading...</td></tr>
            )}
            {!loading && prospects.length === 0 && (
              <tr><td colSpan={6} style={{ ...s.td, textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
                No prospect accounts yet. Create one above.
              </td></tr>
            )}
            {prospects.map(p => (
              <>
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => expand(p.id)}>
                  <td style={s.td}>
                    <div style={{ fontWeight: 700, color: 'var(--white)' }}>{p.name}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>{p.email}{p.company ? ` · ${p.company}` : ''}</div>
                  </td>
                  <td style={s.td}><span style={s.badge(p.isActive)}>{p.isActive ? 'Active' : 'Revoked'}</span></td>
                  <td style={s.td}><span style={{ fontWeight: 700 }}>{p.loginCount}</span></td>
                  <td style={s.td}>{p._count.activities}</td>
                  <td style={s.td}>
                    {p.lastLoginAt ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} color="var(--muted)" /> {timeAgo(p.lastLoginAt)}
                      </span>
                    ) : <span style={{ color: 'var(--muted)' }}>Never</span>}
                  </td>
                  <td style={{ ...s.td, borderBottom: 'none' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => copyLink(p.email, '(set password)')}
                        title="Copy login link"
                        style={{ ...s.btn, padding: '5px 8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' }}
                      >
                        {copied === p.email ? <Check size={13} color="#4ade80" /> : <Copy size={13} />}
                      </button>
                      <button
                        onClick={() => toggleActive(p)}
                        title={p.isActive ? 'Revoke access' : 'Restore access'}
                        style={{ ...s.btn, padding: '5px 8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' }}
                      >
                        {p.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button
                        onClick={() => deleteProspect(p.id)}
                        title="Delete account"
                        style={{ ...s.btn, padding: '5px 8px', background: 'transparent', border: '1px solid var(--border)', color: '#f87171' }}
                      >
                        <Trash2 size={13} />
                      </button>
                      {expanded === p.id ? <ChevronUp size={13} color="var(--muted)" /> : <ChevronDown size={13} color="var(--muted)" />}
                    </div>
                  </td>
                </tr>

                {/* Expanded detail row */}
                {expanded === p.id && (
                  <tr key={`${p.id}-detail`}>
                    <td colSpan={6} style={{ padding: 0, background: 'rgba(99,102,241,0.04)', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        {/* Top pages */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <BarChart2 size={13} color="var(--primary)" />
                            <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Most Visited Pages</span>
                          </div>
                          {detailPages.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>No page views yet.</p>}
                          {detailPages.map(pg => (
                            <div key={pg.page} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 600 }}>{labelPage(pg.page)}</div>
                                <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', marginTop: 3, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', borderRadius: 2, background: 'var(--primary)', width: `${Math.min(100, (pg.count / (detailPages[0]?.count || 1)) * 100)}%` }} />
                                </div>
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--white)', minWidth: 24, textAlign: 'right' }}>{pg.count}</span>
                            </div>
                          ))}
                        </div>

                        {/* Activity timeline */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <Activity size={13} color="var(--primary)" />
                            <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent Activity</span>
                          </div>
                          {detailActivity.slice(0, 12).map((a, i) => (
                            <div key={a.id ?? i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.type === 'page_view' ? 'var(--primary)' : '#f59e0b', marginTop: 5, flexShrink: 0 }} />
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>
                                  {a.type === 'page_view' ? `Visited ${labelPage(a.page)}` : `${a.action ?? 'Clicked'} on ${labelPage(a.page)}`}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginLeft: 6 }}>{timeAgo(a.createdAt)}</span>
                              </div>
                            </div>
                          ))}
                          {detailActivity.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>No activity yet.</p>}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Live activity feed */}
      {recentActivity.length > 0 && (
        <div style={s.card}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={14} color="var(--primary)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--white)' }}>Live Activity Feed</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {recentActivity.slice(0, 20).map((a, i) => (
              <div key={a.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px', borderBottom: i < 19 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {a.prospect.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--white)' }}>{a.prospect.name}</span>
                  {a.prospect.company && <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}> · {a.prospect.company}</span>}
                  <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>
                    {' '}{a.type === 'page_view' ? `viewed ${labelPage(a.page)}` : `clicked ${a.action ?? 'element'} on ${labelPage(a.page)}`}
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
