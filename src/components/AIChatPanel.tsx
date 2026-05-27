'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  MessageSquare, Send, ChevronRight, Loader2, Bot, Trash2,
  FileText, Receipt, UserPlus, CheckSquare, Mail, Check, X,
  Mic, MicOff, Volume2, VolumeX,
} from 'lucide-react';
import { useAIHighlight, HighlightTarget } from '@/lib/ai-highlight';
import { useDraftModal } from '@/lib/draft-modal';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DraftAction {
  type: 'draft';
  docType: 'proposal' | 'invoice' | 'lead' | 'task' | 'message';
  description: string;
  data: Record<string, unknown>;
}

interface ConfirmAction {
  type: 'confirm';
  operation: string;
  description: string;
  payload: Record<string, unknown>;
}

interface NavigateAction {
  type: 'navigate';
  path: string;
  description: string;
}

interface FilterAction {
  type: 'filter';
  path: string;
  params: Record<string, string>;
  description: string;
}

type ChatAction = DraftAction | ConfirmAction | NavigateAction | FilterAction;

type ActionStatus = 'pending' | 'saving' | 'done' | 'error' | 'cancelled';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: ChatAction;
  actionStatus?: ActionStatus;
  actionResult?: string;
  model?: string;
}

const SUGGESTIONS = [
  'Show me overdue invoices',
  'Who are my hot leads?',
  'How is my business doing?',
  'Any urgent support tickets?',
  'Create a proposal for a new client',
  'What tasks are due today?',
];

// ── Typewriter ─────────────────────────────────────────────────────────────────

function TypewriterText({ text, animate, speed }: { text: string; animate?: boolean; speed?: number }) {
  const [displayed, setDisplayed] = useState(animate ? '' : text);
  const [done, setDone]           = useState(!animate);

  useEffect(() => {
    if (!animate) { setDisplayed(text); setDone(true); return; }
    setDisplayed('');
    setDone(false);
    if (!text) return;
    const ms = speed ?? Math.max(5, Math.min(20, 2600 / text.length));
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { setDone(true); clearInterval(iv); }
    }, ms);
    return () => clearInterval(iv);
  }, [text, animate, speed]);

  return (
    <>
      {displayed}
      {!done && (
        <span style={{
          display: 'inline-block', width: 2, height: '0.85em',
          background: 'var(--primary)', marginLeft: 1, verticalAlign: 'text-bottom',
          animation: 'chatDotPulse 0.8s ease-in-out infinite',
        }} />
      )}
    </>
  );
}

// ── Draft icons ────────────────────────────────────────────────────────────────

function draftIcon(docType: string) {
  if (docType === 'proposal') return <FileText size={14} />;
  if (docType === 'invoice')  return <Receipt size={14} />;
  if (docType === 'lead')     return <UserPlus size={14} />;
  if (docType === 'task')     return <CheckSquare size={14} />;
  if (docType === 'message')  return <Mail size={14} />;
  return <FileText size={14} />;
}

// ── Draft card ─────────────────────────────────────────────────────────────────

function DraftCard({
  action,
  status,
  result,
  onApprove,
  onCancel,
  onOpenEditor,
  animate,
}: {
  action: DraftAction;
  status: ActionStatus;
  result?: string;
  onApprove: () => void;
  onCancel: () => void;
  onOpenEditor?: () => void;
  animate?: boolean;
}) {
  const { docType, data } = action;
  const done      = status === 'done';
  const saving    = status === 'saving';
  const cancelled = status === 'cancelled';
  const errored   = status === 'error';

  const labelMap: Record<string, string> = {
    proposal: 'Proposal Draft',
    invoice:  'Invoice Draft',
    lead:     'New Lead',
    task:     'New Task',
    message:  'Message Draft',
  };

  return (
    <div style={{
      marginTop: 8,
      background: 'var(--card2)',
      border: `1px solid ${done ? 'var(--green)' : cancelled ? 'var(--border)' : 'rgba(37,99,235,0.4)'}`,
      borderRadius: 10,
      overflow: 'hidden',
      opacity: cancelled ? 0.5 : 1,
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        background: done ? 'rgba(34,197,94,0.1)' : 'rgba(37,99,235,0.08)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        fontSize: '0.75rem',
        fontWeight: 600,
        color: done ? 'var(--green)' : 'var(--primary)',
      }}>
        {draftIcon(docType)}
        {labelMap[docType] ?? 'Draft'}
        {done && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="ai-success-pop" style={{ color: 'var(--green)' }}><Check size={14} /></span>
            <span style={{ fontSize: '0.72rem' }}>Saved</span>
          </span>
        )}
        {errored && <span style={{ marginLeft: 'auto', color: 'var(--red)', fontSize: '0.7rem' }}>Failed</span>}
      </div>

      {/* Fields */}
      <div style={{ padding: '10px 12px', fontSize: '0.775rem', lineHeight: 1.7, color: 'var(--light)' }}>
        {docType === 'proposal' && (
          <>
            <div><strong>Business:</strong> {String(data.businessName ?? '')}</div>
            <div style={{ marginTop: 3 }}><strong>Package:</strong> {String(data.packageTier ?? '')} {Number(data.monthlyTotal) > 0 ? `— $${Number(data.monthlyTotal).toLocaleString()}/mo` : ''}</div>
            {Number(data.oneTimeTotal) > 0 && <div><strong>Setup:</strong> ${Number(data.oneTimeTotal).toLocaleString()}</div>}
            <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--gray)', fontStyle: 'italic' }}>
              Review line items and amounts in the center panel before saving.
            </div>
          </>
        )}

        {docType === 'invoice' && (
          <>
            <div><strong>Client:</strong> {String(data.clientName ?? '')}</div>
            <div><strong>Amount:</strong> ${Number(data.amount ?? 0).toLocaleString()}</div>
            {data.dueDate && <div><strong>Due:</strong> {String(data.dueDate)}</div>}
            <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--gray)', fontStyle: 'italic' }}>
              Review and confirm in the center panel before creating.
            </div>
          </>
        )}

        {docType === 'lead' && (
          <>
            <div><strong>Business:</strong> {String(data.businessName ?? '')}</div>
            {data.contactName && <div><strong>Contact:</strong> {String(data.contactName)}</div>}
            {data.estimatedValue && <div><strong>Est. Value:</strong> ${Number(data.estimatedValue).toLocaleString()}</div>}
            <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--gray)', fontStyle: 'italic' }}>
              Review and confirm in the center panel before adding to pipeline.
            </div>
          </>
        )}

        {docType === 'task' && (
          <>
            <div><strong>Task:</strong> {String(data.title ?? '')}</div>
            <div><strong>Priority:</strong> {String(data.priority ?? 'MEDIUM')}</div>
            {data.dueDate && <div><strong>Due:</strong> {String(data.dueDate)}</div>}
            <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--gray)', fontStyle: 'italic' }}>
              Review and confirm in the center panel before creating.
            </div>
          </>
        )}

        {docType === 'message' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                padding: '2px 6px', borderRadius: 4,
                background: data.channel === 'sms' ? 'rgba(20,184,173,0.15)' : 'rgba(59,125,217,0.15)',
                color: data.channel === 'sms' ? 'var(--green)' : 'var(--primary)',
              }}>
                {String(data.channel ?? 'email').toUpperCase()}
              </span>
            </div>
            {data.to && <div><strong>To:</strong> {String(data.to)}</div>}
            {data.subject && <div style={{ marginTop: 2 }}><strong>Subject:</strong> {String(data.subject)}</div>}
            <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--gray)', fontStyle: 'italic' }}>
              Draft opened in editor — edit &amp; send from the center panel.
            </div>
          </>
        )}

        {result && done && (
          <div style={{ marginTop: 8, padding: '7px 10px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 7, fontSize: '0.72rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Check size={12} /> {result}
          </div>
        )}
        {result && !done && (
          <div style={{ marginTop: 6, fontSize: '0.7rem', color: 'var(--red)' }}>{result}</div>
        )}
      </div>

      {/* Actions */}
      {!done && !cancelled && (
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 6,
        }}>
          <button
            onClick={onOpenEditor}
            style={{
              flex: 1,
              background: 'var(--primary)',
              border: 'none',
              borderRadius: 6,
              padding: '6px 10px',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <FileText size={11} /> Review Draft
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '6px 10px',
              color: 'var(--gray)',
              fontSize: '0.75rem',
              cursor: saving ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <X size={11} /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Confirm card ───────────────────────────────────────────────────────────────

function ConfirmCard({
  action,
  status,
  result,
  onConfirm,
  onCancel,
}: {
  action: ConfirmAction;
  status: ActionStatus;
  result?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const done      = status === 'done';
  const saving    = status === 'saving';
  const cancelled = status === 'cancelled';

  return (
    <div style={{
      marginTop: 8,
      background: 'var(--card2)',
      border: `1px solid ${done ? 'var(--green)' : cancelled ? 'var(--border)' : 'rgba(217,109,59,0.4)'}`,
      borderRadius: 10,
      overflow: 'hidden',
      opacity: cancelled ? 0.5 : 1,
    }}>
      <div style={{
        padding: '8px 12px',
        background: done ? 'rgba(34,197,94,0.1)' : 'rgba(217,109,59,0.08)',
        borderBottom: '1px solid var(--border)',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: done ? 'var(--green)' : 'var(--orange)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        {done ? <Check size={13} /> : null}
        {done ? 'Done' : 'Confirm Action'}
      </div>
      <div style={{ padding: '10px 12px', fontSize: '0.775rem', color: 'var(--light)' }}>
        {action.description}
        {result && <div style={{ marginTop: 5, fontSize: '0.7rem', color: done ? 'var(--green)' : 'var(--red)' }}>{result}</div>}
      </div>
      {!done && !cancelled && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
          <button
            onClick={onConfirm}
            disabled={saving}
            style={{
              flex: 1, background: 'var(--orange)', border: 'none', borderRadius: 6,
              padding: '6px 10px', color: '#fff', fontSize: '0.75rem', fontWeight: 600,
              cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            {saving ? <><Loader2 size={11} className="spin" /> Working...</> : 'Confirm'}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              padding: '6px 10px', color: 'var(--gray)', fontSize: '0.75rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <X size={11} /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export default function AIChatPanel() {
  const [isOpen, setIsOpen]       = useState(false);
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [navigating, setNavigating] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLTextAreaElement>(null);
  const animatedIds     = useRef<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef  = useRef<any>(null);
  const stableInputRef  = useRef('');
  const router   = useRouter();
  const pathname = usePathname();
  const { setHighlights } = useAIHighlight();
  const { openDraft, closeDraft } = useDraftModal();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Execute navigation ───────────────────────────────────────────────────────

  function deriveHighlights(action: NavigateAction | FilterAction): HighlightTarget[] {
    const targets: HighlightTarget[] = [];
    const path   = action.path;
    const params = action.type === 'filter' ? action.params : {};

    // Always flash the sidebar nav item
    targets.push({ type: 'nav-path', value: path, effect: 'glow' });

    // Page-specific content highlights
    if (path.includes('/invoices') && params?.status) {
      targets.push({ type: 'invoice-status', value: String(params.status).toUpperCase(), effect: 'glow' });
    }
    if (path.includes('/pipeline') && params?.stage) {
      targets.push({ type: 'lead-stage', value: String(params.stage).toUpperCase(), effect: 'glow' });
    }
    if (path.includes('/pipeline/hot') || (path.includes('/pipeline') && params?.priority === 'HOT')) {
      targets.push({ type: 'lead-priority', value: 'HOT', effect: 'glow' });
    }
    if (path.includes('/helpdesk') && params?.priority) {
      targets.push({ type: 'ticket-priority', value: String(params.priority).toUpperCase(), effect: 'glow' });
    }
    if (path.includes('/tasks') && params?.status) {
      targets.push({ type: 'task-status', value: String(params.status).toUpperCase(), effect: 'glow' });
    }
    if (path.includes('/proposals') && params?.status) {
      targets.push({ type: 'proposal-status', value: String(params.status).toUpperCase(), effect: 'glow' });
    }

    return targets;
  }

  function executeNavigation(action: NavigateAction | FilterAction) {
    const path = action.type === 'filter'
      ? action.path + '?' + new URLSearchParams(action.params).toString()
      : action.path;
    setNavigating(action.description);
    const highlights = deriveHighlights(action);
    setTimeout(() => {
      router.push(path);
      // Slight delay so the new page renders before highlights apply
      setTimeout(() => {
        setHighlights(highlights, 7000);
        setNavigating(null);
      }, 600);
    }, 400);
  }

  // ── Execute draft approval ───────────────────────────────────────────────────

  async function approveDraft(
    msgId: string,
    action: DraftAction,
    overrides?: Record<string, unknown>,
  ): Promise<{ ok: boolean; result?: string; error?: string }> {
    closeDraft();
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, actionStatus: 'saving' } : m
    ));
    const data = overrides ? { ...action.data, ...overrides } : action.data;
    const { docType } = action;

    try {
      let result = '';

      if (docType === 'proposal') {
        const res = await fetch('/api/proposals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName: data.businessName,
            industry: data.industry ?? 'General',
            packageTier: data.packageTier ?? 'STARTER',
            lineItems: data.lineItems ?? [],
            oneTimeTotal: data.oneTimeTotal ?? 0,
            monthlyTotal: data.monthlyTotal ?? 0,
            notes: data.notes ?? '',
          }),
        });
        if (!res.ok) throw new Error('Failed to save proposal');
        const created = await res.json();
        result = `Proposal created: ${created.proposalNumber ?? ''}`;
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, actionStatus: 'done', actionResult: result } : m
        ));
        setTimeout(() => router.push('/proposals'), 800);
      }

      else if (docType === 'invoice') {
        const res = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId ?? '',
            type: data.invoiceType ?? 'CUSTOM',
            amount: data.amount ?? 0,
            dueDate: data.dueDate ?? null,
            notes: data.notes ?? '',
          }),
        });
        if (!res.ok) throw new Error('Failed to save invoice');
        const created = await res.json();
        result = `Invoice created: ${created.invoiceNumber ?? ''}`;
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, actionStatus: 'done', actionResult: result } : m
        ));
        setTimeout(() => router.push('/invoices'), 800);
      }

      else if (docType === 'lead') {
        const res = await fetch('/api/pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName: data.businessName,
            contactName: data.contactName ?? '',
            email: data.email ?? '',
            phone: data.phone ?? '',
            industry: data.industry ?? 'General',
            stage: data.stage ?? 'LEAD',
            priority: data.priority ?? 'WARM',
            estimatedValue: data.estimatedValue ?? null,
            source: data.source ?? 'AI Assistant',
            notes: data.notes ?? '',
          }),
        });
        if (!res.ok) throw new Error('Failed to save lead');
        result = `${String(data.businessName)} added to pipeline.`;
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, actionStatus: 'done', actionResult: result } : m
        ));
        setTimeout(() => router.push('/pipeline'), 800);
      }

      else if (docType === 'task') {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title,
            priority: data.priority ?? 'MEDIUM',
            assignedTo: data.assignedTo ?? '',
            dueDate: data.dueDate ?? null,
            notes: data.notes ?? '',
            status: 'TODO',
          }),
        });
        if (!res.ok) throw new Error('Failed to save task');
        result = `Task created: "${String(data.title)}"`;
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, actionStatus: 'done', actionResult: result } : m
        ));
        setTimeout(() => router.push('/tasks'), 800);
      }

      else if (docType === 'message') {
        const channel = String(data.channel ?? 'email');
        const res = await fetch('/api/comms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to:       data.to,
            subject:  overrides?.subject ?? data.subject,
            body:     overrides?.body    ?? data.body,
            channel,
            clientId: data.clientId,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? 'Send failed');
        }
        const channelLabel = channel === 'sms' ? 'SMS' : 'email';
        result = `${channelLabel.charAt(0).toUpperCase() + channelLabel.slice(1)} sent to ${String(data.to)}.`;
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, actionStatus: 'done', actionResult: result } : m
        ));
      }

      return { ok: true, result };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed. Try again.';
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, actionStatus: 'error', actionResult: msg } : m
      ));
      return { ok: false, error: msg };
    }
  }

  // ── Execute confirm action ───────────────────────────────────────────────────

  async function executeConfirm(msgId: string, action: ConfirmAction) {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, actionStatus: 'saving' } : m
    ));

    try {
      const { operation, payload } = action;
      let result = '';

      if (operation === 'update_invoice_status') {
        const res = await fetch(`/api/invoices/${payload.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: payload.status }),
        });
        if (!res.ok) throw new Error('Update failed');
        result = `Invoice marked as ${String(payload.status)}.`;
      }

      else if (operation === 'move_lead_stage') {
        const res = await fetch(`/api/pipeline/${payload.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: payload.stage }),
        });
        if (!res.ok) throw new Error('Update failed');
        result = `Lead moved to ${String(payload.stage)}.`;
      }

      else if (operation === 'close_ticket') {
        const res = await fetch(`/api/helpdesk/tickets/${payload.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'RESOLVED' }),
        });
        if (!res.ok) throw new Error('Update failed');
        result = 'Ticket marked resolved.';
      }

      else if (operation === 'add_note') {
        const res = await fetch('/api/clients/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: payload.clientId, type: 'NOTE', description: payload.note }),
        });
        if (!res.ok) throw new Error('Failed to add note');
        result = 'Note added.';
      }

      else if (operation === 'send_proposal') {
        const res = await fetch('/api/proposals/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId:       payload.leadId,
            packageTier:  payload.packageTier ?? 'PRO',
            lineItems:    payload.lineItems ?? [],
            oneTimeTotal: payload.oneTimeTotal ?? 0,
            monthlyTotal: payload.monthlyTotal ?? 0,
            message:      payload.message ?? '',
          }),
        });
        if (!res.ok) throw new Error('Proposal send failed');
        const sent = await res.json();
        result = `Proposal ${String(sent.proposalNumber)} created for ${String(payload.leadName)}.\nSign URL: ${String(sent.signUrl)}`;
      }

      else if (operation === 'convert_client') {
        const res = await fetch(`/api/pipeline/${String(payload.leadId)}/convert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packageTier: payload.packageTier ?? 'PRO',
            setupFee:    payload.setupFee ?? '0',
            monthly:     payload.monthly ?? '0',
          }),
        });
        if (!res.ok) throw new Error('Conversion failed');
        const conv = await res.json();
        result = `${String(payload.leadName)} is now an active client.\nClient profile, invoice, billing & appointment created.\nInstall: ${String(conv.appointmentDate ?? 'scheduled')} at 9:00 AM`;
      }

      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, actionStatus: 'done', actionResult: result } : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, actionStatus: 'error', actionResult: 'Action failed. Try again.' } : m
      ));
    }
  }

  function cancelAction(msgId: string) {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, actionStatus: 'cancelled' } : m
    ));
  }

  // ── Voice input ──────────────────────────────────────────────────────────────

  function toggleRecording() {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous      = true;   // keep listening until user clicks stop
    rec.interimResults  = true;
    rec.lang            = 'en-US';
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      stableInputRef.current = input.trim();
      setRecording(true);
    };

    rec.onresult = (e: any) => {
      let finalChunk = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalChunk += e.results[i][0].transcript;
        else                       interim    += e.results[i][0].transcript;
      }
      if (finalChunk) {
        stableInputRef.current = (stableInputRef.current + ' ' + finalChunk).trim();
        setInput(stableInputRef.current);
      } else {
        setInput((stableInputRef.current + ' ' + interim).trim());
      }
    };

    rec.onend = () => {
      setInput(stableInputRef.current);
      setRecording(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    rec.onerror = (e: any) => {
      if (e.error === 'no-speech') return; // not fatal, keep listening
      setRecording(false);
    };

    recognitionRef.current = rec;
    rec.start();
  }

  // ── TTS readout ───────────────────────────────────────────────────────────────

  function speakMessage(id: string, text: string) {
    if (!window.speechSynthesis) return;
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang  = 'en-US';
    utt.rate  = 1.05;
    utt.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const pick = voices.find(v => v.lang.startsWith('en') && (
      v.name.includes('Google US English') ||
      v.name.includes('Samantha') ||
      v.name.includes('Alex') ||
      v.default
    )) ?? voices[0];
    if (pick) utt.voice = pick;
    utt.onend   = () => setSpeakingId(null);
    utt.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utt);
  }

  // ── Send message ─────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
          currentPath: pathname,
        }),
      });

      const data = await res.json();
      const action = data.action as ChatAction | null;

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        action: action ?? undefined,
        actionStatus: (action?.type === 'draft' || action?.type === 'confirm') ? 'pending' : undefined,
        model: data.model,
      };
      setMessages(prev => [...prev, aiMsg]);

      if (action?.type === 'navigate' || action?.type === 'filter') {
        executeNavigation(action as NavigateAction | FilterAction);
      }

      if (action?.type === 'draft') {
        const draft = action as DraftAction;
        openDraft({
          docType:   draft.docType,
          draftData: { ...draft.data },
          onApprove: (editedData) => approveDraft(aiMsg.id, draft, editedData),
        });
      }
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Connection error. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loading, messages, pathname]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page-level navigation progress bar */}
      {navigating && <div className="ai-nav-bar" />}

      {/* Toggle tab */}
      <button
        onClick={() => setIsOpen(o => !o)}
        title={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
        style={{
          position: 'fixed',
          right: isOpen ? 400 : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 60,
          background: 'var(--primary)',
          border: 'none',
          borderRadius: '8px 0 0 8px',
          padding: '12px 7px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          color: '#fff',
          transition: 'right 0.25s ease',
          boxShadow: '-3px 0 16px rgba(0,0,0,0.35)',
        }}
      >
        {isOpen ? <ChevronRight size={15} /> : <MessageSquare size={15} />}
        {!isOpen && (
          <span style={{
            writingMode: 'vertical-rl',
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: 0.85,
          }}>
            AI
          </span>
        )}
      </button>

      {/* Panel */}
      <div
        style={{
          width: isOpen ? 400 : 0,
          minWidth: 0,
          flexShrink: 0,
          background: 'var(--dark)',
          borderLeft: isOpen ? '1px solid var(--border)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.25s ease',
          height: '100vh',
        }}
      >
        {isOpen && (
          <>
            {/* Header */}
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Bot size={16} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--white)' }}>AI Assistant</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--gray)' }}>Powered by Claude</div>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  title="Clear chat"
                  style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.08) transparent',
            }}>
              {messages.length === 0 && (
                <div style={{ padding: '16px 4px' }}>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <Bot size={28} style={{ opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
                    <div style={{ fontSize: '0.825rem', color: 'var(--white)', marginBottom: 4 }}>Your business assistant</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray)', lineHeight: 1.5 }}>
                      Ask anything. I can pull up data, navigate the panel, draft proposals and invoices, create leads, and more.
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          padding: '8px 12px',
                          color: 'var(--light)',
                          fontSize: '0.775rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'border-color 0.15s',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '94%',
                    padding: '9px 13px',
                    borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                    background: msg.role === 'user' ? 'var(--primary)' : 'var(--card)',
                    color: 'var(--white)',
                    fontSize: '0.8125rem',
                    lineHeight: 1.55,
                    border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    width: msg.action?.type === 'draft' || msg.action?.type === 'confirm' ? '94%' : undefined,
                  }}>
                    {msg.role === 'assistant'
                      ? <TypewriterText
                          text={msg.content}
                          animate={!animatedIds.current.has(msg.id + '_msg') && (() => { animatedIds.current.add(msg.id + '_msg'); return true; })()}
                        />
                      : msg.content
                    }

                    {/* Draft card */}
                    {msg.action?.type === 'draft' && (
                      <DraftCard
                        action={msg.action as DraftAction}
                        status={msg.actionStatus ?? 'pending'}
                        result={msg.actionResult}
                        onApprove={() => approveDraft(msg.id, msg.action as DraftAction)}
                        onCancel={() => cancelAction(msg.id)}
                        onOpenEditor={() => {
                          const draft = msg.action as DraftAction;
                          openDraft({
                            docType:   draft.docType,
                            draftData: { ...draft.data },
                            onApprove: (editedData) => approveDraft(msg.id, draft, editedData),
                          });
                        }}
                        animate={!animatedIds.current.has(msg.id) && (() => { animatedIds.current.add(msg.id); return true; })()}
                      />
                    )}

                    {/* Confirm card */}
                    {msg.action?.type === 'confirm' && (
                      <ConfirmCard
                        action={msg.action as ConfirmAction}
                        status={msg.actionStatus ?? 'pending'}
                        result={msg.actionResult}
                        onConfirm={() => executeConfirm(msg.id, msg.action as ConfirmAction)}
                        onCancel={() => cancelAction(msg.id)}
                      />
                    )}

                    {/* Navigate/filter pill */}
                    {(msg.action?.type === 'navigate' || msg.action?.type === 'filter') && (
                      <div style={{
                        marginTop: 7, paddingTop: 7,
                        borderTop: '1px solid rgba(255,255,255,0.12)',
                        fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <span>&#8594;</span>
                        <span>{msg.action.description}</span>
                      </div>
                    )}
                  </div>

                  {msg.role === 'assistant' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, paddingLeft: 3 }}>
                      {msg.model && (
                        <span style={{ fontSize: '0.63rem', color: 'var(--gray)', opacity: 0.7 }}>
                          {msg.model === 'haiku' ? 'Claude Haiku' : 'Claude Sonnet'}
                        </span>
                      )}
                      <button
                        onClick={() => speakMessage(msg.id, msg.content)}
                        title={speakingId === msg.id ? 'Stop reading' : 'Read aloud'}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: speakingId === msg.id ? 'var(--primary)' : 'var(--gray)',
                          padding: '2px 4px', display: 'flex', alignItems: 'center', borderRadius: 4,
                          opacity: speakingId === msg.id ? 1 : 0.5,
                          transition: 'opacity 0.15s, color 0.15s',
                          animation: speakingId === msg.id ? 'chatDotPulse 1.2s ease-in-out infinite' : 'none',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => { if (speakingId !== msg.id) e.currentTarget.style.opacity = '0.5'; }}
                      >
                        {speakingId === msg.id ? <VolumeX size={12} /> : <Volume2 size={12} />}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div style={{
                    padding: '10px 14px',
                    background: 'var(--card)',
                    borderRadius: '12px 12px 12px 3px',
                    border: '1px solid var(--border)',
                    display: 'flex', gap: 5, alignItems: 'center',
                  }}>
                    <span className="chat-dot" />
                    <span className="chat-dot" style={{ animationDelay: '0.18s' }} />
                    <span className="chat-dot" style={{ animationDelay: '0.36s' }} />
                  </div>
                </div>
              )}

              {navigating && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 11px',
                  background: 'rgba(37,99,235,0.1)',
                  borderRadius: 7,
                  border: '1px solid rgba(37,99,235,0.3)',
                  fontSize: '0.73rem', color: 'var(--primary)',
                }}>
                  <Loader2 size={12} className="spin" />
                  {navigating}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '10px 12px',
              borderTop: '1px solid var(--border)',
              flexShrink: 0,
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
              background: 'rgba(255,255,255,0.01)',
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything... navigate, create, draft, analyze"
                disabled={loading}
                rows={1}
                style={{
                  flex: 1,
                  background: 'var(--card2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '8px 11px',
                  color: 'var(--white)',
                  fontSize: '0.8125rem',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.5,
                  fontFamily: 'inherit',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
              <button
                onClick={toggleRecording}
                title={recording ? 'Stop recording' : 'Speak your message'}
                style={{
                  background: recording ? 'rgba(239,68,68,0.15)' : 'var(--card2)',
                  border: '1px solid ' + (recording ? 'rgba(239,68,68,0.5)' : 'var(--border)'),
                  borderRadius: 8,
                  padding: '8px 10px',
                  color: recording ? '#ef4444' : 'var(--gray)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'flex-end',
                  height: 38,
                  width: 38,
                  animation: recording ? 'chatDotPulse 1s ease-in-out infinite' : 'none',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                }}
              >
                {recording ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                style={{
                  background: input.trim() && !loading ? 'var(--primary)' : 'var(--card2)',
                  border: '1px solid ' + (input.trim() && !loading ? 'var(--primary)' : 'var(--border)'),
                  borderRadius: 8,
                  padding: '8px 10px',
                  color: input.trim() && !loading ? '#fff' : 'var(--gray)',
                  cursor: input.trim() && !loading ? 'pointer' : 'default',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s, border-color 0.15s',
                  alignSelf: 'flex-end',
                  height: 38,
                  width: 38,
                }}
              >
                <Send size={15} />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
