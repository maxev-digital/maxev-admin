'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Mail, MessageSquare, X, Check, Loader2, Send,
  FileText, Receipt, UserPlus, CheckSquare,
} from 'lucide-react';
import { useDraftModal } from '@/lib/draft-modal';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

export default function DraftModal() {
  const { payload, closeDraft } = useDraftModal();

  const [editedData, setEditedData] = useState<Record<string, unknown>>({});
  const [twDone, setTwDone]         = useState(true);
  const [sending, setSending]       = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState('');
  const [result, setResult]         = useState('');
  const twRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!payload) return;
    setEditedData({ ...payload.draftData });
    setSending(false);
    setDone(false);
    setError('');
    setResult('');

    if (twRef.current) { clearInterval(twRef.current); twRef.current = null; }

    if (payload.docType === 'message') {
      const text = String(payload.draftData.body ?? '');
      setEditedData(prev => ({ ...prev, body: '' }));
      setTwDone(false);
      if (!text) { setTwDone(true); return; }
      const ms = Math.max(4, Math.min(12, 3500 / text.length));
      let i = 0;
      twRef.current = setInterval(() => {
        i++;
        setEditedData(prev => ({ ...prev, body: text.slice(0, i) }));
        if (i >= text.length) { setTwDone(true); clearInterval(twRef.current!); twRef.current = null; }
      }, ms);
    } else {
      setTwDone(true);
    }

    return () => { if (twRef.current) { clearInterval(twRef.current); twRef.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  function stopTypewriter() {
    if (twRef.current) {
      clearInterval(twRef.current); twRef.current = null;
      setEditedData(prev => ({ ...prev, body: String(payload?.draftData.body ?? '') }));
      setTwDone(true);
    }
  }

  function updateField(key: string, value: unknown) {
    setEditedData(prev => ({ ...prev, [key]: value }));
  }

  async function handleApprove() {
    if (!payload || sending || done) return;
    stopTypewriter();
    setSending(true);
    setError('');
    const out = await payload.onApprove(editedData);
    setSending(false);
    if (out.ok) {
      setResult(out.result ?? 'Saved successfully.');
      setDone(true);
      setTimeout(() => closeDraft(), 1800);
    } else {
      setError(out.error ?? 'Failed. Please try again.');
    }
  }

  function handleClose() { stopTypewriter(); closeDraft(); }

  // ── JSX helpers ──────────────────────────────────────────────────────────────

  function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--gray)', width: 96, flexShrink: 0, paddingTop: 8 }}>
          {label}
        </span>
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    );
  }

  function StaticVal({ v }: { v: string }) {
    return (
      <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--light)', padding: '6px 10px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 7 }}>
        {v}
      </span>
    );
  }

  function EditInput({ fieldKey, placeholder = '' }: { fieldKey: string; placeholder?: string }) {
    return (
      <input
        className="input"
        value={String(editedData[fieldKey] ?? '')}
        onChange={e => updateField(fieldKey, e.target.value)}
        disabled={sending || done}
        placeholder={placeholder}
        style={{ width: '100%', fontSize: '0.82rem', height: 36 }}
      />
    );
  }

  function EditTextarea({ fieldKey, rows = 3, placeholder = '' }: { fieldKey: string; rows?: number; placeholder?: string }) {
    return (
      <textarea
        className="input"
        value={String(editedData[fieldKey] ?? '')}
        onChange={e => updateField(fieldKey, e.target.value)}
        disabled={sending || done}
        placeholder={placeholder}
        rows={rows}
        style={{ width: '100%', fontSize: '0.82rem', lineHeight: 1.65, fontFamily: 'inherit', resize: 'vertical' }}
      />
    );
  }

  // ── Per-docType body renderers ───────────────────────────────────────────────

  function MessageBody() {
    const isSMS = String(payload?.draftData.channel ?? 'email') === 'sms';
    return (
      <>
        <Row label="To"><StaticVal v={String(editedData.to ?? '')} /></Row>
        {!isSMS && <Row label="Subject"><EditInput fieldKey="subject" /></Row>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--gray)' }}>Message</span>
          <div style={{ position: 'relative' }}>
            <textarea
              className="input"
              value={String(editedData.body ?? '')}
              onChange={e => { stopTypewriter(); updateField('body', e.target.value); }}
              disabled={sending || done}
              rows={12}
              style={{ width: '100%', resize: 'vertical', fontSize: '0.82rem', lineHeight: 1.65, minHeight: 200, fontFamily: 'inherit' }}
            />
            {!twDone && (
              <span style={{ position: 'absolute', right: 10, bottom: 10, display: 'inline-block', width: 2, height: '0.85em', background: 'var(--primary)', animation: 'chatDotPulse 0.8s ease-in-out infinite', pointerEvents: 'none' }} />
            )}
          </div>
        </div>
      </>
    );
  }

  function ProposalBody() {
    const lineItems = Array.isArray(editedData.lineItems)
      ? editedData.lineItems as Array<{ name: string; type: string; price: string }>
      : [];
    return (
      <>
        <Row label="Business"><StaticVal v={String(editedData.businessName ?? '')} /></Row>
        <Row label="Industry"><StaticVal v={String(editedData.industry ?? '')} /></Row>
        <Row label="Package"><StaticVal v={String(editedData.packageTier ?? '')} /></Row>

        {lineItems.length > 0 && (
          <div>
            <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--gray)', marginBottom: 7 }}>Services</div>
            <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {lineItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: i < lineItems.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '0.83rem' }}>
                  <span style={{ color: 'var(--light)' }}>{item.name}</span>
                  <span style={{ fontWeight: 700, color: item.type === 'monthly' ? 'var(--green)' : 'var(--white)' }}>
                    {item.type === 'monthly' ? `$${item.price}/mo` : `$${item.price}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>One-Time Setup</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--white)' }}>{fmt(Number(editedData.oneTimeTotal ?? 0))}</div>
          </div>
          <div style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.28)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Monthly Retainer</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--green)' }}>{fmt(Number(editedData.monthlyTotal ?? 0))}<span style={{ fontSize: '0.75rem', fontWeight: 500 }}>/mo</span></div>
          </div>
        </div>

        <Row label="Notes"><EditTextarea fieldKey="notes" rows={3} placeholder="Add any notes to this proposal..." /></Row>
      </>
    );
  }

  function LeadBody() {
    return (
      <>
        <Row label="Business"><StaticVal v={String(editedData.businessName ?? '')} /></Row>
        {editedData.contactName && <Row label="Contact"><StaticVal v={String(editedData.contactName)} /></Row>}
        {editedData.phone && <Row label="Phone"><StaticVal v={String(editedData.phone)} /></Row>}
        {editedData.email && <Row label="Email"><StaticVal v={String(editedData.email)} /></Row>}
        <Row label="Industry"><StaticVal v={String(editedData.industry ?? '')} /></Row>
        <Row label="Priority"><StaticVal v={`${String(editedData.priority ?? 'WARM')} | Stage: ${String(editedData.stage ?? 'LEAD')}`} /></Row>
        <Row label="Est. Value"><EditInput fieldKey="estimatedValue" placeholder="Estimated value..." /></Row>
        <Row label="Notes"><EditTextarea fieldKey="notes" rows={3} placeholder="Add notes for this lead..." /></Row>
      </>
    );
  }

  function TaskBody() {
    return (
      <>
        <Row label="Title"><EditInput fieldKey="title" placeholder="Task title..." /></Row>
        <Row label="Priority"><StaticVal v={String(editedData.priority ?? 'MEDIUM')} /></Row>
        {editedData.assignedTo && <Row label="Assigned To"><StaticVal v={String(editedData.assignedTo)} /></Row>}
        {editedData.dueDate && <Row label="Due Date"><StaticVal v={String(editedData.dueDate)} /></Row>}
        <Row label="Notes"><EditTextarea fieldKey="notes" rows={3} placeholder="Add notes for this task..." /></Row>
      </>
    );
  }

  function InvoiceBody() {
    return (
      <>
        <Row label="Client"><StaticVal v={String(editedData.clientName ?? '')} /></Row>
        <Row label="Type"><StaticVal v={String(editedData.invoiceType ?? '')} /></Row>
        <div style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.28)', borderRadius: 10, padding: '12px 16px', marginBottom: 4 }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Invoice Amount</div>
          <EditInput fieldKey="amount" placeholder="0" />
        </div>
        {editedData.dueDate && <Row label="Due Date"><StaticVal v={String(editedData.dueDate)} /></Row>}
        <Row label="Notes"><EditTextarea fieldKey="notes" rows={3} placeholder="Add notes for this invoice..." /></Row>
      </>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!payload) return null;

  const { docType } = payload;
  const isSMS = String(payload.draftData.channel ?? 'email') === 'sms';

  const headerIcon = (() => {
    if (docType === 'proposal') return <FileText size={16} />;
    if (docType === 'invoice')  return <Receipt size={16} />;
    if (docType === 'lead')     return <UserPlus size={16} />;
    if (docType === 'task')     return <CheckSquare size={16} />;
    return isSMS ? <MessageSquare size={16} /> : <Mail size={16} />;
  })();

  const headerLabel = (() => {
    if (docType === 'proposal') return 'Proposal Draft';
    if (docType === 'invoice')  return 'Invoice Draft';
    if (docType === 'lead')     return 'New Lead';
    if (docType === 'task')     return 'New Task';
    return isSMS ? 'SMS Draft' : 'Email Draft';
  })();

  const approveLabel = (() => {
    if (docType === 'proposal') return 'Save Proposal';
    if (docType === 'invoice')  return 'Create Invoice';
    if (docType === 'lead')     return 'Add to Pipeline';
    if (docType === 'task')     return 'Create Task';
    return isSMS ? 'Send SMS' : 'Send EMAIL';
  })();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={!sending && !done ? handleClose : undefined}
        style={{ position: 'fixed', inset: 0, zIndex: 180, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', animation: 'aiFadeIn 0.2s ease' }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 190, width: '100%', maxWidth: 640, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        background: 'var(--card)',
        border: done ? '1px solid var(--green)' : '1px solid rgba(59,125,217,0.45)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        animation: 'aiModalIn 0.22s cubic-bezier(0.34,1.3,0.64,1)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 18px', background: done ? 'rgba(34,197,94,0.1)' : 'rgba(37,99,235,0.09)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <span style={{ color: done ? 'var(--green)' : 'var(--primary)', display: 'flex', flexShrink: 0 }}>{headerIcon}</span>
          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: done ? 'var(--green)' : 'var(--white)', flex: 1 }}>{headerLabel}</span>
          {done && (
            <span className="ai-success-pop" style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600 }}>
              <Check size={14} /> Saved
            </span>
          )}
          <button onClick={handleClose} disabled={sending} style={{ background: 'none', border: 'none', cursor: sending ? 'default' : 'pointer', color: 'var(--gray)', padding: 4, display: 'flex', borderRadius: 5, opacity: sending ? 0.4 : 1 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 13 }}>
          {docType === 'message'  && <MessageBody />}
          {docType === 'proposal' && <ProposalBody />}
          {docType === 'lead'     && <LeadBody />}
          {docType === 'task'     && <TaskBody />}
          {docType === 'invoice'  && <InvoiceBody />}

          {done && result && (
            <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={14} /> {result}
            </div>
          )}
          {error && (
            <div style={{ fontSize: '0.78rem', color: 'var(--red)', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div style={{ display: 'flex', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--card2)', flexShrink: 0 }}>
            <button onClick={handleClose} disabled={sending} className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>
              <X size={13} /> Cancel
            </button>
            <button onClick={handleApprove} disabled={sending} className="btn btn-primary" style={{ flex: 1, fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              {sending
                ? <><Loader2 size={13} className="spin" /> Saving...</>
                : <><Send size={13} /> Approve &amp; {approveLabel}</>}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
