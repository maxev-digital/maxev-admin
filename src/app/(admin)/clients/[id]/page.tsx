import { prisma } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Mail, Phone, Globe, MapPin, Calendar, Clock, Pencil, Star, Send } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const fmtDate = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const statusBadge: Record<string, string> = {
  ACTIVE: 'badge-green',
  PAUSED: 'badge-orange',
  CHURNED: 'badge-red',
  PROSPECT: 'badge-gray',
};

const packageBadge: Record<string, string> = {
  STARTER: 'badge-gray',
  GROWTH: 'badge-blue',
  PRO: 'badge-purple',
  ENTERPRISE: 'badge-orange',
  CUSTOM: 'badge-blue',
};

const proposalStatusBadge: Record<string, string> = {
  DRAFT: 'badge-gray',
  SENT: 'badge-blue',
  VIEWED: 'badge-purple',
  SIGNED: 'badge-green',
  DECLINED: 'badge-red',
  EXPIRED: 'badge-orange',
};

const invoiceStatusBadge: Record<string, string> = {
  PENDING: 'badge-blue',
  SENT: 'badge-blue',
  PAID: 'badge-green',
  OVERDUE: 'badge-red',
  CANCELLED: 'badge-gray',
};

const projectStatusBadge: Record<string, string> = {
  NOT_STARTED: 'badge-gray',
  IN_PROGRESS: 'badge-blue',
  REVIEW: 'badge-orange',
  LIVE: 'badge-green',
  PAUSED: 'badge-gray',
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = 'overview' } = await searchParams;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      projects: true,
      proposals: true,
      invoices: true,
      activities: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });
  if (!client) notFound();

  const emails = tab === 'emails'
    ? await prisma.emailMessage.findMany({
        where: { clientId: id },
        orderBy: { receivedAt: 'desc' },
        take: 50,
      })
    : [];

  const daysAsClient = client.launchDate
    ? Math.floor((Date.now() - new Date(client.launchDate).getTime()) / 86400000)
    : null;

  const tabs = ['overview', 'projects', 'proposals', 'invoices', 'emails'];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--gray)' }}>
        <Link href="/clients" style={{ color: 'var(--gray)' }}>Clients</Link>
        <span>/</span>
        <span style={{ color: 'var(--light)' }}>{client.businessName}</span>
      </div>

      <div className="page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>{client.businessName}</h1>
          <span className={`badge ${statusBadge[client.status]}`}>{client.status}</span>
          <span className={`badge ${packageBadge[client.packageTier]}`}>{client.packageTier}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href={`/clients/${id}/edit`} className="btn btn-ghost btn-sm">
            <Pencil size={12} />
            Edit
          </Link>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--green)' }}>{fmt(client.mrr)}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 2 }}>per month</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map((t) => (
          <Link
            key={t}
            href={`/clients/${id}?tab=${t}`}
            style={{
              padding: '8px 18px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: tab === t ? 'var(--white)' : 'var(--gray)',
              borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
              textTransform: 'capitalize',
              marginBottom: -1,
            }}
          >
            {t === 'overview' ? 'Overview' : t.charAt(0).toUpperCase() + t.slice(1)}
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <div>
          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Contact Info</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {client.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem', color: 'var(--light)' }}>
                      <Mail size={14} style={{ color: 'var(--gray)', flexShrink: 0 }} />
                      <a href={`mailto:${client.email}`} style={{ color: 'var(--light)' }}>{client.email}</a>
                    </div>
                  )}
                  {client.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem', color: 'var(--light)' }}>
                      <Phone size={14} style={{ color: 'var(--gray)', flexShrink: 0 }} />
                      {client.phone}
                    </div>
                  )}
                  {client.website && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem', color: 'var(--light)' }}>
                      <Globe size={14} style={{ color: 'var(--gray)', flexShrink: 0 }} />
                      <a href={`https://${client.website}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>{client.website}</a>
                    </div>
                  )}
                  {(client.city || client.state) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem', color: 'var(--light)' }}>
                      <MapPin size={14} style={{ color: 'var(--gray)', flexShrink: 0 }} />
                      {[client.city, client.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Calendar size={14} style={{ color: 'var(--gray)' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Launch Date</span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--white)' }}>{fmtDate(client.launchDate)}</div>
                </div>
                <div className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Clock size={14} style={{ color: 'var(--gray)' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Days as Client</span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--white)' }}>{daysAsClient !== null ? daysAsClient : '—'}</div>
                </div>
              </div>

              {client.notes && (
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Notes</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--light)', lineHeight: 1.6, margin: 0 }}>{client.notes}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'projects' && (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Start Date</th>
                      <th>Launch Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.projects.length === 0 ? (
                      <tr><td colSpan={5} style={{ color: 'var(--gray)', textAlign: 'center' }}>No projects yet</td></tr>
                    ) : client.projects.map((p) => (
                      <tr key={p.id}>
                        <td style={{ color: 'var(--white)', fontWeight: 600 }}>{p.name}</td>
                        <td style={{ color: 'var(--light)' }}>{p.type.replace('_', ' ')}</td>
                        <td><span className={`badge ${projectStatusBadge[p.status]}`}>{p.status.replace('_', ' ')}</span></td>
                        <td style={{ color: 'var(--gray)' }}>{fmtDate(p.startDate)}</td>
                        <td style={{ color: 'var(--gray)' }}>{fmtDate(p.launchDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'proposals' && (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Proposal #</th>
                      <th>Package</th>
                      <th>One-Time</th>
                      <th>Monthly</th>
                      <th>Status</th>
                      <th>Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.proposals.length === 0 ? (
                      <tr><td colSpan={6} style={{ color: 'var(--gray)', textAlign: 'center' }}>No proposals yet</td></tr>
                    ) : client.proposals.map((p) => (
                      <tr key={p.id}>
                        <td style={{ color: 'var(--white)', fontWeight: 600 }}>{p.proposalNumber}</td>
                        <td><span className={`badge ${packageBadge[p.packageTier]}`}>{p.packageTier}</span></td>
                        <td style={{ color: 'var(--light)' }}>{fmt(p.oneTimeTotal)}</td>
                        <td style={{ color: 'var(--green)' }}>{fmt(p.monthlyTotal)}</td>
                        <td><span className={`badge ${proposalStatusBadge[p.status]}`}>{p.status}</span></td>
                        <td style={{ color: 'var(--gray)' }}>{fmtDate(p.sentAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'emails' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>{emails.length} message{emails.length !== 1 ? 's' : ''}</div>
                <Link
                  href={`/comms/inbox?clientId=${id}`}
                  className="btn btn-ghost btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Mail size={12} />
                  Open in Inbox
                </Link>
              </div>
              {emails.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--gray)', fontSize: '0.85rem' }}>
                  No emails linked to this client yet.
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {emails.map((msg, i) => (
                    <Link
                      key={msg.id}
                      href={`/comms/inbox?clientId=${id}&messageId=${msg.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '12px 16px',
                        borderBottom: i < emails.length - 1 ? '1px solid var(--border)' : 'none',
                        background: msg.isRead ? 'transparent' : 'rgba(var(--primary-rgb,59,130,246),0.04)',
                        textDecoration: 'none',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray)',
                      }}>
                        {msg.isSent ? <Send size={13} /> : (msg.fromName?.[0] || msg.fromEmail[0]).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: msg.isRead ? 500 : 700, color: 'var(--white)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {msg.isSent ? 'You' : (msg.fromName || msg.fromEmail)}
                          </span>
                          {msg.isStarred && <Star size={11} style={{ color: '#f59e0b', flexShrink: 0 }} />}
                          <span style={{ fontSize: '0.7rem', color: 'var(--gray)', flexShrink: 0 }}>
                            {new Date(msg.receivedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: msg.isRead ? 'var(--gray)' : 'var(--light)', fontWeight: msg.isRead ? 400 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {msg.subject || '(no subject)'}
                        </div>
                        {msg.snippet && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                            {msg.snippet}
                          </div>
                        )}
                      </div>
                      {!msg.isRead && (
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 6 }} />
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'invoices' && (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.invoices.length === 0 ? (
                      <tr><td colSpan={5} style={{ color: 'var(--gray)', textAlign: 'center' }}>No invoices yet</td></tr>
                    ) : client.invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td style={{ color: 'var(--white)', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                        <td style={{ color: 'var(--light)' }}>{inv.type}</td>
                        <td style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt(inv.amount)}</td>
                        <td><span className={`badge ${invoiceStatusBadge[inv.status]}`}>{inv.status}</span></td>
                        <td style={{ color: 'var(--gray)' }}>{fmtDate(inv.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20, alignSelf: 'start' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {client.activities.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>No activity yet</p>
            ) : client.activities.map((a) => (
              <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--light)', lineHeight: 1.5 }}>{a.description}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--gray)', marginTop: 3 }}>
                  {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
