'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Loader2, Sun, Moon, Sparkles, Zap, AlertTriangle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/lib/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

type Vitals = {
  activeClients: number;
  openLeads: number;
  overdueInvoices: number;
  overdueAmount: number;
  openPipelineValue: number;
  hotLeads: number;
  expiringProposals: number;
  openTickets: number;
  urgentTickets: number;
};
type BriefingData = { briefing: string; vitals: Vitals };
type ActionsData  = { actions: string };
type HealthDim    = { label: string; score: number; trend: 'up' | 'down' | 'stable'; detail: string };
type HealthData   = { overall: number; grade: string; summary: string; dimensions: HealthDim[]; generatedAt: string };
type Pattern = {
  id: string;
  category: 'revenue' | 'pipeline' | 'clients' | 'proposals' | 'operations';
  insight: string;
  detail: string;
  signal: 'positive' | 'negative' | 'neutral';
  metric?: string;
};
type Recommendation = {
  id: string;
  priority: 'urgent' | 'high' | 'medium';
  category: 'pipeline' | 'finance' | 'tasks' | 'inventory' | 'clients';
  title: string;
  detail: string;
  action: string;
  href: string;
  count?: number;
  value?: number;
};
type MapMode = 'leads' | 'revenue' | 'expenses' | 'marketing';
type MapTile = { name: string; value: number; delta: string; display?: string };
type StatsData = {
  pipelineStages:    { label: string; count: number; value: number; color: string }[];
  revenueTiers:      { label: string; amount: number; color: string }[];
  mrrTotal:          number;
  activeClientCount: number;
  cashInflow:        number;
  cashOutflow:       number;
  expenseCategories: { label: string; pct: number; color: string }[];
  arAging:           { label: string; amount: number; color: string }[];
  pnl:               { grossRevenue: number; operatingCosts: number; grossMargin: number; marginPct: number };
  salesFunnel:       { stage: string; count: number; color: string }[];
  leadSources:       { name: string; count: number }[];
  activeProjects:    { name: string; status: string; pct: number; color: string }[];
  topClients:        { name: string; arr: string; mrr: number; risk: string }[];
};

// ── Static goal constants (not sourced from DB) ───────────────────────────────

const MRR_TREND  = [8200, 9100, 8800, 10200, 11400, 12800];
const MRR_LABELS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
const MRR_GOAL   = 15000;
const PIPE_TARGET = 50000;
const CLIENT_TARGET = 20;

// Portfolio Map — Marketing ROI mode (no DB backing, kept static)
const MKTG_R1: MapTile[] = [
  { name: 'Google Ads',    value: 42, delta: '+22%', display: '420% ROI' },
  { name: 'SEO / Organic', value: 38, delta: '+18%', display: 'Organic'  },
  { name: 'Email Blasts',  value: 28, delta: '+5%',  display: '280% ROI' },
  { name: 'Instagram',     value: 22, delta: '+12%', display: '220% ROI' },
];
const MKTG_R2: MapTile[] = [
  { name: 'LinkedIn',    value: 18, delta: '+30%', display: '180% ROI' },
  { name: 'Partner Refs',value: 16, delta: '+8%',  display: '160% ROI' },
  { name: 'Meta Ads',    value: 14, delta: '-5%',  display: '140% ROI' },
  { name: 'TikTok Ads', value: 10, delta: '+45%', display: '100% ROI' },
];
const MKTG_R3: MapTile[] = [
  { name: 'YouTube',    value: 8, delta: '+60%', display: '80% ROI'  },
  { name: 'Cold Email', value: 6, delta: '-8%',  display: '60% ROI'  },
  { name: 'Events',     value: 4, delta: '-20%', display: '40% ROI'  },
  { name: 'Radio',      value: 3, delta: '+5%',  display: '30% ROI'  },
  { name: 'TV',         value: 2, delta: '0%',   display: '20% ROI'  },
];


const SALES_METRICS = [
  { label: 'Win Rate',       value: '34%',    trend: '+4%',   good: true  },
  { label: 'Avg Deal Size',  value: '$4,200', trend: '+$600', good: true  },
  { label: 'Sales Cycle',    value: '18 days',trend: '-3d',   good: true  },
  { label: 'Quota Attained', value: '78%',    trend: '-5%',   good: false },
];

const EMAIL_METRICS = [
  { label: 'Open Rate',      value: '31.4%', bench: '21%',  good: true  },
  { label: 'Click Rate',     value: '4.8%',  bench: '2.5%', good: true  },
  { label: 'Reply Rate',     value: '2.1%',  bench: '1.0%', good: true  },
  { label: 'Unsubscribe',    value: '0.4%',  bench: '0.5%', good: true  },
  { label: 'Deliverability', value: '98.2%', bench: '95%',  good: true  },
  { label: 'Cost Per Lead',  value: '$22',   bench: '$45',  good: true  },
];

const OPS_METRICS = [
  { label: 'On-Time Delivery', value: '74%',     good: true  },
  { label: 'Capacity Used',    value: '88%',     good: true  },
  { label: 'Open Tickets',     value: '7',       good: false },
  { label: 'Avg Resolution',   value: '4.2h',    good: true  },
  { label: 'SLA Compliance',   value: '94%',     good: true  },
  { label: 'Churn Risk',       value: '2 accts', good: false },
];

const CS_METRICS = [
  { label: 'Avg NPS',                  value: '72',           good: true  },
  { label: 'Retention Rate',           value: '91%',          good: true  },
  { label: 'At-Risk Accounts',         value: '2',            good: false },
  { label: 'Upsell Pipeline',          value: '$8.4k',        good: true  },
  { label: 'Support Load / Client',    value: '1.4 tickets',  good: true  },
  { label: 'CSAT Score',               value: '4.7/5',        good: true  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function tileColor(delta: string, isDark = true): { bg: string; text: string; border: string } {
  const n = parseFloat(delta);
  if (isDark) {
    if (n >= 15) return { bg: 'rgba(16,185,129,0.55)', text: '#34D399', border: 'rgba(16,185,129,0.65)' };
    if (n >=  5) return { bg: 'rgba(16,185,129,0.35)', text: '#6EE7B7', border: 'rgba(16,185,129,0.4)'  };
    if (n >   0) return { bg: 'rgba(16,185,129,0.18)', text: '#A7F3D0', border: 'rgba(16,185,129,0.25)' };
    if (n === 0) return { bg: 'rgba(107,114,128,0.22)', text: '#9CA3AF', border: 'rgba(107,114,128,0.3)' };
    if (n >= -5) return { bg: 'rgba(239,68,68,0.18)', text: '#FCA5A5', border: 'rgba(239,68,68,0.25)'  };
    if (n >= -15)return { bg: 'rgba(239,68,68,0.35)', text: '#FCA5A5', border: 'rgba(239,68,68,0.4)'   };
    return             { bg: 'rgba(239,68,68,0.55)', text: '#FEE2E2', border: 'rgba(239,68,68,0.65)'  };
  } else {
    if (n >= 15) return { bg: '#047857', text: '#FFFFFF', border: '#059669' };
    if (n >=  5) return { bg: '#059669', text: '#FFFFFF', border: '#14B8AD' };
    if (n >   0) return { bg: '#14B8AD', text: '#FFFFFF', border: '#34D399' };
    if (n === 0) return { bg: '#374151', text: '#FFFFFF', border: '#4B5563' };
    if (n >= -5) return { bg: '#DC2626', text: '#FFFFFF', border: '#E05252' };
    if (n >= -15)return { bg: '#B91C1C', text: '#FFFFFF', border: '#DC2626' };
    return             { bg: '#991B1B', text: '#FFFFFF', border: '#B91C1C' };
  }
}

function healthColor(score: number): string {
  if (score >= 80) return '#14B8AD';
  if (score >= 65) return '#3B7DD9';
  if (score >= 50) return '#D08E14';
  return '#E05252';
}

function healthGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  return 'D';
}

function parseActions(raw: string): string[] {
  const numbered = raw.match(/\d+[.)]\s+[\s\S]+?(?=\d+[.)]\s+|$)/g);
  if (numbered && numbered.length >= 2)
    return numbered.slice(0, 3).map((s) => s.replace(/^\d+[.)]\s+/, '').trim());
  const bulleted = raw.match(/[*-]\s+[\s\S]+?(?=[*-]\s+|$)/g);
  if (bulleted && bulleted.length >= 2)
    return bulleted.slice(0, 3).map((s) => s.replace(/^[*-]\s+/, '').trim());
  return raw.split(/\n\n+/).filter((p) => p.trim()).slice(0, 3);
}

// ── SVG components ────────────────────────────────────────────────────────────

function Gauge({ pct, color, label, sub, isDark = true }: { pct: number; color: string; label: string; sub: string; isDark?: boolean }) {
  const cx = 80, cy = 76, r = 58;
  const circ = 2 * Math.PI * r;
  const arc  = circ * 0.75;
  const fill = arc * Math.min(Math.max(pct, 0), 1);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const ang = ((135 + t * 270) * Math.PI) / 180;
    return { x1: cx + (r - 8) * Math.cos(ang), y1: cy + (r - 8) * Math.sin(ang), x2: cx + (r + 2) * Math.cos(ang), y2: cy + (r + 2) * Math.sin(ang) };
  });
  const txt     = isDark ? '#FFFFFF' : '#334155';
  const txtSub  = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(51,65,85,0.65)';
  const txtLbl  = isDark ? 'rgba(255,255,255,0.3)'  : 'rgba(51,65,85,0.45)';
  const track   = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const tickClr = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  return (
    <svg viewBox="0 0 160 100" style={{ width: '100%', maxWidth: 180, display: 'block', margin: '0 auto' }}>
      <defs>
        <linearGradient id="gfill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.7" /><stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={track} strokeWidth={9}
        strokeDasharray={`${arc} ${circ}`} strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#gfill)" strokeWidth={9}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      {ticks.map((tk, i) => <line key={i} x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} stroke={tickClr} strokeWidth={1.5} strokeLinecap="round" />)}
      <circle cx={cx} cy={cy} r={14} fill={color} fillOpacity="0.08" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={txt} fontSize={18} fontWeight={900} fontFamily="'Space Grotesk', sans-serif">{Math.round(pct * 100)}%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill={txtSub} fontSize={7.5} fontFamily="'Space Grotesk', sans-serif">{sub}</text>
      <text x={cx} y={96} textAnchor="middle" fill={txtLbl} fontSize={7} fontFamily="'Space Grotesk', sans-serif" fontWeight={700} letterSpacing="0.12em">{label.toUpperCase()}</text>
    </svg>
  );
}

function Sparkline({ data, color, labels, isDark = true }: { data: number[]; color: string; labels: string[]; isDark?: boolean }) {
  const W = 200, H = 60;
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1;
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * (W - 8) + 4, y: H - 10 - ((v - min) / rng) * (H - 20) }));
  const poly = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `M${pts[0].x},${H} ` + pts.map((p) => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1].x},${H} Z`;
  const gid = `sl${color.replace(/[^a-zA-Z0-9]/g, '')}`;
  const dotFill = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
  const lblFill = isDark ? 'rgba(255,255,255,0.2)'  : 'rgba(51,65,85,0.45)';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, overflow: 'visible' }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.35" /><stop offset="100%" stopColor={color} stopOpacity="0.01" /></linearGradient></defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={poly} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 3.5 : 2} fill={i === pts.length - 1 ? color : dotFill} stroke={i === pts.length - 1 ? '#000' : 'none'} strokeWidth={1} />)}
      {labels.map((l, i) => <text key={i} x={pts[i].x} y={H + 1} textAnchor="middle" fill={lblFill} fontSize={6.5} fontFamily="'Space Grotesk', sans-serif">{l}</text>)}
    </svg>
  );
}

function Ring({ pct, color, center, sub, isDark = true }: { pct: number; color: string; center: string; sub: string; isDark?: boolean }) {
  const cx = 44, cy = 44, r = 34;
  const circ = 2 * Math.PI * r;
  const fill = circ * Math.min(Math.max(pct, 0), 1);
  const gid = `rg${color.replace(/[^a-zA-Z0-9]/g, '')}`;
  const track  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const txt    = isDark ? '#FFFFFF' : '#334155';
  const txtSub = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(51,65,85,0.5)';
  return (
    <svg viewBox="0 0 88 88" style={{ width: 88, height: 88, flexShrink: 0 }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.6" /><stop offset="100%" stopColor={color} /></linearGradient></defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={track} strokeWidth={8} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={8}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <circle cx={cx} cy={cy} r={20} fill={color} fillOpacity="0.07" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={txt} fontSize={14} fontWeight={900} fontFamily="'Space Grotesk', sans-serif">{center}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill={txtSub} fontSize={7} fontFamily="'Space Grotesk', sans-serif">{sub}</text>
    </svg>
  );
}

function StageBar({ label, count, max, color, value, maxVal, isDark = true }: { label: string; count: number; max: number; color: string; value?: number; maxVal?: number; isDark?: boolean }) {
  const barPct   = value !== undefined && maxVal ? (value / maxVal) * 100 : (count / max) * 100;
  const lblClr   = isDark ? 'rgba(255,255,255,0.5)'  : '#334155';
  const cntClr   = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(51,65,85,0.45)';
  const trackClr = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: '0.71rem', color: lblClr, fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: '0.6rem', color: cntClr }}>{count} deal{count !== 1 ? 's' : ''}</span>
        </div>
        <span style={{ fontSize: '0.78rem', color, fontWeight: 700 }}>
          {value !== undefined ? `$${(value / 1000).toFixed(1)}k` : count}
        </span>
      </div>
      <div style={{ height: 5, background: trackClr, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 3, transition: 'width 0.8s ease', boxShadow: `0 0 6px ${color}66` }} />
      </div>
    </div>
  );
}

function PortfolioTile({ name, value, delta, display, total, isDark }: MapTile & { total: number; isDark: boolean }) {
  const { bg, text, border } = tileColor(delta, isDark);
  const n = parseFloat(delta);
  const arrow = n > 0 ? '▲' : n < 0 ? '▼' : '—';
  const pct = ((value / total) * 100).toFixed(0);
  const shown = display ?? String(value);
  const isSmall = value < 5;
  return (
    <div className="ptile" style={{ flex: value, minWidth: 36, background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: isSmall ? '6px 5px' : '10px 11px', overflow: 'hidden', cursor: 'default', transition: 'opacity 0.15s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {isSmall ? (
        <span style={{ fontSize: '0.58rem', fontWeight: 700, color: text, lineHeight: 1.3 }}>{name.split(' ')[0]}</span>
      ) : (
        <>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{name}</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{shown}</div>
          <div style={{ fontSize: '0.6rem', color: text, marginTop: 5 }}>{arrow} {delta} &middot; {pct}%</div>
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MaxAIInsightsPage() {
  const { theme, toggle } = useTheme();
  const [briefing, setBriefing]     = useState<BriefingData | null>(null);
  const [actions, setActions]       = useState<ActionsData | null>(null);
  const [stats, setStats]           = useState<StatsData | null>(null);
  const [healthScore, setHealth]    = useState<HealthData | null>(null);
  const [recs, setRecs]             = useState<Recommendation[]>([]);
  const [patterns, setPatterns]     = useState<Pattern[]>([]);
  const [broadcasts, setBroadcasts] = useState<Array<{ id: string; subject: string; recipientCount: number; status: string; sentAt: string | null }>>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [updatedAt, setUpdatedAt]   = useState<Date | null>(null);
  const [mapMode, setMapMode]       = useState<MapMode>('leads');

  const isDark = theme === 'dark';

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [b, a, s, h, r, p, bc] = await Promise.all([
        fetch('/api/ai/briefing').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/ai/next-actions').then((r) => r.ok ? r.json() : null),
        fetch('/api/ai/stats').then((r) => r.ok ? r.json() : null),
        fetch('/api/ai/health-score').then((r) => r.ok ? r.json() : null),
        fetch('/api/ai/recommendations').then((r) => r.ok ? r.json() : null),
        fetch('/api/ai/patterns').then((r) => r.ok ? r.json() : null),
        fetch('/api/comms/newsletter').then((r) => r.ok ? r.json() : null),
      ]);
      setBriefing(b);
      if (a) setActions(a);
      if (s) setStats(s);
      if (h) setHealth(h);
      if (r?.recommendations) setRecs(r.recommendations);
      if (p?.patterns) setPatterns(p.patterns);
      if (bc?.broadcasts) setBroadcasts((bc.broadcasts as Array<{ id: string; subject: string; recipientCount: number; status: string; sentAt: string | null }>).slice(0, 5));
      setUpdatedAt(new Date());
    } catch {
      setError('Cannot reach MAX AI Engine. Vitals unavailable.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  const actionItems = actions ? parseActions(actions.actions) : [];
  const v           = briefing?.vitals;
  const pipelinePct = v ? v.openPipelineValue / PIPE_TARGET : 0;
  const clientPct   = v ? v.activeClients / CLIENT_TARGET : 0;
  const healthOverall = healthScore?.overall ?? 0;
  const grade         = healthScore?.grade ?? (loading ? '...' : '—');
  const gradeColor    = healthColor(healthOverall);
  const healthDims    = healthScore?.dimensions ?? [];

  // ── Live stats derived from DB ─────────────────────────────────────────────
  const liveMrr            = stats?.mrrTotal ?? 0;
  const liveMrrPct         = MRR_GOAL > 0 ? liveMrr / MRR_GOAL : 0;
  const livePipelineStages = stats?.pipelineStages ?? [];
  const liveRevenueTiers   = stats?.revenueTiers ?? [];
  const liveRevenueTotal   = liveRevenueTiers.reduce((s, t) => s + t.amount, 0);
  const liveCfInflow       = stats?.cashInflow ?? 0;
  const liveCfOutflow      = stats?.cashOutflow ?? 0;
  const liveCfNet          = liveCfInflow - liveCfOutflow;
  const liveArAging        = stats?.arAging ?? [];
  const liveArTotal        = liveArAging.reduce((s, a) => s + a.amount, 0) || 1;
  const liveExpenseCats    = stats?.expenseCategories ?? [];
  const liveSalesFunnel    = stats?.salesFunnel ?? [];
  const liveProjects       = stats?.activeProjects ?? [];
  const liveTopClients     = stats?.topClients ?? [];
  const livePnl            = stats?.pnl;
  const livePipelineMax    = livePipelineStages.length > 0 ? Math.max(...livePipelineStages.map((s) => s.count), 1) : 1;
  const livePipelineValMax = livePipelineStages.length > 0 ? Math.max(...livePipelineStages.map((s) => s.value ?? 0), 1) : 1;
  const liveFunnelBase     = liveSalesFunnel[0]?.count || 1;

  // Portfolio map tile rows built from live data
  const liveLeadRows: MapTile[][] = (() => {
    const src = stats?.leadSources ?? [];
    if (!src.length) return [[], [], []];
    const sorted = [...src].sort((a, b) => b.count - a.count);
    const toTile = (s: { name: string; count: number }): MapTile => ({ name: s.name, value: s.count, delta: '0%' });
    return [sorted.slice(0, 4).map(toTile), sorted.slice(4, 8).map(toTile), sorted.slice(8).map(toTile)];
  })();

  const liveClientRows: MapTile[][] = (() => {
    const clients = stats?.topClients ?? [];
    if (!clients.length) return [[], [], []];
    const toTile = (c: StatsData['topClients'][0]): MapTile => ({
      name: c.name, value: c.mrr,
      delta: c.risk === 'low' ? '+5%' : c.risk === 'high' ? '-5%' : '0%',
      display: c.arr,
    });
    return [clients.slice(0, 3).map(toTile), clients.slice(3).map(toTile), []];
  })();

  const liveExpenseRows: MapTile[][] = (() => {
    const cats = stats?.expenseCategories ?? [];
    if (!cats.length) return [[], [], []];
    const toTile = (c: { label: string; pct: number }): MapTile => ({ name: c.label, value: c.pct, delta: '0%' });
    return [cats.slice(0, 3).map(toTile), cats.slice(3).map(toTile), []];
  })();

  const liveMapModes: Record<MapMode, { rows: MapTile[][]; label: string; sub: string }> = {
    leads:     { rows: liveLeadRows,    label: 'Lead Sources',      sub: 'leads in pipeline' },
    revenue:   { rows: liveClientRows,  label: 'Revenue by Client', sub: 'active MRR by account' },
    expenses:  { rows: liveExpenseRows, label: 'Expense Breakdown', sub: 'spend by category' },
    marketing: { rows: [MKTG_R1, MKTG_R2, MKTG_R3], label: 'Marketing ROI', sub: 'return on channel spend' },
  };

  const cb        = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
  const bd        = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const dim       = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.38)';
  const body      = isDark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.7)';
  const lbl       = isDark ? '#C8C8C8' : '#334155';
  const greenText = isDark ? '#00D4C8' : '#0E7490';

  const modeConfig = liveMapModes[mapMode];
  const modeTotal  = modeConfig.rows.flat().reduce((s, t) => s + t.value, 0) || 1;

  const pnlRows = [
    { label: 'Gross Revenue',   val: livePnl ? `$${livePnl.grossRevenue.toLocaleString()}` : '$0',    color: '#14B8AD' },
    { label: 'Operating Costs', val: livePnl ? `-$${livePnl.operatingCosts.toLocaleString()}` : '$0', color: '#E05252' },
    { label: 'Gross Margin',    val: livePnl ? `$${livePnl.grossMargin.toLocaleString()} (${livePnl.marginPct}%)` : '$0 (0%)', color: greenText },
  ];

  // Alerts derived only from real vitals — no hardcoded client/project names
  const alerts: { msg: string; color: string }[] = [];
  if (v) {
    if (v.overdueInvoices > 0) alerts.push({ msg: `${v.overdueInvoices} overdue invoice${v.overdueInvoices > 1 ? 's' : ''} — $${v.overdueAmount.toLocaleString()} at risk`, color: '#E05252' });
    if (v.expiringProposals > 0) alerts.push({ msg: `${v.expiringProposals} proposal${v.expiringProposals > 1 ? 's' : ''} expiring within 7 days`, color: '#D08E14' });
    if (v.hotLeads > 3) alerts.push({ msg: `${v.hotLeads} hot leads in active pipeline — follow up today`, color: '#3B7DD9' });
  }

  const emptyMsg = (msg: string) => (
    <div style={{ padding: '16px 0', fontSize: '0.78rem', color: dim, fontStyle: 'italic' }}>{msg}</div>
  );

  return (
    <>
      <style>{`
        @keyframes spin   { from { transform:rotate(0deg); }    to { transform:rotate(360deg); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .ptile:hover { opacity: 0.85; }
        .map-tab { background: none; border: 1px solid transparent; border-radius: 6px; padding: 4px 10px; font-size: 0.67rem; font-weight: 600; cursor: pointer; transition: all 0.15s; letter-spacing: 0.04em; }
        .map-tab:hover { border-color: rgba(255,255,255,0.12); }
        .map-tab.active { background: rgba(37,99,235,0.18); border-color: rgba(37,99,235,0.4); color: #60A5FA; }
      `}</style>

      {/* ── Master header ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: loading ? dim : greenText, boxShadow: loading ? 'none' : `0 0 10px ${greenText}`, animation: loading ? 'pulse 1.2s ease-in-out infinite' : 'none' }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.16em', color: lbl, textTransform: 'uppercase' }}>
              {loading ? 'Analyzing business...' : updatedAt ? `Live · ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'MAX AI'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.8rem', letterSpacing: '0.04em', color: 'var(--primary)', lineHeight: 1 }}>MAX</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', letterSpacing: '0.04em', color: 'var(--white)', lineHeight: 1 }}>CEO Intel</span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '0.83rem', color: dim, fontStyle: 'italic' }}>One client. You are it.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={toggle} title={isDark ? 'Light mode' : 'Dark mode'}>
            {isDark ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Analyzing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div style={{ padding: '10px 16px', marginBottom: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: '0.8rem', color: '#FCA5A5' }}>{error}</div>}

      {/* ── Alert Strip ─────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {alerts.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 7, background: `${a.color}11`, border: `1px solid ${a.color}33`, fontSize: '0.72rem', color: a.color, fontWeight: 500 }}>
              <AlertTriangle size={11} />
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* ── Proactive Recommendations ───────────────────────────────────────── */}
      {recs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Zap size={12} style={{ color: '#D08E14' }} />
            <span style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase' }}>Proactive Recommendations</span>
            <div style={{ flex: 1, height: 1, background: bd }} />
            <span style={{ fontSize: '0.58rem', color: dim }}>{recs.length} action{recs.length !== 1 ? 's' : ''} needed</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recs.map((rec) => {
              const priorityColor = rec.priority === 'urgent' ? '#E05252' : rec.priority === 'high' ? '#D08E14' : '#3B7DD9';
              const catLabel = { pipeline: 'Pipeline', finance: 'Finance', tasks: 'Tasks', inventory: 'Inventory', clients: 'Clients' }[rec.category];
              return (
                <div key={rec.id} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '12px 16px',
                  background: `${priorityColor}08`,
                  border: `1px solid ${priorityColor}28`,
                  borderLeft: `3px solid ${priorityColor}`,
                  borderRadius: 8,
                }}>
                  <div style={{ flexShrink: 0 }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 7px',
                      background: `${priorityColor}18`, borderRadius: 4,
                      fontSize: '0.58rem', fontWeight: 700, color: priorityColor,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>
                      {rec.priority}
                    </span>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 7px',
                      background: bd, borderRadius: 4,
                      fontSize: '0.58rem', fontWeight: 600, color: dim,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {catLabel}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>{rec.title}</div>
                    <div style={{ fontSize: '0.72rem', color: dim, lineHeight: 1.4 }}>{rec.detail}</div>
                  </div>
                  {rec.value !== undefined && (
                    <div style={{ flexShrink: 0, fontSize: '0.82rem', fontWeight: 700, color: priorityColor }}>
                      ${rec.value >= 1000 ? `${(rec.value / 1000).toFixed(1)}k` : rec.value.toLocaleString()}
                    </div>
                  )}
                  <Link href={rec.href} style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                    background: `${priorityColor}18`, border: `1px solid ${priorityColor}40`,
                    color: priorityColor, textDecoration: 'none', whiteSpace: 'nowrap',
                  }}>
                    {rec.action} <ArrowRight size={11} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Visual KPI Row ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 14px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase', marginBottom: 10 }}>Pipeline Velocity</div>
          <Gauge pct={loading ? 0 : pipelinePct} color="#2563EB" label="vs. $50k target" sub={loading ? '...' : `$${((v?.openPipelineValue ?? 0) / 1000).toFixed(0)}k open`} isDark={isDark} />
        </div>
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 14px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase' }}>MRR Trend</span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: greenText, lineHeight: 1, marginBottom: 8 }}>${(liveMrr / 1000).toFixed(1)}k</div>
          <Sparkline data={MRR_TREND} color={greenText} labels={MRR_LABELS} isDark={isDark} />
          <div style={{ fontSize: '0.62rem', color: dim, marginTop: 5 }}>Goal: ${(MRR_GOAL / 1000).toFixed(0)}k/mo</div>
        </div>
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 14px 12px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase', marginBottom: 10 }}>Client Health</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Ring pct={loading ? 0 : clientPct} color={greenText} center={loading ? '-' : String(v?.activeClients ?? 0)} sub="active" isDark={isDark} />
            <div>
              <div style={{ fontSize: '0.77rem', color: body, marginBottom: 4 }}><span style={{ fontWeight: 700, color: greenText }}>{loading ? '-' : v?.activeClients ?? 0}</span> active</div>
              <div style={{ fontSize: '0.77rem', color: body, marginBottom: 4 }}><span style={{ fontWeight: 700, color: '#D08E14' }}>{loading ? '-' : v?.hotLeads ?? 0}</span> hot leads</div>
              <div style={{ fontSize: '0.73rem', color: dim }}>Target: {CLIENT_TARGET}</div>
            </div>
          </div>
        </div>
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 14px 12px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase', marginBottom: 10 }}>Monthly Goal</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Ring pct={liveMrrPct} color="#2563EB" center={`${Math.round(liveMrrPct * 100)}%`} sub="of goal" isDark={isDark} />
            <div>
              <div style={{ fontSize: '0.77rem', color: body, marginBottom: 4 }}><span style={{ fontWeight: 700, color: '#3B7DD9' }}>${(liveMrr / 1000).toFixed(1)}k</span> MRR</div>
              <div style={{ fontSize: '0.73rem', color: dim, marginBottom: 4 }}>${((MRR_GOAL - liveMrr) / 1000).toFixed(1)}k to goal</div>
              <div style={{ fontSize: '0.73rem', color: dim }}>Goal: ${(MRR_GOAL / 1000).toFixed(0)}k</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Multi-Mode Portfolio Map ─────────────────────────────────────────── */}
      <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 18px 14px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase', marginBottom: 3 }}>Portfolio Map &mdash; {modeConfig.label}</div>
            <div style={{ fontSize: '0.73rem', color: dim }}>{modeTotal === 1 ? '—' : modeTotal} {modeConfig.sub} &middot; Green = growing &middot; Red = declining</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {(['leads', 'revenue', 'expenses', 'marketing'] as MapMode[]).map((m) => (
              <button key={m} className={`map-tab${mapMode === m ? ' active' : ''}`} onClick={() => setMapMode(m)} style={{ color: mapMode === m ? '#60A5FA' : dim }}>
                {{ leads: 'Lead Sources', revenue: 'Revenue', expenses: 'Expenses', marketing: 'Mktg ROI' }[m]}
              </button>
            ))}
            <div style={{ width: 1, height: 16, background: bd, margin: '0 4px' }} />
            {[['▲ Growing', 'rgba(16,185,129,0.7)'], ['- Flat', 'rgba(107,114,128,0.6)'], ['▼ Declining', 'rgba(239,68,68,0.7)']].map(([l, c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: c }} />
                <span style={{ fontSize: '0.6rem', color: dim }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        {modeConfig.rows.every(row => row.length === 0) ? (
          <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dim, fontSize: '0.83rem', fontStyle: 'italic' }}>
            No data — add {mapMode === 'revenue' ? 'clients' : mapMode === 'leads' ? 'leads' : 'records'} to populate this view.
          </div>
        ) : (
          modeConfig.rows.map((row, ri) =>
            row.length > 0 ? (
              <div key={ri} style={{ display: 'flex', gap: 3, height: [104, 82, 56][ri], marginBottom: ri < 2 ? 3 : 0 }}>
                {row.map((tile) => (
                  <PortfolioTile key={tile.name} {...tile} total={modeTotal} isDark={isDark} />
                ))}
              </div>
            ) : null
          )
        )}
      </div>

      {/* ── Health Score + Revenue Breakdown ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase' }}>Business Health Score</div>
            <span style={{ fontSize: '0.6rem', color: dim }}>Powered by Claude</span>
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0, textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1, color: gradeColor }}>{loading ? '...' : grade}</div>
              <div style={{ fontSize: '0.75rem', color: dim, marginTop: 4 }}>{loading ? '-' : `${healthOverall} / 100`}</div>
              {healthScore?.summary && (
                <div style={{ fontSize: '0.6rem', color: dim, marginTop: 6, maxWidth: 80, lineHeight: 1.4 }}>{healthScore.summary}</div>
              )}
              {!healthScore && !loading && (
                <div style={{ fontSize: '0.62rem', color: dim, marginTop: 6, maxWidth: 70, lineHeight: 1.4 }}>Click Refresh to score</div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              {loading ? (
                <div style={{ fontSize: '0.78rem', color: dim, fontStyle: 'italic' }}>Analyzing business health...</div>
              ) : healthDims.length > 0 ? healthDims.map(({ label, score, trend, detail }) => (
                <div key={label} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: '0.7rem', color: dim }}>{label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.6rem', color: dim }}>{detail}</span>
                      <span style={{ fontSize: '0.65rem', color: trend === 'up' ? '#14B8AD' : trend === 'down' ? '#E05252' : dim }}>
                        {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'}
                      </span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: healthColor(score) }}>{score}</span>
                    </div>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${score}%`, background: healthColor(score), borderRadius: 2, transition: 'width 0.8s ease', boxShadow: `0 0 6px ${healthColor(score)}55` }} />
                  </div>
                </div>
              )) : (
                <div style={{ fontSize: '0.78rem', color: dim, fontStyle: 'italic' }}>Click Refresh to compute health score from live data.</div>
              )}
            </div>
          </div>
        </div>
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase', marginBottom: 4 }}>Revenue by Package Tier</div>
          <div style={{ fontSize: '0.75rem', color: dim, marginBottom: 16 }}>
            ${(liveRevenueTotal / 1000).toFixed(1)}k active MRR &mdash; {stats?.activeClientCount ?? 0} paying clients
          </div>
          {liveRevenueTiers.length > 0 ? (
            <>
              <div style={{ height: 14, display: 'flex', gap: 2, borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
                {liveRevenueTiers.map(({ label, amount, color }) => (
                  <div key={label} title={`${label}: $${amount.toLocaleString()}`} style={{ flex: amount, background: color, transition: 'flex 0.8s ease' }} />
                ))}
              </div>
              {liveRevenueTiers.map(({ label, amount, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', color: body }}>{label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--white)' }}>${amount.toLocaleString()}</span>
                    <span style={{ fontSize: '0.65rem', color: dim }}>{liveRevenueTotal > 0 ? ((amount / liveRevenueTotal) * 100).toFixed(0) : 0}%</span>
                  </div>
                </div>
              ))}
            </>
          ) : emptyMsg('No active clients — revenue tiers will appear here once clients are added.')}
          <div style={{ borderTop: `1px solid ${bd}`, marginTop: 6, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: dim }}>Total Active MRR</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: greenText }}>${liveRevenueTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ── Cash Flow + AR Aging ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        {/* Cash Flow */}
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase', marginBottom: 14 }}>Cash Flow &mdash; This Month</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Inflow',  val: liveCfInflow,  color: '#14B8AD', icon: TrendingUp  },
              { label: 'Outflow', val: liveCfOutflow, color: '#E05252', icon: TrendingDown },
              { label: 'Net',     val: liveCfNet,     color: liveCfNet >= 0 ? greenText : '#E05252', icon: liveCfNet >= 0 ? TrendingUp : TrendingDown },
            ].map(({ label, val, color, icon: Icon }) => (
              <div key={label} style={{ flex: 1, padding: '12px', background: `${color}09`, border: `1px solid ${color}22`, borderRadius: 10, textAlign: 'center' }}>
                <Icon size={13} style={{ color, margin: '0 auto 4px', display: 'block' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color }}>${(Math.abs(val) / 1000).toFixed(1)}k</div>
                <div style={{ fontSize: '0.62rem', color: dim, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', color: lbl, textTransform: 'uppercase', marginBottom: 8 }}>Expense Breakdown</div>
          {liveExpenseCats.length > 0 ? liveExpenseCats.map(({ label, pct, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.72rem', color: dim, flex: 1 }}>{label}</span>
              <div style={{ flex: 2, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
            </div>
          )) : emptyMsg('No approved expenses this month.')}
          <div style={{ borderTop: `1px solid ${bd}`, marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', color: dim }}>Cash Runway (estimated)</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#14B8AD' }}>
              {liveCfOutflow > 0 && liveCfInflow > 0 ? `${(liveCfInflow / liveCfOutflow).toFixed(1)}x coverage` : '—'}
            </span>
          </div>
        </div>

        {/* AR Aging */}
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase', marginBottom: 4 }}>Accounts Receivable Aging</div>
          <div style={{ fontSize: '0.75rem', color: dim, marginBottom: 16 }}>
            {liveArAging.length > 0 ? `$${(liveArAging.reduce((s, a) => s + a.amount, 0) / 1000).toFixed(1)}k total outstanding` : 'No outstanding invoices'}
          </div>
          {liveArAging.length > 0 ? (
            <>
              <div style={{ height: 14, display: 'flex', gap: 2, borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
                {liveArAging.map(({ label, amount, color }) => (
                  <div key={label} title={`${label}: $${amount.toLocaleString()}`} style={{ flex: amount, background: color }} />
                ))}
              </div>
              {liveArAging.map(({ label, amount, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.76rem', color: body }}>{label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--white)' }}>${amount.toLocaleString()}</span>
                    <span style={{ fontSize: '0.65rem', color: dim }}>{((amount / liveArTotal) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div style={{ padding: '12px 0 8px', fontSize: '0.78rem', color: '#14B8AD', fontWeight: 600 }}>All invoices current — no outstanding AR</div>
          )}
          <div style={{ borderTop: `1px solid ${bd}`, marginTop: 6, paddingTop: 10 }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', color: lbl, textTransform: 'uppercase', marginBottom: 8 }}>P&amp;L Snapshot</div>
            {pnlRows.map(({ label, val, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.72rem', color: dim }}>{label}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sales Funnel + Marketing ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        {/* Sales Funnel */}
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase', marginBottom: 14 }}>Sales Funnel Analytics</div>
          {liveSalesFunnel.length > 0 ? liveSalesFunnel.map(({ stage, count, color }, i) => (
            <div key={stage} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: '0.71rem', color: dim }}>{stage}</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  {i > 0 && liveFunnelBase > 0 && (
                    <span style={{ fontSize: '0.67rem', color: '#6B7280' }}>{Math.round((count / liveFunnelBase) * 100)}% conv.</span>
                  )}
                  <span style={{ fontSize: '0.71rem', fontWeight: 700, color }}>{count}</span>
                </div>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${liveFunnelBase > 0 ? (count / liveFunnelBase) * 100 : 0}%`, background: color, borderRadius: 3, transition: 'width 0.8s ease', opacity: 1 - i * 0.1 }} />
              </div>
            </div>
          )) : emptyMsg('No leads in pipeline yet.')}
          <div style={{ borderTop: `1px solid ${bd}`, marginTop: 12, paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {SALES_METRICS.map(({ label, value, trend, good }) => (
              <div key={label} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: `1px solid ${bd}` }}>
                <div style={{ fontSize: '0.62rem', color: lbl, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--white)' }}>{value}</div>
                <div style={{ fontSize: '0.62rem', color: good ? '#14B8AD' : '#E05252', marginTop: 2 }}>{good ? '▲' : '▼'} {trend}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Marketing / Email Performance */}
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase', marginBottom: 14 }}>Marketing &amp; Email Performance</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {EMAIL_METRICS.map(({ label, value, bench, good }) => (
              <div key={label} style={{ padding: '10px 12px', background: good ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${good ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}`, borderRadius: 8 }}>
                <div style={{ fontSize: '0.62rem', color: lbl, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: good ? '#14B8AD' : '#E05252' }}>{value}</div>
                <div style={{ fontSize: '0.6rem', color: dim, marginTop: 2 }}>bench: {bench}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', color: lbl, textTransform: 'uppercase', marginBottom: 8 }}>Recent Broadcasts</div>
          {broadcasts.length === 0 ? (
            <div style={{ fontSize: '0.73rem', color: dim, padding: '8px 0' }}>No broadcasts sent yet.</div>
          ) : broadcasts.map((bc) => (
            <div key={bc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${bd}` }}>
              <div>
                <div style={{ fontSize: '0.73rem', fontWeight: 600, color: body }}>{bc.subject}</div>
                <div style={{ fontSize: '0.62rem', color: dim }}>{bc.recipientCount.toLocaleString()} recipients{bc.sentAt ? ` · ${new Date(bc.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.6rem', color: bc.status === 'sent' ? '#14B8AD' : '#3B7DD9', textTransform: 'capitalize' }}>{bc.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Operations + Customer Success ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        {/* Operations & Delivery */}
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase', marginBottom: 14 }}>Operations &amp; Project Delivery</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
            {OPS_METRICS.map(({ label, value, good }) => {
              const displayVal = label === 'Open Tickets' && v ? String(v.openTickets) : value;
              const isGood = label === 'Open Tickets' && v ? v.openTickets === 0 : good;
              return (
                <div key={label} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${bd}`, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: isGood ? '#14B8AD' : '#E05252' }}>{loading ? '—' : displayVal}</div>
                  <div style={{ fontSize: '0.6rem', color: dim, marginTop: 3, lineHeight: 1.3 }}>{label}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', color: lbl, textTransform: 'uppercase', marginBottom: 8 }}>Active Projects</div>
          {liveProjects.length > 0 ? liveProjects.map(({ name, status, pct, color }) => (
            <div key={name} style={{ marginBottom: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: '0.71rem', color: body }}>{name}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.62rem', color }}>{status}</span>
                  <span style={{ fontSize: '0.71rem', fontWeight: 700, color }}>{pct}%</span>
                </div>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          )) : emptyMsg('No active projects in progress.')}
        </div>

        {/* Customer Success */}
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase', marginBottom: 14 }}>Customer Success &amp; Retention</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
            {CS_METRICS.map(({ label, value, good }) => (
              <div key={label} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${bd}`, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: good ? '#14B8AD' : '#E05252' }}>{value}</div>
                <div style={{ fontSize: '0.6rem', color: dim, marginTop: 3, lineHeight: 1.3 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', color: lbl, textTransform: 'uppercase', marginBottom: 8 }}>Account Pulse</div>
          {liveTopClients.length > 0 ? liveTopClients.map(({ name, arr, risk }) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${bd}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: risk === 'low' ? '#14B8AD' : risk === 'med' ? '#D08E14' : '#E05252', flexShrink: 0 }} />
                <span style={{ fontSize: '0.73rem', color: body }}>{name}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: '0.67rem', color: risk === 'low' ? '#14B8AD' : risk === 'med' ? '#D08E14' : '#E05252', fontWeight: 700 }}>
                  {risk === 'low' ? 'Low Risk' : risk === 'med' ? 'Med Risk' : 'High Risk'}
                </span>
                <span style={{ fontSize: '0.67rem', color: greenText, fontWeight: 700 }}>{arr}/mo</span>
              </div>
            </div>
          )) : emptyMsg('No active clients yet.')}
        </div>
      </div>

      {/* ── Intelligence + Vitals ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Sparkles size={12} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase' }}>Today&apos;s CEO Intel</span>
            <div style={{ flex: 1, height: 1, background: bd }} />
            <span style={{ fontSize: '0.58rem', color: lbl }}>MAX AI Engine</span>
          </div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: dim, fontSize: '0.83rem', padding: '16px 0', marginBottom: 20 }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating your briefing...
            </div>
          ) : briefing?.briefing ? (
            <div style={{ fontSize: '0.87rem', color: body, lineHeight: 1.9, whiteSpace: 'pre-wrap', marginBottom: 24, animation: 'fadeUp 0.4s ease' }}>{briefing.briefing.replace(/\*\*/g, '')}</div>
          ) : (
            <div style={{ fontSize: '0.83rem', color: dim, fontStyle: 'italic', marginBottom: 24 }}>Click Refresh to generate your briefing from live data.</div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Zap size={12} style={{ color: '#D08E14' }} />
            <span style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase' }}>Recommended Actions Today</span>
            <div style={{ flex: 1, height: 1, background: bd }} />
          </div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: dim, fontSize: '0.83rem', marginBottom: 20 }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing pipeline...
            </div>
          ) : actionItems.length > 0 ? (
            <div style={{ marginBottom: 24, animation: 'fadeUp 0.4s ease 0.1s both' }}>
              {actionItems.map((action, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--primary)', minWidth: 22, paddingTop: 2, fontStyle: 'italic', flexShrink: 0 }}>
                    {['i.', 'ii.', 'iii.'][i]}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: body, lineHeight: 1.65 }}>{action}</div>
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase' }}>Pipeline Stage Breakdown</span>
            <span style={{ fontSize: '0.68rem', color: dim }}>
              {livePipelineStages.reduce((s, p) => s + p.count, 0)} deals &middot; ${(livePipelineStages.reduce((s, p) => s + (p.value ?? 0), 0) / 1000).toFixed(1)}k total
            </span>
          </div>
          {livePipelineStages.length > 0
            ? livePipelineStages.map((s) => <StageBar key={s.label} label={s.label} count={s.count} max={livePipelineMax} color={s.color} value={s.value} maxVal={livePipelineValMax} isDark={isDark} />)
            : emptyMsg('No active pipeline deals.')}
        </div>

        <div>
          <div style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase', marginBottom: 12 }}>Live Business Vitals</div>
          {[
            { label: 'Pipeline Value',     value: v ? `$${(v.openPipelineValue / 1000).toFixed(0)}k` : '-', alert: false },
            { label: 'Active Clients',     value: v ? String(v.activeClients) : '-',    alert: false },
            { label: 'Hot Leads',          value: v ? String(v.hotLeads) : '-',          alert: false },
            { label: 'Open Leads',         value: v ? String(v.openLeads) : '-',         alert: false },
            { label: 'Overdue Invoices',   value: v ? String(v.overdueInvoices) : '-',   alert: (v?.overdueInvoices ?? 0) > 0 },
            { label: 'Overdue Amount',     value: v && v.overdueAmount > 0 ? `$${v.overdueAmount.toLocaleString()}` : '$0', alert: (v?.overdueAmount ?? 0) > 0 },
            { label: 'Expiring Proposals', value: v ? String(v.expiringProposals) : '-', alert: (v?.expiringProposals ?? 0) > 0 },
          ].map(({ label, value, alert }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${bd}` }}>
              <span style={{ fontSize: '0.75rem', color: dim }}>{label}</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: loading ? lbl : alert ? '#E05252' : 'var(--white)' }}>{loading ? '-' : value}</span>
            </div>
          ))}
          <div style={{ marginTop: 20, padding: '14px', background: cb, border: `1px solid ${bd}`, borderRadius: 10 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: lbl, textTransform: 'uppercase', marginBottom: 10 }}>In practice, replaces</div>
            {['Sales Director', 'Revenue Analyst', 'Operations Manager', 'Client Success Lead', 'Financial Controller', 'Marketing Manager'].map((r) => (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.74rem', color: dim }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Five Quiet Problems ────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${bd}`, paddingTop: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase' }}>The Five Quiet Problems &mdash; Solved before you ask</span>
          <div style={{ flex: 1, height: 1, background: bd }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[
            { num: 'i.',   title: 'Revenue vs. Goals',   body: 'Every recommendation sized against your actual target, not a benchmark someone else set.',  metric: v ? `$${(v.openPipelineValue / 1000).toFixed(0)}k pipeline` : null, color: '#3B7DD9', alert: false },
            { num: 'ii.',  title: 'Pipeline Health',      body: 'Hot leads surface before they go cold. Stalled deals flagged before they die.',              metric: v ? `${v.hotLeads} hot lead${v.hotLeads !== 1 ? 's' : ''}` : null, color: '#D08E14', alert: false },
            { num: 'iii.', title: 'Cash Flow Risk',       body: 'Overdue invoices tracked in real time flagged the day the math turns against you.',          metric: v ? (v.overdueAmount > 0 ? `$${v.overdueAmount.toLocaleString()} at risk` : 'No overdue') : null, color: '#E05252', safeColor: greenText, alert: (v?.overdueAmount ?? 0) > 0 },
            { num: 'iv.',  title: 'Client Relationships', body: 'Active account status, NPS, and at-risk clients tracked continuously across your book.',     metric: v ? `${v.activeClients} active` : null, color: greenText, alert: false },
            { num: 'v.',   title: 'Proposal Velocity',    body: 'Expiring proposals flagged. Follow-up timing optimized. Every deal has a clear next move.',   metric: v ? `${v.expiringProposals} expiring` : null, color: '#D08E14', safeColor: lbl, alert: (v?.expiringProposals ?? 0) > 0 },
          ].map(({ num, title, body: bodyText, metric, color, alert, safeColor }) => (
            <div key={num} style={{ padding: '16px 14px', borderRadius: 10, background: cb, border: `1px solid ${bd}` }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)', marginBottom: 7, fontStyle: 'italic' }}>{num}</div>
              <div style={{ fontSize: '0.79rem', fontWeight: 700, color: 'var(--white)', marginBottom: 7, lineHeight: 1.3 }}>{title}</div>
              <div style={{ fontSize: '0.71rem', color: dim, lineHeight: 1.55, marginBottom: 10 }}>{bodyText}</div>
              {metric && <div style={{ fontSize: '0.71rem', fontWeight: 700, color: loading ? lbl : alert ? color : (safeColor ?? color) }}>{loading ? '...' : metric}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Pattern Detection ─────────────────────────────────────────────── */}
      {patterns.length > 0 && (
        <div style={{ borderTop: `1px solid ${bd}`, paddingTop: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Sparkles size={12} style={{ color: '#818cf8' }} />
            <span style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase' }}>Cross-Module Patterns</span>
            <div style={{ flex: 1, height: 1, background: bd }} />
            <span style={{ fontSize: '0.58rem', color: dim }}>Powered by Claude Sonnet</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {patterns.map((p) => {
              const signalColor = p.signal === 'positive' ? '#14B8AD' : p.signal === 'negative' ? '#E05252' : '#3B7DD9';
              const catLabel = { revenue: 'Revenue', pipeline: 'Pipeline', clients: 'Clients', proposals: 'Proposals', operations: 'Ops' }[p.category];
              return (
                <div key={p.id} style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: `${signalColor}08`, border: `1px solid ${signalColor}22`,
                  borderTop: `2px solid ${signalColor}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 7px',
                      background: `${signalColor}18`, borderRadius: 4,
                      fontSize: '0.58rem', fontWeight: 600, color: signalColor,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>{catLabel}</span>
                    {p.metric && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: signalColor }}>{p.metric}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--white)', lineHeight: 1.35, marginBottom: 6 }}>{p.insight}</div>
                  <div style={{ fontSize: '0.71rem', color: dim, lineHeight: 1.5 }}>{p.detail}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── AI Platform Capabilities ───────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${bd}`, paddingTop: 22 }}>
        <div style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', color: lbl, textTransform: 'uppercase', marginBottom: 16 }}>MAX AI Platform &mdash; Capabilities</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
          {[
            {
              tier: 'Live — MAX AI Core', color: greenText, badge: 'badge-green', model: 'Core Engine',
              items: [
                { name: 'Daily Business Briefing',   desc: 'Priority memo generated from your live database every session' },
                { name: 'Pipeline Next-Best-Action', desc: 'Top 3 leads ranked by revenue impact and deal urgency' },
                { name: 'Helpdesk Draft Reply',      desc: 'AI-written client responses in under two seconds' },
              ],
            },
            {
              tier: 'Smart Demo', color: '#3B7DD9', badge: 'badge-blue', model: 'Adaptive Engine',
              items: [
                { name: 'Inventory Demand Forecast', desc: 'Predicted reorder needs by SKU, category, and lead time' },
                { name: 'Booking No-Show Risk',      desc: 'Appointment cancellation probability per booking' },
                { name: 'Cash Flow Forecast',        desc: '30 / 60 / 90 day projection with scenario modeling' },
              ],
            },
            {
              tier: 'Coming — MAX Pro', color: '#6B7280', badge: 'badge-gray', model: 'Pro Engine',
              items: [
                { name: 'Revenue Anomaly Detection', desc: 'Flags unusual dips or spikes before you notice them' },
                { name: 'Client Churn Predictor',    desc: 'At-risk account scoring before accounts go quiet' },
                { name: 'Competitive Intelligence',  desc: 'Market positioning analysis per prospect vertical' },
              ],
            },
          ].map(({ tier, color, badge, model, items }) => (
            <div key={tier} style={{ padding: '16px 18px', borderRadius: 10, background: cb, border: `1px solid ${bd}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.73rem', fontWeight: 700, color }}>{tier}</span>
                <span className={`badge ${badge}`} style={{ fontSize: '0.58rem' }}>{model}</span>
              </div>
              <div style={{ height: 1, background: bd, marginBottom: 12 }} />
              {items.map(({ name, desc }) => (
                <div key={name} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--white)', marginBottom: 2 }}>{name}</div>
                  <div style={{ fontSize: '0.69rem', color: dim, lineHeight: 1.45 }}>{desc}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 18px', background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.14)', borderRadius: 8, display: 'flex', gap: 26, flexWrap: 'wrap' }}>
          {[
            { label: 'Proprietary AI Engine',           sub: 'Your data never leaves our platform' },
            { label: 'HIPAA / Legal Safe',               sub: 'Approved for healthcare and law firm clients' },
            { label: 'AI Cost Included',                 sub: 'Intelligence bundled into platform pricing' },
            { label: 'Right Intelligence, Right Moment', sub: 'Fast for speed · Deep for reasoning · Premium for analysis' },
          ].map(({ label, sub }) => (
            <div key={label}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: '0.67rem', color: dim }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
