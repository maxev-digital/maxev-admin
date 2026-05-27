import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { claudeComplete, MODELS } from '@/lib/claude';

export type Pattern = {
  id: string;
  category: 'revenue' | 'pipeline' | 'clients' | 'proposals' | 'operations';
  insight: string;
  detail: string;
  signal: 'positive' | 'negative' | 'neutral';
  metric?: string;
};

export async function GET() {
  const now       = new Date();
  const ninety    = new Date(now.getTime() - 90 * 86400000);
  const thirty    = new Date(now.getTime() - 30 * 86400000);

  // Gather cross-module data in parallel
  const [
    industryRevenue,
    tierConversion,
    invoicePaySpeed,
    churnedClients,
    activeClients,
    pipelineByStage,
    proposalClose,
  ] = await Promise.all([
    // Revenue by industry — which industries generate most value
    prisma.$queryRaw<Array<{ industry: string; clientCount: bigint; totalMrr: number }>>`
      SELECT industry, COUNT(*) AS "clientCount", SUM(mrr) AS "totalMrr"
      FROM clients
      WHERE status = 'ACTIVE'
      GROUP BY industry
      ORDER BY "totalMrr" DESC
      LIMIT 5
    `.catch(() => []),

    // Package tier distribution for active clients
    prisma.$queryRaw<Array<{ tier: string; count: bigint; avgMrr: number }>>`
      SELECT "packageTier" AS tier, COUNT(*) AS count, AVG(mrr) AS "avgMrr"
      FROM clients
      WHERE status = 'ACTIVE'
      GROUP BY "packageTier"
      ORDER BY count DESC
    `.catch(() => []),

    // Invoice pay speed — avg days from creation to paid
    prisma.$queryRaw<Array<{ avgDays: number; count: bigint }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("paidAt" - "createdAt")) / 86400) AS "avgDays",
             COUNT(*) AS count
      FROM invoices
      WHERE status = 'PAID' AND "paidAt" IS NOT NULL AND "createdAt" >= ${thirty}
    `.catch(() => []),

    // Churned clients in last 90 days and their package tier
    prisma.client.findMany({
      where: { status: { in: ['CHURNED', 'PAUSED'] }, updatedAt: { gte: ninety } },
      select: { packageTier: true, mrr: true, industry: true },
    }).catch(() => []),

    // Active client count and avg MRR
    prisma.client.aggregate({
      where: { status: 'ACTIVE' },
      _count: { id: true },
      _avg:   { mrr: true },
      _max:   { mrr: true },
    }).catch(() => null),

    // Pipeline leads by stage
    prisma.$queryRaw<Array<{ stage: string; count: bigint; avgValue: number }>>`
      SELECT stage, COUNT(*) AS count, AVG("estimatedValue") AS "avgValue"
      FROM leads
      WHERE stage NOT IN ('DEAD')
      GROUP BY stage
      ORDER BY count DESC
    `.catch(() => []),

    // Proposal close rate last 90 days
    prisma.$queryRaw<Array<{ status: string; count: bigint; totalValue: number }>>`
      SELECT status, COUNT(*) AS count,
             SUM("oneTimeTotal" + "monthlyTotal" * 12) AS "totalValue"
      FROM proposals
      WHERE "createdAt" >= ${ninety}
      GROUP BY status
    `.catch(() => []),
  ]);

  // Build structured summary for Claude
  const summary: string[] = [];

  if (industryRevenue.length > 0) {
    summary.push(`Top revenue industries: ${(industryRevenue as Array<{ industry: string; clientCount: bigint; totalMrr: number }>).map((r) => `${r.industry} ($${Math.round(r.totalMrr)}/mo, ${Number(r.clientCount)} clients)`).join(', ')}`);
  }

  if (tierConversion.length > 0) {
    summary.push(`Client tiers: ${(tierConversion as Array<{ tier: string; count: bigint; avgMrr: number }>).map((t) => `${t.tier}: ${Number(t.count)} clients, avg $${Math.round(t.avgMrr || 0)}/mo`).join(' | ')}`);
  }

  if ((invoicePaySpeed as Array<{ avgDays: number; count: bigint }>)[0]?.avgDays) {
    const avg = Math.round((invoicePaySpeed as Array<{ avgDays: number; count: bigint }>)[0].avgDays);
    summary.push(`Invoice payment speed: avg ${avg} days to pay (last 30 days, ${Number((invoicePaySpeed as Array<{ avgDays: number; count: bigint }>)[0].count)} paid invoices)`);
  }

  if (churnedClients.length > 0) {
    const churnTiers = churnedClients.map((c) => c.packageTier).join(', ');
    const churnMrr   = churnedClients.reduce((s, c) => s + c.mrr, 0);
    summary.push(`${churnedClients.length} client(s) churned/paused last 90 days — lost $${Math.round(churnMrr)}/mo — tiers: ${churnTiers}`);
  }

  if (activeClients) {
    summary.push(`Active clients: ${activeClients._count.id} total, avg MRR $${Math.round(activeClients._avg.mrr ?? 0)}, top client $${Math.round(activeClients._max.mrr ?? 0)}/mo`);
  }

  if (pipelineByStage.length > 0) {
    summary.push(`Pipeline: ${(pipelineByStage as Array<{ stage: string; count: bigint; avgValue: number }>).map((s) => `${s.stage} (${Number(s.count)} leads, avg $${Math.round(s.avgValue || 0)})`).join(', ')}`);
  }

  if (proposalClose.length > 0) {
    const sent   = (proposalClose as Array<{ status: string; count: bigint; totalValue: number }>).find((p) => p.status === 'SENT' || p.status === 'VIEWED');
    const signed = (proposalClose as Array<{ status: string; count: bigint; totalValue: number }>).find((p) => p.status === 'SIGNED');
    const total  = (proposalClose as Array<{ status: string; count: bigint; totalValue: number }>).reduce((s, p) => s + Number(p.count), 0);
    const closeRate = total > 0 && signed ? Math.round((Number(signed.count) / total) * 100) : 0;
    summary.push(`Proposals (last 90 days): ${total} total, ${closeRate}% close rate${signed ? `, $${Math.round((signed.totalValue || 0) / 1000)}k signed value` : ''}`);
  }

  if (!summary.length) {
    return NextResponse.json({ patterns: [], generatedAt: now.toISOString() });
  }

  const prompt = `You are a business intelligence analyst. Analyze this data from a digital marketing agency and identify 3-5 meaningful patterns or insights. Each pattern should be actionable.

Business Data:
${summary.join('\n')}

Return ONLY a JSON array of patterns:
[{
  "id": "unique-slug",
  "category": "revenue|pipeline|clients|proposals|operations",
  "insight": "<one sharp sentence — the pattern itself>",
  "detail": "<one sentence — why it matters or what to do>",
  "signal": "positive|negative|neutral",
  "metric": "<optional key number, e.g. '68% close rate' or '$2.4k avg MRR'>"
}]

Focus on: what's working, what's at risk, what's surprising, what should change.`;

  let patterns: Pattern[] = [];
  try {
    const raw = await claudeComplete(prompt, {
      model:     MODELS.sonnet,
      maxTokens: 600,
      system:    'You are a business analyst. Return only valid JSON.',
    });
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) patterns = JSON.parse(match[0]);
  } catch {
    // If Claude fails, return a static fallback from the data
    if (activeClients && activeClients._count.id > 0) {
      patterns.push({
        id:       'active-mrr',
        category: 'revenue',
        insight:  `${activeClients._count.id} active clients generating avg $${Math.round(activeClients._avg.mrr ?? 0)}/mo each`,
        detail:   'Focus on upselling existing clients to higher tiers to grow MRR without new acquisition cost.',
        signal:   'positive',
        metric:   `$${Math.round(activeClients._avg.mrr ?? 0)}/mo avg`,
      });
    }
    if (churnedClients.length > 0) {
      patterns.push({
        id:       'churn-risk',
        category: 'clients',
        insight:  `${churnedClients.length} client${churnedClients.length > 1 ? 's' : ''} churned or paused in the last 90 days`,
        detail:   'Review exit reasons and implement a check-in cadence to catch at-risk accounts earlier.',
        signal:   'negative',
      });
    }
  }

  return NextResponse.json({ patterns, generatedAt: now.toISOString() });
}
