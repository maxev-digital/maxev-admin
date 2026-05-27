'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Shield, X, Send } from 'lucide-react';

type AdminUser = {
  id:          string;
  email:       string;
  name:        string | null;
  role:        string;
  createdAt:   string;
  lastLoginAt: string | null;
  inviteToken: string | null;
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return 'Never';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d));
}

function getInitial(name: string | null | undefined, email: string): string {
  if (name && name.trim().length > 0) return name.trim()[0].toUpperCase();
  return email[0].toUpperCase();
}

function getDisplayName(name: string | null | undefined, email: string): string {
  return name && name.trim().length > 0 ? name.trim() : email;
}

const roleBadge: Record<string, string> = {
  OWNER:  'badge-purple',
  ADMIN:  'badge-blue',
  MEMBER: 'badge-gray',
  VIEWER: 'badge-gray',
};

const roleLabel: Record<string, string> = {
  OWNER:  'Owner',
  ADMIN:  'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

export default function TeamMembersPage() {
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'MEMBER' });
  const [inviting, setInviting]     = useState(false);
  const [inviteErr, setInviteErr]   = useState('');
  const [inviteSent, setInviteSent] = useState('');

  useEffect(() => {
    fetch('/api/admin/team')
      .then((r) => r.json())
      .then((d) => { setUsers(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true); setInviteErr('');
    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) { setInviteErr(data.error || 'Failed to invite.'); return; }
      setInviteSent(inviteForm.email);
      setInviteForm({ email: '', name: '', role: 'MEMBER' });
      setShowInvite(false);
      // Refresh users list
      fetch('/api/admin/team').then((r) => r.json()).then(setUsers).catch(() => {});
    } catch {
      setInviteErr('Something went wrong.');
    } finally {
      setInviting(false);
    }
  }

  const activeUsers  = users.filter((u) => !u.inviteToken);
  const pendingUsers = users.filter((u) => !!u.inviteToken);

  const totalMembers = activeUsers.length;
  const ownerCount   = activeUsers.filter((u) => u.role === 'OWNER').length;
  const adminCount   = activeUsers.filter((u) => u.role === 'ADMIN').length;
  const memberCount  = activeUsers.filter((u) => u.role === 'MEMBER').length;

  if (loading) return (
    <>
      <div className="page-header"><div><h1 className="page-title">Team Members</h1></div></div>
      <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--gray)' }}>Loading...</div>
    </>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Members</h1>
          <p className="page-sub">Manage access and roles for your admin panel</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setInviteSent(''); setShowInvite(true); }}>
          <UserPlus size={13} />
          Invite Member
        </button>
      </div>

      {inviteSent && (
        <div style={{ padding: '12px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, marginBottom: 20, fontSize: '0.83rem', color: 'var(--green)' }}>
          Invitation sent to {inviteSent}. They will receive an email with a registration link.
        </div>
      )}

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Members', value: totalMembers },
          { label: 'Owners',        value: ownerCount },
          { label: 'Admins',        value: adminCount },
          { label: 'Members',       value: memberCount },
        ].map((k) => (
          <div key={k.label} className="card-blue" style={{ padding: 20 }}>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Team table */}
      <div className="card" style={{ padding: 0, marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Active Members
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last Login</th>
                <th>Member Since</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>
                        {getInitial(u.name, u.email)}
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--white)' }}>
                        {getDisplayName(u.name, u.email)}
                      </span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--light)', fontSize: '0.82rem' }}>{u.email}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} className={`badge ${roleBadge[u.role] ?? 'badge-gray'}`}>
                      <Shield size={10} />
                      {roleLabel[u.role] ?? u.role}
                    </span>
                  </td>
                  <td style={{ color: 'var(--gray)', fontSize: '0.82rem' }}>{fmtDate(u.lastLoginAt)}</td>
                  <td style={{ color: 'var(--gray)', fontSize: '0.82rem' }}>{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending invitations */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Pending Invitations
        </div>
        {pendingUsers.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.88rem', color: 'var(--gray)' }}>No pending invitations</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Email</th><th>Role</th><th>Invited</th></tr></thead>
              <tbody>
                {pendingUsers.map((u) => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--light)' }}>{u.email}</td>
                    <td><span className={`badge ${roleBadge[u.role] ?? 'badge-gray'}`}>{roleLabel[u.role] ?? u.role}</span></td>
                    <td style={{ color: 'var(--gray)', fontSize: '0.82rem' }}>{fmtDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowInvite(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 28 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', margin: 0 }}>Invite Team Member</h2>
              <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={sendInvite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Email *</label>
                <input className="input" type="email" required placeholder="colleague@company.com" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Name (optional)</label>
                <input className="input" type="text" placeholder="Full name" value={inviteForm.name} onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Role *</label>
                <select className="input" value={inviteForm.role} onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}>
                  <option value="VIEWER">Viewer — read-only access</option>
                  <option value="MEMBER">Member — standard access</option>
                  <option value="ADMIN">Admin — full access (no billing)</option>
                  <option value="OWNER">Owner — full access</option>
                </select>
              </div>
              {inviteErr && <div style={{ fontSize: '0.8rem', color: 'var(--red)', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>{inviteErr}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" className="btn btn-primary" disabled={inviting} style={{ flex: 1 }}>
                  {inviting ? 'Sending...' : <><Send size={13} /> Send Invitation</>}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowInvite(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
