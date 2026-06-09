'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Inbox, Send, Star, Paperclip, RefreshCw, Pencil, Reply, Forward,
  ChevronRight, Building2, Search, X, Mail, MailOpen, Loader2,
  ExternalLink, Trash2, CheckCheck, Filter,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────────

interface EmailMsg {
  id: string;
  subject: string | null;
  fromEmail: string;
  fromName: string | null;
  snippet: string | null;
  isRead: boolean;
  isStarred: boolean;
  isSent: boolean;
  folder: string;
  receivedAt: string;
  hasAttachment: boolean;
  threadId: string | null;
  leadId: string | null;
  clientId: string | null;
  lead:   { businessName: string } | null;
  client: { businessName: string } | null;
}

interface FullMsg extends EmailMsg {
  toRaw: string;
  ccRaw: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  inReplyTo: string | null;
  references: string | null;
  messageId: string;
  attachments: Array<{ filename: string; contentType: string; size: number }> | null;
}

interface ComposeState {
  to: string; cc: string; bcc: string; subject: string; body: string;
  replyToId: string; replyToMessageId: string; inReplyTo: string;
  leadId: string; clientId: string;
}

interface EmailAccountSummary {
  id: string; label: string; email: string; lastSyncAt: string | null; signature: string | null;
}

const EMPTY_COMPOSE: ComposeState = {
  to: '', cc: '', bcc: '', subject: '', body: '', replyToId: '',
  replyToMessageId: '', inReplyTo: '', leadId: '', clientId: '',
};

const fmtDate = (d: string) => {
  const date = new Date(d);
  const now  = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
};

const fmtFull = (d: string) =>
  new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const initials = (name: string, email: string) => {
  const n = name || email;
  return n.slice(0, 2).toUpperCase();
};

const avatarColor = (email: string) => {
  const colors = ['#3b7dd9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) % colors.length;
  return colors[h];
};

// ── Main page ──────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const searchParams = useSearchParams();

  // Core state
  const [accounts,     setAccounts]     = useState<EmailAccountSummary[]>([]);
  const [activeAcct,   setActiveAcct]   = useState<string>('');
  const [folder,       setFolder]       = useState('INBOX');
  const [clientFilter, setClientFilter] = useState(searchParams.get('clientId') || '');
  const [messages,     setMessages]     = useState<EmailMsg[]>([]);
  const [unread,       setUnread]       = useState(0);
  const [selected,     setSelected]     = useState<FullMsg | null>(null);
  const [thread,       setThread]       = useState<FullMsg[]>([]);
  const [view,         setView]         = useState<'message' | 'compose'>('message');
  const [compose,      setCompose]      = useState<ComposeState>(EMPTY_COMPOSE);
  const [search,       setSearch]       = useState('');
  const [loading,      setLoading]      = useState(true);
  const [syncing,      setSyncing]      = useState(false);
  const [sending,      setSending]      = useState(false);
  const [syncMsg,      setSyncMsg]      = useState('');
  const [configured,   setConfigured]   = useState(false);
  const [lastSync,     setLastSync]     = useState<string | null>(null);

  // Bulk select
  const [checkedIds,  setCheckedIds]  = useState<Set<string>>(new Set());
  const [hoveredId,   setHoveredId]   = useState<string | null>(null);
  const [deleting,    setDeleting]    = useState(false);

  // Filters
  const [unreadOnly,  setUnreadOnly]  = useState(false);

  // Signature
  const [signature,   setSignature]   = useState('');
  const [sigDraft,    setSigDraft]    = useState('');
  const [editSig,     setEditSig]     = useState(false);
  const [savingSig,   setSavingSig]   = useState(false);

  // Compose extras
  const [showBcc,     setShowBcc]     = useState(false);

  const bodyRef      = useRef<HTMLDivElement>(null);
  const didAutoOpen  = useRef(false);

  // ── Load messages ────────────────────────────────────────────────────────────

  const loadMessages = useCallback(async (
    f: string, q: string, cId?: string, aId?: string, unread?: boolean,
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ folder: f });
      if (q)      params.set('search', q);
      if (cId)    params.set('clientId', cId);
      if (aId)    params.set('accountId', aId);
      if (unread) params.set('unread', 'true');
      const res  = await fetch(`/api/email/messages?${params}`);
      const data = await res.json();
      setMessages(data.messages || []);
      setUnread(data.unread || 0);
    } catch { setMessages([]); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => {
    loadMessages(folder, search, clientFilter || undefined, activeAcct || undefined, unreadOnly);
    setCheckedIds(new Set());
  }, [folder, loadMessages, clientFilter, activeAcct, unreadOnly]); // eslint-disable-line

  // Auto-open messageId from URL param
  useEffect(() => {
    const msgId = searchParams.get('messageId');
    if (!msgId || didAutoOpen.current) return;
    didAutoOpen.current = true;
    fetch(`/api/email/messages/${msgId}`)
      .then((r) => r.json())
      .then((full) => { if (full?.id) { setSelected(full); setView('message'); setThread([full]); } })
      .catch(() => {});
  }, [searchParams]);

  // Load accounts + signature
  useEffect(() => {
    fetch('/api/email/sync').then((r) => r.json()).then((d) => {
      setConfigured(d.configured);
      if (d.accounts?.length) {
        setAccounts(d.accounts);
        const lastSyncDate = d.accounts.map((a: EmailAccountSummary) => a.lastSyncAt).filter(Boolean).sort().pop();
        if (lastSyncDate) setLastSync(lastSyncDate);
        const sig = d.accounts[0]?.signature || '';
        setSignature(sig);
        setSigDraft(sig);
      }
    }).catch(() => {});
  }, []);

  // Update signature when active account changes
  useEffect(() => {
    const acct = accounts.find((a) => a.id === activeAcct) ?? accounts[0];
    const sig  = acct?.signature || '';
    setSignature(sig);
    setSigDraft(sig);
  }, [activeAcct, accounts]);

  // ── Select message ───────────────────────────────────────────────────────────

  async function selectMessage(msg: EmailMsg) {
    if (checkedIds.size > 0) { toggleCheck(msg.id); return; }
    setView('message');
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, isRead: true } : m));
    if (!msg.isRead) setUnread((u) => Math.max(0, u - 1));

    const res  = await fetch(`/api/email/messages/${msg.id}`);
    const full = await res.json();
    setSelected(full);

    if (full.threadId) {
      const tr   = await fetch(`/api/email/threads/${encodeURIComponent(full.threadId)}`);
      const msgs = await tr.json();
      setThread(Array.isArray(msgs) ? msgs : [full]);
    } else {
      setThread([full]);
    }

    bodyRef.current?.scrollTo({ top: 0 });
  }

  // ── Checkbox ──────────────────────────────────────────────────────────────────

  function toggleCheck(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else              next.add(id);
      return next;
    });
  }

  function toggleCheckAll() {
    if (checkedIds.size === messages.length) setCheckedIds(new Set());
    else setCheckedIds(new Set(messages.map((m) => m.id)));
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  async function bulkDelete() {
    if (checkedIds.size === 0 || deleting) return;
    setDeleting(true);
    const ids = [...checkedIds];
    await fetch('/api/email/messages', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ids }),
    });
    setMessages((prev) => prev.filter((m) => !checkedIds.has(m.id)));
    if (selected && checkedIds.has(selected.id)) { setSelected(null); setThread([]); }
    setCheckedIds(new Set());
    setDeleting(false);
  }

  async function deleteOne(id: string) {
    await fetch(`/api/email/messages/${id}`, { method: 'DELETE' });
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selected?.id === id) { setSelected(null); setThread([]); }
    if (checkedIds.has(id)) toggleCheck(id);
  }

  // ── Mark read ─────────────────────────────────────────────────────────────────

  async function markAllRead() {
    const body: Record<string, unknown> = { markAllRead: true };
    if (activeAcct) body.accountId = activeAcct;
    await fetch('/api/email/messages', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
    setUnread(0);
  }

  async function bulkMarkRead() {
    if (checkedIds.size === 0) return;
    const ids = [...checkedIds];
    await fetch('/api/email/messages', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ markAllRead: true, ids }),
    });
    setMessages((prev) => prev.map((m) => checkedIds.has(m.id) ? { ...m, isRead: true } : m));
    setUnread((u) => Math.max(0, u - ids.filter((id) => !messages.find((m) => m.id === id)?.isRead).length));
    setCheckedIds(new Set());
  }

  // ── Signature ─────────────────────────────────────────────────────────────────

  async function saveSignature() {
    const acctId = activeAcct || accounts[0]?.id;
    if (!acctId) return;
    setSavingSig(true);
    await fetch(`/api/email/accounts/${acctId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ signature: sigDraft }),
    });
    setSignature(sigDraft);
    setAccounts((prev) => prev.map((a) => a.id === acctId ? { ...a, signature: sigDraft } : a));
    setEditSig(false);
    setSavingSig(false);
  }

  // ── Sync ─────────────────────────────────────────────────────────────────────

  async function triggerSync() {
    setSyncing(true); setSyncMsg('');
    try {
      const url  = activeAcct ? `/api/email/sync?accountId=${activeAcct}` : '/api/email/sync';
      const res  = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (data.demo || (!data.ok && data.message)) {
        setSyncMsg(data.message || 'No email accounts configured yet');
      } else if (data.error) {
        setSyncMsg('Sync error: ' + data.error);
      } else {
        const label = activeAcct ? accounts.find((a) => a.id === activeAcct)?.email : 'all accounts';
        setSyncMsg(`Synced ${data.synced} new message${data.synced !== 1 ? 's' : ''} from ${label}`);
        setLastSync(new Date().toISOString());
        await loadMessages(folder, search, clientFilter || undefined, activeAcct || undefined, unreadOnly);
      }
    } catch { setSyncMsg('Sync failed — check account settings'); }
    finally  { setSyncing(false); setTimeout(() => setSyncMsg(''), 6000); }
  }

  // ── Star toggle ───────────────────────────────────────────────────────────────

  async function toggleStar(msg: EmailMsg, e: React.MouseEvent) {
    e.stopPropagation();
    const next = !msg.isStarred;
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, isStarred: next } : m));
    await fetch(`/api/email/messages/${msg.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ isStarred: next }),
    });
  }

  // ── Compose / reply ───────────────────────────────────────────────────────────

  function sigBlock() {
    return signature ? `\n\n-- \n${signature}` : '';
  }

  function openCompose() {
    setCompose({ ...EMPTY_COMPOSE, body: sigBlock() });
    setShowBcc(false);
    setView('compose');
  }

  function openReply(msg: FullMsg) {
    const replyTo = msg.isSent
      ? (JSON.parse(msg.toRaw || '[]')[0]?.address || '')
      : msg.fromEmail;
    setCompose({
      to:               replyTo,
      cc:               '',
      bcc:              '',
      subject:          `Re: ${msg.subject || ''}`,
      body:             `${sigBlock()}\n\n---\nOn ${fmtFull(msg.receivedAt)}, ${msg.fromName || msg.fromEmail} wrote:\n${(msg.bodyText || '').split('\n').map((l) => '> ' + l).join('\n')}`,
      replyToId:        msg.id,
      replyToMessageId: msg.messageId,
      inReplyTo:        msg.messageId,
      leadId:           msg.leadId   || '',
      clientId:         msg.clientId || '',
    });
    setShowBcc(false);
    setView('compose');
  }

  function openForward(msg: FullMsg) {
    setCompose({
      to: '', cc: '', bcc: '', subject: `Fwd: ${msg.subject || ''}`,
      body: `${sigBlock()}\n\n---\n---------- Forwarded message ----------\nFrom: ${msg.fromName || msg.fromEmail}\nDate: ${fmtFull(msg.receivedAt)}\nSubject: ${msg.subject || ''}\n\n${msg.bodyText || ''}`,
      replyToId: '', replyToMessageId: '', inReplyTo: '', leadId: '', clientId: '',
    });
    setShowBcc(false);
    setView('compose');
  }

  // ── Send ──────────────────────────────────────────────────────────────────────

  async function handleSend() {
    if (!compose.to.trim() || !compose.subject.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/email/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          to:               compose.to,
          cc:               compose.cc  || undefined,
          bcc:              compose.bcc || undefined,
          subject:          compose.subject,
          bodyHtml:         compose.body.replace(/\n/g, '<br>'),
          bodyText:         compose.body,
          inReplyTo:        compose.inReplyTo        || undefined,
          replyToMessageId: compose.replyToMessageId || undefined,
          leadId:           compose.leadId           || undefined,
          clientId:         compose.clientId         || undefined,
          accountId:        activeAcct               || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setView('message');
        await loadMessages(folder, search, undefined, activeAcct || undefined, unreadOnly);
      } else {
        alert('Send failed: ' + (data.error || 'Unknown error'));
      }
    } finally { setSending(false); }
  }

  // ── Search ────────────────────────────────────────────────────────────────────

  function handleSearch(q: string) {
    setSearch(q);
    if (q.length > 1 || q === '') loadMessages(folder, q, clientFilter || undefined, activeAcct || undefined, unreadOnly);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const allChecked  = messages.length > 0 && checkedIds.size === messages.length;
  const someChecked = checkedIds.size > 0 && checkedIds.size < messages.length;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden', gap: 0 }}>

      {/* ── Left: Folder sidebar ─────────────────────────────────────────────── */}
      <div style={{
        width: 200, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--dark)',
      }}>
        <div style={{ padding: '16px 14px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={openCompose}
            style={{
              width: '100%', background: 'var(--primary)', border: 'none', borderRadius: 8,
              padding: '9px 12px', color: '#fff', fontSize: '0.82rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            <Pencil size={13} /> Compose
          </button>

          {accounts.length > 1 && (
            <select
              value={activeAcct}
              onChange={(e) => { setActiveAcct(e.target.value); setSelected(null); setThread([]); }}
              style={{
                width: '100%', background: 'var(--darker, #0d0d0d)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '5px 8px', fontSize: '0.73rem', color: 'var(--light)',
                cursor: 'pointer',
              }}
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.label || a.email}</option>
              ))}
            </select>
          )}
          {accounts.length === 1 && (
            <div style={{ fontSize: '0.7rem', color: 'var(--gray)', padding: '2px 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {accounts[0].label || accounts[0].email}
            </div>
          )}
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
          {[
            { key: 'INBOX',   label: 'Inbox',   icon: Inbox, badge: unread },
            { key: 'SENT',    label: 'Sent',    icon: Send,  badge: 0 },
            { key: 'STARRED', label: 'Starred', icon: Star,  badge: 0 },
          ].map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => { setFolder(key); setSelected(null); setThread([]); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 10px', borderRadius: 7, border: 'none',
                background:  folder === key ? 'rgba(59,125,217,0.15)' : 'none',
                color:       folder === key ? 'var(--primary)' : 'var(--light)',
                fontSize:    '0.815rem', fontWeight: folder === key ? 600 : 400,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <Icon size={14} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 9, background: 'var(--primary)',
                  color: '#fff', fontSize: '0.65rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sync status */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={triggerSync}
            disabled={syncing}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 7,
              background: 'none', border: '1px solid var(--border)', borderRadius: 7,
              padding: '6px 10px', color: 'var(--gray)', fontSize: '0.73rem',
              cursor: syncing ? 'default' : 'pointer',
            }}
          >
            {syncing ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
            {syncing ? 'Syncing...' : 'Sync Mail'}
          </button>
          {syncMsg && (
            <div style={{ marginTop: 6, fontSize: '0.68rem', color: syncMsg.includes('error') || syncMsg.includes('not') ? 'var(--red)' : 'var(--green)', lineHeight: 1.4 }}>
              {syncMsg}
            </div>
          )}
          {!configured && !syncMsg && (
            <div style={{ marginTop: 6, fontSize: '0.67rem', color: 'var(--gray)', lineHeight: 1.4 }}>
              IMAP not configured
            </div>
          )}
          {lastSync && configured && !syncMsg && (
            <div style={{ marginTop: 4, fontSize: '0.67rem', color: 'var(--gray)' }}>
              Last sync: {fmtDate(lastSync)}
            </div>
          )}
        </div>
      </div>

      {/* ── Middle: Message list ─────────────────────────────────────────────── */}
      <div style={{
        width: 340, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Search bar */}
        <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative', marginBottom: 6 }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray)', pointerEvents: 'none' }} />
            <input
              className="input"
              placeholder="Search email..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ paddingLeft: 28, fontSize: '0.8rem', height: 34 }}
            />
            {search && (
              <button onClick={() => handleSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', padding: 2 }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: unreadOnly ? 'rgba(59,125,217,0.15)' : 'none',
                border: `1px solid ${unreadOnly ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 5, padding: '3px 8px', fontSize: '0.7rem',
                color: unreadOnly ? 'var(--primary)' : 'var(--gray)', cursor: 'pointer',
              }}
            >
              <Filter size={10} /> {unreadOnly ? 'Unread' : 'All'}
            </button>
            {unread > 0 && !unreadOnly && (
              <button
                onClick={markAllRead}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 5, padding: '3px 8px', fontSize: '0.7rem',
                  color: 'var(--gray)', cursor: 'pointer',
                }}
              >
                <CheckCheck size={10} /> Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Client filter banner */}
        {clientFilter && (
          <div style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.08)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--primary)' }}>
            <Building2 size={11} />
            <span style={{ flex: 1 }}>Filtered by client</span>
            <button onClick={() => setClientFilter('')} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', padding: 2 }}><X size={11} /></button>
          </div>
        )}

        {/* Bulk action bar */}
        {checkedIds.size > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderBottom: '1px solid var(--border)',
            background: 'rgba(59,125,217,0.08)',
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, flex: 1 }}>
              {checkedIds.size} selected
            </span>
            <button
              onClick={bulkMarkRead}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 8px', fontSize: '0.7rem', color: 'var(--gray)', cursor: 'pointer' }}
            >
              <CheckCheck size={10} /> Read
            </button>
            <button
              onClick={bulkDelete}
              disabled={deleting}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 5, padding: '3px 8px', fontSize: '0.7rem', color: 'var(--red, #ef4444)', cursor: 'pointer' }}
            >
              {deleting ? <Loader2 size={10} className="spin" /> : <Trash2 size={10} />} Delete
            </button>
            <button
              onClick={() => setCheckedIds(new Set())}
              style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', padding: 2 }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* List header with select-all */}
        {messages.length > 0 && checkedIds.size === 0 && (
          <div style={{ padding: '5px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = someChecked; }}
              onChange={toggleCheckAll}
              style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
            />
            <span style={{ fontSize: '0.68rem', color: 'var(--gray)' }}>
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Message list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray)', fontSize: '0.82rem' }}>
              <Loader2 size={16} className="spin" style={{ display: 'block', margin: '0 auto 8px' }} />
              Loading...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray)', fontSize: '0.82rem' }}>
              <Mail size={28} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} />
              {search ? 'No results' : unreadOnly ? 'No unread messages' : folder === 'INBOX' ? 'No messages yet' : `No ${folder.toLowerCase()} messages`}
              {!configured && folder === 'INBOX' && (
                <div style={{ marginTop: 8, fontSize: '0.75rem', lineHeight: 1.5 }}>
                  Configure IMAP to sync your inbox.<br />
                  <span style={{ color: 'var(--primary)' }}>Set IMAP_HOST + IMAP_USER + IMAP_PASS in .env</span>
                </div>
              )}
            </div>
          ) : messages.map((msg) => {
            const isChecked = checkedIds.has(msg.id);
            const showCb    = isChecked || checkedIds.size > 0 || hoveredId === msg.id;
            return (
              <div
                key={msg.id}
                onClick={() => selectMessage(msg)}
                onMouseEnter={() => setHoveredId(msg.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  padding: '11px 13px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: isChecked
                    ? 'rgba(59,125,217,0.08)'
                    : selected?.id === msg.id
                    ? 'rgba(59,125,217,0.1)'
                    : msg.isRead ? 'transparent' : 'rgba(59,125,217,0.04)',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
                  {/* Avatar / checkbox toggle */}
                  <div
                    style={{ width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={(e) => { if (showCb) toggleCheck(msg.id, e); }}
                  >
                    {showCb ? (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        onClick={(e) => toggleCheck(msg.id, e)}
                        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                    ) : (
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: avatarColor(msg.fromEmail),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                      }}>
                        {initials(msg.fromName || '', msg.fromEmail)}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: '0.8rem', fontWeight: msg.isRead ? 500 : 700,
                        color: msg.isRead ? 'var(--light)' : 'var(--white)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {msg.isSent ? `To: ${JSON.parse(msg.toRaw || '[]')[0]?.address || 'recipient'}` : (msg.fromName || msg.fromEmail)}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--gray)', flexShrink: 0 }}>{fmtDate(msg.receivedAt)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ paddingLeft: 39 }}>
                  <div style={{
                    fontSize: '0.78rem', fontWeight: msg.isRead ? 400 : 600,
                    color: msg.isRead ? 'var(--light)' : 'var(--white)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    marginBottom: 2,
                  }}>
                    {msg.subject || '(no subject)'}
                  </div>
                  <div style={{
                    fontSize: '0.73rem', color: 'var(--gray)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {msg.snippet || ''}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    {msg.lead && (
                      <span style={{ fontSize: '0.63rem', color: 'var(--primary)', background: 'rgba(59,125,217,0.12)', padding: '1px 5px', borderRadius: 4 }}>
                        {msg.lead.businessName}
                      </span>
                    )}
                    {msg.client && (
                      <span style={{ fontSize: '0.63rem', color: 'var(--green)', background: 'rgba(34,197,94,0.1)', padding: '1px 5px', borderRadius: 4 }}>
                        {msg.client.businessName}
                      </span>
                    )}
                    {msg.hasAttachment && <Paperclip size={10} style={{ color: 'var(--gray)' }} />}
                    <button
                      onClick={(e) => toggleStar(msg, e)}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 1, color: msg.isStarred ? '#f59e0b' : 'var(--gray)', display: 'flex', alignItems: 'center' }}
                    >
                      <Star size={11} fill={msg.isStarred ? '#f59e0b' : 'none'} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Message body or compose ───────────────────────────────────── */}
      <div ref={bodyRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* COMPOSE VIEW */}
        {view === 'compose' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--white)' }}>
                {compose.replyToId ? 'Reply' : 'New Message'}
              </h2>
              <button onClick={() => setView('message')} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              {/* To */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray)', width: 54, flexShrink: 0 }}>To</span>
                <input
                  className="input"
                  placeholder="recipient@email.com"
                  value={compose.to}
                  onChange={(e) => setCompose((c) => ({ ...c, to: e.target.value }))}
                  style={{ border: 'none', background: 'transparent', flex: 1, padding: '4px 0', fontSize: '0.83rem' }}
                />
              </div>

              {/* CC + Add BCC toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray)', width: 54, flexShrink: 0 }}>CC</span>
                <input
                  className="input"
                  placeholder="optional"
                  value={compose.cc}
                  onChange={(e) => setCompose((c) => ({ ...c, cc: e.target.value }))}
                  style={{ border: 'none', background: 'transparent', flex: 1, padding: '4px 0', fontSize: '0.83rem' }}
                />
                {!showBcc && (
                  <button
                    onClick={() => setShowBcc(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: '0.7rem', cursor: 'pointer', flexShrink: 0 }}
                  >
                    + Bcc
                  </button>
                )}
              </div>

              {/* BCC (conditional) */}
              {showBcc && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray)', width: 54, flexShrink: 0 }}>Bcc</span>
                  <input
                    className="input"
                    placeholder="blind copy"
                    value={compose.bcc}
                    onChange={(e) => setCompose((c) => ({ ...c, bcc: e.target.value }))}
                    style={{ border: 'none', background: 'transparent', flex: 1, padding: '4px 0', fontSize: '0.83rem' }}
                  />
                  <button
                    onClick={() => { setShowBcc(false); setCompose((c) => ({ ...c, bcc: '' })); }}
                    style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', padding: 2 }}
                  >
                    <X size={11} />
                  </button>
                </div>
              )}

              {/* Subject */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray)', width: 54, flexShrink: 0 }}>Subject</span>
                <input
                  className="input"
                  placeholder="Subject line"
                  value={compose.subject}
                  onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))}
                  style={{ border: 'none', background: 'transparent', flex: 1, padding: '4px 0', fontSize: '0.83rem' }}
                />
              </div>

              {/* Body */}
              <textarea
                value={compose.body}
                onChange={(e) => setCompose((c) => ({ ...c, body: e.target.value }))}
                placeholder="Write your message..."
                style={{
                  flex: 1, minHeight: 220, background: 'var(--card2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: 14, color: 'var(--white)', fontSize: '0.83rem',
                  lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit', outline: 'none',
                }}
              />

              {/* Signature editor */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                {editSig ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--gray)', fontWeight: 600 }}>Email Signature</span>
                    <textarea
                      value={sigDraft}
                      onChange={(e) => setSigDraft(e.target.value)}
                      placeholder="Your name, title, contact info..."
                      rows={4}
                      style={{
                        background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 6,
                        padding: 10, color: 'var(--white)', fontSize: '0.8rem', lineHeight: 1.5,
                        fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={saveSignature}
                        disabled={savingSig}
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '5px 14px' }}
                      >
                        {savingSig ? <Loader2 size={11} className="spin" /> : null} Save signature
                      </button>
                      <button
                        onClick={() => { setSigDraft(signature); setEditSig(false); }}
                        className="btn btn-ghost"
                        style={{ fontSize: '0.75rem', padding: '5px 14px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--gray)' }}>
                      {signature ? `Signature: ${signature.split('\n')[0].slice(0, 40)}${signature.length > 40 ? '…' : ''}` : 'No signature set'}
                    </span>
                    <button
                      onClick={() => setEditSig(true)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.7rem', cursor: 'pointer', padding: 0 }}
                    >
                      {signature ? 'Edit' : '+ Add signature'}
                    </button>
                  </div>
                )}
              </div>

              {/* Send / Discard */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleSend}
                  disabled={sending || !compose.to.trim() || !compose.subject.trim()}
                  className="btn btn-primary"
                  style={{ minWidth: 100 }}
                >
                  {sending ? <><Loader2 size={13} className="spin" /> Sending...</> : <><Send size={13} /> Send</>}
                </button>
                <button onClick={() => setView('message')} className="btn btn-ghost">Discard</button>
              </div>
            </div>
          </div>
        )}

        {/* MESSAGE VIEW — nothing selected */}
        {view === 'message' && !selected && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--gray)' }}>
            <MailOpen size={40} style={{ opacity: 0.2 }} />
            <div style={{ fontSize: '0.85rem' }}>Select a message to read</div>
          </div>
        )}

        {/* MESSAGE VIEW — message selected */}
        {view === 'message' && selected && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Subject + actions */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--white)', lineHeight: 1.35 }}>
                  {selected.subject || '(no subject)'}
                </h2>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openReply(selected)}   className="btn btn-ghost btn-sm"><Reply   size={12} />Reply</button>
                  <button onClick={() => openForward(selected)} className="btn btn-ghost btn-sm"><Forward size={12} />Forward</button>
                  <button
                    onClick={() => toggleStar(selected, { stopPropagation: () => {} } as React.MouseEvent)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: selected.isStarred ? '#f59e0b' : undefined }}
                  >
                    <Star size={12} fill={selected.isStarred ? '#f59e0b' : 'none'} />
                  </button>
                  <button
                    onClick={() => deleteOne(selected.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red, #ef4444)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {thread.map((msg, i) => (
                <ThreadMessage key={msg.id} msg={msg} isLast={i === thread.length - 1} />
              ))}
            </div>

            {/* CRM context */}
            {(selected.lead || selected.client) && (
              <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--gray)', marginBottom: 8 }}>
                  CRM Match
                </div>
                {selected.lead && (
                  <Link href="/pipeline" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                    <GitBranchIcon />
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)' }}>{selected.lead.businessName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray)' }}>Lead — {(selected.lead as any).stage || 'pipeline'}</div>
                    </div>
                    <ExternalLink size={11} style={{ marginLeft: 'auto', color: 'var(--gray)' }} />
                  </Link>
                )}
                {selected.client && (
                  <Link href={`/clients/${selected.clientId}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                    <Building2 size={14} style={{ color: 'var(--green)' }} />
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--green)' }}>{selected.client.businessName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray)' }}>Active client</div>
                    </div>
                    <ExternalLink size={11} style={{ marginLeft: 'auto', color: 'var(--gray)' }} />
                  </Link>
                )}
              </div>
            )}

            {/* Quick reply */}
            <div style={{ padding: '16px 24px', flexShrink: 0 }}>
              <button onClick={() => openReply(selected)} className="btn btn-ghost" style={{ fontSize: '0.78rem' }}>
                <Reply size={12} /> Reply to {selected.fromName || selected.fromEmail}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Thread message component ───────────────────────────────────────────────────

function ThreadMessage({ msg, isLast }: { msg: FullMsg; isLast: boolean }) {
  const [expanded, setExpanded] = useState(isLast);

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 8, marginBottom: 10,
      overflow: 'hidden', background: 'var(--card)',
    }}>
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          cursor: 'pointer',
          background: expanded ? 'transparent' : 'rgba(255,255,255,0.02)',
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: avatarColor(msg.fromEmail),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.6rem', fontWeight: 700, color: '#fff',
        }}>
          {initials(msg.fromName || '', msg.fromEmail)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--white)' }}>
            {msg.fromName || msg.fromEmail}
            {msg.isSent && <span style={{ fontSize: '0.7rem', color: 'var(--gray)', fontWeight: 400, marginLeft: 6 }}>→ {JSON.parse(msg.toRaw || '[]')[0]?.address || ''}</span>}
          </div>
          {!expanded && (
            <div style={{ fontSize: '0.72rem', color: 'var(--gray)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {msg.snippet || ''}
            </div>
          )}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--gray)', flexShrink: 0 }}>
          {new Date(msg.receivedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </div>
        <ChevronRight size={13} style={{ color: 'var(--gray)', transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 14px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 12 }}>
            <span style={{ color: 'var(--light)' }}>From:</span> {msg.fromName ? `${msg.fromName} <${msg.fromEmail}>` : msg.fromEmail}
            {' '}&nbsp;
            <span style={{ color: 'var(--light)' }}>To:</span> {JSON.parse(msg.toRaw || '[]').map((a: { name?: string; address?: string }) => a.address).join(', ')}
          </div>

          {msg.bodyHtml ? (
            <div
              style={{ fontSize: '0.83rem', color: 'var(--light)', lineHeight: 1.65, maxWidth: '100%', overflowX: 'auto' }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.bodyHtml) }}
            />
          ) : (
            <pre style={{ fontSize: '0.83rem', color: 'var(--light)', lineHeight: 1.65, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
              {msg.bodyText || '(no body)'}
            </pre>
          )}

          {msg.attachments && msg.attachments.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {msg.attachments.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                  border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.73rem', color: 'var(--light)',
                }}>
                  <Paperclip size={11} style={{ color: 'var(--gray)' }} />
                  {a.filename}
                  <span style={{ color: 'var(--gray)' }}>({Math.round(a.size / 1024)}KB)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GitBranchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <path d="M18 9a9 9 0 0 1-9 9"/>
    </svg>
  );
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
}
