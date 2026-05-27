'use client';

import { useState, useEffect } from 'react';
import { FileText, DollarSign, Clock, AlertTriangle, Plus, Download, Eye, X } from 'lucide-react';

type ContractStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'DRAFT';

interface Contract {
  id: string;
  clientName: string;
  serviceName: string;
  startDate: string;
  endDate: string;
  monthlyValue: number;
  status: ContractStatus;
  notes: string | null;
}

const STATUS_LABELS: Record<ContractStatus, string> = {
  ACTIVE:        'Active',
  EXPIRING_SOON: 'Expiring Soon',
  EXPIRED:       'Expired',
  DRAFT:         'Draft',
};

const STATUS_BADGE: Record<ContractStatus, string> = {
  ACTIVE:        'badge-green',
  EXPIRING_SOON: 'badge-orange',
  EXPIRED:       'badge-red',
  DRAFT:         'badge-gray',
};

const SERVICES = ['Full Stack Package', 'Pro Package', 'Growth Package', 'Starter Package', 'Custom'];

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function ContractsPage() {
  const [contracts, setContracts]   = useState<Contract[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showNew, setShowNew]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({ clientName: '', serviceName: SERVICES[2], startDate: '', endDate: '', monthlyValue: '', notes: '' });

  useEffect(() => {
    fetch('/api/finance/contracts')
      .then((r) => r.json())
      .then((d: Contract[]) => setContracts(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeContracts   = contracts.filter((c) => c.status === 'ACTIVE');
  const expiringSoon      = contracts.filter((c) => c.status === 'EXPIRING_SOON');
  const totalMonthlyValue = [...activeContracts, ...expiringSoon].reduce((s, c) => s + c.monthlyValue, 0);

  async function handleCreate() {
    if (!form.clientName.trim() || !form.startDate || !form.endDate || !form.monthlyValue) return;
    setSaving(true);
    try {
      const res = await fetch('/api/finance/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const created: Contract = await res.json();
      setContracts((prev) => [created, ...prev]);
      setShowNew(false);
      setForm({ clientName: '', serviceName: SERVICES[2], startDate: '', endDate: '', monthlyValue: '', notes: '' });
    } finally {
      setSaving(false);
    }
  }

  function handleDownload(c: Contract) {
    const lines = [
      `CONTRACT / STATEMENT OF WORK`,
      ``,
      `Client:          ${c.clientName}`,
      `Service:         ${c.serviceName}`,
      `Monthly Value:   ${fmt(c.monthlyValue)}`,
      `Start Date:      ${fmtDate(c.startDate)}`,
      `End Date:        ${fmtDate(c.endDate)}`,
      `Status:          ${STATUS_LABELS[c.status]}`,
      c.notes ? `\nNotes: ${c.notes}` : '',
    ].filter(Boolean).join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-${c.clientName.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contracts &amp; SOW</h1>
          <p className="page-sub">Signed agreements, statements of work, and pending documents</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={13} /> New Contract
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card-green" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-green">{loading ? '—' : activeContracts.length}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Active Contracts</div>
        </div>

        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">{loading ? '—' : expiringSoon.length}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Expiring Soon</div>
        </div>

        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{loading ? '—' : `${fmt(totalMonthlyValue * 12)}/yr`}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total Contract Value</div>
        </div>
      </div>

      {expiringSoon.length > 0 && (
        <div style={{ background: 'rgba(229,90,43,0.08)', border: '1px solid rgba(229,90,43,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={15} style={{ color: 'var(--orange)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', color: '#FCA57A' }}>
            <strong>{expiringSoon.length} contract{expiringSoon.length > 1 ? 's' : ''}</strong> expiring within 30 days. Reach out to discuss renewal.
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--gray)', padding: '40px 0', textAlign: 'center' }}>Loading...</div>
      ) : contracts.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <FileText size={32} style={{ color: 'var(--gray)', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontWeight: 700, color: 'var(--white)', marginBottom: 4 }}>No contracts yet</div>
          <div style={{ color: 'var(--gray)', fontSize: '0.84rem', marginBottom: 16 }}>Track client agreements and renewal dates.</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}><Plus size={13} /> Add First Contract</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Monthly Value</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: 'var(--white)' }}>{c.clientName}</td>
                    <td style={{ color: 'var(--light)' }}>{c.serviceName}</td>
                    <td style={{ color: 'var(--gray)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtDate(c.startDate)}</td>
                    <td style={{ color: c.status === 'EXPIRING_SOON' ? '#FCA57A' : c.status === 'EXPIRED' ? '#FCA5A5' : 'var(--gray)', fontSize: '0.78rem', whiteSpace: 'nowrap', fontWeight: c.status === 'EXPIRING_SOON' ? 600 : 400 }}>
                      {fmtDate(c.endDate)}
                    </td>
                    <td style={{ color: 'var(--green)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {fmt(c.monthlyValue)}<span style={{ color: 'var(--gray)', fontWeight: 400, fontSize: '0.75rem' }}>/mo</span>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[c.status]}`} style={{ fontSize: '0.64rem' }}>{STATUS_LABELS[c.status]}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDownload(c)}>
                          <Download size={12} /> Download SOW
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{contracts.length} contracts total</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--light)', fontWeight: 600 }}>
              Active MRR: <span style={{ color: 'var(--green)', fontWeight: 700 }}>{fmt(totalMonthlyValue)}</span>
            </span>
          </div>
        </div>
      )}

      {showNew && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div style={{ width: '100%', maxWidth: 520, background: '#0a0a0f', border: '1px solid #1a1a2e', borderRadius: 14, padding: 32, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>New Contract</h2>
              <button type="button" onClick={() => setShowNew(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #222', borderRadius: 8, padding: '6px 8px', color: '#888', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Client Name', key: 'clientName', type: 'text', placeholder: 'e.g. Plano Plumbing Co' },
                { label: 'Monthly Value ($)', key: 'monthlyValue', type: 'number', placeholder: '1200' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
                  <input
                    type={type}
                    style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Service</label>
                <select
                  style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14 }}
                  value={form.serviceName}
                  onChange={(e) => setForm((f) => ({ ...f, serviceName: e.target.value }))}
                >
                  {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Start Date', key: 'startDate' },
                  { label: 'End Date', key: 'endDate' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
                    <input
                      type="date"
                      style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes (optional)</label>
                <textarea
                  style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, resize: 'vertical', minHeight: 80, boxSizing: 'border-box', fontFamily: 'inherit' }}
                  placeholder="Any additional terms or notes..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 18 }}
              onClick={handleCreate}
              disabled={saving || !form.clientName.trim() || !form.startDate || !form.endDate || !form.monthlyValue}
            >
              {saving ? 'Saving...' : 'Create Contract'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
