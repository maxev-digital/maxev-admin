import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import SignForm from './SignForm';

export const dynamic = 'force-dynamic';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

export default async function ProposalSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const proposal = await prisma.proposal.findUnique({ where: { signToken: token } });
  if (!proposal) notFound();

  const lineItems = (proposal.lineItems as { name: string; price: number }[]) ?? [];
  const alreadySigned = proposal.status === 'SIGNED';

  return (
    <div style={{ minHeight: '100vh', background: '#050508', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '40px 16px' }}>
      <div style={{ maxWidth: 660, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, background: '#14B8AD', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span style={{ color: '#14B8AD', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.04em' }}>SAMPLESHIELD SECURITY</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800, margin: '0 0 6px' }}>Security Proposal</h1>
          <div style={{ color: '#666', fontSize: '0.88rem' }}>
            {proposal.proposalNumber} &bull; Prepared for <strong style={{ color: '#ccc' }}>{proposal.businessName}</strong>
          </div>
        </div>

        {/* Already signed banner */}
        {alreadySigned && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: 'rgba(20,184,173,0.08)', border: '1px solid rgba(20,184,173,0.3)', borderRadius: 10, marginBottom: 24, color: '#14B8AD', fontSize: '0.88rem', fontWeight: 600 }}>
            <span style={{ fontSize: 18 }}>✓</span>
            This proposal was signed on {new Date(proposal.signedAt!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
          </div>
        )}

        {/* Proposal card */}
        <div style={{ background: '#0e0e12', border: '1px solid #1a1a22', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>

          {/* Package badge */}
          <div style={{ padding: '16px 24px', background: '#111118', borderBottom: '1px solid #1a1a22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Package Tier</div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>{proposal.packageTier}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Industry</div>
              <div style={{ color: '#ccc', fontSize: '0.9rem' }}>{proposal.industry}</div>
            </div>
          </div>

          {/* Notes / message */}
          {proposal.notes && (
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #1a1a22', color: '#aaa', fontSize: '0.88rem', lineHeight: 1.65 }}>
              {proposal.notes}
            </div>
          )}

          {/* Line items */}
          {lineItems.length > 0 && (
            <div style={{ padding: '0 24px' }}>
              <div style={{ padding: '14px 0 8px', fontSize: '0.72rem', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scope of Work</div>
              {lineItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: i < lineItems.length - 1 ? '1px solid #1a1a22' : 'none' }}>
                  <span style={{ color: '#ddd', fontSize: '0.9rem' }}>{item.name}</span>
                  <span style={{ color: '#14B8AD', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, marginLeft: 16 }}>{fmt(item.price)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div style={{ padding: '16px 24px', background: '#111118', borderTop: '1px solid #1a1a22' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: proposal.monthlyTotal > 0 ? 10 : 0 }}>
              <span style={{ color: '#888', fontSize: '0.88rem' }}>One-Time Total</span>
              <span style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 800 }}>{fmt(proposal.oneTimeTotal)}</span>
            </div>
            {proposal.monthlyTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888', fontSize: '0.88rem' }}>Monthly Monitoring</span>
                <span style={{ color: '#14B8AD', fontSize: '1rem', fontWeight: 700 }}>{fmt(proposal.monthlyTotal)}/mo</span>
              </div>
            )}
          </div>
        </div>

        {/* Sign section */}
        <div style={{ background: '#0e0e12', border: '1px solid #1a1a22', borderRadius: 14, padding: '28px 28px' }}>
          {alreadySigned ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ color: '#14B8AD', fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>Proposal Already Signed</div>
              <div style={{ color: '#666', fontSize: '0.85rem' }}>Thank you! Our team will be in touch to confirm your appointment.</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
                E-Sign to Accept
              </div>
              <SignForm
                proposalId={proposal.id}
                signToken={token}
                defaultName={''}
                proposalNumber={proposal.proposalNumber}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 28, color: '#444', fontSize: '0.78rem', lineHeight: 1.6 }}>
          SampleShield Security &bull; sampleshield.maxevdigital.com
          <br />Questions? Contact us at info@maxevdigital.com
        </div>
      </div>
    </div>
  );
}
