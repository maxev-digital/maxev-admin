import { prisma } from '@/lib/db';
import { User, Mail, Database, Zap, CheckCircle, XCircle } from 'lucide-react';

function IntegrationRow({ name, envVar }: { name: string; envVar: string }) {
  const configured = !!(process.env[envVar] && process.env[envVar] !== '');
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {configured
          ? <CheckCircle size={15} style={{ color: 'var(--green)' }} />
          : <XCircle size={15} style={{ color: 'var(--gray)' }} />
        }
        <span style={{ fontSize: '0.85rem', color: 'var(--white)', fontWeight: 600 }}>{name}</span>
      </div>
      <span className={`badge ${configured ? 'badge-green' : 'badge-gray'}`}>
        {configured ? 'Connected' : 'Not configured'}
      </span>
    </div>
  );
}

export default async function SystemPage() {
  const adminUser = await prisma.adminUser.findFirst({ orderBy: { createdAt: 'asc' } });

  const smtpConfig = {
    host: process.env.SMTP_HOST ?? 'smtp.hostinger.com',
    port: process.env.SMTP_PORT ?? '465',
    mailboxes: [
      process.env.SMTP_FROM ?? 'will@maxevdigital.com',
      process.env.SMTP_FROM_2 ?? 'info@maxevdigital.com',
    ],
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-sub">Admin configuration and integrations</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 22 }}>
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div className="section-icon"><User size={15} style={{ color: '#fff' }} /></div>
              <span className="section-title">Account</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '0.83rem' }}>
                <span style={{ color: 'var(--gray)' }}>Email</span>
                <span style={{ color: 'var(--white)', fontWeight: 600 }}>{adminUser?.email ?? 'No admin user found'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '0.83rem' }}>
                <span style={{ color: 'var(--gray)' }}>Name</span>
                <span style={{ color: 'var(--white)' }}>{adminUser?.name ?? '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '0.83rem' }}>
                <span style={{ color: 'var(--gray)' }}>Role</span>
                <span className={`badge ${adminUser?.role === 'OWNER' ? 'badge-orange' : 'badge-blue'}`}>
                  {adminUser?.role ?? '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div className="section-icon"><Mail size={15} style={{ color: '#fff' }} /></div>
              <span className="section-title">SMTP Configuration</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '0.83rem' }}>
                <span style={{ color: 'var(--gray)' }}>Host</span>
                <span style={{ color: 'var(--white)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{smtpConfig.host}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '0.83rem' }}>
                <span style={{ color: 'var(--gray)' }}>Port</span>
                <span style={{ color: 'var(--white)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{smtpConfig.port}</span>
              </div>
              <div style={{ padding: '10px 0', fontSize: '0.83rem' }}>
                <span style={{ color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Mailboxes</span>
                {smtpConfig.mailboxes.map((mb) => (
                  <div key={mb} style={{ fontSize: '0.8rem', color: 'var(--light)', fontFamily: 'monospace', marginBottom: 3 }}>{mb}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 22 }}>
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div className="section-icon"><Zap size={15} style={{ color: '#fff' }} /></div>
              <span className="section-title">Integrations</span>
            </div>
            <IntegrationRow name="Stripe" envVar="STRIPE_SECRET_KEY" />
            <IntegrationRow name="Twilio" envVar="TWILIO_ACCOUNT_SID" />
            <IntegrationRow name="Anthropic (Claude)" envVar="ANTHROPIC_API_KEY" />
            <IntegrationRow name="DFW Daily DB" envVar="DFWDAILY_DATABASE_URL" />
            <IntegrationRow name="SMTP" envVar="SMTP_HOST" />
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div className="section-icon"><Database size={15} style={{ color: '#fff' }} /></div>
              <span className="section-title">Database</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '0.83rem' }}>
                <span style={{ color: 'var(--gray)' }}>Provider</span>
                <span style={{ color: 'var(--white)' }}>SQLite (dev)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '0.83rem' }}>
                <span style={{ color: 'var(--gray)' }}>Path</span>
                <span style={{ color: 'var(--light)', fontFamily: 'monospace', fontSize: '0.76rem' }}>
                  {process.env.DATABASE_URL?.replace('file:', '') ?? './prisma/dev.db'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '0.83rem' }}>
                <span style={{ color: 'var(--gray)' }}>DFW Daily</span>
                <span style={{ color: 'var(--light)', fontFamily: 'monospace', fontSize: '0.76rem' }}>PostgreSQL :5435</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
