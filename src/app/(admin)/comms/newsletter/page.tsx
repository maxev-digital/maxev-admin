'use client';

import { useState, useEffect, useRef } from 'react';
import { Mail, Send, Eye, FileText, Users, Check } from 'lucide-react';

interface Broadcast {
  id: string;
  subject: string;
  audience: string;
  status: string;
  recipientCount: number;
  sentAt: string | null;
  createdAt: string;
}

interface AudienceCounts {
  all: number;
  prospects: number;
  clients: number;
  newsletter: number;
}

const AUDIENCE_OPTS = [
  { value: 'all',        label: 'All Subscribers' },
  { value: 'prospects',  label: 'Prospects Only' },
  { value: 'clients',    label: 'Clients Only' },
  { value: 'newsletter', label: 'Newsletter List' },
];

function wordCount(text: string) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NewsletterPage() {
  const [subject, setSubject]         = useState('');
  const [audience, setAudience]       = useState('all');
  const [body, setBody]               = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [draftSaved, setDraftSaved]   = useState(false);
  const [sending, setSending]         = useState(false);
  const [sentOk, setSentOk]           = useState(false);
  const [broadcasts, setBroadcasts]   = useState<Broadcast[]>([]);
  const [counts, setCounts]           = useState<AudienceCounts>({ all: 0, prospects: 0, clients: 0, newsletter: 0 });
  const [loading, setLoading]         = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/comms/newsletter')
      .then((r) => r.json())
      .then((d) => {
        setBroadcasts(d.broadcasts ?? []);
        setCounts(d.audienceCounts ?? { all: 0, prospects: 0, clients: 0, newsletter: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (body === '' && subject === '') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDraftSaved(false);
    debounceRef.current = setTimeout(() => setDraftSaved(true), 2000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [body, subject]);

  const selectedCount = counts[audience as keyof AudienceCounts] ?? counts.all;

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/comms/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, audience, action: 'send' }),
      });
      const data = await res.json();
      setBroadcasts((prev) => [data, ...prev]);
      setSentOk(true);
      setSubject('');
      setBody('');
      setTimeout(() => setSentOk(false), 4000);
    } finally {
      setSending(false);
    }
  }

  async function handleSaveDraft() {
    if (!subject.trim() || !body.trim()) return;
    await fetch('/api/comms/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body, audience, action: 'draft' }),
    });
    setDraftSaved(true);
  }

  const totalSent = broadcasts.filter((b) => b.status === 'sent').length;
  const avgOpen   = 0; // open tracking not implemented yet

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Newsletter Studio</h1>
          <p className="page-sub">Compose and send subscriber broadcasts</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <div className="card-blue" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div className="kpi-value">{loading ? '—' : counts.all}</div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={15} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Total Subscribers</div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div className="kpi-value">{loading ? '—' : counts.clients}</div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={15} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Clients</div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div className="kpi-value">{loading ? '—' : totalSent}</div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={15} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Broadcasts Sent</div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div className="kpi-value">{avgOpen > 0 ? `${avgOpen}%` : '—'}</div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Eye size={15} style={{ color: 'var(--light)' }} />
            </div>
          </div>
          <div className="kpi-label">Avg Open Rate</div>
        </div>
      </div>

      {sentOk && (
        <div style={{ background: 'rgba(0,212,200,0.07)', border: '1px solid rgba(0,212,200,0.22)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Check size={14} style={{ color: 'var(--green)' }} />
          <span style={{ fontSize: '0.84rem', color: 'var(--green)' }}>Newsletter sent successfully.</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        <div style={{ flex: '0 0 60%', minWidth: 0 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Mail size={15} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Compose</span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="label">Subject Line</label>
              <input className="input" style={{ width: '100%' }} placeholder="e.g. May Update: 3 New Clients + What's Working in Local SEO" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="label">To</label>
              <select className="input" style={{ width: '100%', cursor: 'pointer' }} value={audience} onChange={(e) => setAudience(e.target.value)}>
                {AUDIENCE_OPTS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label} ({counts[a.value as keyof AudienceCounts] ?? 0})</option>
                ))}
              </select>
              <div style={{ fontSize: '0.73rem', color: 'var(--gray)', marginTop: 5 }}>
                Sending to <strong style={{ color: 'var(--light)' }}>{selectedCount} recipients</strong>
              </div>
            </div>

            <div style={{ marginBottom: 6 }}>
              <label className="label">Message</label>
              <textarea
                className="input"
                style={{ width: '100%', minHeight: 260, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.65, fontSize: '0.88rem' }}
                placeholder="Write your newsletter here..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: '0.73rem', color: 'var(--gray)' }}>{wordCount(body)} words</span>
              <span style={{ fontSize: '0.73rem', color: 'var(--green)', opacity: draftSaved ? 1 : 0, transition: 'opacity 0.3s ease' }}>Draft saved</span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <button className={showPreview ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} onClick={() => setShowPreview((v) => !v)}>
                <Eye size={13} />
                {showPreview ? 'Hide Preview' : 'Preview Email'}
              </button>
            </div>

            {showPreview && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 20, overflow: 'hidden' }}>
                <div style={{ background: 'var(--card2)', padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 4 }}>From: <span style={{ color: 'var(--light)' }}>Max EV Digital &lt;info@maxevdigital.com&gt;</span></div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginBottom: 4 }}>To: <span style={{ color: 'var(--light)' }}>{AUDIENCE_OPTS.find((a) => a.value === audience)?.label} ({selectedCount})</span></div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>Subject: <span style={{ color: 'var(--white)', fontWeight: 600 }}>{subject || '(no subject)'}</span></div>
                </div>
                <div style={{ background: 'var(--card)', padding: '20px 18px', minHeight: 120 }}>
                  {body ? (
                    <div style={{ fontSize: '0.88rem', color: 'var(--light)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{body}</div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'var(--gray)', fontStyle: 'italic' }}>No content yet — start writing above.</div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={handleSaveDraft} disabled={!subject.trim() || !body.trim()}>
                <FileText size={13} /> Save Draft
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSend} disabled={sending || !subject.trim() || !body.trim()}>
                <Send size={13} /> {sending ? 'Sending...' : 'Send Now'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ flex: '0 0 40%', minWidth: 0 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <FileText size={15} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Past Broadcasts</span>
            </div>

            {loading ? (
              <div style={{ color: 'var(--gray)', fontSize: '0.84rem', textAlign: 'center', padding: '20px 0' }}>Loading...</div>
            ) : broadcasts.length === 0 ? (
              <div style={{ color: 'var(--gray)', fontSize: '0.84rem', textAlign: 'center', padding: '20px 0' }}>No broadcasts yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {broadcasts.map((b) => (
                  <div key={b.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', background: 'var(--card2)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: '0.67rem', color: 'var(--gray)', marginBottom: 3, textTransform: 'capitalize' }}>{b.status}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--white)', lineHeight: 1.4 }}>{b.subject}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>{b.sentAt ? fmtDate(b.sentAt) : fmtDate(b.createdAt)}</span>
                      {b.recipientCount > 0 && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>
                          <span style={{ color: 'var(--light)' }}>{b.recipientCount}</span> recipients
                        </span>
                      )}
                      <span style={{ fontSize: '0.65rem', textTransform: 'capitalize' }} className={b.status === 'sent' ? 'badge badge-green' : 'badge badge-gray'}>{b.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
