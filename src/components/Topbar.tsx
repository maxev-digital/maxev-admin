'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Search, Settings, LogOut, User } from 'lucide-react';
import Link from 'next/link';

type Profile = { name: string | null; email: string; role: string };

export default function Topbar() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/admin/profile')
      .then((r) => r.json())
      .then((d) => { if (d.email) setProfile(d); })
      .catch(() => {});

    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = profile?.name
    ? profile.name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : profile?.email?.[0]?.toUpperCase() ?? 'ME';

  return (
    <header className="admin-topbar">
      {/* Search */}
      <div style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray)' }} />
        <input
          type="text"
          placeholder="Search clients, leads, proposals..."
          className="input"
          style={{ paddingLeft: 32, fontSize: '0.8rem', height: 34 }}
        />
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Notification bell */}
        <button className="btn btn-ghost btn-sm" style={{ padding: '6px', position: 'relative' }} aria-label="Notifications">
          <Bell size={16} />
          <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', border: '1.5px solid var(--black)' }} />
        </button>

        {/* User menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: menuOpen ? 'var(--card2)' : 'none',
              border: `1px solid ${menuOpen ? 'var(--border)' : 'transparent'}`,
              borderRadius: 8, padding: '4px 10px 4px 4px', cursor: 'pointer',
            }}
          >
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>
              {initials}
            </div>
            {profile && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--white)', lineHeight: 1.2 }}>
                  {profile.name || profile.email.split('@')[0]}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--gray)', textTransform: 'capitalize' }}>
                  {profile.role.toLowerCase()}
                </div>
              </div>
            )}
          </button>

          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, width: 200, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 200 }}>
              {profile && (
                <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>{profile.name || 'No name set'}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--gray)' }}>{profile.email}</div>
                </div>
              )}
              <Link href="/system/settings" className="sidebar-item" style={{ borderRadius: 7, padding: '7px 12px', display: 'flex' }} onClick={() => setMenuOpen(false)}>
                <User size={13} />
                Profile & Settings
              </Link>
              <Link href="/system/team" className="sidebar-item" style={{ borderRadius: 7, padding: '7px 12px', display: 'flex' }} onClick={() => setMenuOpen(false)}>
                <Settings size={13} />
                Team Members
              </Link>
              <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
              <Link href="/api/auth/signout" className="sidebar-item" style={{ borderRadius: 7, padding: '7px 12px', display: 'flex', color: 'var(--red)' }}>
                <LogOut size={13} style={{ color: 'var(--red)' }} />
                Sign Out
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
