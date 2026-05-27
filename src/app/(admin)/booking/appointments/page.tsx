'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X, AlertTriangle, Check, User, Clock, Calendar, Plus } from 'lucide-react';

type DbStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED' | 'OPEN';
type UiStatus = 'Confirmed' | 'Completed' | 'No-Show' | 'Cancelled' | 'Pending';
type Risk = 'high' | 'medium' | null;

interface DbAppointment {
  id: string;
  patientName: string;
  patientEmail: string | null;
  patientPhone: string | null;
  startTime: string;
  durationMin: number;
  status: DbStatus;
  notes: string | null;
  service: { id: string; name: string } | null;
  staff: { id: string; name: string; role: string | null } | null;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  sortKey: string;
  patient: string;
  email: string | null;
  phone: string | null;
  service: string;
  doctor: string;
  durationMin: number;
  status: UiStatus;
  risk: Risk;
}

interface Service {
  id: string;
  name: string;
  durationMin: number;
}

interface Staff {
  id: string;
  name: string;
  role: string | null;
}

const STATUS_MAP: Record<DbStatus, UiStatus> = {
  CONFIRMED: 'Confirmed',
  PENDING:   'Pending',
  OPEN:      'Confirmed',
  NO_SHOW:   'No-Show',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const DB_STATUS_MAP: Record<UiStatus, DbStatus> = {
  Confirmed: 'CONFIRMED',
  Pending:   'PENDING',
  'No-Show': 'NO_SHOW',
  Completed: 'COMPLETED',
  Cancelled: 'CANCELLED',
};

function mapAppt(a: DbAppointment): Appointment {
  const dt = new Date(a.startTime);
  return {
    id:          a.id,
    date:        dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time:        dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    sortKey:     a.startTime,
    patient:     a.patientName,
    email:       a.patientEmail,
    phone:       a.patientPhone,
    service:     a.service?.name ?? 'Unknown Service',
    doctor:      a.staff?.name ?? 'Unassigned',
    durationMin: a.durationMin,
    status:      STATUS_MAP[a.status] ?? 'Confirmed',
    risk:        null,
  };
}

const STATUS_TABS = [
  { label: 'All',       value: 'all' },
  { label: 'Upcoming',  value: 'upcoming' },
  { label: 'Completed', value: 'Completed' },
  { label: 'No-Show',   value: 'No-Show' },
  { label: 'Cancelled', value: 'Cancelled' },
];

function statusBadge(status: UiStatus) {
  const map: Record<UiStatus, string> = {
    Confirmed: 'badge badge-blue',
    Completed: 'badge badge-green',
    'No-Show': 'badge badge-red',
    Cancelled: 'badge badge-gray',
    Pending:   'badge badge-orange',
  };
  return map[status];
}

function riskBadge(risk: Risk) {
  if (!risk) return null;
  if (risk === 'high')   return <span className="badge badge-red">High Risk</span>;
  if (risk === 'medium') return <span className="badge badge-orange">Medium Risk</span>;
  return null;
}

const BLANK_FORM = { patientName: '', patientEmail: '', patientPhone: '', serviceId: '', staffId: '', startTime: '', durationMin: 60, notes: '' };

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState('all');
  const [bannerVisible, setBanner]      = useState(true);
  const [aiScoring, setAiScoring]       = useState(false);

  // New Appointment modal
  const [showNew, setShowNew]       = useState(false);
  const [services, setServices]     = useState<Service[]>([]);
  const [staff, setStaff]           = useState<Staff[]>([]);
  const [newForm, setNewForm]       = useState(BLANK_FORM);
  const [newSaving, setNewSaving]   = useState(false);
  const [newErr, setNewErr]         = useState('');
  const [smsMsg, setSmsMsg]         = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/booking/appointments').then((r) => r.json()),
      fetch('/api/booking/services').then((r) => r.json()),
      fetch('/api/booking/staff').then((r) => r.json()),
    ]).then(([appts, svc, stf]: [DbAppointment[], Service[], Staff[]]) => {
      const mapped = appts.map(mapAppt);
      setAppointments(mapped);
      setServices(svc);
      setStaff(stf);
      setLoading(false);

      // AI risk scoring for upcoming confirmed
      const upcoming = mapped.filter((a) => a.status === 'Confirmed');
      if (!upcoming.length) return;
      setAiScoring(true);
      fetch('/api/ai/score-appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointments: upcoming.map((a) => ({ id: a.id, patient: a.patient, service: a.service, time: a.time, durationMin: a.durationMin })) }),
      })
        .then((r) => r.json())
        .then((scored: Array<{ id: string; risk: 'high' | 'medium' | 'low' }>) => {
          setAppointments((prev) => prev.map((a) => {
            const s = scored.find((s) => s.id === a.id);
            if (!s) return a;
            const risk: Risk = s.risk === 'high' ? 'high' : s.risk === 'medium' ? 'medium' : null;
            return { ...a, risk };
          }));
        })
        .catch(() => {})
        .finally(() => setAiScoring(false));
    }).catch(() => setLoading(false));
  }, []);

  async function patchStatus(id: string, uiStatus: UiStatus) {
    const dbStatus = DB_STATUS_MAP[uiStatus];
    const res = await fetch(`/api/booking/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: dbStatus }),
    });
    if (!res.ok) return;
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: uiStatus } : a));
  }

  async function sendReminder(appt: Appointment) {
    if (!appt.phone) {
      setSmsMsg(`No phone number on file for ${appt.patient}.`);
      setTimeout(() => setSmsMsg(''), 4000);
      return;
    }
    const res = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:        'appointment_reminder',
        to:          appt.phone,
        patientName: appt.patient,
        date:        appt.date,
        time:        appt.time,
        service:     appt.service,
      }),
    });
    const data = await res.json();
    if (data.ok) setSmsMsg(`SMS reminder sent to ${appt.patient}.`);
    else if (data.error === 'Twilio not configured') setSmsMsg('Twilio not configured — add TWILIO credentials to .env.');
    else setSmsMsg(`SMS failed: ${data.error}`);
    setTimeout(() => setSmsMsg(''), 5000);
  }

  async function createAppointment(e: React.FormEvent) {
    e.preventDefault();
    setNewSaving(true); setNewErr('');
    try {
      const payload = {
        patientName:  newForm.patientName,
        patientEmail: newForm.patientEmail || null,
        patientPhone: newForm.patientPhone || null,
        serviceId:    newForm.serviceId   || null,
        staffId:      newForm.staffId     || null,
        startTime:    new Date(newForm.startTime).toISOString(),
        durationMin:  Number(newForm.durationMin),
        notes:        newForm.notes       || null,
        status:       'CONFIRMED',
      };
      const res = await fetch('/api/booking/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed');
      const created: DbAppointment = await res.json();
      setAppointments((prev) => [mapAppt(created), ...prev]);
      setShowNew(false);
      setNewForm(BLANK_FORM);
    } catch {
      setNewErr('Failed to create appointment — please try again.');
    } finally { setNewSaving(false); }
  }

  const filtered = appointments.filter((a) => {
    if (activeTab === 'all')      return true;
    if (activeTab === 'upcoming') return a.status === 'Confirmed' || a.status === 'Pending';
    return a.status === activeTab;
  }).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const highRiskCount   = appointments.filter((a) => a.risk === 'high' && (a.status === 'Confirmed' || a.status === 'Pending')).length;
  const completedCount  = appointments.filter((a) => a.status === 'Completed').length;
  const noShowCount     = appointments.filter((a) => a.status === 'No-Show').length;
  const cancelledCount  = appointments.filter((a) => a.status === 'Cancelled').length;
  const noShowRate      = appointments.length > 0 ? Math.round((noShowCount / appointments.length) * 100) : 0;

  if (loading) return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Appointments</h1><p className="page-sub">Loading...</p></div>
      </div>
      <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--gray)', fontSize: '0.88rem' }}>Loading appointments...</div>
    </>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-sub">MAX EV Digital — full appointment log &amp; risk analysis</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
          <Plus size={13} />Schedule Appointment
        </button>
      </div>

      {smsMsg && (
        <div style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.22)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '0.82rem', color: 'var(--light)' }}>
          {smsMsg}
        </div>
      )}

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total',        value: String(appointments.length), cls: 'kpi-value' },
          { label: 'Completed',    value: String(completedCount),      cls: 'kpi-value-green' },
          { label: 'No-Shows',     value: String(noShowCount),         cls: 'kpi-value-orange' },
          { label: 'Cancellations',value: String(cancelledCount),      cls: 'kpi-value-orange' },
          { label: 'No-Show Rate', value: `${noShowRate}%`,            cls: noShowRate > 15 ? 'kpi-value-orange' : 'kpi-value' },
        ].map((k) => (
          <div key={k.label} className="card" style={{ padding: '14px 18px' }}>
            <div className={k.cls}>{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* AI banner */}
      {bannerVisible && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.28)', borderRadius: 10, marginBottom: 20 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, background: 'linear-gradient(135deg,#5B21B6,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={14} style={{ color: '#fff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#C4B5FD', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {aiScoring ? 'Scoring No-Show Risk...' : 'AI Risk Analysis Complete'}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--light)', lineHeight: 1.55 }}>
              {aiScoring
                ? 'Claude is analyzing appointment patterns and scoring no-show probability...'
                : highRiskCount > 0
                  ? <><strong style={{ color: 'var(--white)' }}>{highRiskCount} upcoming appointment{highRiskCount > 1 ? 's' : ''}</strong> flagged as HIGH risk for no-show. Send confirmation reminders or double-book these slots.</>
                  : appointments.length === 0
                    ? 'No appointments yet — schedule one to get started.'
                    : 'All upcoming appointments scored — no high-risk no-shows detected.'}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0, padding: '4px 8px' }} onClick={() => setBanner(false)}><X size={14} /></button>
        </div>
      )}

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {STATUS_TABS.map((tab) => {
          const active = activeTab === tab.value;
          const count = tab.value === 'all' ? null
            : tab.value === 'upcoming' ? appointments.filter((a) => a.status === 'Confirmed' || a.status === 'Pending').length
            : appointments.filter((a) => a.status === tab.value).length;
          return (
            <button key={tab.value} className={active ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} onClick={() => setActiveTab(tab.value)}>
              {tab.label}
              {count !== null && (
                <span style={{ fontSize: '0.64rem', background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)', borderRadius: 999, padding: '1px 6px', marginLeft: 2 }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {appointments.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Calendar size={36} style={{ color: 'var(--gray)', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--light)', marginBottom: 6 }}>No appointments yet</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--gray)', marginBottom: 16 }}>Schedule your first appointment to get started.</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}><Plus size={13} />Schedule Appointment</button>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Time</th><th>Patient</th><th>Service</th>
                    <th>Staff</th><th>Duration</th><th>Status</th><th>Risk</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--gray)' }}>No appointments in this category.</td></tr>
                  ) : filtered.map((appt) => (
                    <tr key={appt.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <Calendar size={12} style={{ color: 'var(--gray)', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.8rem', color: 'var(--light)' }}>{appt.date}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={12} style={{ color: 'var(--gray)', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.8rem' }}>{appt.time}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <User size={12} style={{ color: 'var(--gray)', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--white)', fontSize: '0.82rem' }}>{appt.patient}</div>
                            {appt.email && <div style={{ fontSize: '0.7rem', color: 'var(--gray)' }}>{appt.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--light)', fontSize: '0.82rem' }}>{appt.service}</td>
                      <td><span className="badge badge-blue">{appt.doctor}</span></td>
                      <td style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>{appt.durationMin} min</td>
                      <td><span className={statusBadge(appt.status)}>{appt.status}</span></td>
                      <td>{riskBadge(appt.risk) ?? <span style={{ color: 'var(--gray)', fontSize: '0.75rem' }}>--</span>}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {(appt.status === 'Confirmed' || appt.status === 'Pending') && (
                            <>
                              <button className="btn btn-sm" style={{ background: 'rgba(229,90,43,0.1)', color: '#FCA57A', border: '1px solid rgba(229,90,43,0.2)' }}
                                onClick={() => sendReminder(appt)} title={appt.phone ? `SMS ${appt.phone}` : 'No phone on file'}>
                                <AlertTriangle size={11} />Remind
                              </button>
                              <button className="btn btn-sm" style={{ background: 'rgba(0,212,200,0.08)', color: '#5EEAD4', border: '1px solid rgba(0,212,200,0.18)' }}
                                onClick={() => patchStatus(appt.id, 'Completed')}>
                                <Check size={11} />
                              </button>
                              <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.08)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.18)' }}
                                onClick={() => patchStatus(appt.id, 'No-Show')}>
                                <X size={11} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: '0.72rem', color: 'var(--gray)' }}>
            Showing {filtered.length} of {appointments.length} appointments
          </div>
        </>
      )}

      {/* Schedule Appointment Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowNew(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 560, padding: 28 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>Schedule Appointment</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>Book a new appointment</p>
              </div>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
            </div>
            <form onSubmit={createAppointment} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="label">Patient Name *</label>
                  <input className="input" placeholder="John Smith" required value={newForm.patientName} onChange={(e) => setNewForm((f) => ({ ...f, patientName: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" placeholder="patient@email.com" value={newForm.patientEmail} onChange={(e) => setNewForm((f) => ({ ...f, patientEmail: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" type="tel" placeholder="(555) 000-0000" value={newForm.patientPhone} onChange={(e) => setNewForm((f) => ({ ...f, patientPhone: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Date &amp; Time *</label>
                  <input className="input" type="datetime-local" required value={newForm.startTime} onChange={(e) => setNewForm((f) => ({ ...f, startTime: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label className="label">Service</label>
                  <select className="input" value={newForm.serviceId} onChange={(e) => {
                    const svc = services.find((s) => s.id === e.target.value);
                    setNewForm((f) => ({ ...f, serviceId: e.target.value, durationMin: svc?.durationMin ?? f.durationMin }));
                  }}>
                    <option value="">-- Select --</option>
                    {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Staff</label>
                  <select className="input" value={newForm.staffId} onChange={(e) => setNewForm((f) => ({ ...f, staffId: e.target.value }))}>
                    <option value="">-- Select --</option>
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Duration (min)</label>
                  <input className="input" type="number" min={15} max={480} value={newForm.durationMin} onChange={(e) => setNewForm((f) => ({ ...f, durationMin: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} placeholder="Any special notes..." value={newForm.notes} onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              {newErr && <div style={{ fontSize: '0.8rem', color: 'var(--red)', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>{newErr}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" className="btn btn-primary" disabled={newSaving} style={{ flex: 1 }}>{newSaving ? 'Scheduling...' : 'Schedule Appointment'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
