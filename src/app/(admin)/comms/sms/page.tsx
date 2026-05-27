'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Users, Phone, Plus, Clock } from 'lucide-react';

type SmsMessage = {
  id: string;
  body: string;
  createdAt: string;
  status: string;
};

type Conversation = {
  id: string;
  name: string;
  business: string;
  phone: string | null;
  lastMsg: string;
  lastAt: string;
  count: number;
  messages: SmsMessage[];
};

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtMsgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function SmsInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [reply, setReply]                 = useState('');
  const [sending, setSending]             = useState(false);
  const [localMsgs, setLocalMsgs]         = useState<Record<string, SmsMessage[]>>({});
  const threadRef                         = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/sms/conversations')
      .then((r) => r.json())
      .then((data: Conversation[]) => {
        setConversations(data);
        if (data.length > 0) setSelectedId(data[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [selectedId, localMsgs]);

  const activeConvo = conversations.find((c) => c.id === selectedId) ?? null;

  const allMessages = activeConvo
    ? [...activeConvo.messages, ...(localMsgs[selectedId!] ?? [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    : [];

  async function sendReply() {
    const text = reply.trim();
    if (!text || !activeConvo || sending) return;
    setSending(true);
    const tempMsg: SmsMessage = { id: `local-${Date.now()}`, body: text, createdAt: new Date().toISOString(), status: 'sending' };
    setLocalMsgs((p) => ({ ...p, [selectedId!]: [...(p[selectedId!] ?? []), tempMsg] }));
    setReply('');
    try {
      if (activeConvo.phone) {
        await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: activeConvo.phone, message: text }),
        });
      }
      setLocalMsgs((p) => ({
        ...p,
        [selectedId!]: (p[selectedId!] ?? []).map((m) => m.id === tempMsg.id ? { ...m, status: 'sent' } : m),
      }));
    } catch {
      setLocalMsgs((p) => ({
        ...p,
        [selectedId!]: (p[selectedId!] ?? []).map((m) => m.id === tempMsg.id ? { ...m, status: 'failed' } : m),
      }));
    } finally { setSending(false); }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
  };

  const totalSent = conversations.reduce((n, c) => n + c.count, 0);
  const twilioNum = process.env.NEXT_PUBLIC_TWILIO_PHONE || '';

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">SMS Inbox</h1>
          <p className="page-sub">Outbound SMS history via Twilio</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm">
          <Plus size={13} />
          Send New
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(0,212,200,0.06)', border: '1px solid rgba(0,212,200,0.2)', borderRadius: 8, marginBottom: 20 }}>
        <Phone size={14} style={{ color: 'var(--green)' }} />
        <span style={{ fontSize: '0.82rem', color: 'var(--light)' }}>Connected: Twilio</span>
        {twilioNum && <span style={{ fontSize: '0.82rem', color: 'var(--white)', fontWeight: 700 }}>— {twilioNum}</span>}
        <span className="badge badge-green" style={{ fontSize: '0.65rem', marginLeft: 6 }}>Active</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{loading ? '—' : conversations.length}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Contacts Texted</div>
        </div>
        <div className="card-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value">{loading ? '—' : totalSent}</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total Sent</div>
        </div>
        <div className="card-orange" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="kpi-value-orange">0</div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={16} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Inbound (Twilio Webhook)</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ borderRight: '1px solid var(--border)', background: 'var(--card2)', overflowY: 'auto', maxHeight: 560 }}>
          {loading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--gray)', fontSize: '0.82rem' }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--gray)', fontSize: '0.82rem' }}>
              No SMS history yet.
            </div>
          ) : conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              style={{
                padding: '14px 16px', cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                background: selectedId === c.id ? 'rgba(37,99,235,0.1)' : 'transparent',
                borderLeft: selectedId === c.id ? '3px solid var(--primary)' : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--white)' }}>{c.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={9} />{relTime(c.lastAt)}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 4 }}>{c.business}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.lastMsg.slice(0, 60)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--card)' }}>
          {!activeConvo ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray)', fontSize: '0.84rem', padding: 40 }}>
              <div style={{ textAlign: 'center' }}>
                <MessageSquare size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                <div>{loading ? 'Loading conversations...' : 'Select a conversation'}</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>
                  {initials(activeConvo.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--white)' }}>{activeConvo.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>
                    {activeConvo.business}{activeConvo.phone ? ` · ${activeConvo.phone}` : ''}
                  </div>
                </div>
                <span className="badge badge-blue" style={{ fontSize: '0.62rem' }}>{activeConvo.count} sent</span>
              </div>

              <div ref={threadRef} style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', minHeight: 280, maxHeight: 400 }}>
                {allMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--gray)', fontSize: '0.82rem', padding: 24 }}>No messages.</div>
                ) : allMessages.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      maxWidth: '70%', padding: '10px 14px', borderRadius: 12,
                      background: m.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'var(--primary)',
                      border: m.status === 'failed' ? '1px solid rgba(239,68,68,0.4)' : 'none',
                      fontSize: '0.84rem', color: 'var(--white)', lineHeight: 1.5,
                    }}>
                      {m.body}
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', marginTop: 4, textAlign: 'right' }}>
                        {fmtMsgTime(m.createdAt)}
                        {m.status === 'sending' ? ' · Sending...' : m.status === 'failed' ? ' · Failed' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                <input
                  className="input"
                  placeholder={activeConvo.phone ? `Reply to ${activeConvo.phone}...` : 'No phone number on file'}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={onKeyDown}
                  style={{ flex: 1 }}
                  disabled={!activeConvo.phone}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={sendReply}
                  disabled={!reply.trim() || sending || !activeConvo.phone}
                >
                  <Send size={13} />
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
