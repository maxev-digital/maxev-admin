'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useAIHighlight } from '@/lib/ai-highlight';
import ProposalActions from './ProposalActions';

type Proposal = {
  id: string;
  proposalNumber: string;
  businessName: string;
  industry: string;
  packageTier: string;
  oneTimeTotal: number;
  monthlyTotal: number;
  status: string;
  sentAt: Date | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const fmtDate = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const statusBadge: Record<string, string> = {
  DRAFT: 'badge-gray',
  SENT: 'badge-blue',
  VIEWED: 'badge-purple',
  SIGNED: 'badge-green',
  DECLINED: 'badge-red',
  EXPIRED: 'badge-orange',
};

const packageBadge: Record<string, string> = {
  STARTER: 'badge-gray',
  GROWTH: 'badge-blue',
  PRO: 'badge-purple',
  ENTERPRISE: 'badge-orange',
  CUSTOM: 'badge-blue',
};

export default function ProposalsTableClient({ proposals }: { proposals: Proposal[] }) {
  const { isHighlighted, hasAnyHighlight } = useAIHighlight();
  const navGlow = isHighlighted('nav-path', '/proposals');
  const anyStatusHighlight = hasAnyHighlight('proposal-status');

  const draft = proposals.filter((p) => p.status === 'DRAFT').length;
  const sent = proposals.filter((p) => p.status === 'SENT' || p.status === 'VIEWED').length;
  const signed = proposals.filter((p) => p.status === 'SIGNED').length;
  const totalValue = proposals.reduce((s, p) => s + p.oneTimeTotal + p.monthlyTotal * 12, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Proposals</h1>
          <p className="page-sub">{proposals.length} total proposals</p>
        </div>
        <Link href="/proposals/new" className="btn btn-primary btn-sm">
          <Plus size={13} />
          New Proposal
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className={`card-blue${navGlow ? ' ai-highlight-glow' : ''}`} style={{ padding: 20, transition: 'box-shadow 0.3s' }}>
          <div className={`kpi-value${navGlow ? ' ai-text-fill' : ''}`}>{draft}</div>
          <div className="kpi-label" style={{ marginTop: 8 }}>Draft</div>
        </div>
        <div className={`card-orange${navGlow ? ' ai-highlight-glow' : ''}`} style={{ padding: 20, transition: 'box-shadow 0.3s' }}>
          <div className={`kpi-value-orange${navGlow ? ' ai-text-fill' : ''}`}>{sent}</div>
          <div className="kpi-label" style={{ marginTop: 8 }}>Sent / Viewed</div>
        </div>
        <div className={`card-green${navGlow ? ' ai-highlight-glow' : ''}`} style={{ padding: 20, transition: 'box-shadow 0.3s' }}>
          <div className={`kpi-value-green${navGlow ? ' ai-text-fill' : ''}`}>{signed}</div>
          <div className="kpi-label" style={{ marginTop: 8 }}>Signed</div>
        </div>
        <div className={`card-blue${navGlow ? ' ai-highlight-glow' : ''}`} style={{ padding: 20, transition: 'box-shadow 0.3s' }}>
          <div className={`kpi-value${navGlow ? ' ai-text-fill' : ''}`}>{fmt(totalValue)}</div>
          <div className="kpi-label" style={{ marginTop: 8 }}>Total Value (ARR)</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Proposal #</th>
                <th>Business</th>
                <th>Industry</th>
                <th>Package</th>
                <th>One-Time</th>
                <th>Monthly</th>
                <th>Status</th>
                <th>Sent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {proposals.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ color: 'var(--gray)', textAlign: 'center', padding: 32 }}>No proposals yet</td>
                </tr>
              ) : proposals.map((p) => {
                const aiEffect = isHighlighted('proposal-status', p.status);
                return (
                  <tr key={p.id} className={aiEffect === 'glow' ? 'ai-highlight-glow' : anyStatusHighlight && !aiEffect ? 'ai-highlight-dim' : ''}>
                    <td style={{ color: 'var(--white)', fontWeight: 700 }}>{p.proposalNumber}</td>
                    <td style={{ color: 'var(--white)', fontWeight: 600 }}>{p.businessName}</td>
                    <td style={{ color: 'var(--light)' }}>{p.industry}</td>
                    <td><span className={`badge ${packageBadge[p.packageTier]}`}>{p.packageTier}</span></td>
                    <td style={{ color: 'var(--light)' }}>{fmt(p.oneTimeTotal)}</td>
                    <td style={{ color: 'var(--green)', fontWeight: 600 }} className={aiEffect === 'glow' ? 'ai-text-fill' : ''}>{fmt(p.monthlyTotal)}</td>
                    <td><span className={`badge ${statusBadge[p.status]}`}>{p.status}</span></td>
                    <td style={{ color: 'var(--gray)' }}>{fmtDate(p.sentAt)}</td>
                    <td>
                      <ProposalActions proposalNumber={p.proposalNumber} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
