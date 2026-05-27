'use client';

import { useState, useEffect } from 'react';
import { Globe, Palette, Bell, Shield, Database, User, Terminal } from 'lucide-react';

function Section({ icon: Icon, title, color, bg, children }: {
  icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>;
  title: string;
  color: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: 24, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div className="section-icon" style={{ background: bg }}>
          <Icon size={15} style={{ color }} />
        </div>
        <span className="section-title">{title}</span>
      </div>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="input-group">
      <label className="label">{label}</label>
      <div style={{ padding: '9px 12px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 7, fontSize: '0.85rem', color: 'var(--light)' }}>
        {value}
      </div>
    </div>
  );
}

function ToggleRow({ label, description, enabled, onToggle }: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--white)', fontSize: '0.88rem', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{description}</div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        aria-label={label}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: enabled ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 3px',
          cursor: 'pointer',
          flexShrink: 0,
          border: 'none',
          transition: 'background 0.2s',
        }}
      >
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--white)', transform: enabled ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    digest: true,
  });
  const [security, setSecurity] = useState({
    twoFa: false,
  });
  const [exporting, setExporting] = useState(false);

  // Profile state
  const [profile, setProfile]       = useState({ name: '', email: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [pwForm, setPwForm]         = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwMsg, setPwMsg]           = useState('');

  useEffect(() => {
    fetch('/api/admin/profile').then((r) => r.json()).then((d) => {
      if (d.name !== undefined) setProfile({ name: d.name ?? '', email: d.email ?? '' });
    }).catch(() => {});
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true); setProfileMsg('');
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profile.name }),
      });
      if (!res.ok) { const d = await res.json(); setProfileMsg(d.error || 'Failed to save.'); return; }
      setProfileMsg('Saved.');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch { setProfileMsg('Error saving.'); }
    finally { setProfileSaving(false); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { setPwMsg('Passwords do not match.'); return; }
    setPwSaving(true); setPwMsg('');
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const d = await res.json();
      if (!res.ok) { setPwMsg(d.error || 'Failed.'); return; }
      setPwMsg('Password updated.');
      setPwForm({ current: '', next: '', confirm: '' });
      setTimeout(() => setPwMsg(''), 4000);
    } catch { setPwMsg('Error updating password.'); }
    finally { setPwSaving(false); }
  }

  const flip = (k: keyof typeof notifications) =>
    setNotifications((s) => ({ ...s, [k]: !s[k] }));

  const flipSec = (k: keyof typeof security) =>
    setSecurity((s) => ({ ...s, [k]: !s[k] }));

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => setExporting(false), 1500);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">App configuration and preferences</p>
        </div>
      </div>

      {/* Profile */}
      <Section icon={User} title="My Profile" color="#8B5CF6" bg="rgba(139,92,246,0.1)">
        <form onSubmit={saveProfile} style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="label">Display Name</label>
              <input className="input" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Your name" />
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="label">Email (read-only)</label>
              <div style={{ padding: '9px 12px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 7, fontSize: '0.85rem', color: 'var(--gray)' }}>{profile.email || '...'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="submit" className="btn btn-secondary btn-sm" disabled={profileSaving}>{profileSaving ? 'Saving...' : 'Save Name'}</button>
            {profileMsg && <span style={{ fontSize: '0.76rem', color: profileMsg === 'Saved.' ? 'var(--green)' : 'var(--red)' }}>{profileMsg}</span>}
          </div>
        </form>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Change Password</div>
          <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><label className="label">Current Password</label><input className="input" type="password" value={pwForm.current} onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))} required /></div>
              <div><label className="label">New Password</label><input className="input" type="password" value={pwForm.next} onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))} required minLength={8} /></div>
              <div><label className="label">Confirm New</label><input className="input" type="password" value={pwForm.confirm} onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))} required /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="submit" className="btn btn-secondary btn-sm" disabled={pwSaving}>{pwSaving ? 'Updating...' : 'Change Password'}</button>
              {pwMsg && <span style={{ fontSize: '0.76rem', color: pwMsg.includes('updated') ? 'var(--green)' : 'var(--red)' }}>{pwMsg}</span>}
            </div>
          </form>
        </div>
      </Section>

      <Section icon={Globe} title="General" color="var(--primary)" bg="rgba(37,99,235,0.12)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <ReadOnlyField label="App Name" value="Max EV Digital Admin" />
          <ReadOnlyField label="App URL" value="localhost:3001" />
          <ReadOnlyField label="Timezone" value="America/Chicago" />
        </div>
      </Section>

      <Section icon={Palette} title="Branding" color="#8B5CF6" bg="rgba(139,92,246,0.1)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <ReadOnlyField label="Company Name" value="Max EV Digital" />
          <ReadOnlyField label="Tagline" value="Done-for-you digital stack for DFW businesses" />
          <div className="input-group">
            <label className="label">Primary Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 7 }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: '#2563EB', flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--light)' }}>#2563EB</span>
            </div>
          </div>
        </div>
      </Section>

      <Section icon={Bell} title="Notifications" color="var(--orange)" bg="rgba(229,90,43,0.1)">
        <ToggleRow
          label="Email Notifications"
          description="Receive email alerts for new leads, replies, and invoices"
          enabled={notifications.email}
          onToggle={() => flip('email')}
        />
        <ToggleRow
          label="SMS Alerts"
          description="Text alerts for hot lead activity and pipeline changes"
          enabled={notifications.sms}
          onToggle={() => flip('sms')}
        />
        <ToggleRow
          label="Weekly Digest"
          description="Sunday evening summary of pipeline, MRR, and outreach stats"
          enabled={notifications.digest}
          onToggle={() => flip('digest')}
        />
      </Section>

      <Section icon={Shield} title="Security" color="var(--green)" bg="rgba(0,212,200,0.1)">
        <ToggleRow
          label="Require 2FA"
          description="Require two-factor authentication for all admin logins"
          enabled={security.twoFa}
          onToggle={() => flipSec('twoFa')}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--white)', fontSize: '0.88rem', marginBottom: 2 }}>Session Duration</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>How long before users are logged out</div>
          </div>
          <div style={{ padding: '6px 14px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 7, fontSize: '0.84rem', color: 'var(--light)' }}>
            7 days
          </div>
        </div>
      </Section>

      <Section icon={Terminal} title="Cron Setup" color="#F59E0B" bg="rgba(245,158,11,0.1)">
        <p style={{ fontSize: '0.82rem', color: 'var(--gray)', marginBottom: 16, lineHeight: 1.6 }}>
          These endpoints must be called on a schedule to power automated billing and drip sequences.
          Add these as PM2 scheduled tasks or system cron jobs.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              label: 'Recurring Billing — Daily',
              cmd: `curl -s -X POST https://admin.maxevdigital.com/api/cron/billing -H "Authorization: Bearer $CRON_SECRET"`,
              hint: 'Generates invoices for due recurring schedules. Run daily at 8am.',
            },
            {
              label: 'Drip Sequences — Every 30 min',
              cmd: `curl -s -X POST https://admin.maxevdigital.com/api/cron/drip -H "Authorization: Bearer $CRON_SECRET"`,
              hint: 'Sends pending sequence emails. Run every 30 minutes.',
            },
          ].map((item) => (
            <div key={item.label} style={{ padding: '14px 16px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ fontWeight: 700, color: 'var(--white)', fontSize: '0.83rem', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--gray)', marginBottom: 8 }}>{item.hint}</div>
              <code style={{ display: 'block', padding: '8px 12px', background: 'rgba(0,0,0,0.4)', borderRadius: 6, fontSize: '0.72rem', color: '#93C5FD', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                {item.cmd}
              </code>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: '0.76rem', color: '#FCD34D' }}>
          Set <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>CRON_SECRET</code> in your <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>.env</code> file to secure these endpoints. Pass it as a Bearer token.
        </div>
      </Section>

      <Section icon={Database} title="Data" color="#EF4444" bg="rgba(239,68,68,0.1)">
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExport}
            disabled={exporting}
          >
            <Database size={13} />
            {exporting ? 'Exporting...' : 'Export All Data'}
          </button>
          <button type="button" className="btn btn-danger btn-sm">
            Clear Demo Data
          </button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 12 }}>
          Export generates a JSON archive of all clients, leads, invoices, and prospects. Clear Demo Data removes all seeded records — this cannot be undone.
        </p>
      </Section>
    </>
  );
}
