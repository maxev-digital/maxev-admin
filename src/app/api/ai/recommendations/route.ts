import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export type Recommendation = {
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

export async function GET() {
  const now      = new Date();
  const sevenAgo = new Date(now.getTime() - 7  * 86400000);
  const sevenFwd = new Date(now.getTime() + 7  * 86400000);
  const fourteenAgo = new Date(now.getTime() - 14 * 86400000);

  const [
    overdueInvoices,
    staleLeads,
    expiringProposals,
    lowStock,
    overdueTasks,
    stalePipeline,
  ] = await Promise.all([
    // Overdue invoices
    prisma.invoice.findMany({
      where: { status: 'OVERDUE' },
      select: { id: true, amount: true, dueDate: true, client: { select: { businessName: true } } },
      orderBy: { amount: 'desc' },
      take: 10,
    }),

    // Leads with no update in 7+ days, not closed
    prisma.lead.findMany({
      where: {
        stage: { not: 'DEAD' },
        updatedAt: { lt: sevenAgo },
      },
      select: { id: true, businessName: true, stage: true, estimatedValue: true, updatedAt: true },
      orderBy: { estimatedValue: 'desc' },
      take: 10,
    }),

    // Proposals expiring within 7 days
    prisma.proposal.findMany({
      where: {
        status: { in: ['SENT', 'VIEWED'] },
        expiresAt: { gte: now, lte: sevenFwd },
      },
      select: { id: true, businessName: true, oneTimeTotal: true, monthlyTotal: true, expiresAt: true },
      orderBy: { oneTimeTotal: 'desc' },
      take: 10,
    }).catch(() => []),

    // Low stock products
    prisma.$queryRaw<Array<{ id: string; name: string; inStock: number; minStock: number }>>`
      SELECT id, name, "inStock", "minStock"
      FROM products
      WHERE "inStock" <= "minStock"
      ORDER BY ("inStock"::float / NULLIF("minStock", 0)) ASC
      LIMIT 5
    `.catch(() => [] as Array<{ id: string; name: string; inStock: number; minStock: number }>),

    // Overdue tasks
    prisma.task.findMany({
      where: {
        status: { notIn: ['DONE'] },
        dueDate: { lt: now },
      },
      select: { id: true, title: true, priority: true, dueDate: true },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 10,
    }),

    // Pipeline leads untouched for 14+ days (hot but stale)
    prisma.lead.findMany({
      where: {
        stage: { in: ['PROPOSAL_SENT', 'DEMO_SCHEDULED'] },
        priority: 'HOT',
        updatedAt: { lt: fourteenAgo },
      },
      select: { id: true, businessName: true, estimatedValue: true, stage: true },
      orderBy: { estimatedValue: 'desc' },
      take: 5,
    }),
  ]);

  const recs: Recommendation[] = [];

  // 1. Overdue invoices — URGENT if > $1k or count > 2
  if (overdueInvoices.length > 0) {
    const totalOverdue = overdueInvoices.reduce((s, i) => s + i.amount, 0);
    const oldest = overdueInvoices[0];
    const daysLate = oldest.dueDate
      ? Math.floor((now.getTime() - new Date(oldest.dueDate).getTime()) / 86400000)
      : 0;
    recs.push({
      id:       'overdue-invoices',
      priority: overdueInvoices.length > 2 || totalOverdue > 1000 ? 'urgent' : 'high',
      category: 'finance',
      title:    `${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? 's' : ''} — $${totalOverdue.toLocaleString()} uncollected`,
      detail:   `${oldest.client.businessName} is ${daysLate} day${daysLate !== 1 ? 's' : ''} past due. Draft AI reminders or mark collected.`,
      action:   'Go to Invoices',
      href:     '/invoices',
      count:    overdueInvoices.length,
      value:    totalOverdue,
    });
  }

  // 2. Stale hot pipeline — URGENT
  if (stalePipeline.length > 0) {
    const totalVal = stalePipeline.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
    recs.push({
      id:       'stale-pipeline',
      priority: 'urgent',
      category: 'pipeline',
      title:    `${stalePipeline.length} HOT lead${stalePipeline.length > 1 ? 's' : ''} stalled for 14+ days`,
      detail:   `${stalePipeline[0].businessName}${stalePipeline.length > 1 ? ` and ${stalePipeline.length - 1} other${stalePipeline.length > 2 ? 's' : ''}` : ''} in proposal stage — $${(totalVal / 1000).toFixed(1)}k at risk of going cold.`,
      action:   'View Pipeline',
      href:     '/leads',
      count:    stalePipeline.length,
      value:    totalVal,
    });
  }

  // 3. Expiring proposals — HIGH
  if (expiringProposals.length > 0) {
    const totalVal = expiringProposals.reduce((s, p) => s + p.oneTimeTotal + p.monthlyTotal * 12, 0);
    recs.push({
      id:       'expiring-proposals',
      priority: 'high',
      category: 'pipeline',
      title:    `${expiringProposals.length} proposal${expiringProposals.length > 1 ? 's' : ''} expiring within 7 days`,
      detail:   `${expiringProposals[0].businessName}${expiringProposals.length > 1 ? ` and ${expiringProposals.length - 1} other${expiringProposals.length > 2 ? 's' : ''}` : ''} — follow up before they go cold.`,
      action:   'View Proposals',
      href:     '/proposals',
      count:    expiringProposals.length,
      value:    totalVal,
    });
  }

  // 4. Stale leads (7+ days no touch) — HIGH
  if (staleLeads.length > 0) {
    const totalVal = staleLeads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
    recs.push({
      id:       'stale-leads',
      priority: 'high',
      category: 'pipeline',
      title:    `${staleLeads.length} lead${staleLeads.length > 1 ? 's' : ''} with no activity in 7+ days`,
      detail:   `${staleLeads[0].businessName}${staleLeads.length > 1 ? ` and ${staleLeads.length - 1} other${staleLeads.length > 2 ? 's' : ''}` : ''} — touch base or update status to keep pipeline accurate.`,
      action:   'View Leads',
      href:     '/leads',
      count:    staleLeads.length,
      value:    totalVal > 0 ? totalVal : undefined,
    });
  }

  // 5. Overdue tasks — HIGH
  if (overdueTasks.length > 0) {
    const urgentCount = overdueTasks.filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH').length;
    recs.push({
      id:       'overdue-tasks',
      priority: urgentCount > 0 ? 'high' : 'medium',
      category: 'tasks',
      title:    `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}${urgentCount > 0 ? ` (${urgentCount} high priority)` : ''}`,
      detail:   `${overdueTasks[0].title}${overdueTasks.length > 1 ? ` and ${overdueTasks.length - 1} other${overdueTasks.length > 2 ? 's' : ''}` : ''} past their due date.`,
      action:   'View Tasks',
      href:     '/tasks/my-tasks',
      count:    overdueTasks.length,
    });
  }

  // 6. Low stock — MEDIUM
  if (lowStock.length > 0) {
    const critical = lowStock.filter((p) => p.inStock < p.minStock * 0.5).length;
    recs.push({
      id:       'low-stock',
      priority: critical > 0 ? 'high' : 'medium',
      category: 'inventory',
      title:    `${lowStock.length} item${lowStock.length > 1 ? 's' : ''} below minimum stock${critical > 0 ? ` (${critical} critical)` : ''}`,
      detail:   `${lowStock[0].name}${lowStock.length > 1 ? ` and ${lowStock.length - 1} other${lowStock.length > 2 ? 's' : ''}` : ''} need reordering — check AI recommendations.`,
      action:   'View Inventory',
      href:     '/inventory',
      count:    lowStock.length,
    });
  }

  // Sort: urgent first, then high, then medium
  const order = { urgent: 0, high: 1, medium: 2 };
  recs.sort((a, b) => order[a.priority] - order[b.priority]);

  return NextResponse.json({ recommendations: recs, generatedAt: now.toISOString() });
}
