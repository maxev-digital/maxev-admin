'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, Sparkles, AlertTriangle, User, Check, Link } from 'lucide-react';

type AppointmentStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED' | 'OPEN';

interface StaffMember {
  id: string;
  name: string;
  color: string;
  role: string | null;
}

interface Appointment {
  id: string;
  patientName: string;
  patientEmail: string | null;
  startTime: string;
  durationMin: number;
  status: AppointmentStatus;
  notes: string | null;
  staff: StaffMember | null;
  service: { name: string } | null;
}

const DAY_START = 8;
const DAY_END   = 17;
const SLOT_HT   = 56;
const TOTAL_HT  = (DAY_END - DAY_START) * SLOT_HT;

function hourToLabel(h: number) {
  const hh = Math.floor(h), mm = (h % 1) * 60;
  const suffix  = hh < 12 ? 'am' : 'pm';
  const display = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh;
  return mm === 0 ? `${display}${suffix}` : `${display}:${String(mm).padStart(2, '0')}${suffix}`;
}

function getWeekBounds(offset: number): { start: Date; end: Date; days: Date[] } {
  const now   = new Date();
  const dow   = now.getDay();
  const mon   = new Date(now);
  mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  mon.setHours(0, 0, 0, 0);
  const days  = Array.from({ length: 5 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
  const end   = new Date(days[4]);
  end.setHours(23, 59, 59, 999);
  return { start: mon, end, days };
}

export default function BookingCalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff]               = useState<StaffMember[]>([]);
  const [loading, setLoading]           = useState(true);
  const [weekOffset, setWeekOffset]     = useState(0);
  const [gcalConnected, setGcalConnected] = useState<boolean | null>(null);

  const { start, end, days } = getWeekBounds(weekOffset);

  useEffect(() => {
    const s = start.toISOString(), e = end.toISOString();
    Promise.all([
      fetch(`/api/booking/appointments?start=${s}&end=${e}`).then((r) => r.json()),
      fetch('/api/booking/staff').then((r) => r.json()),
      fetch('/api/google/calendar/status').then((r) => r.json()),
    ]).then(([appts, staffList, gcal]) => {
      setAppointments(appts);
      setStaff(staffList);
      setGcalConnected(gcal.connected ?? false);
      setLoading(false);
    }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  const timeLabels: number[] = [];
  for (let h = DAY_START; h <= DAY_END; h++) timeLabels.push(h);

  const weekLabel = days[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const confirmedCount = appointments.filter((a) => a.status === 'CONFIRMED').length;
  const openCount      = appointments.filter((a) => a.status === 'OPEN').length;

  function apptsByDay(day: Date): Appointment[] {
    const ds = day.toDateString();
    return appointments.filter((a) => new Date(a.startTime).toDateString() === ds);
  }

  function startHour(a: Appointment): number {
    const d = new Date(a.startTime);
    return d.getHours() + d.getMinutes() / 60;
  }

  function staffColor(s: StaffMember | null): { bg: string; border: string; text: string } {
    if (!s) return { bg: 'rgba(100,100,100,0.18)', border: 'rgba(100,100,100,0.4)', text: 'var(--light)' };
    const hex = s.color ?? '#3B7DD9';
    return { bg: `${hex}22`, border: `${hex}66`, text: hex };
  }

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Booking & Scheduling</h1>
            <p className="page-sub">Weekly calendar view</p>
          </div>
          <button className="btn btn-primary btn-sm"><Calendar size={13} />New Appointment</button>
        </div>

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'This Week',    value: loading ? '...' : String(confirmedCount),    cls: 'kpi-value' },
            { label: 'Open Slots',   value: loading ? '...' : String(openCount),         cls: 'kpi-value-orange' },
            { label: 'Staff Active', value: loading ? '...' : String(staff.length),      cls: 'kpi-value' },
            { label: 'Appointments', value: loading ? '...' : String(appointments.length), cls: 'kpi-value' },
          ].map((k) => (
            <div key={k.label} className="card" style={{ padding: '14px 18px' }}>
              <div className={k.cls}>{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {!loading && appointments.length === 0 && staff.length === 0 && (
          <div className="card" style={{ padding: '48px 24px', textAlign: 'center', marginBottom: 16 }}>
            <Calendar size={36} style={{ color: 'var(--gray)', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--light)', marginBottom: 6 }}>No bookings yet</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray)' }}>Add staff and appointments to populate the calendar.</div>
          </div>
        )}

        {/* Week nav */}
        <div className="card" style={{ padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset((p) => p - 1)}><ChevronLeft size={14} /> Prev Week</button>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--white)' }}>Week of {weekLabel}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset((p) => p + 1)}>Next Week <ChevronRight size={14} /></button>
        </div>

        {/* Calendar grid */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(5, 1fr)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: '10px 8px', borderRight: '1px solid var(--border)' }} />
            {days.map((day) => (
              <div key={day.toISOString()} style={{ padding: '10px 12px', borderRight: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)' }}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--white)', marginTop: 2 }}>
                  {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(5, 1fr)', position: 'relative' }}>
            <div style={{ position: 'relative', height: TOTAL_HT, borderRight: '1px solid var(--border)' }}>
              {timeLabels.map((h) => (
                <div key={h} style={{ position: 'absolute', top: (h - DAY_START) * SLOT_HT - 8, right: 6, fontSize: '0.6rem', color: 'var(--gray)', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {hourToLabel(h)}
                </div>
              ))}
            </div>
            {days.map((day) => {
              const dayAppts = apptsByDay(day);
              return (
                <div key={day.toISOString()} style={{ position: 'relative', height: TOTAL_HT, borderRight: '1px solid var(--border)' }}>
                  {timeLabels.map((h) => (
                    <div key={h} style={{ position: 'absolute', top: (h - DAY_START) * SLOT_HT, left: 0, right: 0, height: 1, background: 'var(--border)' }} />
                  ))}
                  {dayAppts.map((appt) => {
                    const sh  = startHour(appt);
                    const top = (sh - DAY_START) * SLOT_HT;
                    const ht  = Math.max((appt.durationMin / 60) * SLOT_HT, 32);
                    const col = staffColor(appt.staff);

                    if (appt.status === 'OPEN') {
                      return (
                        <div key={appt.id} style={{ position: 'absolute', top: top + 2, left: 4, right: 4, height: ht - 4, border: '1.5px dashed rgba(255,255,255,0.18)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--gray)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Available</span>
                        </div>
                      );
                    }

                    return (
                      <div key={appt.id} style={{ position: 'absolute', top: top + 2, left: 4, right: 4, height: ht - 4, background: col.bg, border: `1px solid ${col.border}`, borderRadius: 6, padding: '5px 7px', overflow: 'hidden', cursor: 'pointer' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--white)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.patientName}</div>
                        {ht > 38 && appt.service && <div style={{ fontSize: '0.62rem', color: col.text, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.service.name}</div>}
                        {ht > 52 && appt.staff && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <span style={{ fontSize: '0.58rem', fontWeight: 600, background: `${appt.staff.color}33`, color: col.text, borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap' }}>{appt.staff.name}</span>
                            <span style={{ fontSize: '0.58rem', color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: 2 }}><Clock size={9} />{appt.durationMin}m</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff legend */}
        {staff.length > 0 && (
          <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Staff:</span>
            {staff.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: `${s.color}33`, border: `1.5px solid ${s.color}66` }} />
                <span style={{ fontSize: '0.72rem', color: s.color }}>{s.name}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'transparent', border: '1.5px dashed rgba(255,255,255,0.18)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>Available</span>
            </div>
          </div>
        )}
      </div>

      {/* AI sidebar */}
      <div style={{ width: 280, flexShrink: 0, position: 'sticky', top: 0 }}>
        <div className="card-blue" style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#1D4ED8,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={13} style={{ color: '#fff' }} />
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Schedule Health</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: <Calendar size={12} />, text: `${openCount} open slot${openCount !== 1 ? 's' : ''} this week`, color: '#93C5FD' },
              { icon: <User size={12} />, text: `${staff.length} staff member${staff.length !== 1 ? 's' : ''} active`, color: '#C4B5FD' },
              { icon: <AlertTriangle size={12} />, text: `${confirmedCount} confirmed appointment${confirmedCount !== 1 ? 's' : ''}`, color: '#6EE7B7' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 7, border: '1px solid var(--border)' }}>
                <span style={{ color: item.color, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: '0.76rem', color: 'var(--light)' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Google Calendar sync status */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Google Calendar</div>
          {gcalConnected === null ? (
            <div style={{ fontSize: '0.76rem', color: 'var(--gray)' }}>Checking...</div>
          ) : gcalConnected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.76rem', color: 'var(--green)', fontWeight: 600 }}>Syncing events</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--gray)', margin: 0, lineHeight: 1.5 }}>
                New appointments auto-create Google Calendar events.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: '#93C5FD' }}>
                <Check size={10} />
                <span>Auto-sync on</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--gray)', margin: 0, lineHeight: 1.5 }}>
                Connect Google Calendar to auto-sync appointments.
              </p>
              <a
                href="/api/google/calendar/connect"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: '#60A5FA', textDecoration: 'none', fontWeight: 600 }}
              >
                <Link size={11} />
                Connect Calendar
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
