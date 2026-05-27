'use client';

import { DollarSign, Users, GitBranch, AlertCircle } from 'lucide-react';
import { useAIHighlight } from '@/lib/ai-highlight';

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

const iconWrap: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 9,
  background: 'rgba(255,255,255,0.07)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

interface Props {
  mrr: number;
  activeCount: number;
  openPipelineValue: number;
  openPipelineLeads: number;
  outstandingTotal: number;
}

export default function DashboardKPICards({ mrr, activeCount, openPipelineValue, openPipelineLeads, outstandingTotal }: Props) {
  const { isHighlighted } = useAIHighlight();

  const mrrGlow         = isHighlighted('nav-path', '/revenue') || isHighlighted('nav-path', '/finance');
  const clientsGlow     = isHighlighted('nav-path', '/clients');
  const pipelineGlow    = isHighlighted('nav-path', '/pipeline') || isHighlighted('lead-stage') || isHighlighted('lead-priority', 'HOT');
  const invoicesGlow    = isHighlighted('nav-path', '/invoices') || isHighlighted('invoice-status', 'OVERDUE') || isHighlighted('invoice-status', 'PENDING');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
      {/* MRR */}
      <div className={`card-blue ${mrrGlow ? 'ai-highlight-glow' : ''}`} style={{ padding: 20, transition: 'box-shadow 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className={`kpi-value ${mrrGlow ? 'ai-text-fill' : ''}`}>{fmt$(mrr)}</div>
          <div style={iconWrap}><DollarSign size={16} style={{ color: 'var(--light)' }} /></div>
        </div>
        <div className="kpi-label">Monthly Recurring</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 3 }}>MRR across active retainers</div>
      </div>

      {/* Active Clients */}
      <div className={`card-blue ${clientsGlow ? 'ai-highlight-glow' : ''}`} style={{ padding: 20, transition: 'box-shadow 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className={`kpi-value ${clientsGlow ? 'ai-text-fill' : ''}`}>{activeCount}</div>
          <div style={iconWrap}><Users size={16} style={{ color: 'var(--light)' }} /></div>
        </div>
        <div className="kpi-label">Active Clients</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 3 }}>Paying clients on retainer</div>
      </div>

      {/* Open Pipeline */}
      <div className={`card-green ${pipelineGlow ? 'ai-highlight-glow' : ''}`} style={{ padding: 20, transition: 'box-shadow 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className={`kpi-value-green ${pipelineGlow ? 'ai-text-fill' : ''}`}>{fmt$(openPipelineValue)}</div>
          <div style={iconWrap}><GitBranch size={16} style={{ color: 'var(--light)' }} /></div>
        </div>
        <div className="kpi-label">Open Pipeline</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 3 }}>{openPipelineLeads} active lead{openPipelineLeads !== 1 ? 's' : ''}</div>
      </div>

      {/* Outstanding Invoices */}
      <div className={`card-orange ${invoicesGlow ? 'ai-highlight-glow' : ''}`} style={{ padding: 20, transition: 'box-shadow 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className={`kpi-value-orange ${invoicesGlow ? 'ai-text-fill' : ''}`}>{fmt$(outstandingTotal)}</div>
          <div style={iconWrap}><AlertCircle size={16} style={{ color: 'var(--light)' }} /></div>
        </div>
        <div className="kpi-label">Outstanding Invoices</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: 3 }}>Pending, sent &amp; overdue</div>
      </div>
    </div>
  );
}
