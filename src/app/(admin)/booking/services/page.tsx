'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Clock, Sparkles, X, Check, User, Plus } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  color: string;
  description: string | null;
  isActive: boolean;
}

interface StaffMember {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  color: string;
  isActive: boolean;
}

const BLANK_SERVICE: Omit<Service, 'id'> = { name: '', durationMin: 60, price: 0, color: '#3B7DD9', description: '', isActive: true };
const BLANK_STAFF: Omit<StaffMember, 'id'> = { name: '', role: '', email: '', phone: '', color: '#3B7DD9', isActive: true };

export default function ServicesStaffPage() {
  const [services, setServices]     = useState<Service[]>([]);
  const [staff, setStaff]           = useState<StaffMember[]>([]);
  const [loading, setLoading]       = useState(true);

  // Service modal
  const [showSvc, setShowSvc]       = useState(false);
  const [svcForm, setSvcForm]       = useState(BLANK_SERVICE);
  const [svcSaving, setSvcSaving]   = useState(false);
  const [svcErr, setSvcErr]         = useState('');

  // Staff modal
  const [showStaff, setShowStaff]   = useState(false);
  const [staffForm, setStaffForm]   = useState(BLANK_STAFF);
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffErr, setStaffErr]     = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/booking/services').then((r) => r.json()),
      fetch('/api/booking/staff').then((r) => r.json()),
    ]).then(([svcs, stf]) => {
      setServices(svcs);
      setStaff(stf);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function toggleService(svc: Service) {
    const updated = { ...svc, isActive: !svc.isActive };
    setServices((prev) => prev.map((s) => s.id === svc.id ? updated : s));
    await fetch(`/api/booking/services/${svc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !svc.isActive }),
    }).catch(() => setServices((prev) => prev.map((s) => s.id === svc.id ? svc : s)));
  }

  async function saveService(e: React.FormEvent) {
    e.preventDefault();
    setSvcSaving(true); setSvcErr('');
    try {
      const res = await fetch('/api/booking/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...svcForm, price: Number(svcForm.price), durationMin: Number(svcForm.durationMin) }),
      });
      if (!res.ok) throw new Error('Failed');
      const created: Service = await res.json();
      setServices((prev) => [...prev, created]);
      setShowSvc(false);
      setSvcForm(BLANK_SERVICE);
    } catch {
      setSvcErr('Failed to create service — please try again.');
    } finally { setSvcSaving(false); }
  }

  async function saveStaff(e: React.FormEvent) {
    e.preventDefault();
    setStaffSaving(true); setStaffErr('');
    try {
      const res = await fetch('/api/booking/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...staffForm, email: staffForm.email || null, phone: staffForm.phone || null, role: staffForm.role || null }),
      });
      if (!res.ok) throw new Error('Failed');
      const created: StaffMember = await res.json();
      setStaff((prev) => [...prev, created]);
      setShowStaff(false);
      setStaffForm(BLANK_STAFF);
    } catch {
      setStaffErr('Failed to create staff member — please try again.');
    } finally { setStaffSaving(false); }
  }

  if (loading) return (
    <>
      <div className="page-header"><div><h1 className="page-title">Services &amp; Staff</h1><p className="page-sub">Loading...</p></div></div>
      <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--gray)', fontSize: '0.88rem' }}>Loading services and staff...</div>
    </>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Services &amp; Staff</h1>
          <p className="page-sub">MAX EV Digital — service catalog and provider availability</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowSvc(true)}><Plus size={13} />Add Service</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowStaff(true)}><User size={13} />Add Staff</button>
        </div>
      </div>

      {/* ── Services Catalog ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div className="section-icon"><DollarSign size={15} style={{ color: '#fff' }} /></div>
        <div>
          <div className="section-title">Services Catalog</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>{services.length} service{services.length !== 1 ? 's' : ''} configured</div>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="card" style={{ padding: '36px 24px', textAlign: 'center', marginBottom: 32 }}>
          <DollarSign size={32} style={{ color: 'var(--gray)', margin: '0 auto 10px', display: 'block', opacity: 0.4 }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--light)', marginBottom: 6 }}>No services yet</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 16 }}>Add your first service offering.</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowSvc(true)}><Plus size={13} />Add Service</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 32 }}>
          {services.map((svc) => (
            <div key={svc.id} className={svc.isActive ? 'card-blue' : 'card'} style={{ padding: 18, opacity: svc.isActive ? 1 : 0.6, transition: 'opacity 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--white)', lineHeight: 1.3 }}>{svc.name}</div>
                <button onClick={() => toggleService(svc)}
                  style={{ flexShrink: 0, width: 38, height: 22, borderRadius: 999, background: svc.isActive ? 'rgba(0,212,200,0.18)' : 'rgba(255,255,255,0.06)', border: svc.isActive ? '1px solid rgba(0,212,200,0.4)' : '1px solid var(--border)', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}
                  title={svc.isActive ? 'Deactivate' : 'Activate'}>
                  <div style={{ position: 'absolute', top: 3, left: svc.isActive ? 18 : 3, width: 14, height: 14, borderRadius: '50%', background: svc.isActive ? '#00D4C8' : 'var(--gray)', transition: 'left 0.2s, background 0.2s' }} />
                </button>
              </div>
              {svc.description && <div style={{ fontSize: '0.76rem', color: 'var(--gray)', marginBottom: 12, lineHeight: 1.5 }}>{svc.description}</div>}
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>
                  <Clock size={11} style={{ color: 'var(--gray)' }} />
                  <span style={{ fontSize: '0.76rem', color: 'var(--light)' }}>{svc.durationMin} min</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 6, background: 'rgba(0,212,200,0.07)', border: '1px solid rgba(0,212,200,0.18)' }}>
                  <DollarSign size={11} style={{ color: '#5EEAD4' }} />
                  <span style={{ fontSize: '0.76rem', color: '#5EEAD4', fontWeight: 700 }}>{svc.price === 0 ? 'Free' : `$${svc.price.toLocaleString()}`}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={svc.isActive ? 'badge badge-green' : 'badge badge-gray'}>{svc.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Staff Availability ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div className="section-icon" style={{ background: 'linear-gradient(135deg,#7C3AED,#9B59B6)' }}>
          <User size={15} style={{ color: '#fff' }} />
        </div>
        <div>
          <div className="section-title">Staff Members</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>{staff.length} active provider{staff.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {staff.length === 0 ? (
        <div className="card" style={{ padding: '36px 24px', textAlign: 'center', marginBottom: 24 }}>
          <User size={32} style={{ color: 'var(--gray)', margin: '0 auto 10px', display: 'block', opacity: 0.4 }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--light)', marginBottom: 6 }}>No staff yet</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 16 }}>Add your first team member.</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowStaff(true)}><User size={13} />Add Staff</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {staff.map((member) => (
            <div key={member.id} className="card" style={{ padding: 20, borderTop: `2px solid ${member.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${member.color}22`, border: `1px solid ${member.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={16} style={{ color: member.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--white)', fontSize: '0.9rem' }}>{member.name}</div>
                  {member.role && <div style={{ fontSize: '0.7rem', color: 'var(--gray)', marginTop: 1 }}>{member.role}</div>}
                </div>
                <span className={member.isActive ? 'badge badge-green' : 'badge badge-gray'}>{member.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {member.email && <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{member.email}</div>}
                {member.phone && <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{member.phone}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── AI Dynamic Pricing insight card ──────────────────────────────── */}
      <div className="card" style={{ padding: 20, border: '1px solid rgba(124,58,237,0.3)', borderTop: '2px solid #7C3AED', background: 'rgba(124,58,237,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: 'linear-gradient(135deg,#5B21B6,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={15} style={{ color: '#fff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#C4B5FD', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>AI Service Intelligence</div>
            <p style={{ fontSize: '0.84rem', color: 'var(--light)', lineHeight: 1.6 }}>
              {services.length > 0 ? `${services.filter((s) => s.isActive).length} of ${services.length} services are currently active. Connect appointment data to unlock utilization insights and dynamic pricing recommendations.` : 'Add services to your catalog and start booking appointments to unlock AI-powered pricing and utilization insights.'}
            </p>
          </div>
        </div>
      </div>

      {/* Add Service Modal */}
      {showSvc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowSvc(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: 28 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>Add Service</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>Add a new service to your catalog</p>
              </div>
              <button onClick={() => setShowSvc(false)} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={saveService} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Service Name *</label>
                <input className="input" required placeholder="Routine Cleaning" value={svcForm.name} onChange={(e) => setSvcForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="label">Duration (min) *</label>
                  <input className="input" type="number" min={15} max={480} required value={svcForm.durationMin} onChange={(e) => setSvcForm((f) => ({ ...f, durationMin: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="label">Price ($)</label>
                  <input className="input" type="number" min={0} placeholder="0 = free" value={svcForm.price} onChange={(e) => setSvcForm((f) => ({ ...f, price: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} placeholder="Optional service description" value={svcForm.description ?? ''} onChange={(e) => setSvcForm((f) => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              {svcErr && <div style={{ fontSize: '0.8rem', color: 'var(--red)', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>{svcErr}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" className="btn btn-primary" disabled={svcSaving} style={{ flex: 1 }}>{svcSaving ? 'Saving...' : 'Add Service'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowSvc(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showStaff && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowStaff(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: 28 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>Add Staff Member</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>Add a provider or team member</p>
              </div>
              <button onClick={() => setShowStaff(false)} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={saveStaff} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="label">Full Name *</label>
                  <input className="input" required placeholder="Dr. Martinez" value={staffForm.name} onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Role / Title</label>
                  <input className="input" placeholder="Account Manager" value={staffForm.role ?? ''} onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" placeholder="staff@company.com" value={staffForm.email ?? ''} onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" type="tel" placeholder="(555) 000-0000" value={staffForm.phone ?? ''} onChange={(e) => setStaffForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Calendar Color</label>
                <input className="input" type="color" value={staffForm.color} onChange={(e) => setStaffForm((f) => ({ ...f, color: e.target.value }))} style={{ height: 40, cursor: 'pointer' }} />
              </div>
              {staffErr && <div style={{ fontSize: '0.8rem', color: 'var(--red)', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>{staffErr}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" className="btn btn-primary" disabled={staffSaving} style={{ flex: 1 }}>{staffSaving ? 'Saving...' : 'Add Staff'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowStaff(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
