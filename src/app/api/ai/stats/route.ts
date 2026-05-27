import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const STAGE_META: Record<string, { label: string; color: string; order: number }> = {
  LEAD:            { label: 'Lead',            color: '#6B7280', order: 0 },
  DEMO_SCHEDULED:  { label: 'Demo',            color: '#3B7DD9', order: 1 },
  PROPOSAL_SENT:   { label: 'Proposal',        color: '#D08E14', order: 2 },
  CONTRACT_SIGNED: { label: 'Contract',        color: '#00D4C8', order: 3 },
  IN_DEV:          { label: 'In Dev',          color: '#8E6AE8', order: 4 },
  REVIEW:          { label: 'Review',          color: '#F97316', order: 5 },
};

const TIER_META: Record<string, { color: string }> = {
  ENTERPRISE: { color: '#8E6AE8' },
  PRO:        { color: '#3B7DD9' },
  GROWTH:     { color: '#00D4C8' },
  STARTER:    { color: '#6B7280' },
  CUSTOM:     { color: '#D08E14' },
};

export async function GET() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [leads, clients, invoices, expenses, projects] = await Promise.all([
    prisma.lead.findMany({
      where: { stage: { notIn: ['LIVE', 'ON_RETAINER', 'DEAD'] } },
      select: { stage: true, estimatedValue: true, source: true },
    }),
    prisma.client.findMany({
      where: { status: 'ACTIVE' },
      select: { businessName: true, packageTier: true, mrr: true },
      orderBy: { mrr: 'desc' },
    }),
    prisma.invoice.findMany({
      select: { amount: true, status: true, dueDate: true, paidAt: true },
    }),
    prisma.expense.findMany({
      where: { status: 'APPROVED' },
      select: { amount: true, category: true, expenseDate: true },
    }),
    prisma.project.findMany({
      where: { status: { in: ['IN_PROGRESS', 'REVIEW'] } },
      select: { name: true, status: true, startDate: true, launchDate: true, client: { select: { businessName: true } } },
      take: 6,
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  // ── Pipeline stages ──────────────────────────────────────────────────────
  const stageMap: Record<string, { count: number; value: number }> = {};
  for (const l of leads) {
    if (!STAGE_META[l.stage]) continue;
    if (!stageMap[l.stage]) stageMap[l.stage] = { count: 0, value: 0 };
    stageMap[l.stage].count++;
    stageMap[l.stage].value += l.estimatedValue ?? 0;
  }
  const pipelineStages = Object.entries(stageMap)
    .map(([stage, d]) => ({ ...STAGE_META[stage], count: d.count, value: d.value }))
    .sort((a, b) => a.order - b.order);

  // ── Revenue tiers ────────────────────────────────────────────────────────
  const tierMap: Record<string, number> = {};
  for (const c of clients) {
    tierMap[c.packageTier] = (tierMap[c.packageTier] ?? 0) + c.mrr;
  }
  const tierOrder = ['ENTERPRISE', 'PRO', 'GROWTH', 'STARTER', 'CUSTOM'];
  const revenueTiers = tierOrder
    .filter((t) => tierMap[t] > 0)
    .map((t) => ({ label: t.charAt(0) + t.slice(1).toLowerCase(), amount: tierMap[t], color: TIER_META[t].color }));

  const mrrTotal = clients.reduce((s, c) => s + c.mrr, 0);

  // ── Cash flow (current month) ─────────────────────────────────────────────
  const cashInflow = invoices
    .filter((i) => i.status === 'PAID' && i.paidAt && new Date(i.paidAt) >= monthStart)
    .reduce((s, i) => s + i.amount, 0);
  const cashOutflow = expenses
    .filter((e) => e.expenseDate && new Date(e.expenseDate) >= monthStart)
    .reduce((s, e) => s + e.amount, 0);

  // ── Expense categories ────────────────────────────────────────────────────
  const expCatMap: Record<string, number> = {};
  for (const e of expenses) {
    expCatMap[e.category] = (expCatMap[e.category] ?? 0) + e.amount;
  }
  const expTotal = Object.values(expCatMap).reduce((s, v) => s + v, 0) || 1;
  const CAT_COLORS: Record<string, string> = {
    Software: '#3B7DD9', Advertising: '#00D4C8', Contractor: '#8E6AE8',
    Office: '#D08E14', Hosting: '#3B7DD9', Communications: '#14B8AD',
  };
  const expenseCategories = Object.entries(expCatMap)
    .map(([label, amt]) => ({ label, pct: Math.round((amt / expTotal) * 100), color: CAT_COLORS[label] ?? '#6B7280' }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  // ── AR aging ─────────────────────────────────────────────────────────────
  const arBuckets = [
    { label: 'Current (0-30d)',  min: 0,  max: 30,  amount: 0, color: '#14B8AD' },
    { label: '31-60 days',       min: 31, max: 60,  amount: 0, color: '#D08E14' },
    { label: '61-90 days',       min: 61, max: 90,  amount: 0, color: '#F97316' },
    { label: '90+ days',         min: 91, max: 9999, amount: 0, color: '#E05252' },
  ];
  const outstanding = invoices.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE');
  for (const inv of outstanding) {
    const days = inv.dueDate ? Math.max(0, Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000)) : 0;
    for (const b of arBuckets) {
      if (days >= b.min && days <= b.max) { b.amount += inv.amount; break; }
    }
  }
  const arAging = arBuckets.filter((b) => b.amount > 0);

  // ── P&L snapshot ─────────────────────────────────────────────────────────
  const grossRevenue = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
  const operatingCosts = expenses.reduce((s, e) => s + e.amount, 0);
  const grossMargin = grossRevenue - operatingCosts;
  const marginPct = grossRevenue > 0 ? Math.round((grossMargin / grossRevenue) * 100) : 0;

  // ── Sales funnel ─────────────────────────────────────────────────────────
  const allLeads = await prisma.lead.findMany({ select: { stage: true } });
  const FUNNEL_STAGES = [
    { stage: 'Total Leads',       key: null,              color: '#6B7280' },
    { stage: 'Demo Scheduled',    key: 'DEMO_SCHEDULED',  color: '#3B7DD9' },
    { stage: 'Proposal Sent',     key: 'PROPOSAL_SENT',   color: '#8E6AE8' },
    { stage: 'Contract Signed',   key: 'CONTRACT_SIGNED', color: '#D08E14' },
    { stage: 'Live / Retainer',   key: 'LIVE',            color: '#14B8AD' },
  ];
  const stageCounts: Record<string, number> = {};
  for (const l of allLeads) stageCounts[l.stage] = (stageCounts[l.stage] ?? 0) + 1;
  const salesFunnel = FUNNEL_STAGES.map(({ stage, key, color }) => ({
    stage,
    count: key ? (stageCounts[key] ?? 0) : allLeads.length,
    color,
  }));

  // ── Lead sources ─────────────────────────────────────────────────────────
  const srcMap: Record<string, number> = {};
  for (const l of leads) {
    if (l.source) srcMap[l.source] = (srcMap[l.source] ?? 0) + 1;
  }
  const leadSources = Object.entries(srcMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ── Active projects ───────────────────────────────────────────────────────
  const activeProjects = projects.map((p) => {
    const start = p.startDate ? new Date(p.startDate).getTime() : Date.now() - 30 * 86400000;
    const end   = p.launchDate ? new Date(p.launchDate).getTime() : Date.now() + 30 * 86400000;
    const pct   = Math.min(99, Math.max(5, Math.round(((Date.now() - start) / (end - start)) * 100)));
    const isReview = p.status === 'REVIEW';
    return {
      name:   `${(p as any).client?.businessName ?? 'Unknown'} — ${p.name}`,
      status: isReview ? 'In Review' : 'On Track',
      pct,
      color:  isReview ? '#D08E14' : '#14B8AD',
    };
  });

  // ── Top clients ───────────────────────────────────────────────────────────
  const topClients = clients.slice(0, 5).map((c) => ({
    name: c.businessName,
    mrr:  c.mrr,
    arr:  `$${c.mrr.toLocaleString()}`,
    risk: c.mrr >= 3000 ? 'low' : c.mrr >= 1500 ? 'med' : 'high',
  }));

  return NextResponse.json({
    pipelineStages,
    revenueTiers,
    mrrTotal,
    activeClientCount: clients.length,
    cashInflow,
    cashOutflow,
    expenseCategories,
    arAging,
    pnl: { grossRevenue, operatingCosts, grossMargin, marginPct },
    salesFunnel,
    leadSources,
    activeProjects,
    topClients,
  });
}
